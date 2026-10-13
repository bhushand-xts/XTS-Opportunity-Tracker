/** Fixtures and explicitly enabled development mock mode only.
 * The production service never falls back to these synthetic records. */
import type { Action, ClientDraft, DirectoryUser, OpportunityClient, OpportunityDetail, OpportunityLookups, OpportunitySummary, Page, ResponseItem, RfpQuestion, SourceDocument, VersionCommand } from '@xts/api-contracts';
import type { OpportunityService } from '../services/OpportunityService';
import { canAnswer, canReview, estimateTotal, isPreparing, newDraft, pendingSaveErrors, SECTION_CATALOG, validDate } from '../lib/workflow';

export const TEST_LOOKUPS: OpportunityLookups = { currencies: [{ id: '1', label: 'INR · Indian rupee', code: 'INR' }], industries: [{ id: '1', label: 'Technology' }], accountTypes: [{ id: '1', label: 'Enterprise' }] };
export function fixtureOpportunity(overrides: Partial<OpportunityDetail> = {}): OpportunityDetail {
  const owner = { id: '101', name: 'Test Owner', email: 'owner@example.test', roles: ['Test role'], active: true };
  const reviewer = { id: '102', name: 'Test Reviewer', email: 'reviewer@example.test', roles: ['Test review role'], active: true };
  const form = newDraft(owner.id);
  Object.assign(form, { title: 'Cloud transformation', estimatedValue: '250000.00', currencyId: '1', serviceLine: 'Digital engineering', clientId: '201', description: 'Modernize the delivery platform.' });
  Object.assign(form.solicitation, { reference: 'RFP-TEST-1', issuingAgency: 'Test procurement', portalUrl: 'https://procurement.example.test' });
  form.dates.submissionDeadline = '2026-11-25'; form.rfp.type = 'QUESTIONNAIRE'; form.rfp.questions = [{ id: '301', text: 'Describe the delivery approach.', sourceReference: 'Page 1', validated: true }];
  const client = { id: '201', revision: 1, name: 'Test Client', relationship: 'Existing customer', accountTypeId: '1', industryId: '1', accountTypeName: 'Enterprise', industryName: 'Technology', website: 'https://example.test', address: 'Display postal address', country: 'India', stateProvince: 'Maharashtra', city: 'Pune', streetAddress: 'Building 1, Test Street', primaryContact: { name: 'Test Contact', title: 'Procurement lead', email: 'contact@example.test', phone: '+91 0000000000', decisionRole: 'Decision maker' }, additionalContacts: [], allowedActions: ['CLIENT_UPDATE'] as OpportunityDetail['allowedActions'] };
  return {
    id: '401', number: 'OPP-TEST-401', title: form.title, estimatedValue: form.estimatedValue, currencyCode: 'INR', clientName: client.name, owner, priority: 'MEDIUM', state: 'PREPARATION_PENDING', rfpType: 'QUESTIONNAIRE', submissionDeadline: form.dates.submissionDeadline, revision: 1, packageRevision: null,
    allowedActions: ['EDIT', 'ASSIGN', 'EDIT_ESTIMATION', 'EDIT_SCOPE', 'UPLOAD', 'EXTRACT', 'CLIENT_CREATE'],
    form, client, visibleModules: ['overview', 'responses', 'estimation', 'scope', 'assignment', 'activity'],
    responses: [{ id: '301', title: 'Describe the delivery approach.', sourceValidated: true, sourceReference: 'Page 1', owner, reviewer, dueDate: '2026-11-20', answer: 'Saved initial answer.', state: 'DRAFT', revision: 1, submittedRevision: null, approvedRevision: null, reviewComment: null, allowedActions: ['ASSIGN', 'SAVE_ANSWER', 'SUBMIT_ANSWER'] }],
    estimation: { revision: 1, rows: [{ id: '501', workItem: 'Implementation', hours: '80', people: 2, hourlyRate: '1500' }], assumptions: 'Client provides access.', total: '240000.00' },
    scope: { revision: 1, objective: 'Modernize delivery', deliverables: 'Working platform', inclusions: 'Discovery and implementation', exclusions: 'Third-party licences', dependencies: 'Access and stakeholder input', acceptance: 'Agreed performance tests' },
    activity: [{ id: '601', action: 'Opportunity created', actor: owner, at: '2026-10-12T08:00:00Z', note: null, packageRevision: null }], responsible: owner, approvalAssignees: [], readiness: { ready: false, issues: ['Approve the response package.'] }, salesRecommendation: null, ...overrides,
  };
}

