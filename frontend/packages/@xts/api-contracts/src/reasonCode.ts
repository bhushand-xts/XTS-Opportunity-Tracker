// Mirrors the admin service's `ReasonCode` type
// (backend/services/admin/src/graphql/typeDefs/reason-codes.typeDefs.ts).

export interface ReasonCode {
  id: number;
  reasonName: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
}

export interface ReasonCodeInput {
  reasonName: string;
  description?: string | null;
  displayOrder?: number | null;
  isActive: boolean;
  /** The signed-in user, recorded as created_by / updated_by. */
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of a reason code's change history (tbl_reason_codes_tracker):
 * the reason code as it stood after a change. Newest first. */
export interface ReasonCodeHistory {
  trackerId: number;
  reasonCodeId: number;
  reasonName: string;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}
