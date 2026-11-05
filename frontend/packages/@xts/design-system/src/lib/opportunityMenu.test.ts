import { describe, expect, it } from 'vitest';
import { canonicalOpportunityPath, hasOpportunityPermission, opportunityMenuPermissions, resolveOpportunityMenus, type OpportunityMenuRecord } from './opportunityMenu';

const record = (overrides: Partial<OpportunityMenuRecord>): OpportunityMenuRecord => ({ menuId: 12, menuName: 'Opportunities', menuKey: 'opportunities', icon: 'ListChecks', parentId: null, sortOrder: 5, routePath: null, isActive: true, ...overrides });
const catalog = [
  record({}),
  record({ menuId: 29, menuName: 'Opportunity Management', menuKey: 'opportunity_management', icon: 'Briefcase', sortOrder: 29, routePath: '/opportunities' }),
  record({ menuId: 28, menuName: 'Opportunity Tracking', menuKey: 'opportunity_tracking', isActive: false }),
  record({ menuId: 5, menuName: 'Permission Master', menuKey: 'permission_master', routePath: '/admin/menu-management/permission-master' }),
];
const workflowMenus = [
  record({}),
  record({ menuId: 100, menuKey: 'pipeline', menuName: 'Pipeline', parentId: 12, routePath: '/opportunities' }),
  record({ menuId: 101, menuKey: 'my_work', menuName: 'My Work', parentId: 12 }),
  record({ menuId: 102, menuKey: 'my_approvals', menuName: 'My Approvals', parentId: 12 }),
];
const denied = { view: false, pipeline: false, add: false, edit: false, work: false, approvals: false, approve: false };
const grants = (...keys: string[]) => (key: string, permission: string) => keys.includes(key) && permission === 'view';

describe('Opportunity menu discovery', () => {
  it('connects both active real catalog entries and excludes inactive/admin entries', () => {
    expect(resolveOpportunityMenus(catalog).map(menu => menu.menuId)).toEqual([12, 29]);
  });
  it('discovers records in another environment without depending on numeric IDs', () => {
    expect(resolveOpportunityMenus([record({ menuId: 5 })]).map(menu => menu.menuId)).toEqual([5]);
    expect(resolveOpportunityMenus([record({ menuId: 91, menuKey: 'custom_sales', menuName: 'Opportunity Management' })])[0].menuId).toBe(91);
    expect(resolveOpportunityMenus([record({ menuId: 92, menuKey: 'custom', menuName: 'Sales workspace', routePath: '/opportunities/work' })])[0].menuId).toBe(92);
  });
  it('includes Tracking when activated, without changing frontend configuration', () => {
    expect(resolveOpportunityMenus(catalog.map(menu => menu.menuId === 28 ? { ...menu, isActive: true } : menu)).map(menu => menu.menuId)).toContain(28);
  });
  it('does not authorize Opportunity using admin routes or similarly named unrelated menus', () => {
    expect(resolveOpportunityMenus([record({ menuName: 'Opportunities', routePath: '/admin/settings' }), record({ menuName: 'Opportunity invoice', menuKey: 'opportunity_invoice' })])).toEqual([]);
    expect(canonicalOpportunityPath('/opportunity-other')).toBeNull();
  });
  it('excludes inactive ancestors and cycles', () => {
    expect(resolveOpportunityMenus([record({ menuId: 1, menuKey: 'group', menuName: 'Group', isActive: false }), record({ parentId: 1 })])).toEqual([]);
    expect(resolveOpportunityMenus([record({ parentId: 12 })])).toEqual([]);
  });
  it('uses actual menu keys from all resolved records and does not grant other actions', () => {
    const menus = resolveOpportunityMenus(catalog);
    const grants = (key: string, permission: string) => key === 'opportunity_management' && permission === 'view';
    expect(hasOpportunityPermission(menus, grants, 'view')).toBe(true);
    expect(hasOpportunityPermission(menus, grants, 'edit')).toBe(false);
    expect(hasOpportunityPermission(menus, (key) => key === 'permission_master' || key === 'opportunity_tracking', 'view')).toBe(false);
  });
  it('canonicalizes both real route roots while retaining deep paths', () => {
    expect(canonicalOpportunityPath('/opportunity/401/details')).toBe('/opportunity/401/details');
    expect(canonicalOpportunityPath('/opportunities/401/details')).toBe('/opportunity/401/details');
    expect(canonicalOpportunityPath('/opportunities')).toBe('/opportunity');
  });
  it('discovers workflow child menus without routes under the opportunity parent', () => {
    const children = [record({}), record({ menuId: 100, menuKey: 'my_approvals', menuName: 'My Approvals', parentId: 12 })];
    expect(resolveOpportunityMenus(children).map(menu => menu.menuId)).toEqual([12, 100]);
    expect(resolveOpportunityMenus(children.map(menu => ({ ...menu, isActive: menu.menuId !== 12 })))).toEqual([]);
  });
});

