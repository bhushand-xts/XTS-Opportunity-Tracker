import { afterEach, expect, it, vi } from 'vitest';
import { productionOpportunityService } from './OpportunityService';

const command = { opportunityId: '1', expectedRevision: 1, idempotencyKey: 'upload-test' };
const file = new File(['Example document'], 'brief.txt', { type: 'text/plain' });

it('downloads a saved opportunity document with authentication', async () => {
  localStorage.setItem('authState', JSON.stringify({ session: { token: 'test-token' } }));
  const blob = new Blob(['Example document']);
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
  vi.stubGlobal('fetch', fetchMock);
  const document = { id: 'file.txt', name: 'brief.txt', storagePath: 'opportunity/file.txt', downloadUrl: null };
  await expect(productionOpportunityService.download('401', document)).resolves.toBe(blob);
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:4003/documents/download/file.txt?opportunityId=401', { headers: { Authorization: 'Bearer test-token' } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.removeItem('authState');
});

it('uploads authenticated multipart data and returns the stored document path', async () => {
  localStorage.setItem('authState', JSON.stringify({ session: { token: 'test-token' } }));
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'file.txt', name: 'brief.txt', storagePath: 'opportunity/file.txt' }) });
  vi.stubGlobal('fetch', fetchMock);
  await expect(productionOpportunityService.upload(command, file)).resolves.toEqual({ id: 'file.txt', name: 'brief.txt', storagePath: 'opportunity/file.txt', downloadUrl: null });
  const request = fetchMock.mock.calls[0][1];
  expect(request.headers).toEqual({ Authorization: 'Bearer test-token' });
  expect(request.body.get('file')).toBe(file);
});

it('does not upload without a login token', async () => {
  localStorage.removeItem('authState');
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  await expect(productionOpportunityService.upload(command, file)).rejects.toThrow('Please sign in before uploading.');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('reports backend errors and rejects incomplete successful responses', async () => {
  localStorage.setItem('authState', JSON.stringify({ session: { token: 'test-token' } }));
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'You cannot upload documents.' }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'brief.txt' }) });
  vi.stubGlobal('fetch', fetchMock);
  await expect(productionOpportunityService.upload(command, file)).rejects.toThrow('You cannot upload documents.');
  await expect(productionOpportunityService.upload(command, file)).rejects.toThrow('incomplete document details');
});
