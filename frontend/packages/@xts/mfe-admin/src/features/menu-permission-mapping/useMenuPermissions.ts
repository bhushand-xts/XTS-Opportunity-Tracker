import { useQuery } from "@apollo/client";
import { GET_MENU_PERMISSIONS } from "./menuPermissionMapping.queries";

// Matches the real backend's Permission type (permissions.typeDefs.ts),
// restricted to the fields this page needs.
export interface MenuPermissionMappingPermission {
  permissionId: number;
  permissionName: string;
  permissionKey: string;
  description: string | null;
  isActive: boolean;
}

interface GetMenuPermissionsResult {
  menuPermissions: MenuPermissionMappingPermission[];
}

/**
 * Fetches the permissions currently mapped to a menu — used only to
 * determine which checkboxes in the full catalog start pre-checked.
 * Skipped until a menu is selected.
 */
export function useMenuPermissions(menuId: string | undefined) {
  const skip = !menuId;
  const numericMenuId = menuId ? Number(menuId) : undefined;

  const { data, loading, error, refetch } = useQuery<GetMenuPermissionsResult>(GET_MENU_PERMISSIONS, {
    variables: { menuId: numericMenuId },
    skip,
  });

  const mappedPermissions = data?.menuPermissions ?? [];
  const mappedPermissionIds = mappedPermissions.map((permission) => permission.permissionId);

  return {
    mappedPermissions,
    mappedPermissionIds,
    loading,
    error,
    refetch,
  };
}
