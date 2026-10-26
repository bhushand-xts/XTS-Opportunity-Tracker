import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import type { DirectoryUser, OpportunityStageHistory } from '@xts/api-contracts';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityProgress } from './OpportunityProgress';

afterEach(cleanup);

const creator: DirectoryUser = { id: '1', name: 'Original Creator', email: 'creator@example.test', roles: [], active: true };
const sales = { ...creator, id: '2', name: 'Sales Head' };
const ceo = { ...creator, id: '3', name: 'CEO Reviewer' };
const estimator = { ...creator, id: '4', name: 'Estimation Team' };
const createdAt = '2026-10-20T04:00:00.000Z';
const salesAt = '2026-10-20T04:05:00.000Z';
const goAt = '2026-10-20T04:10:00.000Z';
const submittedAt = '2026-10-20T04:15:00.000Z';
const reviewedAt = '2026-10-20T04:20:00.000Z';
const bidAt = '2026-10-20T04:25:00.000Z';
const negotiationAt = '2026-10-20T04:30:00.000Z';
const outcomeAt = '2026-10-20T04:35:00.000Z';
function event(id: number, stageId: number, subStageId: number, reachedAt: string, actor: DirectoryUser): OpportunityStageHistory {
  return { id: String(id), stageId, subStageId, reachedAt, actor };
}
function stage(name: string) {
  return screen.getByRole('heading', { name }).closest('li')!;
}
function expectResult(name: string, label: string, at: string, actor: DirectoryUser) {
  const result = within(stage(name)).getByText(label).parentElement!;
  expect(result.querySelector('time')).toHaveAttribute('datetime', at);
  expect(result).toHaveTextContent('By ' + actor.name);
}
const approvedHistory = [
  event(1, 1, 1, createdAt, creator),
  event(2, 2, 4, salesAt, sales),
  event(3, 3, 7, goAt, ceo),
  event(4, 4, 8, submittedAt, estimator),
  event(5, 5, 10, reviewedAt, ceo),
];

it('keeps the existing stage order and empty future positions after proposal submission', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 5, subStageId: 11, stageHistory: [] })} />);
  const timeline = screen.getByRole('list', { name: 'Opportunity progress history' });
  expect(Array.from(timeline.children).map(item => item.querySelector('h3')?.textContent)).toEqual([
    'Outcome (Won / Lost)', 'Negotiation', 'Proposal / Bid Submission', 'Estimate Review & Approval',
    'Solution/Scoping Estimation (Engineering)', 'Qualifying (Go/No-Go)', 'Identified',
  ]);
  const outcome = stage('Outcome (Won / Lost)');
  expect(outcome).toHaveClass('upcoming');
  expect(outcome.querySelector('time')).toBeNull();
  expect(stage('Proposal / Bid Submission')).toHaveAttribute('aria-current', 'step');
  expect(within(stage('Proposal / Bid Submission')).getByText('Bid Submitted')).toBeVisible();
});

