import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pool } from '../config/db';
import { update, type Opportunity, type OpportunityInput } from './opportunity.repository';

// Opt-in database check. All writes target temporary tables and are rolled back.
test('only the latest questionnaire remains in the current table while prior questions survive in history', {
  skip: process.env.OPPORTUNITY_DB_INTEGRATION !== '1',
}, async t => {
  const connection = await pool.connect();
  let failSnapshot = false;
  try {
    await connection.query('BEGIN');
    await connection.query("SET LOCAL statement_timeout = '10s'");
    const seed = await connection.query('SELECT opportunity_id FROM public.tbl_opportunity WHERE is_active = TRUE LIMIT 1');
    assert.ok(seed.rows.length, 'The database check needs one existing opportunity to copy into a temporary table.');
    const opportunityId = seed.rows[0].opportunity_id;
    const tables = ['tbl_opportunity', 'tbl_opportunity_tracker', 'tbl_opportunity_engage_tracker',
      'tbl_opportunity_questions_answers', 'tbl_opportunity_questions_answers_tracker'];
    let sequence = 0;
    for (const table of tables) {
      await connection.query(`CREATE TEMP TABLE ${table} (LIKE public.${table} INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES) ON COMMIT DROP`);
      const defaults = await connection.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_default LIKE 'nextval(%'", [table]);
      for (const { column_name: column } of defaults.rows) {
        assert.match(column, /^[a-z_]+$/);
        const name = `questionnaire_test_sequence_${sequence++}`;
        await connection.query(`CREATE TEMP SEQUENCE ${name}`);
        await connection.query(`ALTER TABLE pg_temp.${table} ALTER COLUMN ${column} SET DEFAULT nextval('pg_temp.${name}')`);
      }
    }
    await connection.query('INSERT INTO pg_temp.tbl_opportunity SELECT * FROM public.tbl_opportunity WHERE opportunity_id = $1', [opportunityId]);
    await connection.query('UPDATE pg_temp.tbl_opportunity SET stage_id = 3, sub_stage_id = 7 WHERE opportunity_id = $1', [opportunityId]);

    // Repository transactions become savepoints inside the outer rollback-only transaction.
    t.mock.method(pool, 'connect', async () => ({
      query: async (sql: string, params?: unknown[]) => {
        if (sql === 'BEGIN') return connection.query('SAVEPOINT questionnaire_save');
        if (sql === 'COMMIT') return connection.query('RELEASE SAVEPOINT questionnaire_save');
        if (sql === 'ROLLBACK') return connection.query('ROLLBACK TO SAVEPOINT questionnaire_save');
        if (failSnapshot && sql.includes('INSERT INTO tbl_opportunity_questions_answers_tracker')) {
          failSnapshot = false;
          throw new Error('Simulated tracker write failure');
        }
        return connection.query(sql, params);
      }, release: () => {},
    }));
    const seedDetail = (await connection.query<Opportunity>(`SELECT opportunity_id AS "opportunityId", created_by AS "createdBy",
      owner_id AS "ownerId", client_id AS "clientId", opportunity_name AS "opportunityName", currency_id AS "currencyId"
      FROM pg_temp.tbl_opportunity WHERE opportunity_id = $1`, [opportunityId])).rows[0];
    const userId = seedDetail.createdBy!;
    assert.ok(userId);
    const save = (texts: string[], questionnaireTypeId: number) => update(opportunityId, {
      ...seedDetail, stageId: 3, subStageId: 7, rfpType: 1,
      proposalQuestionSelections: texts.map(question => ({ questionId: null, question, category: 'Other', questionnaireTypeId })),
    } as OpportunityInput, userId);
    const current = () => connection.query('SELECT qa_id, questiontext, questionnaire_type_id FROM pg_temp.tbl_opportunity_questions_answers ORDER BY qa_id');
    const old = [...Array.from({ length: 29 }, (_, index) => `Previous extracted question ${index + 1}`), 'Previous manually added question'];
    await save(old, 1);
    const original = await current();
    assert.equal(original.rows.length, 30);

    const latest = Array.from({ length: 36 }, (_, index) => `Latest extracted question ${index + 1}`);
    const saved = await save(latest, 2);
    assert.deepEqual((await current()).rows.map(row => row.questiontext), latest);
    assert.equal(saved.proposalQuestions?.length, 36);
    const history = await connection.query('SELECT qa_id, questiontext, questionnaire_type_id, is_current FROM pg_temp.tbl_opportunity_questions_answers_tracker WHERE qa_id = ANY($1::integer[])', [original.rows.map(row => row.qa_id)]);
    for (const text of old) assert.ok(history.rows.some(row => row.questiontext === text && row.questionnaire_type_id === 1));
    assert.ok(history.rows.every(row => row.is_current === false));

    // Old versions left inactive by the previous implementation must also leave the current table.
    await connection.query(`INSERT INTO pg_temp.tbl_opportunity_questions_answers
      (opportunity_id, opportunity_type_id, questiontext, question_category, questionnaire_type_id, created_by, is_active)
      VALUES ($1, 1, 'Previously inactive question', 'Other', 1, $2, FALSE),
             ($1, 1, $3, 'Other', 2, $2, TRUE)`, [opportunityId, userId, latest[0]]);
    latest.push('Latest manually added question');
    await save(latest, 2);
    assert.deepEqual((await current()).rows.map(row => row.questiontext), latest);
    assert.ok((await current()).rows.every(row => row.questionnaire_type_id === 2));
    const retired = await connection.query("SELECT is_current FROM pg_temp.tbl_opportunity_questions_answers_tracker WHERE questiontext = 'Previously inactive question'");
    assert.equal(retired.rows.length, 1);
    assert.equal(retired.rows[0].is_current, false);
    const before = await current();
    failSnapshot = true;
    await assert.rejects(save(['Another replacement'], 1), /Simulated tracker write failure/);
    assert.deepEqual((await current()).rows, before.rows);
    console.log('Verified 30 -> 36 -> 37 current questions, preserved history, and rollback on tracker failure.');
  } finally {
    t.mock.restoreAll();
    await connection.query('ROLLBACK');
    connection.release();
    await pool.end();
  }
});
