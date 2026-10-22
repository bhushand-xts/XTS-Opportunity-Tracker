import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as service from './opportunity.service';
import type { Opportunity, OpportunityInput, RfpIntakeOpportunityInput } from '../repositories/opportunity.repository';
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
const role = (id: number, roleCode: string) => ({ id, roleCode, roleName: roleCode === 'SH' ? 'Sales Head' : roleCode === 'approver_gate2' ? 'CEO/Gate-2 Approver' : roleCode === 'estimation_team' ? 'Estimation Team' : roleCode === 'sales_representative' ? 'Sales Representative' : 'Custom Role', isActive: true });

test('stage history respects opportunity view permissions before returning audit timestamps', async t => {
  let grants = [{ menuId: 1, permissionKey: 'view' }];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants, role: role(999, 'sales_representative') }));
  t.mock.method(repository, 'findById', async () => record);
  const history = [{ id: 1, stageId: 1, subStageId: 1, reachedAt: '2026-10-19T04:00:00Z', comment: null }];
  const read = t.mock.method(repository, 'findStageHistory', async () => history);
  assert.deepEqual(await service.getStageHistory(10, ctx()), history);
  grants = [];
  await assert.rejects(service.getStageHistory(10, ctx()), /permission/);
  assert.equal(read.mock.calls.length, 1);
});

test('create and partial update reject non-positive client budgets before persisting', async t => {
  const current = { ...record, subStageId: 2 };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus,
    roleAccess: [{ menuId: 1, permissionKey: 'add' }, { menuId: 1, permissionKey: 'edit' }],
    role: role(999, 'sales_representative') }));
  t.mock.method(repository, 'findById', async () => current);
  const create = t.mock.method(repository, 'create', async () => current);
  const update = t.mock.method(repository, 'update', async () => current);
  for (const [field, message] of [
    ['estimatedValue', /Client budget must be greater than zero/],
    ['estimatedValueUsd', /Client budget \(USD\) must be greater than zero/],
  ] as const) {
    for (const value of [0, -1, -0.01, NaN, Infinity, 0.000001]) {
      await assert.rejects(service.create({ ...input, [field]: value }, ctx()), message);
      await assert.rejects(service.update(10, { [field]: value }, ctx()), message);
    }
  }
  assert.equal(create.mock.calls.length, 0);
  assert.equal(update.mock.calls.length, 0);
  await service.create({ ...input, estimatedValue: 0.01, estimatedValueUsd: 0.01 }, ctx());
  await service.update(10, { estimatedValue: 0.01, estimatedValueUsd: 0.01 }, ctx());
  assert.equal(create.mock.calls.length, 1);
  assert.equal(update.mock.calls.length, 1);
});

test('RFP intake create and update report client budget errors and accept a positive cent', async t => {
  const intake: RfpIntakeOpportunityInput = {
    opportunityName: 'RFP budget test', ownerId: 7, currencyId: 1,
    estimatedValue: 10, sourceTypeId: 1, rfpType: 2, questions: ['Scope'],
    client: { clientName: 'Example', accountType: 'Enterprise', sector: 'Technology',
      city: 'Pune', state: 'Maharashtra', country: 'India' },
    contacts: [{ fullName: 'Contact', titleRole: 'Buyer', email: 'contact@example.com', phone: '12345', roleInDecision: 1 }],
  };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus,
    roleAccess: [{ menuId: 1, permissionKey: 'add' }, { menuId: 1, permissionKey: 'edit' }],
    role: role(999, 'sales_representative') }));
  t.mock.method(repository, 'findById', async () => ({ ...record, subStageId: 2 }));
  const create = t.mock.method(repository, 'finalizeRfpIntakeOpportunity', async () => record);
  const update = t.mock.method(repository, 'updateRfpIntakeOpportunity', async () => record);
  for (const value of [0, -1, -0.01, NaN, Infinity, 0.000001]) {
    await assert.rejects(service.createRfpIntakeOpportunity({ ...intake, estimatedValue: value }, ctx()),
      /Client budget must be greater than zero/);
    await assert.rejects(service.updateRfpIntakeOpportunity(10, { ...intake, estimatedValue: value }, ctx()),
      /Client budget must be greater than zero/);
  }
  assert.equal(create.mock.calls.length, 0);
  assert.equal(update.mock.calls.length, 0);
  await service.createRfpIntakeOpportunity({ ...intake, estimatedValue: 0.01 }, ctx());
  await service.updateRfpIntakeOpportunity(10, { ...intake, estimatedValue: 0.01 }, ctx());
  assert.equal(create.mock.calls.length, 1);
  assert.equal(update.mock.calls.length, 1);
});

