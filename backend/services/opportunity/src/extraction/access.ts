import * as opportunityService from '../services/opportunity.service';
import { DocumentRecord } from './repository';
import { ExtractionError } from './types';

// Any user with the opportunity upload permission (create or edit) may upload and extract,
// the same rule as the opportunity's own document upload.
export async function mayUpload(userId: number, opportunityId: number | null) {
  if (!(await opportunityService.canUploadDocument({ user: { id: userId } }))) throw new ExtractionError('ACCESS_DENIED', 403);
  if (opportunityId !== null) await opportunityService.assertExtractionEdit(opportunityId, userId);
}
export async function mayRead(doc: DocumentRecord | undefined, userId: number, edit = false) {
  if (!doc || doc.deleting) throw new ExtractionError('DOCUMENT_NOT_FOUND', 404);
  if (doc.opportunity_id !== null) {
    if (edit) await mayUpload(userId, doc.opportunity_id);
    else await opportunityService.get(doc.opportunity_id, { user: { id: userId } });
  } else if (doc.owner_id !== userId) throw new ExtractionError('DOCUMENT_NOT_FOUND', 404);
  return doc;
}
