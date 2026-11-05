import { useQuery } from "@apollo/client";
import type { ReasonCodeHistory } from "@xts/api-contracts";
import { GET_REASON_CODE_HISTORY } from "./reasonCode.queries";

/** A reason code's change history. Fetched fresh each time the dialog opens. */
export function useReasonCodeHistory(reasonCodeId: number | undefined) {
  const { data, loading, error } = useQuery<{ reasonCodeHistory: ReasonCodeHistory[] }>(GET_REASON_CODE_HISTORY, {
    variables: { reasonCodeId },
    skip: reasonCodeId === undefined,
    fetchPolicy: "network-only",
  });

  return { history: data?.reasonCodeHistory ?? [], loading, error };
}
