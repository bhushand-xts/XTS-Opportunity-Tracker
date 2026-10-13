import { describe, expect, it } from 'vitest';
import { addMasterQuestionTemplates, canAnswer, canReview, decisionError, estimateTotal, newDraft, pendingSaveErrors, readinessErrors, SECTION_CATALOG, validDate } from './workflow';
import type { OpportunityDetail, ResponseCommand, RfpQuestion, VersionCommand } from '@xts/api-contracts';
import { createLocalOpportunityService, createLocalOpportunityStore, createMockOpportunityService, createMockOpportunityStore, fixtureOpportunity, MOCK_STORAGE_KEY, type LocalWorkflowDirectory, type MockStorage } from '../testing/fixtures';

describe('workflow boundaries', () => {
  it('copies active master questions with stable provenance and prevents duplicate imports', () => {
    const template: RfpQuestion = { id: 17, question: 'Describe your delivery approach.', description: 'Delivery template', displayOrder: 1, isActive: true, createdDt: null, updatedDt: null };
    const questions = addMasterQuestionTemplates([], [template, template, { ...template, id: 18, isActive: false }]);
    expect(questions).toHaveLength(1);
    expect(questions[0]).toMatchObject({ masterQuestionId: 17, text: template.question, validated: false, sourceReference: 'Question Master #17' });
    expect(questions[0].id).toMatch(/^draft-/);
    const edited = [{ ...questions[0], text: 'Opportunity-specific wording.' }];
    expect(addMasterQuestionTemplates(edited, [template])).toEqual(edited);
    expect(template.question).toBe('Describe your delivery approach.');
  });
  it('keeps legacy drafts out of the decision stage but permits automatic Pending Sales approval', () => {
    const o = fixtureOpportunity({ allowedActions: ['SALES_APPROVE'], packageRevision: 1 });
    expect(decisionError(o, 'SALES_APPROVE', '', true)).toContain('no longer awaiting');
    expect(readinessErrors(o)).toContain('Approve every current response revision.');
    expect(decisionError({ ...o, state: 'SALES_REVIEW' }, 'SALES_APPROVE', '', true)).toBeNull();
  });
  it('requires rejection reasons and review confirmation', () => {
    const o = fixtureOpportunity({ state: 'GATE1_PENDING', allowedActions: ['GATE1_GO', 'GATE1_NO_GO'], packageRevision: 2 });
    expect(decisionError(o, 'GATE1_NO_GO', '', true)).toContain('reason');
    expect(decisionError(o, 'GATE1_GO', '', false)).toContain('Confirm');
    expect(decisionError(o, 'GATE1_GO', '', true)).toBeNull();
    expect(decisionError(o, 'SALES_APPROVE', '', true)).toContain('not permitted');
  });
  it('only lets an active assigned owner answer and an independent reviewer approve the submitted revision', () => {
    const o = fixtureOpportunity(), r = o.responses![0];
    expect(canAnswer(o, r, '101')).toBe(true);
    expect(canAnswer(o, r, '102')).toBe(false);
    const submitted = { ...r, state: 'SUBMITTED' as const, submittedRevision: 1 };
    expect(canReview(o, submitted, '102')).toBe(true);
    expect(canReview(o, { ...submitted, reviewer: r.owner }, '101')).toBe(false);
    expect(canReview(o, { ...submitted, submittedRevision: 0 }, '102')).toBe(false);
    expect(canReview({ ...o, state: 'SALES_REVIEW' }, submitted, '102')).toBe(true);
    expect(canReview({ ...o, state: 'GATE1_PENDING' }, submitted, '102')).toBe(false);
  });
  it('reports optional response preparation gaps without blocking basic opportunity saves', () => {
    const o = fixtureOpportunity();
    o.form.rfp.type = null;
    expect(pendingSaveErrors(o.form)).toEqual([]);
    expect(readinessErrors(o)).toContain('Choose an RFP type.');
    o.responses![0].state = 'APPROVED'; o.responses![0].approvedRevision = 0;
    expect(readinessErrors(o)).toContain('Approve every current response revision.');
  });
  it('uses exact decimal calculations and rejects fractional people', () => {
    expect(estimateTotal([{ id: '1', workItem: 'Test', hours: '0.1', people: 3, hourlyRate: '0.2' }])).toBe('0.06');
    expect(() => estimateTotal([{ id: '1', workItem: 'Test', hours: '1', people: 1.5, hourlyRate: '1' }])).toThrow('whole number');
  });
  it('preserves date-only values and validates calendars without UTC conversions', () => {
    expect(validDate('2028-02-29')).toBe(true); expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('2026-11-25T00:00:00Z')).toBe(false);
  });
  it('includes all original and restored proposal sections', () => {
    expect(SECTION_CATALOG).toHaveLength(12);
    expect(SECTION_CATALOG.map(x => x.key)).toEqual(expect.arrayContaining(['understanding', 'plan', 'team', 'references', 'assumptions', 'summary', 'company', 'scope', 'approach', 'security', 'pricing', 'support']));
  });
});

