import { Block, Candidate, ExtractionError } from './types';
import { splitForRetry } from './policy';

// AI answers vary between runs, so a malformed, invalid or cut-off answer is usually fixed by asking again.
const RETRYABLE = new Set(['AI_OUTPUT_SCHEMA_FAILED', 'INVALID_AI_RESPONSE', 'INCOMPLETE_AI_RESPONSE']);

// Calls the AI for one section at most `budget.calls` times in total. A cut-off answer is retried
// as two halves so dense sections fit the reply limit. Quota waits and other errors pass through.
export async function extractWithRetry(blocks: Block[], extract: (blocks: Block[]) => Promise<Candidate[]>,
  budget = { calls: 3 }): Promise<Candidate[]> {
  budget.calls--;
  try {
    return await extract(blocks);
  } catch (error) {
    if (!(error instanceof ExtractionError) || !RETRYABLE.has(error.code) || budget.calls <= 0) throw error;
    const halves = error.code === 'INCOMPLETE_AI_RESPONSE' && budget.calls >= 2 ? splitForRetry(blocks) : null;
    if (!halves) return extractWithRetry(blocks, extract, budget);
    const found: Candidate[] = [];
    for (const half of halves) found.push(...await extractWithRetry(half, extract, budget));
    return found;
  }
}
