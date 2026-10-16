import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as service from './opportunity.service';
import type { Opportunity, OpportunityInput } from '../repositories/opportunity.repository';
import type { AccessGrant, AccessMenu } from '../lib/opportunityAccess';

// CommonJS exports are replaced at the integration boundary; no database is used.
const repository = require('../repositories/opportunity.repository');
const users = require('../integrations/userService');
const admin = require('../integrations/adminService');
const menus: AccessMenu[] = [
  { menuId: 1, menuKey: 'opportunities', menuName: 'Opportunities', routePath: null, parentId: null, isActive: true },
  { menuId: 2, menuKey: 'my_approvals', menuName: 'My Approvals', routePath: '/opportunities/approvals', parentId: 1, isActive: true },
  { menuId: 3, menuKey: 'gate_2_approval', menuName: 'Gate-2 Approval', routePath: null, parentId: null, isActive: true },
  { menuId: 4, menuKey: 'estimation', menuName: 'Estimation', routePath: null, parentId: null, isActive: true },
  { menuId: 5, menuKey: 'pipeline', menuName: 'Pipeline', routePath: '/opportunities', parentId: 1, isActive: true },
  { menuId: 6, menuKey: 'my_work', menuName: 'My Work', routePath: '/opportunities/work', parentId: 1, isActive: true },
];
const input: OpportunityInput = { opportunityName: 'Permission test', opportunityTypeId: 1, sourceTypeId: 1, clientId: 1,
  ownerId: 7, priority: 'MEDIUM', serviceLine: 'Consulting', estimatedValue: 10, estimatedValueUsd: 10 };
const record = { ...input, opportunityId: 10, createdBy: 7, stageId: 1, subStageId: 1, assignedTo: null } as Opportunity;
const ctx = () => ({ user: { id: 7 } });

test('custom roles can list, create and maintain clients only with their assigned permissions', async t => {
  let grants: AccessGrant[] = [{ menuId: 1, permissionKey: 'view' }, { menuId: 1, permissionKey: 'add' }, { menuId: 5, permissionKey: 'view' }];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async (roleId: number) => {
    assert.equal(roleId, 999);
    return { menus, roleAccess: grants };
  });
  t.mock.method(repository, 'findAll', async () => [record]);
  t.mock.method(repository, 'findById', async () => record);
  const create = t.mock.method(repository, 'create', async () => record);
  t.mock.method(repository, 'findClients', async () => [{ clientId: 1 }]);
  const createClient = t.mock.method(repository, 'createClient', async () => 1);
  const updateClient = t.mock.method(repository, 'updateClient', async () => 1);
  assert.equal((await service.list(ctx())).length, 1);
  assert.equal((await service.get(10, ctx())).opportunityId, 10);
  await service.create(input, ctx());
  assert.equal(create.mock.calls.length, 1);
  assert.deepEqual(create.mock.calls[0].arguments[0], { ...input, stageId: 1, subStageId: 1, assignedTo: null, uploadedBy: null, uploadedDt: null });
  const client = { clientName: 'Example', accountType: 'Enterprise', sector: 'Technology', city: 'Pune', state: 'Maharashtra', country: 'India' };
  const contacts = [{ fullName: 'Contact', titleRole: 'Buyer', email: 'contact@example.com', phone: '12345', roleInDecision: 1 }];
  await service.createClient(client, contacts, ctx());
  assert.equal(createClient.mock.calls.length, 1);
  await assert.rejects(service.updateClient(1, client, contacts, ctx()), /permission/);
  assert.equal(updateClient.mock.calls.length, 0);
  grants = [{ menuId: 1, permissionKey: 'edit' }];
  await service.updateClient(1, client, contacts, ctx());
  assert.equal(updateClient.mock.calls.length, 1);
  grants = [];
  await assert.rejects(service.create(input, ctx()), /permission/);
  await assert.rejects(service.list(ctx()), /permission/);
  assert.equal(await service.canCreateClient(ctx()), false);
});

test('workflow authorization follows stage permissions and retains transition order and required comments', async t => {
  let current = { ...record };
  let grants: AccessGrant[] = [{ menuId: 2, permissionKey: 'approve' }];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 15, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants }));
  t.mock.method(repository, 'findById', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  await assert.rejects(service.transitionWorkflow(10, 'REQUEST_CHANGES', '', null, ctx()), /changes requested/);
  assert.equal(transition.mock.calls.length, 0);
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 2, 4]);
  current = { ...record, stageId: 2, subStageId: 4 };
  await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /permission/);
  grants = [{ menuId: 3, permissionKey: 'approve' }];
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 3, 7]);
  current = { ...record, stageId: 3, subStageId: 7 };
  await assert.rejects(service.transitionWorkflow(10, 'SUBMIT_ESTIMATE', null, null, ctx()), /permission/);
  grants = [{ menuId: 4, permissionKey: 'edit' }];
  await service.transitionWorkflow(10, 'SUBMIT_ESTIMATE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 4, 8]);
  current = { ...record, stageId: 4, subStageId: 8 };
  grants = [{ menuId: 3, permissionKey: 'approve' }];
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 5, 10]);
  current = { ...record, stageId: 5, subStageId: 10 };
  await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /current step/);
});

