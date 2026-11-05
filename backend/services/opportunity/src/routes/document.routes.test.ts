import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import express from 'express';
import documentRoutes from './document.routes';
import { documentUploadAudit } from '../lib/documentStorage';

test('document route stores file bytes and returns JSON validation errors', async () => {
  const app = express();
  app.use((_request, response, next) => { response.locals.userId = 1; next(); });
  app.use('/documents', documentRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address !== 'string');
  const endpoint = `http://127.0.0.1:${address.port}/documents/upload`;
  let storedPath: string | undefined;
  try {
    const body = new FormData();
    body.append('file', new Blob(['Document upload verification']), 'brief.txt');
    const response = await fetch(endpoint, { method: 'POST', body });
    assert.equal(response.status, 201);
    const document = await response.json() as { name: string; storagePath: string };
    assert.equal(document.name, 'brief.txt');
    assert.match(document.storagePath, /^opportunity\/[a-f0-9-]{36}\.txt$/);
    storedPath = path.resolve(__dirname, '../../../../uploads', document.storagePath);
    assert.equal(readFileSync(storedPath, 'utf8'), 'Document upload verification');
    const downloaded = await fetch(`http://127.0.0.1:${address.port}/documents/download/${path.basename(storedPath)}`);
    assert.equal(downloaded.status, 200);
    assert.match(downloaded.headers.get('content-disposition') ?? '', /brief\.txt/);
    assert.equal(await downloaded.text(), 'Document upload verification');
    const metadata = JSON.parse(readFileSync(`${storedPath}.json`, 'utf8'));
    assert.equal(metadata.userId, 1);
    assert.equal(typeof metadata.uploadedAt, 'string');
    assert.deepEqual(documentUploadAudit(document.storagePath, 1), { uploadedBy: 1, uploadedDt: metadata.uploadedAt.slice(0, 19).replace('T', ' ') });
    const foreignApp = express();
    foreignApp.use((_request, response, next) => { response.locals.userId = 2; next(); });
    foreignApp.use('/documents', documentRoutes);
    const foreignServer = foreignApp.listen(0, '127.0.0.1');
    await new Promise<void>(resolve => foreignServer.once('listening', resolve));
    try {
      const foreignAddress = foreignServer.address();
      assert(foreignAddress && typeof foreignAddress !== 'string');
      const denied = await fetch(`http://127.0.0.1:${foreignAddress.port}/documents/download/${path.basename(storedPath)}`);
      assert.equal(denied.status, 403);
    } finally {
      foreignServer.closeAllConnections();
      await new Promise<void>(resolve => foreignServer.close(() => resolve()));
    }
    const invalidReference = await fetch(`http://127.0.0.1:${address.port}/documents/download/not-a-document`);
    assert.equal(invalidReference.status, 400);

    for (const [name, bytes, message] of [
      ['invalid.exe', 'invalid', 'Only PDF, Word and text files are allowed.'],
      ['empty.txt', '', 'Choose a non-empty document.'],
    ]) {
      const invalid = new FormData();
      invalid.append('file', new Blob([bytes]), name);
      const result = await fetch(endpoint, { method: 'POST', body: invalid });
      assert.equal(result.status, 400);
      assert.deepEqual(await result.json(), { message });
    }
  } finally {
    if (storedPath) { unlinkSync(storedPath); unlinkSync(`${storedPath}.json`); }
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
