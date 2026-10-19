import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFile, rename, mkdir, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import env from '../config/env';
import { query } from '../config/db';
import * as repo from './repository';
import { mayRead, mayUpload } from './access';
import { prepareStorage, storagePath, hashFile, discard, saveInstructions } from './storage';
import { MAX_INSTRUCTIONS, normalizeInstructions, instructionsTooShort } from './compactSource';
import { normalize } from './groq';
import { categoryFor } from './localMatch';
import { promptVersion } from './policy';
import { DocumentKind, ExtractionError, uuid } from './types';

export const extractionRouter = Router();
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };
const user = (req: Request) => Number(req.header('x-user-id'));
extractionRouter.use((req, res, next) => {
  if (!env.extraction.enabled) { res.status(404).json({ code: 'EXTRACTION_DISABLED' }); return; }
  const expected = Buffer.from(env.extraction.serviceSecret), supplied = Buffer.from(req.header('x-extraction-secret') || '');
  if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(expected, supplied) || !Number.isSafeInteger(user(req)) || user(req) <= 0) {
    res.status(401).json({ code: 'AUTHENTICATION_REQUIRED' }); return;
  }
  res.setHeader('Cache-Control', 'no-store'); next();
});
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, storagePath('.incoming')),
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }), limits: { fileSize: env.extraction.maxBytes, files: 1, fields: 0, parts: 1, headerPairs: 50 },
}).single('file');

export function detectKind(data: Buffer, name: string): DocumentKind {
  const ext = path.extname(name).toLowerCase().slice(1);
  const signatures: Record<string, boolean> = {
    pdf: data.subarray(0, 5).toString() === '%PDF-',
    docx: data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    doc: data.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])),
    txt: !data.includes(0),
    xlsx: data.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])),
    csv: !data.includes(0),
  };
  if (!data.length || !signatures[ext]) throw new ExtractionError('INVALID_DOCUMENT_TYPE');
  if (ext === 'txt' || ext === 'csv') { try { new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { throw new ExtractionError('INVALID_TEXT_ENCODING'); } }
  return ext as DocumentKind;
}

const aiReady = () => env.extraction.aiExtraction && !!env.extraction.apiKey && env.extraction.zdrConfirmed;
const documentView = (doc: repo.DocumentRecord) => ({ id: doc.id, name: doc.original_name, downloadUrl: null });
function opportunityOf(req: Request) {
  const opportunityId = req.header('x-opportunity-id') ? Number(req.header('x-opportunity-id')) : null;
  if (opportunityId !== null && (!Number.isSafeInteger(opportunityId) || opportunityId <= 0)) throw new ExtractionError('INVALID_OPPORTUNITY');
  return opportunityId;
}
// Receives one multipart file, validates and stores it privately, then lets the
// caller persist the record. If persist reuses an existing document, the new copy is discarded.
async function receiveUpload<T extends { documentId: string }>(req: Request, res: Response, owner: number, opportunityId: number | null,
  persist: (doc: repo.DocumentRecord) => Promise<T>): Promise<T> {
  await prepareStorage();
  try {
    await new Promise<void>((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve()));
    if (!req.file) throw new ExtractionError('DOCUMENT_REQUIRED');
    const file = req.file, id = randomUUID();
    await chmod(file.path, 0o600);
    const originalName = path.basename(file.originalname.replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f]/g, '');
    const extension = path.extname(originalName);
    const name = originalName.length <= 100 ? originalName : originalName.slice(0, 100 - extension.length) + extension;
    const data = await readFile(file.path), kind = detectKind(data, originalName);
    const key = `${id}/original.${kind}`;
    await mkdir(storagePath(id), { mode: 0o700 });
    try {
      await rename(file.path, storagePath(key));
      const doc: repo.DocumentRecord = { id, owner_id: owner, opportunity_id: opportunityId, storage_key: key, original_name: name, kind, size_bytes: file.size, sha256: await hashFile(storagePath(key)), deleting: false };
      const persisted = await persist(doc);
      if (persisted.documentId !== id) await discard(id);
      return persisted;
    } catch (error) { await discard(id); throw error; }
  } finally { if (req.file) await rm(req.file.path, { force: true }); }
}

extractionRouter.post('/', wrap(async (req, res) => {
  if (env.extraction.aiExtraction && !aiReady()) throw new ExtractionError('EXTRACTION_NOT_CONFIGURED', 503);
  const owner = user(req), requestKey = uuid(req.header('x-idempotency-key'));
  const opportunityId = opportunityOf(req);
  await mayUpload(owner, opportunityId);
  const prior = await repo.existing(owner, requestKey);
  if (prior) {
    const doc = await mayRead(await repo.document(prior.document_id), owner, true);
    res.json({ document: documentView(doc), jobId: prior.id }); return;
  }
  const { documentId, jobId } = await receiveUpload(req, res, owner, opportunityId, async doc => {
    const job = await repo.createDocument(doc, requestKey);
    return { documentId: job.document_id, jobId: job.id };
  });
  res.status(202).json({ document: documentView((await repo.document(documentId))!), jobId });
}));

// Upload only: extraction starts later, once the user has written or accepted instructions.
extractionRouter.post('/documents', wrap(async (req, res) => {
  const owner = user(req), opportunityId = opportunityOf(req);
  await mayUpload(owner, opportunityId);
  const { documentId } = await receiveUpload(req, res, owner, opportunityId, async doc => ({ documentId: (await repo.createUploadedDocument(doc)).id }));
  res.status(201).json({ document: documentView((await repo.document(documentId))!) });
}));

