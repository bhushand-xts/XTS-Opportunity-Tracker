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
const parentView = grant(101, 'view');
const pipelineView = [parentView, grant(102, 'view')];
const workView = [parentView, grant(103, 'view')];
const approvalsView = [parentView, grant(104, 'view')];

test('every role requires explicit Opportunities and child View grants for each queue', () => {
  for (const roleCode of ['SH', 'approver_gate2', 'estimation_team', 'custom_role']) {
    for (const [queue, menuId] of [['PIPELINE', 102], ['MY_WORK', 103], ['MY_APPROVALS', 104]] as const) {
      for (const grants of [[], [parentView], [grant(menuId, 'view')], [parentView, grant(menuId, 'approve')]]) {
        const access = opportunityAccess(1, menus, grants, role(roleCode));
        assert.equal(access.canListQueue(queue), false, `${roleCode} must not bypass View grants for ${queue}`);
      }
      assert.equal(opportunityAccess(1, menus, [parentView, grant(menuId, 'view')], role(roleCode)).canListQueue(queue), true);
    }
  }
});

test('revoking the parent View blocks details, queues, CRUD, clients and workflow capabilities despite remaining child grants', () => {
  const childGrants = [grant(102, 'view'), grant(103, 'view'), grant(104, 'view'), grant(101, 'add'), grant(101, 'edit')];
  for (const roleCode of ['SH', 'approver_gate2', 'estimation_team', 'custom_role']) {
    const access = opportunityAccess(1, menus, childGrants, role(roleCode));
    for (const queue of ['PIPELINE', 'MY_WORK', 'MY_APPROVALS']) assert.equal(access.canListQueue(queue), false);
    for (const stageId of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const owned = { ...record, stageId, createdBy: 1, ownerId: 1, assignedTo: 1 };
      assert.equal(access.canView(owned), false);
      assert.equal(access.canEdit(owned), false);
    }
    for (const key of ['canList', 'create', 'edit', 'readClients', 'review', 'gateReview', 'estimate'] as const) assert.equal(access[key], false);
  }
});

test('Pipeline View grants reading without approval or estimation capabilities', () => {
  for (const roleCode of ['SH', 'approver_gate2', 'estimation_team']) {
    const access = opportunityAccess(1, menus, pipelineView, role(roleCode));
    assert.equal(access.canView(record), true);
    assert.equal(access.review, false);
    assert.equal(access.gateReview, false);
    assert.equal(access.estimate, false);
  }
});

test('workflow child grants must belong to their own granted Opportunities parent', () => {
  for (const [menuId, queue] of [[102, 'PIPELINE'], [103, 'MY_WORK'], [104, 'MY_APPROVALS']] as const) {
    const unlinked = menus.map(menu => menu.menuId === menuId ? { ...menu, parentId: null } : menu);
    assert.equal(opportunityAccess(1, unlinked, [parentView, grant(menuId, 'view')], role('SH')).canListQueue(queue), false);
    const secondParent: AccessMenu = { ...menus[0], menuId: 300, menuKey: 'opportunity_management', menuName: 'Opportunity Management' };
    assert.equal(opportunityAccess(1, [...menus, secondParent], [grant(300, 'view'), grant(menuId, 'view')], role('SH')).canListQueue(queue), false);
  }
});

test('CEO-approved opportunities enter the permitted estimation team work queue at stage 3 / substage 7', () => {
  const ready = { ...record, stageId: 3, subStageId: 7 };
  const estimator = opportunityAccess(1, menus, workView, role('estimation_team'));
  assert.equal(estimator.canViewInQueue(ready, 'MY_WORK'), true);
  assert.equal(estimator.canView(ready), true);
  assert.equal(estimator.canViewInQueue(record, 'MY_WORK'), false);
  assert.equal(estimator.canViewInQueue({ ...ready, stageId: 2, subStageId: 4 }, 'MY_WORK'), false);
  assert.equal(opportunityAccess(1, menus, [grant(103, 'view')]).canViewInQueue(ready, 'MY_WORK'), false);
  assert.equal(opportunityAccess(1, menus, [grant(106, 'edit')]).canViewInQueue(ready, 'MY_WORK'), false);
});

