import { ApolloClient, ApolloLink, InMemoryCache, Observable } from '@apollo/client';
import { buildSchema, GraphQLError, validate } from 'graphql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DecisionCommand } from '@xts/api-contracts';
import { productionOpportunityService } from './OpportunityService';
import { GET_OPPORTUNITY, TRANSITION_OPPORTUNITY, GET_HOLD_REASON_CODES, SAVE_OPPORTUNITY_ESTIMATION } from './opportunity.queries';

const api = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => api }));

const directory = { data: { userList: [], rolesList: [] } };
const command: DecisionCommand = {
  opportunityId: '10', expectedRevision: 1, idempotencyKey: 'sales-review', packageRevision: null,
  expectedStageId: 1, expectedSubStageId: 1, decision: 'SALES_APPROVE', reason: '', confirmed: true,
  reasonCodeId: 3,
};
function opportunity(stageId: number | null, subStageId: number | null, allowedActions: string[] = []) {
  return {
    opportunityId: 10, opportunityName: 'Review opportunity', stageId, subStageId,
    currencyId: 7, estimatedValue: 1000, ownerId: null, assignedTo: null, clientId: null,
    contacts: [], proposalQuestions: [], proposalQuestionIds: [], proposalQuestionCategories: [], allowedActions,
  };
}

beforeEach(() => vi.resetAllMocks());

describe('production approval schema', () => {
  it('validates the decision mutation including reasonCodeId against the actual opportunity schema', () => {
    const source = readFileSync(resolve(process.cwd(), '../backend/services/opportunity/src/graphql/typeDefs/opportunity.typeDefs.ts'), 'utf8');
    const schema = buildSchema(`type Query { _unused: Boolean } type Mutation { _unused: Boolean } ${source.match(/`([\s\S]*)`/)![1]}`);
    expect(validate(schema, TRANSITION_OPPORTUNITY)).toEqual([]);
  });

  it('validates the active reason lookup against the actual master schema', () => {
    const source = readFileSync(resolve(process.cwd(), '../backend/services/admin/src/graphql/typeDefs/reason-codes.typeDefs.ts'), 'utf8');
    const schema = buildSchema(`type Query { _unused: Boolean } type Mutation { _unused: Boolean } ${source.match(/`([\s\S]*)`/)![1]}`);
    expect(validate(schema, GET_HOLD_REASON_CODES)).toEqual([]);
  });
});

