import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityProgress } from './OpportunityProgress';

afterEach(cleanup);

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
    'Negotiation', 'Proposal / Bid Submitted', 'Estimate Review & Approval', 'Solution/Scoping Estimation (Engineering)', 'Qualifying (Go/No-Go)', 'Identified',
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