export const MOCK_STORAGE_KEY = 'opportunity-mfe:mock-workflow:v1';
export const MOCK_USERS: DirectoryUser[] = [
  { id: '101', name: 'Mock Sales Owner', email: 'owner@example.test', roles: ['Sales Owner'], active: true },
  { id: '102', name: 'Mock Response Owner', email: 'responder@example.test', roles: ['Response Owner'], active: true },
  { id: '103', name: 'Mock Independent Reviewer', email: 'reviewer@example.test', roles: ['Independent Reviewer'], active: true },
  { id: '104', name: 'Mock Sales Head', email: 'sales-head@example.test', roles: ['Sales Head'], active: true },
  { id: '105', name: 'Mock CEO', email: 'ceo@example.test', roles: ['CEO / Gate 1 Approver'], active: true },
  { id: '106', name: 'Mock Read-only Viewer', email: 'viewer@example.test', roles: ['Read-only Viewer'], active: true },
];
export const MOCK_RFP_QUESTIONS: RfpQuestion[] = [
  { id: 17, question: 'Describe the delivery approach for this mock project.', description: 'Synthetic delivery template.', displayOrder: 1, isActive: true, createdDt: null, updatedDt: null },
  { id: 18, question: 'Describe security controls for this mock project.', description: 'Synthetic security template.', displayOrder: 2, isActive: true, createdDt: null, updatedDt: null },
];
export interface MockStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }
interface MockRecord { detail: OpportunityDetail; salesId: string | null; ceoId: string | null; salesIds?: string[]; ceoIds?: string[]; packages: Record<string, OpportunityDetail>; }
export interface LocalWorkflowDirectory {
  actorId: string; users: DirectoryUser[]; salesHeadIds: string[]; ceoIds: string[];
  permissions: Record<string, string[]>; lookups: OpportunityLookups; questions: RfpQuestion[];
}
export interface MockState {
  version: 1; nextId: number; records: Record<string, MockRecord>; clients: Record<string, OpportunityClient>;
  documents: Record<string, SourceDocument & { opportunityId: string }>;
  requests: Record<string, { fingerprint: string; result: unknown }>;
}
export interface MockOpportunityStore { snapshot(): MockState; replace(state: MockState): void; reset(seed?: boolean): void; lockName?: string; }
function mockCopy<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
function mockUser(id: string): DirectoryUser {
  const found = MOCK_USERS.find(user => user.id === id && user.active);
  if (!found) throw new Error('Mock user is unavailable.');
  return mockCopy(found);
}
function mockResponses(detail: OpportunityDetail) {
  const previous = new Map((detail.responses ?? []).map(item => [item.id, item]));
  const sources = detail.form.rfp.type === 'QUESTIONNAIRE'
    ? detail.form.rfp.questions.map(question => ({ id: question.id, title: question.text, sourceValidated: question.validated, sourceReference: question.sourceReference }))
    : detail.form.rfp.type === 'GENERIC' ? detail.form.rfp.sections.map(section => {
      const catalog = SECTION_CATALOG.find(item => item.key === section.key);
      if (!catalog) throw new Error('Unknown proposal section.');
      return { id: `section-${section.key}`, title: catalog.title, sourceValidated: true, sourceReference: section.instructions || null };
    }) : [];
  if (new Set(sources.map(source => source.id)).size !== sources.length) throw new Error('Duplicate response items.');
  detail.responses = sources.map(source => {
    const old = previous.get(source.id);
    if (!old) return { ...source, owner: null, reviewer: null, dueDate: null, answer: '', state: 'UNASSIGNED', revision: 1, submittedRevision: null, approvedRevision: null, reviewComment: null, allowedActions: [] } satisfies ResponseItem;
    const changed = old.title !== source.title || old.sourceValidated !== source.sourceValidated || old.sourceReference !== source.sourceReference;
    return changed ? { ...old, ...source, revision: old.revision + 1, state: old.owner ? 'ASSIGNED' : 'UNASSIGNED', submittedRevision: null, approvedRevision: null, reviewComment: null } : { ...old, ...source };
  });
}
function mockHydrate(detail: OpportunityDetail, state: MockState, directory?: LocalWorkflowDirectory) {
  const form = detail.form;
  detail.title = form.title; detail.estimatedValue = form.estimatedValue; detail.owner = directory ? mockCopy(directory.users.find(user => user.id === form.ownerId) ?? detail.owner) : mockUser(form.ownerId); detail.priority = form.priority;
  detail.currencyCode = (directory?.lookups ?? TEST_LOOKUPS).currencies.find(item => item.id === form.currencyId)?.code ?? '';
  detail.rfpType = form.rfp.type; detail.submissionDeadline = form.dates.submissionDeadline || null;
  detail.client = form.clientId ? mockCopy(state.clients[form.clientId] ?? null) : null; detail.clientName = detail.client?.name ?? null;
  // Optional response preparation never blocks the automatic approval route.
  detail.readiness = { ready: true, issues: [] };
}
function mockPendingPackage(record: MockRecord, state: MockState, directory?: LocalWorkflowDirectory) {
  record.salesIds = directory?.salesHeadIds ?? ['104']; record.ceoIds = directory?.ceoIds ?? ['105'];
  if (!record.salesIds.length || !record.ceoIds.length) throw new Error('An active Sales Head and CEO with Opportunity approval permissions are required.');
  record.salesId = record.salesIds.length === 1 ? record.salesIds[0] : null; record.ceoId = record.ceoIds.length === 1 ? record.ceoIds[0] : null;
  record.detail.approvalAssignees = (directory?.users ?? MOCK_USERS).filter(user => record.salesIds!.includes(user.id)).map(mockCopy);
  record.detail.state = 'SALES_REVIEW'; record.detail.responsible = record.detail.approvalAssignees.length === 1 ? record.detail.approvalAssignees[0] : null; record.detail.salesRecommendation = null;
  record.detail.packageRevision = (record.detail.packageRevision ?? 0) + 1;
  mockHydrate(record.detail, state, directory);
  record.packages[String(record.detail.packageRevision)] = mockCopy(record.detail);
}
function mockSeed(seed = true): MockState {
  const detail = fixtureOpportunity();
  detail.number = 'OPP-MOCK-401'; detail.title = detail.form.title = 'Mock cloud delivery opportunity'; detail.owner = mockUser('101'); detail.responsible = mockUser('101');
  detail.form.rfp.questions = [{ id: '301', text: MOCK_RFP_QUESTIONS[0].question, sourceReference: 'Mock Question Master #17', validated: true, masterQuestionId: 17 }];
  detail.responses = []; detail.allowedActions = []; detail.estimation = null; detail.scope = null; detail.readiness = { ready: false, issues: [] };
  detail.activity = [{ id: 'mock-seed', action: 'Mock opportunity seeded', actor: mockUser('101'), at: '2026-10-12T08:00:00Z', note: 'Synthetic data for the Opportunity MFE mock mode.', packageRevision: null }];
  const client = mockCopy(detail.client!); client.name = 'Mock Example Client'; client.allowedActions = [];
  mockResponses(detail);
  const state: MockState = { version: 1, nextId: 402, records: seed ? { '401': { detail, salesId: null, ceoId: null, packages: {} } } : {}, clients: { '201': client }, documents: {}, requests: {} };
  if (seed) mockPendingPackage(state.records['401'], state);
  return state;
}
export function createMockOpportunityStore(storage?: MockStorage, options?: { key: string; initial: MockState }): MockOpportunityStore {
  const key = options?.key ?? MOCK_STORAGE_KEY;
  let state = options ? mockCopy(options.initial) : mockSeed();
  function readLatest() {
    const saved = storage?.getItem(key);
    if (!saved) return;
    const parsed = JSON.parse(saved) as MockState;
    if (parsed?.version !== 1 || !parsed.records || !parsed.clients || !parsed.documents || !parsed.requests || !Number.isSafeInteger(parsed.nextId)) throw new Error('The browser workflow data is invalid.');
    state = parsed;
  }
  try {
    readLatest();
  } catch (error) { if (options) throw error; /* Test fixture state may be reseeded. */ }
  function replace(next: MockState) { storage?.setItem(key, JSON.stringify(next)); state = mockCopy(next); }
  let migrated = false;
  for (const record of options ? [] : Object.values(state.records)) {
    if (record.detail.state === 'PREPARATION_PENDING' || record.detail.state === 'IN_PROGRESS' || record.detail.state === 'SALES_REVIEW' && (!record.salesId || !record.ceoId || record.detail.packageRevision === null || !record.packages[String(record.detail.packageRevision)])) {
      record.detail.revision++; mockPendingPackage(record, state); migrated = true;
    }
  }
  if (migrated) { state.requests = {}; replace(state); }
  return { lockName: key, snapshot: () => { readLatest(); return mockCopy(state); }, replace, reset: (seed = true) => replace(options ? mockCopy(options.initial) : mockSeed(seed)) };
}

