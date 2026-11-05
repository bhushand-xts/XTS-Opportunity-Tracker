import { useMemo } from "react";
import { useQuery } from "@apollo/client";
import type { Permission } from "@xts/api-contracts";
import { GET_PERMISSIONS } from "./permission.queries";

export function usePermissions() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ permissions: Permission[] }>(GET_PERMISSIONS, {
    fetchPolicy: "cache-and-network",
  });
  const permissions = useMemo(() => data?.permissions ?? [], [data]);

  // Only "loading" while there is nothing to show yet (not during a background refresh).
  return { permissions, loading: loading && data === undefined, error };
}
