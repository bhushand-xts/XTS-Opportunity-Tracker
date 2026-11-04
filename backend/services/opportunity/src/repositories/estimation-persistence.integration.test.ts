import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { Client } from 'pg';
import env from '../config/env';
import * as estimates from './estimation.repository';
import type { OpportunityEstimation } from './opportunity.repository';
const db = require('../config/db');

// All test writes are connection-local temporary tables, never application rows.
test('two-table persistence creates, edits, submits and deletes with exact previous-row history', { skip: process.env.ESTIMATION_DB_TEST !== 'true' }, async t => {
  const client = new Client({ ...env.db, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  await client.connect();
  try {
    await client.query(`SET search_path TO pg_temp;
      CREATE TEMP TABLE tbl_opportunity (opportunity_id INTEGER PRIMARY KEY, stage_id INTEGER, sub_stage_id INTEGER, is_active BOOLEAN);
      INSERT INTO tbl_opportunity VALUES (10,3,7,TRUE), (20,3,7,TRUE);
      CREATE TEMP TABLE mst_currency (currency_id INTEGER, currency_code TEXT, is_active BOOLEAN);
      INSERT INTO mst_currency VALUES (1,'USD',TRUE);
      CREATE TEMP TABLE mst_rate (role_code TEXT, default_rate NUMERIC, rate_type TEXT, currency_id INTEGER, is_active BOOLEAN);
      INSERT INTO mst_rate VALUES ('PM',4000,'Monthly',1,TRUE)`);
    const ddl = readFileSync(path.resolve(process.cwd(), '../../database/migrations/20261103_opportunity_estimation_persistence.sql'), 'utf8')
      .replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TEMP TABLE IF NOT EXISTS');
    await client.query(ddl);
    await client.query(ddl);
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation')).rows[0].n, 0);
    t.mock.method(db.pool, 'connect', async () => ({ query: client.query.bind(client), release() {} }));
    t.mock.method(db, 'query', async (sql: string, values: unknown[]) => (await client.query(sql, values)).rows);
    const initial: OpportunityEstimation = { revision: 0, rows: [{ id: 'grid-1-PM', workItem: 'Discovery — PM', hours: '40', people: 1, hourlyRate: '25' }], assumptions: 'Preserve this', total: '1000.00', grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] } };
    const first = await estimates.saveEstimationVersion(10, initial, 'Baseline', 7, 'create-1');
    assert.equal(first.currencyCode, 'USD');
    assert.equal(first.version, 1);
    assert.equal(first.revision, 1);
    assert.equal((await estimates.findEstimation(10))!.revision, 2);
    const second = await estimates.saveEstimationVersion(10, { ...initial, revision: 2 }, 'Alternative', 7, 'create-2');
    assert.equal(second.version, 2);
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation WHERE is_current=TRUE')).rows[0].n, 0, 'No working copy or unselected estimate is current');
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation_tracker')).rows[0].n, 0);
    const previous = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e WHERE estimation_id=$1', [first.id])).rows[0].row;
    const edited = { ...initial, revision: 3, rows: [{ ...initial.rows[0], hours: '80' }], grid: { ...initial.grid!, durations: [{ phaseId: 1, weeks: '2' }] }, total: '2000.00' };
    const updated = await estimates.saveEstimationVersion(10, edited, 'Renamed', 8, 'edit-1', first.id, 1);
    assert.equal(updated.id, first.id);
    assert.equal(updated.version, 1);
    assert.equal(updated.revision, 2);
    assert.equal(updated.name, 'Renamed');
    assert.equal(updated.estimation.total, '2000.00');
    assert.equal((await estimates.listEstimationVersions(10)).length, 2);
    assert.deepEqual((await client.query("SELECT to_jsonb(t)-'tracker_id' AS row FROM tbl_opportunity_estimation_tracker t")).rows, [{ row: previous }]);
    assert.equal((await estimates.findEstimation(10))!.revision, 4);
    assert.deepEqual((await estimates.findEstimationVersion(10, first.id))!.estimation.grid, edited.grid);
    assert.equal(await estimates.findEstimationVersion(20, first.id), null);
    assert.equal((await estimates.saveEstimationVersion(10, edited, 'Renamed', 8, 'edit-1', first.id, 1)).id, first.id);
    await assert.rejects(estimates.saveEstimationVersion(10, { ...edited, revision: 4 }, 'Stale', 8, 'stale-1', first.id, 1), /changed/);
    await assert.rejects(estimates.saveEstimationVersion(10, edited, 'Stale working', 8, 'stale-2', first.id, 2), /changed/);
    await assert.rejects(estimates.saveEstimationVersion(10, { ...edited, revision: 4 }, 'Retry old create', 7, 'create-1'), /already been processed/);
    await client.query(`CREATE FUNCTION pg_temp.reject_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'History unavailable'; END $$;
      CREATE TRIGGER reject_history BEFORE INSERT ON tbl_opportunity_estimation_tracker FOR EACH ROW EXECUTE PROCEDURE pg_temp.reject_history()`);
    const beforeFailure = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e ORDER BY estimation_id')).rows;
    await assert.rejects(estimates.saveEstimationVersion(10, { ...edited, revision: 4 }, 'Failed', 8, 'failed', first.id, 2), /History unavailable/);
    assert.deepEqual((await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e ORDER BY estimation_id')).rows, beforeFailure);
    await client.query('DROP TRIGGER reject_history ON tbl_opportunity_estimation_tracker');
    await assert.rejects(db.transaction(async (c: any) => estimates.submitSelectedEstimation(c, 10, first.id, 4, 1, 7)), /changed/);
    await db.transaction(async (c: any) => {
      await c.query('SELECT opportunity_id FROM tbl_opportunity WHERE opportunity_id=10 FOR UPDATE');
      await estimates.submitSelectedEstimation(c, 10, first.id, 4, 2, 7);
      await c.query('UPDATE tbl_opportunity SET stage_id=4,sub_stage_id=8 WHERE opportunity_id=10');
    });
    assert.equal((await estimates.listEstimationVersions(10)).length, 2, 'Submission must not create another named estimate');
    assert.equal((await estimates.findEstimationVersion(10, first.id))!.status, 'SUBMITTED');
    assert.equal((await estimates.findEstimation(10))!.status, 'SUBMITTED');
    assert.equal((await client.query('SELECT isselected FROM tbl_opportunity_estimation WHERE estimation_id=$1', [first.id])).rows[0].isselected, true);
    assert.deepEqual((await client.query('SELECT estimation_id::TEXT AS id FROM tbl_opportunity_estimation WHERE is_current=TRUE')).rows, [{ id: first.id }]);
    const reviewUpdate = await estimates.saveEstimationVersion(10, { ...edited, revision: 5 }, 'During review', 9, 'review-edit', first.id, 3);
    assert.equal(reviewUpdate.id, first.id);
    assert.equal(reviewUpdate.status, 'SUBMITTED');
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation_tracker')).rows[0].n, 3);
    await estimates.saveEstimationVersion(10, { ...edited, revision: 6, rows: [{ ...edited.rows[0], hours: '120' }], total: '3000.00' }, 'Another alternative during review', 9, 'review-alternative');
    assert.equal((await estimates.findEstimation(10))!.total, '2000.00', 'An alternative must not replace the estimate selected for CEO review');
    assert.deepEqual((await estimates.listEstimationVersions(10, true)).map(row => row.id), [first.id], 'CEO sees only the selected submitted estimate, even after another alternative is saved');
    assert.deepEqual((await client.query('SELECT estimation_id::TEXT AS id FROM tbl_opportunity_estimation WHERE is_current=TRUE')).rows, [{ id: first.id }], 'Saving an alternative keeps only the submitted estimate current');
    await client.query('UPDATE tbl_opportunity SET stage_id=5,sub_stage_id=10 WHERE opportunity_id=10');
    await assert.rejects(estimates.saveEstimationVersion(10, { ...edited, revision: 6 }, 'Too late', 9, 'late', first.id, 4), /read-only/);
    await client.query('UPDATE tbl_opportunity SET stage_id=3,sub_stage_id=7 WHERE opportunity_id=10');
    const beforeDelete = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e WHERE estimation_id=$1', [second.id])).rows[0].row;
    await estimates.deleteEstimationVersion(10, second.id, 7);
    assert.equal((await estimates.listEstimationVersions(10)).length, 2);
    assert.equal(await estimates.findEstimationVersion(10, second.id), null);
    assert.deepEqual((await client.query("SELECT to_jsonb(t)-'tracker_id' AS row FROM tbl_opportunity_estimation_tracker t WHERE estimation_id=$1", [second.id])).rows, [{ row: beforeDelete }]);
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation WHERE estimation_id=$1', [second.id])).rows[0].n, 1, 'Deletion retains the audited record');
    const replacement = (await estimates.listEstimationVersions(10)).find(row => row.id !== first.id)!;
    const previousCurrent = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e WHERE estimation_id=$1', [first.id])).rows[0].row;
    await db.transaction(async (c: any) => {
      await c.query('SELECT opportunity_id FROM tbl_opportunity WHERE opportunity_id=10 FOR UPDATE');
      await estimates.submitSelectedEstimation(c, 10, replacement.id, (await estimates.findEstimation(10))!.revision, replacement.revision, 7);
    });
    assert.deepEqual((await client.query('SELECT estimation_id::TEXT AS id FROM tbl_opportunity_estimation WHERE is_current=TRUE')).rows, [{ id: replacement.id }]);
    assert.deepEqual((await client.query('SELECT isselected,is_current FROM tbl_opportunity_estimation WHERE estimation_id=$1', [first.id])).rows, [{ isselected: false, is_current: false }]);
    assert.deepEqual((await client.query("SELECT to_jsonb(t)-'tracker_id' AS row FROM tbl_opportunity_estimation_tracker t WHERE estimation_id=$1 ORDER BY tracker_id DESC LIMIT 1", [first.id])).rows, [{ row: previousCurrent }]);
    const columns = (await client.query("SELECT attname FROM pg_attribute WHERE attrelid='tbl_opportunity_estimation'::REGCLASS AND attnum>0 AND NOT attisdropped")).rows.map(row => row.attname);
    assert.equal(columns.includes('revision'), false);
    assert.equal(columns.includes('estimation_name'), true);
  } finally {
    t.mock.restoreAll();
    await client.end();
  }
});


test('CEO repricing archives one exact previous row, preserves master rates, and survives subsequent resource edits', { skip: process.env.ESTIMATION_DB_TEST !== 'true' }, async t => {
  const client = new Client({ ...env.db, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  await client.connect();
  try {
    await client.query(`SET search_path TO pg_temp;
      CREATE TEMP TABLE tbl_opportunity (opportunity_id INTEGER PRIMARY KEY, stage_id INTEGER, sub_stage_id INTEGER, is_active BOOLEAN);
      INSERT INTO tbl_opportunity VALUES (10,3,7,TRUE), (20,3,7,TRUE);
      CREATE TEMP TABLE mst_currency (currency_id INTEGER, currency_code TEXT, is_active BOOLEAN);
      INSERT INTO mst_currency VALUES (1,'USD',TRUE);
      CREATE TEMP TABLE mst_rate (role_code TEXT, default_rate NUMERIC, rate_type TEXT, currency_id INTEGER, is_active BOOLEAN);
      INSERT INTO mst_rate VALUES ('PM',4000,'Monthly',1,TRUE)`);
    await client.query(readFileSync(path.resolve(process.cwd(), '../../database/migrations/20261103_opportunity_estimation_persistence.sql'), 'utf8').replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TEMP TABLE IF NOT EXISTS'));
    t.mock.method(db.pool, 'connect', async () => ({ query: client.query.bind(client), release() {} }));
    t.mock.method(db, 'query', async (sql: string, values: unknown[]) => (await client.query(sql, values)).rows);
    const input: OpportunityEstimation = { revision: 0, assumptions: 'Keep allocations', total: '1', rates: [{ roleCode: 'PM', rate: '1', rateType: 'Monthly', currencyCode: 'USD' }],
      grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] },
      rows: [{ id: 'grid-1-PM', workItem: 'Discovery', hours: '40', people: 1, hourlyRate: '1' }] };
    const saved = await estimates.saveEstimationVersion(10, input, 'Original', 7, 'create');
    assert.equal(saved.estimation.total, '1000.00', 'Team cannot override master rates on creation');
    await assert.rejects(estimates.updateEstimationRates(10, saved.id, 1, [{ roleCode: 'PM', rate: '8000' }], 9), /selected, submitted/);
    // Set up the submitted selection without including submission history in
    // this rate-update assertion; the previous test exercises real submission.
    await client.query(`UPDATE tbl_opportunity_estimation SET isselected=TRUE,is_current=TRUE,
      resource_allocation=jsonb_set(jsonb_set(resource_allocation,'{status}','"SUBMITTED"'::JSONB),'{saved,status}','"SUBMITTED"'::JSONB)
      WHERE estimation_id=$1`, [saved.id]);
    await client.query('UPDATE tbl_opportunity SET stage_id=4,sub_stage_id=8 WHERE opportunity_id=10');
    const alternative = await estimates.saveEstimationVersion(10, { ...input, revision: 2 }, 'Alternative after submission', 7, 'alternative');
    await assert.rejects(estimates.updateEstimationRates(10, alternative.id, 1, [{ roleCode: 'PM', rate: '8000' }], 9), /selected, submitted/);
    assert.deepEqual((await estimates.listEstimationVersions(10, true)).map(row => row.id), [saved.id]);
    const mainCount = (await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation')).rows[0].n;
    const previous = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e WHERE estimation_id=$1', [saved.id])).rows[0].row;
    const updated = await estimates.updateEstimationRates(10, saved.id, saved.revision, [{ roleCode: 'PM', rate: '8000' }], 9);
    assert.equal(updated.id, saved.id);
    assert.equal(updated.version, saved.version);
    assert.equal(updated.revision, 2);
    assert.equal(updated.estimation.total, '2000.00');
    assert.equal(updated.isSelected, true);
    assert.equal(updated.status, 'SUBMITTED');
    assert.deepEqual((await client.query('SELECT estimation_id::TEXT AS id FROM tbl_opportunity_estimation WHERE is_current=TRUE')).rows, [{ id: saved.id }]);
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation')).rows[0].n, mainCount, 'CEO rate updates must not insert any main-table row');
    assert.deepEqual(updated.estimation.grid, input.grid);
    assert.equal((await estimates.findEstimation(10))!.total, '2000.00');
    assert.deepEqual((await client.query("SELECT to_jsonb(t)-'tracker_id' AS row FROM tbl_opportunity_estimation_tracker t")).rows, [{ row: previous }]);
    assert.equal(Number((await client.query('SELECT default_rate FROM mst_rate')).rows[0].default_rate), 4000);
    assert.deepEqual((await client.query('SELECT rate_snapshot FROM tbl_opportunity_estimation WHERE estimation_id=$1', [saved.id])).rows[0].rate_snapshot.roles, { PM: { rate: '8000', rateType: 'Monthly', currencyCode: 'USD' } });
    await assert.rejects(estimates.updateEstimationRates(10, saved.id, 1, [{ roleCode: 'PM', rate: '9000' }], 9), /changed/);
    await assert.rejects(estimates.updateEstimationRates(20, saved.id, 2, [{ roleCode: 'PM', rate: '9000' }], 9), /changed/);
    await assert.rejects(estimates.updateEstimationRates(10, saved.id, 2, [{ roleCode: 'Unknown', rate: '9000' }], 9), /technical roles/);
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation_tracker')).rows[0].n, 1);
    const teamEdit = await estimates.saveEstimationVersion(10, { ...input, revision: 4, rows: [{ ...input.rows[0], hours: '80' }], grid: { ...input.grid!, durations: [{ phaseId: 1, weeks: '2' }] } }, 'Original', 7, 'edit', saved.id, 2);
    assert.equal(teamEdit.estimation.total, '4000.00', 'Resource edits preserve the CEO override instead of accepting a client rate');
    await client.query(`CREATE FUNCTION pg_temp.reject_rates_history() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'History unavailable'; END $$;
      CREATE TRIGGER reject_rates_history BEFORE INSERT ON tbl_opportunity_estimation_tracker FOR EACH ROW EXECUTE PROCEDURE pg_temp.reject_rates_history()`);
    await assert.rejects(estimates.updateEstimationRates(10, saved.id, 3, [{ roleCode: 'PM', rate: '9000' }], 9), /History unavailable/);
    assert.equal((await estimates.findEstimationVersion(10, saved.id))!.estimation.total, '4000.00');
    await client.query('DROP TRIGGER reject_rates_history ON tbl_opportunity_estimation_tracker');
    await client.query('UPDATE tbl_opportunity SET stage_id=5,sub_stage_id=10 WHERE opportunity_id=10');
    await assert.rejects(estimates.updateEstimationRates(10, saved.id, 3, [{ roleCode: 'PM', rate: '9000' }], 9), /read-only/);
    // An older hourly-only snapshot should use the matching displayed monthly
    // master when first edited, preserving the exact original row in history.
    await client.query('UPDATE mst_rate SET default_rate=345465.03');
    const legacyInput = { ...input, rows: [{ ...input.rows[0], hours: '80' }], grid: { ...input.grid!, durations: [{ phaseId: 1, weeks: '2' }] } };
    const legacy = await estimates.saveEstimationVersion(20, legacyInput, 'Old hourly estimate', 7, 'legacy-create');
    await client.query(`UPDATE tbl_opportunity_estimation SET rate_snapshot=$1::JSONB,
      person_weeks_cost=jsonb_set(person_weeks_cost,'{total}','"172732.51"'::JSONB) WHERE opportunity_id=20`,
    [JSON.stringify({ rows: [{ id: 'grid-1-PM', hourlyRate: '2159.1564' }] })]);
    const legacyPrevious = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e WHERE estimation_id=$1', [legacy.id])).rows[0].row;
    const legacyUpdated = await estimates.saveEstimationVersion(20, { ...legacyInput, revision: 2 }, 'Old hourly estimate', 7, 'legacy-edit', legacy.id, 1);
    assert.equal(legacyUpdated.estimation.rates![0].rate, '345465.03');
    assert.equal(legacyUpdated.estimation.total, '172732.52');
    assert.deepEqual((await client.query("SELECT to_jsonb(t)-'tracker_id' AS row FROM tbl_opportunity_estimation_tracker t WHERE estimation_id=$1", [legacy.id])).rows, [{ row: legacyPrevious }]);
  } finally { t.mock.restoreAll(); await client.end(); }
});


test('current-selection migration fixes old flags, preserves exact named history, and is repeatable', { skip: process.env.ESTIMATION_DB_TEST !== 'true' }, async () => {
  const client = new Client({ ...env.db, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  await client.connect();
  try {
    await client.query('SET search_path TO pg_temp; CREATE TEMP TABLE tbl_opportunity (opportunity_id INTEGER PRIMARY KEY); INSERT INTO tbl_opportunity VALUES (10)');
    await client.query(readFileSync(path.resolve(process.cwd(), '../../database/migrations/20261103_opportunity_estimation_persistence.sql'), 'utf8').replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TEMP TABLE IF NOT EXISTS'));
    await client.query('ALTER TABLE tbl_opportunity_estimation DROP CONSTRAINT chk_estimation_current_selection');
    for (const [name, selected, current, allocation] of [
      ['', false, true, { rows: [] }],
      ['Selected', true, false, { saved: { version: 1, status: 'SUBMITTED' }, rows: [] }],
      ['Alternative', false, false, { saved: { version: 2, status: 'SAVED' }, rows: [] }],
    ] as const) await client.query(`INSERT INTO tbl_opportunity_estimation
      (opportunity_id,estimation_name,isselected,is_current,resource_allocation,rate_snapshot,person_weeks,person_weeks_cost,created_by)
      VALUES (10,$1,$2,$3,$4::JSONB,'{}','{}','{}',7)`, [name, selected, current, JSON.stringify(allocation)]);
    await client.query(`INSERT INTO tbl_opportunity_estimation_tracker
      (estimation_id,opportunity_id,resource_allocation,rate_snapshot,person_weeks,person_weeks_cost,estimation_name,isselected,is_current,created_by,created_dt)
      SELECT estimation_id,opportunity_id,resource_allocation,rate_snapshot,person_weeks,person_weeks_cost,estimation_name,isselected,TRUE,created_by,created_dt
      FROM tbl_opportunity_estimation WHERE estimation_name='Alternative'`);
    const before = (await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e ORDER BY estimation_id')).rows.map(row => row.row);
    const oldHistory = (await client.query('SELECT to_jsonb(t) AS row FROM tbl_opportunity_estimation_tracker t')).rows;
    const migration = readFileSync(path.resolve(process.cwd(), '../../database/migrations/20261104_estimation_current_selection.sql'), 'utf8');
    await client.query(migration);
    assert.deepEqual((await client.query('SELECT to_jsonb(e) AS row FROM tbl_opportunity_estimation e ORDER BY estimation_id')).rows.map(row => row.row), before.map(row => ({ ...row, is_current: row.isselected })));
    assert.deepEqual((await client.query('SELECT to_jsonb(t) AS row FROM tbl_opportunity_estimation_tracker t WHERE tracker_id=1')).rows, oldHistory);
    assert.deepEqual((await client.query("SELECT to_jsonb(t)-'tracker_id' AS row FROM tbl_opportunity_estimation_tracker t WHERE tracker_id<>1")).rows, [{ row: before[1] }]);
    await client.query(migration);
    assert.equal((await client.query('SELECT COUNT(*)::INT AS n FROM tbl_opportunity_estimation_tracker')).rows[0].n, 2);
    assert.deepEqual((await client.query('SELECT estimation_name FROM tbl_opportunity_estimation WHERE is_current=TRUE')).rows, [{ estimation_name: 'Selected' }]);
    await assert.rejects(client.query("UPDATE tbl_opportunity_estimation SET is_current=FALSE WHERE estimation_name='Selected'"), /chk_estimation_current_selection/);
  } finally { await client.end(); }
});