function mockHarness(storage?: MockStorage) {
  let actorId = '101';
  const store = createMockOpportunityStore(storage), service = createMockOpportunityService(store, () => actorId);
  return { store, service, actAs: (id: string) => { actorId = id; } };
}
function mockVersion(detail: OpportunityDetail): VersionCommand { return { opportunityId: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID() }; }
function mockResponse(detail: OpportunityDetail, index = 0): ResponseCommand { const item = detail.responses![index]; return { ...mockVersion(detail), responseId: item.id, responseRevision: item.revision }; }
describe('explicit mock service on the existing Opportunity workflow', () => {
  it('queues a minimal new opportunity to Sales immediately and automatically routes approval to CEO', async () => {
    const h = mockHarness(), form = newDraft('101');
    Object.assign(form, { title: 'New mock workflow', estimatedValue: '10.00', currencyId: '1', serviceLine: 'Mock consulting', clientId: '201' });
    h.store.reset(false);
    let detail = await h.service.save({ id: null, expectedRevision: null, idempotencyKey: 'create-mock', form });
    expect(detail.state).toBe('SALES_REVIEW'); expect(detail.packageRevision).toBe(1); expect(detail.responsible?.id).toBe('104'); expect(detail.allowedActions).toContain('EDIT');
    expect(detail.form.rfp.type).toBeNull(); expect(detail.responses).toEqual([]); expect(detail.readiness.ready).toBe(true);
    const approvals = { queue: 'MY_APPROVALS' as const, search: '', after: null, first: 20 };
    h.actAs('104'); expect((await h.service.list(approvals)).nodes.map(item => item.id)).toEqual([detail.id]);
    h.actAs('105');
    expect((await h.service.list(approvals)).nodes).toEqual([]);
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'GATE1_GO', confirmed: true, reason: '' })).rejects.toThrow('not assigned');
    h.actAs('104'); detail = await h.service.detail(detail.id, undefined, 'REVIEW');
    detail = await h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: 'Mock recommended.' });
    expect(detail.state).toBe('GATE1_PENDING');
    expect((await h.service.list(approvals)).nodes).toEqual([]);
    h.actAs('101'); expect((await h.service.detail(detail.id)).allowedActions).not.toContain('EDIT');
    await expect(h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form })).rejects.toThrow('during preparation');
    h.actAs('105'); detail = await h.service.detail(detail.id, undefined, 'REVIEW');
    expect((await h.service.list(approvals)).nodes.map(item => item.id)).toEqual([detail.id]);
    detail = await h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'GATE1_GO', confirmed: true, reason: 'Mock Go.' });
    expect(detail.state).toBe('GATE1_GO'); expect(detail.allowedActions).toEqual([]);
    expect(detail.activity?.map(event => event.actor.id)).toEqual(expect.arrayContaining(['101', '104', '105']));
    expect((await h.service.list(approvals)).nodes).toEqual([]);
    h.actAs('101'); await expect(h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form: detail.form })).rejects.toThrow('during preparation');
  });
  it('refreshes the Pending package on owner edits and rejects stale, wrong-role and repeated Sales decisions', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    const old = detail, form = structuredClone(detail.form); form.description = 'Changed during Pending';
    detail = await h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form });
    expect(detail.state).toBe('SALES_REVIEW'); expect(detail.responsible?.id).toBe('104'); expect(detail.packageRevision).toBe(old.packageRevision! + 1);
    const unchanged = await h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form: detail.form });
    expect(unchanged.packageRevision).toBe(detail.packageRevision); expect(unchanged.revision).toBe(detail.revision);
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_APPROVE', reason: '', confirmed: true })).rejects.toThrow('not assigned');
    h.actAs('104');
    await expect(h.service.decide({ ...mockVersion(old), packageRevision: old.packageRevision!, decision: 'SALES_APPROVE', reason: '', confirmed: true })).rejects.toThrow('revision conflict');
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: old.packageRevision!, decision: 'SALES_APPROVE', reason: '', confirmed: true })).rejects.toThrow('package revision conflict');
    expect((await h.service.detail(detail.id, undefined, 'REVIEW')).form.description).toBe(form.description);
    detail = await h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_APPROVE', reason: '', confirmed: true });
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_APPROVE', reason: '', confirmed: true })).rejects.toThrow('not assigned');
  });
  it('migrates stored v1 preparation records to the automatic Pending approval route without reset', async () => {
    const entries = new Map<string, string>();
    const storage: MockStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } };
    const old = createMockOpportunityStore().snapshot(), record = old.records['401'];
    record.detail.state = 'IN_PROGRESS'; record.detail.packageRevision = null; record.salesId = null; record.ceoId = null; record.packages = {};
    old.requests['101:legacy-save'] = { fingerprint: 'legacy', result: record.detail }; storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(old));
    const migrated = mockHarness(storage), detail = await migrated.service.detail('401');
    expect(detail.state).toBe('SALES_REVIEW'); expect(detail.packageRevision).toBe(1); expect(detail.responsible?.id).toBe('104');
    expect(migrated.store.snapshot().requests).toEqual({}); expect(JSON.parse(entries.get(MOCK_STORAGE_KEY)!).records['401'].salesId).toBe('104');
    migrated.actAs('104'); expect((await migrated.service.list({ queue: 'MY_APPROVALS', search: '', after: null, first: 20 })).nodes).toHaveLength(1);
  });
  it('keeps assigned response/review actions reachable through Assignment and My Work', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    detail = await h.service.assign({ ...mockResponse(detail), ownerId: '102', reviewerId: '103', dueDate: '2026-11-20' });
    const filter = { queue: 'MY_WORK' as const, search: '', after: null, first: 20 };
    h.actAs('102'); detail = await h.service.detail(detail.id);
    expect(detail.visibleModules).toContain('assignment'); expect((await h.service.list(filter)).nodes).toHaveLength(1);
    detail = await h.service.answer({ ...mockResponse(detail), answer: 'Mock submitted response.', submit: true });
    expect((await h.service.list(filter)).nodes).toHaveLength(0);
    h.actAs('103'); detail = await h.service.detail(detail.id);
    expect(detail.visibleModules).toContain('assignment'); expect((await h.service.list(filter)).nodes).toHaveLength(1);
    detail = await h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: detail.responses![0].revision, approved: true, reason: '' });
    expect((await h.service.list(filter)).nodes).toHaveLength(0);
    expect(detail.state).toBe('SALES_REVIEW'); expect(detail.responsible?.id).toBe('104');
  });
  it('persists only its own mock key, supports idempotent creation and resets to blank or seeded records', async () => {
    const entries = new Map<string, string>([['unrelated-key', 'preserve']]);
    const storage: MockStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } };
    const h = mockHarness(storage), form = (await h.service.detail('401')).form;
    h.store.reset(false); expect(Object.keys(h.store.snapshot().records)).toEqual([]); expect(Object.keys(h.store.snapshot().clients)).toEqual(['201']);
    const command = { id: null, expectedRevision: null, idempotencyKey: 'save-once', form };
    const first = await h.service.save(command), replay = await h.service.save(command);
    expect(replay.id).toBe(first.id); expect(Object.keys(h.store.snapshot().records)).toHaveLength(1); expect(entries.has(MOCK_STORAGE_KEY)).toBe(true);
    const resumed = mockHarness(storage); expect((await resumed.service.detail(first.id)).title).toBe(first.title);
    resumed.store.reset(); expect(Object.keys(resumed.store.snapshot().records)).toEqual(['401']); expect(entries.get('unrelated-key')).toBe('preserve');
  });
  it('requires independent assignments and only assigned actors can submit/review exact revisions', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    await expect(h.service.assign({ ...mockResponse(detail), ownerId: '102', reviewerId: '102', dueDate: '2026-11-20' })).rejects.toThrow('independent');
    detail = await h.service.assign({ ...mockResponse(detail), ownerId: '102', reviewerId: '103', dueDate: '2026-11-20' });
    const assigned = detail;
    await expect(h.service.answer({ ...mockResponse(detail), answer: 'Wrong actor', submit: true })).rejects.toThrow('assigned mock response owner');
    h.actAs('102'); detail = await h.service.answer({ ...mockResponse(detail), answer: 'Mock answer', submit: true });
    await expect(h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: detail.responses![0].revision, approved: true, reason: '' })).rejects.toThrow('independent mock reviewer');
    h.actAs('103');
    await expect(h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: 99, approved: true, reason: '' })).rejects.toThrow('exact submitted');
    h.actAs('102'); await expect(h.service.answer({ ...mockResponse(assigned), answer: 'Stale', submit: true })).rejects.toThrow('revision conflict');
  });
  it('supports response changes requested and resubmission, preserving other approvals on form saves', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    detail = await h.service.assign({ ...mockResponse(detail), ownerId: '102', reviewerId: '103', dueDate: '2026-11-20' });
    h.actAs('102'); detail = await h.service.answer({ ...mockResponse(detail), answer: 'First mock answer', submit: true });
    const initialRevision = detail.responses![0].revision;
    h.actAs('103'); await expect(h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: initialRevision, approved: false, reason: '' })).rejects.toThrow('reason');
    detail = await h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: initialRevision, approved: false, reason: 'Clarify mock milestones.' });
    h.actAs('102'); detail = await h.service.answer({ ...mockResponse(detail), answer: 'Revised mock answer', submit: true });
    h.actAs('103'); await expect(h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: initialRevision, approved: true, reason: '' })).rejects.toThrow('exact submitted');
    detail = await h.service.reviewAnswer({ ...mockResponse(detail), submittedRevision: detail.responses![0].revision, approved: true, reason: '' });
    h.actAs('101'); detail = await h.service.detail(detail.id);
    const approvedRevision = detail.responses![0].approvedRevision, form = structuredClone(detail.form);
    form.description = 'Edited mock context'; form.rfp.questions.push({ id: 'draft-new', text: 'Second mock question', sourceReference: 'Manual', validated: true });
    detail = await h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form });
    expect(detail.responses![0]).toMatchObject({ state: 'APPROVED', approvedRevision }); expect(detail.form.rfp.questions[1].id).not.toMatch(/^draft-/);
    const changed = structuredClone(detail.form); changed.rfp.questions[0].text = 'Changed source'; changed.rfp.questions[0].validated = false;
    detail = await h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form: changed });
    expect(detail.responses![0]).toMatchObject({ state: 'ASSIGNED', approvedRevision: null, sourceValidated: false }); expect(detail.responses![1].revision).toBe(1);
  });
  it('calculates estimation and redacts it plus unassigned responses from restricted actors', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    detail = await h.service.saveEstimation({ ...mockVersion(detail), estimation: { revision: 0, rows: [{ id: 'row', workItem: 'Delivery', hours: '2.5', people: 2, hourlyRate: '100.25' }], assumptions: 'Restricted mock estimate', total: '999' } });
    expect(detail.estimation?.total).toBe('501.25');
    detail = await h.service.saveScope({ ...mockVersion(detail), scope: { revision: 0, objective: 'Mock objective', deliverables: 'Mock deliverables', inclusions: '', exclusions: '', dependencies: '', acceptance: '' } });
    expect(detail.scope?.revision).toBe(1);
    h.actAs('102'); detail = await h.service.detail(detail.id); expect(detail.estimation).toBeNull(); expect(detail.responses).toEqual([]);
    await expect(h.service.saveScope({ ...mockVersion(detail), scope: detail.scope! })).rejects.toThrow('Only the opportunity owner');
    h.actAs('106'); detail = await h.service.detail(detail.id); expect(detail.responses).toBeNull(); expect(detail.estimation).toBeNull(); expect(detail.allowedActions).toEqual([]); expect(await h.service.globalActions()).toEqual([]);
  });
  it('labels upload/extraction as simulated and creates unvalidated synthetic results only once', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    const source = await h.service.upload(mockVersion(detail), new File(['Not parsed'], 'mock-rfp.txt', { type: 'text/plain' }));
    expect(source.name).toContain('Mock upload'); expect(source.downloadUrl).toBeNull();
    const form = structuredClone(detail.form); form.rfp.source = source;
    detail = await h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form });
    detail = await h.service.extract({ ...mockVersion(detail), documentId: source.id }); expect(detail.form.rfp.extraction?.state).toBe('PROCESSING');
    detail = await h.service.extractionStatus(detail.id, detail.form.rfp.extraction!.id); expect(detail.form.rfp.extraction?.state).toBe('SUCCEEDED');
    expect(detail.form.rfp.questions.slice(1).every(question => question.text.startsWith('[Simulated extraction]') && !question.validated)).toBe(true);
    const count = detail.form.rfp.questions.length; detail = await h.service.extractionStatus(detail.id, detail.form.rfp.extraction!.id); expect(detail.form.rfp.questions).toHaveLength(count);
  });
  it('requires decision confirmation/reasons and keeps submitted client snapshots immutable', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    h.actAs('104');
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_REJECT', confirmed: false, reason: 'Mock rejection' })).rejects.toThrow('Confirm');
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_REJECT', confirmed: true, reason: '' })).rejects.toThrow('reason');
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: 99, decision: 'SALES_APPROVE', confirmed: true, reason: '' })).rejects.toThrow('package revision conflict');
    detail = await h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: '' });
    h.actAs('101');
    const client = (await h.service.clients('', null)).nodes[0];
    await h.service.saveClient({ id: client.id, expectedRevision: client.revision, idempotencyKey: crypto.randomUUID(), form: { ...client, name: 'Updated shared mock client' } });
    h.actAs('105'); expect((await h.service.detail(detail.id, undefined, 'REVIEW')).clientName).toBe('Mock Example Client');
    await expect(h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'GATE1_NO_GO', confirmed: true, reason: '' })).rejects.toThrow('reason');
    detail = await h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'GATE1_NO_GO', confirmed: true, reason: 'Mock No-Go.' }); expect(detail.state).toBe('GATE1_NO_GO');
  });
  it('records a reasoned Sales rejection directly from Pending without response work', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401'); h.actAs('104');
    detail = await h.service.decide({ ...mockVersion(detail), packageRevision: detail.packageRevision!, decision: 'SALES_REJECT', confirmed: true, reason: 'Mock commercial risk.' });
    expect(detail.state).toBe('SALES_REJECTED'); expect(detail.activity?.[0].note).toBe('Mock commercial risk.');
    expect((await h.service.list({ queue: 'MY_APPROVALS', search: '', after: null, first: 20 })).nodes).toEqual([]);
    h.actAs('105'); expect((await h.service.list({ queue: 'MY_APPROVALS', search: '', after: null, first: 20 })).nodes).toEqual([]);
  });
  it('prepares generic section responses and supports client creation/search without backend calls', async () => {
    const h = mockHarness(); let detail = await h.service.detail('401');
    const client = await h.service.saveClient({ id: null, expectedRevision: null, idempotencyKey: crypto.randomUUID(), form: { ...detail.client!, name: 'Second mock client' } });
    expect((await h.service.clients('second', null)).nodes[0].id).toBe(client.id);
    const form = structuredClone(detail.form); form.clientId = client.id; form.rfp.type = 'GENERIC'; form.rfp.questions = []; form.rfp.sections = [{ key: 'summary', instructions: 'Mock executive summary' }, { key: 'approach', instructions: '' }];
    detail = await h.service.save({ id: detail.id, expectedRevision: detail.revision, idempotencyKey: crypto.randomUUID(), form });
    expect(detail.responses?.map(item => item.id)).toEqual(['section-summary', 'section-approach']); expect(detail.responses?.every(item => item.sourceValidated && item.state === 'UNASSIGNED')).toBe(true);
    expect((await h.service.eligibleUsers({ opportunityId: detail.id, purpose: 'REVIEWER', search: '', after: null })).nodes.map(user => user.id)).toEqual(['103']);
  });
});

