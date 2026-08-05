// presence.ts — Advisory liveness for the choreography spine.
//
// DOCTRINE (do not "improve" this into a lease/reaper): presence answers ONE
// question — "is this process pinging right now?" A live process refreshes its
// key with a short TTL; if it dies or hangs, the key lapses and the node reads as
// absent. That absence is the ONLY thing presence feeds: the decision of WHEN to
// raise an investigate flag (see watcher.ts). It NEVER reclaims, requeues, or
// terminates work. The durable truth is the SQLite node tree; this is a hint.

export interface PresenceStore {
  /** Refresh this node's presence; it lapses after ~ttlMs without another ping. */
  ping(nodeId: string, ttlMs: number): Promise<void>;
  isPresent(nodeId: string): Promise<boolean>;
  /** Explicit removal (e.g. a process clearing its own key on terminal). */
  clear(nodeId: string): Promise<void>;
  /** Batch presence test — one round trip for the watcher. */
  presentNodeIds(nodeIds: readonly string[]): Promise<Set<string>>;
  close(): Promise<void>;
}

/**
 * In-process presence with lazy TTL expiry. The injectable clock makes "node went
 * absent" deterministic in tests. Suitable for single-process runs and all testing;
 * cross-process runs use the Redis impl (presence-redis.ts).
 */
export class InMemoryPresenceStore implements PresenceStore {
  readonly #expiry = new Map<string, number>();
  readonly #now: () => number;

  constructor(now: () => number = Date.now) {
    this.#now = now;
  }

  async ping(nodeId: string, ttlMs: number): Promise<void> {
    this.#expiry.set(nodeId, this.#now() + Math.max(1, ttlMs));
  }

  async isPresent(nodeId: string): Promise<boolean> {
    return this.#alive(nodeId);
  }

  async clear(nodeId: string): Promise<void> {
    this.#expiry.delete(nodeId);
  }

  async presentNodeIds(nodeIds: readonly string[]): Promise<Set<string>> {
    const present = new Set<string>();
    for (const id of nodeIds) if (this.#alive(id)) present.add(id);
    return present;
  }

  async close(): Promise<void> {
    this.#expiry.clear();
  }

  #alive(nodeId: string): boolean {
    const exp = this.#expiry.get(nodeId);
    if (exp === undefined) return false;
    if (this.#now() >= exp) {
      this.#expiry.delete(nodeId);
      return false;
    }
    return true;
  }
}
