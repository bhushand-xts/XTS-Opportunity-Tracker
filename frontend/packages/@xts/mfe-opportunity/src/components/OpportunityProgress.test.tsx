import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityProgress } from './OpportunityProgress';

afterEach(cleanup);

it('shows Negotiation followed by the combined outcome position after proposal submission', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId: 5, subStageId: 11, stageHistory: [] })} />);
  const timeline = screen.getByRole('list', { name: 'Opportunity progress history' });
  expect(Array.from(timeline.children).slice(0, 3).map(item => item.querySelector('h3')?.textContent)).toEqual([
    'Outcome (Won / Lost / Hold)', 'Negotiation', 'Proposal / Bid Submitted',
  ]);
  const outcome = screen.getByRole('heading', { name: 'Outcome (Won / Lost / Hold)' }).closest('li')!;
  expect(outcome).toHaveClass('upcoming');
  expect(outcome.querySelector('time')).toBeNull();
  for (const label of ['Won', 'Lost', 'On Hold']) expect(within(outcome).queryByText(label)).not.toBeInTheDocument();
});

it('shows recorded progress newest first with dates and no comments', () => {
  const createdDt = '2026-10-19T04:00:00.000Z';
  const pending = '2026-10-19T04:01:00.000Z', held = '2026-10-19T05:00:00.000Z', qualifying = '2026-10-20T06:00:00.000Z';
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt, stageId: 2, subStageId: 4, stageHistory: [
    { id: '3', stageId: 2, subStageId: 4, reachedAt: qualifying },
    { id: '1', stageId: 1, subStageId: 1, reachedAt: pending },
    { id: '2', stageId: 1, subStageId: 3, reachedAt: held, comment: 'Waiting for client approval.' },
  ] })} />);
  const timeline = screen.getByRole('list', { name: 'Opportunity progress history' });
  expect(Array.from(timeline.querySelectorAll('time')).map(time => time.dateTime)).toEqual([qualifying, qualifying, held, pending, createdDt]);
  expect(Array.from(timeline.children).map(item => item.querySelector('h3')?.textContent)).toEqual([
    'Outcome (Won / Lost / Hold)', 'Negotiation', 'Proposal / Bid Submitted', 'Estimate Review & Approval', 'Solution/Scoping Estimation (Engineering)', 'Qualifying (Go/No-Go)', 'Identified',
  ]);
  const future = screen.getByRole('heading', { name: 'Negotiation' }).closest('li')!;
  expect(future).toHaveClass('upcoming');
  expect(future.querySelector('time')).toBeNull();
  const identified = within(screen.getByRole('heading', { name: 'Identified' }).closest('li')!);
  expect(identified.getByText('Pending Review')).toBeVisible();
  expect(identified.getByText('On Hold')).toBeVisible();
  expect(identified.getByText('Opportunity created')).toBeVisible();
  const approval = screen.getByRole('heading', { name: 'Identified' }).closest('li')!.querySelector('.opp-stage-completion')!;
  expect(approval).toHaveTextContent('Opportunity approved');
  expect(approval.querySelector('time')).toHaveAttribute('datetime', qualifying);
  expect(screen.queryByText('Waiting for client approval.')).not.toBeInTheDocument();
  expect(screen.queryByText('Created')).not.toBeInTheDocument();
  expect(timeline.querySelector('[aria-current="step"]')).toHaveTextContent('Qualifying (Go/No-Go)');
  expect(timeline.querySelector(`time[datetime="${createdDt}"]`)?.textContent).toContain('09:30 am IST');
});

