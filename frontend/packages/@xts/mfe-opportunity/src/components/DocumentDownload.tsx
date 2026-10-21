import { useState } from 'react';
import type { SourceDocument } from '@xts/api-contracts';
import { useOpportunityService } from '../services/OpportunityService';

export function DocumentDownload({ document, opportunityId, disabled = false, truncate = false }: { document: SourceDocument; opportunityId: string | null; disabled?: boolean; truncate?: boolean }) {
  const service = useOpportunityService();
  const [downloading, setDownloading] = useState(false), [error, setError] = useState<string>();
  if (!document.storagePath) return <span className={truncate ? 'block truncate' : 'break-words'} title={truncate ? document.name : undefined}>{document.name}</span>;
  async function download() {
    setDownloading(true); setError(undefined);
    try {
      const blob = await service.download(opportunityId, document);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url; link.download = document.name;
      window.document.body.appendChild(link);
      link.click(); link.remove();
      setTimeout(URL.revokeObjectURL.bind(URL, url), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to download the document.');
    } finally { setDownloading(false); }
  }
  return <div className="min-w-0 space-y-1"><button type="button" title={`Download ${document.name}`} className={`max-w-full cursor-pointer text-left text-sm text-primary underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-60 ${truncate ? 'block truncate' : 'break-words'}`} disabled={disabled || downloading} aria-busy={downloading} onClick={() => void download()}>
    {document.name}
  </button>{downloading && <p role="status" className="text-xs text-muted-foreground">Downloading...</p>}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
