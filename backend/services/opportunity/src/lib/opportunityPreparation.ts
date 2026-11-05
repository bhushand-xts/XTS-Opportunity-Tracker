import { conflict } from '../../../../shared/errors/graphqlErrors';

type PreparationWorkflow = { stageId: number | null; subStageId: number | null };

export function estimationWritable(opportunity: PreparationWorkflow): boolean {
  return opportunity.stageId === 3 && opportunity.subStageId === 7 || opportunity.stageId === 4 && [8, 9].includes(opportunity.subStageId ?? 0);
}
export function assertEstimationWritable(opportunity: PreparationWorkflow): void {
  if (!estimationWritable(opportunity)) throw conflict('Estimations are read-only after CEO approval or outside the estimation and review stages.');
}

export function estimationRatesWritable(opportunity: PreparationWorkflow): boolean {
  return opportunity.stageId === 4 && [8, 9].includes(opportunity.subStageId ?? 0);
}
export function assertEstimationRatesWritable(opportunity: PreparationWorkflow): void {
  if (!estimationRatesWritable(opportunity)) throw conflict('Estimation rates are read-only outside CEO estimation review.');
}

export function preparationModulesLocked(opportunity: PreparationWorkflow): boolean {
  // Stage 9 is every No-Bid / Declined outcome: Sales reject, CEO No-Go,
  // estimate rejected by CEO and closed by Sales.
  return [5, 6, 7, 8, 9, 10].includes(opportunity.stageId ?? 0) || opportunity.stageId === 4 && opportunity.subStageId === 5;
}

export function assertPreparationWritable(opportunity: PreparationWorkflow): void {
  if (preparationModulesLocked(opportunity)) {
    throw conflict('RFP Q&A and Scope & Assessment are read-only after CEO estimation approval or once the opportunity is declined or closed.');
  }
}
