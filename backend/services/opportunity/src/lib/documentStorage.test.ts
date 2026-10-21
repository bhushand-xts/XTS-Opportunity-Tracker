import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { documentUploadAudit, uploadDirectory } from './documentStorage';

test('uses the original uploader and date and preserves them during later edits', () => {
  mkdirSync(uploadDirectory, { recursive: true });
  const filename = `${randomUUID()}.txt`;
  const filePath = `opportunity/${filename}`;
  const storedPath = path.join(uploadDirectory, filename);
  writeFileSync(storedPath, 'Audit verification');
  writeFileSync(`${storedPath}.json`, JSON.stringify({ userId: 7, uploadedAt: '2026-10-14T08:30:00.000Z', name: 'brief.txt' }));
  try {
    const audit = documentUploadAudit(filePath, 7);
    assert.deepEqual(audit, { uploadedBy: 7, uploadedDt: '2026-10-14 08:30:00' });
    assert.deepEqual(documentUploadAudit(filePath, 8, { filePath, ...audit }), audit);
    assert.throws(() => documentUploadAudit(filePath, 8), /Unable to verify/);
    assert.deepEqual(documentUploadAudit(null, 7, { filePath, ...audit }), { uploadedBy: null, uploadedDt: null });
    assert.throws(() => documentUploadAudit('opportunity/../../private.txt', 7), /Upload a document/);
  } finally { unlinkSync(storedPath); unlinkSync(`${storedPath}.json`); }
});
