import { validationFailed } from '../../../../shared/errors/graphqlErrors';

// Input and business validation for clients. Column sizes mirror the live
// mst_client / tbl_client_contact_person tables exactly (checked against the
// database directly — street_address really is this short, not a typo).
const MAX_CLIENT_NAME = 255;
const MAX_ACCOUNT_TYPE = 100;
const MAX_SECTOR = 100;
const MAX_WEBSITE = 500;
const MAX_CITY = 100;
const MAX_STATE = 100;
const MAX_COUNTRY = 100;
const MAX_STREET_ADDRESS = 20;

const MAX_CONTACT_NAME = 255;
const MAX_TITLE_ROLE = 150;
const MAX_EMAIL = 255;
const MAX_PHONE = 20;
const MAX_ROLE_OTHER = 255;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ClientContactInputLike {
  fullName?: string | null;
  titleRole?: string | null;
  email?: string | null;
  phone?: string | null;
  roleInDecision?: number | null;
  roleInDecisionOther?: string | null;
}

export interface ClientInputLike {
  clientName?: string | null;
  accountType?: string | null;
  sector?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  streetAddress?: string | null;
  contacts?: ClientContactInputLike[];
}

function contactErrors(contact: ClientContactInputLike, index: number): string[] {
  const errors: string[] = [];
  const label = `Contact ${index + 1}`;
  if (!contact.fullName || !contact.fullName.trim()) errors.push(`${label}: Full name is required`);
  if (contact.fullName && contact.fullName.trim().length > MAX_CONTACT_NAME) {
    errors.push(`${label}: Full name must be at most ${MAX_CONTACT_NAME} characters`);
  }
  if (contact.titleRole && contact.titleRole.trim().length > MAX_TITLE_ROLE) {
    errors.push(`${label}: Title / role must be at most ${MAX_TITLE_ROLE} characters`);
  }
  if (contact.email && contact.email.trim()) {
    if (contact.email.trim().length > MAX_EMAIL) errors.push(`${label}: Email must be at most ${MAX_EMAIL} characters`);
    if (!EMAIL_PATTERN.test(contact.email.trim())) errors.push(`${label}: Email is not a valid address`);
  }
  if (contact.phone && contact.phone.trim().length > MAX_PHONE) {
    errors.push(`${label}: Phone must be at most ${MAX_PHONE} characters`);
  }
  if (contact.roleInDecisionOther && contact.roleInDecisionOther.trim().length > MAX_ROLE_OTHER) {
    errors.push(`${label}: "Other" role must be at most ${MAX_ROLE_OTHER} characters`);
  }
  return errors;
}

function lengthErrors(input: ClientInputLike): string[] {
  const errors: string[] = [];
  if (input.clientName && input.clientName.trim().length > MAX_CLIENT_NAME) {
    errors.push(`Organization / account name must be at most ${MAX_CLIENT_NAME} characters`);
  }
  if (input.accountType && input.accountType.trim().length > MAX_ACCOUNT_TYPE) {
    errors.push(`Account type must be at most ${MAX_ACCOUNT_TYPE} characters`);
  }
  if (input.sector && input.sector.trim().length > MAX_SECTOR) {
    errors.push(`Sector / industry must be at most ${MAX_SECTOR} characters`);
  }
  if (input.website && input.website.trim().length > MAX_WEBSITE) {
    errors.push(`Website must be at most ${MAX_WEBSITE} characters`);
  }
  if (input.city && input.city.trim().length > MAX_CITY) {
    errors.push(`City must be at most ${MAX_CITY} characters`);
  }
  if (input.state && input.state.trim().length > MAX_STATE) {
    errors.push(`State / province must be at most ${MAX_STATE} characters`);
  }
  if (input.country && input.country.trim().length > MAX_COUNTRY) {
    errors.push(`Country must be at most ${MAX_COUNTRY} characters`);
  }
  if (input.streetAddress && input.streetAddress.trim().length > MAX_STREET_ADDRESS) {
    errors.push(`Street address must be at most ${MAX_STREET_ADDRESS} characters`);
  }
  (input.contacts ?? []).forEach((contact, index) => errors.push(...contactErrors(contact, index)));
  return errors;
}

function assertValidCreate(input: ClientInputLike): void {
  const errors: string[] = [];
  if (!input.clientName || !input.clientName.trim()) errors.push('Organization / account name is required');
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

function assertValidUpdate(input: ClientInputLike): void {
  const errors: string[] = [];
  if ('clientName' in input && (!input.clientName || !input.clientName.trim())) {
    errors.push('Organization / account name cannot be empty');
  }
  errors.push(...lengthErrors(input));
  if (errors.length) throw validationFailed(errors.join(', '));
}

export { assertValidCreate, assertValidUpdate };
