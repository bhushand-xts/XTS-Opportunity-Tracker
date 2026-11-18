import { Router, type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { get as getOpportunity } from '../services/opportunity.service';
import { findUsers } from '../integrations/userService';
import { uploadDirectory } from '../lib/documentStorage';
import { query } from '../config/db';

const router = Router();

function missingDocumentTable(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === '42P01');
}
function respondDocumentError(response: import('express').Response, error: unknown, permissionMessage: string) {
  if (missingDocumentTable(error)) {
    response.status(503).json({ message: 'Document storage is not initialized. Apply backend/database/migrations/20261117_opportunity_documents.sql, then retry.' });
    return;
  }
  response.status(403).json({ message: permissionMessage });
}

mkdirSync(uploadDirectory, { recursive: true });

const extensions = new Set(['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx']);

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (_request, file, callback) => {
      callback(
        null,
        `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`
      );
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_request, file, callback) => {
    if (Array.from(file.originalname).length > 100) {
      callback(new Error('Document filename must be at most 100 characters.'));
      return;
    }
    const extension = path.extname(file.originalname).toLowerCase();

    if (!extensions.has(extension)) {
      callback(new Error('Only PDF, Word, Excel and text files are allowed.'));
      return;
    }

    callback(null, true);
  },
});

router.post('/upload', upload.single('file'), (request, response, next) => {
  if (!request.file) {
    response.status(400).json({ message: 'Select a file.' });
    return;
  }
  if (request.file.size === 0) {
    unlinkSync(request.file.path);
    response.status(400).json({ message: 'Choose a non-empty document.' });
    return;
  }
  if (request.query.attachment === '1' && request.file.size > 25 * 1024 * 1024) {
    unlinkSync(request.file.path);
    response.status(400).json({ message: 'Document must be no larger than 25 MB.' });
    return;
  }
  try {
      writeFileSync(`${request.file.path}.json`, JSON.stringify({ userId: response.locals.userId, name: request.file.originalname, size: request.file.size, type: path.extname(request.file.originalname).slice(1).toUpperCase(), uploadedAt: new Date().toISOString() }), { flag: 'wx' });
  } catch (error) {
    unlinkSync(request.file.path);
    next(error);
    return;
  }

  response.status(201).json({
    id: request.file.filename,
    name: request.file.originalname,
    storagePath: `opportunity/${request.file.filename}`,
    downloadUrl: null,
  });
});

router.get('/', async (request, response) => {
  const opportunityId = Number(request.query.opportunityId);
  if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
    response.status(400).json({ message: 'Invalid opportunity reference.' });
    return;
  }
  try {
    await getOpportunity(opportunityId, { user: { id: response.locals.userId } });
    const documents = await query<{ id: string; name: string; title: string | null; storagePath: string; uploadedAt: string; uploadedBy: number; type: string | null; size: number | string | null; isActive: boolean; deletedBy: number | null; deletedAt: string | null }>(
      `SELECT document_id AS id, file_name AS name, document_title AS title, file_path AS "storagePath", uploaded_dt AS "uploadedAt", uploaded_by AS "uploadedBy",
              file_type AS type, file_size AS size, is_active AS "isActive", deleted_by AS "deletedBy", deleted_dt AS "deletedAt"
       FROM tbl_opportunity_document WHERE opportunity_id = $1 ORDER BY is_active DESC, uploaded_dt DESC, document_id`, [opportunityId]
    );
    const users = await findUsers([...new Set(documents.flatMap(document => [document.uploadedBy, document.deletedBy].filter((id): id is number => id !== null)))]).catch(() => []);
    response.json(documents.map(document => {
      const localPath = path.join(uploadDirectory, path.basename(document.storagePath));
      const uploader = users.find(user => user.id === document.uploadedBy);
      const deleter = document.deletedBy === null ? undefined : users.find(user => user.id === document.deletedBy);
      return {
        ...document,
        title: document.title || null,
        type: document.type || path.extname(document.storagePath).slice(1).toUpperCase(),
        size: document.size ?? (existsSync(localPath) ? statSync(localPath).size : null),
        uploadedByName: uploader ? [uploader.firstName, uploader.lastName].filter(Boolean).join(' ').trim() || uploader.email || `User ${document.uploadedBy}` : `User ${document.uploadedBy}`,
        deletedByName: deleter ? [deleter.firstName, deleter.lastName].filter(Boolean).join(' ').trim() || deleter.email || `User ${document.deletedBy}` : document.deletedBy === null ? null : `User ${document.deletedBy}`,
        canDelete: document.isActive && document.uploadedBy === response.locals.userId,
        downloadUrl: null,
      };
    }));
  } catch (error) {
    respondDocumentError(response, error, 'You cannot view documents for this opportunity.');
  }
});

