import { useQuery } from "@apollo/client";
import type { Role } from "@xts/api-contracts";
import { GET_ROLES } from "./role.queries";

export function useRoles() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ rolesList: Role[] }>(GET_ROLES, { fetchPolicy: "cache-and-network" });

  return {
    roles: data?.rolesList ?? [],
    // Only "loading" while there is nothing to show yet (not during a background refresh).
    loading: loading && data === undefined,
    error,
  };
}
