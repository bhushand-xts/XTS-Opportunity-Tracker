import { useQuery } from "@apollo/client";
import { GET_AVAILABLE_PERMISSIONS_FOR_MENU, GET_ROLE_MENU_PERMISSIONS } from "./roleMenuPermission.queries";

// Matches the real backend's AvailablePermission type (access.typeDefs.ts)
// exactly.
export interface AvailablePermission {
  permissionId: number;
  permissionName: string;
  permissionKey: string;
}

// Matches the real backend's RoleMenuPermission type (access.typeDefs.ts)
// exactly.
export interface RoleMenuPermission {
  id: number;
  roleId: number;
  menuId: number;
  permissionId: number;
  menuName: string;
  permissionName: string;
  permissionKey: string;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
}

interface GetAvailablePermissionsForMenuResult {
  availablePermissionsForMenu: AvailablePermission[];
}

interface GetRoleMenuPermissionsResult {
  roleMenuPermissions: RoleMenuPermission[];
}

/**
 * Fetches the permission catalog for a menu and the subset of it currently
 * granted to a role, for the checkbox list on the assignment page. Both
 * queries are skipped until a role AND a menu are selected.
 */
export function useRoleMenuPermissions(roleId: string | undefined, menuId: string | undefined) {
  const skip = !roleId || !menuId;
  const numericRoleId = roleId ? Number(roleId) : undefined;
  const numericMenuId = menuId ? Number(menuId) : undefined;

  const {
    data: availableData,
    loading: availableLoading,
    error: availableError,
  } = useQuery<GetAvailablePermissionsForMenuResult>(GET_AVAILABLE_PERMISSIONS_FOR_MENU, {
    variables: { menuId: numericMenuId },
    skip,
  });

  const {
    data: grantedData,
    loading: grantedLoading,
    error: grantedError,
  } = useQuery<GetRoleMenuPermissionsResult>(GET_ROLE_MENU_PERMISSIONS, {
    variables: { roleId: numericRoleId, menuId: numericMenuId },
    skip,
  });

  const availablePermissions = availableData?.availablePermissionsForMenu ?? [];
  const grantedPermissions = grantedData?.roleMenuPermissions ?? [];
  const grantedPermissionIds = grantedPermissions.map((entry) => entry.permissionId);

  return {
    availablePermissions,
    grantedPermissionIds,
    loading: availableLoading || grantedLoading,
    error: availableError ?? grantedError,
  };
}
