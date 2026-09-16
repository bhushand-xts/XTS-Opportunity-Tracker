import { useQuery } from "@apollo/client";
import type { Permission } from "@xts/api-contracts";
import { GET_PERMISSIONS } from "./permission.queries";

interface GetPermissionsResult {
  permissions: Permission[];
}

export function usePermissions() {
  const { data, loading, error, refetch } = useQuery<GetPermissionsResult>(GET_PERMISSIONS);

  return {
    permissions: data?.permissions ?? [],
    loading,
    error,
    refetch,
  };
}
