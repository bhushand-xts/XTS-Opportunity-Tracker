import { useQuery } from "@apollo/client";
import type { Role } from "@xts/api-contracts";
import { GET_ROLES } from "./role.queries";

interface GetRolesResult {
  roles: Role[];
}

export function useRoles() {
  const { data, loading, error, refetch } = useQuery<GetRolesResult>(GET_ROLES);

  return {
    roles: data?.roles ?? [],
    loading,
    error,
    refetch,
  };
}
