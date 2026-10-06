// Mirrors the admin service's `RfpQuestion` type
// (backend/services/admin/src/graphql/typeDefs/rfp-questions.typeDefs.ts).

export interface RfpQuestion {
  id: number;
  question: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
  /** Not stored yet: mst_rfp_questions has no category column, so the server
   * never sends these. Declared here as the shape to fill in once it does. */
  categoryId?: number | null;
  categoryName?: string | null;
}

/** A category a generic RFP question belongs to. Fixed list for now — see
 * mfe-admin's rfpQuestionCategories.ts. */
export interface RfpQuestionCategory {
  id: number;
  categoryName: string;
  displayOrder: number | null;
}

export interface RfpQuestionInput {
  question: string;
  description?: string | null;
  displayOrder?: number | null;
  isActive: boolean;
  /** The signed-in user, recorded as created_by / updated_by. */
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of an RFP question's change history (mst_rfp_questions_tracker):
 * the question as it stood after a change. Newest first. */
export interface RfpQuestionHistory {
  trackerId: number;
  questionId: number;
  question: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}
