import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { OpportunityDetail } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService, type OpportunityService } from '../services/OpportunityService';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';
import { GET_ESTIMATION_MASTERS } from '../services/estimationMasters.queries';

beforeEach(() => vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function mount(opportunity: OpportunityDetail, tab: string, edit = true) {
  const detail = vi.fn(async () => opportunity);
  const saveEstimationVersion = vi.fn<NonNullable<OpportunityService['saveEstimationVersion']>>(async command => ({
    opportunity: { ...opportunity, estimation: { ...command.estimation, revision: command.estimation.revision + 1 } },
    version: { id: '1', revision: 1, version: 1, name: command.name, status: 'SAVED', isSelected: false, currencyCode: 'USD', personWeeks: '2', createdBy: 7, createdAt: '2026-11-03T00:00:00Z', estimation: command.estimation },
  }));
  const saveScope = vi.fn<OpportunityService['saveScope']>(async command => ({ ...opportunity, scope: { ...command.scope, revision: command.scope.revision + 1 }, revision: opportunity.revision + 1 }));
  const answer = vi.fn<OpportunityService['answer']>(async command => ({ ...opportunity, responses: opportunity.responses!.map(response => response.id === command.responseId ? { ...response, answer: command.answer, revision: response.revision + 1 } : response), revision: opportunity.revision + 1 }));
  const version = { id: '1', revision: 1, version: 1, name: 'Team estimate', status: 'SAVED' as const, isSelected: false, currencyCode: 'USD', personWeeks: '1', createdBy: 7, createdAt: '2026-11-04T00:00:00Z', estimation: opportunity.estimation! };
  const masters = { estimationPhasesList: [{ id: 1, phaseName: 'Discovery', phaseCode: 'DISC', displayOrder: 1, isActive: true }], rateMasters: [{ ratemasterId: 10, roleName: 'Engineer', roleCode: 'ENG', currencyId: 1, rateType: 'Monthly', defaultRate: 4000, isActive: true }], currencies: [{ currencyId: 1, currencyCode: 'USD', currencySymbol: '$', isActive: true }] };
  render(<MockedProvider mocks={[{ request: { query: GET_ESTIMATION_MASTERS }, result: { data: masters }, maxUsageCount: 100 }]}><OpportunityServiceContext.Provider value={{ ...productionOpportunityService, detail, saveScope, answer, saveEstimationVersion, estimationVersions: vi.fn(async () => opportunity.estimation ? [version] : []), estimationVersion: vi.fn(async () => version), negotiationReasons: vi.fn(async () => []) }}>
    <OpportunityAccessContext.Provider value={{ userId: '101', view: true, pipeline: true, add: false, edit, work: false, approvals: true }}>
      <MemoryRouter initialEntries={[`/opportunity/401/review?tab=${tab}`]}><Routes>
        <Route path="/opportunity/:id/review" element={<OpportunityDetailsPage review />} />
      </Routes></MemoryRouter>
    </OpportunityAccessContext.Provider>
  </OpportunityServiceContext.Provider></MockedProvider>);
  return { detail, saveScope, answer, saveEstimationVersion };
}

it.each([[3, 7], [4, 8], [4, 9]])('allows Estimation Team with an estimation grant to edit on the review page without generic Edit or My Work permission at %s/%s', async (stageId, subStageId) => {
  const grid = { phaseIds: [1], roleCodes: ['ENG'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'ENG', effort: '1' }] };
  const opportunity = fixtureOpportunity({ stageId, subStageId, currencyCode: 'USD', allowedActions: ['EDIT_ESTIMATION'], estimation: { revision: 1, rows: [], assumptions: '', total: '0', grid } });
  const { saveEstimationVersion } = mount(opportunity, 'estimation', false);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Team estimate version 1' }));
  const duration = await screen.findByRole('spinbutton', { name: 'Discovery duration in weeks' });
  expect(duration).toBeEnabled();
  fireEvent.change(duration, { target: { value: '2' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Estimation name' }), { target: { value: 'Review update' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ estimation: expect.objectContaining({ grid: expect.objectContaining({ durations: [{ phaseId: 1, weeks: '2' }] }) }) })));
});

it.each([[4, 5], [5, 10], [6, 12], [9, 17]])('locks estimation after approval or closure on the review page at %s/%s despite a stale edit grant', async (stageId, subStageId) => {
  const { saveEstimationVersion } = mount(fixtureOpportunity({ stageId, subStageId, allowedActions: ['EDIT_ESTIMATION'] }), 'estimation');
  expect(await screen.findByRole('button', { name: /select phases/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /select technical roles/i })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save Estimation' })).not.toBeInTheDocument();
  expect(saveEstimationVersion).not.toHaveBeenCalled();
});

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
