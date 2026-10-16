export interface AccessMenu {
  menuId: number; menuKey: string; menuName: string; parentId: number | null;
  routePath: string | null; isActive: boolean;
}
export interface AccessGrant { menuId: number; permissionKey: string; }
export interface WorkflowRecord { stageId: number | null; subStageId: number | null; createdBy: number | null; ownerId: number | null; assignedTo: number | null; }
type Area = 'opportunities' | 'pipeline' | 'work' | 'approvals' | 'gate' | 'estimation' | 'reestimation';
const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_');
const areas: Record<Area, string[]> = {
  opportunities: ['opportunity', 'opportunities', 'opportunity_management', 'opportunity_tracking'],
  pipeline: ['pipeline'], work: ['my_work'], approvals: ['my_approvals'],
  gate: ['gate_2_approval', 'gate2_approval', 'gate_2', 'gate2'],
  estimation: ['estimation'], reestimation: ['re_estimation', 'reestimation'],
};

/** Role names and IDs never grant access. Only active menu assignments do. */
export function opportunityAccess(userId: number, menus: AccessMenu[], grants: AccessGrant[]) {
  const byId = new Map(menus.map(menu => [menu.menuId, menu]));
  function active(menu: AccessMenu): boolean {
    const seen = new Set<number>();
    let current: AccessMenu | undefined = menu;
    while (current) {
      if (!current.isActive || seen.has(current.menuId)) return false;
      seen.add(current.menuId);
      if (current.parentId === null) return true;
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
  const permissions = new Map<Area, Set<string>>();
  for (const grant of grants) {
    const menu = byId.get(grant.menuId);
    const key = menu && active(menu) ? area(menu) : undefined;
    if (!key) continue;
    if (!permissions.has(key)) permissions.set(key, new Set());
    permissions.get(key)!.add(normalize(grant.permissionKey));
  }
  const has = (keys: Area[], permission: string) => keys.some(key => permissions.get(key)?.has(permission));
  const create = has(['opportunities'], 'add');
  const edit = has(['opportunities'], 'edit');
  const readClients = has(['opportunities'], 'view') || create || edit;
  const review = has(['approvals'], 'approve');
  const gateReview = has(['gate'], 'approve');
  const estimate = has(['estimation'], 'edit') || has(['estimation'], 'add') || has(['estimation'], 'submit');
  const viewAll = has(['opportunities', 'pipeline'], 'view');
  const own = (record: WorkflowRecord) => record.createdBy === userId || record.ownerId === userId || record.assignedTo === userId;
  function canListQueue(queue: string) {
    if (queue === 'PIPELINE') return has(['pipeline'], 'view');
    if (queue === 'MY_WORK') return has(['work'], 'view');
    if (queue === 'MY_APPROVALS') return has(['approvals'], 'view');
    return false;
  }
  function canViewInQueue(record: WorkflowRecord, queue: string) {
    if (!canListQueue(queue)) return false;
    if (queue === 'MY_WORK') return own(record);
    if (queue === 'MY_APPROVALS') return record.stageId === 1 ||
      ([2, 4].includes(record.stageId ?? 0) && (has(['gate'], 'view') || gateReview));
    return true;
  }
  function canView(record: WorkflowRecord) {
    if (viewAll || (own(record) && (create || edit || has(['work'], 'view')))) return true;
    if (record.stageId === 1) return has(['approvals'], 'view') || review;
    if (record.stageId === 2) return has(['gate'], 'view') || gateReview;
    if ([3, 4, 5].includes(record.stageId ?? 0)) return has(['gate', 'estimation', 'reestimation'], 'view') || estimate || gateReview;
    return false;
  }
  function canEdit(record: WorkflowRecord) {
    if (!edit) return false;
    if (record.stageId === 1 && record.subStageId === 2) return record.createdBy === userId;
    return (record.stageId === 1 && [1, 3].includes(record.subStageId ?? 0)) ||
      (record.stageId === 2 && record.subStageId === 5);
  }
  const canList = viewAll || create || edit || review || gateReview || estimate || has(['work', 'approvals', 'gate', 'estimation', 'reestimation'], 'view');
  return { userId, has, create, edit, readClients, review, gateReview, estimate, canList, canListQueue, canViewInQueue, canView, canEdit };
}
export type OpportunityAccess = ReturnType<typeof opportunityAccess>;
