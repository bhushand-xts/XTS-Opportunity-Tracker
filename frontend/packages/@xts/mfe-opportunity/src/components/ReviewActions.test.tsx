import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DecisionCommand, OpportunityDetail } from '@xts/api-contracts';
import { useState } from 'react';
import { OpportunityServiceContext, productionOpportunityService, type OpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { ReviewActions } from './ReviewActions';
import { Status } from './ui';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

function salesReview(overrides: Partial<OpportunityDetail> = {}) {
  return fixtureOpportunity({
    stageId: 1, subStageId: 1, state: 'SALES_REVIEW', packageRevision: null,
    allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD'], ...overrides,
  });
}

function mount(opportunity: OpportunityDetail, decide: OpportunityService['decide'] = vi.fn(), onSaved = vi.fn()) {
  const service = { ...productionOpportunityService, decide, holdReasons: vi.fn(async () => [{ id: 3, name: 'Missing information', description: 'Supporting details are missing.' }]) };
  const view = (record: OpportunityDetail) => <OpportunityServiceContext.Provider value={service}><ReviewActions opportunity={record} onSaved={onSaved} /></OpportunityServiceContext.Provider>;
  const rendered = render(view(opportunity));
  return { onSaved, rerender: (record: OpportunityDetail) => rendered.rerender(view(record)) };
}

function openDecision(label: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  return within(screen.getByRole('dialog'));
}

function confirmReview(dialog: ReturnType<typeof within>) {
  const checkbox = dialog.queryByRole('checkbox');
  if (checkbox) fireEvent.click(checkbox);
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
}

async function selectHoldReason(dialog: ReturnType<typeof within>) {
  await dialog.findByRole('option', { name: 'Missing information' });
  fireEvent.change(dialog.getByRole('combobox'), { target: { value: '3' } });
}

describe('persisted opportunity review actions', () => {
  it.each(['Approve & Send to CEO', 'Put On Hold', 'Request Changes'])('does not show or require a reviewed checkbox for %s', async label => {
    mount(salesReview());
    const dialog = openDecision(label);
    if (label === 'Put On Hold') await dialog.findByRole('option', { name: 'Missing information' });
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(dialog.queryByText('I have reviewed this opportunity.')).not.toBeInTheDocument();
  });

  it.each([
    ['SALES_REJECT', 'Reject Opportunity', 1, 1, 15],
    ['GATE1_NO_GO', 'Reject Opportunity', 2, 4, 16],
    ['ESTIMATE_REJECT', 'Reject Estimation', 4, 8, 17],
  ] as const)('requires a master reason and description for %s', async (decision, label, stageId, subStageId, nextSubstage) => {
    const current = salesReview({ stageId, subStageId, allowedActions: [decision] });
    const saved = { ...current, stageId: 9, subStageId: nextSubstage, allowedActions: [] };
    const decide = vi.fn(async () => saved);
    const { onSaved } = mount(current, decide);
    const dialog = openDecision(label);
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Select a rejection reason.');
    await selectHoldReason(dialog);
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Enter a rejection description.');
    fireEvent.change(dialog.getByRole('textbox', { name: /Rejection description/ }), { target: { value: '  Not suitable  ' } });
    confirmReview(dialog);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision, reasonCodeId: 3, reason: 'Not suitable', expectedStageId: stageId, expectedSubStageId: subStageId }));
  });

  it.each([
    ['SUBMIT_ESTIMATE', 'Submit Estimation to CEO', 3, 7, 4, 8],
    ['ESTIMATE_APPROVE', 'Approve Estimation', 4, 8, 5, 10],
    ['BID_SUBMITTED', 'Bid Submitted', 5, 10, 5, 11],
    ['START_NEGOTIATION', 'Under Negotiation', 5, 11, 6, 12],
    ['MARK_WON', 'Won', 6, 12, 7, 13], ['MARK_LOST', 'Lost', 6, 12, 8, 14],
    ['CLOSE_OPPORTUNITY', 'Close Opportunity', 2, 4, 9, 18],
  ] as const)('records the %s action for the current stage without a checkbox', async (decision, label, stageId, subStageId, nextStage, nextSubstage) => {
    const current = salesReview({ stageId, subStageId, allowedActions: [decision], estimation: { revision: 1, rows: [{ id: 'row', workItem: 'Engineering', hours: '2', people: 1, hourlyRate: '100' }], assumptions: '', total: '200.00' } });
    const saved = { ...current, stageId: nextStage, subStageId: nextSubstage, allowedActions: [] };
    const decide = vi.fn(async () => saved);
    const { onSaved } = mount(current, decide);
    const dialog = openDecision(label);
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    confirmReview(dialog);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision, expectedStageId: stageId, expectedSubStageId: subStageId }));
  });
  it.each([{ stageId: 1, subStageId: 2, next: 1 }, { stageId: 2, subStageId: 5, next: 4 }])('lets the permitted editor resubmit requested changes at $stageId / $subStageId', async ({ stageId, subStageId, next }) => {
    const current = salesReview({ stageId, subStageId, allowedActions: ['EDIT', 'RESUBMIT'] });
    const saved = { ...current, subStageId: next, allowedActions: [] };
    const decide = vi.fn(async () => saved);
    const { onSaved } = mount(current, decide);
    expect(screen.queryByRole('button', { name: 'Approve & Send to CEO' })).not.toBeInTheDocument();
    confirmReview(openDecision('Resubmit for Review'));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'RESUBMIT', expectedStageId: stageId, expectedSubStageId: subStageId }));
  });

  it('keeps a failed hold-reason lookup visible and retries without recording a decision', async () => {
    const decide = vi.fn();
    const holdReasons = vi.fn().mockRejectedValueOnce(new Error('Reason master unavailable.')).mockResolvedValueOnce([{ id: 3, name: 'Missing information', description: null }]);
    render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, decide, holdReasons }}><ReviewActions opportunity={salesReview()} onSaved={vi.fn()} /></OpportunityServiceContext.Provider>);
    const dialog = openDecision('Put On Hold');
    expect(await dialog.findByRole('alert')).toHaveTextContent('Reason master unavailable.');
    expect(dialog.getByRole('combobox')).toBeDisabled();
    expect(decide).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Retry' }));
    await dialog.findByRole('option', { name: 'Missing information' });
    expect(dialog.getByRole('combobox')).toBeEnabled();
    expect(holdReasons).toHaveBeenCalledTimes(2);
  });
  it.each([
    { label: 'Approve & Send to CEO', stageId: 2, subStageId: 4, stage: 'Qualifying (Go/No-Go)', substage: 'Pending Go/No-Go', note: '' },
    { label: 'Request Changes', stageId: 1, subStageId: 2, stage: 'Identified', substage: 'Changes Requested', note: 'Correct the submission details.' },
    { label: 'Put On Hold', stageId: 1, subStageId: 3, stage: 'Identified', substage: 'On Hold', note: 'Waiting for procurement.' },
  ])('refreshes the status and reviewer note from the persisted $label result', async ({ label, stageId, subStageId, stage, substage, note }) => {
    const current = salesReview();
    const saved = salesReview({ stageId, subStageId, allowedActions: [], form: { ...current.form, context: { ...current.form.context, notes: note } } });
    const service = { ...productionOpportunityService, decide: vi.fn(async () => saved), holdReasons: vi.fn(async () => [{ id: 3, name: 'Missing information', description: null }]) };
    function Workspace() {
      const [record, setRecord] = useState(current);
      return <OpportunityServiceContext.Provider value={service}><Status {...record} /><ReviewActions opportunity={record} onSaved={setRecord} /></OpportunityServiceContext.Provider>;
    }
    render(<Workspace />);
    const dialog = openDecision(label);
    if (label === 'Put On Hold') await selectHoldReason(dialog);
    if (note) fireEvent.change(dialog.getByRole('textbox'), { target: { value: note } });
    confirmReview(dialog);
    expect(await screen.findByLabelText(`Stage: ${stage}; substage: ${substage}`)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Approve & Send to CEO' })).not.toBeInTheDocument();
    if (note) expect(screen.getByText(note)).toBeVisible();
  });

  it('uses raw stage and server permissions without requiring a package revision', () => {
    mount(salesReview({ state: 'GATE1_PENDING', allowedActions: ['SALES_APPROVE', 'SALES_HOLD', 'GATE1_GO'] }));
    expect(screen.getByRole('button', { name: 'Approve & Send to CEO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put On Hold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve Go' })).not.toBeInTheDocument();
    expect(screen.queryByText(/package revision/i)).not.toBeInTheDocument();
  });

  it('waits for the persisted approval before publishing the updated opportunity', async () => {
    const current = salesReview();
    const saved = salesReview({ stageId: 2, subStageId: 4, state: 'GATE1_PENDING', allowedActions: [] });
    let complete!: (value: OpportunityDetail) => void;
    const decide = vi.fn(() => new Promise<OpportunityDetail>(resolve => { complete = resolve; }));
    const { onSaved } = mount(current, decide);
    const dialog = openDecision('Approve & Send to CEO');
    expect(dialog.getByText(/Qualifying \(Go\/No-Go\) \/ Pending Go\/No-Go/)).toBeInTheDocument();
    confirmReview(dialog);
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({
      decision: 'SALES_APPROVE', opportunityId: current.id, packageRevision: null,
      expectedStageId: 1, expectedSubStageId: 1, confirmed: true,
    }));
    expect(onSaved).not.toHaveBeenCalled();
    expect(dialog.getByRole('button', { name: 'Recording…' })).toBeDisabled();
    await act(async () => complete(saved));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('requires the requested changes and submits the trimmed comment', async () => {
    const saved = salesReview({ subStageId: 2, state: 'PREPARATION_PENDING', allowedActions: ['EDIT'] });
    const decide = vi.fn(async () => saved);
    const { onSaved } = mount(salesReview(), decide);
    const dialog = openDecision('Request Changes');
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent(/changes|reason/i);
    expect(decide).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByRole('textbox', { name: /Changes requested/ }), { target: { value: '  Correct the submission details.  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SALES_REQUEST_CHANGES', reason: 'Correct the submission details.' }));
  });

  it('requires a reason code and description before retaining the saved Identified hold', async () => {
    const saved = salesReview({ subStageId: 3, holdReasonCodeId: 3, allowedActions: [] });
    const decide = vi.fn(async () => saved);
    const { onSaved } = mount(salesReview(), decide);
    const dialog = openDecision('Put On Hold');
    expect(dialog.getByText(/stays in Identified and moves to On Hold/)).toBeInTheDocument();
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Select a hold reason.');
    expect(decide).not.toHaveBeenCalled();
    await selectHoldReason(dialog);
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Enter a hold description.');
    expect(decide).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByRole('textbox', { name: /Hold description/ }), { target: { value: '  Waiting for the scope document.  ' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SALES_HOLD', reason: 'Waiting for the scope document.', reasonCodeId: 3, expectedStageId: 1 }));
  });

  it.each([
    { stageId: 1, subStageId: 3, action: 'SALES_APPROVE' as const, label: 'Approve & Send to CEO' },
    { stageId: 2, subStageId: 4, action: 'GATE1_GO' as const, label: 'Approve Go' },
    { stageId: 2, subStageId: 6, action: 'GATE1_GO' as const, label: 'Approve Go' },
  ])('allows the assigned reviewer to act at stage $stageId / substage $subStageId', async ({ stageId, subStageId, action, label }) => {
    const current = salesReview({ stageId, subStageId, allowedActions: [action] });
    const decide = vi.fn(async () => current);
    mount(current, decide);
    confirmReview(openDecision(label));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: action, expectedStageId: stageId, expectedSubStageId: subStageId })));
  });

  it('shows CEO change and hold actions only when the server grants them', () => {
    mount(salesReview({ stageId: 2, subStageId: 4, allowedActions: ['GATE1_REQUEST_CHANGES', 'GATE1_HOLD', 'SALES_APPROVE', 'GATE1_NO_GO'] }));
    expect(screen.getByRole('button', { name: 'Request Changes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Put On Hold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve & Send to CEO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decide No-Go' })).not.toBeInTheDocument();
  });

  it.each([
    { stageId: 1, subStageId: 2 }, { stageId: 2, subStageId: 5 },
    { stageId: 3, subStageId: 7 }, { stageId: 4, subStageId: 8 },
    { stageId: 1, subStageId: null },
  ])('hides approval controls outside the review steps ($stageId / $subStageId)', ({ stageId, subStageId }) => {
    mount(salesReview({ stageId, subStageId, allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'GATE1_GO', 'GATE1_REQUEST_CHANGES', 'GATE1_HOLD'] }));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('retains a failed decision for retry and never publishes a synthetic update', async () => {
    const saved = salesReview({ subStageId: 3 });
    const decide = vi.fn<OpportunityService['decide']>().mockRejectedValueOnce(new Error('Approval permission was removed.')).mockResolvedValueOnce(saved);
    const { onSaved } = mount(salesReview(), decide);
    const dialog = openDecision('Put On Hold');
    await selectHoldReason(dialog);
    fireEvent.change(dialog.getByRole('textbox', { name: /Hold description/ }), { target: { value: 'Awaiting details.' } });
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Approval permission was removed.');
    expect(onSaved).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide.mock.calls[1][0].idempotencyKey).toBe(decide.mock.calls[0][0].idempotencyKey);
  });

  it('validates a refreshed stage before sending a decision from an already open dialog', async () => {
    const current = salesReview();
    const decide = vi.fn();
    const { rerender } = mount(current, decide);
    const dialog = openDecision('Approve & Send to CEO');
    rerender({ ...current, stageId: 2, subStageId: 4 });
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it('preserves legacy package confirmation and rejection reason validation', async () => {
    const legacy = fixtureOpportunity({ state: 'SALES_REVIEW', packageRevision: 3, allowedActions: ['SALES_REJECT'] });
    const decide = vi.fn(async (_command: DecisionCommand) => legacy);
    mount(legacy, decide);
    const dialog = openDecision('Reject Opportunity');
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Confirm that you reviewed this package revision.');
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Enter a reason for this decision.');
    fireEvent.change(dialog.getByRole('textbox', { name: /Reason/ }), { target: { value: 'Capacity unavailable' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    await waitFor(() => expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SALES_REJECT', reason: 'Capacity unavailable', packageRevision: 3, confirmed: true })));
    expect(decide.mock.calls[0][0]).not.toHaveProperty('expectedStageId');
  });
});
