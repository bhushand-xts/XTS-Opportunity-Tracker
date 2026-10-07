import type { PoolClient } from "pg";
import { query, transaction } from "../config/db";

export interface Stage {
  id: number;
  stageName: string;
  gate: string | null;
  winPercentage: number;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface StageInput {
  stageName: string;
  gate?: string | null;
  winPercentage: number;
  displayOrder: number;
  isActive?: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
}

// One row of mst_stage_tracker: a snapshot of a stage as it stood after a change.
export interface StageHistory {
  trackerId: number;
  stageId: number;
  stageName: string;
  gate: string | null;
  winPercentage: number;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

const SELECT_COLUMNS = `
  stage_id AS id,
  stage_name AS "stageName",
  gate,
  win_percentage AS "winPercentage",
  display_order AS "displayOrder",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<Stage[]> {
  return query<Stage>(
    `SELECT ${SELECT_COLUMNS} FROM mst_stage ORDER BY display_order NULLS LAST, stage_name`
  );
}

async function findById(id: number): Promise<Stage | null> {
  const rows = await query<Stage>(`SELECT ${SELECT_COLUMNS} FROM mst_stage WHERE stage_id = $1`, [id]);
  return rows[0] || null;
}

async function findByName(stageName: string, excludeId?: number): Promise<Stage | null> {
  const rows = excludeId
    ? await query<Stage>(
        `SELECT ${SELECT_COLUMNS} FROM mst_stage WHERE LOWER(stage_name) = LOWER($1) AND stage_id <> $2`,
        [stageName, excludeId]
      )
    : await query<Stage>(`SELECT ${SELECT_COLUMNS} FROM mst_stage WHERE LOWER(stage_name) = LOWER($1)`, [stageName]);
  return rows[0] || null;
}

async function findByDisplayOrder(displayOrder: number, excludeId?: number): Promise<Stage | null> {
  const rows = excludeId
    ? await query<Stage>(
        `SELECT ${SELECT_COLUMNS} FROM mst_stage WHERE display_order = $1 AND stage_id <> $2`,
        [displayOrder, excludeId]
      )
    : await query<Stage>(`SELECT ${SELECT_COLUMNS} FROM mst_stage WHERE display_order = $1`, [displayOrder]);
  return rows[0] || null;
}

// Whether any opportunity currently sits at this stage — editing a stage
// that's actively in use is blocked (see stages.service.ts).
async function isInUse(stageId: number): Promise<boolean> {
  const rows = await query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM tbl_opportunity WHERE stage_id = $1) AS exists`,
    [stageId]
  );
  return rows[0]?.exists ?? false;
}

// Every write to mst_stage also writes a snapshot to mst_stage_tracker
// (a pre-existing table, not created by this feature), inside the same
// transaction: the stage and its history are saved together or not at all.
// No foreign key from the tracker back to mst_stage, so history survives
// the stage's deletion (if that's ever added later). is_current, not
// is_active, is this table's own existing status-snapshot column name.
async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await client.query(
    `INSERT INTO mst_stage_tracker
       (stage_id, stage_name, description, gate, win_percentage, display_order, created_dt, created_by, updated_dt, updated_by, is_current)
     SELECT
       stage_id, stage_name, description, gate, win_percentage, display_order,
       COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by,
       COALESCE(is_active, TRUE)
     FROM mst_stage
     WHERE stage_id = $1`,
    [id]
  );
}

// Newest change first.
async function findHistory(stageId: number): Promise<StageHistory[]> {
  return query<StageHistory>(
    `SELECT
       stage_tracker_id AS "trackerId",
       stage_id AS "stageId",
       stage_name AS "stageName",
       gate,
       win_percentage AS "winPercentage",
       display_order AS "displayOrder",
       is_current AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM mst_stage_tracker
     WHERE stage_id = $1
     ORDER BY stage_tracker_id DESC`,
    [stageId]
  );
}

async function create(input: StageInput, userId: number): Promise<Stage> {
  return transaction(async (client) => {
    const result = await client.query<Stage>(
      `INSERT INTO mst_stage (stage_name, gate, win_percentage, display_order, is_active, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.stageName.trim(),
        input.gate?.trim() ?? null,
        input.winPercentage,
        input.displayOrder,
        input.isActive ?? null,
        userId,
      ]
    );
    await recordTracker(client, result.rows[0].id);
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<StageInput>, userId: number | null): Promise<Stage> {
  return transaction(async (client) => {
    const result = await client.query<Stage>(
      `UPDATE mst_stage SET
         stage_name = COALESCE($1, stage_name),
         gate = CASE WHEN $2::boolean THEN $3 ELSE gate END,
         win_percentage = COALESCE($4, win_percentage),
         display_order = COALESCE($5, display_order),
         is_active = COALESCE($6, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $7
       WHERE stage_id = $8
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.stageName?.trim() ?? null,
        "gate" in input,
        input.gate?.trim() ?? null,
        input.winPercentage ?? null,
        input.displayOrder ?? null,
        input.isActive ?? null,
        userId,
        id,
      ]
    );
    await recordTracker(client, id);
    return result.rows[0];
  });
}

export { findAll, findById, findByName, findByDisplayOrder, isInUse, findHistory, create, update };
