export interface AccessMenu {
  menuId: number; menuKey: string; menuName: string; parentId: number | null;
  routePath: string | null; isActive: boolean;
}
export interface AccessGrant { menuId: number; permissionKey: string; }
export interface WorkflowRole { id: number; roleName: string; roleCode: string | null; isActive: boolean; }
export interface WorkflowRecord { stageId: number | null; subStageId: number | null; createdBy: number | null; ownerId: number | null; assignedTo: number | null; }
type Area = 'opportunities' | 'pipeline' | 'work' | 'approvals' | 'gate' | 'estimation' | 'reestimation';
const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const ACTIONABLE_QUEUE_STATES = new Set(['1:1', '1:2', '1:3', '2:4', '2:5', '2:6', '3:7', '4:5', '4:8', '4:9', '4:17',
  '5:10', '5:11', '6:12', '10:19', '10:20']);
const areas: Record<Area, string[]> = {
  opportunities: ['opportunity', 'opportunities', 'opportunity_management', 'opportunity_tracking'],
  pipeline: ['pipeline'], work: ['my_work'], approvals: ['my_approvals'],
  gate: ['gate_2_approval', 'gate2_approval', 'gate_2', 'gate2'],
  estimation: ['estimation'], reestimation: ['re_estimation', 'reestimation'],
};

