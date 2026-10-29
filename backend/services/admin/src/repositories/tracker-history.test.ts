import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as stages from './stages.repository';
import * as subStages from './sub-stages.repository';
import * as phases from './phases.repository';
import * as reasons from './reason-codes.repository';
import * as questions from './rfp-questions.repository';
import * as roles from './roles.repository';
import * as clients from './client.repository';
import { PermissionsRepository } from './permissions.repository';
import { RateMasterRepository } from './rate-master.repository';
const db = require('../config/db');

const permissions = new PermissionsRepository();
const rates = new RateMasterRepository();
const rate = { roleName: 'Engineer', roleCode: 'ENG', currencyId: 1, rateType: 'Hourly', defaultRate: 100, createdBy: 7, updatedBy: 8 };
const entities = [
  { table: 'mst_stage', tracker: 'mst_stage_tracker', create: () => stages.create({ stageName: 'Review', winPercentage: 20, displayOrder: 1 }, 7), update: () => stages.update(10, { stageName: 'Approved' }, 8) },
  { table: 'mst_sub_stage', tracker: 'mst_sub_stage_tracker', create: () => subStages.create({ stageId: 1, subStageName: 'Review' }, 7), update: () => subStages.update(10, { subStageName: 'Approved' }, 8) },
  { table: 'mst_estimation_phases', tracker: 'tbl_estimation_phases_tracker', create: () => phases.create({ phaseName: 'Design' }, 7), update: () => phases.update(10, { phaseName: 'Build' }, 8), remove: () => phases.remove(10, 8) },
  { table: 'tbl_reason_codes', tracker: 'tbl_reason_codes_tracker', create: () => reasons.create({ reasonName: 'Budget' }, 7), update: () => reasons.update(10, { reasonName: 'Timing' }, 8), remove: () => reasons.remove(10, 8) },
  { table: 'mst_rfp_questions', tracker: 'mst_rfp_questions_tracker', create: () => questions.create({ question: 'Delivery?' }, 7), update: () => questions.update(10, { question: 'Timeline?' }, 8) },
  { table: 'mst_roles', tracker: 'mst_roles_tracker', create: () => roles.create({ roleName: 'Reviewer' }, 7), update: () => roles.update(10, { roleName: 'Approver' }, 8), remove: () => roles.remove(10, 8) },
  { table: 'mst_client', tracker: 'mst_client_tracker', create: () => clients.create({ clientName: 'First' }, 7), update: () => clients.update(10, { clientName: 'Second' }, 8), remove: () => clients.remove(10, 8) },
  { table: 'mst_permissions', tracker: 'mst_permissions_tracker', create: () => permissions.create({ permissionName: 'Read', permissionKey: 'read', createdBy: 7 }), update: () => permissions.update(10, { permissionName: 'View', updatedBy: 8 }) },
  { table: 'mst_rate', tracker: 'mst_rate_tracker', create: () => rates.create(rate), update: () => rates.update(10, rate) },
];