test('custom roles can list, create and maintain clients only with their assigned permissions', async t => {
  let grants: AccessGrant[] = [{ menuId: 1, permissionKey: 'view' }, { menuId: 1, permissionKey: 'add' }, { menuId: 5, permissionKey: 'view' }];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async (roleId: number) => {
    assert.equal(roleId, 999);
    return { menus, roleAccess: grants, role: role(999, 'custom_role') };
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

test('workflow authorization follows roles without approval grants and retains transition order and required comments', async t => {
  let current = { ...record };
  let grants: AccessGrant[] = [];
  let actorRole = 'SH';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 15, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants, role: role(15, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  await assert.rejects(service.transitionWorkflow(10, 'REQUEST_CHANGES', '', null, ctx()), /changes requested/);
  assert.equal(transition.mock.calls.length, 0);
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 2, 4]);
  current = { ...record, stageId: 2, subStageId: 4 };
  await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /role/);
  actorRole = 'approver_gate2';
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 3, 7]);
  current = { ...record, stageId: 3, subStageId: 7 };
  await assert.rejects(service.transitionWorkflow(10, 'SUBMIT_ESTIMATE', null, null, ctx()), /role/);
  actorRole = 'estimation_team';
  grants = [{ menuId: 4, permissionKey: 'edit' }];
  t.mock.method(repository, 'findEstimation', async () => ({ revision: 1, rows: [{ id: '1' }] }));
  await service.transitionWorkflow(10, 'SUBMIT_ESTIMATE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 4, 8]);
  current = { ...record, stageId: 4, subStageId: 8 };
  actorRole = 'approver_gate2';
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 5, 10]);
  current = { ...record, stageId: 5, subStageId: 10 };
  await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /current step/);
});

test('projects review actions only for the matching role and active review step', async t => {
  let grants: AccessGrant[] = [];
  let actorRole = 'sales_representative';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants, role: role(999, actorRole) }));
  const sales = ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'SALES_REJECT', 'CLOSE_OPPORTUNITY'];
  const gate = ['GATE1_GO', 'GATE1_REQUEST_CHANGES', 'GATE1_HOLD', 'GATE1_NO_GO'];
  const steps = [[1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [2, 6], [3, 7], [4, 8], [5, 10]];
  const cases = [
    { actorRole: 'sales_representative', grants: [{ menuId: 2, permissionKey: 'approve' }, { menuId: 3, permissionKey: 'approve' }], expected: new Map([['1/2', []]]) },
    { actorRole: 'SH', grants: [], expected: new Map([['1/1', sales], ['1/3', sales.filter(action => action !== 'SALES_HOLD')], ['1/2', sales.filter(action => action !== 'SALES_REQUEST_CHANGES')], ['2/4', ['CLOSE_OPPORTUNITY']], ['2/5', ['CLOSE_OPPORTUNITY']], ['2/6', ['CLOSE_OPPORTUNITY']], ['3/7', ['CLOSE_OPPORTUNITY']], ['4/8', ['CLOSE_OPPORTUNITY']], ['5/10', ['BID_SUBMITTED', 'CLOSE_OPPORTUNITY']]]) },
    { actorRole: 'approver_gate2', grants: [], expected: new Map([['1/2', []], ['2/4', gate], ['2/5', gate.filter(action => action !== 'GATE1_REQUEST_CHANGES')], ['2/6', gate.filter(action => action !== 'GATE1_HOLD')], ['4/8', ['ESTIMATE_APPROVE', 'ESTIMATE_HOLD', 'ESTIMATE_REJECT']]]) },
  ];
  for (const scenario of cases) {
    grants = scenario.grants;
    actorRole = scenario.actorRole;
    for (const [stageId, subStageId] of steps) {
      const step = `${stageId}/${subStageId}`;
      assert.deepEqual(await service.allowedActions({ ...record, stageId, subStageId }, ctx()), scenario.expected.get(step) ?? [],
        `Unexpected actions at ${step} for ${JSON.stringify(grants)}`);
    }
  }
});

