import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@apollo/client";
import type { RfpQuestion } from "@xts/api-contracts";
import { GET_RFP_QUESTIONS } from "./rfpQuestion.queries";
import { attachCategories, getCategoryOverlay, subscribeToCategories } from "./rfpQuestionCategoryStore";

export function useRfpQuestions() {
  // cache-and-network: show what is cached straight away, then refresh from the
  // server — so a change made on another screen is never missing.
  const { data, loading, error } = useQuery<{ rfpQuestionsList: RfpQuestion[] }>(GET_RFP_QUESTIONS, {
    fetchPolicy: "cache-and-network",
  });

  // Categories aren't stored server-side yet; this folds in the ones chosen
  // during this session. Drop both lines once the server sends categoryId.
  const overlay = useSyncExternalStore(subscribeToCategories, getCategoryOverlay);
  const questions = useMemo(() => attachCategories(data?.rfpQuestionsList ?? [], overlay), [data, overlay]);

  return {
    questions,
    // Only "loading" while there is nothing to show yet (not during a background refresh).
    loading: loading && data === undefined,
    error,
  };
}