function realLoginHarness() {
  const entries = new Map<string, string>([['authState', 'real-login-owned-by-auth-store']]);
  const storage: MockStorage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } };
  let actorId = '2011';
  const directory: LocalWorkflowDirectory = {
    actorId, users: [
      { id: '2011', name: 'Representative', email: 'rep@example.test', roles: ['Sales Representative'], active: true },
      { id: '2017', name: 'Sales Head A', email: 'head-a@example.test', roles: ['Sales Head'], active: true },
      { id: '2019', name: 'Sales Head B', email: 'head-b@example.test', roles: ['Sales Head'], active: true },
      { id: '2025', name: 'Chief Executive', email: 'ceo@example.test', roles: ['CEO/Gate-2 Approver'], active: true },
      { id: '2090', name: 'Viewer', email: 'viewer@example.test', roles: ['Viewer'], active: true },
    ], salesHeadIds: ['2017', '2019'], ceoIds: ['2025'],
    permissions: { '2011': ['view', 'add', 'edit'], '2017': ['view', 'approve', 'reject'], '2019': ['view', 'approve', 'reject'], '2025': ['view', 'approve', 'reject'], '2090': ['view'] },
    lookups: { currencies: [{ id: '14', label: 'INR', code: 'INR' }], industries: [{ id: '7', label: 'Technology' }], accountTypes: [{ id: '8', label: 'Customer' }] }, questions: [],
  };
  let freshLoads = 0;
  const session = () => createLocalOpportunityService(createLocalOpportunityStore(storage, directory, 'test-gateway'), async fresh => { if (fresh) freshLoads++; return { ...directory, actorId }; });
  const form = newDraft(actorId);
  Object.assign(form, { title: 'Opportunity across real logins', estimatedValue: '100.00', currencyId: '14', serviceLine: 'Consulting', clientId: 'local-test-client' });
  return { directory, entries, form, session, signInAs: (id: string) => { actorId = id; }, freshLoads: () => freshLoads };
}
const approvalFilter = { queue: 'MY_APPROVALS' as const, search: '', after: null, first: 50 };