test('list, detail and GraphQL action projection agree while preserving edit and creator restrictions', async t => {
  const grants: AccessGrant[] = [
    { menuId: 1, permissionKey: 'edit' }, { menuId: 5, permissionKey: 'view' },
    { menuId: 2, permissionKey: 'approve' }, { menuId: 3, permissionKey: 'approve' },
  ];
  const records = [
    { ...record },
    { ...record, opportunityId: 11, subStageId: 3 },
    { ...record, opportunityId: 12, subStageId: 2 },
    { ...record, opportunityId: 13, subStageId: 2, createdBy: 99 },
    { ...record, opportunityId: 14, stageId: 2, subStageId: 4 },
    { ...record, opportunityId: 15, stageId: 2, subStageId: 6 },
    { ...record, opportunityId: 16, stageId: 2, subStageId: 5 },
    { ...record, opportunityId: 17, stageId: 3, subStageId: 7 },
  ];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants, role: role(999, 'SH') }));
  t.mock.method(repository, 'findAll', async () => records);
  t.mock.method(repository, 'findById', async (id: number) => records.find(opportunity => opportunity.opportunityId === id));
  const expected = [
    ['EDIT', 'SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'SALES_REJECT', 'CLOSE_OPPORTUNITY'],
    ['EDIT', 'SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_REJECT', 'CLOSE_OPPORTUNITY'],
    ['EDIT', 'SALES_APPROVE', 'SALES_HOLD', 'SALES_REJECT', 'CLOSE_OPPORTUNITY'],
    ['EDIT', 'SALES_APPROVE', 'SALES_HOLD', 'SALES_REJECT', 'CLOSE_OPPORTUNITY'],
    ['EDIT', 'CLOSE_OPPORTUNITY'],
    ['EDIT', 'CLOSE_OPPORTUNITY'],
    ['EDIT', 'CLOSE_OPPORTUNITY'], ['EDIT', 'CLOSE_OPPORTUNITY'],
  ];
  const listed = await service.list(ctx());
  assert.deepEqual(listed.map(opportunity => opportunity.allowedActions), expected);
  for (const [index, opportunity] of records.entries()) {
    assert.deepEqual((await service.get(opportunity.opportunityId, ctx())).allowedActions, expected[index]);
    assert.deepEqual(await service.allowedActions(opportunity, ctx()), expected[index]);
  }
});

test('Sales Head and CEO can hold pending reviews and review held opportunities without changing transition targets', async t => {
  let current = { ...record };
  let actorRole = 'SH';
  const grants: AccessGrant[] = [];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants, role: role(999, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  await service.transitionWorkflow(10, 'HOLD', ' Waiting for details ', null, ctx(), 3);
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 6), [10, 1, 3, null, 7, 'Waiting for details']);
  current = { ...record, subStageId: 3 };
  assert.equal((await service.get(10, ctx())).opportunityId, 10);
  await service.transitionWorkflow(10, 'REQUEST_CHANGES', ' Update the scope ', null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 6), [10, 1, 2, 7, 7, 'Update the scope']);
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 6), [10, 2, 4, null, 7, null]);
  actorRole = 'approver_gate2';
  current = { ...record, stageId: 2, subStageId: 4 };
  await service.transitionWorkflow(10, 'HOLD', ' Awaiting budget ', null, ctx(), 3);
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 6), [10, 2, 6, null, 7, 'Awaiting budget']);
  current = { ...record, stageId: 2, subStageId: 6 };
  assert.equal((await service.get(10, ctx())).opportunityId, 10);
  await service.transitionWorkflow(10, 'REQUEST_CHANGES', ' Confirm the costs ', null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 6), [10, 2, 5, null, 7, 'Confirm the costs']);
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 6), [10, 3, 7, null, 7, null]);
});

