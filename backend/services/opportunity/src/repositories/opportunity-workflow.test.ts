import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { saveEstimation, transitionWorkflow } from './opportunity.repository';
const db = require('../config/db');

test('a stale reviewed stage rolls back before any status or engagement writes', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => { calls.push(sql); return { rows: sql.startsWith('SELECT') ? [{ stageId: 2, subStageId: 4 }] : [] }; },
    release: () => {},
  }));
  await assert.rejects(transitionWorkflow(10, 9, 15, null, 7, 'Reject', null, {}, { stageId: 1, subStageId: 1 }), /changed while you were reviewing/);
  assert.ok(calls.some(sql => sql.includes('FOR UPDATE')));
  assert.equal(calls.some(sql => sql.startsWith('UPDATE') || sql.startsWith('INSERT')), false);
  assert.equal(calls.at(-1), 'ROLLBACK');
});

test('estimation saving checks the locked stage and revision and binds matrix data', async t => {
  let stage = 3, savedRevision = true;
  const calls: { sql: string; params: unknown[] }[] = [];
  const estimation = { revision: 2, rows: [{ id: 'row', workItem: "Engineering's estimate", hours: '2', people: 1, hourlyRate: '100' }], assumptions: 'One sprint', total: '200.00' };
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: sql.startsWith('SELECT') ? [{ stage_id: stage, sub_stage_id: stage === 3 ? 7 : 8 }] : sql.includes('RETURNING revision') && savedRevision ? [{ revision: 3 }] : [] };
    },
    release: () => {},
  }));
  await saveEstimation(10, estimation, 7);
  const insert = calls.find(call => call.sql.includes('INSERT INTO'))!;
  assert.deepEqual(insert.params, [10, JSON.stringify(estimation.rows), 'One sprint', '200.00', 7, 2]);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  savedRevision = false;
  await assert.rejects(saveEstimation(10, estimation, 7), /estimation changed/);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  stage = 4;
  const inserts = calls.filter(call => call.sql.includes('INSERT INTO')).length;
  await assert.rejects(saveEstimation(10, estimation, 7), /no longer in estimation/);
  assert.equal(calls.filter(call => call.sql.includes('INSERT INTO')).length, inserts);
});

test('a decision and its engagement audit commit together with bound reason and role values', async t => {
  const calls: { sql: string; params: unknown[] }[] = [];
  let released = false;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return { rows: sql.includes('RETURNING opportunity_id') || sql.startsWith('SELECT') ? [{ opportunityId: 10 }] : [] };
    },
    release: () => { released = true; },
  }));
  const audit = { reasonCodeId: 4, roleId: 15, roleName: "Sales Head's role" };
  await transitionWorkflow(10, 1, 3, null, 7, 'Awaiting budget approval.', null, audit);
  const reset = calls.findIndex(call => call.sql.includes('UPDATE tbl_opportunity_engage_tracker'));
  const insert = calls.findIndex(call => call.sql.includes('INSERT INTO tbl_opportunity_engage_tracker'));
  assert.equal(calls[0].sql, 'BEGIN');
  assert.ok(reset > 0 && insert > reset);
  assert.match(calls[reset].sql, /is_current = FALSE/);
  assert.match(calls[insert].sql, /reason_code_id, role_id, role_name/);
  assert.deepEqual(calls[insert].params, [10, 1, 3, 7, 'Awaiting budget approval.', 4, 15, "Sales Head's role"]);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.equal(released, true);
});

test('an engagement tracker failure rolls back the opportunity and releases the transaction', async t => {
  const calls: string[] = [];
  let released = false;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('INSERT INTO tbl_opportunity_engage_tracker')) throw new Error('Audit insert failed');
      return { rows: sql.includes('RETURNING opportunity_id') ? [{ opportunityId: 10 }] : [] };
    },
    release: () => { released = true; },
  }));
  await assert.rejects(transitionWorkflow(10, 2, 4, null, 7, 'Approved', null, { roleId: 15, roleName: 'Sales Head' }), /Audit insert failed/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
  assert.equal(released, true);
});
