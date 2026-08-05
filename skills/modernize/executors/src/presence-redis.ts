// presence-redis.ts — Cross-process advisory presence backed by Redis.
//
// Redis is an OPTIONAL dependency. To keep the package importable (and typecheck
// green) without it, ioredis is loaded via a non-literal dynamic import — it only
// resolves when you actually construct this store. Install `ioredis` for prod runs.
//
// Same doctrine as presence.ts: this is advisory only. The Redis key TTL is the
// natural lapse mechanism (a live process re-SETs with PX; a dead one lets it
// expire). It is NOT a work lease — nothing here reclaims or requeues a node.

import type { PresenceStore } from './presence.js';

export interface RedisPresenceOptions {
  /** Connection string, e.g. redis://127.0.0.1:6379. Ignored if `client` is given. */
  url?: string;
  /** Key namespace. */
  keyPrefix?: string;
  /** Inject a preconfigured ioredis client (e.g. a shared one); we won't close it. */
  client?: unknown;
}

export async function createRedisPresenceStore(
  opts: RedisPresenceOptions = {},
): Promise<PresenceStore> {
  const moduleName = 'ioredis';
  // Non-literal specifier: not statically resolved, so no hard dependency at build.
  const mod: any = await import(moduleName);
  const Redis = mod.default ?? mod;
  const owns = !opts.client;
  const client: any = opts.client ?? new Redis(opts.url ?? 'redis://127.0.0.1:6379');
  const prefix = opts.keyPrefix ?? 'modernize:presence:';
  const key = (id: string): string => prefix + id;

  return {
    async ping(nodeId: string, ttlMs: number): Promise<void> {
      await client.set(key(nodeId), '1', 'PX', Math.max(1, Math.floor(ttlMs)));
    },
    async isPresent(nodeId: string): Promise<boolean> {
      return (await client.exists(key(nodeId))) === 1;
    },
    async clear(nodeId: string): Promise<void> {
      await client.del(key(nodeId));
    },
    async presentNodeIds(nodeIds: readonly string[]): Promise<Set<string>> {
      if (nodeIds.length === 0) return new Set<string>();
      const pipe = client.pipeline();
      for (const id of nodeIds) pipe.exists(key(id));
      const res: Array<[unknown, unknown]> = await pipe.exec();
      const present = new Set<string>();
      nodeIds.forEach((id, i) => {
        const row = res?.[i];
        if (row && !row[0] && row[1] === 1) present.add(id);
      });
      return present;
    },
    async close(): Promise<void> {
      if (owns) await client.quit();
    },
  };
}