router.post('/attach', async (request, response) => {
  const opportunityId = Number(request.query.opportunityId);
  const storagePath = request.body?.storagePath;
  const documentTitle = typeof request.body?.documentTitle === 'string' ? request.body.documentTitle.trim() : '';
  if (!Number.isInteger(opportunityId) || opportunityId <= 0 || typeof storagePath !== 'string' ||
      !/^opportunity\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(pdf|docx?|txt|xlsx?)$/i.test(storagePath) || !documentTitle || documentTitle.length > 100) {
    response.status(400).json({ message: 'Invalid document or opportunity reference.' });
    return;
  }
  try {
    await getOpportunity(opportunityId, { user: { id: response.locals.userId } });
    const filename = path.basename(storagePath), storedPath = path.join(uploadDirectory, filename);
    const metadata = JSON.parse(readFileSync(`${storedPath}.json`, 'utf8'));
    if (metadata.userId !== response.locals.userId || !existsSync(storedPath)) {
      response.status(403).json({ message: 'You cannot attach this document.' });
      return;
    }
    if (Number(metadata.size) > 25 * 1024 * 1024) {
      unlinkSync(storedPath);
      unlinkSync(`${storedPath}.json`);
      response.status(400).json({ message: 'Document must be no larger than 25 MB.' });
      return;
    }
    const duplicate = await query<{ id: number }>(
      `SELECT document_id AS id FROM tbl_opportunity_document
       WHERE opportunity_id = $1 AND is_active = TRUE
         AND lower(trim(coalesce(document_title, file_name))) = lower(trim($2))
       LIMIT 1`, [opportunityId, documentTitle]
    );
    if (duplicate.length) {
      unlinkSync(storedPath);
      unlinkSync(`${storedPath}.json`);
      response.status(409).json({ message: 'A document with this name already exists. Please choose a different document name.' });
      return;
    }
    await query<{ id: string }>(
      `INSERT INTO tbl_opportunity_document (opportunity_id, file_path, file_name, uploaded_by, document_title, file_type, file_size)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (opportunity_id, file_path) DO UPDATE SET file_name = EXCLUDED.file_name
       RETURNING document_id AS id`, [opportunityId, storagePath, metadata.name, response.locals.userId, documentTitle, metadata.type, metadata.size]
    );
    response.status(201).json({ id: filename, name: metadata.name, storagePath, downloadUrl: null });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      response.status(409).json({ message: 'A document with this name already exists. Please choose a different document name.' });
      return;
    }
    respondDocumentError(response, error, 'Unable to attach this document to the opportunity.');
  }
});

router.delete('/attachments/:documentId', async (request, response) => {
  const opportunityId = Number(request.query.opportunityId), documentId = Number(request.params.documentId);
  if (!Number.isInteger(opportunityId) || opportunityId <= 0 || !Number.isSafeInteger(documentId) || documentId <= 0) {
    response.status(400).json({ message: 'Invalid document or opportunity reference.' });
    return;
  }
  try {
    await getOpportunity(opportunityId, { user: { id: response.locals.userId } });
    const deleted = await query<{ id: string }>(
      `UPDATE tbl_opportunity_document SET is_active = FALSE, deleted_by = $4, deleted_dt = CURRENT_TIMESTAMP
       WHERE document_id = $1 AND opportunity_id = $2 AND uploaded_by = $3 AND is_active = TRUE
       RETURNING document_id AS id`, [documentId, opportunityId, response.locals.userId, response.locals.userId]
    );
    if (!deleted.length) {
      response.status(404).json({ message: 'The document was not found or was uploaded by another user.' });
      return;
    }
    response.status(204).end();
  } catch (error) {
    respondDocumentError(response, error, 'Unable to delete this document. You can delete only documents you uploaded.');
  }
});

router.get('/download/:filename', async (request, response) => {
  const userId = response.locals.userId;
  if (!Number.isInteger(userId) || userId <= 0) {
    response.status(401).json({ message: 'Please sign in.' });
    return;
  }
  const filename = request.params.filename;
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(pdf|docx?|txt|xlsx?)$/i.test(filename)) {
    response.status(400).json({ message: 'Invalid document reference.' });
    return;
  }
  const filePath = path.join(uploadDirectory, filename);
  let originalName: string | undefined;
  if (request.query.opportunityId !== undefined) {
    const opportunityId = Number(request.query.opportunityId);
    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      response.status(400).json({ message: 'Invalid opportunity reference.' });
      return;
    }
    try {
      const opportunity = await getOpportunity(opportunityId, { user: { id: userId } });
      if (opportunity.filePath === `opportunity/${filename}`) originalName = opportunity.fileName ?? filename;
      if (!originalName) {
        const attached = await query<{ name: string }>(
          'SELECT file_name AS name FROM tbl_opportunity_document WHERE opportunity_id = $1 AND file_path = $2',
          [opportunityId, `opportunity/${filename}`]
        );
        originalName = attached[0]?.name;
      }
    } catch (error) {
      respondDocumentError(response, error, 'You cannot download documents for this opportunity.');
      return;
    }
  }
  if (!originalName && request.query.opportunityId === undefined) {
    try {
      const metadata = JSON.parse(readFileSync(`${filePath}.json`, 'utf8'));
      if (metadata.userId === userId && typeof metadata.name === 'string') originalName = metadata.name;
    } catch { /* Older uploads can still be downloaded through their saved opportunity. */ }
  }
  if (!originalName) {
    response.status(403).json({ message: 'You cannot download this document.' });
    return;
  }
  if (!existsSync(filePath)) {
    response.status(404).json({ message: 'The document is no longer available on this server.' });
    return;
  }
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.download(filePath, originalName, error => {
    if (error && !response.headersSent) response.status(500).json({ message: 'Unable to download the document.' });
  });
});

const uploadError: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'Document must be no larger than 25 MB.' : 'Upload one document using the file field.' });
    return;
  }
  if (error instanceof Error && (error.message.startsWith('Only PDF') || error.message.startsWith('Document filename'))) {
    response.status(400).json({ message: error.message });
    return;
  }
  response.status(500).json({ message: 'Unable to store the document. Please try again.' });
};
router.use(uploadError);

export default router;