/** UI-test records shared by real logins in this browser, isolated from old mock actors. */
export function createLocalOpportunityStore(storage: MockStorage, directory: LocalWorkflowDirectory, namespace = '') {
  const client = mockCopy(fixtureOpportunity().client!);
  client.id = 'local-test-client'; client.name = 'UI Test Client';
  client.accountTypeId = directory.lookups.accountTypes[0]?.id ?? ''; client.accountTypeName = directory.lookups.accountTypes[0]?.label ?? '';
  client.industryId = directory.lookups.industries[0]?.id ?? ''; client.industryName = directory.lookups.industries[0]?.label ?? '';
  client.allowedActions = [];
  return createMockOpportunityStore(storage, { key: `opportunity-mfe:real-user-ui-test:v1:${namespace}`, initial: { version: 1, nextId: 1, records: {}, clients: { [client.id]: client }, documents: {}, requests: {} } });
}

/** Revalidate actual identity/grants before actions; browser state is never sent as a backend save. */
export function createLocalOpportunityService(store: MockOpportunityStore, loadDirectory: (fresh: boolean) => Promise<LocalWorkflowDirectory>): OpportunityService {
  const reads = new Set(['globalActions', 'lookups', 'list', 'detail', 'clients', 'eligibleUsers']);
  const methods = Object.keys(createMockOpportunityService(store, () => '')) as (keyof OpportunityService)[];
  return Object.fromEntries(methods.map(method => [method, async (...args: unknown[]) => {
    const work = async () => {
      const directory = await loadDirectory(!reads.has(method));
      const service = createMockOpportunityService(store, () => directory.actorId, directory);
      return Reflect.apply(service[method], service, args);
    };
    return !reads.has(method) && typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(store.lockName ?? 'opportunity-local-workflow', work) : work();
  }])) as unknown as OpportunityService;
}
function mockPage<T>(items: T[], after: string | null, first = 25): Page<T> {
  const offset = after === null ? 0 : Number(after);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(first) || first < 1) throw new Error('Invalid mock pagination.');
  const nodes = items.slice(offset, offset + first), hasNextPage = offset + nodes.length < items.length;
  return { nodes, totalCount: items.length, endCursor: hasNextPage ? String(offset + nodes.length) : null, hasNextPage };
}
function mockAbort(signal?: AbortSignal) { if (signal?.aborted) throw new Error('Mock request cancelled.'); }

