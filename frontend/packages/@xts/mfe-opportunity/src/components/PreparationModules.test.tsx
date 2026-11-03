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
import { toast } from 'sonner';
import { MemoryRouter } from 'react-router-dom';
import { UnsavedProvider, useUnsaved } from '../hooks/useUnsaved';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const mastersData = {
  estimationPhasesList: [{ id: 1, phaseName: 'Discovery & Design', phaseCode: 'DISC', displayOrder: 1, isActive: true }],
  rateMasters: [{ ratemasterId: 10, roleName: 'Project Manager', roleCode: 'PM', currencyId: 1, rateType: 'Monthly', defaultRate: 4000, isActive: true }],
  currencies: [{ currencyId: 1, currencyCode: 'USD', currencySymbol: '$', isActive: true }],
};
const mastersMock = { request: { query: GET_ESTIMATION_MASTERS }, result: { data: mastersData }, maxUsageCount: 100 };
function withProviders(children: React.ReactNode) { return <MockedProvider mocks={[mastersMock]}>{children}</MockedProvider>; }
const initial = () => fixtureOpportunity({ stageId: 3, subStageId: 7, state: 'IN_PROGRESS', estimation: null, allowedActions: ['EDIT_ESTIMATION', 'SUBMIT_ESTIMATE'] });

function savedVersionResult(start: OpportunityDetail, estimation: Estimation, revision: number) {
  const saved = { ...estimation, revision };
  return { opportunity: { ...start, estimation: saved }, version: { id: '1', version: 1, name: 'Baseline', status: 'SAVED' as const, currencyCode: start.currencyCode, personWeeks: '1', createdBy: 1, createdAt: '2026-11-03T00:00:00Z', estimation: saved } };
}


it('combines allocation, effort and cost without changing calculations or the saved payload', async () => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.25' }] };
  const start = { ...initial(), estimation: { revision: 1, rows: [], assumptions: '', total: '0.00', grid } };
  const saveEstimationVersion = vi.fn(async ({ estimation }: { estimation: Estimation }) => savedVersionResult(start, estimation, 2));
  render(withProviders(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimationVersion, estimationVersions: vi.fn(async () => []) }}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  const duration = await screen.findByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  const matrix = within(screen.getByRole('region', { name: 'Estimation matrix' }));
  expect(matrix.getAllByRole('table')).toHaveLength(1);
  expect(matrix.getByRole('columnheader', { name: 'Resource allocation' })).toHaveAttribute('colspan', '1');
  expect(matrix.getByRole('columnheader', { name: 'Person-weeks' })).toHaveAttribute('colspan', '2');
  const row = within(matrix.getByRole('row', { name: /Discovery & Design/ }));
  expect(row.getAllByRole('cell')[4]).toHaveTextContent('0.5');
  expect(row.getAllByRole('cell')[7]).toHaveTextContent('500.00');
  fireEvent.change(duration, { target: { value: '4' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ }), { target: { value: '0.5' } });
  expect(row.getAllByRole('cell')[4]).toHaveTextContent('2');
  expect(row.getAllByRole('cell')[7]).toHaveTextContent('2,000.00');
  fireEvent.change(screen.getByRole('textbox', { name: 'Estimation name' }), { target: { value: 'Baseline' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Estimation' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ estimation: expect.objectContaining({ total: '2000.00', rows: [expect.objectContaining({ id: 'grid-1-PM', hours: '80', people: 1, hourlyRate: '25.0000' })], grid: { ...grid, durations: [{ phaseId: 1, weeks: '4' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.5' }] } }) })));
  await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(1));
  expect(screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ })).toHaveValue(0);
  expect(screen.getAllByRole('columnheader', { name: 'PM' })).toHaveLength(3);
});

