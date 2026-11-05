import '@testing-library/jest-dom/vitest';
import { MockedProvider } from '@apollo/client/testing';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Estimation, EstimationVersion, OpportunityDetail } from '@xts/api-contracts';
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
  return { opportunity: { ...start, estimation: saved }, version: { id: '1', revision: 1, isSelected: false, version: 1, name: 'Baseline', status: 'SAVED' as const, currencyCode: 'USD', personWeeks: '1', createdBy: 1, createdAt: '2026-11-03T00:00:00Z', estimation: saved } };
}


const savedEstimate = (start: OpportunityDetail, estimation: Estimation) => savedVersionResult(start, estimation, estimation.revision).version;
const completeSaved = (): Estimation => ({ revision: 1, assumptions: '', total: '400.00', rows: [{ id: 'grid-1-PM', workItem: 'Discovery & Design ? Project Manager', hours: '20', people: 1, hourlyRate: '20' }], grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '0.25' }] } });
async function selectSaved(name = 'Select Baseline version 1 for CEO review') {
  const radio = await screen.findByRole('radio', { name });
  await waitFor(() => expect(radio).toBeEnabled());
  fireEvent.click(radio);
  await screen.findByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
}
it('starts blank on entry and re-entry rather than silently restoring the last working estimate', async () => {
  const start = { ...initial(), estimation: completeSaved() };
  const version = savedEstimate(start, start.estimation);
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [version]), estimationVersion: vi.fn(async () => version) };
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
  const service = { ...productionOpportunityService, saveEstimationVersion, estimationVersions: vi.fn(async () => [version]), estimationVersion: vi.fn(async () => version) };
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
  expect(within(screen.getByRole('group', { name: 'Estimation totals' })).getByText(/Total estimated value/)).toHaveTextContent('1,600.00');
  fireEvent.click(actions.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ sourceVersionId: '1', estimation: expect.objectContaining({ revision: 1, total: '1600.00', rows: [expect.objectContaining({ hours: '80', hourlyRate: '20.0000' })] }) })));
  await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(1));
  expect(screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ })).toHaveValue(0);
  expect(screen.getByRole('radio')).not.toBeChecked();
});
it('does not warn when viewing a saved estimate but protects actual edits and recognizes reverting them', async () => {
  const start = { ...initial(), estimation: completeSaved() };
  const version = savedEstimate(start, start.estimation);
  const navigate = vi.fn();
  function SwitchTab() { const confirm = useUnsaved(false); return <button onClick={async () => { if (await confirm()) navigate(); }}>Switch tab</button>; }
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [version]), estimationVersion: vi.fn(async () => version) };
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
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [first, second]), estimationVersion: vi.fn(async (_opportunityId, id) => id === second.id ? second : first) };
  render(withProviders(<OpportunityServiceContext.Provider value={service}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  await selectSaved();
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' }), { target: { value: '5' } });
  fireEvent.click(screen.getByRole('radio', { name: /Select Alternative/ }));
  expect(screen.getByLabelText(/Select Baseline/)).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(5);
  fireEvent.click(screen.getByRole('radio', { name: /Select Alternative/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Edit estimate' }));
  await waitFor(() => expect(screen.getByRole('radio', { name: /Select Alternative/ })).toBeChecked());
  expect(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' })).toHaveValue(2);
});
it('shows inline matrix errors on submission and clears them as fields are corrected', async () => {
  let readDraft: (() => Estimation) | null = null;
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '0' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '' }] };
  const start = { ...initial(), estimation: { revision: 1, rows: [], assumptions: '', total: '0.00', grid } };
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [savedEstimate(start, start.estimation)]), estimationVersion: vi.fn(async () => savedEstimate(start, start.estimation)) };
  render(withProviders(<OpportunityServiceContext.Provider value={service}><button onClick={() => readDraft?.()}>Check submission</button><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} registerDraft={reader => { readDraft = reader; }} /></OpportunityServiceContext.Provider>));
  await selectSaved();
  const duration = screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' });
  const effort = screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ });
  act(() => { readDraft?.(); });
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
  let createdVersion: EstimationVersion | undefined;
  const decide = vi.fn(async () => {
    createdVersion = { ...createdVersion!, isSelected: true, status: 'SUBMITTED', revision: 2 };
    return { ...start, estimation: { ...createdVersion.estimation, revision: 2 }, stageId: 4, subStageId: 8, allowedActions: ['EDIT_ESTIMATION'] } as OpportunityDetail;
  });
  saveEstimationVersion.mockImplementation(async ({ estimation }) => { const result = savedVersionResult(start, estimation, 1); createdVersion = result.version; return result; });
  function Workspace() {
    const [record, setRecord] = useState(start);
    return <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimationVersion, decide, estimationVersions: vi.fn(async () => createdVersion ? [createdVersion] : []), estimationVersion: vi.fn(async () => createdVersion!) }}><EstimationModule opportunity={record} onSaved={setRecord} readOnly={false} /></OpportunityServiceContext.Provider>;
  }
  vi.stubGlobal('PointerEvent', MouseEvent);
  render(withProviders(<Workspace />));

  fireEvent.pointerDown(await screen.findByRole('button', { name: /select phases/i }), { button: 0, ctrlKey: false });
  fireEvent.click(await screen.findByText('Discovery & Design'));
  // The menu is still open (its checkbox items intentionally stay open after a selection) and,
  // as an open Radix menu, hides the rest of the page from accessibility queries — close it
  // (scoped to the menu itself, since the selected label now also appears elsewhere once a
  // phase/role is active) before interacting with the next dropdown.
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  fireEvent.pointerDown(await screen.findByRole('button', { name: /select technical roles/i }), { button: 0, ctrlKey: false });
  fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /^PM/ }));
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
  await waitFor(() => expect(screen.getByRole('button', { name: 'Submit Estimation to CEO' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Submit Estimation to CEO' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(dialog.getByRole('button', { name: 'Confirm decision' }));
  await waitFor(() => expect(decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SUBMIT_ESTIMATE', expectedStageId: 3, expectedSubStageId: 7 })));
  await waitFor(() => expect(screen.getByRole('radio', { name: /Select Baseline/ })).toBeChecked());
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save Estimation' })).toBeInTheDocument();
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
}, 180000);

it('keeps estimation read-only once the opportunity has moved past preparation, even if an old edit action is present', async () => {
  render(withProviders(<OpportunityServiceContext.Provider value={productionOpportunityService}><EstimationModule opportunity={{ ...initial(), stageId: 5, subStageId: 10, state: 'GATE1_PENDING' }} onSaved={vi.fn()} readOnly={false} /></OpportunityServiceContext.Provider>));
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


it('updates the same saved estimate with fresh data and saved USD rates when the client budget uses B', async () => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] };
  const estimation: Estimation = { revision: 2, rows: [{ id: 'grid-1-PM', workItem: 'Discovery & Design ? Project Manager', hours: '40', people: 1, hourlyRate: '10' }], assumptions: 'Keep rates', total: '400.00', grid };
  const saved = { id: '22', revision: 2, version: 1, name: 'Baseline', status: 'SAVED' as const, currencyCode: 'USD', personWeeks: '1', createdBy: 7, createdAt: '2026-11-03T00:00:00Z', estimation };
  const start = { ...initial(), currencyCode: 'B', estimation: { ...estimation, revision: 5 } };
  const estimationVersion = vi.fn(async () => saved);
  const saveEstimationVersion = vi.fn(async (command: { estimation: Estimation; name: string }) => ({ version: { ...saved, name: command.name, revision: 3, estimation: command.estimation }, opportunity: { ...start, estimation: { ...command.estimation, revision: 6 } } }));
  render(withProviders(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, estimationVersions: vi.fn(async () => [{ ...saved, revision: 1, name: 'Old list name' }]), estimationVersion, saveEstimationVersion }}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Estimation name' })).toHaveValue('Baseline'));
  expect(estimationVersion).toHaveBeenCalledWith(start.id, '22');
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Discovery & Design duration in weeks' }), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ sourceVersionId: '22', sourceRevision: 2, estimation: expect.objectContaining({ revision: 5, total: '800.00', rows: [expect.objectContaining({ hourlyRate: '10.0000', hours: '80' })] }) })));
});


it('lets the CEO reprice a saved estimate with a rate-only update and live cost recalculation', async () => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] };
  const estimate: Estimation = { revision: 4, assumptions: '', total: '4000.00', rates: [{ roleCode: 'PM', rate: '8000', rateType: 'Monthly', currencyCode: 'USD' }], grid,
    rows: [{ id: 'grid-1-PM', workItem: 'Discovery', hours: '80', people: 1, hourlyRate: '50.0000' }] };
  const start = fixtureOpportunity({ stageId: 4, subStageId: 8, allowedActions: ['EDIT_ESTIMATION_RATES'], estimation: estimate });
  const saved = { id: '13', revision: 2, version: 3, name: 'CEO review', isSelected: true, status: 'SUBMITTED' as const, currencyCode: 'USD', personWeeks: '2', createdBy: 7, createdAt: '2026-11-03T00:00:00Z', estimation: estimate };
  const updated = { ...estimate, total: '6000.00', rates: [{ ...estimate.rates![0], rate: '12000' }], rows: [{ ...estimate.rows[0], hourlyRate: '75.0000' }] };
  const updateEstimationRates = vi.fn(async () => ({ version: { ...saved, revision: 3, estimation: updated }, opportunity: { ...start, estimation: { ...updated, revision: 5 } } }));
  const saveEstimationVersion = vi.fn();
  const estimationVersion = vi.fn(async () => saved);
  const onSaved = vi.fn();
  let reader: (() => Estimation) | null = null;
  render(withProviders(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimationVersion, updateEstimationRates, estimationVersions: vi.fn(async () => [saved]), estimationVersion }}><EstimationModule opportunity={start} onSaved={onSaved} readOnly={false} showActions={false} registerDraft={value => { reader = value; }} /></OpportunityServiceContext.Provider>));
  expect(screen.queryByText('Phases', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Technical roles', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Edit rates')).not.toBeInTheDocument();
  expect(screen.queryByText('Update estimate')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save Estimation' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  expect(screen.queryByRole('spinbutton', { name: /duration in weeks/ })).not.toBeInTheDocument();
  await screen.findByText('Discovery & Design');
  const ratesPanel = screen.getByText('Estimate rates').closest('.opp-panel')!;
  expect(ratesPanel.firstElementChild).toContainElement(screen.getByRole('button', { name: 'Rate master' }));
  fireEvent.click(screen.getByRole('button', { name: 'Rate master' }));
  const input = await screen.findByLabelText('Rate for PM');
  expect(input).toHaveValue(8000);
  fireEvent.change(input, { target: { value: '-1' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(updateEstimationRates).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: '12000' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  const ratePanel = screen.getByRole('region', { name: 'Rate master' });
  expect(ratePanel.closest('.opp-estimation-workspace')).not.toBeNull();
  expect(screen.getByRole('button', { name: 'Rate master' })).toHaveAttribute('aria-expanded', 'true');
  const matrix = within(screen.getByRole('region', { name: 'Estimation matrix' }));
  expect(matrix.getAllByText('$6,000.00').length).toBeGreaterThan(0);
  act(() => { expect(() => reader?.()).toThrow('Update estimate'); });
  fireEvent.click(screen.getByRole('button', { name: 'Update estimate' }));
  await waitFor(() => expect(updateEstimationRates).toHaveBeenCalledWith({ opportunityId: start.id, estimationId: '13', revision: 2, rates: [{ roleCode: 'PM', rate: '12000' }] }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(saveEstimationVersion).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Update estimate' })).not.toBeInTheDocument();
}, 120000);


it.each([[3, 7], [4, 5], [5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 17], [10, 19]])('keeps saved CEO rates visible and read-only at workflow %i/%i', async (stageId, subStageId) => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] };
  const estimate: Estimation = { revision: 4, assumptions: '', total: '4000.00', rates: [{ roleCode: 'PM', rate: '8000', rateType: 'Monthly', currencyCode: 'USD' }], grid,
    rows: [{ id: 'grid-1-PM', workItem: 'Discovery', hours: '80', people: 1, hourlyRate: '50.0000' }] };
  const start = fixtureOpportunity({ stageId, subStageId, allowedActions: ['VIEW_ESTIMATION_RATES'], estimation: null });
  const submitted = { ...savedEstimate(start, estimate), name: 'Submitted estimate', isSelected: true, status: 'SUBMITTED' as const };
  const alternative = { ...submitted, id: '2', name: 'Unsubmitted alternative', isSelected: false, status: 'SAVED' as const };
  const updateEstimationRates = vi.fn();
  // Saved rates remain readable even when the shared role/phase is later disabled.
  const data = stageId === 6 ? { ...mastersData,
    estimationPhasesList: mastersData.estimationPhasesList.map(phase => ({ ...phase, isActive: false })),
    rateMasters: mastersData.rateMasters.map(role => ({ ...role, isActive: false })),
  } : mastersData;
  render(<MockedProvider mocks={[{ ...mastersMock, result: { data } }]}><OpportunityServiceContext.Provider value={{ ...productionOpportunityService, updateEstimationRates, estimationVersions: vi.fn(async () => [alternative, submitted]) }}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly showActions={false} /></OpportunityServiceContext.Provider></MockedProvider>);
  await screen.findByText('Discovery & Design');
  expect(screen.queryByText('Phases', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Technical roles', { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText('Unsubmitted alternative')).not.toBeInTheDocument();
  expect(screen.getByText('Submitted estimate')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Rate master' }));
  const panel = screen.getByRole('region', { name: 'Rate master' });
  expect(within(panel).getByText('8,000.00')).toBeInTheDocument();
  expect(within(panel).queryByText(/Rates are read-only|Read-only rates/)).not.toBeInTheDocument();
  expect(within(panel).queryByRole('spinbutton')).not.toBeInTheDocument();
  expect(panel.closest('.opp-estimation-workspace')).not.toBeNull();
  expect(within(screen.getByRole('region', { name: 'Estimation matrix' })).getAllByText('$4,000.00').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Update estimate' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(updateEstimationRates).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Close rate master' }));
  expect(screen.queryByRole('region', { name: 'Rate master' })).not.toBeInTheDocument();
});

it('previews and saves costs directly from monthly rates without intermediate hourly rounding', async () => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] };
  const estimate: Estimation = { revision: 1, assumptions: '', total: '172732.51', grid,
    rates: [{ roleCode: 'PM', rate: '345465.03', rateType: 'Monthly', currencyCode: 'USD' }],
    rows: [{ id: 'grid-1-PM', workItem: 'Discovery - PM', hours: '80', people: 1, hourlyRate: '2159.1564' }] };
  const start = { ...initial(), estimation: estimate };
  const saveEstimationVersion = vi.fn(async ({ estimation }: { estimation: Estimation }) => savedVersionResult(start, estimation, 2));
  render(withProviders(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, saveEstimationVersion, estimationVersions: vi.fn(async () => [savedEstimate(start, estimate)]), estimationVersion: vi.fn(async () => savedEstimate(start, estimate)) }}><EstimationModule opportunity={start} onSaved={vi.fn()} readOnly={false} showActions={false} /></OpportunityServiceContext.Provider>));
  await selectSaved();
  const matrix = within(screen.getByRole('region', { name: 'Estimation matrix' }));
  expect(matrix.getAllByText('$1,72,732.52').length).toBeGreaterThan(0);
  fireEvent.change(screen.getByRole('textbox', { name: 'Estimation name' }), { target: { value: 'Precise monthly estimate' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(saveEstimationVersion).toHaveBeenCalledWith(expect.objectContaining({ estimation: expect.objectContaining({ total: '172732.52', rates: estimate.rates }) })));
});