test('estimation users retain visibility of proposal, negotiation and outcomes without sales decision access', () => {
  const estimator = opportunityAccess(1, menus, workView, role('estimation_team'));
  for (const [stageId, subStageId] of [[5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [10, 19]]) {
    assert.equal(estimator.canView({ ...record, stageId, subStageId }), true);
  }
  assert.equal(estimator.review, false);
  assert.equal(estimator.gateReview, false);
  assert.equal(estimator.canView(record), false);
  assert.equal(estimator.canView({ ...record, stageId: 2, subStageId: 4 }), false);
  assert.equal(estimator.canView({ ...record, stageId: 9, subStageId: 15 }), false);
});

test('Estimation Team My Work contains only in-progress estimation even for owned or assigned opportunities', () => {
  const estimator = opportunityAccess(1, menus, [...pipelineView, grant(103, 'view')], role('estimation_team'));
  for (const [stageId, subStageId] of [[1, 1], [2, 4], [4, 8], [4, 9], [5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 17], [10, 19]]) {
    const owned = { ...record, stageId, subStageId, createdBy: 1, ownerId: 1, assignedTo: 1 };
    assert.equal(estimator.canViewInQueue(owned, 'MY_WORK'), false);
    assert.equal(estimator.canViewInQueue(owned, 'PIPELINE'), true);
  }
  assert.equal(estimator.canViewInQueue({ ...record, stageId: 3, subStageId: 7 }, 'MY_WORK'), true);
});

test('uses assigned permissions with arbitrary menu IDs and no role identity', () => {
  const access = opportunityAccess(1, menus, [...pipelineView, grant(101, 'add'), grant(101, 'edit'), grant(104, 'approve')]);
  assert.equal(access.create, true);
  assert.equal(access.canView(record), true);
  assert.equal(access.canEdit(record), true);
  assert.equal(access.review, false);
  assert.equal(access.gateReview, false);
  assert.equal(access.estimate, false);
});

test('does not grant writes from view, or opportunity creation from approvals Add', () => {
  const access = opportunityAccess(1, menus, [...pipelineView, grant(104, 'add')]);
  assert.equal(access.canView(record), true);
  assert.equal(access.create, false);
  assert.equal(access.canEdit(record), false);
  assert.equal(access.review, false);
});

test('Edit permission applies at every workflow stage without granting review decisions', () => {
  const access = opportunityAccess(1, menus, [parentView, grant(101, 'edit')]);
  assert.equal(access.canEdit({ ...record, subStageId: 2 }), true);
  assert.equal(access.canEdit({ ...record, subStageId: 2, createdBy: 1 }), true);
  assert.equal(access.canEdit({ ...record, stageId: 2, subStageId: 5 }), true);
  for (const [stageId, subStageId] of [[2, 4], [3, 7], [4, 8], [5, 10], [6, 12], [7, 13], [8, 14], [9, 15]]) {
    assert.equal(access.canEdit({ ...record, stageId, subStageId }), true);
    assert.equal(opportunityAccess(1, menus, []).canEdit({ ...record, stageId, subStageId }), false);
  }
  assert.equal(access.review, false);
  assert.equal(access.gateReview, false);
});

test('scopes My Work to the creator, owner or assignee and gate visibility to its stages', () => {
  const work = opportunityAccess(1, menus, workView);
  assert.equal(work.canView(record), false);
  for (const field of ['createdBy', 'ownerId', 'assignedTo']) assert.equal(work.canView({ ...record, [field]: 1 }), true);
  const gate = opportunityAccess(1, menus, approvalsView, role('approver_gate2'));
  assert.equal(gate.canView(record), true);
  assert.equal(gate.canView({ ...record, stageId: 2, subStageId: 4 }), true);
  assert.equal(gate.review, false);
  assert.equal(gate.gateReview, true);
  const estimator = opportunityAccess(1, menus, [...workView, grant(106, 'view')]);
  for (const [stageId, subStageId] of [[3, 7], [4, 8], [5, 10]]) {
    assert.equal(estimator.canView({ ...record, stageId, subStageId }), true);
    assert.equal(gate.canView({ ...record, stageId, subStageId }), true);
  }
});

test('ignores revoked grants, inactive menus, inactive ancestors, cycles and unrelated routes', () => {
  assert.equal(opportunityAccess(1, menus, []).canList, false);
  const grants = pipelineView;
  for (const changed of [
    menus.map(menu => menu.menuId === 102 ? { ...menu, isActive: false } : menu),
    menus.map(menu => menu.menuId === 101 ? { ...menu, isActive: false } : menu),
    menus.map(menu => menu.menuId === 101 ? { ...menu, parentId: 102 } : menu),
    menus.map(menu => menu.menuId === 102 ? { ...menu, routePath: '/admin/settings' } : menu),
  ]) assert.equal(opportunityAccess(1, changed, grants).canList, false);
});

test('parent View does not grant Pipeline access or inherit sibling CRUD or role capabilities', () => {
  const access = opportunityAccess(1, menus, [grant(101, 'view'),
    ...['view', 'add', 'edit', 'approve', 'delete'].flatMap(permission => [grant(103, permission), grant(104, permission)])]);
  assert.equal(access.create, false);
  assert.equal(access.edit, false);
  assert.equal(access.canListQueue('PIPELINE'), false);
  assert.equal(access.canViewInQueue(record, 'PIPELINE'), false);
  assert.equal(access.canListQueue('MY_WORK'), true);
  assert.equal(access.canViewInQueue(record, 'MY_WORK'), false);
  assert.equal(access.canViewInQueue({ ...record, ownerId: 1 }, 'MY_WORK'), true);
  assert.equal(access.canListQueue('MY_APPROVALS'), true);
  assert.equal(access.canViewInQueue(record, 'MY_APPROVALS'), false);
  assert.equal(access.canEdit(record), false);
  assert.equal(access.canView(record), false);
  const siblingsOnly = opportunityAccess(1, menus, [grant(103, 'view'), grant(103, 'add'), grant(104, 'approve')]);
  assert.equal(siblingsOnly.readClients, false);
});

test('review roles with parent and approvals View retain role decisions without CRUD or approve grants', () => {
  const sales = opportunityAccess(1, menus, approvalsView, role('SH'));
  const ceo = opportunityAccess(1, menus, approvalsView, role('approver_gate2'));
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
  assert.equal(ceo.canViewInQueue(record, 'MY_APPROVALS'), false);
  const qualifying = { ...record, stageId: 2, subStageId: 4 };
  assert.equal(sales.canViewInQueue(qualifying, 'MY_APPROVALS'), false);
  assert.equal(ceo.canViewInQueue(qualifying, 'MY_APPROVALS'), true);
  for (const inactive of [undefined, { ...role('SH'), isActive: false }, role('custom_reviewer')]) {
    const access = opportunityAccess(1, menus, [...approvalsView, grant(104, 'approve'), grant(105, 'approve')], inactive);
    assert.equal(access.review, false);
    assert.equal(access.gateReview, false);
  }
});

test('My Approvals includes only the current role stages even with Pipeline View, ownership or assignment', () => {
  const records = [
    [1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [2, 6], [3, 7], [4, 8], [4, 9],
    [5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18], [10, 19], [10, 20],
  ].map(([stageId, subStageId]) => ({ ...record, stageId, subStageId, createdBy: 1, ownerId: 1, assignedTo: 1 }));
  for (const [roleCode, expected] of [['SH', [1, 5, 6]], ['approver_gate2', [2, 4]]] as const) {
    const access = opportunityAccess(1, menus, [...pipelineView, grant(104, 'view')], role(roleCode));
    assert.deepEqual(records.filter(entry => access.canViewInQueue(entry, 'MY_APPROVALS')),
      records.filter(entry => (expected as readonly number[]).includes(entry.stageId)));
    assert.equal(records.every(entry => access.canViewInQueue(entry, 'PIPELINE')), true);
    assert.equal(access.canViewInQueue({ ...record, stageId: null, subStageId: null, assignedTo: 1 }, 'MY_APPROVALS'), false);
  }
  for (const otherRole of ['sales_representative', 'estimation_team', 'custom_role']) {
    const access = opportunityAccess(1, menus, [...pipelineView, grant(104, 'view'), grant(104, 'approve')], role(otherRole));
    assert.equal(records.some(entry => access.canViewInQueue(entry, 'MY_APPROVALS')), false);
  }
});

test('Sales Representatives with View see every creator but Edit only changes their own opportunities', () => {
  const rep = role('sales_representative');
  const access = opportunityAccess(1, menus, [...pipelineView, grant(101, 'edit')], rep);
  for (const other of [record, { ...record, ownerId: 1 }, { ...record, assignedTo: 1 }]) {
    assert.equal(access.canView(other), true);
    assert.equal(access.canViewInQueue(other, 'PIPELINE'), true);
    assert.equal(access.canEdit(other), false);
  }
  assert.equal(access.canEdit({ ...record, createdBy: 1 }), true);
  assert.equal(opportunityAccess(1, menus, [], rep).canEdit({ ...record, createdBy: 1 }), false);
  assert.equal(access.canEdit({ ...record, createdBy: 1, stageId: 3, subStageId: 7 }), true);
  const returned = { ...record, createdBy: 1, subStageId: 2 };
  assert.equal(access.canEdit(returned), true);
  assert.equal(access.canEdit({ ...returned, createdBy: 55, ownerId: 1, assignedTo: 1 }), false);
  for (const creatorRole of ['SH', 'custom_creator']) {
    const creator = opportunityAccess(1, menus, [parentView, grant(101, 'edit')], role(creatorRole));
    assert.equal(creator.canEdit(returned), true);
    assert.equal(creator.canEdit({ ...returned, createdBy: 55, ownerId: 1 }), true);
  }
});

test('recognizes Pipeline as its own menu when its route is the opportunity root', () => {
  const sharedRoute = menus.map(menu => menu.menuId === 102 ? { ...menu, routePath: '/opportunities' } : menu);
  const access = opportunityAccess(1, sharedRoute, [...pipelineView, grant(102, 'add'), grant(102, 'edit')]);
  assert.equal(access.canListQueue('PIPELINE'), true);
  assert.equal(access.canListQueue('MY_WORK'), false);
  assert.equal(access.create, false);
  assert.equal(access.edit, false);
});
