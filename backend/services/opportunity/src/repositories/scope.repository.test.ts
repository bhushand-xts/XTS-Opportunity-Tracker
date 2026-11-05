import 'dotenv/config';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { findScope, saveScope, type OpportunityScope } from './scope.repository';
const db = require('../config/db');

const original: OpportunityScope = { revision: 3, summary: 'Original scope', risks: [{ id: '21', description: 'Access delay', severity: 'HIGH' }], alignment: [{ id: '31', text: 'Client platform' }] };
function database(t: TestContext, options: { stageId?: number; subStageId?: number; revision?: number; failHistory?: boolean; scopeActive?: boolean; noScope?: boolean; current?: OpportunityScope } = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      if (sql.startsWith('SELECT stage_id')) return { rows: [{ stageId: options.stageId ?? 3, subStageId: options.subStageId ?? 7 }] };
      if (sql.includes('::INTEGER AS revision')) return { rows: [{ ...(options.current ?? original), revision: options.revision ?? options.current?.revision ?? original.revision }] };
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
  assert.equal((sql.match(/COUNT\(\*\) \* 2 FROM tbl_opportunity_\w+_tracker/g) ?? []).length, 3, 'History must advance the revision even when a current row is deleted.');
  assert.equal((sql.match(/is_active = TRUE/g) ?? []).length, 3);
  assert.match(sql, /risk_id::TEXT/);
  assert.match(sql, /alignment_id::TEXT/);
});

test('scope, risk edits and alignment removal snapshot previous rows before changing current records in one transaction', async t => {
  const calls = database(t);
  await saveScope(10, { ...original, summary: 'Updated scope', risks: [{ id: '21', description: 'Reduced delay', severity: 'LOW' }, { id: 'draft-new-risk', description: 'Schedule', severity: 'MEDIUM' }], alignment: [{ id: 'draft-new-alignment', text: 'New platform' }] }, 'ALL', 7);
  for (const table of ['scope', 'risk', 'alignment']) {
    const snapshot = calls.findIndex(call => call.sql.startsWith(`INSERT INTO tbl_opportunity_${table}_tracker`));
    const update = calls.findIndex(call => call.sql.startsWith(`${table === 'alignment' ? 'DELETE FROM' : 'UPDATE'} tbl_opportunity_${table}${table === 'alignment' ? '\n' : ' '}`));
    assert.ok(snapshot > 0 && snapshot < update);
    assert.match(calls[snapshot].sql, /SELECT .*created_by, created_dt, updated_by, updated_dt, is_active FROM/);
    assert.match(calls[snapshot].sql, /WHERE opportunity_id = \$1 AND/);
    assert.equal(calls[snapshot].params[0], 10);
    assert.doesNotMatch(calls[snapshot].sql, /archived_/);
  }
  assert.deepEqual(calls.find(call => call.sql.startsWith('UPDATE tbl_opportunity_risk '))?.params, [10, '21', 'Reduced delay', 7, 'LOW']);
  assert.deepEqual(calls.find(call => call.sql.startsWith('INSERT INTO tbl_opportunity_risk ('))?.params, [10, 'Schedule', 7, 'MEDIUM']);
  assert.deepEqual(calls.find(call => call.sql.startsWith('DELETE FROM tbl_opportunity_alignment'))?.params, [10, '31']);
  assert.equal(calls[0].sql, 'BEGIN');
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});

test('individual section saves leave other sections untouched and no-op saves do not create history', async t => {
  let calls = database(t);
  await saveScope(10, { ...original, summary: 'Unsaved scope', risks: [], alignment: [] }, 'RISKS', 7);
  assert.ok(calls.some(call => call.sql.startsWith('DELETE FROM tbl_opportunity_risk')));
  assert.equal(calls.some(call => /^(INSERT INTO|UPDATE|DELETE FROM) tbl_opportunity_(scope|alignment)/.test(call.sql)), false);
  calls = database(t);
  await saveScope(10, original, 'ALL', 7);
  assert.equal(calls.some(call => /^(INSERT|UPDATE)/.test(call.sql)), false);
});

