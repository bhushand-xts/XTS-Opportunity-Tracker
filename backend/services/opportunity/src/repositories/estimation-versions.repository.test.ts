import 'dotenv/config';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { saveEstimationVersion, saveEstimation, transitionWorkflow, type OpportunityEstimation } from './opportunity.repository';
const db = require('../config/db');
const estimate: OpportunityEstimation = { revision: 2, rows: [{ id: 'grid-1-PM', workItem: 'Discovery — PM', hours: '40', people: 1, hourlyRate: '25' }], assumptions: 'Original', total: '1000', grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] } };
function database(t: TestContext, options: { duplicate?: boolean; failSnapshot?: boolean; stale?: boolean; submitted?: boolean } = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  t.mock.method(db.pool, 'connect', async () => ({ query: async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT stage_id, sub_stage_id')) return { rows: [{ stage_id: 3, sub_stage_id: 7 }] };
    if (sql.startsWith('SELECT stage_id AS')) return { rows: [{ stageId: 3, subStageId: 7 }] };
    if (sql.startsWith('SELECT revision FROM')) return { rows: [{ revision: 2 }] };
    if (sql.includes('FROM tbl_opportunity_estimation_versions WHERE') && sql.includes('request_key =')) return { rows: options.duplicate ? [{ id: '10', version: 1 }] : [] };
    if (sql.startsWith('INSERT INTO tbl_opportunity_estimation_matrix')) return { rows: options.stale ? [] : [{ revision: 3 }] };
    if (sql.startsWith('INSERT INTO tbl_opportunity_estimation_versions')) {
      if (options.failSnapshot) throw new Error('Snapshot unavailable');
      return { rows: [{ id: '11', version: 2 }] };
    }
    if (sql.startsWith('UPDATE tbl_opportunity\n')) return { rows: [{ opportunityId: 10 }] };
    return { rows: [] };
  }, release() {} }));
  return calls;
}
test('named version saves draft and immutable snapshot together with database-assigned numbering', async t => {
  const calls = database(t);
  assert.equal((await saveEstimationVersion(10, estimate, 'Baseline', 7, 'request-1')).version, 2);
  const snapshot = calls.find(call => call.sql.startsWith('INSERT INTO tbl_opportunity_estimation_versions'))!;
  assert.deepEqual(snapshot.params, [10, 'Baseline', 'SAVED', 7, 'request-1']);
  assert.match(snapshot.sql, /MAX\(version\)/);
  assert.match(snapshot.sql, /'rows', e.rows/);
  assert.match(snapshot.sql, /currency_code/);
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
  assert.ok(calls.findIndex(call => call.sql.includes('FOR UPDATE')) < calls.findIndex(call => call === snapshot));
});
test('retrying a named save returns the same version without rewriting the draft', async t => {
  const calls = database(t, { duplicate: true });
  assert.equal((await saveEstimationVersion(10, estimate, 'Baseline', 7, 'same-request')).id, '10');
  assert.equal(calls.some(call => call.sql.startsWith('INSERT')), false);
});
test('snapshot failure or stale draft rolls back the entire named save', async t => {
  for (const options of [{ failSnapshot: true }, { stale: true }]) {
    const calls = database(t, options);
    await assert.rejects(saveEstimationVersion(10, estimate, 'Baseline', 7, 'request-2'));
    assert.equal(calls.at(-1)?.sql, 'ROLLBACK');
    assert.equal(calls.some(call => call.sql === 'COMMIT'), false);
  }
});
test('ordinary Save Draft does not create a named version', async t => {
  const calls = database(t);
  await saveEstimation(10, estimate, 7);
  assert.equal(calls.some(call => call.sql.includes('tbl_opportunity_estimation_versions')), false);
});
test('submission snapshots its exact persisted matrix in the workflow transaction', async t => {
  const calls = database(t);
  await transitionWorkflow(10, 4, 8, null, 7, 'Review', null, {}, { stageId: 3, subStageId: 7, estimationRevision: 2 });
  const snapshot = calls.find(call => call.sql.startsWith('INSERT INTO tbl_opportunity_estimation_versions'))!;
  assert.deepEqual(snapshot.params, [10, 'Submitted estimate', 'SUBMITTED', 7, 'submitted-2']);
  assert.ok(calls.some(call => call.sql.includes('INSERT INTO tbl_opportunity_engage_tracker')));
  assert.equal(calls.at(-1)?.sql, 'COMMIT');
});