describe('production opportunity stage data', () => {
  it('keeps creation and transition dates and resolves tracker users separately from the creator', async () => {
    const stageHistory = [
      { id: '1', stageId: 1, subStageId: 1, reachedAt: '2026-10-19T04:00:00.000Z', updatedBy: 11, comment: null },
      { id: '2', stageId: 2, subStageId: 4, reachedAt: '2026-10-20T04:00:00.000Z', updatedBy: 12, comment: 'Approved.' },
    ];
    api.query.mockResolvedValueOnce({ data: { opportunity: { ...opportunity(2, 4), createdBy: 11, createdDt: '2026-10-19T03:00:00.000Z', stageHistory } } }).mockResolvedValueOnce({ data: {
      userList: [
        { id: 11, firstName: 'Original', lastName: 'Creator', email: 'creator@example.test', roleId: null, isActive: true },
        { id: 12, firstName: 'Sales', lastName: 'Approver', email: 'sales@example.test', roleId: null, isActive: false },
      ], rolesList: [],
    } });
    expect(await productionOpportunityService.detail('10')).toMatchObject({
      createdDt: '2026-10-19T03:00:00.000Z', createdBy: { id: '11', name: 'Original Creator' },
      stageHistory: stageHistory.map(({ updatedBy, ...event }) => ({ ...event, actor: { id: String(updatedBy), name: updatedBy === 11 ? 'Original Creator' : 'Sales Approver' } })),
    });
  });
  it('loads active hold reasons in master display order and retains descriptions', async () => {
    api.query.mockResolvedValueOnce({ data: { reasonCodesList: [
      { id: 4, reasonName: 'Pending client budget', description: 'Budget approval pending.', displayOrder: 4, isActive: true },
      { id: 2, reasonName: 'Inactive reason', description: '', displayOrder: 1, isActive: false },
      null,
      { id: 3, reasonName: 'Missing information', description: 'Details required.', displayOrder: 3, isActive: true },
    ] } });
    expect(await productionOpportunityService.holdReasons!()).toEqual([
      { id: 3, name: 'Missing information', description: 'Details required.' },
      { id: 4, name: 'Pending client budget', description: 'Budget approval pending.' },
    ]);
    expect(api.query).toHaveBeenCalledWith({ query: GET_HOLD_REASON_CODES, fetchPolicy: 'network-only', errorPolicy: 'none' });
  });

  it('does not substitute reason codes when the master lookup fails', async () => {
    api.query.mockRejectedValueOnce(new Error('Reason master unavailable.'));
    await expect(productionOpportunityService.holdReasons!()).rejects.toThrow('Reason master unavailable.');
  });
  it('preserves each persisted stage and substage on pipeline summaries', async () => {
    const stages = [[1, 1], [1, 2], [1, 3], [2, 4], [2, 5], [2, 6], [3, 7], [4, 8], [4, 9], [5, 10], [5, 11], [6, 12], [7, 13], [8, 14], [9, 15], [9, 16], [9, 17], [9, 18], [10, null], [null, null]];
    api.query.mockResolvedValueOnce({ data: { opportunities: stages.map(([stage, substage]) => opportunity(stage, substage)) } }).mockResolvedValueOnce(directory);
    const page = await productionOpportunityService.list({ queue: 'PIPELINE', search: '', after: null, first: 50 });
    expect(page.nodes.map(({ stageId, subStageId }) => [stageId, subStageId])).toEqual(stages);
  });

  it('retains raw detail statuses and only the actions granted by the server', async () => {
    const allowedActions = ['SALES_APPROVE', 'SALES_REQUEST_CHANGES', 'SALES_HOLD'];
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(1, 3, allowedActions) } }).mockResolvedValueOnce(directory);
    expect(await productionOpportunityService.detail('10')).toMatchObject({
      stageId: 1, subStageId: 3, state: 'SALES_REVIEW', packageRevision: null, allowedActions,
    });
  });

  it('retains the persisted hold reason code separately from its description on reload', async () => {
    api.query.mockResolvedValueOnce({ data: { opportunity: { ...opportunity(1, 3), workflowReasonCodeId: 4, workflowComment: 'Awaiting budget approval.' } } }).mockResolvedValueOnce(directory);
    expect(await productionOpportunityService.detail('10')).toMatchObject({ holdReasonCodeId: 4, form: { context: { notes: 'Awaiting budget approval.' } } });
  });
});

