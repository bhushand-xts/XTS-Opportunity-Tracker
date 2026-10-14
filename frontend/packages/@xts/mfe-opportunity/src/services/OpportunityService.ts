import { createContext, useContext } from 'react';
import { GET_OPPORTUNITY_OWNER_DIRECTORY, type OwnerDirectoryData } from './userDirectory.queries';
import { mapOwnerDirectory } from './useOwnerDirectory';
import { getApolloClient } from '@xts/api-client';
import type { Action, ClientDraft, DecisionCommand, DirectoryUser, Estimation, ListFilter, OpportunityClient, OpportunityDetail, OpportunityLookups, OpportunitySummary, Page, ResponseCommand, SaveCommand, Scope, SourceDocument, VersionCommand } from '@xts/api-contracts';
import { CREATE_OPPORTUNITY_CLIENT, UPDATE_OPPORTUNITY_CLIENT, GET_CLIENT_CREATE_ACCESS, CREATE_OPPORTUNITY, GET_OPPORTUNITY, GET_OPPORTUNITY_LOOKUPS, LIST_OPPORTUNITIES, LIST_OPPORTUNITY_CLIENTS, UPDATE_OPPORTUNITY } from './opportunity.queries';

export class IntegrationUnavailable extends Error {
  readonly code = 'INTEGRATION_UNAVAILABLE';
  constructor(capability: string) { super(`${capability} is not available yet. Your work has not been saved. Please try again once this service is connected.`); }
}
/** Service methods return persisted server state. Never return optimistic/fake success. */
export interface OpportunityService {
  globalActions(): Promise<Action[]>;
  list(filter: ListFilter, signal?: AbortSignal): Promise<Page<OpportunitySummary>>;
  detail(id: string, signal?: AbortSignal, mode?: 'WORK' | 'DETAILS' | 'REVIEW'): Promise<OpportunityDetail>;
  save(command: SaveCommand): Promise<OpportunityDetail>;
  lookups(): Promise<OpportunityLookups>;
  clients(search: string, after: string | null, signal?: AbortSignal): Promise<Page<OpportunityClient>>;
  saveClient(input: { id: string | null; expectedRevision: number | null; idempotencyKey: string; form: ClientDraft }): Promise<OpportunityClient>;
  eligibleUsers(input: { opportunityId: string | null; purpose: 'OWNER' | 'REVIEWER' | 'SALES_REVIEWER' | 'GATE1_APPROVER'; search: string; after: string | null }, signal?: AbortSignal): Promise<Page<DirectoryUser>>;
  upload(command: VersionCommand, file: File): Promise<SourceDocument>;
  extract(command: VersionCommand & { documentId: string }): Promise<OpportunityDetail>;
  extractionStatus(opportunityId: string, jobId: string, signal?: AbortSignal): Promise<OpportunityDetail>;
  saveEstimation(command: VersionCommand & { estimation: Estimation }): Promise<OpportunityDetail>;
  saveScope(command: VersionCommand & { scope: Scope }): Promise<OpportunityDetail>;
  assign(command: ResponseCommand & { ownerId: string; reviewerId: string; dueDate: string }): Promise<OpportunityDetail>;
  answer(command: ResponseCommand & { answer: string; submit: boolean }): Promise<OpportunityDetail>;
  reviewAnswer(command: ResponseCommand & { approved: boolean; reason: string; submittedRevision: number }): Promise<OpportunityDetail>;
  decide(command: DecisionCommand): Promise<OpportunityDetail>;
}

async function unavailable(capability: string): Promise<never> { throw new IntegrationUnavailable(capability); }

import { DECISION_ROLE_IDS, SERVICE_LINES } from '../lib/opportunityOptions';

