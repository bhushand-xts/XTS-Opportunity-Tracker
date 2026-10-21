import { afterEach, describe, expect, it, vi } from 'vitest';
import { ExtractionRequestError, extractionProgress, mergeExtractedQuestions, questionExtractionService } from './QuestionExtractionService';
afterEach(() => { window.localStorage.clear(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('extraction boundary', () => {
  it('preserves manual edits and deduplicates candidate completions', () => {
    const original = { id: 'candidate-1', text: 'Manually edited', sourceReference: 'Page 1', validated: true };
    const retry = { ...original, id: 'candidate-2' };
    expect(mergeExtractedQuestions([original], [{ ...original, text: 'Old server text' }, retry])).toEqual([original]);
  });
  it('uses the existing login token without setting multipart content type', async () => {
    window.localStorage.setItem('authState', JSON.stringify({ session: { token: 'test-session' } }));
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ jobId: 'job-1' }) })); vi.stubGlobal('fetch', fetch);
    await questionExtractionService.start(new File(['hello'], 'test.txt'), undefined, 'request-1', new AbortController().signal);
    const [, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(options.headers).toEqual({ Authorization: 'Bearer test-session', 'x-idempotency-key': 'request-1' });
    expect(options.body).toBeInstanceOf(FormData);
  });
  it('fails locally for expired login and hides raw backend errors', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(questionExtractionService.status('job-1', new AbortController().signal)).rejects.toThrow('Sign in again');
    expect(fetch).not.toHaveBeenCalled();
    window.localStorage.setItem('authState', JSON.stringify({ session: { token: 'session' } }));
    fetch.mockResolvedValue({ ok: false, json: async () => ({ code: 'UNKNOWN', message: 'Confidential content' }) });
    await expect(questionExtractionService.status('job-1', new AbortController().signal)).rejects.toThrow('Existing questions have been kept');
  });
  it('identifies transient HTTP failures without retrying authentication failures', async () => {
    window.localStorage.setItem('authState', JSON.stringify({ session: { token: 'session' } }));
    const fetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ code: 'UNKNOWN' }) })
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ code: 'AUTHENTICATION_REQUIRED' }) });
    vi.stubGlobal('fetch', fetch);
    await expect(questionExtractionService.status('job-1', new AbortController().signal)).rejects.toMatchObject({ retryable: true });
    await expect(questionExtractionService.status('job-1', new AbortController().signal)).rejects.toMatchObject({ retryable: false });
  });
  it('bounds each status request and propagates cancellation to fetch', async () => {
    vi.useFakeTimers(); window.localStorage.setItem('authState', JSON.stringify({ session: { token: 'session' } }));
    const fetch = vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })); vi.stubGlobal('fetch', fetch);
    const pending = questionExtractionService.status('job-1', new AbortController().signal);
    const result = expect(pending).rejects.toBeInstanceOf(ExtractionRequestError);
    await vi.advanceTimersByTimeAsync(30000); await result;
    const controller = new AbortController(); const cancelled = questionExtractionService.status('job-1', controller.signal);
    const cancellation = expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await cancellation;
  });
  it('reports quota waits and incomplete coverage instead of claiming completion', () => {
    const status = { id: 'job-1', state: 'PROCESSING' as const, completed: 1, total: 4, error: null, questions: [],
      coveredPages: 2, totalPages: 8, stage: 'RATE_LIMITED' as const, retryAfterSeconds: 17 };
    expect(extractionProgress(status)).toContain('1/4 sections (2/8 pages)');
    expect(extractionProgress(status)).toContain('17 seconds');
    expect(extractionProgress({ ...status, state: 'PARTIAL' })).toContain('Extraction incomplete');
    expect(extractionProgress({ ...status, state: 'PARTIAL' })).not.toContain('questions extracted');
  });
});
