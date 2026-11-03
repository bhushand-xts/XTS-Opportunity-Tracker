import { buildSchema, validate } from 'graphql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { productionOpportunityService } from './OpportunityService';
import { createLocalWorkflowService } from './localWorkflowService';
import { GET_OPPORTUNITY, SAVE_OPPORTUNITY_SCOPE, SAVE_OPPORTUNITY_ESTIMATION, TRANSITION_OPPORTUNITY, GET_ESTIMATION_VERSIONS, SAVE_ESTIMATION_VERSION, DELETE_ESTIMATION_VERSION } from './opportunity.queries';
import { fixtureOpportunity } from '../testing/fixtures';

const api = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => api }));
afterEach(() => { vi.resetAllMocks(); localStorage.clear(); });

it('submits the selected saved version ID without sending the unsaved editor matrix', async () => {
  api.mutate.mockResolvedValue({ data: { transitionOpportunity: { opportunityId: 10 } } });
  api.query.mockResolvedValueOnce({ data: { opportunity: { opportunityId: 10, stageId: 4, subStageId: 8, proposalQuestions: [], proposalQuestionIds: [], contacts: [] } } }).mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
  await productionOpportunityService.decide({ opportunityId: '10', expectedRevision: 1, packageRevision: null, idempotencyKey: 'submit', decision: 'SUBMIT_ESTIMATE', reason: 'Ready', confirmed: true, estimationVersionId: '7' });
  expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({ mutation: TRANSITION_OPPORTUNITY, variables: { opportunityId: 10, action: 'SUBMIT_ESTIMATE', comment: 'Ready', estimationVersionId: '7' } }));
});
const scope = { revision: 3, summary: 'Saved scope', risks: [{ id: '21', description: 'Delay', severity: 'HIGH' as const }], alignment: [{ id: '31', text: 'Client platform' }] };

it('validates scope reading and saving against the real backend schema', () => {
  const source = readFileSync(resolve(process.cwd(), '../backend/services/opportunity/src/graphql/typeDefs/opportunity.typeDefs.ts'), 'utf8');
  const adminTypes = 'type Currency { currencyId: Int currencyCode: String currencySymbol: String } type Query { currencies: [Currency] } type Mutation { _unused: Boolean }';
  const schema = buildSchema(`${adminTypes} ${source.match(/`([\s\S]*)`/)![1]}`);
  expect(validate(schema, SAVE_OPPORTUNITY_SCOPE)).toEqual([]);
  expect(validate(schema, GET_OPPORTUNITY)).toEqual([]);
  expect(validate(schema, SAVE_OPPORTUNITY_ESTIMATION)).toEqual([]);
  expect(validate(schema, TRANSITION_OPPORTUNITY)).toEqual([]);
  expect(validate(schema, GET_ESTIMATION_VERSIONS)).toEqual([]);
  expect(validate(schema, SAVE_ESTIMATION_VERSION)).toEqual([]);
  expect(validate(schema, DELETE_ESTIMATION_VERSION)).toEqual([]);
});

it('persists an incomplete draft grid through GraphQL and reloads its database status', async () => {
  const grid = { phaseIds: [1], roleCodes: ['PM'], durations: [{ phaseId: 1, weeks: '2' }], allocations: [{ phaseId: 1, roleCode: 'PM', effort: '' }] };
  const estimation = { revision: 0, rows: [], assumptions: 'Continue later', total: '0.00', grid };
  const persisted = { ...estimation, revision: 1, status: 'DRAFT' };
  api.mutate.mockResolvedValue({ data: { saveOpportunityEstimation: { opportunityId: 10 } } });
  api.query.mockResolvedValueOnce({ data: { opportunity: { opportunityId: 10, stageId: 3, subStageId: 7, estimation: persisted, proposalQuestions: [], proposalQuestionIds: [], contacts: [] } } }).mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
  const saved = await productionOpportunityService.saveEstimation({ opportunityId: '10', expectedRevision: 1, idempotencyKey: 'draft', estimation });
  expect(api.mutate).toHaveBeenCalledWith({ mutation: SAVE_OPPORTUNITY_ESTIMATION, variables: { opportunityId: 10, estimation: { revision: 0, rows: [], assumptions: 'Continue later', grid } }, errorPolicy: 'none' });
  expect(saved.estimation).toEqual(persisted);
  expect([saved.stageId, saved.subStageId]).toEqual([3, 7]);
  expect(localStorage.length).toBe(0);
});