test('Sales Head can approve, hold or reject after requesting changes with the same validation and audit', async t => {
  const current = { ...record, subStageId: 2, createdBy: 99 };
  let actorRole = 'SH';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(999, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  await assert.rejects(service.transitionWorkflow(10, 'REQUEST_CHANGES', 'Again', null, ctx()), /already been requested/);
  for (const action of ['HOLD', 'REJECT'] as const) {
    await assert.rejects(service.transitionWorkflow(10, action, 'Details', null, ctx()), /Select a .* reason/);
    await assert.rejects(service.transitionWorkflow(10, action, ' ', null, ctx(), 3), /Enter a .* description/);
  }
  assert.equal(transition.mock.calls.length, 0);
  for (const [action, stageId, subStageId] of [['APPROVE', 2, 4], ['HOLD', 1, 3], ['REJECT', 9, 15]] as const) {
    await service.transitionWorkflow(10, action, action === 'APPROVE' ? null : ' Confirmed details ', null, ctx(), 3);
    const args = transition.mock.calls.at(-1)!.arguments;
    assert.deepEqual(args.slice(0, 6), [10, stageId, subStageId, null, 7, action === 'APPROVE' ? null : 'Confirmed details']);
    assert.deepEqual(args[7], { roleId: 999, roleName: 'Sales Head', reasonCodeId: action === 'APPROVE' ? null : 3 });
    assert.deepEqual(args[8], { stageId: 1, subStageId: 2 });
  }
  for (const roleCode of ['sales_representative', 'approver_gate2']) {
    actorRole = roleCode;
    await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /Sales Head role/);
  }
  assert.equal(transition.mock.calls.length, 3);
});

test('CEO retains approve, hold and reject after requesting Sales Head corrections', async t => {
  const current = { ...record, stageId: 2, subStageId: 5 };
  let actorRole = 'approver_gate2';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(999, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  await assert.rejects(service.transitionWorkflow(10, 'REQUEST_CHANGES', 'Again', null, ctx()), /already been requested/);
  for (const action of ['HOLD', 'REJECT'] as const) {
    await assert.rejects(service.transitionWorkflow(10, action, 'Details', null, ctx()), /Select a .* reason/);
    await assert.rejects(service.transitionWorkflow(10, action, ' ', null, ctx(), 3), /Enter a .* description/);
  }
  assert.equal(transition.mock.calls.length, 0);
  for (const [action, stageId, subStageId] of [['APPROVE', 3, 7], ['HOLD', 2, 6], ['REJECT', 9, 16]] as const) {
    await service.transitionWorkflow(10, action, action === 'APPROVE' ? null : ' Reviewed details ', null, ctx(), 3);
    const args = transition.mock.calls.at(-1)!.arguments;
    assert.deepEqual(args.slice(0, 6), [10, stageId, subStageId, null, 7, action === 'APPROVE' ? null : 'Reviewed details']);
    assert.deepEqual(args[7], { roleId: 999, roleName: 'CEO/Gate-2 Approver', reasonCodeId: action === 'APPROVE' ? null : 3 });
    assert.deepEqual(args[8], { stageId: 2, subStageId: 5 });
  }
  actorRole = 'SH';
  await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /CEO role/);
  assert.equal(transition.mock.calls.length, 3);
});

test('already-held sales, CEO and estimation reviews cannot be held again', async t => {
  let current = { ...record };
  let actorRole = 'SH';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(999, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async () => current);
  const reasons = t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, reasonName: 'Pending', isActive: true }));
  for (const [stageId, subStageId, roleCode] of [[1, 3, 'SH'], [2, 6, 'approver_gate2'], [4, 9, 'approver_gate2']] as const) {
    current = { ...record, stageId, subStageId };
    actorRole = roleCode;
    const actions = await service.allowedActions(current, ctx());
    assert.equal(actions.some(action => action.endsWith('_HOLD')), false);
    assert.ok(actions.some(action => action.includes('APPROVE') || action === 'GATE1_GO'));
    await assert.rejects(service.transitionWorkflow(10, 'HOLD', 'Hold again', null, ctx(), 3), /already on hold/);
  }
  assert.equal(transition.mock.calls.length, 0);
  assert.equal(reasons.mock.calls.length, 0);
});

