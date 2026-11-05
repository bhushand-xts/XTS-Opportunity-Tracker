import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { OpportunityServiceContext, productionOpportunityService } from '../services/OpportunityService';
import { DocumentDownload } from './DocumentDownload';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const document = { id: 'file.txt', name: 'brief.txt', storagePath: 'opportunity/file.txt', downloadUrl: null };

it('downloads through the service using the original document name', async () => {
  const blob = new Blob(['Document']);
  const download = vi.fn(async () => blob);
  const createObjectURL = vi.fn(() => 'blob:test');
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = vi.fn(); });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('brief.txt');
    expect(this.href).toBe('blob:test');
  });
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, download }}><DocumentDownload document={document} opportunityId="401" /></OpportunityServiceContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'brief.txt' }));
  await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
  expect(download).toHaveBeenCalledWith('401', document);
  expect(createObjectURL).toHaveBeenCalledWith(blob);
});

it('shows download errors and restores the clickable filename', async () => {
  const download = vi.fn(async () => { throw new Error('You cannot download this document.'); });
  render(<OpportunityServiceContext.Provider value={{ ...productionOpportunityService, download }}><DocumentDownload document={document} opportunityId="401" /></OpportunityServiceContext.Provider>);
  fireEvent.click(screen.getByRole('button', { name: 'brief.txt' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('You cannot download this document.');
  expect(screen.getByRole('button', { name: 'brief.txt' })).toBeEnabled();
});
