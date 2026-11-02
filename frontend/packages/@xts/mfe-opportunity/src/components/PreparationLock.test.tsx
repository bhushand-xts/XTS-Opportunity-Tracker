import { MockedProvider } from '@apollo/client/testing';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { fixtureOpportunity } from '../testing/fixtures';
import { ScopeModule } from './PreparationModules';
import { ResponseWorkspace } from './ResponseWorkspace';
import { GET_PROPOSAL_SECTIONS, RfpPreparation } from './RfpPreparation';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import type { OpportunityService } from '../services/OpportunityService';

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const approvedOrClosedSteps = [[5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18], [10, 19]];
const preparationSteps = [[1, 2], [2, 5], [3, 7], [4, 8], [4, 9]];

it.each(approvedOrClosedSteps)('keeps answers visible and read-only at %s/%s despite stale edit grants', (stageId, subStageId) => {
  const opportunity = fixtureOpportunity({ stageId, subStageId, state: 'IN_PROGRESS' });
  const answer = vi.fn();
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, answer }}>
    <ResponseWorkspace opportunity={opportunity} onSaved={vi.fn()} />
  </OpportunityServiceContext.Provider>);
  const field = screen.getByRole('textbox', { name: 'Answer' });
  expect(field).toHaveValue('Saved initial answer.');
  expect(field).toHaveAttribute('readonly');
  fireEvent.change(field, { target: { value: 'Attempted edit' } });
  expect(field).toHaveValue('Saved initial answer.');
  expect(screen.queryByRole('button', { name: 'Save answer' })).not.toBeInTheDocument();
  expect(screen.getByText('RFP Q&A is read-only at this workflow stage.')).toBeVisible();
  expect(answer).not.toHaveBeenCalled();
});

it.each(preparationSteps)('allows a permitted answer edit before estimation approval at %s/%s', (stageId, subStageId) => {
  render(<ResponseWorkspace opportunity={fixtureOpportunity({ stageId, subStageId })} onSaved={vi.fn()} />);
  const field = screen.getByRole('textbox', { name: 'Answer' });
  expect(field).not.toHaveAttribute('readonly');
  fireEvent.change(field, { target: { value: 'Revised before approval' } });
  expect(field).toHaveValue('Revised before approval');
  expect(screen.getByRole('button', { name: 'Save answer' })).toBeEnabled();
});

it('locks an open answer editor when the approved opportunity arrives and displays the saved answer', async () => {
  const opportunity = fixtureOpportunity({ stageId: 3, subStageId: 7 });
  const view = render(<ResponseWorkspace opportunity={opportunity} onSaved={vi.fn()} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Answer' }), { target: { value: 'Unsaved answer' } });
  expect(screen.getByRole('button', { name: 'Save answer' })).toBeEnabled();
  view.rerender(<ResponseWorkspace opportunity={{ ...opportunity, stageId: 5, subStageId: 10 }} onSaved={vi.fn()} />);
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveValue('Saved initial answer.'));
  expect(screen.getByRole('textbox', { name: 'Answer' })).toHaveAttribute('readonly');
  expect(screen.queryByRole('button', { name: 'Save answer' })).not.toBeInTheDocument();
});

it.each(approvedOrClosedSteps)('removes all scope and assessment mutations at %s/%s while retaining saved data', (stageId, subStageId) => {
  const opportunity = fixtureOpportunity({ stageId, subStageId, allowedActions: ['EDIT_SCOPE'] });
  const saveScope = vi.fn();
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}>
    <ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={false} />
  </OpportunityServiceContext.Provider>);
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toHaveValue(opportunity.scope!.summary);
  expect(screen.getByText(opportunity.scope!.risks[0].description)).toBeVisible();
  expect(screen.getByText(opportunity.scope!.alignment[0].text)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Save scope|Remove |Add|severity/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: /Add risk|Add alignment/ })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Scope & Assessment is read-only');
  expect(saveScope).not.toHaveBeenCalled();
});

