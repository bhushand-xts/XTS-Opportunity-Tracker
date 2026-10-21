import { useQuery } from "@apollo/client";
import type { SubStageHistory } from "@xts/api-contracts";
import { GET_SUB_STAGE_HISTORY } from "./subStage.queries";

/** A sub stage's change history. Fetched fresh each time the dialog opens. */
export function useSubStageHistory(subStageId: number | undefined) {
  const { data, loading, error } = useQuery<{ subStageHistory: SubStageHistory[] }>(GET_SUB_STAGE_HISTORY, {
    variables: { subStageId },
    skip: subStageId === undefined,
    fetchPolicy: "network-only",
  });

  return { history: data?.subStageHistory ?? [], loading, error };
}