test('stale revisions, cross-opportunity IDs, and stage changes reject before assessment writes', async t => {
  for (const scenario of [
    { options: { revision: 4 }, input: original, message: /has changed/ },
    { options: {}, input: { ...original, risks: [{ id: '999', description: 'Other opportunity', severity: 'HIGH' as const }] }, message: /no longer available/ },
    ...[[5, 10], [6, 12], [7, 13], [8, 14], [9, 18], [10, 20]].map(([stageId, subStageId]) => ({ options: { stageId, subStageId }, input: original, message: /read-only/ })),
  ]) {
    const calls = database(t, scenario.options);
    await assert.rejects(saveScope(10, scenario.input, 'RISKS', 7), scenario.message);
    assert.equal(calls.some(call => /^(INSERT|UPDATE|DELETE)/.test(call.sql)), false);
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('assessment saves recheck the locked pre-approval workflow and permit every assessment section through CEO review', async t => {
  for (const [stageId, subStageId] of [[1, 1], [2, 4], [3, 7], [4, 8], [4, 9]]) {
    for (const section of ['SCOPE', 'RISKS', 'ALIGNMENT'] as const) {
      const calls = database(t, { stageId, subStageId });
      await saveScope(10, { ...original, summary: 'Revised scope', risks: [], alignment: [] }, section, 7);
      assert.match(calls[1].sql, /sub_stage_id AS "subStageId"[\s\S]*FOR UPDATE/);
      assert.ok(calls.some(call => /^(INSERT INTO|UPDATE|DELETE)/.test(call.sql)));
      assert.equal(calls.at(-1)?.sql, 'COMMIT');
    }
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

test('risk and alignment removal archives each row before deleting only that opportunity row', async t => {
  for (const [section, name, id] of [['RISKS', 'risk', '21'], ['ALIGNMENT', 'alignment', '31']] as const) {
    const calls = database(t);
    await saveScope(10, { ...original, risks: [], alignment: [] }, section, 7);
    const history = calls.findIndex(call => call.sql.startsWith(`INSERT INTO tbl_opportunity_${name}_tracker`));
    const deletion = calls.findIndex(call => call.sql.startsWith(`DELETE FROM tbl_opportunity_${name}`));
    assert.ok(history >= 0 && history < deletion);
    assert.deepEqual(calls[deletion].params, [10, id]);
    assert.match(calls[deletion].sql, new RegExp(`WHERE opportunity_id = \\$1 AND ${name}_id = \\$2 AND is_active = TRUE`));
    assert.equal(calls.some(call => call.sql.startsWith(`UPDATE tbl_opportunity_${name} `)), false);
    assert.equal(calls.at(-1)?.sql, 'COMMIT');
  }
});

test('a failed deletion history write prevents deletion and rolls back', async t => {
  for (const section of ['RISKS', 'ALIGNMENT'] as const) {
    const calls = database(t, { failHistory: true });
    await assert.rejects(saveScope(10, { ...original, risks: [], alignment: [] }, section, 7), /History unavailable/);
    assert.equal(calls.some(call => call.sql.startsWith('DELETE')), false);
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
  }
});

test('rejects duplicate risk and alignment additions against saved rows regardless of case, spacing or severity', async t => {
  for (const section of ['RISKS', 'ALIGNMENT'] as const) {
    const calls = database(t);
    const input: OpportunityScope = { ...original, summary: 'Do not save this scope',
      risks: [...original.risks, { id: 'draft-risk', description: '  ACCESS   delay ', severity: 'LOW' }],
      alignment: [...original.alignment, { id: 'draft-alignment', text: '  CLIENT\t platform ' }],
    };
    await assert.rejects(saveScope(10, input, section, 7), /already exists for this opportunity/);
    assert.equal(calls.some(call => /^(INSERT|UPDATE|DELETE)/.test(call.sql)), false);
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
    assert.ok(calls.some(call => /FOR UPDATE/.test(call.sql)), 'Validation runs while the opportunity is locked.');
  }
});

test('rejects renaming an existing item to another saved description and duplicate items in one batch', async t => {
  const current: OpportunityScope = { ...original,
    risks: [...original.risks, { id: '22', description: 'Schedule', severity: 'LOW' }],
    alignment: [...original.alignment, { id: '32', text: 'Standards' }],
  };
  for (const input of [
    { ...current, risks: current.risks.map(item => item.id === '22' ? { ...item, description: 'access DELAY' } : item) },
    { ...current, alignment: current.alignment.map(item => item.id === '32' ? { ...item, text: 'client PLATFORM' } : item) },
    { ...current, risks: [...current.risks, { id: 'draft-1', description: 'New risk', severity: 'HIGH' as const }, { id: 'draft-2', description: 'NEW  risk', severity: 'LOW' as const }] },
    { ...current, alignment: [...current.alignment, { id: 'draft-1', text: 'New alignment' }, { id: 'draft-2', text: 'NEW  alignment' }] },
  ]) {
    const calls = database(t, { current });
    await assert.rejects(saveScope(10, input, 'ALL', 7), /already exists for this opportunity/);
    assert.equal(calls.some(call => /^(INSERT|UPDATE|DELETE)/.test(call.sql)), false);
  }
});

test('allows an item to keep its own description and allows a description when absent from this opportunity', async t => {
  const calls = database(t);
  await saveScope(10, { ...original, risks: [{ ...original.risks[0], severity: 'LOW' }], alignment: [...original.alignment, { id: 'draft-other', text: 'Different platform' }] }, 'ALL', 7);
  assert.ok(calls.some(call => call.sql.startsWith('UPDATE tbl_opportunity_risk ')));
  assert.ok(calls.some(call => call.sql.startsWith('INSERT INTO tbl_opportunity_alignment (')));
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.deepEqual(calls.find(call => call.sql.includes('::INTEGER AS revision'))?.params, [10]);
});

test('existing duplicates can be removed or corrected without blocking other edits', async t => {
  const current: OpportunityScope = { ...original,
    risks: [...original.risks, { id: '22', description: 'ACCESS  delay', severity: 'LOW' }],
    alignment: [...original.alignment, { id: '32', text: 'CLIENT  platform' }],
  };
  let calls = database(t, { current });
  await saveScope(10, { ...current, risks: [...current.risks, { id: 'draft-new', description: 'Unique risk', severity: 'HIGH' }], alignment: current.alignment.filter(item => item.id !== '32') }, 'ALL', 7);
  assert.ok(calls.some(call => call.sql.startsWith('DELETE FROM tbl_opportunity_alignment')));
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  calls = database(t, { current });
  await saveScope(10, { ...current, risks: current.risks.map(item => item.id === '22' ? { ...item, description: 'Corrected risk' } : item) }, 'RISKS', 7);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});
