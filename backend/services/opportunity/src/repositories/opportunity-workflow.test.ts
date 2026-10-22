import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { findStageHistory, saveEstimation, transitionWorkflow, update, updateRfpIntakeOpportunity } from './opportunity.repository';
const db = require('../config/db');

test('stage history loads every recorded transition in timestamp and tracker order for only the requested opportunity', async t => {
  const rows = [{ id: 1, stageId: 1, subStageId: 1, reachedAt: new Date('2026-10-19T04:00:00Z'), comment: null }];
  const read = t.mock.method(db, 'query', async () => rows);
  assert.deepEqual(await findStageHistory(10), rows);
  const [sql, params] = read.mock.calls[0].arguments as [string, unknown[]];
  assert.match(sql, /FROM tbl_opportunity_engage_tracker/);
  assert.match(sql, /updated_dt AS "reachedAt"/);
  assert.match(sql, /updated_by AS "updatedBy"/);
  assert.match(sql, /WHERE opportunity_id = \$1/);
  assert.match(sql, /ORDER BY updated_dt ASC, tracker_id ASC/);
  assert.doesNotMatch(sql, /is_current\s*=/);
  assert.deepEqual(params, [10]);
});

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

test('both update paths return requested changes to the correct review and preserve approved stages', async t => {
  for (const intake of [false, true]) {
    for (const [stageId, subStageId, expectedSubstage] of [[1, 2, 1], [2, 5, 4], [1, 1, 1], [1, 3, 3], [2, 4, 4], [3, 7, 7], [4, 8, 8], [5, 10, 10], [6, 12, 12], [7, 13, 13], [8, 14, 14], [9, 15, 15]]) {
      let current = { opportunityId: 10, stageId, subStageId, createdBy: stageId === 2 ? 99 : 7, assignedTo: 7 as number | null, clientId: 1 };
      const calls: { sql: string; params: unknown[] }[] = [];
      t.mock.method(db.pool, 'connect', async () => ({
        query: async (sql: string, params: unknown[] = []) => {
          calls.push({ sql, params });
          if (sql.includes('SET sub_stage_id = $2')) current = { ...current, subStageId: params[1] as number, assignedTo: null };
          return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') && sql.includes('opportunity_name = $1') ? [{ ...current }] : [] };
        },
        release: () => {},
      }));
      const audit = { roleId: 15, roleName: 'Sales Head' };
      const saved = intake ? await updateRfpIntakeOpportunity(10, {
        opportunityName: 'Corrected', ownerId: 7, currencyId: 1, estimatedValue: 100, sourceTypeId: 1, rfpType: 2,
        client: { clientName: 'Client', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' },
        contacts: [], questions: [],
      }, 7, audit) : await update(10, { stageId, subStageId, opportunityName: 'Corrected' }, 7, audit);
      assert.equal(saved?.stageId, stageId);
      assert.equal(saved?.subStageId, expectedSubstage);
      assert.ok(calls[1].sql.includes('FOR UPDATE'));
      const engage = calls.filter(call => call.sql.includes('INSERT INTO tbl_opportunity_engage_tracker'));
      assert.equal(engage.length, subStageId === expectedSubstage ? 0 : 1);
      if (engage.length) {
        assert.deepEqual(engage[0].params.slice(0, 4), [10, stageId, expectedSubstage, 7]);
        assert.deepEqual(engage[0].params.slice(-2), [15, 'Sales Head']);
      }
      assert.equal(calls.at(-1)?.sql, 'COMMIT');
    }
  }
});

test('an authorized non-creator update saves without resubmitting the creator corrections', async t => {
  const current = { opportunityId: 10, stageId: 1, subStageId: 2, createdBy: 99, assignedTo: 99, clientId: 1 };
  for (const intake of [false, true]) {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [current] : [] };
      },
      release: () => {},
    }));
    const saved = intake ? await updateRfpIntakeOpportunity(10, {
      opportunityName: 'Corrected', ownerId: 7, currencyId: 1, estimatedValue: 100, sourceTypeId: 1, rfpType: 2,
      client: { clientName: 'Client', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' },
      contacts: [], questions: [],
    }, 7, { roleName: 'Sales Head' }) : await update(10, { stageId: 1, subStageId: 2, opportunityName: 'Corrected' }, 7, { roleName: 'Sales Head' });
    assert.equal(saved?.subStageId, 2);
    assert.equal(calls.some(sql => sql.includes('SET sub_stage_id = $2')), false);
    assert.equal(calls.at(-1), 'COMMIT');
  }
});

test('a failed return-to-review audit rolls back the opportunity save', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('INSERT INTO tbl_opportunity_engage_tracker')) throw new Error('Audit unavailable');
      return { rows: sql.startsWith('SELECT') || sql.includes('RETURNING') ? [{ opportunityId: 10, stageId: 1, subStageId: 2, createdBy: 7, assignedTo: 7 }] : [] };
    },
    release: () => {},
  }));
  await assert.rejects(update(10, { stageId: 1, subStageId: 2, opportunityName: 'Corrected' }, 7), /Audit unavailable/);
  assert.equal(calls.at(-1), 'ROLLBACK');
  assert.equal(calls.includes('COMMIT'), false);
});

test('a save based on a stale review step cannot overwrite a newer approval', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => { calls.push(sql); return { rows: [{ stageId: 2, subStageId: 4, createdBy: 7, assignedTo: null }] }; },
    release: () => {},
  }));
  await assert.rejects(update(10, { stageId: 1, subStageId: 2, opportunityName: 'Old edit' }, 7), /changed while you were editing/);
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
