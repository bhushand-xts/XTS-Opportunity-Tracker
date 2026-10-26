import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ListFilter, OpportunityDetail } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { fixtureOpportunity } from '../testing/fixtures';
import { PipelinePage } from './PipelinePage';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';
import { Status } from './ui';
import { decisionError } from '../lib/workflow';
import { approvalStagesForRole, workStagesForRole } from '../lib/opportunityStatus';

afterEach(cleanup);

function mount(records: OpportunityDetail[], details = false, queue: ListFilter['queue'] = 'PIPELINE', roleName?: string) {
  const service = {
    ...productionOpportunityService,
    list: vi.fn(async () => ({ nodes: records, totalCount: records.length, endCursor: null, hasNextPage: false })),
    detail: vi.fn(async () => records[0]),
  };
  return render(<OpportunityServiceContext.Provider value={service}><OpportunityAccessContext.Provider value={{ userId: '101', view: true, pipeline: true, add: false, edit: false, work: queue === 'MY_WORK', workStageIds: roleName ? workStagesForRole(roleName) : undefined, approvals: queue === 'MY_APPROVALS', approvalStageIds: roleName ? approvalStagesForRole(roleName) : undefined }}><MemoryRouter initialEntries={[details ? '/opportunity/401/details' : '/opportunity']}><Routes><Route path="/opportunity" element={<PipelinePage queue={queue} />} /><Route path="/opportunity/:id/details" element={<OpportunityDetailsPage />} /></Routes></MemoryRouter></OpportunityAccessContext.Provider></OpportunityServiceContext.Provider>);
}

