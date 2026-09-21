import { useQuery } from "@apollo/client";
import { GET_PERMISSIONS } from "./permission.queries";

// Matches the real backend's Permission type (permissions.typeDefs.ts) exactly.
export interface Permission {
  permissionId: number;
  permissionName: string;
  permissionKey: string;
  description: string | null;
  createdDt: string;
  createdBy: number;
  updatedDt: string | null;
  updatedBy: number | null;
  isActive: boolean;
}

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