test('editing requested changes preserves creator and owner restrictions', async t => {
  let current = { ...record, subStageId: 2 };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 987, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [{ menuId: 1, permissionKey: 'edit' }], role: role(987, 'sales_representative') }));
  t.mock.method(repository, 'findById', async () => current);
  const update = t.mock.method(repository, 'update', async () => ({ ...current, subStageId: 1 }));
  const transition = t.mock.method(repository, 'transitionWorkflow', async () => current);
  await assert.rejects(service.update(10, { ownerId: 99 }, ctx()), /owner cannot be changed/);
  await assert.rejects(service.update(10, { stageId: 3 }, ctx()), /workflow actions/);
  assert.equal((await service.update(10, { opportunityName: 'Updated' }, ctx())).subStageId, 1);
  assert.equal(update.mock.calls.length, 1);
  assert.equal(transition.mock.calls.length, 0);
  current = { ...current, createdBy: 99 };
  await assert.rejects(service.update(10, { opportunityName: 'Updated' }, ctx()), /cannot edit/);
});

test('creators update returned corrections in one save with actor audit and no separate decision', async t => {
  let current = { ...record, subStageId: 2 };
  let actorRole = 'SH';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [{ menuId: 1, permissionKey: 'edit' }], role: role(999, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  const update = t.mock.method(repository, 'update', async () => ({ ...current, subStageId: current.stageId === 1 ? 1 : 4 }));
  const transition = t.mock.method(repository, 'transitionWorkflow', async () => current);
  for (const creatorRole of ['SH', 'sales_representative', 'custom_creator']) {
    actorRole = creatorRole;
    const actions = (await service.get(10, ctx())).allowedActions;
    assert.ok(actions.includes('EDIT'));
    assert.equal(actions.includes('RESUBMIT'), false);
    assert.equal((await service.update(10, { opportunityName: 'Corrected' }, ctx())).subStageId, 1);
    assert.deepEqual(update.mock.calls.at(-1)?.arguments[3], { roleId: 999, roleName: role(999, creatorRole).roleName, reasonCodeId: null });
  }
  // Sales Head approval is retained when Sales Head corrects a CEO return from another creator.
  actorRole = 'SH';
  current = { ...record, stageId: 2, subStageId: 5, createdBy: 99 };
  const saved = await service.update(10, { opportunityName: 'CEO corrections' }, ctx());
  assert.equal(saved.stageId, 2);
  assert.equal(saved.subStageId, 4);
  assert.equal(transition.mock.calls.length, 0);
});

test('hold requires an active master reason and description, and decisions record the authoritative role', async t => {
  let current = { ...record };
  let actorRole = 'SH';
  const grants: AccessGrant[] = [];
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 15, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: grants, role: role(15, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  const reason = t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', 'Waiting', null, ctx()), /Select a hold reason/);
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', ' ', null, ctx(), 3), /description/);
  assert.equal(reason.mock.calls.length, 0);
  assert.equal(transition.mock.calls.length, 0);
  reason.mock.mockImplementation(async () => ({ id: 3, reasonName: 'Missing information', isActive: false }));
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', 'Waiting', null, ctx(), 3), /active hold reason/);
  assert.equal(transition.mock.calls.length, 0);
  reason.mock.mockImplementation(async () => { throw new Error('Reason master unavailable'); });
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', 'Waiting', null, ctx(), 3), /Reason master unavailable/);
  assert.equal(transition.mock.calls.length, 0);
  reason.mock.mockImplementation(async () => ({ id: 3, reasonName: 'Missing information', isActive: true }));
  await service.transitionWorkflow(10, 'HOLD', ' Awaiting details ', null, ctx(), 3);
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments, [10, 1, 3, null, 7, 'Awaiting details', null, { roleId: 15, roleName: 'Sales Head', reasonCodeId: 3 }, { stageId: 1, subStageId: 1 }]);
  await service.transitionWorkflow(10, 'REQUEST_CHANGES', ' Correct the scope ', null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments[7], { roleId: 15, roleName: 'Sales Head', reasonCodeId: null });
  await service.transitionWorkflow(10, 'APPROVE', null, null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 2, 4]);
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments[7], { roleId: 15, roleName: 'Sales Head', reasonCodeId: null });
  current = { ...record, stageId: 2, subStageId: 4 };
  const lookups = reason.mock.calls.length;
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', 'Waiting', null, ctx(), 3), /role/);
  assert.equal(reason.mock.calls.length, lookups);
  actorRole = 'approver_gate2';
  await assert.rejects(service.transitionWorkflow(10, 'HOLD', '', null, ctx(), 3), /description/);
  await service.transitionWorkflow(10, 'HOLD', 'Awaiting budget', null, ctx(), 3);
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 2, 6]);
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments[7], { roleId: 15, roleName: 'CEO/Gate-2 Approver', reasonCodeId: 3 });
  await service.transitionWorkflow(10, 'REQUEST_CHANGES', 'Review costs', null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 2, 5]);
  await service.transitionWorkflow(10, 'APPROVE', 'Go ahead', null, ctx());
  assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 3, 7]);
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

