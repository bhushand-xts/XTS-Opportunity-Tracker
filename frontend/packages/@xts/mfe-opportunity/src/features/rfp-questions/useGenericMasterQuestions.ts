import { gql, useQuery } from "@apollo/client";
import type { RfpQuestion } from "@xts/api-contracts";

// A real (not mocked) query against the already-deployed Generic RFP Question
// Master — the same rfpQuestionsList query mfe-admin uses (see
// mfe-admin/features/rfp-question-management/rfpQuestion.queries.ts).
// Duplicated here rather than imported across the MFE boundary; it's one
// query doc, and mfe-opportunity shouldn't reach into mfe-admin's internals.
const GET_RFP_QUESTIONS_FOR_SELECTION = gql`
  query GetRfpQuestionsForSelection {
    rfpQuestionsList {
      id
      question
      description
      displayOrder
      isActive
    }
  }
`;

/** Active master questions, for the "Add from Generic Master" dialog. Category
 * isn't in this query — the master's backend has no category column yet (see
 * RFP_QUESTION_CATEGORIES in @xts/design-system) — so selection here is by
 * question text search only, same limitation the admin screen has. */
export function useGenericMasterQuestions() {
  const { data, loading, error } = useQuery<{ rfpQuestionsList: RfpQuestion[] }>(GET_RFP_QUESTIONS_FOR_SELECTION, {
    fetchPolicy: "cache-and-network",
  });

  return {
    questions: (data?.rfpQuestionsList ?? []).filter((q) => q.isActive),
    loading: loading && data === undefined,
    error,
  };
}