it('uses Sales and CEO approval transitions to date the stages they complete and shows each actor', () => {
  const creator = { id: '11', name: 'Original Creator', email: 'creator@example.test', roles: [], active: true };
  const sales = { ...creator, id: '12', name: 'Sales Reviewer' };
  const ceo = { ...creator, id: '13', name: 'CEO Reviewer' };
  const createdDt = '2026-10-19T04:00:00.000Z';
  const salesAt = '2026-10-19T07:25:00.000Z';
  const ceoAt = '2026-10-20T08:00:00.000Z';
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt, createdBy: creator, stageId: 3, subStageId: 7, stageHistory: [
    { id: '1', stageId: 1, subStageId: 1, reachedAt: createdDt, actor: creator },
    { id: '2', stageId: 1, subStageId: 2, reachedAt: '2026-10-19T05:00:00.000Z', actor: sales },
    { id: '3', stageId: 2, subStageId: 4, reachedAt: salesAt, actor: sales },
    { id: '4', stageId: 2, subStageId: 6, reachedAt: '2026-10-20T07:00:00.000Z', actor: ceo },
    { id: '5', stageId: 3, subStageId: 7, reachedAt: ceoAt, actor: ceo },
  ] })} />);
  const identified = screen.getByRole('heading', { name: 'Identified' }).closest('li')!;
  const qualifying = screen.getByRole('heading', { name: 'Qualifying (Go/No-Go)' }).closest('li')!;
  expect(identified.querySelector('.opp-stage-completion')).toHaveTextContent('Opportunity approved');
  expect(identified.querySelector('.opp-stage-completion')).toHaveTextContent('By Sales Reviewer');
  expect(identified.querySelector('.opp-stage-completion time')).toHaveAttribute('datetime', salesAt);
  expect(qualifying.querySelector('.opp-stage-completion')).toHaveTextContent('Go approved');
  expect(qualifying.querySelector('.opp-stage-completion')).toHaveTextContent('By CEO Reviewer');
  expect(qualifying.querySelector('.opp-stage-completion time')).toHaveAttribute('datetime', ceoAt);
  const pending = within(qualifying).getByText('Pending Go/No-Go').closest('li')!;
  expect(pending).toHaveTextContent('Opportunity approved');
  expect(pending).toHaveTextContent('By Sales Reviewer');
  expect(pending.querySelector('time')).toHaveAttribute('datetime', salesAt);
  const created = identified.querySelector('.opp-progress-created')!;
  expect(created).toHaveTextContent('Opportunity created');
  expect(created).toHaveTextContent('By Original Creator');
  expect(created.querySelector('time')).toHaveAttribute('datetime', createdDt);
  expect(Array.from(within(identified).getByRole('list').children).map(item => item.querySelector('strong')?.textContent)).toEqual(['Changes Requested', 'Pending Review', 'Opportunity created']);
  expect(within(identified).getByText('Changes Requested').closest('li')).toHaveTextContent('By Sales Reviewer');
});

it('keeps the Sales approval time when a later resubmission returns to Pending Go/No-Go', () => {
  const salesAt = '2026-10-19T05:00:00.000Z';
  const resumedAt = '2026-10-20T05:00:00.000Z';
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId: 2, subStageId: 4, stageHistory: [
    { id: '1', stageId: 1, subStageId: 1, reachedAt: '2026-10-19T04:00:00.000Z' },
    { id: '2', stageId: 2, subStageId: 4, reachedAt: salesAt },
    { id: '3', stageId: 2, subStageId: 5, reachedAt: '2026-10-20T04:00:00.000Z' },
    { id: '4', stageId: 2, subStageId: 4, reachedAt: resumedAt },
  ] })} />);
  const identified = screen.getByRole('heading', { name: 'Identified' }).closest('li')!;
  expect(identified.querySelector('.opp-stage-completion time')).toHaveAttribute('datetime', salesAt);
  const qualifying = screen.getByRole('heading', { name: 'Qualifying (Go/No-Go)' }).closest('li')!;
  expect(qualifying.querySelector('.opp-stage-completion')).toBeNull();
  expect(within(qualifying).getAllByText('Pending Go/No-Go')).toHaveLength(2);
  expect(qualifying.querySelector('.active')).not.toHaveTextContent('Opportunity approved');
});

it('retains repeated visits to the same substage and identifies only the latest one as current', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId: 1, subStageId: 1, stageHistory: [
    { id: '1', stageId: 1, subStageId: 1, reachedAt: '2026-10-19T04:00:00.000Z' },
    { id: '2', stageId: 1, subStageId: 2, reachedAt: '2026-10-19T05:00:00.000Z' },
    { id: '3', stageId: 1, subStageId: 1, reachedAt: '2026-10-20T04:00:00.000Z' },
  ] })} />);
  const substages = screen.getByRole('list', { name: 'Identified history' });
  expect(within(substages).getAllByText('Pending Review')).toHaveLength(2);
  expect(substages.querySelectorAll('.active')).toHaveLength(1);
  expect(substages.querySelector('.active time')).toHaveAttribute('datetime', '2026-10-20T04:00:00.000Z');
  expect(Array.from(substages.querySelectorAll('time')).map(time => time.dateTime)).toEqual(['2026-10-20T04:00:00.000Z', '2026-10-19T05:00:00.000Z', '2026-10-19T04:00:00.000Z']);
});

it('keeps unvisited positions faint without inventing dates when the opportunity is declined', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ createdDt: '2026-10-19T04:00:00.000Z', stageId: 9, subStageId: 15, stageHistory: [
    { id: '1', stageId: 9, subStageId: 15, reachedAt: '2026-10-20T04:00:00.000Z' },
  ] })} />);
  const qualifying = screen.getByRole('heading', { name: 'Qualifying (Go/No-Go)' }).closest('li')!;
  expect(qualifying).toHaveClass('upcoming');
  expect(qualifying.querySelector('time')).toBeNull();
  expect(screen.queryByText('Not reached')).not.toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Opportunity progress history' }).querySelector('[aria-current="step"]')).toHaveTextContent('No-Bid / Declined');
});