/** Explicit development adapter for the existing Opportunity pages/routes only.
 * Uses injected real identities in local UI testing; standalone fixtures remain synthetic. */
export function createMockOpportunityService(store: MockOpportunityStore, getActorId: () => string, directory?: LocalWorkflowDirectory): OpportunityService {
  const users = directory?.users ?? MOCK_USERS, lookups = directory?.lookups ?? TEST_LOOKUPS, questions = directory?.questions ?? MOCK_RFP_QUESTIONS;
  const permitted = (id: string, permission: string) => directory ? (directory.permissions[id] ?? []).includes(permission) : permission === 'view' || (id === '101' ? ['add', 'edit'].includes(permission) : ['103', '104', '105'].includes(id) ? ['approve', 'reject'].includes(permission) : id === '102' && permission === 'edit');
  const user = (id: string) => { const found = users.find(value => value.id === id && value.active); if (!found) throw new Error('The user is inactive or unavailable.'); return mockCopy(found); };
  const actor = () => { const value = user(getActorId()); if (!permitted(value.id, 'view')) throw new Error('Opportunity view permission is required.'); return value; };
  const eligible = (kind: 'SALES' | 'CEO') => (directory ? kind === 'SALES' ? directory.salesHeadIds : directory.ceoIds : kind === 'SALES' ? ['104'] : ['105']).filter(id => users.some(value => value.id === id && value.active) && permitted(id, 'view') && (permitted(id, 'approve') || permitted(id, 'reject')));
  const assigned = (record: MockRecord, kind: 'SALES' | 'CEO') => (kind === 'SALES' ? record.salesIds ?? (record.salesId ? [record.salesId] : []) : record.ceoIds ?? (record.ceoId ? [record.ceoId] : [])).filter(id => eligible(kind).includes(id));
  const hydrate = (detail: OpportunityDetail, state: MockState) => mockHydrate(detail, state, directory);
  const pending = (record: MockRecord, state: MockState) => mockPendingPackage(record, state, directory ? { ...directory, salesHeadIds: eligible('SALES'), ceoIds: eligible('CEO') } : undefined);
  function find(state: MockState, id: string) { const record = state.records[id]; if (!record) throw new Error('Mock opportunity not found.'); return record; }
  function manager(record: MockRecord) { return actor().id === record.detail.form.ownerId && permitted(actor().id, 'edit'); }
  function editable(record: MockRecord) { if (!manager(record) || !isPreparing(record.detail)) throw new Error('Only the opportunity owner may edit during preparation.'); }
  function checked(state: MockState, command: VersionCommand) {
    const record = find(state, command.opportunityId);
    if (record.detail.revision !== command.expectedRevision) throw new Error('Mock revision conflict: refresh before retrying.');
    return record;
  }
  function response(record: MockRecord, id: string, revision: number) {
    const item = record.detail.responses?.find(item => item.id === id);
    if (!item) throw new Error('Mock response not found.');
    if (item.revision !== revision) throw new Error('Mock response revision conflict.');
    return item;
  }
  function actions(record: MockRecord): Action[] {
    const result: Action[] = [], id = actor().id, detail = record.detail;
    if (manager(record) && isPreparing(detail)) { result.push('EDIT', 'ASSIGN', 'EDIT_ESTIMATION', 'EDIT_SCOPE'); if (!directory) result.push('UPLOAD', 'EXTRACT'); if (permitted(id, 'add')) result.push('CLIENT_CREATE'); }
    for (const item of detail.responses ?? []) {
      if (permitted(id, 'edit') && canAnswer(detail, item, id)) result.push('SAVE_ANSWER', 'SUBMIT_ANSWER');
      if (permitted(id, 'approve') && canReview(detail, item, id)) result.push('REVIEW_ANSWER');
    }
    if (detail.state === 'SALES_REVIEW' && assigned(record, 'SALES').includes(id)) { if (permitted(id, 'approve')) result.push('SALES_APPROVE'); if (permitted(id, 'reject')) result.push('SALES_REJECT'); }
    if (detail.state === 'GATE1_PENDING' && assigned(record, 'CEO').includes(id)) { if (permitted(id, 'approve')) result.push('GATE1_GO'); if (permitted(id, 'reject')) result.push('GATE1_NO_GO'); }
    return [...new Set(result)];
  }
  function project(record: MockRecord, state: MockState, mode = 'WORK') {
    const id = actor().id, snapshot = mode === 'REVIEW' && record.detail.packageRevision !== null ? record.packages[String(record.detail.packageRevision)] : undefined;
    if (mode === 'REVIEW' && !snapshot) throw new Error('No submitted mock package to review.');
    const detail = mockCopy(snapshot ?? record.detail); if (!snapshot) hydrate(detail, state);
    detail.state = record.detail.state; detail.revision = record.detail.revision; detail.packageRevision = record.detail.packageRevision;
    detail.activity = mockCopy(record.detail.activity); detail.responsible = mockCopy(record.detail.responsible); detail.salesRecommendation = mockCopy(record.detail.salesRecommendation);
    detail.allowedActions = actions(record);
    detail.approvalAssignees = (detail.state === 'SALES_REVIEW' ? assigned(record, 'SALES') : detail.state === 'GATE1_PENDING' ? assigned(record, 'CEO') : []).map(user);
    detail.responsible = detail.approvalAssignees.length === 1 ? detail.approvalAssignees[0] : null;
    if (manager(record) || assigned(record, 'SALES').includes(id) || assigned(record, 'CEO').includes(id)) detail.visibleModules = ['overview', 'responses', 'estimation', 'scope', 'assignment', 'activity'];
    else {
      detail.visibleModules = (!directory && id === '106') ? ['overview', 'scope', 'activity'] : ['overview', 'responses', 'scope', 'activity'];
      detail.estimation = null; detail.responses = (!directory && id === '106') ? null : (detail.responses ?? []).filter(item => item.owner?.id === id || item.reviewer?.id === id);
      if (isPreparing(record.detail) && detail.responses?.length) detail.visibleModules.push('assignment');
      detail.form.context.notes = '';
      detail.form.rfp.questions = detail.form.rfp.questions.filter(question => detail.responses?.some(item => item.id === question.id));
      detail.form.rfp.sections = detail.form.rfp.sections.filter(section => detail.responses?.some(item => item.id === `section-${section.key}`));
    }
    if (detail.client) detail.client.allowedActions = permitted(id, 'edit') ? ['CLIENT_UPDATE'] : [];
    for (const item of detail.responses ?? []) {
      item.allowedActions = [];
      if (manager(record) && isPreparing(record.detail)) item.allowedActions.push('ASSIGN');
      if (permitted(id, 'edit') && canAnswer(record.detail, item, id)) item.allowedActions.push('SAVE_ANSWER', 'SUBMIT_ANSWER');
      if (permitted(id, 'approve') && canReview(record.detail, item, id)) item.allowedActions.push('REVIEW_ANSWER');
    }
    return detail;
  }
  function log(record: MockRecord, action: string, note: string | null = null) {
    record.detail.activity ??= [];
    record.detail.activity.unshift({ id: `mock-event-${crypto.randomUUID()}`, action: directory ? action : `Mock · ${action}`, actor: actor(), at: new Date().toISOString(), note, packageRevision: record.detail.packageRevision });
  }
  function bump(record: MockRecord, action: string, note: string | null = null) { record.detail.revision++; log(record, action, note); }
  async function mutate<T, C extends { idempotencyKey: string }>(kind: string, command: C, update: (state: MockState) => T): Promise<T> {
    if (!command.idempotencyKey) throw new Error('A mock idempotency key is required.');
    const state = store.snapshot(), identity = `${actor().id}:${command.idempotencyKey}`, fingerprint = JSON.stringify({ kind, command }), old = state.requests[identity];
    if (old) { if (old.fingerprint !== fingerprint) throw new Error('Mock idempotency key was reused for another command.'); return mockCopy(old.result) as T; }
    const result = update(state); state.requests[identity] = { fingerprint, result: mockCopy(result) }; store.replace(state); return result;
  }
  return {
    async globalActions() { return permitted(actor().id, 'add') ? ['CLIENT_CREATE'] : []; },
    async lookups() { actor(); return mockCopy(lookups); },
    async detail(id, signal, mode) { mockAbort(signal); const state = store.snapshot(); return project(find(state, id), state, mode); },
    async list(filter, signal) {
      mockAbort(signal); const state = store.snapshot(), id = actor().id, term = filter.search.trim().toLowerCase();
      const records = Object.values(state.records).filter(record => filter.queue === 'MY_WORK'
        ? isPreparing(record.detail) && (manager(record) || (record.detail.responses ?? []).some(item => item.owner?.id === id && ['ASSIGNED', 'DRAFT', 'CHANGES_REQUESTED'].includes(item.state) || item.reviewer?.id === id && item.state === 'SUBMITTED'))
        : filter.queue === 'MY_APPROVALS' ? actions(record).some(action => ['SALES_APPROVE', 'SALES_REJECT', 'GATE1_GO', 'GATE1_NO_GO'].includes(action)) : true);
      const summaries: OpportunitySummary[] = records.map(record => {
        const detail = project(record, state);
        return { id: detail.id, number: detail.number, title: detail.title, estimatedValue: detail.estimatedValue, currencyCode: detail.currencyCode, clientName: detail.clientName, owner: detail.owner, priority: detail.priority, state: detail.state, rfpType: detail.rfpType, submissionDeadline: detail.submissionDeadline, revision: detail.revision, packageRevision: detail.packageRevision, allowedActions: detail.allowedActions };
      }).filter(summary => `${summary.title} ${summary.number} ${summary.clientName ?? ''}`.toLowerCase().includes(term));
      return mockPage(summaries, filter.after, filter.first);
    },
    save: command => mutate('save', command, state => {
      if (!permitted(actor().id, command.id === null ? 'add' : 'edit')) throw new Error('Your current role cannot create or edit opportunities.');
      const errors = pendingSaveErrors(command.form); if (errors.length) throw new Error(errors.join(' '));
      if (!user(command.form.ownerId).active || !permitted(command.form.ownerId, 'view') || !permitted(command.form.ownerId, 'edit')) throw new Error('Select an active Opportunity owner with edit permission.');
      if (!state.clients[command.form.clientId!] || !lookups.currencies.some(item => item.id === command.form.currencyId)) throw new Error('Select a valid mock client and currency.');
      const form = mockCopy(command.form);
      for (const question of form.rfp.questions) {
        if (question.id.startsWith('draft-')) question.id = `mock-question-${crypto.randomUUID()}`;
        if (question.masterQuestionId != null && !questions.some(item => item.id === question.masterQuestionId && item.isActive)) throw new Error('Unknown mock master question.');
      }
      let record: MockRecord;
      if (command.id === null) {
        if (command.expectedRevision !== null) throw new Error('New opportunity cannot have an existing revision.');
        const detail = fixtureOpportunity(); detail.id = String(state.nextId++); detail.number = `${directory ? 'OPP-LOCAL' : 'OPP-MOCK'}-${detail.id}`; detail.form = form; detail.responses = []; detail.estimation = null; detail.scope = null; detail.activity = []; detail.responsible = actor();
        detail.form.rfp.extraction = null;
        record = { detail, salesId: null, ceoId: null, packages: {} }; state.records[detail.id] = record; log(record, 'Opportunity created');
      } else {
        record = checked(state, { opportunityId: command.id, expectedRevision: command.expectedRevision ?? -1, idempotencyKey: command.idempotencyKey }); editable(record);
        form.rfp.extraction = form.rfp.source?.id === record.detail.form.rfp.source?.id ? mockCopy(record.detail.form.rfp.extraction) : null;
        if (JSON.stringify(form) === JSON.stringify(record.detail.form)) return project(record, state);
        record.detail.form = form; bump(record, 'Opportunity saved');
      }
      if (form.rfp.source && state.documents[form.rfp.source.id]?.opportunityId !== record.detail.id) throw new Error('Upload a mock document owned by this opportunity.');
      mockResponses(record.detail); pending(record, state); return project(record, state);
    }),
    async clients(search, after, signal) {
      mockAbort(signal); const id = actor().id, term = search.trim().toLowerCase();
      return mockPage(Object.values(store.snapshot().clients).filter(client => `${client.name} ${client.primaryContact.name}`.toLowerCase().includes(term)).map(client => ({ ...client, allowedActions: permitted(id, 'edit') ? ['CLIENT_UPDATE'] as Action[] : [] })), after);
    },
    saveClient: command => mutate('saveClient', command, state => {
      if (!permitted(actor().id, command.id ? 'edit' : 'add')) throw new Error('Your role cannot change clients.');
      mockValidateClient(command.form, lookups);
      const existing = command.id ? state.clients[command.id] : undefined;
      if (command.id && (!existing || existing.revision !== command.expectedRevision)) throw new Error('Mock client revision conflict.');
      if (!command.id && command.expectedRevision !== null) throw new Error('New client cannot have an existing revision.');
      const client: OpportunityClient = { ...mockCopy(command.form), id: command.id ?? `mock-client-${state.nextId++}`, revision: (existing?.revision ?? 0) + 1, accountTypeName: lookups.accountTypes.find(item => item.id === command.form.accountTypeId)?.label ?? '', industryName: lookups.industries.find(item => item.id === command.form.industryId)?.label ?? '', allowedActions: [] };
      state.clients[client.id] = client;
      for (const record of Object.values(state.records)) if (record.detail.state === 'SALES_REVIEW' && record.detail.form.clientId === client.id) { bump(record, 'Linked client updated'); pending(record, state); }
      return { ...mockCopy(client), allowedActions: ['CLIENT_UPDATE'] as Action[] };
    }),
    async eligibleUsers(input, signal) {
      mockAbort(signal); actor(); const ids = input.purpose === 'SALES_REVIEWER' ? eligible('SALES') : input.purpose === 'GATE1_APPROVER' ? eligible('CEO') : directory ? users.filter(value => value.active && permitted(value.id, 'view') && permitted(value.id, input.purpose === 'REVIEWER' ? 'approve' : 'edit')).map(value => value.id) : input.purpose === 'OWNER' ? ['101', '102'] : ['103'], term = input.search.trim().toLowerCase();
      return mockPage(users.filter(user => ids.includes(user.id) && `${user.name} ${user.email}`.toLowerCase().includes(term)).map(mockCopy), input.after);
    },
    upload: (command, file) => mutate('upload', { ...command, filename: file.name, size: file.size, modified: file.lastModified }, state => {
      if (directory) throw new Error('Document upload requires the backend integration.');
      const record = checked(state, command); editable(record);
      if (!/\.(pdf|docx?|txt)$/i.test(file.name) || file.size > 25 * 1024 * 1024) throw new Error('Choose PDF, Word or text up to 25 MB.');
      const document: SourceDocument = { id: `mock-document-${crypto.randomUUID()}`, name: `Mock upload · ${file.name}`, downloadUrl: null };
      state.documents[document.id] = { ...document, opportunityId: record.detail.id }; log(record, 'Simulated upload', 'Only mock filename stored; contents are not uploaded or parsed.'); return document;
    }),
    extract: command => mutate('extract', command, state => {
      if (directory) throw new Error('Document extraction requires the backend integration.');
      const record = checked(state, command); editable(record);
      if (record.detail.form.rfp.type !== 'QUESTIONNAIRE' || record.detail.form.rfp.source?.id !== command.documentId || state.documents[command.documentId]?.opportunityId !== record.detail.id) throw new Error('Save an uploaded mock questionnaire before simulating extraction.');
      record.detail.form.rfp.extraction = { id: `mock-extraction-${crypto.randomUUID()}`, state: 'PROCESSING', error: null }; bump(record, 'Simulated extraction started', 'Synthetic questions will be returned; no document parsing.'); pending(record, state); return project(record, state);
    }),
    async extractionStatus(id, jobId, signal) {
      if (directory) throw new Error('Document extraction requires the backend integration.');
      mockAbort(signal); const state = store.snapshot(), record = find(state, id); editable(record);
      const job = record.detail.form.rfp.extraction; if (!job || job.id !== jobId) throw new Error('Mock extraction job not found.');
      if (job.state === 'PROCESSING') {
        job.state = 'SUCCEEDED'; record.detail.form.rfp.questions.push(...MOCK_RFP_QUESTIONS.map(template => ({ id: `mock-question-${crypto.randomUUID()}`, text: `[Simulated extraction] ${template.question}`, sourceReference: 'Synthetic mock result; not parsed from the uploaded document', validated: false })));
        mockResponses(record.detail); bump(record, 'Simulated extraction completed'); pending(record, state); store.replace(state);
      }
      return project(record, state);
    },
    saveEstimation: command => mutate('estimation', command, state => {
      const record = checked(state, command); editable(record);
      if (command.estimation.revision !== (record.detail.estimation?.revision ?? 0)) throw new Error('Mock estimation revision conflict.');
      if (command.estimation.rows.some(row => !row.workItem.trim())) throw new Error('Enter estimation work items.');
      record.detail.estimation = { ...mockCopy(command.estimation), revision: command.estimation.revision + 1, total: estimateTotal(command.estimation.rows) }; bump(record, 'Estimation saved'); pending(record, state); return project(record, state);
    }),
    saveScope: command => mutate('scope', command, state => {
      const record = checked(state, command); editable(record);
      if (command.scope.revision !== (record.detail.scope?.revision ?? 0)) throw new Error('Mock scope revision conflict.');
      record.detail.scope = { ...mockCopy(command.scope), revision: command.scope.revision + 1 }; bump(record, 'Scope saved'); pending(record, state); return project(record, state);
    }),
    assign: command => mutate('assign', command, state => {
      const record = checked(state, command); editable(record); const item = response(record, command.responseId, command.responseRevision);
      if (!permitted(user(command.ownerId).id, 'edit') || !permitted(user(command.reviewerId).id, 'approve') || command.ownerId === command.reviewerId) throw new Error('Assign an eligible owner and independent reviewer.');
      if (!validDate(command.dueDate)) throw new Error('Set a valid response due date.');
      Object.assign(item, { owner: user(command.ownerId), reviewer: user(command.reviewerId), dueDate: command.dueDate, state: 'ASSIGNED', revision: item.revision + 1, submittedRevision: null, approvedRevision: null, reviewComment: null });
      bump(record, 'Optional response assigned', item.title); pending(record, state); return project(record, state);
    }),
    answer: command => mutate('answer', command, state => {
      const record = checked(state, command), item = response(record, command.responseId, command.responseRevision);
      if (!permitted(actor().id, 'edit') || !canAnswer(record.detail, item, actor().id)) throw new Error('Only the assigned mock response owner may save or submit.');
      if (command.submit && (!command.answer.trim() || !item.sourceValidated)) throw new Error('Enter an answer and validate the source before submitting.');
      item.answer = command.answer; item.revision++; item.state = command.submit ? 'SUBMITTED' : 'DRAFT'; item.submittedRevision = command.submit ? item.revision : null; item.approvedRevision = null; item.reviewComment = null;
      bump(record, command.submit ? 'Optional response submitted' : 'Answer draft saved', item.title); pending(record, state); return project(record, state);
    }),
    reviewAnswer: command => mutate('reviewAnswer', command, state => {
      const record = checked(state, command), item = response(record, command.responseId, command.responseRevision);
      if (!permitted(actor().id, 'approve') || !canReview(record.detail, item, actor().id) || command.submittedRevision !== item.submittedRevision) throw new Error('Only the independent mock reviewer may review the exact submitted revision.');
      if (!command.approved && !command.reason.trim()) throw new Error('Enter a reason when requesting changes.');
      item.state = command.approved ? 'APPROVED' : 'CHANGES_REQUESTED'; item.approvedRevision = command.approved ? item.revision : null; item.reviewComment = command.reason.trim() || null;
      bump(record, command.approved ? 'Optional response approved' : 'Changes requested', command.reason.trim() || item.title); pending(record, state); return project(record, state);
    }),
    decide: command => mutate('decide', command, state => {
      const record = checked(state, command);
      if (!command.confirmed) throw new Error('Confirm review of the submitted package.');
      if (record.detail.packageRevision !== command.packageRevision || !record.packages[String(command.packageRevision)]) throw new Error('Mock package revision conflict.');
      if (!actions(record).includes(command.decision)) throw new Error('This user is not assigned this decision at the current stage.');
      if ((command.decision === 'SALES_REJECT' || command.decision === 'GATE1_NO_GO') && !command.reason.trim()) throw new Error('Enter a decision reason.');
      if (command.decision === 'SALES_APPROVE') { if (!assigned(record, 'CEO').length) throw new Error('No assigned active CEO remains eligible.'); record.detail.state = 'GATE1_PENDING'; record.detail.responsible = null; record.detail.salesRecommendation = { actor: actor(), note: command.reason.trim() || null, packageRevision: command.packageRevision }; }
      else if (command.decision === 'SALES_REJECT') { record.detail.state = 'SALES_REJECTED'; record.detail.responsible = record.detail.owner; }
      else { if (record.detail.salesRecommendation?.packageRevision !== command.packageRevision) throw new Error('Sales Head must first approve the current package.'); record.detail.state = command.decision === 'GATE1_GO' ? 'GATE1_GO' : 'GATE1_NO_GO'; record.detail.responsible = null; }
      bump(record, command.decision.replace(/_/g, ' '), command.reason.trim() || null); return project(record, state);
    }),
  };
}
function mockValidateClient(form: ClientDraft, lookups = TEST_LOOKUPS) {
  if (![form.name, form.relationship, form.country, form.stateProvince, form.city, form.primaryContact.name, form.primaryContact.title, form.primaryContact.email, form.primaryContact.phone, form.primaryContact.decisionRole].every(value => value.trim())) throw new Error('Complete required client and contact fields.');
  if (!lookups.accountTypes.some(item => item.id === form.accountTypeId) || !lookups.industries.some(item => item.id === form.industryId)) throw new Error('Select mock account type and industry.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.primaryContact.email)) throw new Error('Enter a valid contact email.');
  if (form.website && !/^https?:\/\/\S+$/.test(form.website)) throw new Error('Enter an HTTP or HTTPS website.');
  if (form.additionalContacts.some(contact => !contact.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email))) throw new Error('Complete additional contact names and valid emails.');
}
