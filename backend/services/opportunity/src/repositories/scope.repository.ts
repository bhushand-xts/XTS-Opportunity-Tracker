import type { PoolClient } from 'pg';
import { query, transaction } from '../config/db';
import { conflict, notFound } from '../../../../shared/errors/graphqlErrors';
import { assertPreparationWritable } from '../lib/opportunityPreparation';

export type AssessmentSection = 'ALL' | 'SCOPE' | 'RISKS' | 'ALIGNMENT';
export interface ScopeRisk { id: string; description: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; }
export interface ScopeAlignment { id: string; text: string; }
export interface OpportunityScope { revision: number; summary: string; risks: ScopeRisk[]; alignment: ScopeAlignment[]; }

// Tracker versions count twice so moving a deleted row out of the current
// table still advances the revision and prevents stale edits from restoring it.
const SCOPE_QUERY = `SELECT
  ((SELECT COUNT(*) FROM tbl_opportunity_scope WHERE opportunity_id = $1) +
   (SELECT COUNT(*) * 2 FROM tbl_opportunity_scope_tracker WHERE opportunity_id = $1) +
   (SELECT COUNT(*) FROM tbl_opportunity_risk WHERE opportunity_id = $1) +
   (SELECT COUNT(*) * 2 FROM tbl_opportunity_risk_tracker WHERE opportunity_id = $1) +
   (SELECT COUNT(*) FROM tbl_opportunity_alignment WHERE opportunity_id = $1) +
   (SELECT COUNT(*) * 2 FROM tbl_opportunity_alignment_tracker WHERE opportunity_id = $1))::INTEGER AS revision,
  COALESCE((SELECT scope_description FROM tbl_opportunity_scope WHERE opportunity_id = $1 AND is_active = TRUE), '') AS summary,
  COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id', risk_id::TEXT, 'description', risk_description, 'severity', severity) ORDER BY risk_id)
    FROM tbl_opportunity_risk WHERE opportunity_id = $1 AND is_active = TRUE), '[]'::JSON) AS risks,
  COALESCE((SELECT JSON_AGG(JSON_BUILD_OBJECT('id', alignment_id::TEXT, 'text', alignment_description) ORDER BY alignment_id)
    FROM tbl_opportunity_alignment WHERE opportunity_id = $1 AND is_active = TRUE), '[]'::JSON) AS alignment`;

export async function findScope(opportunityId: number): Promise<OpportunityScope> {
  return (await query<OpportunityScope>(SCOPE_QUERY, [opportunityId]))[0];
}

const tables = {
  SCOPE: { table: 'tbl_opportunity_scope', id: 'scope_id', description: 'scope_description' },
  RISKS: { table: 'tbl_opportunity_risk', id: 'risk_id', description: 'risk_description' },
  ALIGNMENT: { table: 'tbl_opportunity_alignment', id: 'alignment_id', description: 'alignment_description' },
} as const;
type Kind = keyof typeof tables;

async function snapshot(client: PoolClient, kind: Kind, opportunityId: number, id: string) {
  const config = tables[kind];
  const columns = `${config.id}, ${config.description}, opportunity_id, ${kind === 'RISKS' ? 'severity, ' : ''}created_by, created_dt, updated_by, updated_dt, is_active`;
  // Table/column names come exclusively from the fixed configuration above.
  await client.query(`INSERT INTO ${config.table}_tracker (${columns})
    SELECT ${columns} FROM ${config.table} WHERE opportunity_id = $1 AND ${config.id} = $2`, [opportunityId, id]);
}

