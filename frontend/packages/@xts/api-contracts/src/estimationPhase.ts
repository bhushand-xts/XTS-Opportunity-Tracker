// Mirrors the admin service's `EstimationPhase` type
// (backend/services/admin/src/graphql/typeDefs/phases.typeDefs.ts).

export interface EstimationPhase {
  id: number;
  phaseName: string;
  phaseCode: string | null;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
}

export interface EstimationPhaseInput {
  phaseName: string;
  phaseCode?: string | null;
  description?: string | null;
  displayOrder?: number | null;
  isActive: boolean;
  /** The signed-in user, recorded as created_by / updated_by. */
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of an estimation phase's change history
 * (tbl_estimation_phases_tracker): the phase as it stood after a change.
 * Newest first. */
export interface EstimationPhaseHistory {
  trackerId: number;
  phaseId: number;
  phaseName: string;
  phaseCode: string | null;
  description: string | null;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}
