import { describe, expect, it } from 'vitest';
import { canonicalOpportunityPath, hasOpportunityPermission, opportunityMenuPermissions, resolveOpportunityMenus, type OpportunityMenuRecord } from './opportunityMenu';

const record = (overrides: Partial<OpportunityMenuRecord>): OpportunityMenuRecord => ({ menuId: 12, menuName: 'Opportunities', menuKey: 'opportunities', icon: 'ListChecks', parentId: null, sortOrder: 5, routePath: null, isActive: true, ...overrides });
const catalog = [
  record({}),
  record({ menuId: 29, menuName: 'Opportunity Management', menuKey: 'opportunity_management', icon: 'Briefcase', sortOrder: 29, routePath: '/opportunities' }),
  record({ menuId: 28, menuName: 'Opportunity Tracking', menuKey: 'opportunity_tracking', isActive: false }),
  record({ menuId: 5, menuName: 'Permission Master', menuKey: 'permission_master', routePath: '/admin/menu-management/permission-master' }),
];

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
  it('uses root View for the pipeline without inheriting sibling CRUD or approval grants', () => {
    const menus = resolveOpportunityMenus([
      record({}),
      record({ menuId: 100, menuKey: 'pipeline', menuName: 'Pipeline', parentId: 12, routePath: '/opportunities' }),
      record({ menuId: 101, menuKey: 'my_work', menuName: 'My Work', parentId: 12 }),
      record({ menuId: 102, menuKey: 'my_approvals', menuName: 'My Approvals', parentId: 12 }),
    ]);
    const access = opportunityMenuPermissions(menus, (key, permission) =>
      key === 'opportunities' ? permission === 'view' : ['my_work', 'my_approvals'].includes(key));
    expect(access).toEqual({ view: true, pipeline: true, add: false, edit: false, work: true, approvals: false, approve: false });
  });
  it('does not grant workflow or CRUD writes from View or child Add/Edit', () => {
    const menus = resolveOpportunityMenus([
      record({}), record({ menuId: 100, menuKey: 'pipeline', menuName: 'Pipeline', parentId: 12, routePath: '/opportunities' }),
    ]);
    expect(opportunityMenuPermissions(menus, (key, permission) => key === 'opportunities' && permission === 'view')).toEqual({
      view: true, pipeline: true, add: false, edit: false, work: false, approvals: false, approve: false,
    });
    expect(opportunityMenuPermissions(menus, key => key === 'pipeline')).toMatchObject({ pipeline: true, view: false, add: false, edit: false });
  });
  it('shows approval navigation for Sales Head and CEO independently of permissions', () => {
    const menus = resolveOpportunityMenus(catalog);
    for (const role of ['Sales Head', 'CEO/Gate-2 Approver', 'CEO']) {
      expect(opportunityMenuPermissions(menus, () => false, role)).toEqual({
        view: false, pipeline: false, add: false, edit: false, work: false, approvals: true, approve: true,
      });
    }
    for (const role of [null, 'Sales Representative', 'System Administrator']) {
      expect(opportunityMenuPermissions(menus, () => true, role)).toMatchObject({ approvals: false, approve: false });
    }
  });
  it('shows Estimation Team work navigation independently of permissions without granting CRUD', () => {
    expect(opportunityMenuPermissions(resolveOpportunityMenus(catalog), () => false, 'Estimation Team')).toEqual({
      view: false, pipeline: false, add: false, edit: false, work: true, approvals: false, approve: false,
    });
  });
});
