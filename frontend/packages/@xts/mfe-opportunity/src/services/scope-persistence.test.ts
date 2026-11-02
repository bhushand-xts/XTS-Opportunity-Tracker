import { buildSchema, validate } from 'graphql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { productionOpportunityService } from './OpportunityService';
import { createLocalWorkflowService } from './localWorkflowService';
import { GET_OPPORTUNITY, SAVE_OPPORTUNITY_SCOPE } from './opportunity.queries';
import { fixtureOpportunity } from '../testing/fixtures';

const api = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => api }));
afterEach(() => { vi.resetAllMocks(); localStorage.clear(); });
const scope = { revision: 3, summary: 'Saved scope', risks: [{ id: '21', description: 'Delay', severity: 'HIGH' as const }], alignment: [{ id: '31', text: 'Client platform' }] };

it('validates scope reading and saving against the real backend schema', () => {
  const source = readFileSync(resolve(process.cwd(), '../backend/services/opportunity/src/graphql/typeDefs/opportunity.typeDefs.ts'), 'utf8');
  const adminTypes = 'type Currency { currencyId: Int currencyCode: String currencySymbol: String } type Query { currencies: [Currency] } type Mutation { _unused: Boolean }';
  const schema = buildSchema(`${adminTypes} ${source.match(/`([\s\S]*)`/)![1]}`);
  expect(validate(schema, SAVE_OPPORTUNITY_SCOPE)).toEqual([]);
  expect(validate(schema, GET_OPPORTUNITY)).toEqual([]);
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
