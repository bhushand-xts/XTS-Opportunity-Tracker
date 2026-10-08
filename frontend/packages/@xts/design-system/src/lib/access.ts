import { useQuery } from "@apollo/client";
import { useAuth } from "./auth";
import { GET_MENUS_FOR_ACCESS, GET_ROLE_ACCESS } from "./access.queries";

/** The menu_key (mst_menus.menu_key) that gates this frontend's Opportunity
 * tracker (Pipeline, Question Review, Answer Workspace, Progress Dashboard,
 * etc.) — kept as one named constant so pointing the gate at a different
 * menu later is a one-line change, not a rewire. Points at the existing
 * "Opportunities" menu (mst_menus.menu_id 12), created via Menu Master —
 * reused rather than a separate menu, so Role Menu Permission Assignment
 * has one row to grant, not two. */
export const OPPORTUNITY_MENU_KEY = "opportunities";

const SSO_DEMO_USER_ID = "sso-demo";

interface MenusForAccessData {
  menus: { menuId: number; menuKey: string }[];
}
interface RoleAccessData {
  roleAccess: { menuId: number; permissionKey: string }[];
}

export interface MenuAccess {
  loading: boolean;
  hasAccess(menuKey: string): boolean;
  grantedPermissions(menuKey: string): string[];
}

/** Resolves the signed-in user's role -> menu -> permission grants, reusing
 * the exact `roleAccess` query Role Menu Permission Assignment already uses
 * — no new backend work. Fails closed: no role, no matching menu row, or a
 * query error all mean no access; this never defaults to showing a
 * restricted page. The demo SSO login (no real mst_user row, so no real
 * roleId) is treated as full access, matching its existing "acts like
 * admin" intent elsewhere in the app. */
export function useMenuAccess(): MenuAccess {
  const { session } = useAuth();
  const isSsoDemo = session?.userId === SSO_DEMO_USER_ID;
  const roleId = !isSsoDemo && session ? Number(session.roleId) : NaN;
  const hasRole = Number.isInteger(roleId) && roleId > 0;

  const { data: menusData, loading: menusLoading } = useQuery<MenusForAccessData>(GET_MENUS_FOR_ACCESS, {
    skip: isSsoDemo,
  });
  const { data: accessData, loading: accessLoading } = useQuery<RoleAccessData, { roleId: number }>(GET_ROLE_ACCESS, {
    variables: { roleId },
    skip: isSsoDemo || !hasRole,
  });

  if (isSsoDemo) {
    return { loading: false, hasAccess: () => true, grantedPermissions: () => [] };
  }

  const menuIdByKey = new Map(menusData?.menus.map((m) => [m.menuKey, m.menuId]));
  const grantsByMenuId = new Map<number, string[]>();
  for (const grant of accessData?.roleAccess ?? []) {
    const list = grantsByMenuId.get(grant.menuId) ?? [];
    list.push(grant.permissionKey);
    grantsByMenuId.set(grant.menuId, list);
  }

  function grantedPermissions(menuKey: string): string[] {
    const menuId = menuIdByKey.get(menuKey);
    if (menuId === undefined) return [];
    return grantsByMenuId.get(menuId) ?? [];
  }

  return {
    loading: menusLoading || (hasRole && accessLoading),
    hasAccess: (menuKey: string) => grantedPermissions(menuKey).length > 0,
    grantedPermissions,
  };
}
