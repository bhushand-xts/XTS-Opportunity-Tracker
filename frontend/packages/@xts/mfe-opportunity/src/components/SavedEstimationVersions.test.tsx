import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { EstimationVersion } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { SavedEstimationVersions } from './SavedEstimationVersions';
import { useState } from 'react';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
beforeEach(() => { vi.spyOn(productionOpportunityService as typeof productionOpportunityService & { estimationVersion: (id: string, estimationId: string) => Promise<EstimationVersion> }, 'estimationVersion').mockImplementation(async (_id, estimationId) => estimationId === '2' ? { ...version, id: '2', version: 2, name: 'Alternative' } : version); });
const version: EstimationVersion = { id: '1', revision: 1, version: 1, name: 'Baseline', status: 'SAVED', currencyCode: 'USD', personWeeks: '1', createdBy: 7, createdAt: '2026-10-30T08:00:00Z', estimation: { revision: 1, rows: [{ id: 'grid-1-PM', workItem: 'Original phase — Original role', hours: '40', people: 1, hourlyRate: '25' }], total: '1000', assumptions: 'Original assumptions', grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] } } };
function mount(editable = true, dirty = false, onSave = vi.fn(async () => true)) {
  const onLoad = vi.fn();
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, estimationVersions: vi.fn(async () => [version]) }}><SavedEstimationVersions opportunityId="10" revision={1} editable={editable} dirty={dirty} saving={false} onSave={onSave} onLoad={onLoad} /></OpportunityServiceContext.Provider>);
  return { onLoad, onSave };
}
it('saves a named version and leaves the name available on failed saves', async () => {
  const save = vi.fn(async () => false);
  mount(true, false, save);
  const name = screen.getByRole('textbox', { name: 'Estimation name' });
  fireEvent.change(name, { target: { value: 'Alternative' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Estimation' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('Alternative', undefined));
  expect(name).toHaveValue('Alternative');
  save.mockResolvedValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Save Estimation' }));
  await waitFor(() => expect(name).toHaveValue(''));
});
it('views historical data without loading or changing the draft, including after submission', async () => {
  const { onLoad } = mount(false);
  fireEvent.click(await screen.findByRole('button', { name: 'View' }));
  const dialog = within(await screen.findByRole('dialog'));
  expect(dialog.getByRole('table', { name: 'Resource allocation' })).toBeInTheDocument();
  expect(dialog.getByRole('table', { name: 'Person-weeks' })).toBeInTheDocument();
  expect(dialog.getByRole('table', { name: 'Cost (USD)' })).toBeInTheDocument();
  expect(dialog.queryByRole('columnheader', { name: /Hours|People|Hourly rate/i })).not.toBeInTheDocument();
  expect(dialog.getByText('Original assumptions')).toBeInTheDocument();
  expect(dialog.getAllByText(/1,000/).length).toBeGreaterThan(0);
  expect(dialog.getAllByRole('cell', { name: 'Original phase' })).toHaveLength(3);
  expect(dialog.getAllByRole('columnheader', { name: 'PM' })).toHaveLength(3);
  expect(dialog.getAllByRole('columnheader', { name: 'PM' })[0]).toHaveAttribute('title', 'Original role');
  expect(dialog.queryByText('Phase 1')).not.toBeInTheDocument();
  expect(dialog.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  expect(onLoad).not.toHaveBeenCalled();
});
it('confirms before replacing unsaved inputs and keeps the stored version unchanged', async () => {
  const before = JSON.stringify(version);
  const { onLoad } = mount(true, true);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  expect(onLoad).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
  expect(onLoad).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Edit estimate' }));
  await waitFor(() => expect(onLoad).toHaveBeenCalledWith(version));
  expect(JSON.stringify(version)).toBe(before);
});

it('places saved estimations before the action row and permits exactly one saved selection', async () => {
  const second = { ...version, id: '2', version: 2, name: 'Alternative' };
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [second, version]) };
  function Workspace() {
    const [selected, setSelected] = useState<EstimationVersion | null>(null);
    return <OpportunityServiceContext.Provider value={service}><SavedEstimationVersions opportunityId="10" revision={1} editable saving={false} dirty={false} onSave={vi.fn(async () => true)} onLoad={vi.fn()} selectedVersion={selected} onSelectVersion={setSelected} submitAction={<button disabled={!selected}>Submit to CEO</button>} /></OpportunityServiceContext.Provider>;
  }
  render(<Workspace />);
  const firstRadio = await screen.findByRole('radio', { name: 'Select Baseline version 1 for CEO review' });
  expect(screen.getByRole('button', { name: 'Submit to CEO' })).toBeDisabled();
  const table = screen.getByRole('table');
  expect(within(table).queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  const actions = screen.getByRole('region', { name: 'Estimation actions' });
  expect(table.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(firstRadio);
  await waitFor(() => expect(firstRadio).toBeChecked());
  expect(screen.getByRole('button', { name: 'Submit to CEO' })).toBeEnabled();
  fireEvent.click(screen.getByRole('radio', { name: 'Select Alternative version 2 for CEO review' }));
  await waitFor(() => expect(firstRadio).not.toBeChecked());
  expect(screen.getByRole('radio', { name: 'Select Alternative version 2 for CEO review' })).toBeChecked();
});

it('opens Edit with the saved name and sends the source version through Update', async () => {
  const { onSave, onLoad } = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  await waitFor(() => expect(onLoad).toHaveBeenCalledWith(version));
  expect(screen.getByRole('textbox', { name: 'Estimation name' })).toHaveValue('Baseline');
  fireEvent.change(screen.getByRole('textbox', { name: 'Estimation name' }), { target: { value: 'Revised' } });
  fireEvent.click(screen.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith('Revised', version));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save Estimation' })).toBeInTheDocument());
});
it('keeps Save/Update under the editor while sidebar cards retain selection, view and edit actions', async () => {
  render(<aside aria-label="Estimation sidebar" />);
  const target = screen.getByRole('complementary', { name: 'Estimation sidebar' });
  const onSave = vi.fn(async () => true), onLoad = vi.fn();
  const service = { ...productionOpportunityService, estimationVersions: vi.fn(async () => [version]) };
  function Workspace() {
    const [selected, setSelected] = useState<EstimationVersion | null>(null);
    return <OpportunityServiceContext.Provider value={service}><main><SavedEstimationVersions sidebarTarget={target} opportunityId="10" revision={1} editable saving={false} dirty={false} onSave={onSave} onLoad={onLoad} selectedVersion={selected} onSelectVersion={setSelected} submitAction={<button disabled={!selected}>Submit to CEO</button>} /></main></OpportunityServiceContext.Provider>;
  }
  render(<Workspace />);
  const sidebar = within(target), editor = within(screen.getByRole('main'));
  const radio = await sidebar.findByRole('radio', { name: 'Select Baseline version 1 for CEO review' });
  expect(sidebar.queryByText('V1')).not.toBeInTheDocument();
  expect(sidebar.getByText(new Date(version.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }))).toBeInTheDocument();
  expect(editor.getByRole('textbox', { name: 'Estimation name' })).toBeInTheDocument();
  expect(sidebar.queryByRole('textbox', { name: 'Estimation name' })).not.toBeInTheDocument();
  expect(editor.queryByRole('list')).not.toBeInTheDocument();
  expect(sidebar.getByRole('button', { name: 'Submit to CEO' })).toBeDisabled();
  fireEvent.click(radio);
  await waitFor(() => expect(sidebar.getByRole('button', { name: 'Submit to CEO' })).toBeEnabled());
  fireEvent.click(sidebar.getByRole('button', { name: 'Edit Baseline version 1' }));
  await waitFor(() => expect(onLoad).toHaveBeenCalledWith(version));
  expect(editor.getByRole('textbox', { name: 'Estimation name' })).toHaveValue('Baseline');
  fireEvent.click(editor.getByRole('button', { name: 'Update' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith('Baseline', version));
  await waitFor(() => expect(editor.getByRole('button', { name: 'Save Estimation' })).toBeInTheDocument());
  expect(sidebar.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
});


it.each([false, true])('keeps the submitted selection fixed and warns when another estimate is chosen (sidebar: %s)', async sidebar => {
  const submitted: EstimationVersion = { ...version, isSelected: true, status: 'SUBMITTED' };
  const alternative = { ...version, id: '2', version: 2, name: 'Alternative', isSelected: false };
  const list = vi.fn(async () => [alternative, submitted]);
  const select = vi.fn(), save = vi.fn(async () => true), detail = vi.fn(async () => alternative);
  const service = { ...productionOpportunityService, estimationVersions: list, estimationVersion: detail };
  const target = sidebar ? document.createElement('aside') : null;
  if (target) document.body.appendChild(target);
  render(<OpportunityServiceContext.Provider value={service}><SavedEstimationVersions sidebarTarget={target} opportunityId="10" revision={4} editable saving={false} dirty={false} selectionLocked onSave={save} onLoad={vi.fn()} onSelectVersion={select} /></OpportunityServiceContext.Provider>);
  const current = await screen.findByRole('radio', { name: 'Select Baseline version 1 for CEO review' });
  const other = screen.getByRole('radio', { name: 'Select Alternative version 2 for CEO review' });
  expect(current).toBeChecked();
  fireEvent.click(other);
  expect(screen.getByRole('status')).toHaveTextContent(/^Estimation already submitted\.$/);
  expect(screen.getByRole('status')).not.toHaveClass('text-destructive');
  expect(current).toBeChecked(); expect(other).not.toBeChecked();
  fireEvent.click(other);
  expect(current).toBeChecked(); expect(other).not.toBeChecked();
  expect(select).not.toHaveBeenCalled(); expect(detail).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Estimation name' }), { target: { value: 'Another estimate after submission' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Estimation' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith('Another estimate after submission', undefined));
  if (target) target.remove();
});

it('shows the CEO only the selected submitted estimate and its count', async () => {
  const submitted: EstimationVersion = { ...version, isSelected: true, status: 'SUBMITTED' };
  const alternative = { ...version, id: '2', version: 2, name: 'Unsubmitted alternative' };
  const previous = { ...submitted, id: '3', version: 3, name: 'Unselected submission', isSelected: false };
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, estimationVersions: vi.fn(async () => [alternative, previous, submitted]) }}><SavedEstimationVersions opportunityId="10" revision={4} editable={false} saving={false} dirty={false} submittedOnly onSave={vi.fn()} onLoad={vi.fn()} /></OpportunityServiceContext.Provider>);
  expect(await screen.findByText('Baseline')).toBeInTheDocument();
  expect(screen.getByText('1 saved')).toBeInTheDocument();
  expect(screen.queryByText('Unsubmitted alternative')).not.toBeInTheDocument();
  expect(screen.queryByText('Unselected submission')).not.toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});
