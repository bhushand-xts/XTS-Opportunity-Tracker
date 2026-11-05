import { MockedProvider } from '@apollo/client/testing';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { Estimation } from '@xts/api-contracts';
import { EstimationModule } from './PreparationModules';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import type { ComponentProps } from 'react';
import { EstimationRoleDialog } from './EstimationRoleDialog';
import { fixtureOpportunity } from '../testing/fixtures';
import { CREATE_ESTIMATION_PHASE, CREATE_ESTIMATION_ROLE, GET_ESTIMATION_MASTERS } from '../services/estimationMasters.queries';

// Radix focus/visibility checks are slow in the Windows jsdom runner.
vi.setConfig({ testTimeout: 180000 });

const permission = vi.hoisted(() => ({ add: true, view: true }));
vi.mock('@xts/design-system', async importOriginal => ({
  ...await importOriginal<typeof import('@xts/design-system')>(),
  useAuth: () => ({ session: { userId: '101' }, hasPermission: (_menu: string, action: string) => action === 'view' ? permission.view : permission.add }),
}));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); permission.add = true; permission.view = true; });

function openMenu(button: HTMLElement) {
  vi.stubGlobal('PointerEvent', MouseEvent);
  fireEvent.pointerDown(button, { button: 0, ctrlKey: false });
}

const currency = { currencyId: 1, currencyCode: 'USD', currencySymbol: '$', currencyName: 'US Dollar', createdDt: '2026-01-01', createdBy: 101, updatedDt: null, updatedBy: null, isActive: true };
const role = { ratemasterId: 10, roleName: 'Project Manager', roleCode: 'PM', currencyId: 1, rateType: 'Monthly', defaultRate: 4000, isActive: true, location: null, description: null, createdDt: '2026-01-01', createdBy: 101, updatedDt: null, updatedBy: null };
const createdRole = { ...role, ratemasterId: 11, roleName: 'QA Engineer', roleCode: 'QA', defaultRate: 3200 };
const masters = { estimationPhasesList: [{ id: 1, phaseName: 'Discovery', phaseCode: 'DISC', displayOrder: 1, isActive: true }], rateMasters: [role], currencies: [currency] };
const queryMock = () => ({ request: { query: GET_ESTIMATION_MASTERS }, result: { data: masters }, maxUsageCount: 100 });
const opportunity = () => fixtureOpportunity({ stageId: 3, subStageId: 7, currencyCode: 'USD', allowedActions: ['EDIT_ESTIMATION'], estimation: { revision: 1, assumptions: 'Draft assumptions', total: '1000', rows: [{ id: 'grid-1-PM', workItem: 'Discovery — Project Manager', hours: '40', people: 1, hourlyRate: '25' }] } });

function SavedSetup(props: ComponentProps<typeof EstimationModule>) {
  const saved = props.opportunity.estimation;
  const version = saved ? { id: '1', revision: saved.revision, isSelected: false, version: 1, name: 'Setup estimate', status: 'SAVED' as const, currencyCode: 'USD', personWeeks: '1', createdBy: 101, createdAt: '2026-11-04T00:00:00Z', estimation: { ...saved, grid: saved.grid ?? { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] } } } : null;
  return <OpportunityServiceContext.Provider value={{ ...productionOpportunityService, estimationVersions: async () => version ? [version] : [], estimationVersion: vi.fn(async () => version!) }}><EstimationModule {...props} /></OpportunityServiceContext.Provider>;
}
async function openSetupEstimate() {
  const radio = await screen.findByRole('radio', { name: /Select Setup estimate/ });
  await waitFor(() => expect(radio).toBeEnabled());
  fireEvent.click(radio);
  await screen.findByRole('spinbutton', { name: 'Discovery duration in weeks' });
}

