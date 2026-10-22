import type { OpportunitySummary } from '@xts/api-contracts';
import { STATE_LABELS } from './workflow';

export const STAGE_LABELS: Record<number, string> = {
  1: 'Identified',
  2: 'Qualifying (Go/No-Go)',
  3: 'Solution/Scoping Estimation (Engineering)',
  4: 'Estimate Review & Approval',
  5: 'Proposal / Bid Submitted',
  6: 'Negotiation',
  7: 'Closed — Won',
  8: 'Closed — Lost',
  9: 'No-Bid / Declined',
  10: 'On Hold',
};

const SUBSTAGES: Record<number, { stageId: number; label: string }> = {
  1: { stageId: 1, label: 'Pending Review' },
  2: { stageId: 1, label: 'Changes Requested' },
  3: { stageId: 1, label: 'On Hold' },
  4: { stageId: 2, label: 'Pending Go/No-Go' },
  5: { stageId: 2, label: 'Changes Requested' },
  6: { stageId: 2, label: 'On Hold' },
  7: { stageId: 3, label: 'In Progress' },
  8: { stageId: 4, label: 'Pending Approval' },
  9: { stageId: 4, label: 'On Hold' },
  10: { stageId: 5, label: 'Proposal In Preparation' },
  11: { stageId: 5, label: 'Bid Submitted' },
  12: { stageId: 6, label: 'Under Negotiation' },
  13: { stageId: 7, label: 'Won' },
  14: { stageId: 8, label: 'Lost' },
  15: { stageId: 9, label: 'Rejected by Sales Head' },
  16: { stageId: 9, label: 'No-Go by CEO' },
  17: { stageId: 9, label: 'Estimate Rejected by CEO' },
  18: { stageId: 9, label: 'Closed by Sales' },
};

/** Display persisted master IDs without changing the legacy workflow state. */
export function opportunityStatus(opportunity: Pick<OpportunitySummary, 'state' | 'stageId' | 'subStageId'>) {
  if (opportunity.stageId == null) return { stage: STATE_LABELS[opportunity.state], substage: null };
  const substage = opportunity.subStageId == null ? undefined : SUBSTAGES[opportunity.subStageId];
  return {
    stage: STAGE_LABELS[opportunity.stageId] ?? 'Status unavailable',
    substage: substage?.stageId === opportunity.stageId ? substage.label : null,
  };
}