interface BackendContact { fullName: string; titleRole: string; email: string; phone: string; roleInDecision: number | null; roleInDecisionOther?: string | null; }
interface BackendOpportunity {
  opportunityId: number; opportunityNumber: string | null; opportunityName: string | null;
  sourceTypeId: number | null; clientId: number | null; stageId: number | null; subStageId: number | null;
  ownerId: number | null; assignedTo: number | null; priority: string | null; serviceLine: string | null;
  solicitationNumber: string | null; issuingAgency: string | null; procurementContact: string | null;
  queDueDate: string | null; submissionMethod: string | null; contractTerm: string | null; incumbentVendor: string | null;
  preBidMeeting: number | null; documentType: string | null; fileName: string | null; docSubmissionFormat: string | null;
  evaluationBasis: string | null; opportunityDescription: string | null; leadReceivedDate: string | null;
  proposalDueDate: string | null; estimatedValue: number | null; estimatedValueUsd?: number | null; currencyId: number | null; rfpType: number | null;
  workflowComment: string | null; clientName: string | null; accountType: string | null; sector: string | null;
  website: string | null; city: string | null; state: string | null; country: string | null; streetAddress: string | null;
  contacts: BackendContact[]; proposalQuestions: string[]; proposalQuestionIds: (number | null)[];
}
interface BackendClient {
  clientId: number; clientName: string; accountType: string | null; sector: string | null; website: string | null;
  city: string | null; state: string | null; country: string | null; streetAddress: string | null; contacts: BackendContact[];
}

function page<T>(nodes: T[]): Page<T> { return { nodes, totalCount: nodes.length, endCursor: null, hasNextPage: false }; }
function user(id: number | null | undefined, directory: DirectoryUser[]): DirectoryUser | null {
  return id ? directory.find(entry => entry.id === String(id)) ?? { id: String(id), name: 'User details unavailable', email: '', roles: [], active: false } : null;
}

