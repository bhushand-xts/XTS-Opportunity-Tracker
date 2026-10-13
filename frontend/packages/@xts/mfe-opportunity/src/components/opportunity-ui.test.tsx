import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MockedProvider } from '@apollo/client/testing';
import type { OpportunityDetail, SaveCommand } from '@xts/api-contracts';
import { OpportunityServiceContext, productionOpportunityService, type OpportunityService } from '../services/OpportunityService';
import { OpportunityAccessContext } from '../hooks/useOpportunityAccess';
import { UnsavedProvider } from '../hooks/useUnsaved';
import { createLocalOpportunityService, createLocalOpportunityStore, fixtureOpportunity, TEST_LOOKUPS, type LocalWorkflowDirectory } from '../testing/fixtures';
import { PipelinePage } from './PipelinePage';
import { OpportunityFormPage } from './OpportunityFormPage';
import { OpportunityDetailsPage } from './OpportunityDetailsPage';
import { GET_OPPORTUNITY_OWNER_DIRECTORY } from '../services/userDirectory.queries';
import { newDraft } from '../lib/workflow';
import { toast } from 'sonner';

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
  return render(<MockedProvider mocks={ownerMocks}><OpportunityServiceContext.Provider value={service}><OpportunityAccessContext.Provider value={{ userId, view: true, add: true, edit: true, work: true, approvals: true }}><MemoryRouter initialEntries={[route]}><UnsavedProvider><Location /><Routes><Route path="/opportunity" element={<PipelinePage />} /><Route path="/opportunity/approvals" element={<PipelinePage queue="MY_APPROVALS" />} /><Route path="/opportunity/work" element={<PipelinePage queue="MY_WORK" />} /><Route path="/opportunity/new" element={<OpportunityFormPage />} /><Route path="/opportunity/:id/edit" element={<OpportunityFormPage />} /><Route path="/opportunity/:id/details" element={<OpportunityDetailsPage />} /><Route path="/opportunity/:id/review" element={<OpportunityDetailsPage review />} /></Routes></UnsavedProvider></MemoryRouter></OpportunityAccessContext.Provider></OpportunityServiceContext.Provider></MockedProvider>);
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
    save: vi.fn(async (command: SaveCommand) => { record = { ...record, id: command.id ?? record.id, form: structuredClone(command.form), title: command.form.title, state: 'SALES_REVIEW', packageRevision: (record.packageRevision ?? 0) + 1, revision: record.revision + 1 }; return record; }),
  };
}
describe('RFP preparation', () => {
  it.each(['QUESTIONNAIRE', 'GENERIC'] as const)('selects a document and exposes extraction only for Questionnaire: %s', async type => {
    const initial = fixtureOpportunity(); initial.form.rfp.type = type;
    const service = testService(initial), notification = vi.spyOn(toast, 'info');
    service.upload = vi.fn(); service.extract = vi.fn(); service.extractionStatus = vi.fn();
    mount(service, '/opportunity/401/edit');
    const input = await screen.findByLabelText(type === 'GENERIC' ? 'Source document / brief' : 'Source questionnaire');
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { files: [new File(['document bytes'], 'brief.pdf', { type: 'application/pdf' })] } });
    if (type === 'QUESTIONNAIRE') {
      fireEvent.click(screen.getByRole('button', { name: 'Extract questions' }));
      expect(notification).toHaveBeenCalledWith('AI question extraction is currently under development.');
    } else {
      expect(screen.queryByRole('button', { name: 'Extract questions' })).not.toBeInTheDocument();
      expect(screen.queryByText(/AI extraction/)).not.toBeInTheDocument();
      expect(notification).not.toHaveBeenCalled();
    }
    expect(screen.getByText('brief.pdf (selected)')).toBeInTheDocument();
    expect(screen.getByLabelText('Question 1 text')).toHaveValue('Describe the delivery approach.');
    expect(service.save).not.toHaveBeenCalled(); expect(service.upload).not.toHaveBeenCalled(); expect(service.extract).not.toHaveBeenCalled(); expect(service.extractionStatus).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /Save & upload|Save & extract|Upload document/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add from Question Master' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Question 1 source reference/)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Validated against source' })).not.toBeInTheDocument();
  });
  it('allows document selection on a new opportunity without saving it', async () => {
    const service = testService(); mount(service, '/opportunity/new');
    await waitFor(() => expect(screen.getByLabelText('Opportunity owner')).toHaveTextContent('Test Owner'));
    fireEvent.click(screen.getByRole('button', { name: /Generic RFP/ }));
    const input = screen.getByLabelText('Source document / brief'); expect(input).toBeEnabled();
    fireEvent.change(input, { target: { files: [new File(['document'], 'brief.docx')] } });
    expect(screen.getByText('brief.docx (selected)')).toBeInTheDocument();
    expect(service.save).not.toHaveBeenCalled();
  });
  it('shows one Generic section panel and saves manual questions without reference or validation controls', async () => {
    const initial = fixtureOpportunity(); initial.form.rfp.type = 'GENERIC'; initial.form.rfp.questions = [];
    const service = testService(initial); mount(service, '/opportunity/401/edit');
    const sections = await screen.findByRole('group', { name: /Required proposal sections/ });
    expect(within(sections).getAllByRole('checkbox')).toHaveLength(12);
    expect(screen.queryByRole('tab', { name: 'Commercial' })).not.toBeInTheDocument();
    fireEvent.click(within(sections).getByRole('checkbox', { name: 'Executive summary' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    fireEvent.change(screen.getByLabelText('Question 1 text'), { target: { value: 'Describe the transition plan.' } });
    expect(screen.queryByLabelText(/Question 1 source reference/)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Validated against source' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(service.save).toHaveBeenCalledTimes(1));
    expect(vi.mocked(service.save).mock.calls[0][0].form.rfp).toMatchObject({ type: 'GENERIC', sections: [{ key: 'summary' }], questions: [{ text: 'Describe the transition plan.', validated: false, sourceReference: '' }] });
  });
  it('keeps document and question controls read-only when editing is not permitted', async () => {
    mount(testService(fixtureOpportunity({ allowedActions: [] })), '/opportunity/401/edit');
    expect(await screen.findByLabelText('Source questionnaire')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Extract questions' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '+ Add question' })).toBeDisabled();
    expect(screen.getByLabelText('Question 1 text')).toBeDisabled();
  });
});
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
  it('approval-only cards open Overview directly and never an edit route', async () => {
    mount(testService(fixtureOpportunity({ state: 'SALES_REVIEW', allowedActions: ['SALES_APPROVE'], packageRevision: 1 })));
    const main = await screen.findByRole('link', { name: 'View Cloud transformation' });
    expect(main).toHaveAttribute('href', '/opportunity/401/details');
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/opportunity/401/details');
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

  it('uses directory identities across sessions for Sales and CEO Overview decisions and the final Pipeline', async () => {
    let actorId = '2011';
    const directory: LocalWorkflowDirectory = {
      actorId, users: [
        { id: '2011', name: 'Representative', email: 'rep@example.test', roles: ['Sales Representative'], active: true },
        { id: '2017', name: 'Sales Head', email: 'head@example.test', roles: ['Sales Head'], active: true },
        { id: '2025', name: 'CEO', email: 'ceo@example.test', roles: ['CEO/Gate-2 Approver'], active: true },
      ], permissions: { '2011': ['view', 'add', 'edit'], '2017': ['view', 'approve', 'reject'], '2025': ['view', 'approve', 'reject'] },
      salesHeadIds: ['2017'], ceoIds: ['2025'], lookups: TEST_LOOKUPS, questions: [],
    };
    const entries = new Map<string, string>();
    const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
    const session = () => createLocalOpportunityService(createLocalOpportunityStore(storage, directory), async () => ({ ...directory, actorId }));
    let service = session();
    const form = newDraft(actorId);
    Object.assign(form, { title: 'Automatic approval flow', estimatedValue: '100.00', currencyId: '1', serviceLine: 'Consulting', clientId: 'local-test-client' });
    Object.assign(form.solicitation, { reference: 'RFP-TEST-1', issuingAgency: 'Test procurement' });
    form.dates.submissionDeadline = '2026-11-25';
    const created = await service.save({ id: null, expectedRevision: null, idempotencyKey: 'ui-auto-create', form });
    actorId = '2017'; service = session(); mount(service, '/opportunity/approvals', actorId);
    fireEvent.click(await screen.findByRole('link', { name: 'View Automatic approval flow' }));
    const approvalColumn = await screen.findByRole('complementary', { name: 'Opportunity approval and progress' });
    expect(within(approvalColumn).getByText('Opportunity progress')).toBeInTheDocument();
    expect(within(approvalColumn).getByText('Your sales approval is required').compareDocumentPosition(within(approvalColumn).getByText('Opportunity progress')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve & Send to CEO' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent(`/opportunity/${created.id}/details`);
    expect(screen.queryByRole('button', { name: 'Submit to Sales Head' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit Opportunity' })).not.toBeInTheDocument();
    let dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm decision' }));
    await screen.findByText('Sales Head approved this opportunity. It is automatically queued for CEO approval.');
    expect((await service.list({ queue: 'MY_APPROVALS', search: '', after: null, first: 50 })).nodes).toEqual([]);
    cleanup(); actorId = '2025'; service = session(); mount(service, '/opportunity/approvals', actorId);
    fireEvent.click(await screen.findByRole('link', { name: 'View Automatic approval flow' }));
    expect(within(await screen.findByRole('complementary', { name: 'Opportunity approval and progress' })).getByRole('button', { name: 'Approve Go' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Approve Go' }));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm decision' }));
    await waitFor(async () => expect((await service.detail(created.id)).state).toBe('GATE1_GO'));
    expect((await service.list({ queue: 'MY_APPROVALS', search: '', after: null, first: 50 })).nodes).toEqual([]);
    cleanup(); actorId = '2011'; service = session(); mount(service, '/opportunity', actorId);
    expect(await screen.findByRole('link', { name: 'View Automatic approval flow' })).toBeInTheDocument();
    expect((await service.list({ queue: 'PIPELINE', search: '', after: null, first: 50 })).nodes[0]).toMatchObject({ id: created.id, state: 'GATE1_GO' });
  });
  it('creates with a real client ID and Pending save, then Save & Continue never creates a duplicate', async () => {
    const service = testService(); mount(service, '/opportunity/new');
    expect(service.lookups).toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Opportunity name/), { target: { value: 'New real draft' } }); fireEvent.change(screen.getByLabelText(/Estimated value/), { target: { value: '12345.67' } }); fireEvent.keyDown(screen.getByLabelText('Service line'), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('option', { name: 'Consulting' }));
    fireEvent.keyDown(screen.getByLabelText(/Currency/), { key: 'Enter' }); const currencyOption = await screen.findByText(TEST_LOOKUPS.currencies[0].label); fireEvent.click(currencyOption); 
    fireEvent.focus(screen.getByLabelText('Search client')); fireEvent.change(screen.getByLabelText('Search client'), { target: { value: 'Test' } });
    fireEvent.click(await screen.findByText('Test Client'));
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    expect(service.save).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter a solicitation \/ reference number/)).toBeInTheDocument();
    expect(screen.getByLabelText('Submission method')).toHaveAttribute('aria-required', 'true');
    fireEvent.change(screen.getByLabelText(/Solicitation \/ reference number/), { target: { value: 'RFP-NEW-1' } });
    fireEvent.change(screen.getByLabelText(/Issuing agency \/ department/), { target: { value: 'Client procurement' } });
    fireEvent.change(screen.getByLabelText(/Submission deadline/), { target: { value: '2026-11-25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' }));
    await waitFor(() => expect(service.save).toHaveBeenCalledTimes(1)); await waitFor(() => expect(screen.getByLabelText('Current route')).toHaveTextContent('/opportunity/401/edit'));
    expect(vi.mocked(service.save).mock.calls[0][0]).toMatchObject({ id: null, expectedRevision: null, form: { clientId: '201', ownerId: '101', estimatedValue: '12345.67' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save & Continue' })); await waitFor(() => expect(service.save).toHaveBeenCalledTimes(2)); expect(vi.mocked(service.save).mock.calls[1][0].id).toBe('401');
  }, 120000);
});