it('adds a phase from the persistent dropdown action without resetting existing estimate inputs', async () => {
  const created = { id: 2, phaseName: 'Deployment', phaseCode: 'DEP', displayOrder: 2, isActive: true };
  let phaseData = masters;
  const mutation = vi.fn(() => { phaseData = { ...masters, estimationPhasesList: [...masters.estimationPhasesList, created] }; return { data: { createEstimationPhase: created } }; });
  render(<MockedProvider mocks={[
    { request: { query: GET_ESTIMATION_MASTERS }, result: () => ({ data: phaseData }), maxUsageCount: 100 },
    { request: { query: CREATE_ESTIMATION_PHASE, variables: { input: { phaseName: 'Deployment', isActive: true, createdBy: 101 } } }, result: mutation },
  ]}><SavedSetup opportunity={opportunity()} onSaved={vi.fn()} readOnly={false} showActions={false} /></MockedProvider>);
  await openSetupEstimate();
  const duration = screen.getByRole('spinbutton', { name: 'Discovery duration in weeks' });
  fireEvent.change(duration, { target: { value: '2' } });
  const allocation = screen.getByRole('spinbutton', { name: /Project Manager resource allocation/ });
  fireEvent.change(allocation, { target: { value: '0.5' } });
  openMenu(screen.getByRole('button', { name: 'All phases (1)' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Add phase' }));
  const dialog = within(await screen.findByRole('dialog', { name: 'Add phase' }));
  fireEvent.change(dialog.getByRole('textbox', { name: 'New phase name' }), { target: { value: 'Deployment' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Add phase' }));
  expect(await screen.findByRole('spinbutton', { name: 'Deployment duration in weeks' })).toHaveValue(1);
  expect(duration).toHaveValue(2);
  expect(allocation).toHaveValue(0.5);
  expect(mutation).toHaveBeenCalledOnce();
  expect(screen.queryByRole('dialog', { name: 'Add phase' })).not.toBeInTheDocument();
});

it('shows the phase action with an explanation when master Add permission is missing', async () => {
  permission.add = false;
  render(<MockedProvider mocks={[queryMock()]}><SavedSetup opportunity={opportunity()} onSaved={vi.fn()} readOnly={false} /></MockedProvider>);
  await openSetupEstimate();
  openMenu(screen.getByRole('button', { name: 'All phases (1)' }));
  expect(await screen.findByRole('menuitem', { name: 'Add phase' })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText('Phase Master Add permission is required.')).toBeVisible();
  expect(screen.queryByRole('dialog', { name: 'Add phase' })).not.toBeInTheDocument();
});

it('creates and selects a shared technical role while retaining unsaved estimate values', async () => {
  const mutation = vi.fn(() => ({ data: { createRateMaster: createdRole } }));
  const registerDraft = vi.fn<(reader: (() => Estimation) | null) => void>();
  render(<MockedProvider mocks={[queryMock(), { request: { query: CREATE_ESTIMATION_ROLE, variables: { input: { roleName: 'QA Engineer', roleCode: 'QA', currencyId: 1, rateType: 'Monthly', defaultRate: 3200, createdBy: 101 } } }, result: mutation }]}>
    <SavedSetup opportunity={opportunity()} onSaved={vi.fn()} readOnly={false} showActions={false} registerDraft={registerDraft} />
  </MockedProvider>);
  await openSetupEstimate();
  const duration = screen.getByRole('spinbutton', { name: 'Discovery duration in weeks' });
  fireEvent.change(duration, { target: { value: '2' } });
  const allocation = screen.getByRole('spinbutton', { name: 'Discovery — Project Manager resource allocation' });
  fireEvent.change(allocation, { target: { value: '0.5' } });
  openMenu(screen.getByLabelText('All technical roles (1)'));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Add technical role' }));
  const dialog = within(await screen.findByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Role name'), { target: { value: 'QA Engineer' } });
  fireEvent.change(dialog.getByLabelText('Role code'), { target: { value: 'QA' } });
  fireEvent.change(dialog.getByLabelText('Monthly rate'), { target: { value: '3200' } });
  fireEvent.click(dialog.getByRole('button', { name: 'Add role' }));
  await waitFor(() => expect(mutation).toHaveBeenCalledOnce());
  expect(await screen.findByRole('spinbutton', { name: 'Discovery — QA Engineer resource allocation' })).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(duration).toHaveValue(2);
  expect(allocation).toHaveValue(0.5);
  const readDraft = registerDraft.mock.calls.at(-1)?.[0];
  expect(readDraft?.().assumptions).toBe('Draft assumptions');
}, 180000);

it('filters roles without clearing selection and opens rate references beside setup', async () => {
  const secondRole = { ...role, ratemasterId: 12, roleName: 'Developer', roleCode: 'DEV' };
  render(<MockedProvider mocks={[{ ...queryMock(), result: { data: { ...masters, rateMasters: [role, secondRole] } } }]}><SavedSetup opportunity={opportunity()} onSaved={vi.fn()} readOnly={false} /></MockedProvider>);
  await openSetupEstimate();
  openMenu(screen.getByLabelText('1 selected'));
  fireEvent.change(screen.getByRole('textbox', { name: 'Search technical roles' }), { target: { value: 'Developer' } });
  expect(screen.getAllByRole('menuitemcheckbox')).toHaveLength(1);
  expect(screen.getByRole('menuitemcheckbox', { name: /DEV/ })).toHaveAttribute('aria-checked', 'false');
  fireEvent.change(screen.getByRole('textbox', { name: 'Search technical roles' }), { target: { value: '' } });
  expect(screen.getByRole('menuitemcheckbox', { name: /PM/ })).toHaveAttribute('aria-checked', 'true');
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(screen.getByLabelText('1 selected')).toHaveFocus());
  fireEvent.click(screen.getByText('Rate master', { selector: 'button' }));
  const popup = await screen.findByRole('dialog', { name: 'Rate master' });
  expect(popup).toBeVisible();
  expect(popup.closest('.opp-estimation-workspace')).toBeNull();
  expect(within(popup).getByText('Reference rates for active technical roles.')).toBeVisible();
  expect(within(popup).queryByText(/Rates are read-only|Read-only rates/)).not.toBeInTheDocument();
}, 180000);

it('keeps role creation unavailable without master-data add permission', async () => {
  permission.add = false;
  render(<MockedProvider mocks={[queryMock()]}><SavedSetup opportunity={opportunity()} onSaved={vi.fn()} readOnly={false} /></MockedProvider>);
  await openSetupEstimate();
  openMenu(screen.getByLabelText('All technical roles (1)'));
  expect(screen.queryByRole('menuitem', { name: 'Add technical role' })).not.toBeInTheDocument();
}, 180000);

it('preserves entered role details when creation fails', async () => {
  render(<MockedProvider mocks={[{ request: { query: CREATE_ESTIMATION_ROLE }, variableMatcher: () => true, error: new Error('Unable to save role') }]}>
    <EstimationRoleDialog open onOpenChange={vi.fn()} currencies={[currency]} roles={[]} defaultCurrencyId={1} onCreated={vi.fn()} />
  </MockedProvider>);
  fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'QA Engineer' } });
  fireEvent.change(screen.getByLabelText('Role code'), { target: { value: 'QA' } });
  fireEvent.change(screen.getByLabelText('Monthly rate'), { target: { value: '3200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save role');
  expect(screen.getByLabelText('Role name')).toHaveValue('QA Engineer');
  expect(screen.getByLabelText('Monthly rate')).toHaveValue(3200);
});

it('retains selected phases when creating the first technical role', async () => {
  render(<MockedProvider mocks={[
    { ...queryMock(), result: { data: { ...masters, rateMasters: [] } } },
    { request: { query: CREATE_ESTIMATION_ROLE }, variableMatcher: () => true, result: { data: { createRateMaster: createdRole } } },
  ]}>
    <SavedSetup opportunity={{ ...opportunity(), estimation: null }} onSaved={vi.fn()} readOnly={false} />
  </MockedProvider>);
  await waitFor(() => expect(screen.getByRole('button', { name: /Select phases/ })).toBeEnabled());
  openMenu(screen.getByRole('button', { name: /Select phases/ }));
  fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Discovery' }));
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(screen.getByLabelText('All phases (1)')).toHaveFocus());
  openMenu(screen.getByRole('button', { name: /Select technical roles/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Add technical role' }));
  fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'QA Engineer' } });
  fireEvent.change(screen.getByLabelText('Role code'), { target: { value: 'QA' } });
  fireEvent.change(screen.getByLabelText('Monthly rate'), { target: { value: '3200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
  expect(await screen.findByRole('spinbutton', { name: 'Discovery — QA Engineer resource allocation' })).toBeVisible();
  expect(screen.getByRole('spinbutton', { name: 'Discovery duration in weeks' })).toHaveValue(1);
});

it('rejects duplicate role codes before sending a creation request', () => {
  const onCreated = vi.fn();
  render(<MockedProvider mocks={[]}><EstimationRoleDialog open onOpenChange={vi.fn()} currencies={[currency]} roles={[role]} defaultCurrencyId={1} onCreated={onCreated} /></MockedProvider>);
  fireEvent.change(screen.getByLabelText('Role name'), { target: { value: 'Another manager' } });
  fireEvent.change(screen.getByLabelText('Role code'), { target: { value: ' pm ' } });
  fireEvent.change(screen.getByLabelText('Monthly rate'), { target: { value: '3200' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add role' }));
  expect(screen.getByRole('alert')).toHaveTextContent('already exists');
  expect(onCreated).not.toHaveBeenCalled();
});


it('uses USD costs and rates when the opportunity client budget uses currency B', async () => {
  const otherCurrency = { ...currency, currencyId: 2, currencyCode: 'B', currencySymbol: 'bb' };
  const otherRole = { ...role, ratemasterId: 99, roleName: 'Non USD role', roleCode: 'OTHER', currencyId: 2 };
  render(<MockedProvider mocks={[{ ...queryMock(), result: { data: { ...masters, currencies: [currency, otherCurrency], rateMasters: [role, otherRole] } } }]}>
    <SavedSetup opportunity={{ ...opportunity(), currencyCode: 'B', currencySymbol: 'bb' }} onSaved={vi.fn()} readOnly={false} showActions={false} />
  </MockedProvider>);
  await openSetupEstimate();
  expect(screen.getByRole('group', { name: 'Estimation totals' })).toHaveTextContent('$1,000.00');
  expect(screen.queryByText(/B 1,000/)).not.toBeInTheDocument();
  openMenu(screen.getByLabelText('All technical roles (1)'));
  expect(await screen.findByRole('menuitemcheckbox', { name: /PM/ })).toHaveTextContent('$4,000.00');
  expect(screen.queryByRole('menuitemcheckbox', { name: /Non USD role/ })).not.toBeInTheDocument();
});