describe('browser workflow using directory identities and actual role grants', () => {
  it('keeps the same record across new login sessions and routes Sales Representative -> Sales Head -> CEO -> Pipeline', async () => {
    const h = realLoginHarness(), representative = h.session();
    let saved = await representative.save({ id: null, expectedRevision: null, idempotencyKey: 'real-create', form: h.form });
    expect(saved.owner?.id).toBe('2011'); expect(saved.state).toBe('SALES_REVIEW');
    expect(saved.approvalAssignees.map(user => user.id)).toEqual(['2017', '2019']); expect(saved.responsible).toBeNull();
    expect((await representative.list(approvalFilter)).nodes).toEqual([]);
    h.signInAs('2025'); expect((await h.session().list(approvalFilter)).nodes).toEqual([]);
    h.signInAs('2017'); const sales = h.session();
    expect((await sales.list(approvalFilter)).nodes.map(row => row.id)).toEqual([saved.id]);
    const reviewed = await sales.detail(saved.id, undefined, 'REVIEW');
    expect(reviewed.allowedActions).toEqual(expect.arrayContaining(['SALES_APPROVE', 'SALES_REJECT']));
    saved = await sales.decide({ ...mockVersion(reviewed), packageRevision: reviewed.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: 'Recommend' });
    expect(saved.state).toBe('GATE1_PENDING'); expect(saved.approvalAssignees.map(user => user.id)).toEqual(['2025']);
    h.signInAs('2019'); expect((await h.session().list(approvalFilter)).nodes).toEqual([]);
    await expect(h.session().decide({ ...mockVersion(reviewed), packageRevision: reviewed.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: '' })).rejects.toThrow('revision conflict');
    h.signInAs('2025'); const ceo = h.session();
    expect((await ceo.list(approvalFilter)).nodes).toHaveLength(1);
    saved = await ceo.detail(saved.id, undefined, 'REVIEW');
    expect(saved.allowedActions).toEqual(expect.arrayContaining(['GATE1_GO', 'GATE1_NO_GO']));
    saved = await ceo.decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'GATE1_GO', confirmed: true, reason: 'Go' });
    expect((await ceo.list(approvalFilter)).nodes).toEqual([]);
    h.signInAs('2011'); const returned = (await h.session().list({ ...approvalFilter, queue: 'PIPELINE' })).nodes;
    expect(returned).toHaveLength(1); expect(returned[0]).toMatchObject({ id: saved.id, state: 'GATE1_GO' });
    expect(saved.activity?.map(event => event.actor.id)).toEqual(['2025', '2017', '2011']);
    expect(h.entries.get('authState')).toBe('real-login-owned-by-auth-store');
    expect(h.entries.has(MOCK_STORAGE_KEY)).toBe(false); expect(h.freshLoads()).toBeGreaterThanOrEqual(3);
  });
  it('prevents wrong-role decisions, denies removed grants, and records Sales rejection without CEO handoff', async () => {
    const h = realLoginHarness();
    const saved = await h.session().save({ id: null, expectedRevision: null, idempotencyKey: 'reject-create', form: h.form });
    h.signInAs('2090'); const viewer = h.session();
    expect((await viewer.list(approvalFilter)).nodes).toEqual([]);
    await expect(viewer.decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: '' })).rejects.toThrow('not assigned');
    h.signInAs('2017'); h.directory.permissions['2017'] = ['view'];
    expect((await h.session().list(approvalFilter)).nodes).toEqual([]);
    h.directory.permissions['2017'] = ['view', 'reject'];
    await expect(h.session().decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: '' })).rejects.toThrow('not assigned');
    const rejected = await h.session().decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'SALES_REJECT', confirmed: true, reason: 'Insufficient capacity' });
    expect(rejected.state).toBe('SALES_REJECTED'); expect(rejected.approvalAssignees).toEqual([]);
    h.signInAs('2025'); expect((await h.session().list(approvalFilter)).nodes).toEqual([]);
  });
  it('requires a CEO rejection reason and preserves the No-Go status for the representative', async () => {
    const h = realLoginHarness(); let saved = await h.session().save({ id: null, expectedRevision: null, idempotencyKey: 'no-go-create', form: h.form });
    h.signInAs('2017'); saved = await h.session().decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'SALES_APPROVE', confirmed: true, reason: '' });
    h.signInAs('2025');
    await expect(h.session().decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'GATE1_NO_GO', confirmed: true, reason: '' })).rejects.toThrow('reason');
    saved = await h.session().decide({ ...mockVersion(saved), packageRevision: saved.packageRevision!, decision: 'GATE1_NO_GO', confirmed: true, reason: 'Business fit' });
    h.signInAs('2011'); expect((await h.session().detail(saved.id)).state).toBe('GATE1_NO_GO');
  });
  it('does not persist a new record when no eligible CEO exists or the real session cannot be verified', async () => {
    const h = realLoginHarness(); h.directory.ceoIds = [];
    await expect(h.session().save({ id: null, expectedRevision: null, idempotencyKey: 'no-ceo', form: h.form })).rejects.toThrow('Sales Head and CEO');
    expect((await h.session().list({ ...approvalFilter, queue: 'PIPELINE' })).nodes).toEqual([]);
    const store = createLocalOpportunityStore({ getItem: () => null, setItem: () => { throw new Error('Must not write'); } }, h.directory);
    const expired = createLocalOpportunityService(store, async () => { throw new Error('Sign in again'); });
    await expect(expired.save({ id: null, expectedRevision: null, idempotencyKey: 'expired', form: h.form })).rejects.toThrow('Sign in again');
  });
});
