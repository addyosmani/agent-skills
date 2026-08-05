// watcher.ts — The primary's observation pass over the choreography tree.
//
// DOCTRINE: watcher OBSERVES. It surfaces investigate flags and nothing else —
// no reap, no requeue, no terminal mutation. Resolving a flag is a human/primary
// judgment, performed by the owning process writing its own terminal row.
//
// Investigate signal = durable(status='started') ∩ ephemeral(presence absent).
// The store owns the durable half (investigateCandidates); presence owns the other.

import type { TaskStore } from './task-store.js';
import type { PresenceStore } from './presence.js';
import type { InvestigateRow } from './types.js';

export interface InvestigateFlag {
  node: InvestigateRow;
  reason: 'presence_absent';
  /** started_at of the silent node — how long it's been quiet is the operator's cue. */
  since: string | null;
}

export class Watcher {
  readonly #store: TaskStore;
  readonly #presence: PresenceStore;

  constructor(store: TaskStore, presence: PresenceStore) {
    this.#store = store;
    this.#presence = presence;
  }

  /**
   * One observation pass. Returns nodes still 'started' (durable) whose advisory
   * presence is absent (ephemeral). Surfaces only — never mutates the tree.
   */
  async tick(runId?: string): Promise<InvestigateFlag[]> {
    const candidates = this.#store.investigateCandidates(runId);
    if (candidates.length === 0) return [];
    const present = await this.#presence.presentNodeIds(candidates.map((c) => c.id));
    return candidates
      .filter((c) => !present.has(c.id))
      .map((c) => ({ node: c, reason: 'presence_absent' as const, since: c.started_at }));
  }
}

export interface WatchLoopHandle {
  stop(): void;
}

export interface WatchLoopOptions {
  runId?: string;
  intervalMs: number;
  onFlags: (flags: InvestigateFlag[]) => void;
  onError?: (err: unknown) => void;
}

/**
 * Thin, cancelable runner around tick(). Chains via setTimeout (not setInterval) so
 * a slow tick never overlaps the next. Errors are reported and the loop continues —
 * a watcher that dies on one bad tick is worse than one that keeps watching.
 */
export function startWatchLoop(watcher: Watcher, opts: WatchLoopOptions): WatchLoopHandle {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const run = async (): Promise<void> => {
    if (stopped) return;
    try {
      const flags = await watcher.tick(opts.runId);
      if (!stopped) opts.onFlags(flags);
    } catch (err) {
      opts.onError?.(err);
    }
    if (!stopped) timer = setTimeout(run, opts.intervalMs);
  };

  timer = setTimeout(run, opts.intervalMs);
  return {
    stop(): void {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}
