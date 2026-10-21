import path from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { validationFailed } from '../../../../shared/errors/graphqlErrors';

function backendDirectory() {
  let directory = __dirname;
  while (true) {
    const manifest = path.join(directory, 'package.json');
    if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).name === 'xts-backend') return directory;
    const parent = path.dirname(directory);
    if (parent === directory) throw new Error('Cannot locate the backend upload directory.');
    directory = parent;
  }
}

export const uploadDirectory = path.join(backendDirectory(), 'uploads', 'opportunity');
type UploadAudit = { uploadedBy: number | null; uploadedDt: string | null };

export function documentUploadAudit(filePath: string | null | undefined, userId: number, current?: UploadAudit & { filePath: string | null }): UploadAudit {
  if (!filePath) return { uploadedBy: null, uploadedDt: null };
  const unchanged = current?.filePath === filePath;
  if (!/^opportunity\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(pdf|docx?|txt)$/i.test(filePath)) {
    if (unchanged) return { uploadedBy: current.uploadedBy, uploadedDt: current.uploadedDt };
    throw validationFailed('Upload a document before saving its reference.');
  }
  try {
    const storedPath = path.join(uploadDirectory, path.basename(filePath));
    const metadata = JSON.parse(readFileSync(`${storedPath}.json`, 'utf8'));
    if (!Number.isInteger(metadata.userId) || metadata.userId <= 0 || (!unchanged && metadata.userId !== userId)) {
      throw new Error('Invalid document owner.');
    }
    const uploadedAt = metadata.uploadedAt ? new Date(metadata.uploadedAt) : statSync(storedPath).birthtime;
    if (!Number.isFinite(uploadedAt.getTime()) || !statSync(storedPath).isFile()) throw new Error('Invalid upload.');
    return { uploadedBy: metadata.userId, uploadedDt: uploadedAt.toISOString().slice(0, 19).replace('T', ' ') };
  } catch {
    if (unchanged) return { uploadedBy: current.uploadedBy, uploadedDt: current.uploadedDt };
    throw validationFailed('Unable to verify this document upload. Please upload the document again.');
  }
}
