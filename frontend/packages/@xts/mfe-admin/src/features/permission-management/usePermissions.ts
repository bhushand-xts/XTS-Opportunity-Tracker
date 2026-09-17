import { useQuery } from "@apollo/client";
import type { Permission } from "@xts/api-contracts";
import { GET_PERMISSIONS } from "./permission.queries";

// The real backend's Permissions type only has `id` today (see
// permission.queries.ts) — intentionally not the full `Permission` shape
// from @xts/api-contracts.
export type PermissionListItem = Pick<Permission, "id">;

interface GetPermissionsResult {
  permissionsList: PermissionListItem[];
}

export function usePermissions() {
  const { data, loading, error, refetch } = useQuery<GetPermissionsResult>(GET_PERMISSIONS);

  return {
    permissions: data?.permissionsList ?? [],
    loading,
    error,
    refetch,
  };
}
