import { buildSchema, Kind, validate } from 'graphql';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { productionOpportunityService } from './OpportunityService';
import { GET_OPPORTUNITY, LIST_OPPORTUNITIES } from './opportunity.queries';
import { GET_OPPORTUNITY_OWNER_DIRECTORY } from './userDirectory.queries';

const api = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => api }));

beforeEach(() => vi.resetAllMocks());

function respondWithCreator(createdBy: number | null | undefined) {
  const opportunity = { opportunityId: 10, opportunityName: 'Creator mapping', ownerId: 22, createdBy };
  api.query.mockImplementation(async ({ query }) => {
    if (query === GET_OPPORTUNITY_OWNER_DIRECTORY) return { data: {
      currentUserId: 33,
      userList: [
        { id: 11, firstName: 'Opportunity', lastName: 'Creator', email: 'creator@example.test', roleId: 1, isActive: false },
        { id: 22, firstName: 'Assigned', lastName: 'Owner', email: 'owner@example.test', roleId: 1, isActive: true },
        { id: 33, firstName: 'Current', lastName: 'Viewer', email: 'viewer@example.test', roleId: 1, isActive: true },
      ],
      rolesList: [{ id: 1, roleName: 'Sales', roleCode: 'SALES', isActive: true }],
    } };
    if (query === LIST_OPPORTUNITIES) return { data: { opportunities: [opportunity] } };
    if (query === GET_OPPORTUNITY) return { data: { opportunity } };
    throw new Error('Unexpected opportunity query');
  });
}

const readers = [
  ['pipeline', async () => (await productionOpportunityService.list({ queue: 'PIPELINE', search: '', after: null, first: 50 })).nodes[0]],
  ['details', () => productionOpportunityService.detail('10')],
] as const;

describe.each(readers)('opportunity creator in %s', (_name, read) => {
  it('resolves the persisted creator separately from the assigned owner and current viewer', async () => {
    respondWithCreator(11);
    const opportunity = await read();
    expect(opportunity.createdBy).toEqual({ id: '11', name: 'Opportunity Creator', email: 'creator@example.test', roles: ['Sales'], active: false });
    expect(opportunity.owner).toMatchObject({ id: '22', name: 'Assigned Owner' });
    expect(opportunity.createdBy).not.toEqual(opportunity.owner);
  });

  it.each([null, undefined])('leaves a missing creator empty instead of substituting another user: %s', async createdBy => {
    respondWithCreator(createdBy);
    const opportunity = await read();
    expect(opportunity.createdBy).toBeNull();
    expect(opportunity.owner?.id).toBe('22');
  });

  it('retains an unknown creator ID without attributing creation to the owner or viewer', async () => {
    respondWithCreator(999);
    expect((await read()).createdBy).toEqual({ id: '999', name: 'User details unavailable', email: '', roles: [], active: false });
  });
});

describe('opportunity creator GraphQL selection', () => {
  it.each([['pipeline', LIST_OPPORTUNITIES], ['details', GET_OPPORTUNITY]] as const)('requests createdBy using the real schema in %s', (_name, document) => {
    const sources = [
      '../backend/services/opportunity/src/graphql/typeDefs/opportunity.typeDefs.ts',
      '../backend/services/admin/src/graphql/typeDefs/currency.typeDefs.ts',
    ].map(file => readFileSync(resolve(process.cwd(), file), 'utf8').match(/`([\s\S]*)`/)![1]);
    const schema = buildSchema(`type Query { _unused: Boolean } type Mutation { _unused: Boolean } ${sources.join('\n')}`);
    expect(validate(schema, document)).toEqual([]);
    const fields = document.definitions.find(definition => definition.kind === Kind.FRAGMENT_DEFINITION && definition.name.value === 'OpportunityFields');
    expect(fields?.kind === Kind.FRAGMENT_DEFINITION && fields.selectionSet.selections.some(selection => selection.kind === Kind.FIELD && selection.name.value === 'createdBy')).toBe(true);
  });
});
