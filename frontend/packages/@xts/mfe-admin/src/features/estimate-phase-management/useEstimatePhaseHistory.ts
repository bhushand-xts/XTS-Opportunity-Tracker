import { useQuery } from "@apollo/client";
import type { EstimationPhaseHistory } from "@xts/api-contracts";
import { GET_ESTIMATION_PHASE_HISTORY } from "./estimatePhase.queries";

/** An estimate phase's change history. Fetched fresh each time the dialog opens. */
export function useEstimatePhaseHistory(phaseId: number | undefined) {
  const { data, loading, error } = useQuery<{ estimationPhaseHistory: EstimationPhaseHistory[] }>(
    GET_ESTIMATION_PHASE_HISTORY,
    {
      variables: { phaseId },
      skip: phaseId === undefined,
      fetchPolicy: "network-only",
    }
  );

  return { history: data?.estimationPhaseHistory ?? [], loading, error };
}
