import { Router } from 'express';
import http from 'node:http';
import https from 'node:https';
import env from '../config/env';

export const extractionProxy = Router();
extractionProxy.use((req, res) => {
  if (!env.extractionEnabled) { res.status(404).json({ code: 'EXTRACTION_DISABLED' }); return; }
  const userId = (req as any).user?.id;
  if (!userId) { res.status(401).json({ code: 'AUTHENTICATION_REQUIRED' }); return; }
  if (env.extractionSecret.length < 32) { res.status(503).json({ code: 'EXTRACTION_NOT_CONFIGURED' }); return; }
  if (!['GET', 'POST'].includes(req.method)) { res.sendStatus(405); return; }
  if (req.method === 'POST' && !req.url.startsWith('/documents/') && !req.headers['content-type']?.startsWith('multipart/form-data;')) { res.status(415).json({ code: 'MULTIPART_REQUIRED' }); return; }
  const target = new URL(env.extractionUrl);
  target.pathname = `/api/question-extractions${req.url.split('?')[0]}`;
  target.search = '';
  const headers: http.OutgoingHttpHeaders = { 'x-user-id': String(userId), 'x-extraction-secret': env.extractionSecret };
  for (const name of ['content-type', 'content-length', 'x-idempotency-key', 'x-opportunity-id']) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }
  // Identity, cookies and arbitrary client headers are never forwarded.
  const upstream = (target.protocol === 'https:' ? https : http).request(target, { method: req.method, headers }, response => {
    res.status(response.statusCode || 502);
    for (const name of ['content-type', 'content-disposition', 'content-length', 'cache-control', 'x-content-type-options']) {
      if (response.headers[name]) res.setHeader(name, response.headers[name]!);
    }
    response.on('error', () => res.destroy()); response.pipe(res);
  });
  let bytes = 0;
  req.on('data', chunk => {
    bytes += chunk.length;
    if (bytes > 25 * 1024 * 1024 + 65536) {
      upstream.destroy(); if (!res.headersSent) res.status(413).json({ code: 'UPLOAD_TOO_LARGE' });
    }
  });
  upstream.setTimeout(120000, () => upstream.destroy());
  upstream.on('error', () => { if (!res.headersSent) res.status(503).json({ code: 'EXTRACTION_UNAVAILABLE' }); else res.destroy(); });
  req.on('aborted', () => upstream.destroy());
  res.on('close', () => { if (!res.writableEnded) upstream.destroy(); });
  req.pipe(upstream);
});
