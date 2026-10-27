import 'dotenv/config';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { findScope, saveScope, type OpportunityScope } from './scope.repository';
const db = require('../config/db');

const original: OpportunityScope = { revision: 3, summary: 'Original scope', risks: [{ id: '21', description: 'Access delay', severity: 'HIGH' }], alignment: [{ id: '31', text: 'Client platform' }] };
function database(t: TestContext, options: { stageId?: number; revision?: number; failHistory?: boolean; scopeActive?: boolean; noScope?: boolean } = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT stage_id')) return { rows: [{ stageId: options.stageId ?? 3, subStageId: 7 }] };
      if (sql.includes('::INTEGER AS revision')) return { rows: [{ ...original, revision: options.revision ?? original.revision }] };
      if (sql.startsWith('SELECT scope_id')) return { rows: options.noScope ? [] : [{ id: '11', description: original.summary, isActive: options.scopeActive ?? true }] };
      if (options.failHistory && sql.startsWith('INSERT INTO') && sql.includes('_tracker')) throw new Error('History unavailable');
      return { rows: [] };
    }, release: () => {},
  }));
  return calls;
}

test('scope loading scopes all six tables to one opportunity and returns only active current items', async t => {
  const read = t.mock.method(db, 'query', async () => [original]);
  assert.deepEqual(await findScope(10), original);
  const [sql, params] = read.mock.calls[0].arguments as [string, unknown[]];
  assert.deepEqual(params, [10]);
  assert.equal((sql.match(/SELECT COUNT\(\*\)/g) ?? []).length, 6);
  assert.equal((sql.match(/is_active = TRUE/g) ?? []).length, 3);
  assert.match(sql, /risk_id::TEXT/);
  assert.match(sql, /alignment_id::TEXT/);
});

test('scope, risk edits and alignment removal snapshot previous rows before changing current records in one transaction', async t => {
  const calls = database(t);
  await saveScope(10, { ...original, summary: 'Updated scope', risks: [{ id: '21', description: 'Reduced delay', severity: 'LOW' }, { id: 'draft-new-risk', description: 'Schedule', severity: 'MEDIUM' }], alignment: [{ id: 'draft-new-alignment', text: 'New platform' }] }, 'ALL', 7);
  for (const table of ['scope', 'risk', 'alignment']) {
    const snapshot = calls.findIndex(call => call.sql.startsWith(`INSERT INTO tbl_opportunity_${table}_tracker`));
    const update = calls.findIndex(call => call.sql.startsWith(`UPDATE tbl_opportunity_${table} `));
    assert.ok(snapshot > 0 && snapshot < update);
    assert.match(calls[snapshot].sql, /SELECT .*created_by, created_dt, updated_by, updated_dt, is_active FROM/);
    assert.match(calls[snapshot].sql, /WHERE opportunity_id = \$1 AND/);
    assert.equal(calls[snapshot].params[0], 10);
    assert.doesNotMatch(calls[snapshot].sql, /archived_/);
  }
  assert.deepEqual(calls.find(call => call.sql.startsWith('UPDATE tbl_opportunity_risk '))?.params, [10, '21', 'Reduced delay', 7, 'LOW']);
  assert.deepEqual(calls.find(call => call.sql.startsWith('INSERT INTO tbl_opportunity_risk ('))?.params, [10, 'Schedule', 7, 'MEDIUM']);
  assert.match(calls.find(call => call.sql.startsWith('UPDATE tbl_opportunity_alignment '))!.sql, /is_active = FALSE/);
  assert.doesNotMatch(calls.map(call => call.sql).join('\n'), /DELETE FROM/);
  assert.equal(calls[0].sql, 'BEGIN');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('individual section saves leave other sections untouched and no-op saves do not create history', async t => {
  let calls = database(t);
  await saveScope(10, { ...original, summary: 'Unsaved scope', risks: [], alignment: [] }, 'RISKS', 7);
  assert.ok(calls.some(call => call.sql.startsWith('UPDATE tbl_opportunity_risk ')));
  assert.equal(calls.some(call => /^(INSERT INTO|UPDATE) tbl_opportunity_(scope|alignment)/.test(call.sql)), false);
  calls = database(t);
  await saveScope(10, original, 'ALL', 7);
  assert.equal(calls.some(call => /^(INSERT|UPDATE)/.test(call.sql)), false);
});

test('stale revisions, cross-opportunity IDs, and stage changes reject before assessment writes', async t => {
  for (const scenario of [
    { options: { revision: 4 }, input: original, message: /has changed/ },
    { options: {}, input: { ...original, risks: [{ id: '999', description: 'Other opportunity', severity: 'HIGH' as const }] }, message: /no longer available/ },
    { options: { stageId: 4 }, input: original, message: /engineering estimation/ },
  ]) {
    const calls = database(t, scenario.options);
    await assert.rejects(saveScope(10, scenario.input, 'RISKS', 7), scenario.message);
    assert.equal(calls.some(call => /^(INSERT|UPDATE)/.test(call.sql)), false);
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('history failures roll back the entire assessment save', async t => {
  const calls = database(t, { failHistory: true });
  await assert.rejects(saveScope(10, { ...original, summary: 'Update' }, 'SCOPE', 7), /History unavailable/);
  assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  assert.equal(calls.some(call => call.sql === 'COMMIT'), false);
});

test('removing scope preserves its description, records the previous row, and only changes active status and audit fields', async t => {
  const calls = database(t);
  await saveScope(10, { ...original, summary: '' }, 'SCOPE', 7);
  const history = calls.findIndex(call => call.sql.startsWith('INSERT INTO tbl_opportunity_scope_tracker'));
  const update = calls.findIndex(call => call.sql.startsWith('UPDATE tbl_opportunity_scope '));
  assert.ok(history >= 0 && history < update);
  assert.match(calls[update].sql, /SET is_active = FALSE, updated_by = \$2, updated_dt = CURRENT_TIMESTAMP/);
  assert.doesNotMatch(calls[update].sql, /scope_description =/);
  assert.deepEqual(calls[update].params, [10, 7]);
  assert.doesNotMatch(calls.map(call => call.sql).join('\n'), /DELETE FROM/);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('removing an absent or inactive scope creates no empty record or duplicate history; re-entering scope reactivates the same row', async t => {
  for (const options of [{ noScope: true }, { scopeActive: false }]) {
    const calls = database(t, options);
    await saveScope(10, { ...original, summary: '' }, 'SCOPE', 7);
    assert.equal(calls.some(call => /^(INSERT|UPDATE)/.test(call.sql)), false);
  }
  const calls = database(t, { scopeActive: false });
  await saveScope(10, { ...original, summary: 'Restored scope' }, 'SCOPE', 8);
  assert.ok(calls.some(call => call.sql.startsWith('INSERT INTO tbl_opportunity_scope_tracker')));
  assert.equal(calls.some(call => call.sql.startsWith('INSERT INTO tbl_opportunity_scope (')), false);
  assert.match(calls.find(call => call.sql.startsWith('UPDATE tbl_opportunity_scope '))!.sql, /is_active = TRUE/);
});
