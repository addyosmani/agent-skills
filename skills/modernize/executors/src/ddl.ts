// ddl.ts — Locate and load the canonical node-tree DDL.
// The schema in `schemas/task_store.sql` is the SINGLE source of truth; the store
// applies it verbatim (every statement is idempotent: IF NOT EXISTS). We never
// re-declare the schema in code — we read the same file the DDL doctrine lives in.

import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/** Walk up from `startDir` until `schemas/task_store.sql` is found (src/ or dist/ alike). */
export function findDdlPath(
  startDir: string = dirname(fileURLToPath(import.meta.url)),
): string {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'schemas', 'task_store.sql');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`task_store.sql not found walking up from ${startDir}`);
}

export function loadDdl(): string {
  return readFileSync(findDdlPath(), 'utf8');
}
