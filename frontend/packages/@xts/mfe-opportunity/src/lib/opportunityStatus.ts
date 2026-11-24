import type { OpportunitySummary } from '@xts/api-contracts';
import { STATE_LABELS } from './workflow';

export const STAGE_LABELS: Record<number, string> = {
  1: 'Identified',
  2: 'Qualifying (Go/No-Go)',
  3: 'Solution/Scoping Estimation (Engineering)',
  4: 'Estimate Review & Approval',
  5: 'Proposal / Bid Submission',
  6: 'Negotiation',
  7: 'Closed — Won',
  8: 'Closed — Lost',
  9: 'No-Bid / Declined',
  10: 'On Hold',
};

export const OPPORTUNITY_OUTCOME_LABEL = 'Outcome (Won / Lost)';
export const PIPELINE_STAGE_IDS = [1, 2, 3, 4, 5, 6, 7, 9];
export function approvalStagesForRole(roleName?: string | null): number[] {
  const role = (roleName ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (['sh', 'sales_head'].includes(role)) return [1, 2, 5, 6, 10];
  if (['ceo', 'approver_gate2', 'ceo/gate_2_approver', 'approver'].includes(role)) return [2, 4];
  if (['sales_executive', 'sales_representative'].includes(role)) return [1];
  if (role === 'estimation_team') return [3];
  return [];
}

export function workStagesForRole(roleName?: string | null): number[] {
  return (roleName ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_') === 'estimation_team' ? [3] : [];
}

export function isOpportunityOutcome(stageId: number | null | undefined) {
  return [7, 8, 10].includes(stageId ?? 0);
}

/** Display persisted master IDs without changing the legacy workflow state. */
export function opportunityStatus(opportunity: Pick<OpportunitySummary, 'state' | 'stageId' | 'subStageId' | 'stageName' | 'subStageName'>) {
  if (opportunity.stageId == null) return { stage: STATE_LABELS[opportunity.state], substage: null };
  return {
    stage: opportunity.stageName ?? STAGE_LABELS[opportunity.stageId] ?? 'Status unavailable',
    substage: opportunity.subStageName ?? null,
  };
}
