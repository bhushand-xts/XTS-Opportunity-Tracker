import { useQuery } from "@apollo/client";
import type { RoleMenuPermission } from "@xts/api-contracts";
import { GET_ROLE_MENU_PERMISSIONS } from "./roleMenuPermission.queries";

interface GetRoleMenuPermissionsResult {
  roleMenuPermissions: RoleMenuPermission[];
}

export function useRoleMenuPermissions(roleId: string | undefined) {
  const { data, loading, error } = useQuery<GetRoleMenuPermissionsResult, { roleId: string }>(
    GET_ROLE_MENU_PERMISSIONS,
    { variables: { roleId: roleId ?? "" }, skip: !roleId }
  );

  return {
    entries: data?.roleMenuPermissions ?? [],
    loading,
    error,
  };
}
