import { findUser } from '../integrations/userService';
import * as opportunityService from '../services/opportunity.service';
import { DocumentRecord } from './repository';
import { ExtractionError } from './types';

export async function mayUpload(userId: number, opportunityId: number | null) {
  const user = await findUser(userId);
  if (![20, 24].includes(user?.roleId ?? 0)) throw new ExtractionError('ACCESS_DENIED', 403);
  if (opportunityId !== null) await opportunityService.assertExtractionEdit(opportunityId, userId, user?.roleId);
}
export async function mayRead(doc: DocumentRecord | undefined, userId: number, edit = false) {
  if (!doc || doc.deleting) throw new ExtractionError('DOCUMENT_NOT_FOUND', 404);
  if (doc.opportunity_id !== null) {
    if (edit) await mayUpload(userId, doc.opportunity_id);
    else await opportunityService.get(doc.opportunity_id, { user: { id: userId } });
  } else if (doc.owner_id !== userId) throw new ExtractionError('DOCUMENT_NOT_FOUND', 404);
  return doc;
}
