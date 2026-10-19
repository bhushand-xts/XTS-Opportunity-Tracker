import assert from 'node:assert/strict';
import { test } from 'node:test';
import { opportunityAccess, type AccessMenu, type WorkflowRecord, type WorkflowRole } from './opportunityAccess';

const menus: AccessMenu[] = [
  { menuId: 101, menuKey: 'opportunities', menuName: 'Opportunities', parentId: null, routePath: null, isActive: true },
  { menuId: 102, menuKey: 'pipeline', menuName: 'Pipeline', parentId: 101, routePath: '/opportunities', isActive: true },
  { menuId: 103, menuKey: 'my_work', menuName: 'My Work', parentId: 101, routePath: '/opportunities/work', isActive: true },
  { menuId: 104, menuKey: 'my_approvals', menuName: 'My Approvals', parentId: 101, routePath: '/opportunities/approvals', isActive: true },
  { menuId: 105, menuKey: 'gate_2_approval', menuName: 'Gate-2 Approval', parentId: null, routePath: null, isActive: true },
  { menuId: 106, menuKey: 'estimation', menuName: 'Estimation', parentId: null, routePath: null, isActive: true },
];
const record: WorkflowRecord = { stageId: 1, subStageId: 1, createdBy: 55, ownerId: 55, assignedTo: null };
const grant = (menuId: number, permissionKey: string) => ({ menuId, permissionKey });
const role = (roleCode: string, roleName = roleCode): WorkflowRole => ({ id: 999, roleCode, roleName, isActive: true });

test('CEO-approved opportunities enter the permitted estimation team work queue at stage 3 / substage 7', () => {
  const ready = { ...record, stageId: 3, subStageId: 7 };
  const estimator = opportunityAccess(1, menus, [], role('estimation_team'));
  assert.equal(estimator.canViewInQueue(ready, 'MY_WORK'), true);
  assert.equal(estimator.canView(ready), true);
  assert.equal(estimator.canViewInQueue(record, 'MY_WORK'), false);
  assert.equal(estimator.canViewInQueue({ ...ready, stageId: 2, subStageId: 4 }, 'MY_WORK'), false);
  assert.equal(opportunityAccess(1, menus, [grant(103, 'view')]).canViewInQueue(ready, 'MY_WORK'), false);
  assert.equal(opportunityAccess(1, menus, [grant(106, 'edit')]).canViewInQueue(ready, 'MY_WORK'), false);
});

test('uses assigned permissions with arbitrary menu IDs and no role identity', () => {
  const access = opportunityAccess(1, menus, [grant(101, 'add'), grant(101, 'edit'), grant(102, 'view'), grant(104, 'approve')]);
  assert.equal(access.create, true);
  assert.equal(access.canView(record), true);
  assert.equal(access.canEdit(record), true);
  assert.equal(access.review, false);
  assert.equal(access.gateReview, false);
  assert.equal(access.estimate, false);
});

test('does not grant writes from view, or opportunity creation from approvals Add', () => {
  const access = opportunityAccess(1, menus, [grant(102, 'view'), grant(104, 'add')]);
  assert.equal(access.canView(record), true);
  assert.equal(access.create, false);
  assert.equal(access.canEdit(record), false);
  assert.equal(access.review, false);
});

test('keeps workflow steps and creator-only returned changes intact', () => {
  const access = opportunityAccess(1, menus, [grant(101, 'edit')]);
  assert.equal(access.canEdit({ ...record, subStageId: 2 }), false);
  assert.equal(access.canEdit({ ...record, subStageId: 2, createdBy: 1 }), true);
  assert.equal(access.canEdit({ ...record, stageId: 2, subStageId: 5 }), true);
  for (const [stageId, subStageId] of [[2, 4], [3, 7], [4, 8], [5, 10]]) {
    assert.equal(access.canEdit({ ...record, stageId, subStageId }), false);
  }
});

test('scopes My Work to the creator, owner or assignee and gate visibility to its stages', () => {
  const work = opportunityAccess(1, menus, [grant(103, 'view')]);
  assert.equal(work.canView(record), false);
  for (const field of ['createdBy', 'ownerId', 'assignedTo']) assert.equal(work.canView({ ...record, [field]: 1 }), true);
  const gate = opportunityAccess(1, menus, [], role('approver_gate2'));
  assert.equal(gate.canView(record), true);
  assert.equal(gate.canView({ ...record, stageId: 2, subStageId: 4 }), true);
  assert.equal(gate.review, false);
  assert.equal(gate.gateReview, true);
  const estimator = opportunityAccess(1, menus, [grant(106, 'view')]);
  for (const [stageId, subStageId] of [[3, 7], [4, 8], [5, 10]]) {
    assert.equal(estimator.canView({ ...record, stageId, subStageId }), true);
    assert.equal(gate.canView({ ...record, stageId, subStageId }), true);
  }
});