it('groups named save and submission without a separate draft action and requires a saved selection before submission', async () => {
  const notify = vi.spyOn(toast, 'error').mockImplementation(() => 'validation');
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] };
  const start = { ...initial(), estimation: { revision: 1, rows: [], assumptions: '', total: '0.00', grid } };
  render(withProviders(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, estimationVersions: vi.fn(async () => []) }}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>));
  const duration = await screen.findByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  const actions = within(screen.getByRole('region', { name: 'Estimation actions' }));
  expect(actions.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  expect(actions.getByRole('button', { name: 'Save Estimation' })).toBeDisabled();
  expect(actions.getByRole('button', { name: 'Submit Estimation to CEO' })).toBeDisabled();
  fireEvent.change(duration, { target: { value: '0' } });
  fireEvent.click(actions.getByRole('button', { name: 'Submit Estimation to CEO' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(duration).toHaveAttribute('aria-invalid', 'false');
  expect(screen.getAllByRole('button', { name: 'Submit Estimation to CEO' })).toHaveLength(1);
  notify.mockRestore();
});

it.each(['legacy', 'saved grid'])('does not warn on opening a %s estimate, but protects actual edits and recognizes reverting them', async kind => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.5' }] };
  const start = { ...initial(), estimation: { revision: 1, rows: [{ id: 'grid-1-PM', workItem: 'Old master label', hours: '40.0000', people: 1, hourlyRate: '20.0000' }], assumptions: '', total: '800.00', ...(kind === 'saved grid' ? { grid } : {}) } };
  const navigate = vi.fn();
  function SwitchTab() {
    const confirm = useUnsaved(false);
    return <button onClick={async () => { if (await confirm()) navigate(); }}>Switch tab</button>;
  }
  render(<MemoryRouter><UnsavedProvider>{withProviders(<OpportunityServiceContext.Provider value={productionOpportunityService}><SwitchTab /><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>)}</UnsavedProvider></MemoryRouter>);
  const duration = await screen.findByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  const original = (duration as HTMLInputElement).value;
  fireEvent.click(screen.getByRole('button', { name: 'Switch tab' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.change(duration, { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Switch tab' }));
  expect(await screen.findByRole('dialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  expect(navigate).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  fireEvent.change(duration, { target: { value: original } });
  fireEvent.click(screen.getByRole('button', { name: 'Switch tab' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('shows inline matrix errors on submission and clears them as fields are corrected', async () => {
  let readDraft: (() => Estimation) | null = null;
  const registerDraft = (reader: (() => Estimation) | null) => { readDraft = reader; };
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '0' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '' }] };
  const start = { ...initial(), estimation: { revision: 1, rows: [], assumptions: '', total: '0.00', grid } };
  render(withProviders(<OpportunityServiceContext.Provider value={productionOpportunityService}><button onClick={() => readDraft?.()}>Check submission</button><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} registerDraft={registerDraft} /></OpportunityServiceContext.Provider>));
  const duration = await screen.findByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  const effort = screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ });
  expect(screen.queryByText('Enter weeks greater than 0.')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Check submission' }));
  expect(duration).toHaveAttribute('aria-invalid', 'true');
  expect(duration).toHaveAccessibleDescription('Enter weeks greater than 0.');
  expect(effort).toHaveAccessibleDescription('Enter effort (0 if unused).');
  fireEvent.change(duration, { target: { value: '2' } });
  fireEvent.change(effort, { target: { value: '0' } });
  expect(duration).toHaveAttribute('aria-invalid', 'false');
  expect(effort).toHaveAttribute('aria-invalid', 'false');
  expect(screen.queryByText('Enter weeks greater than 0.')).not.toBeInTheDocument();
  expect(screen.queryByText('Enter effort (0 if unused).')).not.toBeInTheDocument();
});

it('restores an existing incomplete draft without offering a separate draft save', async () => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '' }] };
  const start = { ...initial(), estimation: { revision: 1, status: 'DRAFT' as const, rows: [], assumptions: 'Continue later', total: '0.00', grid } };
  const decide = vi.fn();
  render(withProviders(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, decide, estimationVersions: vi.fn(async () => []) }}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  expect(await screen.findByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(2);
  expect(screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ })).toHaveValue(null);
  expect(screen.queryByRole('button', { name: 'Save Draft' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save Estimation' })).toBeDisabled();
  expect(decide).not.toHaveBeenCalled();
});

it('lets Estimation Team select a phase/role, enter duration & allocation, and save the computed estimate, then submit the saved revision to CEO', async () => {
  const start = initial();
  const saveEstimationVersion = vi.fn(async ({ estimation }: { estimation: Estimation }) => savedVersionResult(start, estimation, 1));
  const decide = vi.fn(async () => ({ ...start, stageId: 4, subStageId: 8, allowedActions: [] } as OpportunityDetail));
  function Workspace() {
    const [record, setRecord] = useState(start);
    return <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimationVersion, decide, estimationVersions: vi.fn(async () => [{ ...savedVersionResult(start, record.estimation ?? { revision: 0, rows: [], assumptions: '', total: '0' }, 1).version }]) }}><EstimationModule opportunity={record} onSaved={setRecord} readOnly={false} /></OpportunityServiceContext.Provider>;
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
  fireEvent.click(await screen.findByText('PM'));
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

  // Duration in week : 2, Resource Allocation : 0.25 -> Person-week 0.5 -> cost (4000/20)*(0.5*5) = 500.
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' }), { target: { value: '2' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design — Project Manager resource allocation' }), { target: { value: '0.25' } });
  // "0.5" (the computed person-week) appears in more than one cell (row total, column total,
  // grand total all coincide at this single phase/role), so assert with getAllByText rather
  // than the singular getByText/findByText, which throw on more than one match.
  await waitFor(() => expect(screen.getAllByText('0.5').length).toBeGreaterThan(0));

  expect(screen.getByRole('button', { name: 'Submit Estimation to CEO' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Estimation name' }), { target: { value: 'Baseline' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Estimation' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ estimation: expect.objectContaining({ total: '500.00' }) })));
  fireEvent.click(await screen.findByRole('radio', { name: /Select Baseline version 1/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Submit Estimation to CEO' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
  await waitFor(() => expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SUBMIT_ESTIMATE', expectedStageId: 3, expectedSubStageId: 7 })));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Save Estimation' })).not.toBeInTheDocument());
}, 180000);

it('keeps estimation read-only once the opportunity has moved past preparation, even if an old edit action is present', async () => {
  render(withProviders(<OpportunityServiceContext.Provider value={productionOpportunityService}><EstimationModule opportunity={{ ...initial(), stageId: 4, subStageId: 8, state: 'GATE1_PENDING' }} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>));
  expect(await screen.findByRole('button', { name: /select phases/i })).toBeDisabled();
  expect(screen.getByRole('button', { name: /select technical roles/i })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Save Estimation' })).not.toBeInTheDocument();
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
