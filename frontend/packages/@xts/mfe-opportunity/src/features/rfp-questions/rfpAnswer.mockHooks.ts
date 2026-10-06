import { useStore } from "@xts/design-system";
import type { RfpQuestionItem } from "@xts/design-system";

// Mock-backed today, shaped like the Apollo hooks these become once
// backend/services/opportunity implements the proposed schema — see
// backend/docs/RFP_QUESTION_WORKFLOW_CONTRACT.md.

export interface AnswerDraftInput {
  answerValue?: string;
  answerValues?: string[];
  answerDocument?: RfpQuestionItem["answerDocument"];
  supportingEvidence?: RfpQuestionItem["supportingEvidence"];
  answererNotes?: string;
}

/** Mirrors: mutation saveAnswerDraft(id: Int!, input: AnswerDraftInput!): RfpQuestionItem! */
export function useSaveAnswerDraft() {
  const { saveAnswerDraft } = useStore();
  const mutate = (id: string, draft: AnswerDraftInput) => Promise.resolve(saveAnswerDraft(id, draft));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation submitAnswerItem(id: Int!): RfpQuestionItem! — returns
 * false (mock) when blocked because a mandatory question has no answer. */
export function useSubmitAnswer() {
  const { submitAnswer } = useStore();
  const mutate = (id: string) => Promise.resolve(submitAnswer(id));
  return [mutate, { loading: false }] as const;
}

/** Mirrors: mutation reviewAnswerItem(id: Int!, decision: AnswerStatus!, comment: String, reworkReason: String): RfpQuestionItem! */
export function useReviewAnswer() {
  const { reviewAnswer } = useStore();
  const mutate = (id: string, decision: "Approved" | "Rework Required", comment?: string, reworkReason?: string) =>
    Promise.resolve(reviewAnswer(id, decision, comment, reworkReason));
  return [mutate, { loading: false }] as const;
}
