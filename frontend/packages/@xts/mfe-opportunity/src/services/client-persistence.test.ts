import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientDraft } from '@xts/api-contracts';
import { CREATE_OPPORTUNITY_CLIENT, UPDATE_OPPORTUNITY_CLIENT, GET_CLIENT_CREATE_ACCESS, GET_OPPORTUNITY_LOOKUPS } from './opportunity.queries';
import { productionOpportunityService } from './OpportunityService';

const client = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => client }));

const form: ClientDraft = {
  name: 'New client', relationship: '', accountTypeId: '4', industryId: '8', website: '',
  address: '', streetAddress: 'Main Street', country: 'India', stateProvince: 'Maharashtra', city: 'Pune',
  primaryContact: { name: 'Primary Contact', title: 'Manager', email: 'primary@example.com', phone: '1234567890', decisionRole: 'Decision Maker' },
  additionalContacts: [{ name: 'Second Contact', title: 'Buyer', email: 'second@example.com', phone: '9876543210', decisionRole: 'Procurement / Buyer' }],
};

beforeEach(() => vi.resetAllMocks());

describe('Production client persistence', () => {
  it('updates the selected client ID and returns persisted values', async () => {
    client.query.mockResolvedValue({ data: { currencies: [], accountTypes: [{ accountTypeId: 4, accountName: 'Enterprise', isActive: true }], industries: [{ industryId: 8, industryName: 'Technology', isActive: true }] } });
    client.mutate.mockResolvedValue({ data: { updateOpportunityClient: { clientId: 99, clientName: 'Updated client', contacts: [] } } });
    const saved = await productionOpportunityService.saveClient({ id: '99', expectedRevision: 1, idempotencyKey: 'update-client', form: { ...form, name: 'Updated client' } });
    expect(client.mutate).toHaveBeenCalledWith(expect.objectContaining({ mutation: UPDATE_OPPORTUNITY_CLIENT, variables: expect.objectContaining({ clientId: 99, client: expect.objectContaining({ clientName: 'Updated client' }) }) }));
    expect(saved).toMatchObject({ id: '99', name: 'Updated client' });
  });
  it('resolves owner and current responsibility names while retaining user IDs internally', async () => {
    client.query.mockResolvedValueOnce({ data: { opportunity: {
      opportunityId: 10, opportunityName: 'Test opportunity', ownerId: 7, assignedTo: 8,
      clientId: null, stageId: 1, subStageId: 1, priority: 'MEDIUM', rfpType: 2,
      contacts: [], proposalQuestions: [], proposalQuestionIds: [],
    } } }).mockResolvedValueOnce({ data: {
      userList: [
        { id: 7, firstName: 'Gayatri', lastName: 'Gunjakar', email: 'owner@example.com', roleId: null, isActive: true },
        { id: 8, firstName: 'Sales', lastName: 'Head', email: 'reviewer@example.com', roleId: null, isActive: true },
      ], rolesList: [],
    } });
    const saved = await productionOpportunityService.detail('10');
    expect(saved.owner).toMatchObject({ id: '7', name: 'Gayatri Gunjakar' });
    expect(saved.form.ownerId).toBe('7');
    expect(saved.responsible).toMatchObject({ id: '8', name: 'Sales Head' });
    expect(saved.approvalAssignees).toEqual([expect.objectContaining({ id: '8', name: 'Sales Head' })]);
  });

  it('sends the client and all contacts, then returns the persisted client ID for selection', async () => {
    client.query.mockResolvedValue({ data: {
      currencies: [], accountTypes: [{ accountTypeId: 4, accountName: 'Enterprise', isActive: true }],
      industries: [{ industryId: 8, industryName: 'Technology', isActive: true }],
    } });
    client.mutate.mockResolvedValue({ data: { createOpportunityClient: {
      clientId: 99, clientName: form.name, accountType: 'Enterprise', sector: 'Technology',
      website: null, city: 'Pune', state: 'Maharashtra', country: 'India', streetAddress: 'Main Street',
      contacts: [{ fullName: 'Primary Contact', titleRole: 'Manager', email: 'primary@example.com', phone: '1234567890', roleInDecision: 2 }],
    } } });
    const saved = await productionOpportunityService.saveClient({ id: null, expectedRevision: null, idempotencyKey: 'create-client', form });
    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ query: GET_OPPORTUNITY_LOOKUPS, fetchPolicy: 'network-only' }));
    expect(client.mutate).toHaveBeenCalledWith(expect.objectContaining({
      mutation: CREATE_OPPORTUNITY_CLIENT, errorPolicy: 'none', variables: {
        client: { clientName: 'New client', accountType: 'Enterprise', sector: 'Technology', website: null,
          city: 'Pune', state: 'Maharashtra', country: 'India', streetAddress: 'Main Street' },
        contacts: [
          { fullName: 'Primary Contact', titleRole: 'Manager', email: 'primary@example.com', phone: '1234567890', roleInDecision: 2, roleInDecisionOther: null },
          { fullName: 'Second Contact', titleRole: 'Buyer', email: 'second@example.com', phone: '9876543210', roleInDecision: 1, roleInDecisionOther: null },
        ],
      },
    }));
    expect(saved).toMatchObject({ id: '99', name: 'New client', primaryContact: { name: 'Primary Contact', decisionRole: 'Decision Maker' } });
  });

  it('does not claim success when the mutation fails', async () => {
    client.query.mockResolvedValue({ data: { currencies: [], accountTypes: [{ accountTypeId: 4, accountName: 'Enterprise', isActive: true }], industries: [{ industryId: 8, industryName: 'Technology', isActive: true }] } });
    client.mutate.mockRejectedValue(new Error('Client service unavailable'));
    await expect(productionOpportunityService.saveClient({ id: null, expectedRevision: null, idempotencyKey: 'create-client', form })).rejects.toThrow('Client service unavailable');
  });

  it('enables Add Client only when the backend grants permission', async () => {
    client.query.mockResolvedValueOnce({ data: { opportunityClientCreateAllowed: true } }).mockResolvedValueOnce({ data: { opportunityClientCreateAllowed: false } });
    expect(await productionOpportunityService.globalActions()).toEqual(['CLIENT_CREATE']);
    expect(await productionOpportunityService.globalActions()).toEqual([]);
    expect(client.query).toHaveBeenCalledWith(expect.objectContaining({ query: GET_CLIENT_CREATE_ACCESS }));
  });
});