for (const entity of entities) {
  test(`${entity.table}: create only writes current data; each update archives before overwriting`, async t => {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => { calls.push(sql.trim()); return { rows: [{ id: 10, permissionId: 10, ratemasterId: 10 }] }; },
      release: () => {},
    }));
    await entity.create();
    assert.ok(calls.some(sql => sql.startsWith(`INSERT INTO ${entity.table}\n`) || sql.startsWith(`INSERT INTO ${entity.table} (`)));
    assert.equal(calls.some(sql => /INSERT INTO \w+_tracker\b/.test(sql)), false);
    for (let change = 0; change < 2; change++) {
      calls.length = 0;
      await entity.update();
      const snapshots = calls.filter(sql => sql.startsWith(`INSERT INTO ${entity.tracker} (`));
      assert.equal(snapshots.length, 1);
      assert.match(snapshots[0], new RegExp(`FROM ${entity.table} WHERE \\w+ = \\$1 FOR UPDATE`));
      assert.ok(calls.indexOf(snapshots[0]) < calls.findIndex(sql => sql.startsWith(`UPDATE ${entity.table}\n`) || sql.startsWith(`UPDATE ${entity.table} SET`)));
      assert.equal(calls.at(-1), 'COMMIT');
    }
  });

  test(`${entity.table}: snapshot failure prevents an unaudited update`, async t => {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => {
        calls.push(sql.trim());
        if (sql.includes(`INSERT INTO ${entity.tracker} (`)) throw new Error('History unavailable');
        return { rows: [] };
      }, release: () => {},
    }));
    await assert.rejects(entity.update(), /History unavailable/);
    assert.equal(calls.some(sql => sql.startsWith(`UPDATE ${entity.table}`)), false);
    assert.equal(calls.at(-1), 'ROLLBACK');
  });

  if (entity.remove) test(`${entity.table}: delete archives the previous row and keeps its audit fields`, async t => {
    const calls: string[] = [];
    t.mock.method(db.pool, 'connect', async () => ({
      query: async (sql: string) => { calls.push(sql.trim()); return { rows: [] }; }, release: () => {},
    }));
    await entity.remove!();
    const snapshot = calls.findIndex(sql => sql.startsWith(`INSERT INTO ${entity.tracker} (`));
    assert.ok(snapshot > 0 && snapshot < calls.findIndex(sql => sql.startsWith(`DELETE FROM ${entity.table} WHERE`)));
    assert.match(calls[snapshot], /created_by, updated_dt, updated_by, (?:COALESCE\(is_active, TRUE\)|is_active)/);
    assert.equal(calls.at(-1), 'COMMIT');
  });
}

test('permission and rate status changes archive their previous status before updating', async t => {
  const calls: string[] = [];
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => { calls.push(sql.trim()); return { rows: [{}] }; }, release: () => {},
  }));
  for (const [table, save] of [
    ['mst_permissions', () => permissions.updateStatus(10, false, 8)],
    ['mst_rate', () => rates.updateStatus(10, false, 8)],
  ] as const) {
    calls.length = 0;
    await save();
    assert.ok(calls.findIndex(sql => sql.startsWith(`INSERT INTO ${table}_tracker`)) < calls.findIndex(sql => sql.startsWith(`UPDATE ${table}`)));
  }
});

test('contact creation has no history; replacement and client deletion archive contacts first', async t => {
  const calls: string[] = [];
  let existing = false;
  t.mock.method(db.pool, 'connect', async () => ({
    query: async (sql: string) => {
      calls.push(sql.trim());
      if (sql.includes('SELECT client_contact_id FROM tbl_client_contact_person')) return { rows: existing ? [{ client_contact_id: 21 }] : [] };
      return { rows: [{ id: 10, client_contact_id: 22 }] };
    }, release: () => {},
  }));
  const contacts = [{ fullName: 'Contact', email: 'contact@example.com' }];
  await clients.create({ clientName: 'Client', contacts }, 7);
  assert.equal(calls.some(sql => /INSERT INTO \w+_tracker/.test(sql)), false);
  existing = true;
  calls.length = 0;
  await clients.update(10, { contacts }, 8);
  assert.equal(calls.filter(sql => sql.startsWith('INSERT INTO tbl_client_contact_person_tracker')).length, 1);
  assert.ok(calls.findIndex(sql => sql.startsWith('INSERT INTO tbl_client_contact_person_tracker')) < calls.findIndex(sql => sql.startsWith('UPDATE tbl_client_contact_person ')));
  calls.length = 0;
  await clients.remove(10, 8);
  assert.ok(calls.findIndex(sql => sql.startsWith('INSERT INTO tbl_client_contact_person_tracker')) < calls.findIndex(sql => sql.startsWith('DELETE FROM tbl_client_contact_person ')));
});
