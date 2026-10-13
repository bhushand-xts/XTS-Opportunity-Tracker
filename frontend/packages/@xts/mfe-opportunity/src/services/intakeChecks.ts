import type { OpportunityClient, OpportunityDraft, OpportunityLookups } from '@xts/api-contracts';
import type { OpportunityService } from './OpportunityService';
import { normalizedTitle, opportunityFieldErrors, type FieldErrors } from '../lib/intakeValidation';

export const FIELD_VALIDATION_FAILED = 'Check the highlighted fields before saving.';

/** Read every page; an incomplete/unavailable directory must not pass validation. */
export async function findDuplicateTitle(service: OpportunityService, title: string, id: string | null) {
  let after: string | null = null;
  const seen = new Set<string>();
  do {
    const page = await service.list({ queue: 'PIPELINE', search: '', after, first: 100 });
    if (page.nodes.some(item => item.id !== id && normalizedTitle(item.title) === normalizedTitle(title))) return true;
    if (!page.hasNextPage) return false;
    if (!page.endCursor || seen.has(page.endCursor)) throw new Error('Unable to verify title uniqueness: incomplete opportunity directory.');
    seen.add(page.endCursor); after = page.endCursor;
  } while (true);
}

export async function checkOpportunitySave(service: OpportunityService, form: OpportunityDraft, id: string | null, existing?: OpportunityDraft): Promise<{ errors: FieldErrors; client: OpportunityClient | null; lookups: OpportunityLookups }> {
  const [lookups, duplicate] = await Promise.all([service.lookups(), findDuplicateTitle(service, form.title, id)]);
  let client: OpportunityClient | null = null, after: string | null = null;
  const seen = new Set<string>();
  do {
    const page = await service.clients('', after);
    client = page.nodes.find(item => item.id === form.clientId) ?? null;
    if (client || !page.hasNextPage) break;
    if (!page.endCursor || seen.has(page.endCursor)) throw new Error('Unable to verify the selected client: incomplete client directory.');
    seen.add(page.endCursor); after = page.endCursor;
  } while (true);
  const errors = opportunityFieldErrors(form, lookups, client, existing);
  let ownerFound = false;
  after = null; seen.clear();
  do {
    const page = await service.eligibleUsers({ opportunityId: id, purpose: 'OWNER', search: '', after });
    ownerFound = page.nodes.some(owner => owner.id === form.ownerId && owner.active);
    if (ownerFound || !page.hasNextPage) break;
    if (!page.endCursor || seen.has(page.endCursor)) throw new Error('Unable to verify the selected owner: incomplete user directory.');
    seen.add(page.endCursor); after = page.endCursor;
  } while (true);
  if (!ownerFound) errors.ownerId = 'Select a valid active opportunity owner.';
  if (duplicate) errors.title = 'An opportunity with this title already exists.';
  return { errors, client, lookups };
}