describe('persisted stage and substage display', () => {
  it('shows opportunity progress without review buttons for a creator who cannot approve', async () => {
    mount([fixtureOpportunity({ stageId: 1, subStageId: 2, allowedActions: ['EDIT'], visibleModules: ['overview'] })], true);
    expect(await screen.findByText('Opportunity progress')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Opportunity actions' })).not.toBeInTheDocument();
    for (const name of ['Approve & Send to CEO', 'Request Changes', 'On Hold', 'Reject Opportunity']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
  });

  it.each([
    [1, 1, 'Identified', 'Pending Review'],
    [1, 2, 'Identified', 'Changes Requested'],
    [1, 3, 'Identified', 'On Hold'],
    [2, 4, 'Qualifying (Go/No-Go)', 'Pending Go/No-Go'],
    [2, 5, 'Qualifying (Go/No-Go)', 'Changes Requested'],
    [2, 6, 'Qualifying (Go/No-Go)', 'On Hold'],
    [3, 7, 'Solution/Scoping Estimation (Engineering)', 'In Progress'],
    [4, 8, 'Estimate Review & Approval', 'Pending Approval'],
    [4, 9, 'Estimate Review & Approval', 'On Hold'],
    [5, 10, 'Proposal / Bid Submission', 'Proposal In Preparation'],
    [5, 11, 'Proposal / Bid Submission', 'Bid Submitted'],
    [6, 12, 'Negotiation', 'Under Negotiation'],
    [7, 13, 'Closed — Won', 'Won'],
    [8, 14, 'Closed — Lost', 'Lost'],
    [9, 15, 'No-Bid / Declined', 'Rejected by Sales Head'],
    [9, 16, 'No-Bid / Declined', 'No-Go by CEO'],
    [9, 17, 'No-Bid / Declined', 'Estimate Rejected by CEO'],
    [9, 18, 'No-Bid / Declined', 'Closed by Sales'],
    [10, 19, 'On Hold', 'Negotiation On Hold'],
    [10, 20, 'On Hold', 'Proposal Follow-up On Hold'],
  ])('shows stage %s / substage %s independently of the legacy state', (stageId, subStageId, stage, substage) => {
    render(<Status state="SALES_REVIEW" stageId={Number(stageId)} subStageId={Number(subStageId)} />);
    expect(screen.getByLabelText(`${stage} — ${substage}`)).toBeVisible();
  });

  it('keeps pending, changes requested and held opportunities in the Identified board column', async () => {
    mount([1, 2, 3].map(subStageId => fixtureOpportunity({ id: String(subStageId), title: `Opportunity ${subStageId}`, stageId: 1, subStageId, state: subStageId === 2 ? 'PREPARATION_PENDING' : 'SALES_REVIEW' })));
    const heading = await screen.findByRole('heading', { name: /^Identified/ });
    const identified = within(heading.closest('section')!);
    expect(identified.getAllByRole('link')).toHaveLength(3);
    for (const substage of ['Pending Review', 'Changes Requested', 'On Hold']) expect(identified.getByLabelText(`Identified — ${substage}`)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    const table = within(screen.getByRole('table'));
    for (const substage of ['Pending Review', 'Changes Requested', 'On Hold']) expect(table.getByLabelText(`Identified — ${substage}`)).toBeInTheDocument();
  });

  it('shows the complete pipeline in order even when later stages are empty', async () => {
    const { container } = mount([fixtureOpportunity({ stageId: 3, subStageId: 7 })]);
    await screen.findByRole('heading', { name: /^Solution\/Scoping Estimation/ });
    expect(Array.from(container.querySelectorAll('.opp-lane > h3')).map(heading => heading.querySelector('.flex-1')?.textContent)).toEqual([
      'Identified', 'Qualifying (Go/No-Go)', 'Solution/Scoping Estimation (Engineering)', 'Estimate Review & Approval',
      'Proposal / Bid Submission', 'Negotiation', 'Outcome (Won / Lost)', 'No-Bid / Declined',
    ]);
  });

  it.each([
    { role: 'CEO', stages: [[2, 4], [4, 8]], labels: ['Qualifying (Go/No-Go)', 'Estimate Review & Approval'] },
    { role: 'Sales Head', stages: [[1, 1], [5, 10], [5, 11], [6, 12]], labels: ['Identified', 'Proposal / Bid Submission', 'Negotiation'] },
  ])('shows only the stages returned for $role in My Approvals', async ({ role, stages, labels }) => {
    const records = stages.map(([stageId, subStageId]) => fixtureOpportunity({ id: String(subStageId), title: `Task ${subStageId}`, stageId, subStageId }));
    const { container } = mount(records, false, 'MY_APPROVALS', role);
    await screen.findByRole('region', { name: 'Pipeline stages' });
    expect(Array.from(container.querySelectorAll('.opp-lane > h3')).map(heading => heading.querySelector('.flex-1')?.textContent)).toEqual(labels);
    expect(within(screen.getByRole('region', { name: 'Pipeline stages' })).getAllByRole('link')).toHaveLength(records.length);
    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(records.length + 1);
  });

  it('keeps Negotiation visible for Sales Head when opportunities have not reached that stage', async () => {
    mount([fixtureOpportunity({ stageId: 5, subStageId: 10 })], false, 'MY_APPROVALS', 'Sales Head');
    const heading = await screen.findByRole('heading', { name: /^Negotiation/ });
    expect(within(heading.closest('section')!).getByText('No opportunities in this stage.')).toBeVisible();
    expect(screen.getByRole('heading', { name: /^Identified/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: /^Proposal \/ Bid Submission/ })).toBeVisible();
    expect(screen.queryByRole('heading', { name: /^Qualifying/ })).not.toBeInTheDocument();
  });

  it.each([
    { role: 'Sales Head', labels: ['Identified', 'Proposal / Bid Submission', 'Negotiation'] },
    { role: 'CEO', labels: ['Qualifying (Go/No-Go)', 'Estimate Review & Approval'] },
  ])('keeps the $role approval columns visible when the whole queue is empty', async ({ role, labels }) => {
    const { container } = mount([], false, 'MY_APPROVALS', role);
    await screen.findByRole('region', { name: 'Pipeline stages' });
    expect(Array.from(container.querySelectorAll('.opp-lane > h3')).map(heading => heading.querySelector('.flex-1')?.textContent)).toEqual(labels);
    expect(screen.getAllByText('No opportunities in this stage.')).toHaveLength(labels.length);
  });

  it.each([false, true])('shows only the engineering estimation column in Estimation Team My Work (has tasks: %s)', async hasTasks => {
    const records = hasTasks ? [fixtureOpportunity({ stageId: 3, subStageId: 7 })] : [];
    const { container } = mount(records, false, 'MY_WORK', 'Estimation Team');
    const board = await screen.findByRole('region', { name: 'Pipeline stages' });
    expect(Array.from(container.querySelectorAll('.opp-lane > h3')).map(heading => heading.querySelector('.flex-1')?.textContent)).toEqual([
      'Solution/Scoping Estimation (Engineering)',
    ]);
    expect(within(board).queryAllByRole('link')).toHaveLength(records.length);
    if (!hasTasks) expect(within(board).getByText('No opportunities in this stage.')).toBeVisible();
  });

  it('lets users navigate to later stages and back without leaving the board', async () => {
    mount([fixtureOpportunity({ stageId: 3, subStageId: 7 })]);
    const board = await screen.findByRole('region', { name: 'Pipeline stages' });
    Object.defineProperty(board, 'clientWidth', { value: 1000 });
    const scrollBy = vi.fn();
    board.scrollBy = scrollBy;

    fireEvent.click(screen.getByRole('button', { name: 'Next stages' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 800, behavior: 'auto' });
    fireEvent.click(screen.getByRole('button', { name: 'Previous stages' }));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -800, behavior: 'auto' });
    expect(within(board).getByRole('heading', { name: /^Negotiation/ })).toBeInTheDocument();
    expect(within(board).getByRole('heading', { name: /^Outcome/ })).toBeInTheDocument();
  });

  it('groups won, lost and held opportunities under Outcome (Won / Lost) while keeping their actual status', async () => {
    mount([[7, 13], [8, 14], [10, 19], [10, 20]].map(([stageId, subStageId]) => fixtureOpportunity({ id: String(subStageId), title: `Outcome ${subStageId}`, stageId, subStageId })));
    const heading = await screen.findByRole('heading', { name: /^Outcome \(/ });
    const lane = within(heading.closest('section')!);
    expect(lane.getAllByRole('link')).toHaveLength(4);
    expect(lane.getByLabelText('Closed — Won — Won')).toBeVisible();
    expect(lane.getByLabelText('Closed — Lost — Lost')).toBeVisible();
    expect(lane.getByLabelText('On Hold — Negotiation On Hold')).toBeVisible();
    expect(lane.getByLabelText('On Hold — Proposal Follow-up On Hold')).toBeVisible();
  });

  it.each([[1, 3, 'Identified', 'On Hold'], [2, 4, 'Qualifying (Go/No-Go)', 'Pending Go/No-Go']])('shows persisted progress without duplicating it in the detail header at %s / %s', async (stageId, subStageId, stage, substage) => {
    const { container } = mount([fixtureOpportunity({ stageId: Number(stageId), subStageId: Number(subStageId), visibleModules: ['overview'], allowedActions: [] })], true);
    await screen.findByText('Opportunity progress');
    expect(within(container.querySelector('header')!).queryByLabelText(`${stage} — ${substage}`)).not.toBeInTheDocument();
    expect(within(container.querySelector('header')!).getByLabelText('Opportunity number OPP-TEST-401')).toBeVisible();
    const progress = within(screen.getByText('Opportunity progress').closest('.opp-panel')!);
    const current = within(progress.getByRole('list', { name: 'Opportunity progress history' }).querySelector('[aria-current="step"]')!);
    expect(current.getByRole('heading', { name: String(stage) })).toBeVisible();
    expect(current.getByText(String(substage))).toBeVisible();
  });
});

describe('existing stage decision boundaries', () => {
  it('allows Sales Head review without a legacy package and requires change details', () => {
    const record = fixtureOpportunity({ stageId: 1, subStageId: 1, packageRevision: null, allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD'] });
    expect(decisionError(record, 'SALES_APPROVE', '', true)).toBeNull();
    expect(decisionError(record, 'SALES_REQUEST_CHANGES', ' ', true)).toContain('changes requested');
    expect(decisionError(record, 'SALES_REQUEST_CHANGES', 'Update the scope', true)).toBeNull();
    expect(decisionError({ ...record, subStageId: 3 }, 'SALES_APPROVE', '', true)).toBeNull();
    expect(decisionError({ ...record, subStageId: 2 }, 'SALES_APPROVE', '', true)).toBeNull();
    expect(decisionError({ ...record, subStageId: 2 }, 'SALES_HOLD', '', true)).toContain('hold reason');
    expect(decisionError({ ...record, subStageId: 2 }, 'SALES_HOLD', 'Awaiting details', true, 3)).toBeNull();
    expect(decisionError({ ...record, subStageId: 2 }, 'SALES_REQUEST_CHANGES', 'Update the scope', true)).toContain('no longer awaiting');
    expect(decisionError(record, 'SALES_APPROVE', '', false)).toBeNull();
    expect(decisionError(record, 'SALES_HOLD', '', false)).toContain('hold reason');
    expect(decisionError(record, 'SALES_HOLD', 'Awaiting budget', false, 3)).toBeNull();
  });

  it('keeps CEO actions at qualifying and requires the server action grant', () => {
    const record = fixtureOpportunity({ stageId: 2, subStageId: 4, packageRevision: null, allowedActions: ['GATE1_GO', 'GATE1_REQUEST_CHANGES', 'GATE1_HOLD'] });
    expect(decisionError(record, 'GATE1_GO', '', true)).toBeNull();
    expect(decisionError({ ...record, subStageId: 5 }, 'GATE1_GO', '', true)).toBeNull();
    expect(decisionError({ ...record, subStageId: 5 }, 'GATE1_HOLD', 'Awaiting scope', true, 3)).toBeNull();
    expect(decisionError({ ...record, subStageId: 5 }, 'GATE1_REQUEST_CHANGES', 'Scope', true)).toContain('no longer awaiting');
    expect(decisionError({ ...record, subStageId: 6 }, 'GATE1_HOLD', 'Awaiting budget', true, 4)).toContain('no longer awaiting');
    expect(decisionError({ ...record, stageId: 1, subStageId: 1 }, 'GATE1_GO', '', true)).toContain('no longer awaiting');
    expect(decisionError({ ...record, allowedActions: [] }, 'GATE1_GO', '', true)).toContain('not permitted');
  });
});
