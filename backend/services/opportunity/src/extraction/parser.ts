import { execFile } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, writeFile, readFile, rm, rename } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import env from '../config/env';
import { Block, DocumentKind, ExtractionError } from './types';
import { storagePath } from './storage';
import { inputTokens, completionBudget } from './tokenBudget';
import { splitSemanticText } from './parser.semantic';

// Parse in a disposable process: no database credentials or Groq key are inherited.
export async function parseDocument(filename: string, kind: DocumentKind): Promise<Block[]> {
  if (!env.extraction.parserQueue) return parseIsolated(filename, kind);
  const task = storagePath(`.parser/${randomUUID()}`);
  await mkdir(task, { mode: 0o700 });
  try {
    await writeFile(path.join(task, 'request.tmp'), JSON.stringify({ filename, kind }), { mode: 0o600 });
    await rename(path.join(task, 'request.tmp'), path.join(task, 'request.json'));
    const until = Date.now() + env.extraction.parserTimeoutMs + 30000;
    while (Date.now() < until) {
      try {
        const result = JSON.parse(await readFile(path.join(task, 'result.json'), 'utf8'));
        if (result.error) throw new ExtractionError('DOCUMENT_UNREADABLE_OR_LIMIT_EXCEEDED');
        return result.blocks;
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      await delay(500);
    }
    throw new ExtractionError('PARSER_UNAVAILABLE', 503);
  } finally { await rm(task, { recursive: true, force: true }); }
}
export async function parseIsolated(filename: string, kind: DocumentKind): Promise<Block[]> {
  const development = __filename.endsWith('.ts');
  const child = path.join(__dirname, development ? 'parser.child.ts' : 'parser.child.js');
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'xts-parse-'));
  try { return await new Promise<Block[]>((resolve, reject) => {
    execFile(process.execPath, [
      '--max-old-space-size=384', ...(development ? ['--import', 'tsx'] : []), child,
      filename, kind, String(env.extraction.maxPages), String(env.extraction.maxTextChars),
      env.extraction.libreOffice, env.extraction.ocrCommand, temporary,
    ], {
      timeout: env.extraction.parserTimeoutMs, maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      env: env.extraction.childEnv,
    }, (error, stdout) => {
      if (error) return reject(new ExtractionError('DOCUMENT_UNREADABLE_OR_LIMIT_EXCEEDED'));
      try { resolve(JSON.parse(stdout)); } catch { reject(new ExtractionError('DOCUMENT_UNREADABLE')); }
    });
  }); } finally { await rm(temporary, { recursive: true, force: true }); }
}

export function chunks(blocks: Block[], maxBytes = 2200): Block[][] {
  const result: Block[][] = [];
  let current: Block[] = [];
  const size = (value: Block[]) => Buffer.byteLength(JSON.stringify(value), 'utf8');
  for (const block of blocks.filter(block => block.kind !== 'coverage' && block.text.trim())) {
    if (size([block]) > maxBytes) throw new ExtractionError('DOCUMENT_BLOCK_TOO_LARGE');
    if (size([...current, block]) > maxBytes && current.length) {
      result.push(current);
      const overlap = current[current.length - 1];
      current = size([overlap, block]) <= maxBytes ? [overlap] : [];
    }
    current.push(block);
  }
  if (current.length) result.push(current);
  return result;
}

export function tokenChunks(blocks: Block[], instructions?: string | null): Block[][] {
  const tokens = (group: Block[]) => inputTokens(group, instructions);
  const budget = env.extraction.tokensPerMinute - completionBudget - 200;
  if (budget <= tokens([])) throw new ExtractionError('EXTRACTION_QUOTA_TOO_SMALL');
  const result: Block[][] = [];
  let current: Block[] = [];
  const source = blocks.filter(block => block.kind !== 'coverage' && block.text.trim());
  const bounded: Block[] = [];
  for (const block of source) {
    if (tokens([block]) <= budget) { bounded.push(block); continue; }
    // A long paragraph/table cell may exceed the entire request allowance. Split
    // only that block, retaining every character and its exact source position.
    let remaining = block.text, offset = 0, index = 0;
    while (remaining) {
      let low = 1, high = remaining.length, fitted = 0;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const part = { ...block, text: remaining.slice(0, middle) };
        if (tokens([part]) <= budget) { fitted = middle; low = middle + 1; }
        else high = middle - 1;
      }
      if (!fitted) throw new ExtractionError('EXTRACTION_QUOTA_TOO_SMALL');
      if (fitted < remaining.length && /[\uD800-\uDBFF]/.test(remaining[fitted - 1])) fitted--;
      if (!fitted) throw new ExtractionError('EXTRACTION_QUOTA_TOO_SMALL');
      const part = fitted < remaining.length ? splitSemanticText(remaining, Math.max(2, fitted))[0] : remaining;
      const segment = { ...block, id: `${block.id}.${++index}`, text: part,
        ...(block.sourceOrder !== undefined ? { sourceOrder: block.sourceOrder + offset } : {}),
        ...(offset ? { continuation: true } : {}) };
      if (tokens([segment]) > budget) throw new ExtractionError('EXTRACTION_QUOTA_TOO_SMALL');
      bounded.push(segment);
      remaining = remaining.slice(part.length); offset += part.length;
    }
  }
  for (const block of bounded) {
    if (current.length && tokens([...current, block]) > budget) {
      result.push(current);
      const last = current[current.length - 1];
      current = tokens([last, block]) <= budget ? [last] : [];
    }
    current.push(block);
  }
  if (current.length) result.push(current);
  return result;
}
