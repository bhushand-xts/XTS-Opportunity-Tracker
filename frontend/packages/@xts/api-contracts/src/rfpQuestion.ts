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