/** Navigation requires explicit parent and child grants; workflow decisions also require the verified role. */
export function opportunityAccess(userId: number, menus: AccessMenu[], grants: AccessGrant[], role?: WorkflowRole | null) {
  const byId = new Map(menus.map(menu => [menu.menuId, menu]));
  const viewMenuIds = new Set(grants.filter(grant => normalize(grant.permissionKey) === 'view').map(grant => grant.menuId));
  function active(menu: AccessMenu): boolean {
    const seen = new Set<number>();
    let current: AccessMenu | undefined = menu;
    while (current) {
      if (!current.isActive || seen.has(current.menuId)) return false;
      seen.add(current.menuId);
      if (current.parentId === null) return true;
      if (!viewMenuIds.has(current.parentId)) return false;
      current = byId.get(current.parentId);
    }
    return false;
  }
  function area(menu: AccessMenu): Area | undefined {
    const route = menu.routePath?.replace(/^\/opportunities(?=\/|$)/, '/opportunity').replace(/\/$/, '');
    for (const key of Object.keys(areas) as Area[]) {
      if (['opportunities', 'pipeline', 'work', 'approvals'].includes(key) && route && route !== '/opportunity' && !route.startsWith('/opportunity/')) continue;
      if (areas[key].includes(normalize(menu.menuKey)) || areas[key].includes(normalize(menu.menuName))) return key;
    }
    if (route === '/opportunity') return 'opportunities';
    if (route === '/opportunity/work') return 'work';
    if (route === '/opportunity/approvals') return 'approvals';
    return undefined;
  }
  function hasOpportunityParent(menu: AccessMenu): boolean {
    const seen = new Set<number>([menu.menuId]);
    let parentId = menu.parentId;
    while (parentId !== null) {
      const parent = byId.get(parentId);
      if (!parent || seen.has(parentId)) return false;
      seen.add(parentId);
      if (area(parent) === 'opportunities') return active(parent) && viewMenuIds.has(parentId);
      parentId = parent.parentId;
    }
    return false;
  }
  const permissions = new Map<Area, Set<string>>();
  for (const grant of grants) {
    const menu = byId.get(grant.menuId);
    const key = menu && active(menu) ? area(menu) : undefined;
    if (!key) continue;
    if (['pipeline', 'work', 'approvals'].includes(key) && !hasOpportunityParent(menu!)) continue;
    if (!permissions.has(key)) permissions.set(key, new Set());
    permissions.get(key)!.add(normalize(grant.permissionKey));
  }
  const has = (keys: Area[], permission: string) => keys.some(key => permissions.get(key)?.has(permission));
  const parentView = has(['opportunities'], 'view');
  const pipelineView = parentView && has(['pipeline'], 'view');
  const workView = parentView && has(['work'], 'view');
  const approvalsView = parentView && has(['approvals'], 'view');
  const personalQueueView = workView || approvalsView;
  const create = parentView && has(['opportunities'], 'add');
  const edit = parentView && has(['opportunities'], 'edit');
  const readClients = parentView;
  const roleKeys = role?.isActive === true ? [role.roleCode ?? '', role.roleName].map(normalize) : [];
  const review = approvalsView && roleKeys.some(key => ['sh', 'sales_head'].includes(key));
  const gateReview = approvalsView && roleKeys.some(key => ['approver_gate2', 'ceo', 'ceo/gate_2_approver', 'approver'].includes(key));
  const salesRepresentative = roleKeys.some(key => ['sales_executive', 'sales_representative'].includes(key));
  const estimate = workView && roleKeys.some(key => key === 'estimation_team');
  const own = (record: WorkflowRecord) => record.createdBy === userId || record.ownerId === userId || record.assignedTo === userId;
  const hasActionableStatus = (record: WorkflowRecord) => {
    const key = `${record.stageId}:${record.subStageId}`;
    return ACTIONABLE_QUEUE_STATES.has(key);
  };
  function canListQueue(queue: string) {
    if (queue === 'PIPELINE') return pipelineView;
    if (queue === 'MY_WORK' || queue === 'MY_APPROVALS') return personalQueueView;
    return false;
  }
  function canViewInQueue(record: WorkflowRecord, queue: string) {
    if (!canListQueue(queue)) return false;
    if (queue === 'MY_WORK') {
      return record.createdBy === userId;
    }
    if (queue === 'MY_APPROVALS') {
      if (!hasActionableStatus(record)) return false;
      // Explicit assignment takes precedence over the role's general work queue.
      if (record.assignedTo !== null && record.assignedTo !== undefined) return record.assignedTo === userId;
      if (salesRepresentative) return record.stageId === 1 && record.subStageId === 2 && record.createdBy === userId;
      if (estimate) return record.stageId === 3 && record.subStageId === 7;
      if (review) return record.stageId === 1 && [1, 3].includes(record.subStageId ?? 0) ||
        record.stageId === 2 && record.subStageId === 5 || record.stageId === 5 && [10, 11].includes(record.subStageId ?? 0) ||
        record.stageId === 6 && record.subStageId === 12 || record.stageId === 10 && [19, 20].includes(record.subStageId ?? 0);
      if (gateReview) return record.stageId === 2 && [4, 6].includes(record.subStageId ?? 0) ||
        record.stageId === 4 && [5, 8, 9].includes(record.subStageId ?? 0);
      return false;
    }
    return true;
  }
  function canView(record: WorkflowRecord) {
    if (!parentView) return false;
    if (pipelineView || review || gateReview || (own(record) && (create || edit || workView || approvalsView))) return true;
    if (personalQueueView && canViewInQueue(record, 'MY_APPROVALS')) return true;
    if (!personalQueueView) return false;
    if (record.stageId === 1) return review;
    if (record.stageId === 2) return has(['gate'], 'view') || gateReview || (review && record.subStageId === 5);
    if ([3, 4, 5, 6, 7, 8, 10].includes(record.stageId ?? 0)) return has(['gate', 'estimation', 'reestimation'], 'view') || estimate || gateReview;
    return false;
  }
  function canEdit(record: WorkflowRecord) {
    if (!edit) return false;
    if (salesRepresentative && record.createdBy !== userId) return false;
    return true;
  }
  const canList = pipelineView || workView || approvalsView || create || edit;
  return { userId, has, create, edit, readClients, review, gateReview, estimate, canList, canListQueue, canViewInQueue, canView, canEdit };
}
export type OpportunityAccess = ReturnType<typeof opportunityAccess>;