describe('production opportunity decisions', () => {
  it('directs legacy resubmit requests to Update Opportunity without making a separate mutation', async () => {
    await expect(productionOpportunityService.decide({ ...command, decision: 'RESUBMIT' })).rejects.toThrow('Use Update Opportunity');
    expect(api.mutate).not.toHaveBeenCalled();
    expect(api.query).not.toHaveBeenCalled();
  });
  it.each([
    { decision: 'SALES_APPROVE', action: 'APPROVE', stage: 1, substage: 1, nextStage: 2, nextSubstage: 4 },
    { decision: 'SALES_REQUEST_CHANGES', action: 'REQUEST_CHANGES', stage: 1, substage: 1, nextStage: 1, nextSubstage: 2 },
    { decision: 'SALES_HOLD', action: 'HOLD', stage: 1, substage: 1, nextStage: 1, nextSubstage: 3 },
    { decision: 'GATE1_GO', action: 'APPROVE', stage: 2, substage: 4, nextStage: 3, nextSubstage: 7 },
    { decision: 'GATE1_REQUEST_CHANGES', action: 'REQUEST_CHANGES', stage: 2, substage: 4, nextStage: 2, nextSubstage: 5 },
    { decision: 'GATE1_HOLD', action: 'HOLD', stage: 2, substage: 4, nextStage: 2, nextSubstage: 6 },
  ] as const)('persists $decision with the existing backend action and returns refreshed status', async ({ decision, action, stage, substage, nextStage, nextSubstage }) => {
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(stage, substage) } })
      .mockResolvedValueOnce({ data: { opportunity: opportunity(nextStage, nextSubstage), currencies: [{ currencyId: 7, currencyCode: 'EUR', currencySymbol: '€' }] } })
      .mockResolvedValueOnce(directory);
    api.mutate.mockResolvedValueOnce({ data: { transitionOpportunity: { opportunityId: 10, stageId: nextStage, subStageId: nextSubstage } } });
    const saved = await productionOpportunityService.decide({ ...command, expectedStageId: stage, expectedSubStageId: substage, decision, reason: '  Review comment  ' });
    expect(api.mutate).toHaveBeenCalledTimes(1);
    expect(api.mutate).toHaveBeenCalledWith({
      mutation: TRANSITION_OPPORTUNITY, variables: { opportunityId: 10, action, comment: 'Review comment', ...(action === 'HOLD' ? { reasonCodeId: 3 } : {}) }, errorPolicy: 'none',
    });
    expect(saved).toMatchObject({ stageId: nextStage, subStageId: nextSubstage, currencyCode: 'EUR', allowedActions: [], packageRevision: null });
    expect(api.query).toHaveBeenNthCalledWith(2, expect.objectContaining({ query: GET_OPPORTUNITY, fetchPolicy: 'network-only', errorPolicy: 'none' }));
  });

  it('sends the selected hold reason and user description as separate values', async () => {
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(1, 1) } })
      .mockResolvedValueOnce({ data: { opportunity: opportunity(1, 3) } }).mockResolvedValueOnce(directory);
    api.mutate.mockResolvedValueOnce({ data: { transitionOpportunity: { opportunityId: 10 } } });
    await productionOpportunityService.decide({ ...command, decision: 'SALES_HOLD', reason: '  Waiting for budget approval.  ' });
    expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: { opportunityId: 10, action: 'HOLD', comment: 'Waiting for budget approval.', reasonCodeId: 3 } }));
  });

  it('does not mutate when the persisted step differs from the reviewed step', async () => {
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(2, 4) } });
    await expect(productionOpportunityService.decide(command)).rejects.toThrow('This opportunity changed while you were reviewing it. Refresh before making a decision.');
    expect(api.mutate).not.toHaveBeenCalled();
  });

  it('does not claim success when the backend rejects a decision', async () => {
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(1, 1) } });
    api.mutate.mockRejectedValueOnce(new Error('Approval permission is required.'));
    await expect(productionOpportunityService.decide(command)).rejects.toThrow('Approval permission is required.');
    expect(api.query).toHaveBeenCalledTimes(1);
  });

  it('rejects GraphQL errors even when a global policy permits partial mutation results', async () => {
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new ApolloLink(() => new Observable(observer => {
        observer.next({ data: { transitionOpportunity: { opportunityId: 10, stageId: 2, subStageId: 4 } }, errors: [new GraphQLError('Approval denied.')] });
        observer.complete();
      })),
      defaultOptions: { mutate: { errorPolicy: 'all' } },
    });
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(1, 1) } });
    api.mutate.mockImplementation(input => client.mutate(input));
    await expect(productionOpportunityService.decide(command)).rejects.toThrow('Approval denied.');
    expect(api.query).toHaveBeenCalledTimes(1);
  });

  it('reports a missing mutation result without refreshing as though it saved', async () => {
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(1, 1) } });
    api.mutate.mockResolvedValueOnce({ data: { transitionOpportunity: null } });
    await expect(productionOpportunityService.decide(command)).rejects.toThrow('No saved decision was returned. Refresh before retrying.');
    expect(api.query).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['SALES_REJECT', 'REJECT', 1, 1, 9, 15], ['GATE1_NO_GO', 'REJECT', 2, 4, 9, 16],
    ['ESTIMATE_REJECT', 'REJECT', 4, 8, 9, 17], ['ESTIMATE_HOLD', 'HOLD', 4, 8, 4, 9],
    ['ESTIMATE_APPROVE', 'APPROVE', 4, 9, 5, 10], ['SUBMIT_ESTIMATE', 'SUBMIT_ESTIMATE', 3, 7, 4, 8],
    ['BID_SUBMITTED', 'BID_SUBMITTED', 5, 10, 5, 11], ['START_NEGOTIATION', 'START_NEGOTIATION', 5, 11, 6, 12],
    ['MARK_WON', 'MARK_WON', 6, 12, 7, 13], ['MARK_LOST', 'MARK_LOST', 6, 12, 8, 14],
    ['CLOSE_OPPORTUNITY', 'CLOSE_OPPORTUNITY', 1, 2, 9, 18],
  ] as const)('persists %s to the matching master status', async (decision, action, stage, substage, nextStage, nextSubstage) => {
    api.query.mockResolvedValueOnce({ data: { opportunity: opportunity(stage, substage) } })
      .mockResolvedValueOnce({ data: { opportunity: opportunity(nextStage, nextSubstage) } }).mockResolvedValueOnce(directory);
    api.mutate.mockResolvedValueOnce({ data: { transitionOpportunity: { opportunityId: 10 } } });
    const saved = await productionOpportunityService.decide({ ...command, expectedStageId: stage, expectedSubStageId: substage, decision, reason: '  Decision description  ' });
    expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({ variables: {
      opportunityId: 10, action, comment: 'Decision description', ...(['REJECT', 'HOLD'].includes(action) ? { reasonCodeId: 3 } : {}),
    } }));
    expect(saved).toMatchObject({ stageId: nextStage, subStageId: nextSubstage });
  });
});

