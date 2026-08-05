// ids.ts — Stable identifiers. ULID: time-sortable, monotonic, collision-free.
// Schema recommends UUIDv7/ULID for run_id/node id; ULID gives lexical ordering
// that mirrors creation order, which is handy when scanning a tree.

import { ulid } from 'ulid';

export function newId(): string {
  return ulid();
}
