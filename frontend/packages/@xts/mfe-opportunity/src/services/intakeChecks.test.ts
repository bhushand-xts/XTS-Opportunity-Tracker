import { describe, expect, it, vi } from 'vitest';
import { checkOpportunitySave, findDuplicateTitle } from './intakeChecks';
import { productionOpportunityService } from './OpportunityService';
import { fixtureOpportunity, TEST_LOOKUPS } from '../testing/fixtures';

describe('Save directory checks', () => {
  it('finds duplicate titles beyond the first page and excludes the current record', async () => {
    const record = fixtureOpportunity();
    const list = vi.fn().mockResolvedValueOnce({ nodes: [record], hasNextPage: true, endCursor: 'next' }).mockResolvedValueOnce({ nodes: [{ ...record, id: 'other', title: ' CLOUD   transformation ' }], hasNextPage: false, endCursor: null });
    expect(await findDuplicateTitle({ ...productionOpportunityService, list }, record.title, record.id)).toBe(true);
    expect(list.mock.calls[1][0].after).toBe('next');
  });
  it('fails closed for a broken paginated directory', async () => {
    const list = vi.fn().mockResolvedValue({ nodes: [], hasNextPage: true, endCursor: 'same' });
    await expect(findDuplicateTitle({ ...productionOpportunityService, list }, 'Title', null)).rejects.toThrow('incomplete opportunity directory');
  });
  it('reloads the selected client and active masters before saving', async () => {
    const record = fixtureOpportunity(), changed = structuredClone(record.client!); changed.primaryContact.email = 'invalid';
    const clients = vi.fn().mockResolvedValueOnce({ nodes: [], hasNextPage: true, endCursor: 'client-next' }).mockResolvedValueOnce({ nodes: [changed], hasNextPage: false, endCursor: null });
    const service = { ...productionOpportunityService, eligibleUsers: vi.fn(async () => ({ nodes: [record.owner!], totalCount: 1, hasNextPage: false, endCursor: null })), clients, list: vi.fn(async () => ({ nodes: [record], totalCount: 1, hasNextPage: false, endCursor: null })), lookups: vi.fn(async () => TEST_LOOKUPS) };
    const checked = await checkOpportunitySave(service, record.form, record.id, record.form);
    expect(checked.errors['client.primaryContact.email']).toBeDefined();
    expect(checked.errors.title).toBeUndefined();
    expect(clients.mock.calls[1][1]).toBe('client-next');
  });
  it('rejects a deleted client and a currency removed since loading the form', async () => {
    const record = fixtureOpportunity();
    const service = { ...productionOpportunityService, eligibleUsers: vi.fn(async () => ({ nodes: [record.owner!], totalCount: 1, hasNextPage: false, endCursor: null })), clients: vi.fn(async () => ({ nodes: [], totalCount: 0, hasNextPage: false, endCursor: null })), list: vi.fn(async () => ({ nodes: [], totalCount: 0, hasNextPage: false, endCursor: null })), lookups: vi.fn(async () => ({ ...TEST_LOOKUPS, currencies: [] })) };
    const checked = await checkOpportunitySave(service, record.form, record.id);
    expect(checked.errors.clientId).toBe('Select an existing client.');
    expect(checked.errors.currencyId).toBeDefined();
  });
  it('rejects a stale inactive owner and validates new opportunities without an existing ID', async () => {
    const record = fixtureOpportunity();
    const eligibleUsers = vi.fn(async () => ({ nodes: [{ ...record.owner!, active: false }], totalCount: 1, hasNextPage: false, endCursor: null }));
    const service = { ...productionOpportunityService, eligibleUsers, clients: vi.fn(async () => ({ nodes: [record.client!], totalCount: 1, hasNextPage: false, endCursor: null })), list: vi.fn(async () => ({ nodes: [], totalCount: 0, hasNextPage: false, endCursor: null })), lookups: vi.fn(async () => TEST_LOOKUPS) };
    const checked = await checkOpportunitySave(service, record.form, null);
    expect(checked.errors.ownerId).toBeDefined();
    expect(eligibleUsers).toHaveBeenCalledWith(expect.objectContaining({ opportunityId: null, purpose: 'OWNER' }));
  });
});
