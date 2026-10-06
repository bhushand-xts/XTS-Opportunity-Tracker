import { RFP_QUESTION_CATEGORIES } from "@xts/design-system";
import type { RfpQuestionCategory } from "@xts/api-contracts";

// The category list is fixed and defined here because mst_rfp_questions has no
// category column, so there is no query to ask for it. Once the backend carries
// categories, replace the body of this file with a useQuery — the hook already
// returns the same shape as useRfpQuestions, so no caller changes.
//
// The list itself lives in @xts/design-system (RFP_QUESTION_CATEGORIES) so it's
// shared with RFP-specific questions in mfe-opportunity — this file just shapes
// it into the {id, categoryName, displayOrder} form this page's table expects.
const CATEGORIES: RfpQuestionCategory[] = RFP_QUESTION_CATEGORIES.map((categoryName, index) => ({
  id: index + 1,
  categoryName,
  displayOrder: index + 1,
}));

export function useRfpQuestionCategories(): {
  categories: RfpQuestionCategory[];
  loading: boolean;
  error: Error | undefined;
} {
  return { categories: CATEGORIES, loading: false, error: undefined };
}

export function findCategoryName(categoryId: number | null | undefined): string | null {
  if (categoryId == null) return null;
  return CATEGORIES.find((category) => category.id === categoryId)?.categoryName ?? null;
}