it('does not confirm a draft when the server fails to save it', async () => {
  api.mutate.mockRejectedValue(new Error('Database unavailable'));
  await expect(productionOpportunityService.saveEstimation({ opportunityId: '10', expectedRevision: 1, idempotencyKey: 'draft', estimation: { revision: 0, rows: [], assumptions: '', total: '0' } })).rejects.toThrow('Database unavailable');
  expect(api.query).not.toHaveBeenCalled();
});

it('saves the selected section through GraphQL and reloads its actual persisted IDs and counts', async () => {
  api.mutate.mockResolvedValue({ data: { saveOpportunityScope: { opportunityId: 10 } } });
  api.query.mockResolvedValueOnce({ data: { opportunity: { opportunityId: 10, stageId: 3, subStageId: 7, scope, proposalQuestions: [], proposalQuestionIds: [], contacts: [] } } }).mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
  const saved = await productionOpportunityService.saveScope({ opportunityId: '10', expectedRevision: 1, idempotencyKey: 'save', scope, section: 'RISKS' });
  expect(api.mutate).toHaveBeenCalledWith({ mutation: SAVE_OPPORTUNITY_SCOPE, variables: { opportunityId: 10, scope, section: 'RISKS' }, errorPolicy: 'none' });
  expect(saved.scope).toEqual(scope);
  expect(saved.visibleModules).toContain('scope');
});

it('does not report success if the server does not confirm the assessment save', async () => {
  api.mutate.mockResolvedValue({ data: { saveOpportunityScope: null } });
  await expect(productionOpportunityService.saveScope({ opportunityId: '10', expectedRevision: 1, idempotencyKey: 'save', scope })).rejects.toThrow('assessment was not saved');
  expect(api.query).not.toHaveBeenCalled();
});

it('ignores legacy browser-local scope and delegates saves to the backend even through the preview adapter', async () => {
  const saved = fixtureOpportunity({ scope, allowedActions: [] });
  localStorage.setItem(`xts-opportunity-local-workflow:${saved.id}`, JSON.stringify({ scope: { ...scope, summary: 'Obsolete browser copy' }, revision: 20 }));
  const base = { ...productionOpportunityService, detail: vi.fn(async () => saved), saveScope: vi.fn(async () => saved) };
  const adapter = createLocalWorkflowService(base);
  expect((await adapter.detail(saved.id)).scope).toEqual(scope);
  expect((await adapter.detail(saved.id)).allowedActions).not.toContain('EDIT_SCOPE');
  const command = { opportunityId: saved.id, expectedRevision: 1, idempotencyKey: 'save', scope, section: 'SCOPE' as const };
  expect((await adapter.saveScope(command)).scope).toEqual(scope);
  expect(base.saveScope).toHaveBeenCalledWith(command);
});

it('sends the edited saved version ID and waits for the persisted update', async () => {
  const estimation = { revision: 3, rows: [], assumptions: '', total: '0' };
  const version = { id: '12', version: 4, estimation };
  api.mutate.mockResolvedValue({ data: { saveEstimationVersion: version } });
  api.query.mockResolvedValueOnce({ data: { opportunity: { opportunityId: 10, stageId: 3, subStageId: 7, estimation, proposalQuestions: [], proposalQuestionIds: [], contacts: [] } } }).mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
  const result = await productionOpportunityService.saveEstimationVersion!({ opportunityId: '10', expectedRevision: 3, idempotencyKey: 'update', name: 'Revised', estimation, sourceVersionId: '9' });
  expect(api.mutate).toHaveBeenCalledWith(expect.objectContaining({ mutation: SAVE_ESTIMATION_VERSION, variables: expect.objectContaining({ sourceVersionId: '9', name: 'Revised', requestKey: 'update' }) }));
  expect(result.version).toEqual(version);
});
it('deletes the scoped saved estimate and propagates server failures', async () => {
  api.mutate.mockResolvedValueOnce({ data: { deleteEstimationVersion: true } });
  await productionOpportunityService.deleteEstimationVersion!('10', '9');
  expect(api.mutate).toHaveBeenCalledWith({ mutation: DELETE_ESTIMATION_VERSION, variables: { opportunityId: 10, versionId: '9' }, errorPolicy: 'none' });
  api.mutate.mockRejectedValueOnce(new Error('Submitted estimates cannot be deleted'));
  await expect(productionOpportunityService.deleteEstimationVersion!('10', '9')).rejects.toThrow('Submitted estimates cannot be deleted');
});