it('shows main results with the correct dates and actors, without intermediate substage history', () => {
  const history = [
    event(1, 1, 1, createdAt, creator),
    event(2, 1, 2, '2026-10-20T04:01:00.000Z', sales),
    event(3, 1, 3, '2026-10-20T04:02:00.000Z', sales),
    event(4, 2, 4, salesAt, sales),
    event(5, 2, 6, '2026-10-20T04:07:00.000Z', ceo),
    event(6, 3, 7, goAt, ceo),
    event(7, 4, 8, submittedAt, estimator),
    { ...event(8, 4, 9, '2026-10-20T04:16:00.000Z', ceo), comment: 'Waiting for details.' },
    event(9, 5, 10, reviewedAt, ceo),
    event(10, 5, 11, bidAt, sales),
    event(11, 6, 12, negotiationAt, sales),
    event(12, 7, 13, outcomeAt, sales),
  ];
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 7, subStageId: 13, stageHistory: history.reverse() })} />);
  expectResult('Identified', 'Opportunity created', createdAt, creator);
  expectResult('Identified', 'Opportunity approved', salesAt, sales);
  expectResult('Qualifying (Go/No-Go)', 'Go approved', goAt, ceo);
  expectResult('Solution/Scoping Estimation (Engineering)', 'Estimation submitted', submittedAt, estimator);
  expectResult('Estimate Review & Approval', 'Estimation approved', reviewedAt, ceo);
  expectResult('Proposal / Bid Submission', 'Bid Submitted', bidAt, sales);
  expectResult('Negotiation', 'Negotiation completed', outcomeAt, sales);
  expectResult('Outcome (Won / Lost)', 'Won', outcomeAt, sales);
  expect(stage('Outcome (Won / Lost)')).toHaveAttribute('aria-current', 'step');
  expect(screen.getByRole('list', { name: 'Opportunity progress history' }).querySelectorAll('time')).toHaveLength(8);
  for (const label of ['Pending Review', 'Changes Requested', 'On Hold', 'Pending Go/No-Go', 'In Progress', 'Pending Approval', 'Proposal In Preparation', 'Under Negotiation', 'Waiting for details.']) {
    expect(screen.queryByText(label)).not.toBeInTheDocument();
  }
  expect(screen.queryByRole('list', { name: 'Identified history' })).not.toBeInTheDocument();
});

it('shows only the current substage for a held CEO review and preserves the original sales approval', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 2, subStageId: 6, stageHistory: [
    event(1, 1, 1, createdAt, creator),
    event(2, 2, 4, salesAt, sales),
    event(3, 2, 5, '2026-10-20T04:06:00.000Z', ceo),
    event(4, 2, 4, '2026-10-20T04:07:00.000Z', sales),
    event(5, 2, 6, '2026-10-20T04:08:00.000Z', ceo),
  ] })} />);
  const qualifying = stage('Qualifying (Go/No-Go)');
  expect(within(qualifying).getByText('On Hold')).toBeVisible();
  expect(qualifying.querySelector('time')).toBeNull();
  expect(within(qualifying).queryByText('Pending Go/No-Go')).not.toBeInTheDocument();
  expect(within(qualifying).queryByText('Changes Requested')).not.toBeInTheDocument();
  expectResult('Identified', 'Opportunity approved', salesAt, sales);
});

it('keeps creation once and only the latest current substage after repeated sales reviews', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 1, subStageId: 1, stageHistory: [
    event(1, 1, 1, createdAt, creator),
    event(2, 1, 2, '2026-10-20T04:01:00.000Z', sales),
    event(3, 1, 1, '2026-10-20T04:02:00.000Z', creator),
  ] })} />);
  const identified = stage('Identified');
  expect(within(identified).getAllByText('Pending Review')).toHaveLength(1);
  expect(within(identified).getAllByText('Opportunity created')).toHaveLength(1);
  expect(within(identified).queryByText('Changes Requested')).not.toBeInTheDocument();
  expect(identified.querySelectorAll('time')).toHaveLength(1);
  expectResult('Identified', 'Opportunity created', createdAt, creator);
});

it('shows Bid Submitted once with its own timestamp while it is the current stage', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 5, subStageId: 11, stageHistory: [
    ...approvedHistory, event(6, 5, 11, bidAt, sales),
  ] })} />);
  expect(within(stage('Proposal / Bid Submission')).getAllByText('Bid Submitted')).toHaveLength(1);
  expect(within(stage('Proposal / Bid Submission')).queryByText('Proposal In Preparation')).not.toBeInTheDocument();
  expectResult('Proposal / Bid Submission', 'Bid Submitted', bidAt, sales);
});

it('keeps proposal submission time when a held follow-up is resumed and negotiation starts', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 6, subStageId: 12, stageHistory: [
    ...approvedHistory,
    event(6, 5, 11, bidAt, sales),
    event(7, 10, 20, '2026-10-20T04:26:00.000Z', sales),
    event(8, 5, 11, '2026-10-20T04:27:00.000Z', sales),
    event(9, 6, 12, negotiationAt, sales),
  ] })} />);
  expectResult('Proposal / Bid Submission', 'Bid Submitted', bidAt, sales);
  const negotiation = stage('Negotiation');
  expect(within(negotiation).getByText('Under Negotiation')).toBeVisible();
  expect(negotiation.querySelector('time')).toBeNull();
  const outcome = stage('Outcome (Won / Lost)');
  expect(outcome).toHaveClass('upcoming');
  expect(outcome.querySelector('time')).toBeNull();
  expect(screen.queryByText('On Hold')).not.toBeInTheDocument();
});