describe('Opportunity parent and child grants', () => {
  it('does not inherit child navigation from the parent View grant', () => {
    expect(opportunityMenuPermissions(workflowMenus, grants('opportunities'))).toEqual({ ...denied, view: true });
  });
  it.each([
    ['pipeline', 'pipeline'], ['my_work', 'work'], ['my_approvals', 'approvals'],
  ])('shows only the explicitly granted %s child', (key, area) => {
    expect(opportunityMenuPermissions(workflowMenus, grants('opportunities', key))).toEqual({
      ...denied, view: true, [area]: true, approve: area === 'approvals',
    });
  });
  it('permits all three children when the parent and each child have View', () => {
    expect(opportunityMenuPermissions(workflowMenus, grants('opportunities', 'pipeline', 'my_work', 'my_approvals'))).toEqual({
      ...denied, view: true, pipeline: true, work: true, approvals: true, approve: true,
    });
  });
  it('hides every child when parent View is revoked even if child grants remain', () => {
    expect(opportunityMenuPermissions(workflowMenus, key => key !== 'opportunities')).toEqual(denied);
  });
  it('requires parent View for Add and Edit even when those parent grants remain', () => {
    expect(opportunityMenuPermissions(workflowMenus, (_key, permission) => permission !== 'view')).toEqual(denied);
    expect(opportunityMenuPermissions(workflowMenus, key => key === 'opportunities')).toEqual({ ...denied, view: true, add: true, edit: true });
  });
  it('does not treat child Add or Edit as child View or parent CRUD', () => {
    expect(opportunityMenuPermissions(workflowMenus, (key, permission) => key === 'opportunities' ? permission === 'view' : permission !== 'view')).toEqual({
      ...denied, view: true,
    });
  });
  it.each(['Sales Head', 'CEO/Gate-2 Approver', 'CEO', 'Estimation Team', 'Sales Representative', 'System Administrator', null])('does not grant navigation from the %s role alone', role => {
    expect(opportunityMenuPermissions(workflowMenus, () => false, role)).toEqual(denied);
    expect(opportunityMenuPermissions(workflowMenus, grants('opportunities'), role)).toEqual({ ...denied, view: true });
  });
  it('uses explicit menu grants for users of any role', () => {
    expect(opportunityMenuPermissions(workflowMenus, grants('opportunities', 'my_approvals'), 'Sales Representative')).toMatchObject({ approvals: true });
    expect(opportunityMenuPermissions(workflowMenus, grants('opportunities', 'my_work'), 'CEO')).toMatchObject({ work: true });
  });
  it('does not invent workflow children when no child menu records are configured', () => {
    expect(opportunityMenuPermissions(catalog, () => true, 'CEO')).toEqual({ ...denied, view: true, add: true, edit: true });
  });
  it('rejects inactive, orphaned, and standalone child records', () => {
    for (const overrides of [{ isActive: false }, { parentId: 999 }, { parentId: null }]) {
      const menus = workflowMenus.map(menu => menu.menuId === 101 ? { ...menu, ...overrides } : menu);
      expect(opportunityMenuPermissions(menus, grants('opportunities', 'my_work'))).toEqual({ ...denied, view: true });
    }
  });
  it('rejects an inactive or missing Opportunities parent even with all grants', () => {
    expect(opportunityMenuPermissions(workflowMenus.map(menu => menu.menuId === 12 ? { ...menu, isActive: false } : menu), () => true)).toEqual(denied);
    expect(opportunityMenuPermissions(workflowMenus.filter(menu => menu.menuId !== 12), () => true)).toEqual(denied);
  });
  it('rejects cycles in the parent hierarchy', () => {
    expect(opportunityMenuPermissions(workflowMenus.map(menu => menu.menuId === 12 ? { ...menu, parentId: 101 } : menu), () => true)).toEqual(denied);
  });
  it('does not use another Opportunity parent grant to authorize a child', () => {
    const menus = [...workflowMenus, record({ menuId: 300, menuName: 'Opportunity Management', menuKey: 'opportunity_management' })];
    expect(opportunityMenuPermissions(menus, grants('opportunity_management', 'pipeline', 'my_work', 'my_approvals'))).toEqual({ ...denied, view: true });
  });
  it('matches custom keys and IDs through the actual parent hierarchy and route metadata', () => {
    const menus = [
      record({ menuId: 301, menuKey: 'custom_sales', menuName: 'Sales workspace', routePath: '/opportunities' }),
      record({ menuId: 302, menuKey: 'custom_queue', menuName: 'Review queue', parentId: 301, routePath: '/opportunities/approvals' }),
    ];
    expect(opportunityMenuPermissions(resolveOpportunityMenus(menus), grants('custom_sales', 'custom_queue'))).toEqual({
      ...denied, view: true, approvals: true, approve: true,
    });
  });

  it('requires View on every ancestor using the complete menu catalog', () => {
    const menus = [
      record({ menuId: 300, menuKey: 'sales', menuName: 'Sales', routePath: null }),
      ...workflowMenus.map(menu => menu.menuId === 12 ? { ...menu, parentId: 300 } : menu),
    ];
    expect(opportunityMenuPermissions(menus, grants('sales', 'opportunities', 'my_work'))).toEqual({ ...denied, view: true, work: true });
    expect(opportunityMenuPermissions(menus, grants('opportunities', 'my_work'))).toEqual(denied);
  });
});
