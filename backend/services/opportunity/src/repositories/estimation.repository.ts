import type { PoolClient } from 'pg';
import { recordPreviousVersion } from '../../../../shared/trackerHistory';
import { query, transaction } from '../config/db';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import { assertEstimationWritable, assertEstimationRatesWritable } from '../lib/opportunityPreparation';
import { ESTIMATION_CURRENCY_CODE, applyEstimationRates, estimationPayload, estimationRates, restoreEstimation } from '../lib/estimationPersistence';
import type { OpportunityEstimation } from './opportunity.repository';

type Workflow = { stageId: number; subStageId: number };
type SavedMetadata = { version: number; status: 'SAVED' | 'SUBMITTED'; requestKey: string; deleted?: boolean };
type StoredEstimate = Parameters<typeof restoreEstimation>[0] & {
  estimation_id: string; opportunity_id: number; estimation_name: string | null; isselected: boolean;
  resource_allocation: ReturnType<typeof estimationPayload>['allocation'] & { saved?: SavedMetadata };
  person_weeks: { total: string }; created_by: number; created_dt: Date;
  updated_by: number | null; updated_dt: Date | null;
};
export interface EstimationVersion {
  isSelected: boolean;
  id: string; revision: number; version: number; name: string; status: 'SAVED' | 'SUBMITTED';
  currencyCode: string; personWeeks: string; createdBy: number; createdAt: string;
  updatedBy: number | null; updatedAt: string | null; estimation: OpportunityEstimation;
}
// Opportunity concurrency is derived from saved rows and their history, without
// storing a duplicate working copy or a revision column.
export const ESTIMATION_REVISION_SQL = `((SELECT COUNT(*)::INTEGER FROM tbl_opportunity_estimation_tracker h
    WHERE h.opportunity_id = e.opportunity_id)
  + (SELECT COUNT(*)::INTEGER FROM tbl_opportunity_estimation saved
    WHERE saved.opportunity_id = e.opportunity_id AND saved.resource_allocation ? 'saved'))`;
const FIELDS = `e.estimation_id::TEXT, e.opportunity_id, e.estimation_name, e.isselected, e.resource_allocation,
  e.rate_snapshot, e.person_weeks, e.person_weeks_cost, e.created_by, e.created_dt, e.updated_by, e.updated_dt,
  (SELECT COUNT(*)::INTEGER + 1 FROM tbl_opportunity_estimation_tracker h WHERE h.estimation_id = e.estimation_id) AS revision`;
export async function estimationRevision(client: Pick<PoolClient, 'query'>, opportunityId: number): Promise<number> {
  const result = await client.query<{ revision: number }>(`SELECT ${ESTIMATION_REVISION_SQL} AS revision
    FROM (SELECT $1::INTEGER AS opportunity_id) e`, [opportunityId]);
  return result.rows[0].revision;
}
async function assertRevision(client: PoolClient, opportunityId: number, expected: number) {
  if (await estimationRevision(client, opportunityId) !== expected) throw conflict('The estimation changed. Refresh before saving.');
}
const ACTIVE_NAMED = `e.resource_allocation ? 'saved'
  AND COALESCE(e.resource_allocation->'saved'->>'deleted', 'false') = 'false'`;