async function opportunityUsers(): Promise<DirectoryUser[]> {
  const { data } = await getApolloClient().query<OwnerDirectoryData>({ query: GET_OPPORTUNITY_OWNER_DIRECTORY, fetchPolicy: 'network-only', errorPolicy: 'none' });
  return mapOwnerDirectory(data);
}
function priority(value: string | null): OpportunitySummary['priority'] {
  const key = (value || 'MEDIUM').toUpperCase();
  return key === 'LOW' || key === 'HIGH' ? key : 'MEDIUM';
}
function rfpType(value: number | null): OpportunitySummary['rfpType'] {
  return value === 1 ? 'QUESTIONNAIRE' : value === 2 ? 'GENERIC' : null;
}
function submissionMethod(value: string | null) {
  const key = (value || 'PORTAL').toUpperCase();
  return key === 'EMAIL' || key === 'PHYSICAL' ? key : 'PORTAL';
}
function preBidMeeting(value: number | null) {
  return value === 1 ? 'YES' : value === 2 ? 'NO' : 'UNCONFIRMED';
}
function preBidMeetingId(value: string) {
  return value === 'YES' ? 1 : value === 'NO' ? 2 : null;
}
function state(o: BackendOpportunity): OpportunitySummary['state'] {
  if (o.stageId === 5 || o.subStageId === 10) return 'GATE1_GO';
  if (o.stageId === 3 || o.subStageId === 7) return 'IN_PROGRESS';
  if (o.stageId === 2) return 'GATE1_PENDING';
  if (o.stageId === 1 && o.subStageId === 2) return 'PREPARATION_PENDING';
  return 'SALES_REVIEW';
}
function actions(o: BackendOpportunity): Action[] {
  const s = state(o);
  return s === 'PREPARATION_PENDING' || s === 'SALES_REVIEW' ? ['EDIT'] : [];
}
function mapContact(contact: BackendContact, id?: string) {
  const roles = Object.fromEntries(Object.entries(DECISION_ROLE_IDS).map(([label, id]) => [id, label]));
  return { id, name: contact.fullName ?? '', title: contact.titleRole ?? '', email: contact.email ?? '', phone: contact.phone ?? '', decisionRole: contact.roleInDecision == null ? '' : roles[contact.roleInDecision] ?? 'Unknown role', decisionRoleOther: contact.roleInDecisionOther ?? '' };
}
function mapClient(c: BackendClient): OpportunityClient {
  const [primary, ...additional] = c.contacts ?? [];
  return {
    id: String(c.clientId), revision: 1, name: c.clientName ?? '', relationship: '', accountTypeId: c.accountType ?? '',
    industryId: c.sector ?? '', website: c.website ?? '', address: c.streetAddress ?? '', country: c.country ?? '',
    stateProvince: c.state ?? '', city: c.city ?? '', streetAddress: c.streetAddress ?? '',
    primaryContact: primary ? mapContact(primary, `${c.clientId}-primary`) : { name: '', title: '', email: '', phone: '', decisionRole: '' },
    additionalContacts: additional.map((contact, index) => mapContact(contact, `${c.clientId}-${index + 1}`)),
    accountTypeName: c.accountType ?? '', industryName: c.sector ?? '', allowedActions: [],
  };
}
function mapOpportunity(o: BackendOpportunity, directory: DirectoryUser[], currencyCode = 'INR'): OpportunityDetail {
  const currentState = state(o);
  const owner = user(o.ownerId, directory);
  const client = o.clientId ? mapClient({
    clientId: o.clientId, clientName: o.clientName ?? '', accountType: o.accountType, sector: o.sector, website: o.website,
    city: o.city, state: o.state, country: o.country, streetAddress: o.streetAddress, contacts: o.contacts ?? [],
  }) : null;
  const questions = (o.proposalQuestions ?? []).map((text, index) => ({
    id: `question-${o.proposalQuestionIds?.[index] ?? index + 1}`,
    masterQuestionId: o.proposalQuestionIds?.[index] ?? null,
    text, sourceReference: '', validated: true,
  }));
  return {
    id: String(o.opportunityId), number: o.opportunityNumber ?? String(o.opportunityId), title: o.opportunityName ?? '',
    estimatedValue: String(o.estimatedValue ?? ''), currencyCode, clientName: o.clientName, owner, priority: priority(o.priority),
    state: currentState, rfpType: rfpType(o.rfpType), submissionDeadline: o.proposalDueDate, revision: 1,
    packageRevision: null, allowedActions: actions(o),
    form: {
      title: o.opportunityName ?? '', estimatedValue: String(o.estimatedValue ?? ''), estimatedValueUsd: String(o.estimatedValueUsd ?? ''), serviceLineOther: o.serviceLine && !SERVICE_LINES.includes(o.serviceLine) ? o.serviceLine : '', currencyId: String(o.currencyId ?? ''),
      serviceLine: o.serviceLine && !SERVICE_LINES.includes(o.serviceLine) ? 'Other' : o.serviceLine ?? '', leadSource: String(o.sourceTypeId ?? ''), ownerId: String(o.ownerId ?? ''),
      priority: priority(o.priority), description: o.opportunityDescription ?? '', clientId: o.clientId ? String(o.clientId) : null,
      solicitation: {
        reference: o.solicitationNumber ?? '', version: '', issuingAgency: o.issuingAgency ?? '', procurementContact: o.procurementContact ?? '',
        submissionMethod: submissionMethod(o.submissionMethod), vendorDemo: 'UNCONFIRMED', portalUrl: '', submissionEmail: '',
        deliveryInstructions: '', contractTerm: o.contractTerm ?? '', incumbentVendor: o.incumbentVendor ?? '',
        preBidMeeting: preBidMeeting(o.preBidMeeting), submissionTimezone: 'Asia/Kolkata',
      },
      dates: { issueDate: o.leadReceivedDate ?? '', questionsDue: o.queDueDate ?? '', proposalDue: o.proposalDueDate ?? '', submissionDeadline: o.proposalDueDate ?? '', additionalDeadline: '', additionalDeadlineLabel: '' },
      context: { instructions: '', submissionRequirements: '', opportunityOverview: o.opportunityDescription ?? '', scopeOfWork: '', requirements: '', notes: o.workflowComment ?? '' },
      rfp: { type: rfpType(o.rfpType), source: o.fileName ? { id: o.fileName, name: o.fileName, downloadUrl: null } : null, extraction: null, questions: questions.filter(q => q.masterQuestionId === null), sections: questions.filter(q => q.masterQuestionId !== null).map(q => ({ key: String(q.masterQuestionId), instructions: q.text })), submissionFormat: 'TECHNICAL_COST', outputFormat: 'PDF', evaluation: o.evaluationBasis ?? '' },
    },
    client, visibleModules: ['overview', 'activity'], responses: null, estimation: null, scope: null,
    activity: [], responsible: user(o.assignedTo, directory) ?? owner, approvalAssignees: o.assignedTo ? [user(o.assignedTo, directory)!] : [],
    readiness: { ready: true, issues: [] }, salesRecommendation: null,
  };
}
function saveInput(command: SaveCommand) {
  const form = command.form;
  return {
    proposalQuestionSelections: [...form.rfp.sections.map(s => ({ questionId: Number(s.key), question: s.instructions })), ...form.rfp.questions.map(q => ({ questionId: q.masterQuestionId ?? null, question: q.text }))],
    clientId: form.clientId ? Number(form.clientId) : null,
    opportunityDescription: form.description || null,
    contractTerm: form.rfp.type === 'QUESTIONNAIRE' ? form.solicitation.contractTerm || null : null,
    incumbentVendor: form.rfp.type === 'QUESTIONNAIRE' ? form.solicitation.incumbentVendor || null : null,
    preBidMeeting: form.rfp.type === 'QUESTIONNAIRE' ? preBidMeetingId(form.solicitation.preBidMeeting) : null,
    leadReceivedDate: form.dates.issueDate || null,
    opportunityName: form.title,
    ownerId: Number(form.ownerId),
    currencyId: Number(form.currencyId),
    estimatedValue: Number(form.estimatedValue),
    estimatedValueUsd: form.estimatedValueUsd?.trim() ? Number(form.estimatedValueUsd) : null,
    sourceTypeId: Number(form.leadSource) || 1,
    opportunityTypeId: form.rfp.type === 'QUESTIONNAIRE' ? 1 : 2,
    rfpType: form.rfp.type === 'QUESTIONNAIRE' ? 1 : 2,
    priority: form.priority,
    serviceLine: form.serviceLine === 'Other' ? form.serviceLineOther?.trim() : form.serviceLine,
    solicitationNumber: form.solicitation.reference,
    issuingAgency: form.solicitation.issuingAgency,
    procurementContact: form.solicitation.procurementContact || null,
    queDueDate: form.dates.questionsDue || null,
    proposalDueDate: form.dates.submissionDeadline || form.dates.proposalDue || null,
    submissionMethod: form.solicitation.submissionMethod,
    fileName: form.rfp.source?.name ?? null,
    documentType: form.rfp.source?.name ? 'SOURCE' : null,
    docSubmissionFormat: form.rfp.outputFormat,
    evaluationBasis: form.rfp.evaluation || null,
  };
}