it.each([[7, 13, 'Won'], [8, 14, 'Lost']] as const)('shows the actual %s outcome without inventing negotiation completion', (stageId, subStageId, label) => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId, subStageId, stageHistory: [
    ...approvedHistory,
    event(6, 5, 11, bidAt, sales),
    event(7, stageId, subStageId, outcomeAt, sales),
  ] })} />);
  expectResult('Proposal / Bid Submission', 'Bid Submitted', bidAt, sales);
  expectResult('Outcome (Won / Lost)', label, outcomeAt, sales);
  expect(stage('Negotiation')).toHaveClass('upcoming');
  expect(stage('Negotiation').querySelector('time')).toBeNull();
  expect(within(stage('Outcome (Won / Lost)')).getAllByText(label)).toHaveLength(1);
});

it('shows the final negotiation result once after historical hold and resume events', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 8, subStageId: 14, stageHistory: [
    ...approvedHistory,
    event(6, 5, 11, bidAt, sales),
    event(7, 6, 12, negotiationAt, sales),
    event(8, 10, 19, '2026-10-20T04:31:00.000Z', sales),
    event(9, 6, 12, '2026-10-20T04:32:00.000Z', sales),
    event(10, 8, 14, outcomeAt, sales),
  ] })} />);
  expectResult('Negotiation', 'Negotiation completed', outcomeAt, sales);
  expectResult('Outcome (Won / Lost)', 'Lost', outcomeAt, sales);
  expect(screen.queryByText('On Hold')).not.toBeInTheDocument();
  expect(screen.queryByText('Under Negotiation')).not.toBeInTheDocument();
});

it('shows the recorded decline with its actor while leaving unvisited stages empty', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 9, subStageId: 15, stageHistory: [
    event(1, 1, 1, createdAt, creator), event(2, 9, 15, salesAt, sales),
  ] })} />);
  expectResult('No-Bid / Declined', 'Rejected by Sales Head', salesAt, sales);
  expect(stage('No-Bid / Declined')).toHaveAttribute('aria-current', 'step');
  expect(stage('Qualifying (Go/No-Go)')).toHaveClass('upcoming');
  expect(stage('Qualifying (Go/No-Go)').querySelector('time')).toBeNull();
  expect(within(stage('Identified')).queryByText('Opportunity approved')).not.toBeInTheDocument();
});

it('shows the current substage without inventing a timestamp when history is missing', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 2, subStageId: 4, stageHistory: [] })} />);
  const current = stage('Qualifying (Go/No-Go)');
  expect(within(current).getByText('Pending Go/No-Go')).toBeVisible();
  expect(current.querySelector('time')).toBeNull();
  expect(within(current).queryByText('Date unavailable')).not.toBeInTheDocument();
  expectResult('Identified', 'Opportunity created', createdAt, creator);
});

it('reports unavailable outcome metadata without inventing dates or users', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: 8, subStageId: 14, stageHistory: [] })} />);
  const outcome = stage('Outcome (Won / Lost)');
  expect(outcome).toHaveTextContent('Lost');
  expect(outcome).toHaveTextContent('Date unavailable');
  expect(outcome).toHaveTextContent('User unavailable');
  expect(outcome.querySelector('time')).toBeNull();
});

it('retains creation details for opportunities without persisted stage IDs', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: createdAt, createdBy: creator, stageId: null })} />);
  const created = screen.getByText('Opportunity created').parentElement!;
  expect(created.querySelector('time')).toHaveAttribute('datetime', createdAt);
  expect(created).toHaveTextContent('By Original Creator');
});
