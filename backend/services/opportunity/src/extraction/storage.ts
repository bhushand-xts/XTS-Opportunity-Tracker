import path from 'node:path';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import env from '../config/env';
import { ExtractionError } from './types';

export function storageRoot(): string {
  const root = env.extraction.storageRoot;
  if (!root || !path.isAbsolute(root)) throw new ExtractionError('STORAGE_NOT_CONFIGURED', 503);
  return path.resolve(root);
}
export function storagePath(key: string): string {
  const root = storageRoot(), target = path.resolve(root, key);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new ExtractionError('INVALID_PATH');
  return target;
}
export async function prepareStorage() {
  await mkdir(storageRoot(), { recursive: true, mode: 0o700 });
  await mkdir(storagePath('.incoming'), { recursive: true, mode: 0o700 });
  await mkdir(storagePath('.parser'), { recursive: true, mode: 0o700 });
}
export async function discard(key: string) { await rm(storagePath(key), { force: true, recursive: true }); }

// Extraction instructions live beside the document, keyed by a hash of their
// text, so no schema change is needed and identical prompts share one file.
export function instructionsHash(text: string) { return createHash('sha256').update(text).digest('hex').slice(0, 16); }
export async function saveInstructions(documentId: string, text: string) {
  const hash = instructionsHash(text);
  await mkdir(storagePath(`${documentId}/instructions`), { recursive: true, mode: 0o700 });
  await writeFile(storagePath(`${documentId}/instructions/${hash}.txt`), text, { mode: 0o600 });
  return hash;
}
export async function loadInstructions(documentId: string, hash: string) {
  if (!/^[0-9a-f]{16}$/.test(hash)) throw new ExtractionError('INSTRUCTIONS_MISSING');
  try { return await readFile(storagePath(`${documentId}/instructions/${hash}.txt`), 'utf8'); }
  catch { throw new ExtractionError('INSTRUCTIONS_MISSING'); }
}
export async function hashFile(filename: string) { return createHash('sha256').update(await readFile(filename)).digest('hex'); }
