import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newDraft, pendingSaveFieldErrors } from '../lib/workflow';
import { DECISION_ROLE_IDS } from '../lib/opportunityOptions';
import { productionOpportunityService } from './OpportunityService';

const api = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }));
vi.mock('@xts/api-client', () => ({ getApolloClient: () => api }));

describe('opportunity custom choices and client budget', () => {
  beforeEach(() => vi.resetAllMocks());

  it('requires custom service text and rejects invalid USD amounts', () => {
    const draft = newDraft('1');
    expect(draft.priority).toBe('');
    expect(draft.solicitation.submissionMethod).toBe('');
    expect(draft.solicitation.preBidMeeting).toBe('');
    const form = { ...newDraft('1'), serviceLine: 'Other', estimatedValueUsd: '' };
    expect(pendingSaveFieldErrors(form)['Client budget (USD)']).toBe('Please fill the Client budget (USD).');
    form.estimatedValueUsd = '-1';
    expect(pendingSaveFieldErrors(form)).toHaveProperty('Other service line');
    expect(pendingSaveFieldErrors(form)).toHaveProperty('Client budget (USD)');
    form.serviceLineOther = 'Specialized delivery';
    form.estimatedValueUsd = '1200.50';
    expect(pendingSaveFieldErrors(form)).not.toHaveProperty('Other service line');
    expect(pendingSaveFieldErrors(form)).not.toHaveProperty('Client budget (USD)');
  });

  it.each(['0', '0.00', '-0', '-0.01', '-100', 'NaN', 'Infinity', '1.001', '10000000000000'])('rejects an invalid client budget in either currency: %s', value => {
    const form = { ...newDraft('1'), estimatedValue: value, estimatedValueUsd: value };
    const errors = pendingSaveFieldErrors(form);
    expect(errors).toHaveProperty('Client budget');
    expect(errors).toHaveProperty('Client budget (USD)');
  });

  it.each(['0.01', '0.50', '1', '1200.50', '9999999999999.99'])('accepts a positive client budget in either currency: %s', value => {
    const form = { ...newDraft('1'), estimatedValue: value, estimatedValueUsd: value };
    const errors = pendingSaveFieldErrors(form);
    expect(errors).not.toHaveProperty('Client budget');
    expect(errors).not.toHaveProperty('Client budget (USD)');
  });

  it('saves and reloads a custom service line and USD estimate', async () => {
    const form = { ...newDraft('1'), leadSource: '5', serviceLine: 'Other', serviceLineOther: 'Specialized delivery', estimatedValue: '100000', estimatedValueUsd: '1200.50' };
    form.rfp.source = { id: 'file.txt', name: 'brief.txt', storagePath: 'opportunity/file.txt', downloadUrl: null };
    api.mutate.mockResolvedValue({ data: { createOpportunity: { opportunityId: 1 } } });
    api.query.mockResolvedValueOnce({ data: { opportunity: { opportunityId: 1, sourceTypeId: 5, serviceLine: 'Specialized delivery', estimatedValue: 100000, estimatedValueUsd: 1200.50, fileName: 'brief.txt', filePath: 'opportunity/file.txt' } } });
    api.query.mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
    const saved = await productionOpportunityService.save({ id: null, expectedRevision: null, idempotencyKey: 'test', form });
    expect(api.mutate.mock.calls[0][0].variables.input).toMatchObject({ sourceTypeId: 5, serviceLine: 'Specialized delivery', estimatedValueUsd: 1200.50 });
    expect(saved.form).toMatchObject({ leadSource: '5', serviceLine: 'Other', serviceLineOther: 'Specialized delivery', estimatedValueUsd: '1200.5' });
    expect(api.mutate.mock.calls[0][0].variables.input).toMatchObject({ fileName: 'brief.txt', filePath: 'opportunity/file.txt' });
    expect(saved.form.rfp.source).toMatchObject({ name: 'brief.txt', storagePath: 'opportunity/file.txt' });
  });

  it('saves and reloads Other decision role text with a numeric role ID', async () => {
    const contact = { name: 'Test', title: 'Advisor', email: 'test@example.com', phone: '1234567890', decisionRole: 'Other', decisionRoleOther: 'External advisor' };
    api.query.mockResolvedValue({ data: { currencies: [], industries: [{ industryId: 1, industryName: 'Technology', isActive: true }], accountTypes: [{ accountTypeId: 1, accountName: 'Enterprise', isActive: true }] } });
    api.mutate.mockResolvedValue({ data: { createOpportunityClient: { clientId: 1, clientName: 'Test client', contacts: [{ fullName: 'Test', titleRole: 'Advisor', email: 'test@example.com', phone: '1234567890', roleInDecision: 10, roleInDecisionOther: 'External advisor' }] } } });
    const saved = await productionOpportunityService.saveClient({ id: null, expectedRevision: null, idempotencyKey: 'test', form: { name: 'Test client', relationship: '', accountTypeId: '1', industryId: '1', website: 'https://example.com', address: '', streetAddress: 'Test', country: 'India', stateProvince: 'Maharashtra', city: 'Pune', primaryContact: contact, additionalContacts: [] } });
    expect(api.mutate.mock.calls[0][0].variables.contacts[0]).toMatchObject({ roleInDecision: 10, roleInDecisionOther: 'External advisor' });
    expect(saved.primaryContact).toMatchObject({ decisionRole: 'Other', decisionRoleOther: 'External advisor' });
    expect(DECISION_ROLE_IDS['Procurement / Buyer']).toBe(1);
    expect(DECISION_ROLE_IDS['Decision Maker']).toBe(2);
  });
  it('maps the selected currency and separate USD value for pipeline cards', async () => {
    api.query.mockResolvedValueOnce({ data: {
      opportunities: [
        { opportunityId: 1, currencyId: 7, estimatedValue: 43540, estimatedValueUsd: 1200.50 },
        { opportunityId: 2, currencyId: 9, estimatedValue: 500, estimatedValueUsd: 0 },
      ],
      currencies: [{ currencyId: 7, currencyCode: 'EUR' }, { currencyId: 9, currencyCode: 'GBP' }],
    } }).mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
    const result = await productionOpportunityService.list({ queue: 'PIPELINE', search: '', after: null, first: 50 });
    expect(result.nodes[0]).toMatchObject({ currencyCode: 'EUR', estimatedValue: '43540', estimatedValueUsd: '1200.5' });
    expect(result.nodes[1]).toMatchObject({ currencyCode: 'GBP', estimatedValue: '500', estimatedValueUsd: '0' });
  });
  it('resolves a saved opportunity currency without defaulting to INR', async () => {
    api.query.mockResolvedValueOnce({ data: {
      opportunity: { opportunityId: 1, currencyId: 7, estimatedValue: 43540, estimatedValueUsd: 1200.50 },
      currencies: [{ currencyId: 7, currencyCode: 'EUR' }],
    } }).mockResolvedValueOnce({ data: { userList: [], rolesList: [] } });
    expect(await productionOpportunityService.detail('1')).toMatchObject({ currencyCode: 'EUR', estimatedValueUsd: '1200.5' });
  });
});
