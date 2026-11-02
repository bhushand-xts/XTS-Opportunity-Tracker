import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { OpportunityDetail } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService, type OpportunityService } from '../services/OpportunityService';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(opportunity: OpportunityDetail, tab: string) {
  const detail = vi.fn(async () => opportunity);
  const saveScope = vi.fn<OpportunityService['saveScope']>(async command => ({ ...opportunity, scope: { ...command.scope, revision: command.scope.revision + 1 }, revision: opportunity.revision + 1 }));
  const answer = vi.fn<OpportunityService['answer']>(async command => ({ ...opportunity, responses: opportunity.responses!.map(response => response.id === command.responseId ? { ...response, answer: command.answer, revision: response.revision + 1 } : response), revision: opportunity.revision + 1 }));
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, detail, saveScope, answer }}>
    <OpportunityAccessContext.Provider value={{ userId: '101', view: true, pipeline: true, add: false, edit: true, work: false, approvals: true }}>
      <MemoryRouter initialEntries={[`/opportunity/401/review?tab=${tab}`]}><Routes>
        <Route path="/opportunity/:id/review" element={<OpportunityDetailsPage review />} />
      </Routes></MemoryRouter>
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider>);
  return { detail, saveScope, answer };
}

it.each([[4, 8], [4, 9]])('allows scope, alignment, and risk editing on the review page before approval at %s/%s', async (stageId, subStageId) => {
  const opportunity = fixtureOpportunity({ stageId, subStageId, allowedActions: ['EDIT_SCOPE'] });
  const { detail, saveScope } = mount(opportunity, 'scope');
  const field = await screen.findByRole('textbox', { name: 'Scope summary' });
  expect(field).toBeEnabled();
  expect(screen.getByRole('textbox', { name: 'Add alignment item' })).toBeEnabled();
  expect(screen.getByRole('textbox', { name: 'Add risk' })).toBeEnabled();
  expect(screen.queryByText('Available after CEO approval')).not.toBeInTheDocument();
  fireEvent.change(field, { target: { value: 'Updated before estimation approval.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save scope' }));
  await waitFor(() => expect(saveScope).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: opportunity.id, expectedRevision: opportunity.revision, scope: expect.objectContaining({ summary: 'Updated before estimation approval.' }) })));
  expect(detail).toHaveBeenCalledWith('401', expect.any(AbortSignal), 'REVIEW');
});

it.each([[4, 8], [4, 9]])('allows granted answers to be edited and saved on the review page before approval at %s/%s', async (stageId, subStageId) => {
  const opportunity = fixtureOpportunity({ stageId, subStageId });
  const { answer } = mount(opportunity, 'qa');
  const field = await screen.findByRole('textbox', { name: 'Answer' });
  expect(field).not.toHaveAttribute('readonly');
  expect(screen.queryByText('Available after CEO approval')).not.toBeInTheDocument();
  fireEvent.change(field, { target: { value: 'Updated answer before approval.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save answer' }));
  await waitFor(() => expect(answer).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: opportunity.id, responseId: '301', answer: 'Updated answer before approval.' })));
});

it('keeps all scope and assessment editing locked on the review page after approval despite stale grants', async () => {
  const opportunity = fixtureOpportunity({ stageId: 5, subStageId: 10, allowedActions: ['EDIT_SCOPE'] });
  const { saveScope } = mount(opportunity, 'scope');
  expect(await screen.findByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  expect(screen.queryByRole('textbox', { name: 'Add alignment item' })).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox', { name: 'Add risk' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save scope' })).not.toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
});

it('keeps answers read-only on the review page after approval despite stale grants', async () => {
  const { answer } = mount(fixtureOpportunity({ stageId: 5, subStageId: 10 }), 'qa');
  const field = await screen.findByRole('textbox', { name: 'Answer' });
  expect(field).toHaveAttribute('readonly');
  expect(field).toHaveValue('Saved initial answer.');
  expect(screen.queryByRole('button', { name: 'Save answer' })).not.toBeInTheDocument();
  expect(answer).not.toHaveBeenCalled();
});

it('still requires an edit grant for scope before approval on the review page', async () => {
  mount(fixtureOpportunity({ stageId: 4, subStageId: 8, allowedActions: [] }), 'scope');
  expect(await screen.findByRole('textbox', { name: 'Scope summary' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save scope' })).not.toBeInTheDocument();
});

it('keeps estimation gated until Go/No-Go approval', async () => {
  mount(fixtureOpportunity({ stageId: 1, subStageId: 2 }), 'estimation');
  expect(await screen.findByText('Available after CEO approval')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Save estimation' })).not.toBeInTheDocument();
});

it.each([[1, 2, 'qa'], [2, 4, 'qa'], [1, 2, 'scope'], [2, 4, 'scope']] as const)('keeps %s/%s %s closed with an availability message before CEO approval', async (stageId, subStageId, tab) => {
  const { saveScope, answer } = mount(fixtureOpportunity({ stageId, subStageId, allowedActions: ['EDIT_SCOPE'] }), tab);
  expect(await screen.findByText('Available after CEO approval')).toBeVisible();
  expect(screen.queryByRole('textbox', { name: tab === 'qa' ? 'Answer' : 'Scope summary' })).not.toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
  expect(answer).not.toHaveBeenCalled();
});
