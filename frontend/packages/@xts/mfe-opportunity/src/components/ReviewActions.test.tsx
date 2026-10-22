import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DecisionCommand, OpportunityDetail } from '@xts/api-contracts';
import { useState } from 'react';
import { OpportunityServiceContext, productionOpportunityService, type OpportunityService } from '../services/OpportunityService';
import { fixtureOpportunity } from '../testing/fixtures';
import { ReviewActions } from './ReviewActions';
import { Status } from './ui';
import { toast } from 'sonner';

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
  it('removes the Sales Head action area once the opportunity moves to Qualifying', () => {
    const { container } = render(<OpportunityServiceContext.Provider value={productionOpportunityService}><ReviewActions opportunity={salesReview({ stageId: 2, subStageId: 4, allowedActions: ['CLOSE_OPPORTUNITY'] })} onSaved={vi.fn()} /></OpportunityServiceContext.Provider>);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps actual review choices without a close action or the old approval notice', () => {
    mount(salesReview({ allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'SALES_REJECT', 'CLOSE_OPPORTUNITY'] }));
    expect(screen.getByRole('button', { name: 'Approve & Send to CEO' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reject Opportunity' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Close Opportunity' })).not.toBeInTheDocument();
    expect(screen.queryByText('Your sales approval is required')).not.toBeInTheDocument();
    expect(screen.queryByText(/Review this opportunity before recording your decision/)).not.toBeInTheDocument();
  });
  it.each([
    { stageId: 2, subStageId: 4, actions: ['GATE1_GO', 'SALES_APPROVE'], current: 'Approve Go', previous: 'Approve & Send to CEO' },
    { stageId: 3, subStageId: 7, actions: ['SUBMIT_ESTIMATE', 'GATE1_GO'], current: 'Submit Estimation to CEO', previous: 'Approve Go' },
    { stageId: 4, subStageId: 8, actions: ['ESTIMATE_APPROVE', 'SUBMIT_ESTIMATE'], current: 'Approve Estimation', previous: 'Submit Estimation to CEO' },
    { stageId: 5, subStageId: 10, actions: ['BID_SUBMITTED', 'ESTIMATE_APPROVE'], current: 'Bid Submitted', previous: 'Approve Estimation' },
    { stageId: 6, subStageId: 12, actions: ['MARK_WON', 'START_NEGOTIATION'], current: 'Won', previous: 'Under Negotiation' },
  ] as const)('shows only the current-stage actions at stage $stageId after reopening details', ({ stageId, subStageId, actions, current, previous }) => {
    mount(salesReview({ stageId, subStageId, allowedActions: [...actions] }));
    expect(screen.getByRole('button', { name: current })).toBeEnabled();
    expect(screen.queryByRole('button', { name: previous })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
  });
  it.each(['Approve & Send to CEO', 'On Hold', 'Request Changes'])('does not show or require a reviewed checkbox for %s', async label => {
    mount(salesReview());
    const dialog = openDecision(label);
    if (label === 'On Hold') await dialog.findByRole('option', { name: 'Missing information' });
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(dialog.queryByText('I have reviewed this opportunity.')).not.toBeInTheDocument();
  });

  it.each([
    ['SALES_REJECT', 'Reject Opportunity', 1, 1, 15],
    ['GATE1_NO_GO', 'Reject Opportunity', 2, 4, 16],
    ['ESTIMATE_REJECT', 'Reject Estimation', 4, 8, 17],
  ] as const)('requires a master reason and description for %s', async (decision, label, stageId, subStageId, nextSubstage) => {
    const rejected = vi.spyOn(toast, 'error');
    const current = salesReview({ stageId, subStageId, allowedActions: [decision] });
    const saved = { ...current, stageId: 9, subStageId: nextSubstage, allowedActions: [] };
    const decide = vi.fn(async () => saved);
    const { onSaved, rerender } = mount(current, decide);
    const dialog = openDecision(label);
    expect(dialog.getByRole('button', { name: 'Confirm decision' })).toHaveClass('opp-review-error');
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Select a rejection reason.');
    await selectHoldReason(dialog);
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Enter a rejection description.');
    fireEvent.change(dialog.getByRole('textbox', { name: /Rejection description/ }), { target: { value: '  Not suitable  ' } });
    confirmReview(dialog);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved))
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision, reasonCodeId: 3, reason: 'Not suitable', expectedStageId: stageId, expectedSubStageId: subStageId }));
    expect(rejected).not.toHaveBeenCalled();
    rerender(saved);
    expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Action status' })).not.toBeInTheDocument();
  });

  it.each([
    ['SUBMIT_ESTIMATE', 'Submit Estimation to CEO', 3, 7, 4, 8],
    ['ESTIMATE_APPROVE', 'Approve Estimation', 4, 8, 5, 10],
    ['BID_SUBMITTED', 'Bid Submitted', 5, 10, 5, 11],
    ['START_NEGOTIATION', 'Under Negotiation', 5, 11, 6, 12],
    ['MARK_WON', 'Won', 6, 12, 7, 13], ['MARK_LOST', 'Lost', 6, 12, 8, 14],
  ] as const)('records the %s action for the current stage without a checkbox', async (decision, label, stageId, subStageId, nextStage, nextSubstage) => {
    const current = salesReview({ stageId, subStageId, allowedActions: [decision], estimation: { revision: 1, rows: [{ id: 'row', workItem: 'Engineering', hours: '2', people: 1, hourlyRate: '100' }], assumptions: '', total: '200.00' } });
    const saved = { ...current, stageId: nextStage, subStageId: nextSubstage, allowedActions: decision === 'BID_SUBMITTED' ? ['START_NEGOTIATION' as const] : [] };
    const decide = vi.fn(async () => saved);
    const { onSaved, rerender } = mount(current, decide);
    const dialog = openDecision(label);
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    confirmReview(dialog);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision, expectedStageId: stageId, expectedSubStageId: subStageId }));
    rerender(saved);
    if (nextStage === stageId) {
      const selected = screen.getByRole('button', { name: label, pressed: true });
      expect(selected).toBeDisabled();
      expect(selected).toHaveClass('shadow-inner');
      fireEvent.click(selected);
    } else {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    }
    expect(decide).toHaveBeenCalledTimes(1);
    cleanup();
    mount(saved);
    if (nextStage === stageId) expect(screen.getByRole('button', { name: label, pressed: true })).toBeDisabled();
    else expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
  });
  it.each([{ stageId: 1, subStageId: 2 }, { stageId: 2, subStageId: 5 }])('keeps the review area clear while corrections are edited at $stageId / $subStageId', ({ stageId, subStageId }) => {
    const decide = vi.fn();
    mount(salesReview({ stageId, subStageId, allowedActions: ['EDIT', 'RESUBMIT'] }), decide);
    expect(screen.queryByRole('button', { name: 'Resubmit for Review' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Opportunity actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(decide).not.toHaveBeenCalled();
  });

  it.each([
    [1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [2, 6], [4, 8], [4, 9], [5, 11],
  ])('hides every review button from a viewer with only edit access at %s / %s', (stageId, subStageId) => {
    mount(salesReview({ stageId, subStageId, allowedActions: ['EDIT'] }));
    expect(screen.queryByRole('region', { name: 'Opportunity actions' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows only granted choices and the selected action to the current reviewer', () => {
    mount(salesReview({ subStageId: 2, allowedActions: ['SALES_APPROVE'] }));
    expect(screen.getByRole('button', { name: 'Approve & Send to CEO' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Request Changes', pressed: true })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'On Hold' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reject Opportunity' })).not.toBeInTheDocument();
  });

  it('removes the saved selected action when reviewer access is removed', async () => {
    const current = salesReview();
    const saved = salesReview({ subStageId: 3, allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES'] });
    const decide = vi.fn(async () => saved);
    const { onSaved, rerender } = mount(current, decide);
    const dialog = openDecision('On Hold');
    await selectHoldReason(dialog);
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Awaiting scope.' } });
    confirmReview(dialog);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    rerender(saved);
    expect(screen.getByRole('button', { name: 'On Hold', pressed: true })).toBeVisible();
    rerender({ ...saved, allowedActions: ['EDIT'] });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps a failed hold-reason lookup visible and retries without recording a decision', async () => {
    const decide = vi.fn();
    const holdReasons = vi.fn().mockRejectedValueOnce(new Error('Reason master unavailable.')).mockResolvedValueOnce([{ id: 3, name: 'Missing information', description: null }]);
    render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, decide, holdReasons }}><ReviewActions opportunity={salesReview()} onSaved={vi.fn()} /></OpportunityServiceContext.Provider>);
    const dialog = openDecision('On Hold');
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
    { label: 'On Hold', stageId: 1, subStageId: 3, stage: 'Identified', substage: 'On Hold', note: 'Waiting for procurement.' },
  ])('refreshes the persisted $label result without displaying review comments', async ({ label, stageId, subStageId, stage, substage, note }) => {
    const current = salesReview();
    const saved = salesReview({ stageId, subStageId, allowedActions: stageId === 1 ? ['SALES_APPROVE'] : [], form: { ...current.form, context: { ...current.form.context, notes: note } } });
    const success = vi.spyOn(toast, label === 'Approve & Send to CEO' ? 'success' : 'warning');
    const service = { ...productionOpportunityService, decide: vi.fn(async () => saved), holdReasons: vi.fn(async () => [{ id: 3, name: 'Missing information', description: null }]) };
    function Workspace() {
      const [record, setRecord] = useState(current);
      return <OpportunityServiceContext.Provider value={service}><Status {...record} /><ReviewActions opportunity={record} onSaved={setRecord} /></OpportunityServiceContext.Provider>;
    }
    render(<Workspace />);
    const dialog = openDecision(label);
    if (label === 'On Hold') await selectHoldReason(dialog);
    if (note) fireEvent.change(dialog.getByRole('textbox'), { target: { value: note } });
    confirmReview(dialog);
    expect(await screen.findByLabelText(`${stage} — ${substage}`)).toBeVisible();
    expect(success).not.toHaveBeenCalled();
    expect(screen.queryByRole('status', { name: 'Action status' })).not.toBeInTheDocument();
    if (stageId === 1) expect(screen.getByRole('button', { name: label, pressed: true })).toBeDisabled();
    else expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    if (note) {
      expect(screen.queryByText(note)).not.toBeInTheDocument();
      expect(service.decide).toHaveBeenCalledWith(expect.objectContaining({ reason: note }));
    }
  });

  it.each([
    { stageId: 1, subStageId: 1, held: 3, approve: 'SALES_APPROVE', hold: 'SALES_HOLD', label: 'On Hold', next: 'Approve & Send to CEO' },
    { stageId: 2, subStageId: 4, held: 6, approve: 'GATE1_GO', hold: 'GATE1_HOLD', label: 'On Hold', next: 'Approve Go' },
    { stageId: 4, subStageId: 8, held: 9, approve: 'ESTIMATE_APPROVE', hold: 'ESTIMATE_HOLD', label: 'Put Estimation On Hold', next: 'Approve Estimation' },
  ] as const)('keeps the held action visible and selected at stage $stageId', async ({ stageId, subStageId, held, approve, hold, label, next }) => {
    const warning = vi.spyOn(toast, 'warning');
    const current = salesReview({ stageId, subStageId, allowedActions: [approve, hold] });
    // Retain a stale hold grant to verify that persisted status also protects the UI.
    const saved = { ...current, subStageId: held };
    const service = { ...productionOpportunityService, decide: vi.fn(async () => saved), holdReasons: vi.fn(async () => [{ id: 3, name: 'Missing information', description: null }]) };
    function Workspace() {
      const [record, setRecord] = useState(current);
      return <OpportunityServiceContext.Provider value={service}><ReviewActions opportunity={record} onSaved={setRecord} /></OpportunityServiceContext.Provider>;
    }
    render(<Workspace />);
    const dialog = openDecision(label);
    await selectHoldReason(dialog);
    fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Waiting for details.' } });
    confirmReview(dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const selectedHold = screen.getByRole('button', { name: label, pressed: true });
    expect(selectedHold).toBeDisabled();
    expect(selectedHold).toHaveClass('shadow-inner', 'text-amber-700');
    fireEvent.click(selectedHold);
    expect(service.decide).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: next })).toBeEnabled();
    expect(warning).not.toHaveBeenCalled();
    cleanup();
    mount(saved);
    expect(screen.queryByRole('status', { name: 'Action status' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: label, pressed: true })).toBeDisabled();
  });

  it('uses raw stage and server permissions without requiring a package revision', () => {
    mount(salesReview({ state: 'GATE1_PENDING', allowedActions: ['SALES_APPROVE', 'SALES_HOLD', 'GATE1_GO'] }));
    expect(screen.getByRole('button', { name: 'Approve & Send to CEO' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On Hold' })).toBeInTheDocument();
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

  it.each([
    ['SALES_APPROVE', 'Approve & Send to CEO', 2, 4],
    ['SALES_HOLD', 'On Hold', 1, 3],
    ['SALES_REJECT', 'Reject Opportunity', 9, 15],
  ] as const)('keeps %s usable immediately after requesting changes and after reopening', async (action, label, stageId, subStageId) => {
    const current = salesReview({ allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'SALES_REJECT'] });
    const returned = salesReview({ subStageId: 2, allowedActions: ['EDIT', 'SALES_APPROVE', 'SALES_HOLD', 'SALES_REJECT'] });
    const saved = salesReview({ stageId, subStageId, allowedActions: [] });
    const decide = vi.fn<OpportunityService['decide']>().mockResolvedValueOnce(returned).mockResolvedValueOnce(saved);
    const { onSaved, rerender } = mount(current, decide);
    const changes = openDecision('Request Changes');
    fireEvent.change(changes.getByRole('textbox'), { target: { value: 'Correct the scope.' } });
    confirmReview(changes);
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(returned));
    rerender(returned);
    expect(screen.getByRole('button', { name: 'Request Changes', pressed: true })).toHaveClass('shadow-inner');
    for (const name of ['Approve & Send to CEO', 'On Hold', 'Reject Opportunity']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }
    cleanup();
    const reopened = mount(returned, decide);
    expect(screen.getByRole('button', { name: 'Request Changes', pressed: true })).toBeDisabled();
    for (const name of ['Approve & Send to CEO', 'On Hold', 'Reject Opportunity']) {
      expect(screen.getByRole('button', { name })).toBeEnabled();
    }
    const dialog = openDecision(label);
    if (action !== 'SALES_APPROVE') {
      await selectHoldReason(dialog);
      fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Reviewed the details.' } });
    }
    confirmReview(dialog);
    await waitFor(() => expect(reopened.onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenLastCalledWith(expect.objectContaining({ decision: action, expectedStageId: 1, expectedSubStageId: 2 }));
    reopened.rerender(saved);
    if (stageId !== 1) expect(screen.queryByRole('button', { name: 'Approve & Send to CEO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Action status' })).not.toBeInTheDocument();
  });

  it('requires a reason code and description before retaining the saved Identified hold', async () => {
    const saved = salesReview({ subStageId: 3, holdReasonCodeId: 3, allowedActions: [] });
    const decide = vi.fn(async () => saved);
    const { onSaved } = mount(salesReview(), decide);
    const dialog = openDecision('On Hold');
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
    ['GATE1_GO', 'Approve Go', 3, 7],
    ['GATE1_HOLD', 'On Hold', 2, 6],
    ['GATE1_NO_GO', 'Reject Opportunity', 9, 16],
  ] as const)('keeps CEO action %s available for previously requested corrections without a Request Changes button', async (action, label, stageId, subStageId) => {
    const current = salesReview({ stageId: 2, subStageId: 4, allowedActions: ['GATE1_GO', 'GATE1_REQUEST_CHANGES', 'GATE1_HOLD', 'GATE1_NO_GO'] });
    const returned = { ...current, subStageId: 5, allowedActions: ['GATE1_GO', 'GATE1_HOLD', 'GATE1_NO_GO'] as OpportunityDetail['allowedActions'] };
    const saved = { ...current, stageId, subStageId, allowedActions: [] };
    const decide = vi.fn<OpportunityService['decide']>().mockResolvedValueOnce(saved);
    mount(returned, decide);
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    for (const name of ['Approve Go', 'On Hold', 'Reject Opportunity']) expect(screen.getByRole('button', { name })).toBeEnabled();
    cleanup();
    const reopened = mount(returned, decide);
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    for (const name of ['Approve Go', 'On Hold', 'Reject Opportunity']) expect(screen.getByRole('button', { name })).toBeEnabled();
    const dialog = openDecision(label);
    if (action !== 'GATE1_GO') {
      await selectHoldReason(dialog);
      fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Reviewed the scope.' } });
    }
    confirmReview(dialog);
    await waitFor(() => expect(reopened.onSaved).toHaveBeenCalledWith(saved));
    expect(decide).toHaveBeenLastCalledWith(expect.objectContaining({ decision: action, expectedStageId: 2, expectedSubStageId: 5 }));
    reopened.rerender(saved);
    if (stageId !== 2) expect(screen.queryByRole('button', { name: 'Approve Go' })).not.toBeInTheDocument();
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

  it('hides CEO Request Changes even when the server grants it and keeps permitted hold actions', () => {
    mount(salesReview({ stageId: 2, subStageId: 4, allowedActions: ['GATE1_REQUEST_CHANGES', 'GATE1_HOLD', 'SALES_APPROVE', 'GATE1_NO_GO'] }));
    expect(screen.queryByRole('button', { name: 'Request Changes' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On Hold' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve & Send to CEO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Decide No-Go' })).not.toBeInTheDocument();
  });

  it.each([
    { stageId: 3, subStageId: 7 }, { stageId: 4, subStageId: 8 },
    { stageId: 1, subStageId: null },
  ])('keeps unavailable actions disabled outside the review steps ($stageId / $subStageId)', ({ stageId, subStageId }) => {
    mount(salesReview({ stageId, subStageId, allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD', 'GATE1_GO', 'GATE1_REQUEST_CHANGES', 'GATE1_HOLD'] }));
    for (const button of screen.queryAllByRole('button')) expect(button).toBeDisabled();
  });

  it('retains a failed decision for retry and never publishes a synthetic update', async () => {
    const saved = salesReview({ subStageId: 3 });
    const decide = vi.fn<OpportunityService['decide']>().mockRejectedValueOnce(new Error('Approval permission was removed.')).mockResolvedValueOnce(saved);
    const { onSaved } = mount(salesReview(), decide);
    const dialog = openDecision('On Hold');
    await selectHoldReason(dialog);
    fireEvent.change(dialog.getByRole('textbox', { name: /Hold description/ }), { target: { value: 'Awaiting details.' } });
    confirmReview(dialog);
    expect(await dialog.findByRole('alert')).toHaveTextContent('Approval permission was removed.');
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(saved));
    expect(decide.mock.calls[1][0].idempotencyKey).toBe(decide.mock.calls[0][0].idempotencyKey);
  });

  it('makes actions available again when a new review cycle starts', () => {
    const { rerender } = mount(salesReview({ subStageId: 3, allowedActions: ['SALES_APPROVE', 'SALES_REQUEST_CHANGES'] }));
    expect(screen.getByRole('button', { name: 'On Hold', pressed: true })).toBeDisabled();
    rerender(salesReview());
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'On Hold' })).toBeEnabled();
  });

  it('does not show another Sales Head approval when a form save returns CEO corrections to review', () => {
    mount(salesReview({ stageId: 2, subStageId: 4, allowedActions: ['GATE1_GO', 'GATE1_REQUEST_CHANGES'], stageHistory: [
      { id: '2', stageId: 2, subStageId: 4, reachedAt: '2026-10-21T05:00:00Z' },
      { id: '1', stageId: 2, subStageId: 5, reachedAt: '2026-10-21T04:00:00Z' },
    ] }));
    expect(screen.queryByRole('button', { name: 'Approve & Send to CEO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { pressed: true })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve Go' })).toBeEnabled();
  });

  it('removes an open review dialog when the refreshed stage no longer permits any action', () => {
    const current = salesReview();
    const decide = vi.fn();
    const { rerender } = mount(current, decide);
    openDecision('Approve & Send to CEO');
    rerender({ ...current, stageId: 2, subStageId: 4 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
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
