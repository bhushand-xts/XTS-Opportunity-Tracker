import Groq from 'groq-sdk';
import env from '../config/env';
import { transaction, query } from '../config/db';
import { Block, Candidate, ExtractionError } from './types';
import { inputTokens, completionBudget } from './tokenBudget';
import { prepareSource, sourceMessages, sourceResponseFormat, expandSelections } from './compactSource';

export class QuotaWait extends Error { constructor(public seconds: number, public provider = false) { super('EXTRACTION_QUEUED'); } }
const scope = () => env.extraction.quotaScope;
export async function reserveQuota(tokens = env.extraction.requestTokens, window?: { minute?: Date; day?: Date }) {
  if (!Number.isFinite(tokens) || tokens < 1 || tokens > Math.min(env.extraction.tokensPerMinute, env.extraction.tokensPerDay)) throw new ExtractionError('REQUEST_EXCEEDS_TOKEN_BUDGET');
  return transaction(async client => {
    await client.query('INSERT INTO question_extraction_quota(scope) VALUES($1) ON CONFLICT DO NOTHING', [scope()]);
    const q = (await client.query(`SELECT *,now() AS server_now FROM question_extraction_quota WHERE scope=$1 FOR UPDATE`, [scope()])).rows[0];
    const now = new Date(q.server_now).getTime();
    const minuteReset = now - new Date(q.minute_started).getTime() >= 60000;
    const dayReset = now - new Date(q.day_started).getTime() >= 86400000;
    const minute = minuteReset ? 0 : q.minute_tokens, day = dayReset ? 0 : q.day_tokens, requests = dayReset ? 0 : q.day_requests;
    const minuteRequests = minuteReset ? 0 : (q.minute_requests || 0);
    const delay = Math.max(0, (new Date(q.blocked_until).getTime() - now) / 1000);
    if (delay > 0) return Math.ceil(delay);
    if (day + tokens > env.extraction.tokensPerDay || requests >= env.extraction.requestsPerDay) return Math.max(1, Math.ceil((new Date(q.day_started).getTime() + 86400000 - now) / 1000));
    if (minute + tokens > env.extraction.tokensPerMinute || minuteRequests >= env.extraction.requestsPerMinute) return Math.max(1, Math.ceil((new Date(q.minute_started).getTime() + 60000 - now) / 1000));
    await client.query(`UPDATE question_extraction_quota SET minute_started=CASE WHEN $2 THEN now() ELSE minute_started END,
      day_started=CASE WHEN $3 THEN now() ELSE day_started END,minute_tokens=$4,day_tokens=$5,day_requests=$6,minute_requests=$7 WHERE scope=$1`,
    [scope(), minuteReset, dayReset, minute + tokens, day + tokens, requests + 1, minuteRequests + 1]);
    if (window) { window.minute = minuteReset ? q.server_now : q.minute_started; window.day = dayReset ? q.server_now : q.day_started; }
    return 0;
  });
}
export const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();
export function validateCandidates(value: unknown, blocks: Block[], jobId: string, chunk: number): Candidate[] {
  const raw = value as { questions?: { text?: unknown; sourceBlockId?: unknown; sourceEndBlockId?: unknown }[] };
  if (!raw || !Array.isArray(raw.questions) || raw.questions.length > 100) throw new ExtractionError('INVALID_AI_RESPONSE');
  const candidates: Candidate[] = [];
  for (const [i, question] of raw.questions.entries()) {
    if (!question || typeof question.text !== 'string' || typeof question.sourceBlockId !== 'string') throw new ExtractionError('INVALID_AI_RESPONSE');
    const start = blocks.findIndex(b => b.id === question.sourceBlockId);
    const end = question.sourceEndBlockId ? blocks.findIndex(b => b.id === question.sourceEndBlockId) : start;
    const block = blocks[start], text = question.text.trim();
    if (!block || end < start || !text || text.length > 4000 || !normalize(blocks.slice(start, end + 1).map(b => b.text).join('')).includes(normalize(text))) throw new ExtractionError('UNVERIFIED_AI_SOURCE');
    candidates.push({ id: `extracted-${jobId}-${chunk}-${i}`, text, sourceReference: `${block.reference} (${block.id})`, validated: false });
  }
  return candidates.sort((a, b) => {
    const ai = blocks.findIndex(block => a.sourceReference.endsWith(`(${block.id})`));
    const bi = blocks.findIndex(block => b.sourceReference.endsWith(`(${block.id})`));
    return ai - bi || blocks[ai].text.indexOf(a.text) - blocks[bi].text.indexOf(b.text);
  });
}
type Message = { role: 'system' | 'user'; content: string };
type ResponseFormat = { type: 'json_schema'; json_schema: { name: string; strict: boolean; schema: Record<string, unknown> } };

