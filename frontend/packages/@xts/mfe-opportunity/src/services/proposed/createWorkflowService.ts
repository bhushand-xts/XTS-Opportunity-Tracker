/** Real workflow adapter. All requests use the shared authenticated gateway. */
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import type { DocumentNode } from 'graphql';
import type { Action, OpportunityClient, OpportunityDetail, OpportunitySummary, Page, DirectoryUser, SourceDocument, ReasonCode } from '@xts/api-contracts';
import { activeReasonCodes, type OpportunityService } from '../OpportunityService';
import { GET_OPPORTUNITY_LOOKUPS, GET_OPPORTUNITY_REASON_CODES } from '../opportunity.queries';
import * as operations from './workflow.queries';

function message(error: unknown) {
  const cause = error && typeof error === 'object'
    ? error as { graphQLErrors?: { message: string; extensions?: { code?: string } }[]; message?: string }
    : undefined;
  const conflict = Array.isArray(cause?.graphQLErrors) && cause.graphQLErrors.find(e => e?.extensions?.code === 'REVISION_CONFLICT');
  if (conflict) return new Error('This record changed while you were editing. Your draft is retained. Compare it with the latest saved revision before retrying.');
  if (error instanceof Error) return error;
  return new Error(typeof cause?.message === 'string' && cause.message || typeof error === 'string' && error || 'The service request failed. Please retry.');
}
export function stripGraphqlMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripGraphqlMetadata);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== '__typename').map(([key, item]) => [key, stripGraphqlMetadata(item)]));
  return value;
}
export function createWorkflowService(client: ApolloClient<NormalizedCacheObject>): OpportunityService {
  async function query<T>(document: DocumentNode, variables: Record<string, unknown>, field: string, signal?: AbortSignal): Promise<T> {
    try {
      const { data } = await client.query<Record<string, T>>({ query: document, variables, fetchPolicy: 'network-only', errorPolicy: 'none', context: { fetchOptions: { signal } } });
      if (data[field] == null) throw new Error('The record was not returned, or it is outside your access scope.');
      return data[field];
    } catch (cause) { throw message(cause); }
  }
  async function mutate<T>(document: DocumentNode, input: unknown, field: string): Promise<T> {
    try {
      const { data } = await client.mutate<Record<string, T>>({ mutation: document, variables: { input: stripGraphqlMetadata(input) }, errorPolicy: 'none' });
      if (!data || data[field] == null) throw new Error('No saved result was returned. Refresh before retrying to avoid duplicate changes.');
      // Do not erase unrelated admin caches. List/queue/detail requests are
      // network-only; evict just this feature's projections after persistence.
      for (const fieldName of ['opportunityWorkflowPage', 'opportunityWorkspace', 'opportunityExtractionStatus']) client.cache.evict({ id: 'ROOT_QUERY', fieldName });
      if (field === 'saveOpportunityClient') client.cache.evict({ id: 'ROOT_QUERY', fieldName: 'clientDirectoryPage' });
      client.cache.gc();
      return data[field];
    } catch (cause) { throw message(cause); }
  }
  return {
    globalActions: () => query<Action[]>(operations.GLOBAL_ACTIONS, {}, 'opportunityWorkflowActions'),
    async reasonCodes() {
      return activeReasonCodes(await query<(ReasonCode | null)[]>(GET_OPPORTUNITY_REASON_CODES, {}, 'reasonCodesList'));
    },
    async lookups() {
      try {
        const { data } = await client.query<{
          currencies: { currencyId: number; currencyName: string; currencyCode: string; isActive: boolean }[];
          industries: { industryId: number; industryName: string; isActive: boolean }[];
          accountTypes: { accountTypeId: number; accountName: string; isActive: boolean }[];
        }>({ query: GET_OPPORTUNITY_LOOKUPS, fetchPolicy: 'network-only', errorPolicy: 'none' });
        if (!Array.isArray(data?.currencies) || !Array.isArray(data?.industries) || !Array.isArray(data?.accountTypes)) throw new Error('The master data response was incomplete. Please retry.');
        return {
          currencies: data.currencies.filter(x => x.isActive).map(x => ({ id: String(x.currencyId), label: `${x.currencyCode} · ${x.currencyName}`, code: x.currencyCode })),
          industries: data.industries.filter(x => x.isActive).map(x => ({ id: String(x.industryId), label: x.industryName })),
          accountTypes: data.accountTypes.filter(x => x.isActive).map(x => ({ id: String(x.accountTypeId), label: x.accountName })),
        };
      } catch (cause) { throw message(cause); }
    },
    list: (filter, signal) => query<Page<OpportunitySummary>>(operations.OPPORTUNITY_PAGE, { filter }, 'opportunityWorkflowPage', signal),
    detail: (id, signal, mode = 'WORK') => query<OpportunityDetail>(operations.OPPORTUNITY_WORKSPACE, { id, mode }, 'opportunityWorkspace', signal),
    save: async command => {
      const { source, extraction: _extraction, ...rfp } = command.form.rfp;
      void _extraction;
      const saved = await mutate<OpportunityDetail>(operations.SAVEOPPORTUNITYWORKFLOW, { ...command, form: { ...command.form, rfp: { ...rfp, sourceDocumentId: source?.id ?? null } } }, 'saveOpportunityWorkflow');
      if (command.id === null && (saved.state !== 'SALES_REVIEW' || !Number.isInteger(saved.packageRevision) || (saved.packageRevision ?? 0) < 1 || !saved.approvalAssignees?.length || saved.approvalAssignees.some(user => !user.id || user.active !== true))) {
        throw new Error('The server returned an opportunity without its Pending approval assignment. It may already be saved. Refresh before retrying to avoid duplicate creation.');
      }
      return saved;
    },
    clients: (search, after, signal) => query<Page<OpportunityClient>>(operations.CLIENT_PAGE, { search, after, first: 25 }, 'clientDirectoryPage', signal),
    saveClient: input => {
      // Client snapshots contain display fields/actions; whitelist the mutable
      // shared-directory data so audit fields cannot enter mutation inputs.
      const f = input.form;
      const form = { name: f.name, relationship: f.relationship, accountTypeId: f.accountTypeId, industryId: f.industryId, website: f.website, address: f.address, country: f.country, stateProvince: f.stateProvince, city: f.city, streetAddress: f.streetAddress, primaryContact: f.primaryContact, additionalContacts: f.additionalContacts };
      return mutate<OpportunityClient>(operations.SAVEOPPORTUNITYCLIENT, { ...input, form }, 'saveOpportunityClient');
    },
    eligibleUsers: (input, signal) => query<Page<DirectoryUser>>(operations.ELIGIBLE_USERS, { input: { ...input, first: 25 } }, 'eligibleOpportunityUsers', signal),
    upload: async (command, file) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return mutate<SourceDocument>(operations.UPLOADOPPORTUNITYSOURCE, { ...command, filename: file.name, mimeType: file.type, contentBase64: btoa(binary) }, 'uploadOpportunitySource');
    },
    extract: command => mutate<OpportunityDetail>(operations.STARTOPPORTUNITYEXTRACTION, command, 'startOpportunityExtraction'),
    extractionStatus: (opportunityId, jobId, signal) => query<OpportunityDetail>(operations.EXTRACTION_STATUS, { opportunityId, jobId }, 'opportunityExtractionStatus', signal),
    saveEstimation: command => mutate<OpportunityDetail>(operations.SAVEOPPORTUNITYESTIMATION, command, 'saveOpportunityEstimation'),
    saveScope: command => mutate<OpportunityDetail>(operations.SAVEOPPORTUNITYSCOPE, command, 'saveOpportunityScope'),
    assign: command => mutate<OpportunityDetail>(operations.ASSIGNOPPORTUNITYRESPONSE, command, 'assignOpportunityResponse'),
    answer: command => mutate<OpportunityDetail>(operations.SAVEOPPORTUNITYANSWER, command, 'saveOpportunityAnswer'),
    reviewAnswer: command => mutate<OpportunityDetail>(operations.REVIEWOPPORTUNITYANSWER, command, 'reviewOpportunityAnswer'),
    decide: command => mutate<OpportunityDetail>(operations.DECIDEOPPORTUNITYPACKAGE, command, 'decideOpportunityPackage'),
  };
}
