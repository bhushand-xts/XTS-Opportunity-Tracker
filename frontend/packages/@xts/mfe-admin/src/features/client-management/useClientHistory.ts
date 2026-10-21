import { useQuery } from "@apollo/client";
import type { ClientHistory } from "@xts/api-contracts";
import { GET_CLIENT_HISTORY } from "./client.queries";

export function useClientHistory(clientId: number | undefined) {
  const { data, loading, error } = useQuery<{ clientHistory: ClientHistory[] }, { clientId: number }>(
    GET_CLIENT_HISTORY,
    {
      variables: { clientId: clientId as number },
      skip: clientId === undefined,
      fetchPolicy: "cache-and-network",
    }
  );

  return {
    history: data?.clientHistory ?? [],
    loading: loading && data === undefined,
    error,
  };
}
