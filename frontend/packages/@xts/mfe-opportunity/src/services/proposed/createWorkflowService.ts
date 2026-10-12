/** Backend handoff adapter. Not selected by production until schema deployment,
 * authentication/tenant enforcement and integration tests are complete. */
import type { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import type { DocumentNode } from 'graphql';
import type { Action, OpportunityClient, OpportunityDetail, OpportunitySummary, Page, DirectoryUser, SourceDocument } from '@xts/api-contracts';
import { productionOpportunityService, type OpportunityService } from '../OpportunityService';
import * as operations from './workflow.queries';

function message(error: unknown) {
  const cause = error as { graphQLErrors?: { message: string; extensions?: { code?: string } }[]; message?: string };
  const conflict = cause.graphQLErrors?.find(e => e.extensions?.code === 'REVISION_CONFLICT');
  if (conflict) return new Error('This record changed while you were editing. Your draft is retained. Compare it with the latest saved revision before retrying.');
  return error instanceof Error ? error : new Error(cause.message || 'The service request failed. Please retry.');
}
export function stripGraphqlMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripGraphqlMetadata);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => key !== '__typename').map(([key, item]) => [key, stripGraphqlMetadata(item)]));
  return value;
}
export function createWorkflowService(client: ApolloClient<NormalizedCacheObject>): OpportunityService {
  async function query<T>(document: DocumentNode, variables: Record<string, unknown>, field: string, signal?: AbortSignal): Promise<T> {
    try {
      const { data } = await client.query<Record<string, T>>({ query: document, variables, fetchPolicy: 'network-only', context: { fetchOptions: { signal } } });
      if (data[field] == null) throw new Error('The record was not returned, or it is outside your access scope.');
      return data[field];
    } catch (cause) { throw message(cause); }
  }
  async function mutate<T>(document: DocumentNode, input: unknown, field: string): Promise<T> {
    try {
      const { data } = await client.mutate<Record<string, T>>({ mutation: document, variables: { input: stripGraphqlMetadata(input) } });
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
    lookups: productionOpportunityService.lookups,
    list: (filter, signal) => query<Page<OpportunitySummary>>(operations.OPPORTUNITY_PAGE, { filter }, 'opportunityWorkflowPage', signal),
    detail: (id, signal, mode = 'WORK') => query<OpportunityDetail>(operations.OPPORTUNITY_WORKSPACE, { id, mode }, 'opportunityWorkspace', signal),
    save: command => {
      const { source, extraction: _extraction, ...rfp } = command.form.rfp;
      void _extraction;
      return mutate<OpportunityDetail>(operations.SAVEOPPORTUNITYWORKFLOW, { ...command, form: { ...command.form, rfp: { ...rfp, sourceDocumentId: source?.id ?? null } } }, 'saveOpportunityWorkflow');
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
    submitSales: command => mutate<OpportunityDetail>(operations.SUBMITOPPORTUNITYSALESREVIEW, command, 'submitOpportunitySalesReview'),
    decide: command => mutate<OpportunityDetail>(operations.DECIDEOPPORTUNITYPACKAGE, command, 'decideOpportunityPackage'),
  };
}
