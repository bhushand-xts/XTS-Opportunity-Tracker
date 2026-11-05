import { useQuery } from "@apollo/client";
import type { RateMaster } from "@xts/api-contracts";
import { GET_RATE_MASTERS } from "./rateMaster.queries";

export function useRateMasters() {
  const { data, loading, error } = useQuery<{ rateMasters: RateMaster[] }>(
    GET_RATE_MASTERS,
    { fetchPolicy: "cache-and-network" }
  );

  return {
    rateMasters: data?.rateMasters ?? [],
    loading: loading && data === undefined,
    error,
  };
}