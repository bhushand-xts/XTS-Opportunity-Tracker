import type { PoolClient } from "pg";
import { query, transaction } from "../config/db";

export interface SubStage {
  id: number;
  stageId: number;
  subStageName: string;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface SubStageInput {
  stageId: number;
  subStageName: string;
  isActive?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
}

// One row of mst_sub_stage_tracker: a snapshot of a sub stage as it stood
// after a change.
export interface SubStageHistory {
  trackerId: number;
  subStageId: number;
  stageId: number;
  subStageName: string;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

const SELECT_COLUMNS = `
  sub_stage_id AS id,
  stage_id AS "stageId",
  sub_stage_name AS "subStageName",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<SubStage[]> {
  return query<SubStage>(
    `SELECT ${SELECT_COLUMNS} FROM mst_sub_stage ORDER BY stage_id, sub_stage_name`
  );
}

async function findById(id: number): Promise<SubStage | null> {
  const rows = await query<SubStage>(`SELECT ${SELECT_COLUMNS} FROM mst_sub_stage WHERE sub_stage_id = $1`, [id]);
  return rows[0] || null;
}

// Sub-stage names only need to be unique within their own parent stage.
async function findByName(stageId: number, subStageName: string, excludeId?: number): Promise<SubStage | null> {
  const rows = excludeId
    ? await query<SubStage>(
        `SELECT ${SELECT_COLUMNS} FROM mst_sub_stage
         WHERE stage_id = $1 AND LOWER(sub_stage_name) = LOWER($2) AND sub_stage_id <> $3`,
        [stageId, subStageName, excludeId]
      )
    : await query<SubStage>(
        `SELECT ${SELECT_COLUMNS} FROM mst_sub_stage WHERE stage_id = $1 AND LOWER(sub_stage_name) = LOWER($2)`,
        [stageId, subStageName]
      );
  return rows[0] || null;
}

// Whether any opportunity currently sits at this sub-stage.
async function isInUse(subStageId: number): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM tbl_opportunity WHERE sub_stage_id = $1) AS exists`,
    [subStageId]
  );
  return rows[0]?.exists ?? false;
}

// Every write to mst_sub_stage also writes a snapshot to
// mst_sub_stage_tracker (a pre-existing table, not created by this
// feature — it already has FK constraints back to mst_stage and
// mst_sub_stage, unlike the no-FK trackers elsewhere in this app; that's
// fine here since sub-stages are never deleted, only edited). is_current,
// not is_active, is this table's own existing status-snapshot column name.
async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await client.query(
    `INSERT INTO mst_sub_stage_tracker
       (sub_stage_id, stage_id, sub_stage_name, created_dt, created_by, updated_dt, updated_by, is_current)
     SELECT
       sub_stage_id, stage_id, sub_stage_name,
       COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by,
       COALESCE(is_active, TRUE)
     FROM mst_sub_stage
     WHERE sub_stage_id = $1`,
    [id]
  );
}

// Newest change first.
async function findHistory(subStageId: number): Promise<SubStageHistory[]> {
  return query<SubStageHistory>(
    `SELECT
       sub_stage_id_tracker AS "trackerId",
       sub_stage_id AS "subStageId",
       stage_id AS "stageId",
       sub_stage_name AS "subStageName",
       is_current AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM mst_sub_stage_tracker
     WHERE sub_stage_id = $1
     ORDER BY sub_stage_id_tracker DESC`,
    [subStageId]
  );
}

async function create(input: SubStageInput, userId: number): Promise<SubStage> {
  return transaction(async (client) => {
    const result = await client.query<SubStage>(
      `INSERT INTO mst_sub_stage (stage_id, sub_stage_name, is_active, created_by)
       VALUES ($1, $2, COALESCE($3, TRUE), $4)
       RETURNING ${SELECT_COLUMNS}`,
      [input.stageId, input.subStageName.trim(), input.isActive ?? null, userId]
    );
    await recordTracker(client, result.rows[0].id);
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<SubStageInput>, userId: number | null): Promise<SubStage> {
  return transaction(async (client) => {
    const result = await client.query<SubStage>(
      `UPDATE mst_sub_stage SET
         stage_id = COALESCE($1, stage_id),
         sub_stage_name = COALESCE($2, sub_stage_name),
         is_active = COALESCE($3, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $4
       WHERE sub_stage_id = $5
       RETURNING ${SELECT_COLUMNS}`,
      [input.stageId ?? null, input.subStageName?.trim() ?? null, input.isActive ?? null, userId, id]
    );
    await recordTracker(client, id);
    return result.rows[0];
  });
}

export { findAll, findById, findByName, isInUse, findHistory, create, update };
