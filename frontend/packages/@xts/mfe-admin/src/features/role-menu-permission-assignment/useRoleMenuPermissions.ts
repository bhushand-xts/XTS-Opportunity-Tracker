import { useQuery } from "@apollo/client";
import { GET_ROLE_MENU_PERMISSIONS } from "./roleMenuPermission.queries";

interface RoleMenuListItem {
  id: number;
}
interface RolePermissionsListItem {
  id: number;
}

interface GetRoleMenuPermissionsResult {
  roleMenuList: RoleMenuListItem[];
  rolePermissionsList: RolePermissionsListItem[];
}

/**
 * NOT actually scoped to `roleId` — the real backend has no roleId-scoped
 * or role/menu/permission-linking query yet (see roleMenuPermission.queries.ts).
 * This fetches the same two id-only lists regardless of which role is
 * selected; `roleId` is kept as a parameter only to preserve the `skip`
 * behavior the page relies on (don't fetch until a role is chosen).
 */
export function useRoleMenuPermissions(roleId: string | undefined) {
  const { data, loading, error } = useQuery<GetRoleMenuPermissionsResult>(GET_ROLE_MENU_PERMISSIONS, {
    skip: !roleId,
  });

  return {
    roleMenuIds: data?.roleMenuList ?? [],
    rolePermissionIds: data?.rolePermissionsList ?? [],
    loading,
    error,
  };
}
