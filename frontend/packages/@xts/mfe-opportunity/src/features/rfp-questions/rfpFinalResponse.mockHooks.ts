import { useStore } from "@xts/design-system";

// Mock-backed today, shaped like the Apollo hooks these become once
// backend/services/opportunity implements the proposed schema — see
// backend/docs/RFP_QUESTION_WORKFLOW_CONTRACT.md.

/** Mirrors: query finalResponseReadiness(opportunityId: Int!): FinalResponseReadiness! */
export function useFinalResponseReadiness(opportunityId: string) {
  const { getFinalResponseReadiness } = useStore();
  const { ready, blockingIssues } = getFinalResponseReadiness(opportunityId);
  return { ready, blockingIssues, loading: false, error: undefined as Error | undefined };
}

/** Mirrors: mutation generateFinalResponse(opportunityId: Int!, input: GenerateFinalResponseInput!): FinalResponse! */
export function useGenerateFinalResponse() {
  const { generateFinalResponse } = useStore();
  const mutate = (opportunityId: string, details: { title: string; description: string; exceptions?: string }) =>
    Promise.resolve(generateFinalResponse(opportunityId, details));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation sendFinalResponseForApproval(opportunityId: Int!): FinalResponse! */
export function useSendFinalResponseForApproval() {
  const { sendFinalResponseForApproval } = useStore();
  const mutate = (opportunityId: string) => Promise.resolve(sendFinalResponseForApproval(opportunityId));
  return [mutate, { loading: false }] as const;
}
