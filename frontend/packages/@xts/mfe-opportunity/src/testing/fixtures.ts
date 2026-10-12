/** TEST FIXTURES ONLY. Imported by tests and the isolated visual harness;
 * production has no dependency on this file and no mock fallback. */
import type { OpportunityDetail, OpportunityLookups } from '@xts/api-contracts';
import { newDraft } from '../lib/workflow';

export const TEST_LOOKUPS: OpportunityLookups = { currencies: [{ id: '1', label: 'INR · Indian rupee', code: 'INR' }], industries: [{ id: '1', label: 'Technology' }], accountTypes: [{ id: '1', label: 'Enterprise' }] };
export function fixtureOpportunity(overrides: Partial<OpportunityDetail> = {}): OpportunityDetail {
  const owner = { id: '101', name: 'Test Owner', email: 'owner@example.test', roles: ['Test role'], active: true };
  const reviewer = { id: '102', name: 'Test Reviewer', email: 'reviewer@example.test', roles: ['Test review role'], active: true };
  const form = newDraft(owner.id);
  Object.assign(form, { title: 'Cloud transformation', estimatedValue: '250000.00', currencyId: '1', serviceLine: 'Digital engineering', clientId: '201', description: 'Modernize the delivery platform.' });
  Object.assign(form.solicitation, { reference: 'RFP-TEST-1', issuingAgency: 'Test procurement', portalUrl: 'https://procurement.example.test' });
  form.dates.submissionDeadline = '2026-11-25'; form.rfp.type = 'QUESTIONNAIRE'; form.rfp.questions = [{ id: '301', text: 'Describe the delivery approach.', sourceReference: 'Page 1', validated: true }];
  const client = { id: '201', revision: 1, name: 'Test Client', relationship: 'Existing customer', accountTypeId: '1', industryId: '1', accountTypeName: 'Enterprise', industryName: 'Technology', website: 'https://example.test', address: 'Display postal address', country: 'India', stateProvince: 'Maharashtra', city: 'Pune', streetAddress: 'Building 1, Test Street', primaryContact: { name: 'Test Contact', title: 'Procurement lead', email: 'contact@example.test', phone: '+91 0000000000', decisionRole: 'Decision maker' }, additionalContacts: [], allowedActions: ['CLIENT_UPDATE'] as OpportunityDetail['allowedActions'] };
  return {
    id: '401', number: 'OPP-TEST-401', title: form.title, estimatedValue: form.estimatedValue, currencyCode: 'INR', clientName: client.name, owner, priority: 'MEDIUM', state: 'PREPARATION_PENDING', rfpType: 'QUESTIONNAIRE', submissionDeadline: form.dates.submissionDeadline, revision: 1, packageRevision: null,
    allowedActions: ['EDIT', 'ASSIGN', 'EDIT_ESTIMATION', 'EDIT_SCOPE', 'UPLOAD', 'EXTRACT', 'CLIENT_CREATE'],
    form, client, visibleModules: ['overview', 'responses', 'estimation', 'scope', 'assignment', 'activity'],
    responses: [{ id: '301', title: 'Describe the delivery approach.', sourceValidated: true, sourceReference: 'Page 1', owner, reviewer, dueDate: '2026-11-20', answer: 'Saved initial answer.', state: 'DRAFT', revision: 1, submittedRevision: null, approvedRevision: null, reviewComment: null, allowedActions: ['ASSIGN', 'SAVE_ANSWER', 'SUBMIT_ANSWER'] }],
    estimation: { revision: 1, rows: [{ id: '501', workItem: 'Implementation', hours: '80', people: 2, hourlyRate: '1500' }], assumptions: 'Client provides access.', total: '240000.00' },
    scope: { revision: 1, objective: 'Modernize delivery', deliverables: 'Working platform', inclusions: 'Discovery and implementation', exclusions: 'Third-party licences', dependencies: 'Access and stakeholder input', acceptance: 'Agreed performance tests' },
    activity: [{ id: '601', action: 'Opportunity created', actor: owner, at: '2026-10-12T08:00:00Z', note: null, packageRevision: null }], responsible: owner, readiness: { ready: false, issues: ['Approve the response package.'] }, salesRecommendation: null, ...overrides,
  };
}
