import 'dotenv/config';
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { parseIsolated } from './parser';
import { storagePath, storageRoot } from './storage';
import { uuidPattern } from './types';

// Runs in a separate container with network_mode: none and no DB/provider secrets.
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });
async function main() {
  while (!stopping) {
    try {
      const tasks = await readdir(storagePath('.parser'), { withFileTypes: true });
      for (const task of tasks) {
        if (!task.isDirectory() || !uuidPattern.test(task.name)) continue;
        const directory = storagePath(`.parser/${task.name}`);
        try {
          try { await readFile(path.join(directory, 'result.json')); continue; } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
          const request = JSON.parse(await readFile(path.join(directory, 'request.json'), 'utf8'));
          const relative = path.relative(storageRoot(), request.filename);
          if (!/^[0-9a-f-]{36}[\\/]original\.(pdf|docx|doc|txt)$/.test(relative) || !['pdf','docx','doc','txt'].includes(request.kind)) throw new Error('Invalid task');
          let result: unknown;
          try { result = { blocks: await parseIsolated(storagePath(relative), request.kind) }; }
          catch { result = { error: 'DOCUMENT_UNREADABLE_OR_LIMIT_EXCEEDED' }; }
          await writeFile(path.join(directory, 'result.tmp'), JSON.stringify(result), { mode: 0o600 });
          await rename(path.join(directory, 'result.tmp'), path.join(directory, 'result.json'));
        } catch { /* A cancelled/expired request may disappear while being processed. */ }
        if (stopping) break;
      }
    } catch { /* Storage may be initializing. Do not log document paths/content. */ }
    await delay(500);
  }
}
main().catch(() => { process.exitCode = 1; });
