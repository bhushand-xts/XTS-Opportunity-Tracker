import { Router, type ErrorRequestHandler } from 'express';
import multer from 'multer';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { get as getOpportunity } from '../services/opportunity.service';
import { uploadDirectory } from '../lib/documentStorage';

const router = Router();

mkdirSync(uploadDirectory, { recursive: true });

const extensions = new Set(['.pdf', '.doc', '.docx', '.txt']);

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
      callback(new Error('Only PDF, Word and text files are allowed.'));
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
  try {
    writeFileSync(`${request.file.path}.json`, JSON.stringify({ userId: response.locals.userId, name: request.file.originalname, uploadedAt: new Date().toISOString() }), { flag: 'wx' });
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

router.get('/download/:filename', async (request, response) => {
  const userId = response.locals.userId;
  if (!Number.isInteger(userId) || userId <= 0) {
    response.status(401).json({ message: 'Please sign in.' });
    return;
  }
  const filename = request.params.filename;
  if (!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}\.(pdf|docx?|txt)$/i.test(filename)) {
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
    } catch {
      response.status(403).json({ message: 'You cannot download documents for this opportunity.' });
      return;
    }
  }
  if (!originalName) {
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
