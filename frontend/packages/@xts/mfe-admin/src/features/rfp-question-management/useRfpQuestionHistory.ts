import { useQuery } from "@apollo/client";
import type { RfpQuestionHistory } from "@xts/api-contracts";
import { GET_RFP_QUESTION_HISTORY } from "./rfpQuestion.queries";

/** An RFP question's change history. Fetched fresh each time the dialog opens. */
export function useRfpQuestionHistory(questionId: number | undefined) {
  const { data, loading, error } = useQuery<{ rfpQuestionHistory: RfpQuestionHistory[] }>(GET_RFP_QUESTION_HISTORY, {
    variables: { questionId },
    skip: questionId === undefined,
    fetchPolicy: "network-only",
  });

  return { history: data?.rfpQuestionHistory ?? [], loading, error };
}