// Shared provider call: quota reservation, usage refund, and error mapping. Returns the parsed JSON content.
async function callGroq(model: string, messages: Message[], responseFormat: ResponseFormat, maxCompletionTokens: number, reserved: number): Promise<unknown> {
  const window: { minute?: Date; day?: Date } = {};
  const delay = await reserveQuota(reserved, window);
  if (delay) throw new QuotaWait(delay);
  const groq = new Groq({ apiKey: env.extraction.apiKey, maxRetries: 0, timeout: 60000 });
  try {
    const response = await groq.chat.completions.create({
      model, max_completion_tokens: maxCompletionTokens,
      ...(model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low' as const } : {}),
      messages,
      response_format: responseFormat,
    });
    if (response.usage?.total_tokens && window.minute && window.day) {
      await query(`UPDATE question_extraction_quota SET
        minute_tokens=GREATEST(0,minute_tokens-CASE WHEN minute_started=$3 THEN $2 ELSE 0 END),
        day_tokens=GREATEST(0,day_tokens-CASE WHEN day_started=$4 THEN $2 ELSE 0 END) WHERE scope=$1`,
      [scope(), reserved - response.usage.total_tokens, window.minute, window.day]);
    }
    if (response.choices[0]?.finish_reason !== 'stop' || !response.choices[0]?.message.content) throw new ExtractionError('INCOMPLETE_AI_RESPONSE');
    try { return JSON.parse(response.choices[0].message.content); }
    catch { throw new ExtractionError('INCOMPLETE_AI_RESPONSE'); }
  } catch (error) {
    if (error instanceof Groq.APIError && error.status === 429) {
      const seconds = Math.min(86400, Math.max(60, Number(error.headers?.get('retry-after')) || 60));
      await query(`UPDATE question_extraction_quota SET blocked_until=GREATEST(blocked_until,now()+($2 * interval '1 second')) WHERE scope=$1`, [scope(), seconds]);
      throw new QuotaWait(seconds, true);
    }
    if (error instanceof ExtractionError) throw error;
    if (error instanceof Groq.APIError) {
      const body = error.error as { error?: { code?: unknown }; code?: unknown } | undefined;
      const value = body?.error?.code ?? body?.code;
      const code = typeof value === 'string' && /^[a-z0-9_-]{1,64}$/i.test(value) ? value : 'unknown';
      console.error('Groq request failed', { status: error.status, code });
      // Retrying an identical rejected request wastes quota without changing its outcome.
      if (code === 'json_validate_failed') throw new ExtractionError('AI_OUTPUT_SCHEMA_FAILED');
      if (error.status === 401 || error.status === 403) throw new ExtractionError('AI_AUTHENTICATION_FAILED');
      if (error.status && error.status >= 400 && error.status < 500) throw new ExtractionError('AI_REQUEST_REJECTED');
    }
    // Never expose SDK errors: they can contain submitted text.
    throw new ExtractionError('AI_PROVIDER_UNAVAILABLE', 503);
  }
}

export async function extract(blocks: Block[], model: string, _jobId: string, _index: number, instructions?: string | null) {
  const source = prepareSource(blocks);
  if (!source.units.length) return [];
  const reserved = inputTokens(blocks, instructions) + completionBudget;
  const value = await callGroq(model, sourceMessages(source, instructions), sourceResponseFormat, completionBudget, reserved);
  return expandSelections(value, source);
}
