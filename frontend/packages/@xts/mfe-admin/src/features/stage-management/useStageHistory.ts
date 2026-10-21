import { useQuery } from "@apollo/client";
import type { StageHistory } from "@xts/api-contracts";
import { GET_STAGE_HISTORY } from "./stage.queries";

/** A stage's change history. Fetched fresh each time the dialog opens. */
export function useStageHistory(stageId: number | undefined) {
  const { data, loading, error } = useQuery<{ stageHistory: StageHistory[] }>(GET_STAGE_HISTORY, {
    variables: { stageId },
    skip: stageId === undefined,
    fetchPolicy: "network-only",
  });

  return { history: data?.stageHistory ?? [], loading, error };
}
