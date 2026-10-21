import { useQuery } from "@apollo/client";
import type { RfpQuestion } from "@xts/api-contracts";
import { GET_RFP_QUESTIONS } from "./rfpQuestion.queries";

export function useRfpQuestions() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ rfpQuestionsList: RfpQuestion[] }>(GET_RFP_QUESTIONS, {
    fetchPolicy: "cache-and-network",
  });

  return {
    questions: data?.rfpQuestionsList ?? [],
    // Only "loading" while there is nothing to show yet (not during a background refresh).
    loading: loading && data === undefined,
    error,
  };
}