extractionRouter.get('/source/:opportunityId', wrap(async (req, res) => {
  const id = Number(req.params.opportunityId);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ExtractionError('INVALID_OPPORTUNITY');
  // Check access even when no source exists.
  const service = await import('../services/opportunity.service');
  const opportunity = await service.get(id, { user: { id: user(req) } });
  const rows = await query<{ id: string; original_name: string }>(`SELECT d.id,d.original_name FROM question_document_sources s JOIN question_documents d ON d.id=s.document_id WHERE s.opportunity_id=$1 AND NOT d.deleting`, [id]);
  const latest = rows[0] ? (await query<{ id: string }>(`SELECT id FROM question_extraction_jobs WHERE document_id=$1 AND state='SUCCEEDED' ORDER BY created_at DESC LIMIT 1`, [rows[0].id]))[0] : null;
  const questions = latest ? (await repo.results(latest.id)).questions : [];
  // Saved questions keep only their text, so their categories are recovered from the stored
  // extraction by text; edited or manual ones fall back to keyword rules. No AI involved.
  const extracted = new Map(questions.map(question => [normalize(question.text), question.category]));
  const categories = (opportunity.proposalQuestions ?? []).map(text => {
    const match = extracted.get(normalize(text));
    return { text, category: match ?? categoryFor(undefined, text), fromDocument: extracted.has(normalize(text)) };
  });
  res.json({ document: rows[0] ? { id: rows[0].id, name: rows[0].original_name, downloadUrl: null } : null, questions, categories });
}));
extractionRouter.post('/documents/:documentId/extractions', wrap(async (req, res) => {
  if (env.extraction.aiExtraction && !aiReady()) throw new ExtractionError('EXTRACTION_NOT_CONFIGURED', 503);
  const raw = (req.body as { instructions?: unknown } | undefined)?.instructions;
  if (raw != null && typeof raw !== 'string') throw new ExtractionError('INVALID_INSTRUCTIONS');
  if (typeof raw === 'string' && raw.length > MAX_INSTRUCTIONS) throw new ExtractionError('INSTRUCTIONS_TOO_LONG');
  // edit=true already re-runs mayUpload's exact same check (same userId, same
  // opportunity_id) internally — a second explicit call here would just repeat it.
  const doc = await mayRead(await repo.document(uuid(req.params.documentId)), user(req), true);
  // Instructions only steer AI extraction; local rule matching ignores them.
  const instructions = aiReady() ? normalizeInstructions(raw as string | undefined) : '';
  if (instructions && instructionsTooShort(instructions)) throw new ExtractionError('INSTRUCTIONS_TOO_SHORT');
  const version = instructions ? promptVersion(await saveInstructions(doc.id, instructions)) : promptVersion();
  const job = await repo.retryDocument(doc, user(req), uuid(req.header('x-idempotency-key')), version);
  res.status(202).json({ document: documentView(doc), jobId: job.id });
}));
extractionRouter.post('/documents/:documentId/extractions/:jobId/cancel', wrap(async (req, res) => {
  const doc = await mayRead(await repo.document(uuid(req.params.documentId)), user(req), true);
  const job = await repo.job(uuid(req.params.jobId));
  if (!job || job.document_id !== doc.id) throw new ExtractionError('EXTRACTION_NOT_FOUND', 404);
  const cancelled = await repo.cancel(job.id);
  res.json({ id: job.id, state: cancelled?.state ?? job.state });
}));
extractionRouter.get('/documents/:documentId/download', wrap(async (req, res) => {
  const doc = await mayRead(await repo.document(uuid(req.params.documentId)), user(req));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.download(storagePath(doc.storage_key), doc.original_name);
}));
extractionRouter.get('/:jobId', wrap(async (req, res) => {
  const job = await repo.job(uuid(req.params.jobId));
  if (!job) throw new ExtractionError('EXTRACTION_NOT_FOUND', 404);
  await mayRead(await repo.document(job.document_id), user(req));
  const result = await repo.results(job.id);
  // Stage is derived from existing columns: a queued job with a future retry time
  // is waiting for provider quota (no error) or retrying after a provider error.
  const waitMs = new Date(job.next_attempt_at).getTime() - Date.now();
  const stage = job.state === 'QUEUED' && waitMs > 0 ? (job.error_code ? 'RETRYING' : 'RATE_LIMITED')
    : job.state === 'PROCESSING' && !result.total ? 'PARSING'
    : job.state === 'SUCCEEDED' ? 'COMPLETE' : job.state === 'FAILED' ? 'FAILED' : 'EXTRACTING';
  res.json({ id: job.id, state: job.state, stage, completed: result.completed, total: result.total,
    ...(waitMs > 0 && job.state === 'QUEUED' ? { retryAfterSeconds: Math.ceil(waitMs / 1000) } : {}),
    // Completed sections are returned while the job runs, so results appear progressively during quota waits.
    error: job.error_code, questions: result.questions });
}));
extractionRouter.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return;
  // Opportunity access errors carry their own codes; report them instead of a generic failure.
  const access = (error as { extensions?: { code?: unknown } } | null)?.extensions?.code;
  if (access === 'NOT_FOUND') { res.status(404).json({ code: 'OPPORTUNITY_NOT_FOUND' }); return; }
  if (access === 'FORBIDDEN' || access === 'CONFLICT') { res.status(403).json({ code: 'OPPORTUNITY_EDIT_NOT_ALLOWED' }); return; }
  const known = error instanceof ExtractionError;
  res.status(error instanceof multer.MulterError ? 400 : known ? error.status : 503)
    .json({ code: error instanceof multer.MulterError ? 'INVALID_OR_OVERSIZED_UPLOAD' : known ? error.code : 'EXTRACTION_UNAVAILABLE' });
});