test('Sales Representatives can read all creators but cannot update another creator even when assigned', async t => {
  let current = { ...record };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 24, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [
    { menuId: 1, permissionKey: 'view' }, { menuId: 1, permissionKey: 'edit' },
    { menuId: 2, permissionKey: 'approve' }, { menuId: 3, permissionKey: 'approve' },
  ], role: role(24, 'sales_representative') }));
  t.mock.method(repository, 'findById', async () => current);
  const update = t.mock.method(repository, 'update', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async () => current);
  await service.update(10, { opportunityName: 'Own opportunity' }, ctx());
  assert.equal(update.mock.calls.length, 1);
  for (const subStageId of [1, 2, 3]) {
    current = { ...record, createdBy: 99, assignedTo: 7, subStageId };
    assert.equal((await service.get(10, ctx())).opportunityId, 10);
    assert.deepEqual(await service.allowedActions(current, ctx()), []);
    await assert.rejects(service.update(10, { opportunityName: 'Another creator' }, ctx()), /cannot edit/);
    await assert.rejects(service.assertExtractionEdit(10, 7), /cannot edit/);
  }
  await assert.rejects(service.transitionWorkflow(10, 'APPROVE', null, null, ctx()), /Sales Head role/);
  assert.equal(update.mock.calls.length, 1);
  assert.equal(transition.mock.calls.length, 0);
});

test('missing, inactive or mismatched authoritative role metadata fails closed', async t => {
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 24, isActive: true }));
  const lookup = t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [{ menuId: 1, permissionKey: 'edit' }], role: null }));
  await assert.rejects(service.allowedActions(record, ctx()), /active assigned role/);
  for (const invalid of [{ ...role(24, 'SH'), isActive: false }, role(20, 'SH')]) {
    lookup.mock.mockImplementation(async () => ({ menus, roleAccess: [], role: invalid }));
    await assert.rejects(service.allowedActions(record, ctx()), /active assigned role/);
  }
});

test('legacy resubmit requests direct callers to Update Opportunity without a workflow write', async t => {
  let current = { ...record, subStageId: 2 };
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 24, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(24, 'SH') }));
  t.mock.method(repository, 'findById', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async () => current);
  await assert.rejects(service.transitionWorkflow(10, 'RESUBMIT', null, null, ctx()), /Use Update Opportunity/);
  current = { ...record, stageId: 2, subStageId: 5 };
  await assert.rejects(service.transitionWorkflow(10, 'RESUBMIT', null, null, ctx()), /Use Update Opportunity/);
  assert.equal(transition.mock.calls.length, 0);
});

