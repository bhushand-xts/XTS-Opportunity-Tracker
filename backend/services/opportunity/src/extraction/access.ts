import * as opportunityService from '../services/opportunity.service';
import { DocumentRecord } from './repository';
import { ExtractionError } from './types';

// Any user with the opportunity upload permission (create or edit) may upload and extract,
// the same rule as the opportunity's own document upload. One ctx shared across both checks
// below — opportunity.service.ts's accessFor() caches its resolved access on whatever ctx
// object it's given, so reusing the same one here avoids fetching the caller's role/menu
// access (an admin-service call) and user record (a user-service call) twice per upload.
export async function mayUpload(userId: number, opportunityId: number | null) {
  const ctx = { user: { id: userId } };
  if (!(await opportunityService.canUploadDocument(ctx))) throw new ExtractionError('ACCESS_DENIED', 403);
  if (opportunityId !== null) await opportunityService.assertExtractionEdit(opportunityId, userId, ctx);
}
export async function mayRead(doc: DocumentRecord | undefined, userId: number, edit = false) {
  if (!doc || doc.deleting) throw new ExtractionError('DOCUMENT_NOT_FOUND', 404);
  if (doc.opportunity_id !== null) {
    if (edit) await mayUpload(userId, doc.opportunity_id);
    else await opportunityService.get(doc.opportunity_id, { user: { id: userId } });
  } else if (doc.owner_id !== userId) throw new ExtractionError('DOCUMENT_NOT_FOUND', 404);
  return doc;
}
