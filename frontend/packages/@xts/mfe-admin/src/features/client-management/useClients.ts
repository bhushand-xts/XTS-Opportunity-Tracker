import { useQuery } from "@apollo/client";
import type { Client } from "@xts/api-contracts";
import { GET_CLIENTS } from "./client.queries";

export function useClients() {
  const { data, loading, error } = useQuery<{ clientsList: Client[] }>(GET_CLIENTS, {
    fetchPolicy: "cache-and-network",
  });

  return {
    clients: data?.clientsList ?? [],
    loading: loading && data === undefined,
    error,
  };
}
