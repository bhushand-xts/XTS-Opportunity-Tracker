import type { PoolClient } from 'pg';

import { query, transaction } from '../config/db';

// ALL SQL for reason codes. Always use $1 parameters — never string
// concatenation. is_active = TRUE on the master table and on the tracker
// (unlike some sibling trackers, tbl_reason_codes_tracker has a real
// is_active column, not an is_current stand-in — see schema.sql).

// One row of tbl_reason_codes_tracker: a snapshot of a reason code as it
// stood after a change.
export interface ReasonCodeHistory {
  trackerId: number;
  reasonCodeId: number;
  reasonName: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface ReasonCode {
  id: number;
  reasonName: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

const SELECT_COLUMNS = `
  reason_code_id AS id,
  reason_name AS "reasonName",
  description,
  display_order AS "displayOrder",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<ReasonCode[]> {
  const rows = await query<ReasonCode>(
    `SELECT ${SELECT_COLUMNS} FROM tbl_reason_codes ORDER BY display_order NULLS LAST, reason_name`
  );
  return rows;
}

async function findById(id: number): Promise<ReasonCode | null> {
  const rows = await query<ReasonCode>(`SELECT ${SELECT_COLUMNS} FROM tbl_reason_codes WHERE reason_code_id = $1`, [
    id,
  ]);
  return rows[0] || null;
}

async function findByName(reasonName: string, excludeId?: number): Promise<ReasonCode | null> {
  const rows = excludeId
    ? await query<ReasonCode>(
        `SELECT ${SELECT_COLUMNS} FROM tbl_reason_codes WHERE LOWER(reason_name) = LOWER($1) AND reason_code_id <> $2`,
        [reasonName, excludeId]
      )
    : await query<ReasonCode>(`SELECT ${SELECT_COLUMNS} FROM tbl_reason_codes WHERE LOWER(reason_name) = LOWER($1)`, [
        reasonName,
      ]);
  return rows[0] || null;
}

async function findByDisplayOrder(displayOrder: number, excludeId?: number): Promise<ReasonCode | null> {
  const rows = excludeId
    ? await query<ReasonCode>(
        `SELECT ${SELECT_COLUMNS} FROM tbl_reason_codes WHERE display_order = $1 AND reason_code_id <> $2`,
        [displayOrder, excludeId]
      )
    : await query<ReasonCode>(`SELECT ${SELECT_COLUMNS} FROM tbl_reason_codes WHERE display_order = $1`, [
        displayOrder,
      ]);
  return rows[0] || null;
}

export interface ReasonCodeInput {
  reasonName: string;
  description?: string | null;
  displayOrder?: number | null;
  isActive?: boolean;
  // Who is making the change — recorded as created_by / updated_by.
  createdBy?: number | null;
  updatedBy?: number | null;
}

// Every write to tbl_reason_codes also writes a snapshot to
// tbl_reason_codes_tracker, inside the same transaction (README rule 5): the
// reason code and its history are saved together or not at all. No foreign
// key from the tracker back to tbl_reason_codes, so history survives the
// reason code's deletion.
async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await client.query(
    `INSERT INTO tbl_reason_codes_tracker
       (reason_code_id, reason_name, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active)
     SELECT
       reason_code_id, reason_name, description, display_order,
       COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by,
       COALESCE(is_active, TRUE)
     FROM tbl_reason_codes
     WHERE reason_code_id = $1`,
    [id]
  );
}

// Newest change first.
async function findHistory(reasonCodeId: number): Promise<ReasonCodeHistory[]> {
  return query<ReasonCodeHistory>(
    `SELECT
       tracker_id AS "trackerId",
       reason_code_id AS "reasonCodeId",
       reason_name AS "reasonName",
       description,
       display_order AS "displayOrder",
       is_active AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM tbl_reason_codes_tracker
     WHERE reason_code_id = $1
     ORDER BY tracker_id DESC`,
    [reasonCodeId]
  );
}

async function create(input: ReasonCodeInput, userId: number | null): Promise<ReasonCode> {
  return transaction(async (client) => {
    const result = await client.query<ReasonCode>(
      `INSERT INTO tbl_reason_codes (reason_name, description, display_order, is_active, created_by)
       VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
       RETURNING ${SELECT_COLUMNS}`,
      [input.reasonName, input.description ?? null, input.displayOrder ?? null, input.isActive ?? null, userId]
    );
    await recordTracker(client, result.rows[0].id);
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<ReasonCodeInput>, userId: number | null): Promise<ReasonCode> {
  return transaction(async (client) => {
    const result = await client.query<ReasonCode>(
      `UPDATE tbl_reason_codes SET
         reason_name = COALESCE($1, reason_name),
         description = CASE WHEN $2::boolean THEN $3 ELSE description END,
         display_order = CASE WHEN $4::boolean THEN $5 ELSE display_order END,
         is_active = COALESCE($6, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $7
       WHERE reason_code_id = $8
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.reasonName ?? null,
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

// The reason code row is deleted, but its history is kept: a final snapshot
// marked inactive is written first (tbl_reason_codes_tracker has no foreign
// key to tbl_reason_codes).
async function remove(id: number, userId: number | null): Promise<void> {
  await transaction(async (client) => {
    await client.query(
      `INSERT INTO tbl_reason_codes_tracker
         (reason_code_id, reason_name, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active)
       SELECT
         reason_code_id, reason_name, description, display_order,
         COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, CURRENT_TIMESTAMP, $2, FALSE
       FROM tbl_reason_codes
       WHERE reason_code_id = $1`,
      [id, userId]
    );
    await client.query('DELETE FROM tbl_reason_codes WHERE reason_code_id = $1', [id]);
  });
}

export { findAll, findById, findByName, findByDisplayOrder, findHistory, create, update, remove };
