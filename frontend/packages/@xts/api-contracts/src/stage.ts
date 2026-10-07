export interface Stage {
  id: number;
  stageName: string;
  gate: string | null;
  winPercentage: number;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
  inUse: boolean;
}

export interface StageInput {
  stageName: string;
  gate?: string | null;
  winPercentage: number;
  displayOrder: number;
  isActive: boolean;
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of a stage's change history (mst_stage_tracker): the stage as
 * it stood after a change. Newest first. */
export interface StageHistory {
  trackerId: number;
  stageId: number;
  stageName: string;
  gate: string | null;
  winPercentage: number;
  displayOrder: number | null;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}