test('root View lists all creators without inheriting sibling CRUD or approval grants', async t => {
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 15, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [
    { menuId: 1, permissionKey: 'view' },
    ...['view', 'add', 'edit', 'approve', 'delete'].flatMap(permissionKey => [{ menuId: 2, permissionKey }, { menuId: 6, permissionKey }]),
  ], role: role(15, 'sales_representative') }));
  const records = t.mock.method(repository, 'findAll', async () => [record, { ...record, opportunityId: 11, createdBy: 8, ownerId: 8 }]);
  assert.equal((await service.list(ctx())).length, 2);
  assert.equal(records.mock.calls.length, 1);
  await assert.rejects(service.create(input, ctx()), /permission/);
  assert.equal(await service.canCreateClient(ctx()), false);
  assert.equal(await service.canUpdateClient(ctx()), false);
  assert.equal(await service.canUploadDocument(ctx()), false);
  assert.deepEqual((await service.list(ctx(), 'MY_WORK')).map(record => record.opportunityId), [10]);
  await assert.rejects(service.list(ctx(), 'MY_APPROVALS'), /permission/);
  await assert.rejects(service.list(ctx(), 'UNKNOWN'), /permission/);
});

test('complete role-based flow saves estimation, reviews it, submits a bid, negotiates and closes won or lost', async t => {
  let current = { ...record };
  let actorRole = 'SH';
  let estimation: import('../repositories/opportunity.repository').OpportunityEstimation | null = null;
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(999, actorRole) }));
  t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, isActive: true }));
  t.mock.method(repository, 'findById', async () => current);
  t.mock.method(repository, 'findEstimation', async () => estimation);
  t.mock.method(repository, 'saveEstimation', async (_id: number, saved: NonNullable<typeof estimation>) => { estimation = { ...saved, revision: saved.revision + 1 }; });
  const transition = t.mock.method(repository, 'transitionWorkflow', async (_id: number, stageId: number, subStageId: number) => {
    current = { ...current, stageId, subStageId }; return current;
  });
  const step = async (action: Parameters<typeof service.transitionWorkflow>[1], stageId: number, subStageId: number, reason = false) => {
    const previous = { stageId: current.stageId, subStageId: current.subStageId };
    await service.transitionWorkflow(10, action, reason ? 'Awaiting details' : null, null, ctx(), reason ? 3 : null);
    assert.deepEqual([current.stageId, current.subStageId], [stageId, subStageId]);
    assert.deepEqual(transition.mock.calls.at(-1)?.arguments[8], previous);
  };
  await step('HOLD', 1, 3, true);
  await step('APPROVE', 2, 4);
  actorRole = 'approver_gate2';
  await step('HOLD', 2, 6, true);
  await step('APPROVE', 3, 7);
  actorRole = 'estimation_team';
  assert.deepEqual(await service.allowedActions(current, ctx()), ['EDIT_ESTIMATION', 'SUBMIT_ESTIMATE']);
  await assert.rejects(service.transitionWorkflow(10, 'SUBMIT_ESTIMATE', null, null, ctx()), /Save an estimation/);
  await service.saveEstimation(10, { revision: 0, rows: [{ id: 'row', workItem: 'Engineering', hours: '1.25', people: 2, hourlyRate: '100.10' }], assumptions: 'One phase', total: '0.01' }, ctx());
  assert.equal((estimation as any).total, '250.25'); // Server calculates; caller's total is ignored.
  await step('SUBMIT_ESTIMATE', 4, 8);
  await assert.rejects(service.saveEstimation(10, { revision: 1, rows: [], assumptions: '', total: '' }, ctx()), /Only the Estimation Team/);
  actorRole = 'approver_gate2';
  assert.deepEqual(await service.allowedActions(current, ctx()), ['ESTIMATE_APPROVE', 'ESTIMATE_HOLD', 'ESTIMATE_REJECT']);
  await step('HOLD', 4, 9, true);
  await step('APPROVE', 5, 10);
  actorRole = 'SH';
  await assert.rejects(service.transitionWorkflow(10, 'MARK_WON', null, null, ctx()), /preceding sales workflow step/);
  await step('BID_SUBMITTED', 5, 11);
  await step('START_NEGOTIATION', 6, 12);
  await step('MARK_WON', 7, 13);
  assert.deepEqual(await service.allowedActions(current, ctx()), []);
  await assert.rejects(service.transitionWorkflow(10, 'CLOSE_OPPORTUNITY', null, null, ctx()), /open opportunity/);
  current = { ...record, stageId: 6, subStageId: 12 };
  await step('MARK_LOST', 8, 14);
});