test('ignores revoked grants, inactive menus, inactive ancestors, cycles and unrelated routes', () => {
  assert.equal(opportunityAccess(1, menus, []).canList, false);
  const grants = [grant(102, 'view')];
  for (const changed of [
    menus.map(menu => menu.menuId === 102 ? { ...menu, isActive: false } : menu),
    menus.map(menu => menu.menuId === 101 ? { ...menu, isActive: false } : menu),
    menus.map(menu => menu.menuId === 101 ? { ...menu, parentId: 102 } : menu),
    menus.map(menu => menu.menuId === 102 ? { ...menu, routePath: '/admin/settings' } : menu),
  ]) assert.equal(opportunityAccess(1, changed, grants).canList, false);
});

test('root View lists all opportunities without inheriting sibling CRUD or approval grants', () => {
  const access = opportunityAccess(1, menus, [grant(101, 'view'),
    ...['view', 'add', 'edit', 'approve', 'delete'].flatMap(permission => [grant(103, permission), grant(104, permission)])]);
  assert.equal(access.create, false);
  assert.equal(access.edit, false);
  assert.equal(access.canListQueue('PIPELINE'), true);
  assert.equal(access.canViewInQueue(record, 'PIPELINE'), true);
  assert.equal(access.canListQueue('MY_WORK'), true);
  assert.equal(access.canViewInQueue(record, 'MY_WORK'), false);
  assert.equal(access.canViewInQueue({ ...record, ownerId: 1 }, 'MY_WORK'), true);
  assert.equal(access.canListQueue('MY_APPROVALS'), false);
  assert.equal(access.canEdit(record), false);
  assert.equal(access.canView(record), true);
  const siblingsOnly = opportunityAccess(1, menus, [grant(103, 'view'), grant(103, 'add'), grant(104, 'approve')]);
  assert.equal(siblingsOnly.readClients, false);
});

test('review roles grant workflow access without CRUD or approve permissions, scoped to their stages', () => {
  const sales = opportunityAccess(1, menus, [], role('SH'));
  const ceo = opportunityAccess(1, menus, [], role('approver_gate2'));
  for (const access of [sales, ceo]) {
    assert.equal(access.canListQueue('MY_APPROVALS'), true);
    assert.equal(access.create, false);
    assert.equal(access.canEdit(record), false);
    assert.equal(access.canListQueue('PIPELINE'), false);
  }
  assert.equal(sales.review, true);
  assert.equal(sales.gateReview, false);
  assert.equal(ceo.review, false);
  assert.equal(ceo.gateReview, true);
  assert.equal(sales.canViewInQueue(record, 'MY_APPROVALS'), true);
  assert.equal(ceo.canViewInQueue(record, 'MY_APPROVALS'), true);
  const qualifying = { ...record, stageId: 2, subStageId: 4 };
  assert.equal(sales.canViewInQueue(qualifying, 'MY_APPROVALS'), true);
  assert.equal(ceo.canViewInQueue(qualifying, 'MY_APPROVALS'), true);
  for (const inactive of [undefined, { ...role('SH'), isActive: false }, role('custom_reviewer')]) {
    const access = opportunityAccess(1, menus, [grant(104, 'approve'), grant(105, 'approve')], inactive);
    assert.equal(access.review, false);
    assert.equal(access.gateReview, false);
  }
});

test('Sales Representatives with View see every creator but Edit only changes their own opportunities', () => {
  const rep = role('sales_representative');
  const access = opportunityAccess(1, menus, [grant(101, 'view'), grant(101, 'edit')], rep);
  for (const other of [record, { ...record, ownerId: 1 }, { ...record, assignedTo: 1 }]) {
    assert.equal(access.canView(other), true);
    assert.equal(access.canViewInQueue(other, 'PIPELINE'), true);
    assert.equal(access.canEdit(other), false);
  }
  assert.equal(access.canEdit({ ...record, createdBy: 1 }), true);
  assert.equal(opportunityAccess(1, menus, [], rep).canEdit({ ...record, createdBy: 1 }), false);
  assert.equal(access.canEdit({ ...record, createdBy: 1, stageId: 3, subStageId: 7 }), false);
  const returned = { ...record, createdBy: 1, subStageId: 2 };
  assert.equal(opportunityAccess(1, menus, [], rep).canResubmit(returned), true);
  assert.equal(access.canResubmit({ ...returned, createdBy: 55, ownerId: 1, assignedTo: 1 }), false);
  const sales = opportunityAccess(1, menus, [], role('SH'));
  assert.equal(sales.canResubmit({ ...record, stageId: 2, subStageId: 5 }), true);
  assert.equal(access.canResubmit({ ...record, stageId: 2, subStageId: 5 }), false);
});

test('recognizes Pipeline as its own menu when its route is the opportunity root', () => {
  const sharedRoute = menus.map(menu => menu.menuId === 102 ? { ...menu, routePath: '/opportunities' } : menu);
  const access = opportunityAccess(1, sharedRoute, [grant(102, 'view'), grant(102, 'add'), grant(102, 'edit')]);
  assert.equal(access.canListQueue('PIPELINE'), true);
  assert.equal(access.canListQueue('MY_WORK'), false);
  assert.equal(access.create, false);
  assert.equal(access.edit, false);
});