describe('production estimation persistence', () => {
  it('saves only matrix input fields and reloads the server calculated total and revision', async () => {
    const estimation = { revision: 1, assumptions: 'One sprint', total: '200.00', rows: [{ id: 'row', workItem: 'Engineering', hours: '2', people: 1, hourlyRate: '100' }] };
    api.mutate.mockResolvedValueOnce({ data: { saveOpportunityEstimation: { opportunityId: 10 } } });
    api.query.mockResolvedValueOnce({ data: { opportunity: { ...opportunity(3, 7, ['EDIT_ESTIMATION', 'SUBMIT_ESTIMATE']), estimation: { ...estimation, revision: 2 } } } }).mockResolvedValueOnce(directory);
    const saved = await productionOpportunityService.saveEstimation({ opportunityId: '10', expectedRevision: 0, idempotencyKey: 'save-matrix', estimation });
    expect(api.mutate).toHaveBeenCalledWith({ mutation: SAVE_OPPORTUNITY_ESTIMATION, variables: {
      opportunityId: 10, estimation: { revision: 1, assumptions: estimation.assumptions, rows: estimation.rows },
    }, errorPolicy: 'none' });
    expect(saved.estimation).toMatchObject({ revision: 2, total: '200.00' });
    expect(saved.visibleModules).toContain('estimation');
  });
  it('does not claim success or reload when estimation saving fails', async () => {
    api.mutate.mockRejectedValueOnce(new Error('The estimation changed.'));
    await expect(productionOpportunityService.saveEstimation({ opportunityId: '10', expectedRevision: 0, idempotencyKey: 'save-matrix', estimation: { revision: 1, rows: [], assumptions: '', total: '' } })).rejects.toThrow('The estimation changed.');
    expect(api.query).not.toHaveBeenCalled();
  });
});
