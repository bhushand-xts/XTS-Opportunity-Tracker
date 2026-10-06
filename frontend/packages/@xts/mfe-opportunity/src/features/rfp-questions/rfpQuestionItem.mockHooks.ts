import { useStore } from "@xts/design-system";
import type { RfpQuestionItem } from "@xts/design-system";

// Mock-backed today, shaped exactly like the Apollo useQuery/useMutation hooks
// these become once backend/services/opportunity implements the proposed
// schema — see backend/docs/RFP_QUESTION_WORKFLOW_CONTRACT.md. Swap each
// hook's body for a real Apollo call later; consuming components don't change.

/** Mirrors: query rfpQuestionItems(opportunityId: Int!): [RfpQuestionItem!]! */
export function useRfpQuestionItems(opportunityId: string) {
  const { questions } = useStore();
  return {
    questions: questions.filter((q) => q.opportunityId === opportunityId),
    loading: false,
    error: undefined as Error | undefined,
  };
}

/** Mirrors: mutation createRfpQuestionItem(input: CreateRfpQuestionItemInput!): RfpQuestionItem! */
export function useAddRfpQuestionItem() {
  const { addQuestion } = useStore();
  const mutate = (entry: Omit<RfpQuestionItem, "id">) => Promise.resolve(addQuestion(entry));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation addRfpQuestionItemsFromMaster(opportunityId: Int!, questionIds: [Int!]!): [RfpQuestionItem!]! */
export function useAddRfpQuestionItemsBulk() {
  const { addQuestionsBulk } = useStore();
  const mutate = (entries: Omit<RfpQuestionItem, "id">[]) => Promise.resolve(addQuestionsBulk(entries));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation updateRfpQuestionItem(id: Int!, input: UpdateRfpQuestionItemInput!): RfpQuestionItem! */
export function useUpdateRfpQuestionItem() {
  const { updateQuestion } = useStore();
  const mutate = (id: string, patch: Partial<RfpQuestionItem>) => Promise.resolve(updateQuestion(id, patch));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation bulkUpdateRfpQuestionItems(ids: [Int!]!, input: UpdateRfpQuestionItemInput!): [RfpQuestionItem!]! */
export function useBulkUpdateRfpQuestionItems() {
  const { bulkUpdateQuestions } = useStore();
  const mutate = (ids: string[], patch: Partial<RfpQuestionItem>) => Promise.resolve(bulkUpdateQuestions(ids, patch));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation withdrawRfpQuestionItem(id: Int!): RfpQuestionItem! */
export function useWithdrawRfpQuestionItem() {
  const { withdrawQuestion } = useStore();
  const mutate = (id: string) => Promise.resolve(withdrawQuestion(id));
  return [mutate, { loading: false }] as const;
}

export interface AssignmentInput {
  assigneeId?: string;
  reviewerId?: string;
  dueDate?: string;
  notes?: string;
}

/** Mirrors: mutation assignRfpQuestionItem(id: Int!, input: AssignmentInput!): RfpQuestionItem! */
export function useAssignQuestion() {
  const { assignQuestion } = useStore();
  const mutate = (id: string, assignment: AssignmentInput) => Promise.resolve(assignQuestion(id, assignment));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation bulkAssignRfpQuestionItems(ids: [Int!]!, input: AssignmentInput!): [RfpQuestionItem!]! */
export function useBulkAssignQuestions() {
  const { bulkAssignQuestions } = useStore();
  const mutate = (ids: string[], assignment: AssignmentInput) => Promise.resolve(bulkAssignQuestions(ids, assignment));
  return [mutate, { loading: false }] as const;
}