interface Item { id: string; description: string; severity?: string; }
const normalizeDescription = (description: string) => description.trim().replace(/\s+/g, ' ').toLowerCase();
function validateItems(
  kind: 'RISKS' | 'ALIGNMENT',
  incoming: Item[],
  previous: Item[]
) {
  const stored = new Map(
    previous.map(item => [item.id, item])
  );

  const duplicateMessage =
    kind === 'RISKS'
      ? 'This risk already exists for this opportunity.'
      : 'This alignment already exists for this opportunity.';

  const normalize = (value: string) =>
    normalizeDescription(value);

  const seen = new Map<string, string>();

  // Include saved items when validating a partial update.
  // Existing IDs being updated are excluded from this initial set.
  const incomingIds = new Set(
    incoming.map(item => item.id)
  );

  for (const item of previous) {
    if (!incomingIds.has(item.id)) {
      seen.set(normalize(item.description), item.id);
    }
  }

  for (const item of incoming) {
    if (
      !item.id.startsWith('draft-') &&
      !stored.has(item.id)
    ) {
      throw notFound(
        'This item is no longer available. Please refresh and try again.'
      );
    }

    const description = normalize(item.description);

    if (seen.has(description)) {
      const prior = stored.get(item.id);

      // Permit an unchanged existing duplicate to remain
      // so that unrelated edits are not blocked.
      if (
        !prior ||
        normalize(prior.description) !== description
      ) {
        throw conflict(duplicateMessage);
      }
    }

    seen.set(description, item.id);
  }
}
async function syncItems(client: PoolClient, kind: 'RISKS' | 'ALIGNMENT', opportunityId: number, incoming: Item[], previous: Item[], userId: number) {
  const config = tables[kind], stored = new Map(previous.map(item => [item.id, item]));
  const retained = new Set(incoming.map(item => item.id));
  for (const item of previous) {
    if (retained.has(item.id)) continue;
    await snapshot(client, kind, opportunityId, item.id);
    await client.query(`DELETE FROM ${config.table}
      WHERE opportunity_id = $1 AND ${config.id} = $2 AND is_active = TRUE`, [opportunityId, item.id]);
  }
  for (const item of incoming) {
    const prior = stored.get(item.id), description = item.description.trim();
    if (!prior) {
      await client.query(`INSERT INTO ${config.table} (opportunity_id, ${config.description}, created_by${kind === 'RISKS' ? ', severity' : ''})
        VALUES ($1, $2, $3${kind === 'RISKS' ? ', $4' : ''})`, kind === 'RISKS' ? [opportunityId, description, userId, item.severity] : [opportunityId, description, userId]);
    } else if (prior.description !== description || prior.severity !== item.severity) {
      await snapshot(client, kind, opportunityId, item.id);
      await client.query(`UPDATE ${config.table} SET ${config.description} = $3, updated_by = $4, updated_dt = CURRENT_TIMESTAMP${kind === 'RISKS' ? ', severity = $5' : ''}
        WHERE opportunity_id = $1 AND ${config.id} = $2 AND is_active = TRUE`, kind === 'RISKS' ? [opportunityId, item.id, description, userId, item.severity] : [opportunityId, item.id, description, userId]);
    }
  }
}

export async function saveScope(opportunityId: number, scope: OpportunityScope, section: AssessmentSection, userId: number): Promise<void> {
  await transaction(async client => {
    const locked = await client.query<{ stageId: number; subStageId: number }>(`SELECT stage_id AS "stageId", sub_stage_id AS "subStageId" FROM tbl_opportunity
      WHERE opportunity_id = $1 AND is_active = TRUE FOR UPDATE`, [opportunityId]);
    const opportunity = locked.rows[0];
    if (!opportunity) throw notFound('Opportunity not found.');
    assertPreparationWritable(opportunity);
    const current = (await client.query<OpportunityScope>(SCOPE_QUERY, [opportunityId])).rows[0];
    if (current.revision !== scope.revision) throw conflict('The saved assessment has changed. Refresh the opportunity before saving again. Your draft has not been saved.');
    // Compare against current rows from this opportunity while its parent row
    // is locked, so concurrent saves cannot introduce duplicate descriptions.
    const alignment = scope.alignment.map(item => ({ id: item.id, description: item.text }));
    const previousAlignment = current.alignment.map(item => ({ id: item.id, description: item.text }));
    if (section === 'ALL' || section === 'RISKS') validateItems('RISKS', scope.risks, current.risks);
    if (section === 'ALL' || section === 'ALIGNMENT') validateItems('ALIGNMENT', alignment, previousAlignment);
    if (section === 'ALL' || section === 'SCOPE') {
      const existing = (await client.query<{ id: string; description: string; isActive: boolean }>(`SELECT scope_id::TEXT AS id, scope_description AS description, is_active AS "isActive"
        FROM tbl_opportunity_scope WHERE opportunity_id = $1 FOR UPDATE`, [opportunityId])).rows[0];
      const description = scope.summary.trim();
      if (!description) {
        if (existing?.isActive) {
          await snapshot(client, 'SCOPE', opportunityId, existing.id);
          // Retain the description and creator; only mark this scope inactive.
          await client.query(`UPDATE tbl_opportunity_scope SET is_active = FALSE, updated_by = $2, updated_dt = CURRENT_TIMESTAMP
            WHERE opportunity_id = $1`, [opportunityId, userId]);
        }
      } else if (!existing) {
        await client.query('INSERT INTO tbl_opportunity_scope (opportunity_id, scope_description, created_by) VALUES ($1, $2, $3)', [opportunityId, description, userId]);
      } else if (existing.description !== description || !existing.isActive) {
        await snapshot(client, 'SCOPE', opportunityId, existing.id);
        await client.query(`UPDATE tbl_opportunity_scope SET scope_description = $2, updated_by = $3, updated_dt = CURRENT_TIMESTAMP, is_active = TRUE
          WHERE opportunity_id = $1`, [opportunityId, description, userId]);
      }
    }
    if (section === 'ALL' || section === 'RISKS') await syncItems(client, 'RISKS', opportunityId, scope.risks, current.risks, userId);
    if (section === 'ALL' || section === 'ALIGNMENT') await syncItems(client, 'ALIGNMENT', opportunityId, alignment, previousAlignment, userId);
  });
}
