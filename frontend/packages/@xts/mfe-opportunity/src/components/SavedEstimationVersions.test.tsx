import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { EstimationVersion } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { SavedEstimationVersions } from './SavedEstimationVersions';
afterEach(cleanup);
const version: EstimationVersion = { id: '1', version: 1, name: 'Baseline', status: 'SAVED', currencyCode: 'USD', personWeeks: '1', createdBy: 7, createdAt: '2026-10-30T08:00:00Z', estimation: { revision: 1, rows: [{ id: 'grid-1-PM', workItem: 'Original phase — Original role', hours: '40', people: 1, hourlyRate: '25' }], total: '1000', assumptions: 'Original assumptions', grid: { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '1' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '1' }] } } };
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
  await waitFor(() => expect(save).toHaveBeenCalledWith('Alternative'));
  expect(name).toHaveValue('Alternative');
  save.mockResolvedValue(true);
  fireEvent.click(screen.getByRole('button', { name: 'Save Estimation' }));
  await waitFor(() => expect(name).toHaveValue(''));
});
it('views historical data without loading or changing the draft, including after submission', async () => {
  const { onLoad } = mount(false);
  fireEvent.click(await screen.findByRole('button', { name: 'View' }));
  const dialog = within(screen.getByRole('dialog'));
  expect(dialog.getByText('Original phase — Original role')).toBeInTheDocument();
  expect(dialog.getByText('Original assumptions')).toBeInTheDocument();
  expect(dialog.getAllByText(/1,000/).length).toBeGreaterThan(0);
  expect(dialog.getByRole('cell', { name: 'Original phase' })).toBeInTheDocument();
  expect(dialog.getByRole('columnheader', { name: 'Original role' })).toBeInTheDocument();
  expect(dialog.queryByText('Phase 1')).not.toBeInTheDocument();
  expect(dialog.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Load' })).not.toBeInTheDocument();
  expect(onLoad).not.toHaveBeenCalled();
});
it('confirms before replacing unsaved inputs and keeps the stored version unchanged', async () => {
  const before = JSON.stringify(version);
  const { onLoad } = mount(true, true);
  fireEvent.click(await screen.findByRole('button', { name: 'Load' }));
  expect(onLoad).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
  expect(onLoad).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Load' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Load version' }));
  expect(onLoad).toHaveBeenCalledWith(version);
  expect(JSON.stringify(version)).toBe(before);
});
