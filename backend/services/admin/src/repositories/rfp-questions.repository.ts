import type { PoolClient } from 'pg';

import { query, transaction } from '../config/db';

// ALL SQL for RFP questions. Always use $1 parameters — never string
// concatenation. is_active = TRUE on both the master table and the tracker
// (questions are deactivated, not deleted — see rfp-questions.service.ts).

// One row of mst_rfp_questions_tracker: a snapshot of a question as it stood
// after a change.
export interface RfpQuestionHistory {
  trackerId: number;
  questionId: number;
  question: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

export interface RfpQuestion {
  id: number;
  question: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}

const SELECT_COLUMNS = `
  question_id AS id,
  question,
  description,
  display_order AS "displayOrder",
  is_active AS "isActive",
  created_dt AS "createdDt",
  created_by AS "createdBy",
  updated_dt AS "updatedDt",
  updated_by AS "updatedBy"
`;

async function findAll(): Promise<RfpQuestion[]> {
  const rows = await query<RfpQuestion>(
    `SELECT ${SELECT_COLUMNS} FROM mst_rfp_questions ORDER BY display_order NULLS LAST, question_id`
  );
  return rows;
}

async function findById(id: number): Promise<RfpQuestion | null> {
  const rows = await query<RfpQuestion>(`SELECT ${SELECT_COLUMNS} FROM mst_rfp_questions WHERE question_id = $1`, [id]);
  return rows[0] || null;
}

async function findByQuestion(questionText: string, excludeId?: number): Promise<RfpQuestion | null> {
  const rows = excludeId
    ? await query<RfpQuestion>(
        `SELECT ${SELECT_COLUMNS} FROM mst_rfp_questions WHERE LOWER(question) = LOWER($1) AND question_id <> $2`,
        [questionText, excludeId]
      )
    : await query<RfpQuestion>(`SELECT ${SELECT_COLUMNS} FROM mst_rfp_questions WHERE LOWER(question) = LOWER($1)`, [
        questionText,
      ]);
  return rows[0] || null;
}

async function findByDisplayOrder(displayOrder: number, excludeId?: number): Promise<RfpQuestion | null> {
  const rows = excludeId
    ? await query<RfpQuestion>(
        `SELECT ${SELECT_COLUMNS} FROM mst_rfp_questions WHERE display_order = $1 AND question_id <> $2`,
        [displayOrder, excludeId]
      )
    : await query<RfpQuestion>(`SELECT ${SELECT_COLUMNS} FROM mst_rfp_questions WHERE display_order = $1`, [
        displayOrder,
      ]);
  return rows[0] || null;
}

export interface RfpQuestionInput {
  question: string;
  description?: string | null;
  displayOrder?: number | null;
  isActive?: boolean;
  // Who is making the change — recorded as created_by / updated_by.
  createdBy?: number | null;
  updatedBy?: number | null;
}

// Every write to mst_rfp_questions also writes a snapshot to
// mst_rfp_questions_tracker, inside the same transaction (README rule 5):
// the question and its history are saved together or not at all.
async function recordTracker(client: PoolClient, id: number): Promise<void> {
  await client.query(
    `INSERT INTO mst_rfp_questions_tracker
       (question_id, question, description, display_order, created_dt, created_by, updated_dt, updated_by, is_active)
     SELECT
       question_id, question, description, display_order,
       COALESCE(created_dt, CURRENT_TIMESTAMP), created_by, updated_dt, updated_by,
       COALESCE(is_active, TRUE)
     FROM mst_rfp_questions
     WHERE question_id = $1`,
    [id]
  );
}

// Newest change first.
async function findHistory(questionId: number): Promise<RfpQuestionHistory[]> {
  return query<RfpQuestionHistory>(
    `SELECT
       tracker_id AS "trackerId",
       question_id AS "questionId",
       question,
       description,
       display_order AS "displayOrder",
       is_active AS "isActive",
       created_dt AS "createdDt",
       created_by AS "createdBy",
       updated_dt AS "updatedDt",
       updated_by AS "updatedBy"
     FROM mst_rfp_questions_tracker
     WHERE question_id = $1
     ORDER BY tracker_id DESC`,
    [questionId]
  );
}

async function create(input: RfpQuestionInput, userId: number | null): Promise<RfpQuestion> {
  return transaction(async (client) => {
    const result = await client.query<RfpQuestion>(
      `INSERT INTO mst_rfp_questions (question, description, display_order, is_active, created_by)
       VALUES ($1, $2, $3, COALESCE($4, TRUE), $5)
       RETURNING ${SELECT_COLUMNS}`,
      [input.question, input.description ?? null, input.displayOrder ?? null, input.isActive ?? null, userId]
    );
    await recordTracker(client, result.rows[0].id);
    return result.rows[0];
  });
}

async function update(id: number, input: Partial<RfpQuestionInput>, userId: number | null): Promise<RfpQuestion> {
  return transaction(async (client) => {
    const result = await client.query<RfpQuestion>(
      `UPDATE mst_rfp_questions SET
         question = COALESCE($1, question),
         description = CASE WHEN $2::boolean THEN $3 ELSE description END,
         display_order = CASE WHEN $4::boolean THEN $5 ELSE display_order END,
         is_active = COALESCE($6, is_active),
         updated_dt = CURRENT_TIMESTAMP,
         updated_by = $7
       WHERE question_id = $8
       RETURNING ${SELECT_COLUMNS}`,
      [
        input.question ?? null,
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

export { findAll, findById, findByQuestion, findByDisplayOrder, findHistory, create, update };