test('Sales Head review keeps changes/hold in Identified and approval advances to qualifying', async t => {
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 123, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [{ menuId: 2, permissionKey: 'approve' }] }));
  t.mock.method(repository, 'findById', async () => record);
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  const lookupReason = t.mock.method(admin, 'reasonCode', async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', 'Free text', null, ctx()), /Select a reason code/);
  assert.equal(transition.mock.calls.length, 0);
  lookupReason.mock.mockImplementation(async () => ({ id: 3, reasonName: 'Missing information', isActive: false }));
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', null, null, ctx(), 3), /active hold reason/);
  assert.equal(transition.mock.calls.length, 0);
  lookupReason.mock.mockImplementation(async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  for (const [action, stage, substage] of [['REQUEST_CHANGES', 1, 2], ['HOLD', 1, 3], ['APPROVE', 2, 4]] as const) {
    await service.transitionWorkflow(10, action, 'Review note', null, ctx(), action === 'HOLD' ? 3 : undefined);
    assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, stage, substage]);
    if (action === 'HOLD') assert.equal(transition.mock.calls.at(-1)?.arguments[5], 'Hold reason [3]: Missing information');
  }
});

test('editing and resubmission preserve creator, owner and workflow constraints', async t => {
  let current = { ...record, subStageId: 2 };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 987, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [{ menuId: 1, permissionKey: 'edit' }] }));
  t.mock.method(repository, 'findById', async () => current);
  const update = t.mock.method(repository, 'update', async () => current);
  t.mock.method(repository, 'transitionWorkflow', async () => current);
  await assert.rejects(service.update(10, { ownerId: 99 }, ctx()), /owner cannot be changed/);
  await assert.rejects(service.update(10, { stageId: 3 }, ctx()), /workflow actions/);
  await service.update(10, { opportunityName: 'Updated' }, ctx());
  assert.equal(update.mock.calls.length, 1);
  await service.transitionWorkflow(10, 'RESUBMIT', null, null, ctx());
  current = { ...current, createdBy: 99 };
  await assert.rejects(service.update(10, { opportunityName: 'Updated' }, ctx()), /cannot edit/);
  await assert.rejects(service.transitionWorkflow(10, 'RESUBMIT', null, null, ctx()), /Only the creator/);
});

test('Sales Representative creator restriction controls returned actions and rejects direct updates', async t => {
  let current = { ...record, createdBy: 99, ownerId: 7, assignedTo: 7 };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 123, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [{ menuId: 1, permissionKey: 'edit' }, { menuId: 5, permissionKey: 'view' }], role: { roleName: 'Sales Representative' } }));
  t.mock.method(repository, 'findAll', async () => [current]);
  t.mock.method(repository, 'findById', async () => current);
  const update = t.mock.method(repository, 'update', async () => current);
  assert.deepEqual((await service.get(10, ctx())).allowedActions, []);
  assert.deepEqual((await service.list(ctx()))[0].allowedActions, []);
  await assert.rejects(service.update(10, { opportunityName: 'Forbidden' }, ctx()), /cannot edit/);
  assert.equal(update.mock.calls.length, 0);
  current = { ...current, createdBy: 7 };
  assert.deepEqual((await service.get(10, ctx())).allowedActions, ['EDIT']);
  await service.update(10, { opportunityName: 'Own opportunity' }, ctx());
  assert.equal(update.mock.calls.length, 1);
});

test('inactive users and permission service failures do not grant access', async t => {
  const user = t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 20, isActive: false }));
  const role = t.mock.method(admin, 'roleAccess', async () => { throw new Error('Permission service unavailable'); });
  await assert.rejects(service.list(ctx()), /active user/);
  assert.equal(role.mock.calls.length, 0);
  user.mock.mockImplementation(async () => ({ id: 7, roleId: 20, isActive: true }));
  await assert.rejects(service.list(ctx()), /Permission service unavailable/);
  await assert.rejects(service.list({ user: null }), /signed-in/);
});

test('enforces revoked Pipeline access on direct API calls despite root View and full sibling permissions', async t => {
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 15, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [
    { menuId: 1, permissionKey: 'view' },
    ...['view', 'add', 'edit', 'approve', 'delete'].flatMap(permissionKey => [{ menuId: 2, permissionKey }, { menuId: 6, permissionKey }]),
  ] }));
  const records = t.mock.method(repository, 'findAll', async () => [record, { ...record, opportunityId: 11, createdBy: 8, ownerId: 8 }]);
  await assert.rejects(service.list(ctx()), /permission/);
  assert.equal(records.mock.calls.length, 0);
  await assert.rejects(service.create(input, ctx()), /permission/);
  assert.equal(await service.canCreateClient(ctx()), false);
  assert.equal(await service.canUpdateClient(ctx()), false);
  assert.equal(await service.canUploadDocument(ctx()), false);
  assert.deepEqual((await service.list(ctx(), 'MY_WORK')).map(record => record.opportunityId), [10]);
  assert.equal((await service.list(ctx(), 'MY_APPROVALS')).length, 2);
  await assert.rejects(service.list(ctx(), 'UNKNOWN'), /permission/);
});
