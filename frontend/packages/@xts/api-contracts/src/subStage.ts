export interface SubStage {
  id: number;
  stageId: number;
  subStageName: string;
  isActive: boolean;
  createdDt: string | null;
  updatedDt: string | null;
  inUse: boolean;
}

export interface SubStageInput {
  stageId: number;
  subStageName: string;
  isActive: boolean;
  createdBy?: number;
  updatedBy?: number;
}

/** One entry of a sub stage's change history (mst_sub_stage_tracker): the
 * sub stage as it stood after a change. Newest first. */
export interface SubStageHistory {
  trackerId: number;
  subStageId: number;
  stageId: number;
  subStageName: string;
  isActive: boolean;
  createdDt: string | null;
  createdBy: number | null;
  updatedDt: string | null;
  updatedBy: number | null;
}