/** Production boundary: source audit confirms workflow APIs are absent/stubs.
 * Implemented directory masters use the existing authenticated Apollo client.
 * Replace individual unavailable methods with approved GraphQL operations when
 * backend/schema validation is complete. Never fall back to a development mock.
 */
export const productionOpportunityService: OpportunityService = {
  async globalActions() {
    const { data } = await getApolloClient().query<{ opportunityClientCreateAllowed: boolean }>({ query: GET_CLIENT_CREATE_ACCESS, fetchPolicy: 'network-only', errorPolicy: 'none' });
    return data.opportunityClientCreateAllowed ? ['CLIENT_CREATE'] : [];
  },
  async list(filter) {
    const { data } = await getApolloClient().query<{ opportunities: BackendOpportunity[] }>({ query: LIST_OPPORTUNITIES, fetchPolicy: 'network-only' });
    const q = filter.search.trim().toLowerCase();
    const directory = await opportunityUsers();
    return page(data.opportunities.map(o => mapOpportunity(o, directory)).filter(o => !q || `${o.title} ${o.clientName ?? ''} ${o.number}`.toLowerCase().includes(q)));
  },
  async detail(id) {
    const { data } = await getApolloClient().query<{ opportunity: BackendOpportunity | null }>({ query: GET_OPPORTUNITY, variables: { opportunityId: Number(id) }, fetchPolicy: 'network-only' });
    if (!data.opportunity) throw new Error('Opportunity not found.');
    return mapOpportunity(data.opportunity, await opportunityUsers());
  },
  async save(command) {
    const client = getApolloClient();
    if (command.id) {
      const { data } = await client.mutate<{ updateOpportunity: BackendOpportunity }>({ mutation: UPDATE_OPPORTUNITY, variables: { opportunityId: Number(command.id), input: saveInput(command) } });
      if (!data?.updateOpportunity) throw new Error('Opportunity was not saved.');
      return productionOpportunityService.detail(command.id);
    }
    const { data } = await client.mutate<{ createOpportunity: BackendOpportunity }>({ mutation: CREATE_OPPORTUNITY, variables: { input: saveInput(command) } });
    if (!data?.createOpportunity) throw new Error('Opportunity was not created.');
    return productionOpportunityService.detail(String(data.createOpportunity.opportunityId));
  },
  async clients(search) {
    const { data } = await getApolloClient().query<{ opportunityClients: BackendClient[] }>({ query: LIST_OPPORTUNITY_CLIENTS, fetchPolicy: 'network-only' });
    const q = search.trim().toLowerCase();
    return page(data.opportunityClients.map(mapClient).filter(c => !q || `${c.name} ${c.primaryContact.name} ${c.primaryContact.email}`.toLowerCase().includes(q)));
  },
  async saveClient(command) {
    const form = command.form;
    const lookups = await productionOpportunityService.lookups();
    const accountType = lookups.accountTypes.find(option => option.id === form.accountTypeId)?.label;
    const sector = lookups.industries.find(option => option.id === form.industryId)?.label;
    if (!accountType || !sector) throw new Error('Select a valid account type and sector.');
    const roles = DECISION_ROLE_IDS;
    const contacts = [form.primaryContact, ...form.additionalContacts].map(contact => ({
      fullName: contact.name, titleRole: contact.title, email: contact.email, phone: contact.phone,
      roleInDecision: roles[contact.decisionRole] ?? Number(contact.decisionRole),
      roleInDecisionOther: contact.decisionRole === 'Other' ? contact.decisionRoleOther?.trim() : null,
    }));
    const { data } = await getApolloClient().mutate<{ createOpportunityClient?: BackendClient; updateOpportunityClient?: BackendClient }>({
      mutation: command.id ? UPDATE_OPPORTUNITY_CLIENT : CREATE_OPPORTUNITY_CLIENT, variables: {
        ...(command.id ? { clientId: Number(command.id) } : {}),
        client: { clientName: form.name, accountType, sector, website: form.website || null, city: form.city,
          state: form.stateProvince, country: form.country, streetAddress: form.streetAddress || form.address || null },
        contacts,
      }, errorPolicy: 'none',
    });
    const saved = command.id ? data?.updateOpportunityClient : data?.createOpportunityClient;
    if (!saved) throw new Error('Client was not saved.');
    return mapClient(saved);
  },
  eligibleUsers: () => unavailable('Eligible user directory'),
  upload: () => unavailable('Document upload'),
  extract: () => unavailable('Question extraction'),
  extractionStatus: () => unavailable('Extraction status'),
  saveEstimation: () => unavailable('Estimation persistence'),
  saveScope: () => unavailable('Scope persistence'),
  assign: () => unavailable('Response assignment'),
  answer: () => unavailable('Answer persistence'),
  reviewAnswer: () => unavailable('Answer review'),
  decide: () => unavailable('Approval decisions'),
  async lookups() {
    const { data } = await getApolloClient().query<{
      currencies: { currencyId: number; currencyName: string; currencyCode: string; isActive: boolean }[];
      industries: { industryId: number; industryName: string; isActive: boolean }[];
      accountTypes: { accountTypeId: number; accountName: string; isActive: boolean }[];
    }>({ query: GET_OPPORTUNITY_LOOKUPS, fetchPolicy: 'network-only' });
    return {
      currencies: data.currencies.filter(x => x.isActive).map(x => ({ id: String(x.currencyId), label: `${x.currencyCode} · ${x.currencyName}`, code: x.currencyCode })),
      industries: data.industries.filter(x => x.isActive).map(x => ({ id: String(x.industryId), label: x.industryName })),
      accountTypes: data.accountTypes.filter(x => x.isActive).map(x => ({ id: String(x.accountTypeId), label: x.accountName })),
    };
  },
};

export const OpportunityServiceContext = createContext<OpportunityService>(productionOpportunityService);
export function useOpportunityService() { return useContext(OpportunityServiceContext); }