test('rejections require an active reason and description and retain the correct rejecting stage in audit', async t => {
  let current = { ...record };
  let actorRole = 'SH';
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(999, actorRole) }));
  const reason = t.mock.method(admin, 'holdReasonCode', async () => ({ id: 3, isActive: true }));
  t.mock.method(repository, 'findById', async () => current);
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  for (const [roleCode, stageId, subStageId, rejectedSubstage] of [
    ['SH', 1, 1, 15], ['SH', 1, 3, 15], ['approver_gate2', 2, 4, 16], ['approver_gate2', 2, 6, 16],
    ['approver_gate2', 4, 8, 17], ['approver_gate2', 4, 9, 17],
  ] as const) {
    actorRole = roleCode; current = { ...record, stageId, subStageId };
    await assert.rejects(service.transitionWorkflow(10, 'REJECT', 'Not suitable', null, ctx()), /rejection reason/);
    await assert.rejects(service.transitionWorkflow(10, 'REJECT', ' ', null, ctx(), 3), /description/);
    reason.mock.mockImplementation(async () => ({ id: 3, isActive: false }));
    await assert.rejects(service.transitionWorkflow(10, 'REJECT', 'Not suitable', null, ctx(), 3), /active rejection reason/);
    reason.mock.mockImplementation(async () => ({ id: 3, isActive: true }));
    await service.transitionWorkflow(10, 'REJECT', ' Not suitable ', null, ctx(), 3);
    const args = transition.mock.calls.at(-1)!.arguments;
    assert.deepEqual(args.slice(0, 6), [10, 9, rejectedSubstage, null, 7, 'Not suitable']);
    assert.deepEqual(args[7], { roleId: 999, roleName: role(999, roleCode).roleName, reasonCodeId: 3 });
  }
  actorRole = 'SH'; current = { ...record, stageId: 2, subStageId: 4 };
  await assert.rejects(service.transitionWorkflow(10, 'REJECT', 'Not suitable', null, ctx(), 3), /CEO role/);
  actorRole = 'approver_gate2'; current = { ...record };
  await assert.rejects(service.transitionWorkflow(10, 'REJECT', 'Not suitable', null, ctx(), 3), /Sales Head role/);
});

test('Sales Head and CEO both see all stages while Sales Head alone can close any open opportunity', async t => {
  let actorRole = 'SH';
  let current = { ...record };
  const records = [[1, 1], [2, 4], [3, 7], [4, 8], [5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18]].map(([stageId, subStageId]) => ({ ...record, stageId, subStageId }));
  t.mock.method(users, 'findUser', async () => ({ id: 7, roleId: 999, isActive: true }));
  t.mock.method(admin, 'roleAccess', async () => ({ menus, roleAccess: [], role: role(999, actorRole) }));
  t.mock.method(repository, 'findById', async () => current);
  t.mock.method(repository, 'findAll', async () => records);
  const transition = t.mock.method(repository, 'transitionWorkflow', async (...args: unknown[]) => args);
  for (const reviewer of ['SH', 'approver_gate2']) {
    actorRole = reviewer;
    assert.equal((await service.list(ctx(), 'MY_APPROVALS')).length, records.length);
    for (const entry of records) { current = entry; assert.equal((await service.get(10, ctx())).opportunityId, 10); }
  }
  for (const entry of records.filter(entry => entry.stageId! <= 6)) {
    current = entry;
    await assert.rejects(service.transitionWorkflow(10, 'CLOSE_OPPORTUNITY', null, null, ctx()), /Only the Sales Head/);
    actorRole = 'SH';
    await service.transitionWorkflow(10, 'CLOSE_OPPORTUNITY', null, null, ctx());
    assert.deepEqual(transition.mock.calls.at(-1)?.arguments.slice(0, 3), [10, 9, 18]);
    actorRole = 'approver_gate2';
  }
});
