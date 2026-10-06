import type { RfpQuestion } from "@xts/api-contracts";
import { findCategoryName } from "./rfpQuestionCategories";

// A category picked in the form has nowhere to be saved: mst_rfp_questions has
// no category_id column and the GraphQL inputs would reject one, so the choice
// is kept here for the session instead. Deliberately not written to
// localStorage — a per-browser copy of shared master data would mislead more
// than losing it on refresh does.
//
// Delete this file once RfpQuestion carries categoryId from the server. Its
// only readers are useRfpQuestions (attachCategories) and
// useRfpQuestionMutations (rememberCategory).

type Overlay = ReadonlyMap<number, number>;

let overlay: Overlay = new Map();
const listeners = new Set<() => void>();

export function rememberCategory(questionId: number, categoryId: number): void {
  overlay = new Map(overlay).set(questionId, categoryId);
  listeners.forEach((notify) => notify());
}

export function subscribeToCategories(notify: () => void): () => void {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

export function getCategoryOverlay(): Overlay {
  return overlay;
}

/** Fills in the category a question was given this session. A categoryId from
 * the server always wins, so this becomes a no-op once the backend sends one. */
export function attachCategories(questions: RfpQuestion[], categories: Overlay): RfpQuestion[] {
  if (categories.size === 0) return questions;

  return questions.map((question) => {
    if (question.categoryId != null) return question;

    const categoryId = categories.get(question.id);
    if (categoryId == null) return question;

    return { ...question, categoryId, categoryName: findCategoryName(categoryId) };
  });
}