it('keeps the current status visible without inventing a date when history is missing', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId: 2, subStageId: 4 })} />);
  const timeline = screen.getByRole('list', { name: 'Opportunity progress history' });
  expect(timeline.querySelectorAll('time')).toHaveLength(0);
  expect(timeline.querySelector('[aria-current="step"]')).toHaveTextContent('Pending Go/No-Go');
  expect(timeline.querySelector('[aria-current="step"]')).toHaveTextContent('Date unavailable');
});

it('records proposal, negotiation, hold, resume and outcome without replacing the original stage completion', () => {
  const proposalAt = '2026-10-23T04:00:00Z';
  const negotiationAt = '2026-10-23T05:00:00Z';
  const heldAt = '2026-10-23T06:00:00Z';
  const resumedAt = '2026-10-23T07:00:00Z';
  const wonAt = '2026-10-23T08:00:00Z';
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId: 7, subStageId: 13, stageHistory: [
    { id: '1', stageId: 5, subStageId: 10, reachedAt: proposalAt },
    { id: '2', stageId: 5, subStageId: 11, reachedAt: proposalAt },
    { id: '3', stageId: 6, subStageId: 12, reachedAt: negotiationAt },
    { id: '4', stageId: 10, subStageId: 19, reachedAt: heldAt },
    { id: '5', stageId: 6, subStageId: 12, reachedAt: resumedAt },
    { id: '6', stageId: 7, subStageId: 13, reachedAt: wonAt },
  ] })} />);
  const timeline = screen.getByRole('list', { name: 'Opportunity progress history' });
  expect(timeline.querySelector('[aria-current="step"]')).toHaveTextContent('Outcome (Won / Lost / Hold)');
  expect(timeline.querySelector('[aria-current="step"]')).toHaveTextContent('Won');
  const proposal = screen.getByRole('heading', { name: 'Proposal / Bid Submitted' }).closest('li')!;
  expect(proposal.querySelector('.opp-stage-completion time')).toHaveAttribute('datetime', new Date(negotiationAt).toISOString());
  expect(within(proposal).getByText('Bid Submitted')).toBeVisible();
  const negotiation = screen.getByRole('heading', { name: 'Negotiation' }).closest('li')!;
  expect(within(negotiation).getAllByText('Under Negotiation')).toHaveLength(2);
  expect(within(negotiation).getByText('Won')).toBeVisible();
  const outcome = screen.getByRole('heading', { name: 'Outcome (Won / Lost / Hold)' }).closest('li')!;
  expect(within(outcome).getByText('On Hold')).toBeVisible();
  expect(screen.queryByRole('heading', { name: 'Closed — Lost' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Closed — Won' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'On Hold' })).not.toBeInTheDocument();
});

it.each([[7, 13, 'Won'], [8, 14, 'Lost'], [10, 20, 'On Hold']] as const)('shows only the recorded %s outcome after a submitted bid', (stageId, subStageId, label) => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId, subStageId, stageHistory: [
    { id: '1', stageId: 5, subStageId: 11, reachedAt: '2026-10-23T05:00:00Z' },
    { id: '2', stageId, subStageId, reachedAt: '2026-10-23T06:00:00Z' },
  ] })} />);
  const outcome = screen.getByRole('heading', { name: 'Outcome (Won / Lost / Hold)' }).closest('li')!;
  expect(outcome).toHaveAttribute('aria-current', 'step');
  expect(within(outcome).getByText(label)).toBeVisible();
  expect(outcome.querySelectorAll('time')).toHaveLength(1);
  for (const other of ['Won', 'Lost', 'On Hold'].filter(choice => choice !== label)) expect(within(outcome).queryByText(other)).not.toBeInTheDocument();
  const negotiation = screen.getByRole('heading', { name: 'Negotiation' }).closest('li')!;
  expect(negotiation).toHaveClass('upcoming');
  expect(negotiation.querySelector('time')).toBeNull();
});

it('shows an outcome status without inventing timestamps when history is missing', () => {
  render(<OpportunityProgress opportunity={fixtureOpportunity({ stageId: 8, subStageId: 14, stageHistory: [] })} />);
  const outcome = screen.getByRole('heading', { name: 'Outcome (Won / Lost / Hold)' }).closest('li')!;
  expect(outcome).toHaveTextContent('Lost');
  expect(outcome).toHaveTextContent('Date unavailable');
});
