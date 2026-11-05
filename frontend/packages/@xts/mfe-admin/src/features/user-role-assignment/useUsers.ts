import { useQuery } from "@apollo/client";
import type { ManagedUser } from "@xts/api-contracts";
import { GET_USERS } from "./userRole.queries";

export function useUsers() {
  // cache-and-network: show what is cached straight away, then refresh from the server.
  const { data, loading, error } = useQuery<{ userList: ManagedUser[] }>(GET_USERS, {
    fetchPolicy: "cache-and-network",
  });

  return {
    users: data?.userList ?? [],
    // Only "loading" while there is nothing to show yet (not during a background refresh).
    loading: loading && data === undefined,
    error,
  };
}
