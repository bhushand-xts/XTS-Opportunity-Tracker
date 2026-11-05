import { useQuery } from "@apollo/client";
import type { ReasonCode } from "@xts/api-contracts";
import { GET_REASON_CODES } from "./reasonCode.queries";

export function useReasonCodes() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ reasonCodesList: ReasonCode[] }>(GET_REASON_CODES, {
    fetchPolicy: "cache-and-network",
  });

  return {
    reasonCodes: data?.reasonCodesList ?? [],
    // Only "loading" while there is nothing to show yet (not during a background refresh).
    loading: loading && data === undefined,
    error,
  };
}
