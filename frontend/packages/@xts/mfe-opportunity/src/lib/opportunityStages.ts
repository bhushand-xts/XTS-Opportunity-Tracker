import type { OpportunitySummary } from '@xts/api-contracts';
import { STATE_LABELS } from './workflow';

export const STAGE_NAMES: Record<number, string> = {
  1: 'Identified', 2: 'Qualifying (Go/No-Go)', 3: 'Solution/Scoping Estimation (Engineering)',
  4: 'Estimate Review & Approval', 5: 'Proposal / Bid Submitted', 6: 'Negotiation',
  7: 'Closed — Won', 8: 'Closed — Lost', 9: 'No-Bid / Declined', 10: 'On Hold',
};
export const SUBSTAGE_NAMES: Record<number, string> = {
  1: 'Pending Review', 2: 'Changes Requested', 3: 'On Hold', 4: 'Pending Go/No-Go',
  5: 'Changes Requested', 6: 'On Hold', 7: 'In Progress', 8: 'Pending Approval',
  9: 'On Hold', 10: 'Proposal In Preparation', 11: 'Bid Submitted', 12: 'Under Negotiation',
  13: 'Won', 14: 'Lost', 15: 'Rejected by Sales Head', 16: 'No-Go by CEO',
  17: 'Estimate Rejected by CEO', 18: 'Closed by Sales',
};
export function stageStatus(o: Pick<OpportunitySummary, 'state' | 'stageId' | 'subStageId'>) {
  if (o.stageId == null) return STATE_LABELS[o.state];
  return [STAGE_NAMES[o.stageId] ?? `Stage ${o.stageId}`, o.subStageId == null ? null : SUBSTAGE_NAMES[o.subStageId] ?? `Substage ${o.subStageId}`].filter(Boolean).join(' · ');
}
