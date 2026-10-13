import { describe, expect, it } from 'vitest';
import { clientFieldErrors, normalizedTitle, opportunityFieldErrors, ownerFieldError, validPhone } from './intakeValidation';
import { pendingSaveFieldErrors } from './workflow';
import { LEAD_SOURCES } from './intakeOptions';
import { createMockOpportunityService, createMockOpportunityStore, fixtureOpportunity, TEST_LOOKUPS } from '../testing/fixtures';

describe('Intake validation', () => {
  it.each(['', '   '])('requires a non-blank Source (%s)', leadSource => {
    const { form, client } = fixtureOpportunity(); form.leadSource = leadSource;
    expect(opportunityFieldErrors(form, TEST_LOOKUPS, client).leadSource).toBe('Select a lead source.');
  });
  it.each(LEAD_SOURCES)('accepts configured Source %s', leadSource => {
    const { form, client } = fixtureOpportunity(); form.leadSource = leadSource;
    expect(opportunityFieldErrors(form, TEST_LOOKUPS, client).leadSource).toBeUndefined();
  });
  it('preserves an unchanged saved legacy Source but rejects it for new opportunities', () => {
    const { form, client } = fixtureOpportunity(); form.leadSource = 'Inbound';
    expect(opportunityFieldErrors(form, TEST_LOOKUPS, client, structuredClone(form)).leadSource).toBeUndefined();
    expect(opportunityFieldErrors(form, TEST_LOOKUPS, client).leadSource).toBeDefined();
  });
  it.each([
    ['', '2026-11-25', false],
    ['2026-11-24', '2026-11-25', false],
    ['2026-11-25', '2026-11-25', false],
    ['2026-11-26', '2026-11-25', true],
    ['2027-01-01', '2026-12-31', true],
  ])('checks questions due %s against deadline %s', (questionsDue, submissionDeadline, invalid) => {
    const form = fixtureOpportunity().form;
    Object.assign(form.dates, { questionsDue, submissionDeadline });
    expect(Boolean(pendingSaveFieldErrors(form)['dates.questionsDue'])).toBe(invalid);
  });
  it('preserves invalid-calendar errors before checking date order', () => {
    const form = fixtureOpportunity().form;
    Object.assign(form.dates, { questionsDue: '2026-02-30', submissionDeadline: '2026-02-01' });
    expect(pendingSaveFieldErrors(form)['dates.questionsDue']).toBe('Enter a valid date for questionsDue.');
  });
  it('blocks local persistence when questions are due after submission', async () => {
    const service = createMockOpportunityService(createMockOpportunityStore(), () => '101');
    const record = await service.detail('401'); record.form.dates.questionsDue = '2026-11-26';
    await expect(service.save({ id: record.id, expectedRevision: record.revision, idempotencyKey: 'late-questions', form: record.form })).rejects.toThrow('Questions due date cannot be later');
  });
  it('rejects local saves with no RFP selection', async () => {
    const service = createMockOpportunityService(createMockOpportunityStore(), () => '101');
    const record = await service.detail('401'); record.form.rfp.type = null;
    await expect(service.save({ id: record.id, expectedRevision: record.revision, idempotencyKey: 'missing-rfp-type', form: record.form })).rejects.toThrow('Choose an RFP type.');
  });
  it.each(['0', '0.00', '000.00', '-1', '1.234', '1e3', '', 'Infinity'])('rejects non-positive or invalid estimated value %s', value => {
    const form = fixtureOpportunity().form; form.estimatedValue = value;
    expect(pendingSaveFieldErrors(form).estimatedValue).toBeDefined();
  });
  it.each(['0.01', '1', '001.10', '999999999999999999999999.99'])('accepts a positive decimal %s without floating-point rounding', value => {
    const form = fixtureOpportunity().form; form.estimatedValue = value;
    expect(pendingSaveFieldErrors(form).estimatedValue).toBeUndefined();
  });
  it.each(['+91 98765 43210', '(212) 555-0123', '020 7946 0958', '1234567', '+123456789012345'])('accepts formatted phone %s', phone => expect(validPhone(phone)).toBe(true));
  it.each(['', '123456', '+1234567890123456', 'call me', '123ABC4567', '++1234567890', '1234567 ext 1', '(212 555-0123', '((212)) 555-0123', '---1234567'])('rejects malformed phone %s', phone => expect(validPhone(phone)).toBe(false));
  it('requires all primary/additional contact fields and checks their formats and dropdown values', () => {
    const client = fixtureOpportunity().client!;
    client.primaryContact = { name: ' ', title: '', email: 'invalid', phone: 'abc', decisionRole: 'Invented' };
    client.additionalContacts = [{ ...client.primaryContact }];
    const errors = clientFieldErrors(client, TEST_LOOKUPS);
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['primaryContact.name', 'primaryContact.title', 'primaryContact.email', 'primaryContact.phone', 'primaryContact.decisionRole', 'additionalContacts.0.phone', 'additionalContacts.0.email']));
  });
  it('rejects unknown master values and existing clients with incomplete account/contact data', () => {
    const { form, client } = fixtureOpportunity();
    form.currencyId = 'unknown'; form.serviceLine = 'invented'; form.leadSource = 'invented';
    client!.accountTypeId = 'removed'; client!.industryId = 'removed'; client!.country = '';
    client!.primaryContact.email = 'invalid';
    const errors = opportunityFieldErrors(form, TEST_LOOKUPS, client);
    expect(Object.keys(errors)).toEqual(expect.arrayContaining(['currencyId', 'serviceLine', 'leadSource', 'clientId', 'client.accountTypeId', 'client.industryId', 'client.country', 'client.primaryContact.email']));
  });
  it('preserves an unchanged legacy service line but rejects a new arbitrary value', () => {
    const { form, client } = fixtureOpportunity(); form.serviceLine = 'Historical service';
    expect(opportunityFieldErrors(form, TEST_LOOKUPS, client, structuredClone(form)).serviceLine).toBeUndefined();
    expect(opportunityFieldErrors(form, TEST_LOOKUPS, client).serviceLine).toBeDefined();
  });
  it('normalizes title case, surrounding whitespace and repeated whitespace', () => {
    expect(normalizedTitle('  CLOUD   Transformation ')).toBe('cloud transformation');
  });
  it('rejects invalid priority/RFP dropdown values and inactive or unknown owner IDs', () => {
    const { form, client, owner } = fixtureOpportunity();
    form.priority = 'INVALID' as typeof form.priority;
    form.rfp.outputFormat = 'INVALID' as typeof form.rfp.outputFormat;
    const errors = opportunityFieldErrors(form, TEST_LOOKUPS, client);
    expect(errors.priority).toBeDefined(); expect(errors['rfp.outputFormat']).toBeDefined();
    expect(ownerFieldError(owner!.id, [owner!])).toBeUndefined();
    expect(ownerFieldError(owner!.id, [{ ...owner!, active: false }])).toBeDefined();
    expect(ownerFieldError('invented', [owner!])).toBeDefined();
  });
  it('prevents two simultaneous local creations with the same normalized title', async () => {
    const service = createMockOpportunityService(createMockOpportunityStore(), () => '101');
    const form = fixtureOpportunity().form; form.title = 'Concurrent title';
    const results = await Promise.allSettled(['first', 'second'].map(idempotencyKey => service.save({ id: null, expectedRevision: null, idempotencyKey, form })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(result => result.status === 'rejected')).toHaveLength(1);
  });
  it('enforces title uniqueness in local persistence, while permitting edits of the same record', async () => {
    const service = createMockOpportunityService(createMockOpportunityStore(), () => '101');
    const record = await service.detail('401');
    const form = structuredClone(record.form); form.title = `  ${record.title.toUpperCase().replace(/ /g, '   ')} `;
    await expect(service.save({ id: null, expectedRevision: null, idempotencyKey: 'duplicate-title', form })).rejects.toThrow('already exists');
    await expect(service.save({ id: record.id, expectedRevision: record.revision, idempotencyKey: 'same-title-edit', form })).resolves.toMatchObject({ id: record.id });
  });
  it('validates stored client/contact data on opportunity save, even when no client edit occurs', async () => {
    const store = createMockOpportunityStore(), service = createMockOpportunityService(store, () => '101');
    const record = await service.detail('401');
    const state = store.snapshot(); state.clients[record.form.clientId!].primaryContact.phone = 'invalid'; store.replace(state);
    await expect(service.save({ id: record.id, expectedRevision: record.revision, idempotencyKey: 'bad-stored-client', form: record.form })).rejects.toThrow('valid phone');
  });
});
