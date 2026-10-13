import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ApolloClient, ApolloLink, InMemoryCache, Observable, type FetchResult, type NormalizedCacheObject } from '@apollo/client';
import { buildSchema, GraphQLError, parse, validate } from 'graphql';
import { describe, expect, it, vi } from 'vitest';
import type { OpportunityDetail } from '@xts/api-contracts';
import { productionOpportunityService } from './OpportunityService';
import { newDraft } from '../lib/workflow';
import { createWorkflowService } from './proposed/createWorkflowService';
import * as proposed from './proposed/workflow.queries';

describe('workflow contract', () => {
  it('validates handoff operations against the workflow schema', () => {
    const root = resolve(process.cwd(), '../docs/opportunity/contracts');
    const schema = buildSchema(readFileSync(resolve(root, 'opportunity-workflow.proposed.graphql'), 'utf8'));
    const documents = parse(readFileSync(resolve(root, 'opportunity-workflow.operations.graphql'), 'utf8'));
    expect(validate(schema, documents)).toEqual([]);
    for (const [name, operation] of Object.entries(proposed)) {
      if (name.endsWith('_FIELDS')) continue;
      expect(validate(schema, operation), name).toEqual([]);
    }
  });
  it('fails closed for stub list and missing persistence instead of claiming success or returning sample data', async () => {
    await expect(productionOpportunityService.list({ search: '', queue: 'PIPELINE', after: null, first: 50 })).rejects.toMatchObject({ code: 'INTEGRATION_UNAVAILABLE' });
    await expect(productionOpportunityService.save({ id: null, expectedRevision: null, idempotencyKey: 'test', form: newDraft('101') })).rejects.toMatchObject({ code: 'INTEGRATION_UNAVAILABLE' });
  });
});

function testClient(result: FetchResult, inspect?: (variables: Record<string, unknown>) => void) {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(operation => new Observable(observer => { inspect?.(operation.variables); observer.next(result); observer.complete(); })),
    // An application-wide partial-error policy must not turn workflow errors into success.
    defaultOptions: { query: { errorPolicy: 'all' }, mutate: { errorPolicy: 'all' } },
  });
}

function pendingSaveFixture() {
  const form = { ...newDraft('owner-1'), title: 'Pending opportunity', estimatedValue: '100000.00', currencyId: '7', serviceLine: 'Implementation', clientId: 'client-1' };
  Object.assign(form.solicitation, { reference: 'RFP-TEST-1', issuingAgency: 'Test procurement' });
  form.dates.submissionDeadline = '2026-11-25';
  form.rfp.type = 'QUESTIONNAIRE';
  form.rfp.questions = [{ id: 'draft-question-1', text: 'Question to prepare later', sourceReference: '', validated: false }];
  const salesHead = { id: 'configured-sales', name: 'Configured Sales Head', email: 'sales@example.test', roles: ['Sales Head'], active: true };
  const saved: OpportunityDetail = {
    id: 'opportunity-1', number: 'OP-1', title: form.title, estimatedValue: form.estimatedValue, currencyCode: 'INR', clientName: 'Test client', owner: null,
    priority: form.priority, state: 'SALES_REVIEW', rfpType: form.rfp.type, submissionDeadline: null, revision: 1, packageRevision: 1, allowedActions: ['EDIT'],
    form: { ...form, rfp: { ...form.rfp, questions: [{ ...form.rfp.questions[0], id: 'question-1', masterQuestionId: null }] } },
    client: null, visibleModules: ['overview'], responses: [], estimation: null, scope: null, activity: [], responsible: salesHead, approvalAssignees: [salesHead],
    readiness: { ready: false, issues: ['Response preparation is incomplete.'] }, salesRecommendation: null,
  };
  return { form, saved };
}

