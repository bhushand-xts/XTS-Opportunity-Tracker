import { useQuery } from "@apollo/client";
import type { EstimationPhase } from "@xts/api-contracts";
import { GET_ESTIMATION_PHASES } from "./estimatePhase.queries";

export function useEstimatePhases() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ estimationPhasesList: EstimationPhase[] }>(GET_ESTIMATION_PHASES, {
    fetchPolicy: "cache-and-network",
  });

  return {
    phases: data?.estimationPhasesList ?? [],
    // Only "loading" while there is nothing to show yet (not during a background refresh).
    loading: loading && data === undefined,
    error,
  };
}
