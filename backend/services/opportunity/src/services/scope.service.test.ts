import 'dotenv/config';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { getScope, saveScope } from './opportunity.service';
import type { OpportunityScope } from '../repositories/scope.repository';
const repository = require('../repositories/opportunity.repository');
const scopes = require('../repositories/scope.repository');
const users = require('../integrations/userService');
const admin = require('../integrations/adminService');
const scope: OpportunityScope = { revision: 0, summary: 'Delivery scope', risks: [], alignment: [] };
const ctx = () => ({ user: { id: 7 } });
function setup(t: TestContext, stageId = 3, permitted = true) {
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 99, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({
    role: { id: 99, roleCode: 'CUSTOM', roleName: 'Custom role', isActive: true },
    menus: [{ menuId: 1, menuKey: 'opportunities', menuName: 'Opportunities', parentId: null, isActive: true }, { menuId: 2, menuKey: 'pipeline', menuName: 'Pipeline', routePath: '/opportunity', parentId: 1, isActive: true }],
    roleAccess: permitted ? [1, 2].map(menuId => ({ menuId, permissionKey: 'view' })) : [],
  }));
  t.mock.method(repository, 'findById', async () => ({ opportunityId: 10, stageId, subStageId: stageId === 3 ? 7 : 4 }));
  return { read: t.mock.method(scopes, 'findScope', async () => scope), write: t.mock.method(scopes, 'saveScope', async () => {}) };
}
test('visible opportunities load saved assessment and allow its sections to save at engineering estimation', async t => {
  const { write } = setup(t);
  assert.deepEqual(await getScope(10, ctx()), scope);
  for (const section of ['SCOPE', 'RISKS', 'ALIGNMENT'] as const) await saveScope(10, scope, section, ctx());
  assert.deepEqual(write.mock.calls.map((call: { arguments: unknown[] }) => call.arguments), ['SCOPE', 'RISKS', 'ALIGNMENT'].map(section => [10, scope, section, 7]));
});
test('revoked opportunity access blocks assessment reads and writes', async t => {
  const { read, write } = setup(t, 3, false);
  await assert.rejects(getScope(10, ctx()), /permission to view/);
  await assert.rejects(saveScope(10, scope, 'SCOPE', ctx()), /permission to view/);
  assert.equal(read.mock.calls.length + write.mock.calls.length, 0);
});
test('assessment saves are blocked before CEO approval and after engineering estimation', async t => {
  for (const stage of [1, 2, 4, 5, 6, 7, 8]) {
    const { write } = setup(t, stage);
    await assert.rejects(saveScope(10, scope, 'SCOPE', ctx()), /engineering estimation/);
    assert.equal(write.mock.calls.length, 0);
  }
});
test('assessment validation rejects invalid severity, duplicate IDs, blank descriptions and revisions', async t => {
  const { write } = setup(t);
  for (const input of [
    { ...scope, revision: -1 }, { ...scope, summary: ' ' },
    { ...scope, risks: [{ id: 'draft-test', description: 'Risk', severity: 'CRITICAL' }] },
    { ...scope, risks: [{ id: 'draft-test', description: '', severity: 'HIGH' }] },
    { ...scope, alignment: [{ id: '31', text: 'One' }, { id: '31', text: 'Two' }] },
  ]) await assert.rejects(saveScope(10, input as OpportunityScope, 'ALL', ctx()));
  assert.equal(write.mock.calls.length, 0);
  await saveScope(10, { ...scope, summary: '' }, 'RISKS', ctx());
  assert.equal(write.mock.calls.length, 1, 'Saving risks does not require an unrelated scope draft.');
});

test('an explicit scope-only clear reaches soft deletion without permitting blank scope in a full assessment save', async t => {
  const { write } = setup(t);
  await saveScope(10, { ...scope, summary: '' }, 'SCOPE', ctx());
  assert.deepEqual(write.mock.calls[0].arguments, [10, { ...scope, summary: '' }, 'SCOPE', 7]);
  await assert.rejects(saveScope(10, { ...scope, summary: '' }, 'ALL', ctx()), /Enter the project scope/);
  assert.equal(write.mock.calls.length, 1);
});