it.each(preparationSteps)('allows scope, alignment and risk edits before estimation approval at %s/%s', async (stageId, subStageId) => {
  const opportunity = fixtureOpportunity({ stageId, subStageId, allowedActions: ['EDIT_SCOPE'] });
  const saveScope = vi.fn(async ({ scope }: Parameters<OpportunityService['saveScope']>[0]) => ({ ...opportunity, scope }));
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}>
    <ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={false} />
  </OpportunityServiceContext.Provider>);
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toBeEnabled();
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toBeEnabled();
  const summary = screen.getByRole('textbox', { name: 'Scope summary' });
  expect(summary).toBeEnabled();
  fireEvent.change(summary, { target: { value: 'Scope revised before approval' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save scope' }));
  await waitFor(() => expect(saveScope).toHaveBeenCalledWith(expect.objectContaining({
    scope: expect.objectContaining({ summary: 'Scope revised before approval' }),
  })));
});

it('persists alignment and risk additions while CEO estimation approval is pending', async () => {
  const opportunity = fixtureOpportunity({ stageId: 4, subStageId: 8, allowedActions: ['EDIT_SCOPE'] });
  const saveScope = vi.fn(async ({ scope }: Parameters<OpportunityService['saveScope']>[0]) => ({ ...opportunity, scope }));
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}>
    <ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={false} />
  </OpportunityServiceContext.Provider>);
  const alignment = screen.getByRole('textbox', { name: 'Add alignment item' });
  fireEvent.change(alignment, { target: { value: 'Confirm delivery alignment' } });
  fireEvent.keyDown(alignment, { key: 'Enter' });
  await waitFor(() => expect(saveScope).toHaveBeenCalledWith(expect.objectContaining({ scope: expect.objectContaining({
    alignment: expect.arrayContaining([expect.objectContaining({ text: 'Confirm delivery alignment' })]),
  }) })));
  const risk = screen.getByRole('textbox', { name: 'Add risk' });
  await waitFor(() => expect(risk).toBeEnabled());
  fireEvent.change(risk, { target: { value: 'Review deployment risk' } });
  fireEvent.keyDown(risk, { key: 'Enter' });
  await waitFor(() => expect(saveScope).toHaveBeenCalledWith(expect.objectContaining({ scope: expect.objectContaining({
    alignment: expect.arrayContaining([expect.objectContaining({ text: 'Confirm delivery alignment' })]),
    risks: expect.arrayContaining([expect.objectContaining({ description: 'Review deployment risk' })]),
  }) })));
});

it('keeps assessment editing restricted when no edit action is granted before approval', () => {
  render(<ScopeModule opportunity={fixtureOpportunity({ stageId: 4, subStageId: 8, allowedActions: [] })} onSaved={vi.fn()} readOnly={false} />);
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  expect(screen.queryByRole('textbox', { name: 'Add risk' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Add alignment item' })).not.toBeInTheDocument();
});

it('replaces an unsaved scope draft with the approved scope when the stage advances', async () => {
  const opportunity = fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: ['EDIT_SCOPE'] });
  const view = render(<ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={false} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Scope summary' }), { target: { value: 'Unsaved scope draft' } });
  expect(screen.getByRole('button', { name: 'Save scope' })).toBeEnabled();
  view.rerender(<ScopeModule opportunity={{ ...opportunity, stageId: 5, subStageId: 10 }} onSaved={vi.fn()} readOnly={false} />);
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Scope summary' })).toHaveValue(opportunity.scope!.summary));
  expect(screen.getByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save scope' })).not.toBeInTheDocument();
});

it('disables RFP question, type, and document changes in the opportunity edit form after estimation approval', async () => {
  const saved = fixtureOpportunity({ stageId: 5, subStageId: 10, allowedActions: ['EDIT'] });
  const form = { ...saved.form, rfp: { ...saved.form.rfp, type: 'GENERIC' as const } };
  const setForm = vi.fn();
  render(<MockedProvider mocks={[{ request: { query: GET_PROPOSAL_SECTIONS }, result: { data: { rfpQuestionsList: [] } } }]}>
    <RfpPreparation form={form} setForm={setForm} saved={saved} disabled={false} />
  </MockedProvider>);
  expect(screen.getByRole('button', { name: /Questionnaire-based/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Generic RFP/ })).toBeDisabled();
  expect(screen.getByLabelText('Question 1 text')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Remove question 1' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Add question/i })).toBeDisabled();
  expect(screen.getByLabelText('Source document / brief')).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Question 1 text'), { target: { value: 'Attempted question replacement' } });
  expect(setForm).not.toHaveBeenCalled();
  expect(screen.getByText('RFP preparation is read-only at this workflow stage.')).toBeVisible();
  await waitFor(() => expect(screen.queryByText('Loading proposal sections...')).not.toBeInTheDocument());
});

it.each([8, 9])('allows permitted RFP changes while estimation approval is at 4/%s', async subStageId => {
  const saved = fixtureOpportunity({ stageId: 4, subStageId, allowedActions: ['EDIT'] });
  const form = { ...saved.form, rfp: { ...saved.form.rfp, type: 'GENERIC' as const } };
  const setForm = vi.fn();
  render(<MockedProvider mocks={[{ request: { query: GET_PROPOSAL_SECTIONS }, result: { data: { rfpQuestionsList: [] } } }]}>
    <RfpPreparation form={form} setForm={setForm} saved={saved} disabled={false} />
  </MockedProvider>);
  expect(screen.getByRole('button', { name: /Questionnaire-based/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Generic RFP/ })).toBeEnabled();
  expect(screen.getByLabelText('Source document / brief')).toBeEnabled();
  fireEvent.change(screen.getByLabelText('Question 1 text'), { target: { value: 'Revised before approval' } });
  expect(setForm).toHaveBeenCalledOnce();
  await waitFor(() => expect(screen.queryByText('Loading proposal sections...')).not.toBeInTheDocument());
});
