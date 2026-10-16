import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { query, transaction } from '../config/db';
import env from '../config/env';
import { Block, Candidate, DocumentKind, ExtractionError, candidateKey } from './types';
import { EXTRACTOR_VERSION } from './policy';

export interface DocumentRecord {
  id: string; owner_id: number; opportunity_id: number | null; storage_key: string;
  original_name: string; kind: DocumentKind; size_bytes: number; sha256: string; deleting: boolean;
}
export interface Job { id: string; document_id: string; owner_id: number; model: string; state: string; attempts: number; lease_token: string; error_code: string | null; prompt_version: string; next_attempt_at: Date | string; }
export async function document(id: string) {
  return (await query<DocumentRecord>('SELECT * FROM question_documents WHERE id=$1 AND NOT deleting AND (expires_at IS NULL OR expires_at>now())', [id]))[0];
}
export async function existing(owner: number, key: string) {
  return (await query<Job>('SELECT * FROM question_extraction_jobs WHERE owner_id=$1 AND request_key=$2', [owner, key]))[0];
}
export async function createDocument(doc: DocumentRecord, requestKey: string) {
  return transaction(async client => {
    // Serialize repeated uploads with the same owner/key before inserting either file record.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload-owner:${doc.owner_id}`]);
    const prior = (await client.query<Job>('SELECT * FROM question_extraction_jobs WHERE owner_id=$1 AND request_key=$2', [doc.owner_id, requestKey])).rows[0];
    if (prior) return prior;
    const reusable = (await client.query<Job>(`SELECT j.* FROM question_extraction_jobs j
      JOIN question_documents d ON d.id=j.document_id
      WHERE d.owner_id=$1 AND j.owner_id=$1 AND d.sha256=$2 AND d.opportunity_id IS NOT DISTINCT FROM $3
      AND NOT d.deleting AND (d.expires_at IS NULL OR d.expires_at>now()) AND j.model=$4
      AND (j.state IN ('QUEUED','PROCESSING') OR (j.state='SUCCEEDED' AND j.prompt_version=$5))
      ORDER BY (j.state='SUCCEEDED') DESC,j.created_at ASC LIMIT 1`,
    [doc.owner_id,doc.sha256,doc.opportunity_id,env.extraction.model,EXTRACTOR_VERSION])).rows[0];
    if (reusable) return reusable;
    const pending = (await client.query('SELECT count(*)::int AS count FROM question_extraction_jobs WHERE owner_id=$1 AND state IN (\'QUEUED\',\'PROCESSING\')', [doc.owner_id])).rows[0].count;
    if (pending >= 3) throw new ExtractionError('TOO_MANY_PENDING_EXTRACTIONS', 429);
    await client.query(`INSERT INTO question_documents(id,owner_id,opportunity_id,storage_key,original_name,kind,size_bytes,sha256,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+($9 * interval '1 day'))`,
    [doc.id, doc.owner_id, doc.opportunity_id, doc.storage_key, doc.original_name, doc.kind, doc.size_bytes, doc.sha256, env.extraction.retentionDays]);
    return (await client.query<Job>(`INSERT INTO question_extraction_jobs(id,document_id,owner_id,request_key,model,prompt_version)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [randomUUID(), doc.id, doc.owner_id, requestKey, env.extraction.model, EXTRACTOR_VERSION])).rows[0];
  });
}
// Stores an uploaded document without starting extraction. Re-uploading the
// same file for the same owner/opportunity returns the existing document.
export async function createUploadedDocument(doc: DocumentRecord) {
  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload-owner:${doc.owner_id}`]);
    const same = (await client.query<DocumentRecord>(`SELECT * FROM question_documents WHERE owner_id=$1 AND sha256=$2
      AND opportunity_id IS NOT DISTINCT FROM $3 AND NOT deleting AND (expires_at IS NULL OR expires_at>now())
      ORDER BY created_at DESC LIMIT 1`, [doc.owner_id, doc.sha256, doc.opportunity_id])).rows[0];
    if (same) return same;
    return (await client.query<DocumentRecord>(`INSERT INTO question_documents(id,owner_id,opportunity_id,storage_key,original_name,kind,size_bytes,sha256,expires_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,now()+($9 * interval '1 day')) RETURNING *`,
    [doc.id, doc.owner_id, doc.opportunity_id, doc.storage_key, doc.original_name, doc.kind, doc.size_bytes, doc.sha256, env.extraction.retentionDays])).rows[0];
  });
}
// version identifies the prompt (see promptVersion); the instructions file must
// already be saved, so the worker can never claim a job whose prompt is missing.
export async function retryDocument(doc: DocumentRecord, owner: number, requestKey: string, version = EXTRACTOR_VERSION) {
  return transaction(async client => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`upload-owner:${owner}`]);
    const prior = (await client.query<Job>('SELECT * FROM question_extraction_jobs WHERE owner_id=$1 AND request_key=$2', [owner, requestKey])).rows[0];
    if (prior) {
      if (prior.document_id !== doc.id) throw new ExtractionError('IDEMPOTENCY_CONFLICT', 409);
      return prior;
    }
    const cached = (await client.query<Job>(`SELECT * FROM question_extraction_jobs WHERE document_id=$1 AND state='SUCCEEDED'
      AND model=$2 AND prompt_version=$3 ORDER BY created_at DESC LIMIT 1`, [doc.id, env.extraction.model, version])).rows[0];
    if (cached) return cached;
    const active = (await client.query<Job>(`SELECT * FROM question_extraction_jobs WHERE document_id=$1 AND state IN ('QUEUED','PROCESSING') ORDER BY created_at DESC LIMIT 1`, [doc.id])).rows[0];
    if (active && active.prompt_version === version) return active;
    // A new prompt replaces an in-flight extraction of the same document. Clearing
    // the lease makes any worker still holding it stop at its next heartbeat.
    if (active) await client.query(`UPDATE question_extraction_jobs SET state='FAILED',error_code='SUPERSEDED',lease_token=NULL,lease_until=NULL,updated_at=now()
      WHERE document_id=$1 AND state IN ('QUEUED','PROCESSING')`, [doc.id]);
    const pending = (await client.query(`SELECT count(*)::int AS count FROM question_extraction_jobs WHERE owner_id=$1 AND state IN ('QUEUED','PROCESSING')`, [owner])).rows[0].count;
    if (pending >= 3) throw new ExtractionError('TOO_MANY_PENDING_EXTRACTIONS', 429);
    return (await client.query<Job>(`INSERT INTO question_extraction_jobs(id,document_id,owner_id,request_key,model,prompt_version)
      VALUES($1,$2,$3,$4,$5,$6) RETURNING *`, [randomUUID(), doc.id, owner, requestKey, env.extraction.model, version])).rows[0];
  });
}
export async function job(id: string) { return (await query<Job>('SELECT * FROM question_extraction_jobs WHERE id=$1', [id]))[0]; }
export async function results(id: string) {
  const rows = await query<{ candidates: Candidate[] | null }>('SELECT candidates FROM question_extraction_chunks WHERE job_id=$1 ORDER BY chunk_index', [id]);
  const seen = new Set<string>();
  const questions = rows.flatMap(row => row.candidates ?? []).filter(candidate => {
    const key = candidateKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
  return { completed: rows.filter(row => row.candidates !== null).length, total: rows.length, questions };
}
// Workers on different machines can share this database, but each machine keeps its own uploaded
// files and AI settings. A worker only claims a job it can finish (see canProcess in worker.ts);
// the rest stay queued for the machine that holds the file.
export async function claim(canProcess: (job: { model: string; storage_key: string | null }) => boolean) {
  const ready = `((state='QUEUED' AND next_attempt_at<=now()) OR (state='PROCESSING' AND lease_until<now()))`;
  const candidates = await query<{ id: string; model: string; storage_key: string | null }>(`SELECT j.id,j.model,d.storage_key
    FROM question_extraction_jobs j LEFT JOIN question_documents d ON d.id=j.document_id
    WHERE ${ready.replace(/state|next_attempt_at|lease_until/g, column => `j.${column}`)} ORDER BY j.created_at LIMIT 50`);
  for (const candidate of candidates) {
    if (!canProcess(candidate)) continue;
    const job = (await query<Job>(`UPDATE question_extraction_jobs SET state='PROCESSING', lease_token=$1,
      lease_until=now()+interval '5 minutes', attempts=attempts+1,updated_at=now()
      WHERE id=(SELECT id FROM question_extraction_jobs WHERE id=$2 AND ${ready} FOR UPDATE SKIP LOCKED) RETURNING *`, [randomUUID(), candidate.id]))[0];
    if (job) return job;
  }
  return undefined;
}
export async function heartbeat(j: Job) {
  return (await query(`UPDATE question_extraction_jobs SET lease_until=now()+interval '5 minutes'
    WHERE id=$1 AND lease_token=$2 AND state='PROCESSING' RETURNING id`, [j.id, j.lease_token])).length > 0;
}
export async function initializeChunks(j: Job, blocks: Block[][]) {
  await transaction(async client => {
    const held = (await client.query('SELECT id FROM question_extraction_jobs WHERE id=$1 AND lease_token=$2 FOR UPDATE', [j.id, j.lease_token])).rows.length;
    if (!held) throw new ExtractionError('LEASE_LOST');
    for (let n = 0; n < blocks.length; n++) await client.query('INSERT INTO question_extraction_chunks(job_id,chunk_index,blocks) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [j.id, n, JSON.stringify(blocks[n])]);
  });
}
export async function pendingChunks(id: string) {
  return query<{ chunk_index: number; blocks: Block[] }>('SELECT chunk_index,blocks FROM question_extraction_chunks WHERE job_id=$1 AND candidates IS NULL ORDER BY chunk_index', [id]);
}
export async function completedChunks(id: string) {
  return query<{ blocks: Block[]; candidates: Candidate[] }>('SELECT blocks,candidates FROM question_extraction_chunks WHERE job_id=$1 AND candidates IS NOT NULL ORDER BY chunk_index', [id]);
}
export async function reuseCompleted(j: Job, doc: DocumentRecord) {
  await transaction(async client => {
    const held = (await client.query("SELECT id FROM question_extraction_jobs WHERE id=$1 AND lease_token=$2 AND state='PROCESSING' FOR UPDATE", [j.id,j.lease_token])).rows.length;
    if (!held) throw new ExtractionError('LEASE_LOST');
    const current = (await client.query('SELECT blocks,candidates FROM question_extraction_chunks WHERE job_id=$1 AND candidates IS NOT NULL', [j.id])).rows;
    const signature = (row: { blocks: Block[]; candidates: Candidate[] }) => JSON.stringify([row.blocks.map(block=>block.id),row.candidates.map(candidate=>[candidate.text,candidate.sourceReference])]);
    const seen = new Set(current.map(signature));
    const reusable = (await client.query(`SELECT ch.blocks,ch.candidates FROM question_extraction_chunks ch
      JOIN question_extraction_jobs other ON other.id=ch.job_id JOIN question_documents d ON d.id=other.document_id
      WHERE other.id<>$1 AND other.owner_id=$2 AND d.owner_id=$2 AND d.sha256=$3
      AND d.opportunity_id IS NOT DISTINCT FROM $4 AND other.model=$5
      AND other.prompt_version=$6 AND ch.candidates IS NOT NULL ORDER BY other.created_at,ch.chunk_index`,
    [j.id,j.owner_id,doc.sha256,doc.opportunity_id,j.model,j.prompt_version])).rows;
    let index=Number((await client.query('SELECT COALESCE(max(chunk_index),-1)+1 AS next FROM question_extraction_chunks WHERE job_id=$1',[j.id])).rows[0].next);
    for (const row of reusable) {
      const key=signature(row); if(seen.has(key)) continue; seen.add(key);
      await client.query('INSERT INTO question_extraction_chunks(job_id,chunk_index,blocks,candidates) VALUES($1,$2,$3,$4)', [j.id,index++,JSON.stringify(row.blocks),JSON.stringify(row.candidates)]);
    }
  });
}
export async function repackPending(j: Job, groups: Block[][]) {
  await transaction(async client => {
    const held = (await client.query(`SELECT id FROM question_extraction_jobs WHERE id=$1 AND lease_token=$2 AND state='PROCESSING' FOR UPDATE`, [j.id, j.lease_token])).rows.length;
    if (!held) throw new ExtractionError('LEASE_LOST');
    await client.query('DELETE FROM question_extraction_chunks WHERE job_id=$1 AND candidates IS NULL', [j.id]);
    const offset = (await client.query('SELECT COALESCE(max(chunk_index),-1)+1 AS next FROM question_extraction_chunks WHERE job_id=$1', [j.id])).rows[0].next;
    for (let index=0; index<groups.length; index++) await client.query('INSERT INTO question_extraction_chunks(job_id,chunk_index,blocks) VALUES($1,$2,$3)', [j.id, Number(offset)+index, JSON.stringify(groups[index])]);  });
}
export async function completeChunk(j: Job, index: number, candidates: Candidate[]) {
  await query(`UPDATE question_extraction_chunks SET candidates=$3 WHERE job_id=$1 AND chunk_index=$2
    AND EXISTS(SELECT 1 FROM question_extraction_jobs WHERE id=$1 AND lease_token=$4 AND state='PROCESSING')`, [j.id, index, JSON.stringify(candidates), j.lease_token]);
}
// Stops a job nobody is waiting for so it no longer counts toward the pending limit.
// Clearing the lease makes a worker still holding it stop at its next heartbeat. No-op once finished.
export async function cancel(jobId: string) {
  return (await query<Job>(`UPDATE question_extraction_jobs SET state='FAILED',error_code='CANCELLED',lease_token=NULL,lease_until=NULL,updated_at=now()
    WHERE id=$1 AND state IN ('QUEUED','PROCESSING') RETURNING *`, [jobId]))[0];
}
export async function finish(j: Job, state: string, error: string | null = null, delay = 0, quota = false) {
  await query(`UPDATE question_extraction_jobs SET state=$3,error_code=$4,lease_until=NULL,lease_token=NULL,
    next_attempt_at=now()+($5 * interval '1 second'),updated_at=now(),attempts=attempts-$6 WHERE id=$1 AND lease_token=$2`,
  [j.id, j.lease_token, state, error, delay, quota ? 1 : 0]);
}

// Existing save transaction calls this only when the optional field is supplied.
export async function attachSource(client: PoolClient, opportunityId: number, owner: number, id: string | null) {
  if (id === null) {
    await client.query('DELETE FROM question_document_sources WHERE opportunity_id=$1', [opportunityId]); return;
  }
  const doc = (await client.query<DocumentRecord>('SELECT * FROM question_documents WHERE id=$1 AND NOT deleting FOR UPDATE', [id])).rows[0];
  if (!doc || (doc.opportunity_id !== opportunityId && (doc.owner_id !== owner || doc.opportunity_id !== null)) ||
      (doc.opportunity_id === null && (await client.query('SELECT 1 FROM question_documents WHERE id=$1 AND expires_at>now()', [id])).rowCount === 0)) {
    throw new ExtractionError('DOCUMENT_ACCESS_DENIED', 403);
  }
  await client.query('UPDATE question_documents SET opportunity_id=$2,expires_at=NULL WHERE id=$1', [id, opportunityId]);
  await client.query(`INSERT INTO question_document_sources(opportunity_id,document_id) VALUES($1,$2)
    ON CONFLICT(opportunity_id) DO UPDATE SET document_id=EXCLUDED.document_id`, [opportunityId, id]);
}
