import type { ClientDraft, Contact, DirectoryUser, OpportunityClient, OpportunityDraft, OpportunityLookups } from '@xts/api-contracts';
import { DECISION_ROLES, LEAD_SOURCES, SERVICE_LINES } from './intakeOptions';
import { pendingSaveFieldErrors } from './workflow';

export type FieldErrors = Record<string, string>;
export function normalizedTitle(title: string) { return title.trim().replace(/\s+/g, ' ').toLowerCase(); }

/** Formatting check only: accepts common separators; does not verify ownership. */
export function validPhone(value: string) {
  const phone = value.trim();
  const digits = phone.replace(/\D/g, '');
  return /^\+?(?:\d[\d\s().-]*\d|\(\d+\)[\d\s.-]*\d)$/.test(phone)
    && !/[()]/.test(phone.replace(/\(\d+\)/g, ''))
    && digits.length >= 7 && digits.length <= 15;
}

function contactErrors(contact: Contact | null | undefined, prefix: string): FieldErrors {
  const errors: FieldErrors = {};
  const labels = { name: 'full name', title: 'title / role', email: 'email', phone: 'phone', decisionRole: 'role in decision' };
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    if (!contact?.[key]?.trim()) errors[`${prefix}.${key}`] = `Enter ${labels[key]}.`;
  }
  if (contact?.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) errors[`${prefix}.email`] = 'Enter a valid email address.';
  if (contact?.phone?.trim() && !validPhone(contact.phone)) errors[`${prefix}.phone`] = 'Enter a valid phone number with 7–15 digits.';
  if (contact?.decisionRole?.trim() && !DECISION_ROLES.includes(contact.decisionRole)) errors[`${prefix}.decisionRole`] = 'Select a valid role in decision.';
  return errors;
}

export function clientFieldErrors(form: ClientDraft, lookups: OpportunityLookups): FieldErrors {
  const errors: FieldErrors = {};
  for (const [key, label] of [['name', 'organization / account name'], ['country', 'country'], ['stateProvince', 'state / province'], ['city', 'city']] as const) {
    if (!form[key]?.trim()) errors[key] = `Enter ${label}.`;
  }
  if (!lookups.accountTypes.some(option => option.id === form.accountTypeId)) errors.accountTypeId = 'Select a valid account type.';
  if (!lookups.industries.some(option => option.id === form.industryId)) errors.industryId = 'Select a valid sector / industry.';
  if (form.website && !/^https?:\/\/\S+$/.test(form.website)) errors.website = 'Enter an HTTP or HTTPS website URL.';
  Object.assign(errors, contactErrors(form.primaryContact, 'primaryContact'));
  (form.additionalContacts ?? []).forEach((contact, index) => Object.assign(errors, contactErrors(contact, `additionalContacts.${index}`)));
  return errors;
}

export function opportunityFieldErrors(form: OpportunityDraft, lookups: OpportunityLookups, client: OpportunityClient | null, existing?: OpportunityDraft): FieldErrors {
  const errors = pendingSaveFieldErrors(form);
  if (form.currencyId && !lookups.currencies.some(option => option.id === form.currencyId)) errors.currencyId = 'Select a valid active currency.';
  if (form.serviceLine && !SERVICE_LINES.includes(form.serviceLine) && form.serviceLine !== existing?.serviceLine) errors.serviceLine = 'Select a valid service line.';
  if (form.leadSource.trim() && !LEAD_SOURCES.includes(form.leadSource) && form.leadSource !== existing?.leadSource) errors.leadSource = 'Select a valid lead source.';
  if (!['LOW', 'MEDIUM', 'HIGH'].includes(form.priority)) errors.priority = 'Select a valid priority.';
  for (const key of ['preBidMeeting'] as const) {
    if (!['UNCONFIRMED', 'YES', 'NO'].includes(form.solicitation[key])) errors[`solicitation.${key}`] = 'Select a valid option.';
  }
  if (form.rfp.type !== null && !['QUESTIONNAIRE', 'GENERIC'].includes(form.rfp.type)) errors['rfp.type'] = 'Select a valid RFP type.';
  if (!['TECHNICAL_COST', 'COMBINED'].includes(form.rfp.submissionFormat)) errors['rfp.submissionFormat'] = 'Select a valid submission format.';
  if (!['PDF', 'DOCX', 'PPTX'].includes(form.rfp.outputFormat)) errors['rfp.outputFormat'] = 'Select a valid output format.';
  if (form.clientId) {
    if (!client || client.id !== form.clientId) errors.clientId = 'Select an existing client.';
    else for (const [key, error] of Object.entries(clientFieldErrors(client, lookups))) errors[`client.${key}`] = error;
  }
  if (Object.keys(errors).some(key => key.startsWith('client.'))) errors.clientId = 'Complete the client and contact details shown below.';
  return errors;
}

export function ownerFieldError(ownerId: string, users: DirectoryUser[]) {
  return users.some(user => user.id === ownerId && user.active) ? undefined : 'Select a valid active opportunity owner.';
}
