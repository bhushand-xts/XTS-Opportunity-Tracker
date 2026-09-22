import type { PoolClient } from 'pg';

import { query, transaction } from '../config/db';

// ALL SQL for estimation phases. Always use $1 parameters — never string
// concatenation. is_active = TRUE on master tables, is_current = TRUE on trackers.

// One row of tbl_estimation_phases_tracker: a snapshot of a phase as it stood
// after a change.
export interface PhaseHistory {
  trackerId: number;
  phaseId: number;
  phaseName: string;
  phaseCode: string | null;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface Phase {
  id: number;
  phaseName: string;
  phaseCode: string | null;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

const SELECT_COLUMNS = `
  phase_id AS id,
  phase_name AS "phaseName",
  phase_code AS "phaseCode",
  description,
  display_order AS "displayOrder",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<Phase[]> {
  const rows = await query<Phase>(
    `SELECT ${SELECT_COLUMNS} FROM mst_estimation_phases ORDER BY display_order NULLS LAST, phase_name`
  );
  return rows;
}

async function findById(id: number): Promise<Phase | null> {
  const rows = await query<Phase>(`SELECT ${SELECT_COLUMNS} FROM mst_estimation_phases WHERE phase_id = $1`, [id]);
  return rows[0] || null;
}

async function findByName(phaseName: string, excludeId?: number): Promise<Phase | null> {
  const rows = excludeId
    ? await query<Phase>(
        `SELECT ${SELECT_COLUMNS} FROM mst_estimation_phases WHERE LOWER(phase_name) = LOWER($1) AND phase_id <> $2`,
        [phaseName, excludeId]
      )
    : await query<Phase>(`SELECT ${SELECT_COLUMNS} FROM mst_estimation_phases WHERE LOWER(phase_name) = LOWER($1)`, [
        phaseName,
      ]);
  return rows[0] || null;
}

async function findByCode(phaseCode: string, excludeId?: number): Promise<Phase | null> {
  const rows = excludeId
    ? await query<Phase>(
        `SELECT ${SELECT_COLUMNS} FROM mst_estimation_phases WHERE LOWER(phase_code) = LOWER($1) AND phase_id <> $2`,
        [phaseCode, excludeId]
      )
    : await query<Phase>(`SELECT ${SELECT_COLUMNS} FROM mst_estimation_phases WHERE LOWER(phase_code) = LOWER($1)`, [
        phaseCode,
      ]);
  return rows[0] || null;
}

export interface PhaseInput {
  phaseName: string;
  phaseCode?: string | null;
  description?: string | null;
  displayOrder?: number | null;
  isActive?: boolean;
  // Who is making the change — recorded as created_by / updated_by.
  createdBy?: number | null;
  updatedBy?: number | null;
}

// Every write to mst_estimation_phases also writes a snapshot to
// tbl_estimation_phases_tracker, inside the same transaction (README rule 5):
// the phase and its history are saved together or not at all.
// opportunity_id is left NULL here — this snapshot is master-data change
// history, not an opportunity's estimate.
async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await client.query(
    `INSERT INTO tbl_estimation_phases_tracker
       (phase_id, phase_name, phase_code, description, display_order, created_dt, created_by, updated_dt, updated_by, is_current)
     SELECT
       phase_id, phase_name, phase_code, description, display_order,
       COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by,
       COALESCE(is_active, TRUE)
     FROM mst_estimation_phases
     WHERE phase_id = $1`,
    [id]
  );
}

// Newest change first.
async function findHistory(phaseId: number): Promise<PhaseHistory[]> {
  return query<PhaseHistory>(
    `SELECT
       phase_tracker_id AS "trackerId",
       phase_id AS "phaseId",
       phase_name AS "phaseName",
       phase_code AS "phaseCode",
       description,
       display_order AS "displayOrder",
       is_current AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM tbl_estimation_phases_tracker
     WHERE phase_id = $1
     ORDER BY phase_tracker_id DESC`,
    [phaseId]
  );
}

async function create(input: PhaseInput, userId: number | null): Promise<Phase> {
  return transaction(async (client) => {
    const result = await client.query<Phase>(
      `INSERT INTO mst_estimation_phases (phase_name, phase_code, description, display_order, is_active, created_by)
       VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.phaseName,
        input.phaseCode ?? null,
        input.description ?? null,
        input.displayOrder ?? null,
        input.isActive ?? null,
        userId,
      ]
    );
    await recordTracker(client, result.rows[0].id);
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<PhaseInput>, userId: number | null): Promise<Phase> {
  return transaction(async (client) => {
    const result = await client.query<Phase>(
      `UPDATE mst_estimation_phases SET
         phase_name = COALESCE($1, phase_name),
         phase_code = CASE WHEN $2::boolean THEN $3 ELSE phase_code END,
         description = CASE WHEN $4::boolean THEN $5 ELSE description END,
         display_order = CASE WHEN $6::boolean THEN $7 ELSE display_order END,
         is_active = COALESCE($8, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $9
       WHERE phase_id = $10
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.phaseName ?? null,
        'phaseCode' in input,
        input.phaseCode ?? null,
        'description' in input,
        input.description ?? null,
        'displayOrder' in input,
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

// The phase row is deleted, but its history is kept: a final snapshot marked
// inactive is written first (tbl_estimation_phases_tracker has no foreign key
// to mst_estimation_phases).
async function remove(id: number, userId: number | null): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO tbl_estimation_phases_tracker
         (phase_id, phase_name, phase_code, description, display_order, created_dt, created_by, updated_dt, updated_by, is_current)
       SELECT
         phase_id, phase_name, phase_code, description, display_order,
         COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, CURRENT_TIMESTAMP, $2, FALSE
       FROM mst_estimation_phases
       WHERE phase_id = $1`,
      [id, userId]
    );
    await client.query('DELETE FROM mst_estimation_phases WHERE phase_id = $1', [id]);
  });
}

export { findAll, findById, findByName, findByCode, findHistory, create, update, remove };
