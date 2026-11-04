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


const savedEstimate = (start: OpportunityDetail, estimation: Estimation) => savedVersionResult(start, estimation, estimation.revision).version;
const completeSaved = (): Estimation => ({ revision: 1, assumptions: '', total: '400.00', rows: [{ id: 'grid-1-PM', workItem: 'Discovery & Design ? Project Manager', hours: '20', people: 1, hourlyRate: '20' }], grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.25' }] } });
async function selectSaved(name = 'Select Baseline version 1 for CEO review') {
  await screen.findByRole('radio', { name });
  await waitFor(() => {
    fireEvent.click(screen.getByRole('radio', { name }));
    expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toBeInTheDocument();
  });
}
it('starts blank on entry and re-entry rather than silently restoring the last working estimate', async () => {
  const start = { ...initial(), estimation: completeSaved() };
  const version = savedEstimate(start, start.estimation);
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [version]) };
  const view = () => withProviders(<OpportunityServiceContext.Provider value={service}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>);
  const first = render(view());
  await screen.findByRole('radio');
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.getByRole('radio')).not.toBeChecked();
  expect(screen.getByRole('button', { name: 'Submit Estimation to CEO' })).toBeDisabled();
  await selectSaved();
  expect(screen.getByRole('radio')).toBeChecked();
  first.unmount();
  render(view());
  await screen.findByRole('radio');
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(screen.getByRole('radio')).not.toBeChecked();
});
it('loads the selected saved snapshot, shows matching totals, and updates the same estimate before resetting', async () => {
  const start = { ...initial(), estimation: completeSaved() };
  const version = savedEstimate(start, start.estimation);
  const saveEstimationVersion = vi.fn(async ({ estimation }: { estimation: Estimation }) => savedVersionResult(start, estimation, 2));
  const service = { ...productionOpportunityService, saveEstimationVersion, estimationVersions: vi.fn(async () => [version]) };
  render(withProviders(<OpportunityServiceContext.Provider value={service}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  await selectSaved();
  const actions = within(screen.getByRole('region', { name: 'Estimation actions' }));
  const matrix = within(screen.getByRole('region', { name: 'Estimation matrix' }));
  expect(screen.getByRole('radio')).toBeChecked();
  expect(actions.getByRole('textbox', { name: 'Estimation name' })).toHaveValue('Baseline');
  expect(within(screen.getByRole('group', { name: 'Estimation totals' })).getByText(/Total estimated value/)).toHaveTextContent('400.00');
  expect(within(screen.getByRole('group', { name: 'Estimation totals' })).getByText(/Total effort/)).toHaveTextContent('0.5 person-weeks');
  const row = within(matrix.getByRole('row', { name: /Discovery & Design/ }));
  expect(row.getAllByRole('cell')[7]).toHaveTextContent('400.00');
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' }), { target: { value: '4' } });
  fireEvent.change(screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ }), { target: { value: '0.5' } });
  expect(within(screen.getByRole('group', { name: 'Estimation totals' })).getByText(/Total estimated value/)).toHaveTextContent('2,000.00');
  fireEvent.click(actions.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ sourceVersionId: '1', estimation: expect.objectContaining({ revision: 1, total: '2000.00', rows: [expect.objectContaining({ hours: '80', hourlyRate: '25.0000' })] }) })));
  await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(1));
  expect(screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ })).toHaveValue(0);
  expect(screen.getByRole('radio')).not.toBeChecked();
});
it('does not warn when viewing a saved estimate but protects actual edits and recognizes reverting them', async () => {
  const start = { ...initial(), estimation: completeSaved() };
  const version = savedEstimate(start, start.estimation);
  const navigate = vi.fn();
  function SwitchTab() { const confirm = useUnsaved(false); return <button onClick={async () => { if (await confirm()) navigate(); }}>Switch tab</button>; }
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [version]) };
  render(<MemoryRouter><UnsavedProvider>{withProviders(<OpportunityServiceContext.Provider value={service}><SwitchTab /><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>)}</UnsavedProvider></MemoryRouter>);
  await selectSaved();
  const duration = screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  fireEvent.click(screen.getByRole('button', { name: 'Switch tab' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.change(duration, { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Switch tab' }));
  expect(await screen.findByRole('dialog', { name: 'Leave without saving?' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
  fireEvent.change(duration, { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Switch tab' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledTimes(2));
});
it('confirms before a different saved selection replaces unsaved matrix edits', async () => {
  const start = { ...initial(), estimation: completeSaved() };
  const first = savedEstimate(start, start.estimation);
  const second = { ...first, id: '2', version: 2, name: 'Alternative' };
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [first, second]) };
  render(withProviders(<OpportunityServiceContext.Provider value={service}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  await selectSaved();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('radio', { name: /Select Alternative/ }));
  expect(screen.getByLabelText(/Select Baseline/)).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(5);
  fireEvent.click(screen.getByRole('radio', { name: /Select Alternative/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Load estimate' }));
  expect(screen.getByRole('radio', { name: /Select Alternative/ })).toBeChecked();
  expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(2);
});
it('shows inline matrix errors on submission and clears them as fields are corrected', async () => {
  let readDraft: (() => Estimation) | null = null;
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '0' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '' }] };
  const start = { ...initial(), estimation: { revision: 1, rows: [], assumptions: '', total: '0.00', grid } };
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [savedEstimate(start, start.estimation)]) };
  render(withProviders(<OpportunityServiceContext.Provider value={service}><button onClick={() => readDraft?.()}>Check submission</button><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} registerDraft={reader => { readDraft = reader; }} /></OpportunityServiceContext.Provider>));
  await selectSaved();
  const duration = screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  const effort = screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ });
  fireEvent.click(screen.getByRole('button', { name: 'Check submission' }));
  expect(duration).toHaveAccessibleDescription('Enter weeks greater than 0.');
  expect(effort).toHaveAccessibleDescription('Enter effort (0 if unused).');
  fireEvent.change(duration, { target: { value: '2' } });
  fireEvent.change(effort, { target: { value: '0' } });
  expect(duration).toHaveAttribute('aria-invalid', 'false');
  expect(effort).toHaveAttribute('aria-invalid', 'false');
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
