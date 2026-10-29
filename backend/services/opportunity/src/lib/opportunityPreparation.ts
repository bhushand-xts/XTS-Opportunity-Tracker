import { conflict } from '../../../../shared/errors/graphqlErrors';

type PreparationWorkflow = { stageId: number | null; subStageId: number | null };

export function preparationModulesLocked(opportunity: PreparationWorkflow): boolean {
  // Stage 9 is every No-Bid / Declined outcome: Sales reject, CEO No-Go,
  // estimate rejected by CEO and closed by Sales.
  return [5, 6, 7, 8, 9, 10].includes(opportunity.stageId ?? 0);
}

export function assertPreparationWritable(opportunity: PreparationWorkflow): void {
  if (preparationModulesLocked(opportunity)) {
    throw conflict('RFP Q&A and Scope & Assessment are read-only after CEO estimation approval or once the opportunity is declined or closed.');
  }
}
