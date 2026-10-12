import { createContext, useContext } from 'react';
import { getApolloClient } from '@xts/api-client';
import type { Action, ClientDraft, DecisionCommand, DirectoryUser, Estimation, ListFilter, OpportunityClient, OpportunityDetail, OpportunityLookups, OpportunitySummary, Page, ResponseCommand, SaveCommand, Scope, SourceDocument, VersionCommand } from '@xts/api-contracts';
import { GET_OPPORTUNITY_LOOKUPS } from './opportunity.queries';

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
  submitSales(command: VersionCommand & { salesReviewerId: string; gate1ApproverId: string }): Promise<OpportunityDetail>;
  decide(command: DecisionCommand): Promise<OpportunityDetail>;
}

async function unavailable(capability: string): Promise<never> { throw new IntegrationUnavailable(capability); }

/** Production boundary: source audit confirms workflow APIs are absent/stubs.
 * Implemented directory masters use the existing authenticated Apollo client.
 * Replace individual unavailable methods with approved GraphQL operations when
 * backend/schema validation is complete. Never fall back to a development mock.
 */
export const productionOpportunityService: OpportunityService = {
  // No global workflow capability API is deployed; deny directory writes.
  globalActions: async () => [],
  list: () => unavailable('Opportunity pipeline'),
  detail: () => unavailable('Opportunity details'),
  save: () => unavailable('Opportunity persistence'),
  clients: () => unavailable('Client directory'),
  saveClient: () => unavailable('Client persistence'),
  eligibleUsers: () => unavailable('Eligible user directory'),
  upload: () => unavailable('Document upload'),
  extract: () => unavailable('Question extraction'),
  extractionStatus: () => unavailable('Extraction status'),
  saveEstimation: () => unavailable('Estimation persistence'),
  saveScope: () => unavailable('Scope persistence'),
  assign: () => unavailable('Response assignment'),
  answer: () => unavailable('Answer persistence'),
  reviewAnswer: () => unavailable('Answer review'),
  submitSales: () => unavailable('Sales review submission'),
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
