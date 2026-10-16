import 'dotenv/config';
import { setTimeout as delay } from 'node:timers/promises';
import { readdir, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import env from '../config/env';
import { pool, query } from '../config/db';
import * as repo from './repository';
import { tokenChunks, parseDocument } from './parser';
import { extract, QuotaWait } from './groq';
import { extractWithRetry } from './retry';
import { sectionCandidates } from './localMatch';
import { instructionsHashOf } from './policy';
import { prepareStorage, storagePath, discard, loadInstructions } from './storage';
import { ExtractionError, uuidPattern } from './types';

// Jobs created while AI extraction was off carry the local model tag and stay local.
const aiReady = env.extraction.aiExtraction && !!env.extraction.apiKey && env.extraction.zdrConfirmed;
const usesAi = (job: repo.Job) => aiReady && job.model !== 'local-rules-v1';
// Only take jobs this machine can finish: the uploaded file is on this machine's disk, and an AI job
// needs AI configured here. Otherwise another machine's worker would run it with basic rules or fail it.
// A job whose document record is gone is still claimed, so it fails as DOCUMENT_NOT_FOUND as before.
function canProcess(job: { model: string; storage_key: string | null }) {
  if (job.storage_key === null) return true;
  if (job.model !== 'local-rules-v1' && !aiReady) return false;
  try { return existsSync(storagePath(job.storage_key)); } catch { return false; }
}

let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
async function processJob(job: repo.Job) {
  const heartbeat = setInterval(() => { void repo.heartbeat(job).catch(() => {}); }, 30000);
  try {
    const doc = await repo.document(job.document_id);
    if (!doc) throw new ExtractionError('DOCUMENT_NOT_FOUND');
    if (job.attempts > 5) throw new ExtractionError('EXTRACTION_RETRY_LIMIT');
    const hash = instructionsHashOf(job.prompt_version);
    const instructions = hash ? await loadInstructions(doc.id, hash) : '';
    if (!(await repo.results(job.id)).total) await repo.initializeChunks(job, tokenChunks(await parseDocument(storagePath(doc.storage_key), doc.kind), instructions));
    await repo.reuseCompleted(job,doc);
    const covered = new Set((await repo.completedChunks(job.id)).flatMap(chunk=>chunk.blocks.map(block=>block.id)));
    const waiting = await repo.pendingChunks(job.id);
    const seen = new Set<string>();
    const uniqueBlocks = waiting.flatMap(chunk => chunk.blocks).filter(block => {
      if (seen.has(block.id)) return false; seen.add(block.id); return true;
    });
    const remaining = uniqueBlocks.filter((block,index)=>!covered.has(block.id) || (uniqueBlocks[index+1] && !covered.has(uniqueBlocks[index+1].id)));
    if (waiting.length) await repo.repackPending(job, tokenChunks(remaining, instructions));
    const ai = usesAi(job);
    for (const chunk of await repo.pendingChunks(job.id)) {
      if (stopping) { await repo.finish(job, 'QUEUED', null, 0, true); return; }
      if (!await repo.heartbeat(job)) throw new ExtractionError('LEASE_LOST');
      // A QuotaWait from extract() propagates: completed chunks are kept and the
      // job is requeued until quota frees up, so the user's prompt is always honored.
      const candidates = await sectionCandidates(chunk.blocks,
        ai ? blocks => extractWithRetry(blocks, part => extract(part, job.model, job.id, chunk.chunk_index, instructions)) : undefined);
      await repo.completeChunk(job, chunk.chunk_index, candidates);
    }
    await repo.finish(job, 'SUCCEEDED');
  } catch (error) {
    if (error instanceof QuotaWait) await repo.finish(job, 'QUEUED', null, error.seconds, !error.provider);
    else {
      const code = error instanceof ExtractionError ? error.code : 'EXTRACTION_FAILED';
      const retry = code === 'AI_PROVIDER_UNAVAILABLE' && job.attempts < 5;
      await repo.finish(job, retry ? 'QUEUED' : 'FAILED', code, retry ? 60 * job.attempts : 0);
    }
  } finally { clearInterval(heartbeat); }
}
async function cleanup() {
  const expired = await query<{ id: string }>(`UPDATE question_documents d SET deleting=true
    WHERE expires_at<now() AND NOT EXISTS(SELECT 1 FROM question_document_sources s WHERE s.document_id=d.id)
    AND NOT EXISTS(SELECT 1 FROM question_extraction_jobs j WHERE j.document_id=d.id AND j.state IN ('QUEUED','PROCESSING')) RETURNING id`);
  for (const doc of expired) {
    await discard(doc.id);
    await query('DELETE FROM question_documents WHERE id=$1 AND deleting', [doc.id]);
  }
  // Recover files from crashes between filesystem and DB commit, after a conservative grace period.
  for (const entry of await readdir(storagePath('.incoming'), { withFileTypes: true })) {
    if (entry.isFile() && uuidPattern.test(entry.name) && Date.now() - (await stat(storagePath(`.incoming/${entry.name}`))).mtimeMs > 86400000) await rm(storagePath(`.incoming/${entry.name}`), { force: true });
  }
  const root = path.dirname(storagePath('.incoming'));
  for (const entry of await readdir(storagePath('.parser'), { withFileTypes: true })) {
    if (entry.isDirectory() && uuidPattern.test(entry.name) && Date.now() - (await stat(storagePath(`.parser/${entry.name}`))).mtimeMs > 86400000) await discard(`.parser/${entry.name}`);
  }
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && uuidPattern.test(entry.name) && Date.now() - (await stat(storagePath(entry.name))).mtimeMs > 86400000 && !(await query('SELECT id FROM question_documents WHERE id=$1', [entry.name])).length) await discard(entry.name);
  }
}
async function main() {
  if (!env.extraction.enabled) { console.log('Question extraction worker disabled.'); return; }
  if (env.extraction.serviceSecret.length < 32) throw new Error('Extraction configuration incomplete');
  // Local rule-based matching needs no Groq key. It's only required when AI refinement is on.
  if (env.extraction.aiExtraction && (!env.extraction.apiKey || !env.extraction.zdrConfirmed)) throw new Error('Extraction configuration incomplete');
  for (const value of [env.extraction.tokensPerMinute, env.extraction.tokensPerDay]) if (!Number.isFinite(value) || value < env.extraction.requestTokens) throw new Error('Invalid extraction token budget');
  for (const value of [env.extraction.requestsPerMinute, env.extraction.requestsPerDay, env.extraction.retentionDays]) if (!Number.isSafeInteger(value) || value < 1) throw new Error('Invalid extraction limit');
  await prepareStorage();
  let nextCleanup = 0;
  while (!stopping) {
    try {
      if (Date.now() > nextCleanup) { await cleanup(); nextCleanup = Date.now() + 3600000; }
      const job = await repo.claim(canProcess);
      if (job) await processJob(job); else await delay(2000);
    } catch { console.error('Extraction worker iteration failed; retrying without logging document data.'); await delay(5000); }
  }
}
main().catch(() => { console.error('Question extraction worker could not start. Check configuration and migration.'); process.exitCode = 1; }).finally(() => pool.end());