function version(row: StoredEstimate): EstimationVersion {
  const saved = row.resource_allocation.saved!;
  return { id: row.estimation_id, isSelected: row.isselected, revision: row.revision, version: saved.version,
    name: row.estimation_name!, status: saved.status, currencyCode: row.person_weeks_cost.currencyCode,
    personWeeks: row.person_weeks.total, createdBy: row.created_by, createdAt: new Date(row.created_dt).toISOString(),
    updatedBy: row.updated_by, updatedAt: row.updated_dt ? new Date(row.updated_dt).toISOString() : null,
    estimation: restoreEstimation(row) };
}
async function lockOpportunity(client: PoolClient, opportunityId: number): Promise<Workflow> {
  const result = await client.query<Workflow>(`SELECT o.stage_id AS "stageId", o.sub_stage_id AS "subStageId"
    FROM tbl_opportunity o WHERE o.opportunity_id = $1 AND o.is_active = TRUE FOR UPDATE OF o`, [opportunityId]);
  if (!result.rows[0]) throw notFound('Opportunity not found.');
  assertEstimationWritable(result.rows[0]);
  return result.rows[0];
}
export async function findEstimation(opportunityId: number): Promise<OpportunityEstimation | null> {
  // Read the chosen estimate and its opportunity token in one database snapshot.
  const rows = await query<StoredEstimate & { opportunityRevision: number }>(`SELECT ${FIELDS},
      ${ESTIMATION_REVISION_SQL.replace(/e\.opportunity_id/g, 'o.opportunity_id')} AS "opportunityRevision"
    FROM (SELECT $1::INTEGER AS opportunity_id) o
    LEFT JOIN LATERAL (SELECT * FROM tbl_opportunity_estimation e
      WHERE e.opportunity_id = o.opportunity_id AND ${ACTIVE_NAMED}
      ORDER BY e.isselected DESC, COALESCE(e.updated_dt, e.created_dt) DESC, e.estimation_id DESC LIMIT 1) e ON TRUE`, [opportunityId]);
  const row = rows[0];
  if (row?.estimation_id) return { ...restoreEstimation(row), revision: row.opportunityRevision };
  // After deleting the last estimate, expose the token without storing an empty row.
  return row?.opportunityRevision ? { revision: row.opportunityRevision, rows: [], assumptions: '', total: '0.00', grid: null } : null;
}
export async function saveEstimation(opportunityId: number, _estimate: OpportunityEstimation, _userId: number) {
  return transaction(async client => {
    const workflow = await lockOpportunity(client, opportunityId);
    if (workflow.stageId === 4) throw conflict('Estimation already submitted.');
    throw conflict('Enter an estimation name and use Save Estimation.');
  });
}
async function teamEstimate(client: PoolClient, estimate: OpportunityEstimation, previous?: StoredEstimate): Promise<OpportunityEstimation> {
  if (!estimate.grid) return estimate;
  const previousEstimate = previous ? restoreEstimation(previous) : undefined;
  const saved = previousEstimate ? estimationRates(previousEstimate) : [];
  const codes = estimate.grid.roleCodes.filter(code => !previousEstimate?.rates || !saved.some(rate => rate.roleCode === code));
  const masters = codes.length ? await client.query<{ roleCode: string; rate: string; rateType: string; currencyCode: string }>(`SELECT r.role_code AS "roleCode", r.default_rate::TEXT AS rate, r.rate_type AS "rateType", c.currency_code AS "currencyCode"
    FROM mst_rate r JOIN mst_currency c ON c.currency_id = r.currency_id
    WHERE r.role_code = ANY($1::TEXT[]) AND r.is_active = TRUE AND c.is_active = TRUE AND c.currency_code = 'USD'`, [codes]) : { rows: [] };
  const rates = estimate.grid.roleCodes.map(code => {
    const existing = saved.find(rate => rate.roleCode === code);
    const master = masters.rows.find(rate => rate.roleCode === code);
    if (existing && !previousEstimate?.rates && master) {
      const hourly = (rate: typeof existing) => (Number(rate.rate) / (rate.rateType.trim().toLowerCase() === 'monthly' ? 160 : 40)).toFixed(4);
      // Upgrade an old hourly-only snapshot to the actual displayed billing
      // rate only when it reproduces that same saved hourly rate.
      if (hourly(existing) === hourly(master)) return master;
    }
    return existing ?? master;
  });
  if (rates.some(rate => !rate || Number(rate.rate) <= 0)) throw conflict('Configure a positive USD master rate for every selected technical role.');
  // Estimation Team changes effort, not prices. Existing opportunity overrides
  // survive resource edits; new roles always use the server's master rates.
  return applyEstimationRates({ ...estimate, rates: rates as NonNullable<OpportunityEstimation['rates']> });
}
export async function listEstimationVersions(opportunityId: number, submittedOnly = false): Promise<EstimationVersion[]> {
  return (await query<StoredEstimate>(`SELECT ${FIELDS} FROM tbl_opportunity_estimation e
    WHERE e.opportunity_id = $1 AND ${ACTIVE_NAMED}
      ${submittedOnly ? "AND e.isselected = TRUE AND e.resource_allocation->'saved'->>'status' = 'SUBMITTED'" : ''}
    ORDER BY (e.resource_allocation->'saved'->>'version')::INTEGER DESC`, [opportunityId])).map(version);
}
async function findNamed(client: Pick<PoolClient, 'query'>, opportunityId: number, estimationId: string) {
  const result = await client.query<StoredEstimate>(`SELECT ${FIELDS} FROM tbl_opportunity_estimation e
    WHERE e.opportunity_id = $1 AND e.estimation_id = $2::BIGINT AND ${ACTIVE_NAMED} FOR UPDATE OF e`, [opportunityId, estimationId]);
  return result.rows[0];
}
export async function findEstimationVersion(opportunityId: number, estimationId: string): Promise<EstimationVersion | null> {
  const rows = await query<StoredEstimate>(`SELECT ${FIELDS} FROM tbl_opportunity_estimation e
    WHERE e.opportunity_id = $1 AND e.estimation_id = $2::BIGINT AND ${ACTIVE_NAMED}`, [opportunityId, estimationId]);
  return rows[0] ? version(rows[0]) : null;
}
export async function saveEstimationVersion(opportunityId: number, estimate: OpportunityEstimation, name: string, userId: number, requestKey: string, estimationId?: string, savedRevision?: number): Promise<EstimationVersion> {
  return transaction(async client => {
    const workflow = await lockOpportunity(client, opportunityId);
    const existing = await client.query<StoredEstimate>(`SELECT ${FIELDS} FROM tbl_opportunity_estimation e
      WHERE e.opportunity_id = $1 AND e.resource_allocation->'saved'->>'requestKey' = $2 AND e.resource_allocation ? 'saved'`, [opportunityId, requestKey]);
    if (existing.rows[0]) {
      if (existing.rows[0].resource_allocation.saved?.deleted || estimationId && existing.rows[0].estimation_id !== estimationId) throw conflict('This save request has already been processed. Refresh the saved estimates.');
      return version(existing.rows[0]);
    }
    const processed = await client.query(`SELECT tracker_id FROM tbl_opportunity_estimation_tracker
      WHERE opportunity_id = $1 AND resource_allocation->'saved'->>'requestKey' = $2 LIMIT 1`, [opportunityId, requestKey]);
    if (processed.rows[0]) throw conflict('This save request has already been processed. Refresh the saved estimates.');
    let target: StoredEstimate | undefined;
    if (estimationId) {
      target = await findNamed(client, opportunityId, estimationId);
      if (workflow.stageId === 4 && target?.isselected && target.resource_allocation.saved?.status === 'SUBMITTED') {
        throw conflict('Estimation already submitted.');
      }
      if (!target || target.revision !== savedRevision) throw conflict('The saved estimation changed. Refresh before editing.');
    }
    estimate = await teamEstimate(client, estimate, target);
    await assertRevision(client, opportunityId, estimate.revision);
    const payload = estimationPayload({ ...estimate, status: workflow.stageId === 4 ? 'SUBMITTED' : 'DRAFT' });
    if (!target) {
      const result = await client.query<StoredEstimate>(`INSERT INTO tbl_opportunity_estimation AS e
        (opportunity_id, resource_allocation, rate_snapshot, person_weeks, person_weeks_cost, estimation_name, isselected, is_current, created_by)
        VALUES ($1, $5::JSONB || jsonb_build_object('saved', jsonb_build_object(
          'version', COALESCE((SELECT MAX((resource_allocation->'saved'->>'version')::INTEGER) FROM tbl_opportunity_estimation WHERE opportunity_id = $1), 0) + 1,
          'status', 'SAVED', 'requestKey', $3::TEXT)), $6::JSONB, $7::JSONB, $8::JSONB, $2, FALSE, TRUE, $4)
        RETURNING ${FIELDS}`, [opportunityId, name, requestKey, userId, JSON.stringify(payload.allocation), JSON.stringify(payload.rates), JSON.stringify(payload.effort), JSON.stringify(payload.cost)]);
      if (!result.rows[0]) throw conflict('Save an estimate before creating a named estimate.');
      return version(result.rows[0]);
    }
    await recordPreviousVersion(client, 'tbl_opportunity_estimation', target.estimation_id);
    const result = await client.query<StoredEstimate>(`UPDATE tbl_opportunity_estimation e SET
      resource_allocation = $6::JSONB || jsonb_build_object('saved', (e.resource_allocation->'saved') || jsonb_build_object('requestKey', $4::TEXT, 'status', $10::TEXT)),
      rate_snapshot = $7::JSONB, person_weeks = $8::JSONB, person_weeks_cost = $9::JSONB,
      estimation_name = $3, isselected = CASE WHEN $10 = 'SAVED' THEN FALSE ELSE isselected END,
      is_current = TRUE, updated_by = $5, updated_dt = clock_timestamp()
      WHERE e.opportunity_id = $1 AND e.estimation_id = $2::BIGINT RETURNING ${FIELDS}`,
    [opportunityId, target.estimation_id, name, requestKey, userId, JSON.stringify(payload.allocation), JSON.stringify(payload.rates), JSON.stringify(payload.effort), JSON.stringify(payload.cost), workflow.stageId === 3 ? 'SAVED' : target.resource_allocation.saved!.status]);
    return version(result.rows[0]);
  });
}
// Rate-only updates never accept resource inputs or touch mst_rate. Locking the
// parent serializes this operation with edits and CEO approval.
export async function updateEstimationRates(opportunityId: number, estimationId: string, revision: number, rates: { roleCode: string; rate: string }[], userId: number): Promise<EstimationVersion> {
  return transaction(async client => {
    const workflow = await lockOpportunity(client, opportunityId);
    assertEstimationRatesWritable(workflow);
    const target = await findNamed(client, opportunityId, estimationId);
    if (!target || target.revision !== revision) throw conflict('The saved estimation changed. Refresh before updating rates.');
    if (!target.isselected || target.resource_allocation.saved?.status !== 'SUBMITTED') throw conflict('Only the selected, submitted estimation can be updated by the CEO.');
    const estimate = await teamEstimate(client, restoreEstimation(target), target);
    const savedRates = estimationRates(estimate);
    if (rates.some(rate => !savedRates.some(saved => saved.roleCode === rate.roleCode))) throw conflict('Only technical roles in this saved estimate can be repriced.');
    const next = { ...estimate, rates: savedRates.map(saved => ({ ...saved, rate: rates.find(rate => rate.roleCode === saved.roleCode)?.rate ?? saved.rate })) };
    const payload = estimationPayload(next);
    // Archive exactly one previous estimate, with all flags and audit fields intact.
    await recordPreviousVersion(client, 'tbl_opportunity_estimation', target.estimation_id);
    const result = await client.query<StoredEstimate>(`UPDATE tbl_opportunity_estimation e SET
      rate_snapshot = $3::JSONB, person_weeks_cost = $4::JSONB, is_current = TRUE,
      updated_by = $5, updated_dt = clock_timestamp()
      WHERE opportunity_id = $1 AND estimation_id = $2::BIGINT RETURNING ${FIELDS}`,
    [opportunityId, estimationId, JSON.stringify(payload.rates), JSON.stringify(payload.cost), userId]);
    return version(result.rows[0]);
  });
}
// Called inside the workflow transaction after its parent opportunity is locked.
export async function submitSelectedEstimation(client: PoolClient, opportunityId: number, estimationId: string, expectedRevision: number, selectedRevision: number | undefined, userId: number) {
  const target = await findNamed(client, opportunityId, estimationId);
  if (!target || target.revision !== selectedRevision || target.person_weeks_cost.currencyCode !== ESTIMATION_CURRENCY_CODE) throw conflict('The selected estimation changed. Refresh and review it before submitting.');
  await assertRevision(client, opportunityId, expectedRevision);
  const previousSelections = await client.query<{ estimation_id: string }>(`SELECT estimation_id::TEXT FROM tbl_opportunity_estimation
    WHERE opportunity_id = $1 AND isselected = TRUE AND estimation_id <> $2::BIGINT FOR UPDATE`, [opportunityId, estimationId]);
  for (const previous of previousSelections.rows) {
    await recordPreviousVersion(client, 'tbl_opportunity_estimation', previous.estimation_id);
    await client.query('UPDATE tbl_opportunity_estimation SET isselected = FALSE, updated_by = $2, updated_dt = clock_timestamp() WHERE estimation_id = $1::BIGINT', [previous.estimation_id, userId]);
  }
  await recordPreviousVersion(client, 'tbl_opportunity_estimation', target.estimation_id);
  await client.query(`UPDATE tbl_opportunity_estimation SET isselected = TRUE, is_current = TRUE,
    resource_allocation = jsonb_set(jsonb_set(resource_allocation, '{status}', '"SUBMITTED"'::JSONB), '{saved,status}', '"SUBMITTED"'::JSONB),
    updated_by = $3, updated_dt = clock_timestamp() WHERE opportunity_id = $1 AND estimation_id = $2::BIGINT`, [opportunityId, estimationId, userId]);
}