describe('workflow GraphQL adapter', () => {
  it('uses one save to return backend-assigned Pending without answer-readiness or client-selected approvers', async () => {
    const { form, saved } = pendingSaveFixture();
    const inspect = vi.fn();
    const result = await createWorkflowService(testClient({ data: { saveOpportunityWorkflow: saved } }, inspect))
      .save({ id: null, expectedRevision: null, idempotencyKey: 'create-pending', form });
    expect(result).toMatchObject({ state: 'SALES_REVIEW', packageRevision: 1, responsible: { id: 'configured-sales' }, readiness: { ready: false } });
    expect(inspect).toHaveBeenCalledTimes(1);
    const input = inspect.mock.calls[0][0].input;
    expect(input).not.toHaveProperty('salesReviewerId');
    expect(input).not.toHaveProperty('gate1ApproverId');
    expect(input).toHaveProperty('form.rfp.questions.0.validated', false);
  });

  it('reports uncertain saved state when creation returns legacy preparation or lacks valid approval routing', async () => {
    const { form, saved } = pendingSaveFixture();
    const invalidResults: OpportunityDetail[] = [
      { ...saved, state: 'PREPARATION_PENDING' },
      { ...saved, approvalAssignees: [] },
      { ...saved, approvalAssignees: [{ ...saved.responsible!, active: false }] },
      { ...saved, packageRevision: null },
      { ...saved, packageRevision: 0 },
    ];
    for (const result of invalidResults) {
      const service = createWorkflowService(testClient({ data: { saveOpportunityWorkflow: result } }));
      await expect(service.save({ id: null, expectedRevision: null, idempotencyKey: 'create-pending', form }))
        .rejects.toThrow('It may already be saved. Refresh before retrying to avoid duplicate creation.');
    }
  });

  it('accepts a backend-assigned role queue without inventing one responsible user', async () => {
    const { form, saved } = pendingSaveFixture();
    const assignees = [saved.responsible!, { ...saved.responsible!, id: 'another-sales-head' }];
    const service = createWorkflowService(testClient({ data: { saveOpportunityWorkflow: { ...saved, responsible: null, approvalAssignees: assignees } } }));
    await expect(service.save({ id: null, expectedRevision: null, idempotencyKey: 'role-queue', form })).resolves.toMatchObject({ responsible: null, approvalAssignees: assignees });
  });

  it('rejects query errors even when the server also returns page data', async () => {
    const service = createWorkflowService(testClient({
      data: { opportunityWorkflowPage: { nodes: [], totalCount: 0, endCursor: null, hasNextPage: false } },
      errors: [new GraphQLError('Opportunity access denied.', { extensions: { code: 'FORBIDDEN' } })],
    }));
    await expect(service.list({ search: '', queue: 'PIPELINE', after: null, first: 50 })).rejects.toThrow('Opportunity access denied.');
  });

  it('rejects mutation errors even when the server also returns a document', async () => {
    const service = createWorkflowService(testClient({
      data: { uploadOpportunitySource: { id: 'document-1', name: 'test.txt', downloadUrl: null } },
      errors: [new GraphQLError('Document upload denied.', { extensions: { code: 'FORBIDDEN' } })],
    }));
    const file = { name: 'test.txt', type: 'text/plain', arrayBuffer: async () => new Uint8Array([65]).buffer } as File;
    await expect(service.upload({ opportunityId: '401', expectedRevision: 1, idempotencyKey: 'upload-test' }, file)).rejects.toThrow('Document upload denied.');
  });

  it('reports an actionable error for a null rejection', async () => {
    const client = { query: vi.fn().mockRejectedValue(null) } as unknown as ApolloClient<NormalizedCacheObject>;
    await expect(createWorkflowService(client).globalActions()).rejects.toThrow('The service request failed. Please retry.');
  });

  it('reads active lookup IDs through the supplied Apollo client', async () => {
    const service = createWorkflowService(testClient({ data: {
      currencies: [
        { currencyId: 7, currencyName: 'Indian Rupee', currencyCode: 'INR', isActive: true },
        { currencyId: 8, currencyName: 'Inactive currency', currencyCode: 'USD', isActive: false },
      ],
      industries: [{ industryId: 3, industryName: 'Technology', isActive: true }],
      accountTypes: [{ accountTypeId: 2, accountName: 'Enterprise', isActive: true }],
    } }));
    await expect(service.lookups()).resolves.toEqual({
      currencies: [{ id: '7', label: 'INR · Indian Rupee', code: 'INR' }],
      industries: [{ id: '3', label: 'Technology' }],
      accountTypes: [{ id: '2', label: 'Enterprise' }],
    });
  });
});
