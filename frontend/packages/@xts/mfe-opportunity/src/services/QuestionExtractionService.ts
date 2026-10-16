import { readAuthToken } from '@xts/api-client';
import type { PreparedQuestion, QuestionExtractionAccepted, QuestionExtractionStatus, SourceDocument } from '@xts/api-contracts';

export const extractionEnabled = process.env.QUESTION_EXTRACTION_ENABLED === 'true' && process.env.OPPORTUNITY_USE_LOCAL_WORKFLOW !== 'true';
const gateway = process.env.GRAPHQL_API_URL || 'http://localhost:4000/graphql';
// Preserve existing deployments that use a relative /graphql gateway URL.
const base = `${gateway.replace(/\/graphql\/?$/, '').replace(/\/$/, '')}/api/question-extractions`;
const errors: Record<string, string> = {
  EXTRACTION_DISABLED: 'Question extraction is not enabled.',
  EXTRACTION_NOT_CONFIGURED: 'Question extraction is not configured. Contact your administrator.',
  AUTHENTICATION_REQUIRED: 'Sign in again to extract questions.',
  DOCUMENT_UNREADABLE_OR_LIMIT_EXCEEDED: 'The document could not be read within the processing limits. Check password protection, scanned pages and document length.',
  INVALID_OR_OVERSIZED_UPLOAD: 'Choose a supported document up to 25 MB.',
  INVALID_DOCUMENT_TYPE: 'The document contents do not match its supported file type.',
  AI_PROVIDER_UNAVAILABLE: 'The extraction provider is unavailable. Try again later.',
  INCOMPLETE_AI_RESPONSE: 'Extraction was incomplete. Try a smaller document.',
  UNVERIFIED_AI_SOURCE: 'Some extracted text could not be verified against the source. Please retry.',
  TOO_MANY_PENDING_EXTRACTIONS: 'You already have pending extractions. Wait for them to finish.',
  AI_OUTPUT_SCHEMA_FAILED: 'The extraction response could not be verified. Available questions have been kept; retry to finish.',
  EXTRACTION_PARTIAL: 'Extraction is incomplete. Available questions have been kept; retry to finish the remaining pages.',
  EXTRACTION_DEADLINE_EXCEEDED: 'Extraction reached its time limit. Available questions have been kept; retry to continue.',
  SUPERSEDED: 'This extraction was replaced by a newer one.',
  INSTRUCTIONS_MISSING: 'The extraction instructions could not be found. Extract again.',
  INSTRUCTIONS_TOO_LONG: 'Extraction instructions are limited to 4,000 characters.',
  INVALID_INSTRUCTIONS: 'The extraction instructions are invalid.',
  CANCELLED: 'Extraction was cancelled.',
  INSTRUCTIONS_TOO_SHORT: "Describe what to extract in a few words, e.g. 'pricing and technical questions'.",
};
export const MAX_INSTRUCTIONS = 4000;
// Same rule as the backend: at least 15 characters and 2 real words, so "a" can't trigger a full run.
export function instructionsTooShort(text: string) {
  return text.length < 15 || (text.match(/\p{L}{2,}/gu) ?? []).length < 2;
}
export function extractionError(code: string) { return errors[code] || 'Question extraction could not finish. Existing questions have been kept.'; }
export class ExtractionRequestError extends Error {
  constructor(message: string, readonly retryable: boolean) { super(message); this.name = 'ExtractionRequestError'; }
}
async function request<T>(suffix: string, init: RequestInit = {}): Promise<T> {
  const token = readAuthToken();
  if (!token) throw new Error(errors.AUTHENTICATION_REQUIRED);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  init.signal?.addEventListener('abort', cancel, { once: true });
  if (init.signal?.aborted) controller.abort();
  const timeout = setTimeout(cancel, init.method === 'POST' ? 60000 : 30000);
  try {
    const response = await fetch(`${base}${suffix}`, { ...init, signal: controller.signal,
      headers: { ...init.headers, Authorization: `Bearer ${token}` }, cache: 'no-store' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new ExtractionRequestError(extractionError(body.code), response.status === 429 || response.status >= 500);
    return body as T;
  } catch (failure) {
    if (init.signal?.aborted || failure instanceof ExtractionRequestError) throw failure;
    throw new ExtractionRequestError('The extraction service could not be reached. Existing questions have been kept.', true);
  } finally {
    clearTimeout(timeout); init.signal?.removeEventListener('abort', cancel);
  }
}
export const questionExtractionService = {
  start(file: File, opportunityId: string | undefined, key: string, signal: AbortSignal) {
    const body = new FormData(); body.append('file', file);
    return request<QuestionExtractionAccepted>('', { method: 'POST', body, signal, headers: {
      'x-idempotency-key': key, ...(opportunityId ? { 'x-opportunity-id': opportunityId } : {}),
    } });
  },
  // Upload only; extraction starts when extract() is called with instructions.
  upload(file: File, opportunityId: string | undefined, signal: AbortSignal) {
    const body = new FormData(); body.append('file', file);
    return request<{ document: SourceDocument }>('/documents', { method: 'POST', body, signal,
      headers: opportunityId ? { 'x-opportunity-id': opportunityId } : {} });
  },
  // keepalive lets the request finish even when the page is closing.
  cancel(documentId: string, jobId: string) {
    return request<{ id: string; state: QuestionExtractionStatus['state'] }>(`/documents/${encodeURIComponent(documentId)}/extractions/${encodeURIComponent(jobId)}/cancel`, { method: 'POST', keepalive: true });
  },
  status(id: string, signal: AbortSignal) { return request<QuestionExtractionStatus>(`/${encodeURIComponent(id)}`, { signal }); },
  retry(documentId: string, key: string, signal: AbortSignal, instructions?: string) {
    return request<QuestionExtractionAccepted>(`/documents/${encodeURIComponent(documentId)}/extractions`, { method: 'POST', signal,
      headers: { 'x-idempotency-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ instructions: instructions ?? '' }) });
  },
  // A saved opportunity's linked document and, per saved question text, its recovered category.
  source(opportunityId: string) {
    return request<{ document: SourceDocument | null; questions?: PreparedQuestion[]; categories?: { text: string; category: string; fromDocument: boolean }[] }>(
      `/source/${encodeURIComponent(opportunityId)}`, { signal: AbortSignal.timeout(5000) });
  },
};
export function mergeExtractedQuestions(current: PreparedQuestion[], incoming: PreparedQuestion[]) {
  const ids = new Set(current.map(question => question.id));
  // Deduplicate retry results without removing existing questions or distinct source occurrences.
  const keys = new Set(current.map(question => `${question.text.replace(/\s+/g, ' ').trim()}|${question.sourceReference}`));
  const additions = incoming.filter(question => {
    const key = `${question.text.replace(/\s+/g, ' ').trim()}|${question.sourceReference}`;
    if (ids.has(question.id) || keys.has(key)) return false;
    ids.add(question.id); keys.add(key); return true;
  }).map(question => ({ ...question, validated: false }));
  return [...current, ...additions];
}
export function extractionCandidateKeys(question: PreparedQuestion) {
  return [question.id, `${question.text.replace(/\s+/g, ' ').trim()}|${question.sourceReference}`];
}
export function extractionProgress(result: QuestionExtractionStatus) {
  const batches = result.total ? ` ${result.completed}/${result.total} sections` : '';
  const pages = result.totalPages ? ` (${result.coveredPages ?? 0}/${result.totalPages} pages)` : '';
  if (result.state === 'SUCCEEDED' && !result.questions.length) return 'No questions matched these instructions. Try broader instructions.';
  if (result.state === 'SUCCEEDED') return `${result.questions.length} questions extracted. Review them before saving.`;
  if (result.state === 'PARTIAL') return `Extraction incomplete${batches}${pages}. Available questions are ready for review; retry to finish.`;
  if (result.stage === 'RATE_LIMITED') {
    const wait = result.retryAfterSeconds ? ` Retry in about ${Math.ceil(result.retryAfterSeconds)} seconds.` : '';
    return `Waiting for the provider's available quota${batches}${pages}.${wait} You can continue editing.`;
  }
  if (result.stage === 'PARSING') return 'Reading all document pages, including scanned content. You can continue editing.';
  if (result.stage === 'RETRYING') return `Retrying unfinished sections${batches}${pages}. Completed questions have been kept.`;
  if (result.state === 'QUEUED') return 'Questions queued for extraction. You can continue editing.';
  return `Extracting questions${batches}${pages}. You can continue editing.`;
}
export function pollDelay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', cancel); resolve(); }, ms);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}
