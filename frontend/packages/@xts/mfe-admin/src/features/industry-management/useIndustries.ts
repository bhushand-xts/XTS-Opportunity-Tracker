import { useQuery } from "@apollo/client";
import type { Industry } from "@xts/api-contracts";
import { GET_INDUSTRIES } from "./industry.queries";

export function useIndustries() {
  const { data, loading, error } = useQuery<{ industries: Industry[] }>(
    GET_INDUSTRIES,
    { fetchPolicy: "cache-and-network" }
  );

  return {
    industries: data?.industries ?? [],
    loading: loading && data === undefined,
    error,
  };
}
