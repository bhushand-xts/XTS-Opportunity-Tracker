import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Estimation, OpportunityDetail } from '@xts/api-contracts';
import { fixtureOpportunity } from '../testing/fixtures';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { GET_ESTIMATION_MASTERS } from '../services/estimationMasters.queries';
import { EstimationModule, ScopeModule } from './PreparationModules';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const mastersData = {
  estimationPhasesList: [{ id: 1, phaseName: 'Discovery & Design', phaseCode: 'DISC', displayOrder: 1, isActive: true }],
  rateMasters: [{ ratemasterId: 10, roleName: 'Project Manager', roleCode: 'PM', currencyId: 1, rateType: 'Monthly', defaultRate: 4000, isActive: true }],
  currencies: [{ currencyId: 1, currencyCode: 'USD', currencySymbol: '$', isActive: true }],
};
const mastersMock = { request: { query: GET_ESTIMATION_MASTERS }, result: { data: mastersData }, maxUsageCount: 100 };
function withProviders(children: React.ReactNode) { return <MockedProvider mocks={[mastersMock]}>{children}</MockedProvider>; }
const initial = () => fixtureOpportunity({ stageId: 3, subStageId: 7, state: 'IN_PROGRESS', estimation: null, allowedActions: ['EDIT_ESTIMATION', 'SUBMIT_ESTIMATE'] });

it('lets Estimation Team select a phase/role, enter duration & allocation, and save the computed estimate, then submit the saved revision to CEO', async () => {
  const start = initial();
  const saveEstimation = vi.fn(async ({ estimation }: { estimation: Estimation }) => ({ ...start, estimation: { ...estimation, revision: 1 } }));
  const decide = vi.fn(async () => ({ ...start, stageId: 4, subStageId: 8, allowedActions: [] } as OpportunityDetail));
  function Workspace() {
    const [record, setRecord] = useState(start);
    return <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimation, decide }}><EstimationModule opportunity={record} onSaved={setRecord} readOnly={false} /></OpportunityServiceContext.Provider>;
  }
  // Radix's menu trigger only opens on a real pointerdown→pointerup→click sequence, which needs
  // userEvent (fireEvent.click alone won't open it) — but opening via userEvent is slow in this
  // environment, hence the generous test timeout below. Once a menu is open, selecting an item
  // is a plain fireEvent.click (fast, and avoids userEvent re-driving the whole pointer sequence
  // on a Radix CheckboxItem that intentionally stays open via onSelect preventDefault).
  const user = userEvent.setup({ delay: null });
  render(withProviders(<Workspace />));

  await user.click(await screen.findByRole('button', { name: /select phases/i }));
  fireEvent.click(await screen.findByText('Discovery & Design'));
  // The menu is still open (its checkbox items intentionally stay open after a selection) and,
  // as an open Radix menu, hides the rest of the page from accessibility queries — close it
  // (scoped to the menu itself, since the selected label now also appears elsewhere once a
  // phase/role is active) before interacting with the next dropdown.
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await user.click(await screen.findByRole('button', { name: /select technical roles/i }));
  fireEvent.click(await screen.findByText('Project Manager'));
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

  // Duration in week : 2, Resource Allocation : 0.25 -> Person-week 0.5 -> cost (4000/20)*(0.5*5) = 500.
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' }), { target: { value: '2' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design — Project Manager resource allocation' }), { target: { value: '0.25' } });
  // "0.5" (the computed person-week) appears in more than one cell (row total, column total,
  // grand total all coincide at this single phase/role), so assert with getAllByText rather
  // than the singular getByText/findByText, which throw on more than one match.
  await waitFor(() => expect(screen.getAllByText('0.5').length).toBeGreaterThan(0));

  expect(screen.queryByRole('button', { name: 'Submit Estimation to CEO' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save estimation' }));
  await waitFor(() => expect(saveEstimation).toHaveBeenCalledWith(expect.objectContaining({ estimation: expect.objectContaining({ total: '500.00' }) })));
  fireEvent.click(await screen.findByRole('button', { name: 'Submit Estimation to CEO' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
  await waitFor(() => expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SUBMIT_ESTIMATE', expectedStageId: 3, expectedSubStageId: 7 })));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save estimation' })).not.toBeInTheDocument());
}, 180000);

it('keeps estimation read-only once the opportunity has moved past preparation, even if an old edit action is present', async () => {
  render(withProviders(<OpportunityServiceContext.Provider value={productionOpportunityService}><EstimationModule opportunity={{ ...initial(), stageId: 4, subStageId: 8, state: 'GATE1_PENDING' }} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>));
  expect(await screen.findByRole('button', { name: /select phases/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /select technical roles/i })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save estimation' })).not.toBeInTheDocument();
});

const scopeOpportunity = (summary: string) => fixtureOpportunity({ stageId: 3, subStageId: 7, allowedActions: ['EDIT_SCOPE'], scope: { revision: 1, summary, alignment: [{ id: '1', text: 'Tech stack' }], risks: [{ id: '2', description: 'Tight deadline', severity: 'HIGH' }] } });
function renderScope(opportunity: OpportunityDetail, saveScope = vi.fn(async () => opportunity)) {
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveScope }}><ScopeModule opportunity={opportunity} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>);
  return saveScope;
}

it('blocks duplicate alignment and risk additions with an inline hint instead of saving', () => {
  const saveScope = renderScope(scopeOpportunity('Scope'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Add alignment item' }), { target: { value: '  tech   STACK ' } });
  expect(screen.getByText('This alignment item is already listed.')).toBeInTheDocument();
  expect(within(screen.getByRole('textbox', { name: 'Add alignment item' }).parentElement!).getByRole('button', { name: 'Add' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Add risk' }), { target: { value: 'tight deadline' } });
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Add risk' }), { key: 'Enter' });
  expect(screen.getByText('This risk is already listed.')).toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
});

it('requires a scope that was never saved, with an inline hint', () => {
  const saveScope = renderScope(scopeOpportunity(''));
  fireEvent.click(screen.getByRole('button', { name: 'Save scope' }));
  expect(screen.getByText('Scope is required.')).toBeInTheDocument();
  expect(saveScope).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Scope summary' }), { target: { value: 'D' } });
  expect(screen.queryByText('Scope is required.')).not.toBeInTheDocument();
});

it('removes a previously saved scope after confirmation', async () => {
  const saveScope = renderScope(scopeOpportunity('Old scope'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Scope summary' }), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Remove scope' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
  await waitFor(() => expect(saveScope).toHaveBeenCalledWith(expect.objectContaining({ scope: expect.objectContaining({ summary: '' }) })));
  expect(screen.queryByText('Scope is required.')).not.toBeInTheDocument();
});
