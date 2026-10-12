import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import type { OpportunityDetail, SaveCommand } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService, type OpportunityService } from '../services/OpportunityService';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { UnsavedProvider } from '../hooks/useUnsaved';
import { fixtureOpportunity, TEST_LOOKUPS } from '../testing/fixtures';
import { PipelinePage } from './PipelinePage';
import { OpportunityFormPage } from './OpportunityFormPage';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';
import { GET_OPPORTUNITY_OWNER_DIRECTORY } from '../services/userDirectory.queries';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  window.PointerEvent ??= MouseEvent as typeof PointerEvent;
  window.matchMedia ??= vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Location() { const location = useLocation(); return <output aria-label="Current route">{location.pathname}</output>; }
function mount(service: OpportunityService, route = '/opportunity', userId = '101') {
  const ownerMocks = [{ request: { query: GET_OPPORTUNITY_OWNER_DIRECTORY }, result: { data: {
    userList: [{ id: 101, firstName: 'Test', lastName: 'Owner', email: 'owner@example.test', roleId: 1, isActive: true }, { id: 102, firstName: 'Test', lastName: 'Reviewer', email: 'reviewer@example.test', roleId: 1, isActive: true }],
    rolesList: [{ id: 1, roleName: 'Test role', roleCode: 'TEST', isActive: true }],
  } }, maxUsageCount: 100 }];
  return render(<MockedProvider mocks={ownerMocks}><OpportunityServiceContext.Provider value={service}><OpportunityAccessContext.Provider value={{ userId, view: true, add: true, edit: true, work: true, approvals: true }}><MemoryRouter initialEntries={[route]}><UnsavedProvider><Location /><Routes><Route path="/opportunity" element={<PipelinePage />} /><Route path="/opportunity/new" element={<OpportunityFormPage />} /><Route path="/opportunity/:id/edit" element={<OpportunityFormPage />} /><Route path="/opportunity/:id/details" element={<OpportunityDetailsPage />} /><Route path="/opportunity/:id/review" element={<OpportunityDetailsPage review />} /></Routes></UnsavedProvider></MemoryRouter></OpportunityAccessContext.Provider></OpportunityServiceContext.Provider></MockedProvider>);
}
function testService(initial = fixtureOpportunity()): OpportunityService {
  let record = initial;
  return {
    ...productionOpportunityService,
    lookups: vi.fn(async () => TEST_LOOKUPS),
    detail: vi.fn(async () => record),
    list: vi.fn(async () => ({ nodes: [record], totalCount: 1, endCursor: null, hasNextPage: false })),
    clients: vi.fn(async () => ({ nodes: [record.client!], totalCount: 1, endCursor: null, hasNextPage: false })),
    eligibleUsers: vi.fn(async () => ({ nodes: [record.owner!, record.responses![0].reviewer!], totalCount: 2, endCursor: null, hasNextPage: false })),
    save: vi.fn(async (command: SaveCommand) => { record = { ...record, id: command.id ?? record.id, form: structuredClone(command.form), title: command.form.title, revision: record.revision + 1 }; return record; }),
  };
}
describe('Opportunity UI using test-only service fixtures', () => {
  it('shows a true empty Pipeline only for a successful empty backend response', async () => {
    const service = testService(); service.list = vi.fn(async () => ({ nodes: [], totalCount: 0, endCursor: null, hasNextPage: false }));
    mount(service); expect(await screen.findByText('Your pipeline starts here')).toBeInTheDocument();
  });
  it('shows an integration error rather than a false empty Pipeline', async () => {
    mount(productionOpportunityService); expect(await screen.findByText('Pipeline unavailable')).toBeInTheDocument(); expect(screen.queryByText('Your pipeline starts here')).not.toBeInTheDocument();
  });
  it('uses separate sibling destinations for card continuation and Overview', async () => {
    mount(testService());
    const main = await screen.findByRole('link', { name: 'Continue Cloud transformation' });
    expect(main).toHaveAttribute('href', '/opportunity/401/edit');
    const overview = screen.getByRole('link', { name: 'Overview' }); expect(overview).toHaveAttribute('href', '/opportunity/401/details');
    expect(main.contains(overview)).toBe(false); expect(overview.closest('button')).toBeNull();
  });
  it('approval-only cards open review and never an edit route', async () => {
    mount(testService(fixtureOpportunity({ state: 'SALES_REVIEW', allowedActions: ['SALES_APPROVE'], packageRevision: 1 })));
    const main = await screen.findByRole('link', { name: 'Review Cloud transformation' });
    expect(main).toHaveAttribute('href', '/opportunity/401/review');
    expect(screen.getByRole('link', { name: /Review & Decide/ })).toHaveAttribute('href', '/opportunity/401/review');
  });
  it('Save Opportunity persists before returning to Pipeline and keeps actions after response content', async () => {
    const service = testService(); mount(service, '/opportunity/401/edit');
    const title = await screen.findByLabelText(/Opportunity name/); fireEvent.change(title, { target: { value: 'Saved revised opportunity' } });
    const save = screen.getByRole('button', { name: 'Save Opportunity' });
    expect(screen.getByText('Question & answer progress').compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(save); expect(await screen.findByRole('link', { name: 'Continue Saved revised opportunity' })).toBeInTheDocument();
    expect(service.save).toHaveBeenCalledWith(expect.objectContaining({ id: '401', expectedRevision: 1, form: expect.objectContaining({ title: 'Saved revised opportunity' }) }));
  });
  it('Save & Continue reuses the record ID and retains an independent unsaved answer', async () => {
    const service = testService(); mount(service, '/opportunity/401/edit');
    await screen.findByLabelText(/Opportunity name/);
    fireEvent.change(screen.getByLabelText('Answer / section response'), { target: { value: 'Unsaved independent answer' } });
    fireEvent.change(screen.getByLabelText(/Opportunity name/), { target: { value: 'Changed form title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(service.save).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Answer / section response')).toHaveValue('Unsaved independent answer');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/opportunity/401/edit');
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' })); await waitFor(() => expect(service.save).toHaveBeenCalledTimes(2));
    for (const [command] of vi.mocked(service.save).mock.calls) expect(command.id).toBe('401');
  });
  it('retains entered data on failed saves and guards duplicate clicks', async () => {
    const service = testService(); let reject!: (error: Error) => void;
    service.save = vi.fn(() => new Promise<OpportunityDetail>((_resolve, fail) => { reject = fail; }));
    mount(service, '/opportunity/401/edit'); const title = await screen.findByLabelText(/Opportunity name/); fireEvent.change(title, { target: { value: 'Retained draft' } });
    const save = screen.getByRole('button', { name: 'Save Opportunity' }); fireEvent.click(save); fireEvent.click(save);
    expect(service.save).toHaveBeenCalledTimes(1); reject(new Error('Revision conflict: refresh before retrying.'));
    expect(await screen.findByText('Revision conflict: refresh before retrying.')).toBeInTheDocument(); expect(title).toHaveValue('Retained draft'); expect(screen.getByLabelText('Current route')).toHaveTextContent('/edit');
  });
  it('Save Opportunity preserves an unsaved answer instead of leaving the work area', async () => {
    const service = testService(); mount(service, '/opportunity/401/edit');
    await screen.findByLabelText(/Opportunity name/);
    fireEvent.change(screen.getByLabelText('Answer / section response'), { target: { value: 'Answer still being prepared' } });
    fireEvent.change(screen.getByLabelText(/Opportunity name/), { target: { value: 'Saved form with unfinished answer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Opportunity' }));
    expect(await screen.findByText('Opportunity saved. Your unsaved answer or assignment is still here; save it before leaving.')).toBeInTheDocument();
    expect(screen.getByLabelText('Answer / section response')).toHaveValue('Answer still being prepared');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/opportunity/401/edit');
  });
  it('does not leak restricted estimation totals or matrix assumptions on Overview', async () => {
    const record = fixtureOpportunity({ visibleModules: ['overview', 'scope', 'activity'] });
    mount(testService(record), '/opportunity/401/details'); await screen.findByText('Saved scope summary');
    expect(screen.queryByRole('tab', { name: 'Estimation' })).not.toBeInTheDocument(); expect(screen.queryByText('Saved estimation summary')).not.toBeInTheDocument(); expect(screen.queryByText('Client provides access.')).not.toBeInTheDocument();
  });
  it('requires a reason and package confirmation before a Sales Head rejection', async () => {
    const service = testService(fixtureOpportunity({ state: 'SALES_REVIEW', packageRevision: 3, allowedActions: ['SALES_REJECT'] }));
    service.decide = vi.fn(async () => fixtureOpportunity({ state: 'SALES_REJECTED', allowedActions: [], packageRevision: 3 }));
    mount(service, '/opportunity/401/review'); fireEvent.click(await screen.findByRole('button', { name: 'Reject Opportunity' }));
    const dialog = screen.getByRole('dialog'); fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm decision' }));
    expect(await within(dialog).findByText(/Confirm that you reviewed/)).toBeInTheDocument(); expect(service.decide).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('checkbox')); fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm decision' })); expect(await within(dialog).findByText(/Enter a reason/)).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('Reason (required)'), { target: { value: 'Delivery capacity unavailable' } }); fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm decision' }));
    await waitFor(() => expect(service.decide).toHaveBeenCalledWith(expect.objectContaining({ decision: 'SALES_REJECT', reason: 'Delivery capacity unavailable', packageRevision: 3, expectedRevision: 1, confirmed: true })));
  });
  it('creates with a real client ID and Pending save, then Save & Continue never creates a duplicate', async () => {
    const service = testService(); mount(service, '/opportunity/new');
    expect(service.lookups).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Opportunity name/), { target: { value: 'New real draft' } }); fireEvent.change(screen.getByLabelText(/Estimated value/), { target: { value: '12345.67' } }); fireEvent.change(screen.getByLabelText(/Service line/), { target: { value: 'Consulting' } });
    fireEvent.keyDown(screen.getByLabelText(/Currency/), { key: 'Enter' }); const currencyOption = await screen.findByText(TEST_LOOKUPS.currencies[0].label); fireEvent.click(currencyOption); 
    fireEvent.focus(screen.getByLabelText('Search client')); fireEvent.change(screen.getByLabelText('Search client'), { target: { value: 'Test' } });
    fireEvent.click(await screen.findByText('Test Client')); 
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(service.save).toHaveBeenCalledTimes(1)); await waitFor(() => expect(screen.getByLabelText('Current route')).toHaveTextContent('/opportunity/401/edit'));
    expect(vi.mocked(service.save).mock.calls[0][0]).toMatchObject({ id: null, expectedRevision: null, form: { clientId: '201', ownerId: '101', estimatedValue: '12345.67' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' })); await waitFor(() => expect(service.save).toHaveBeenCalledTimes(2)); expect(vi.mocked(service.save).mock.calls[1][0].id).toBe('401');
  }, 120000);
});
