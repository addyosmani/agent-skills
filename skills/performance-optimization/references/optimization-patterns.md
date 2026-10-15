# Optimization Patterns

Worked fixes for the anti-patterns named in Step 3 of the `performance-optimization` skill. The skill states the rule and the signature to look for; this file shows one concrete implementation. Open the section you need after Step 2 has identified the bottleneck — it is not meant to be read top to bottom.

Checklists, measurement commands, TTFB diagnosis, and caching read/write strategies live in `../../../references/performance-checklist.md`.

## N+1 Queries (Backend)

```typescript
// BAD: N+1 — one query per task for the owner
const tasks = await db.tasks.findMany();
for (const task of tasks) {
  task.owner = await db.users.findUnique({ where: { id: task.ownerId } });
}

// GOOD: Single query with join/include
const tasks = await db.tasks.findMany({
  include: { owner: true },
});
```

## Unbounded Data Fetching

```typescript
// BAD: Fetching all records
const allTasks = await db.tasks.findMany();

// GOOD: Paginated with limits
const tasks = await db.tasks.findMany({
  take: 20,
  skip: (page - 1) * 20,
  orderBy: { createdAt: 'desc' },
});
```

## Queries That Ignore Their Index

"Add an index" is the guess. The query plan is the measurement:

```sql
EXPLAIN ANALYZE
SELECT id, title FROM tasks
WHERE owner_id = 42 ORDER BY created_at DESC LIMIT 20;
```

Three things in the output decide the fix:

| What you see | What it means |
|---|---|
| `Seq Scan` on a large table where you expected an index | No usable index for this predicate |
| Estimated `rows=` off from actual by an order of magnitude | Stale statistics; the planner is choosing on bad information |
| A `Sort` node above the scan | The index covers the filter but not the `ORDER BY` |

Index for the **shape of the query**, not the column in isolation. In a composite index, equality columns come first, then the range or sort column:

```sql
CREATE INDEX idx_tasks_owner_created ON tasks (owner_id, created_at DESC);
```

**When an index will not help:**

| Situation | Why |
|---|---|
| Low selectivity, querying the dominant value (a `status` column that is 95% `active`, filtered on `active`) | A sequential scan is genuinely cheaper; the planner will ignore the index. Filtering on the rare value is the opposite case, and a partial index serves it well |
| Leading wildcard (`LIKE '%term'`) | A B-tree cannot seek without a prefix; needs trigram or full-text |
| Function on the column (`WHERE lower(email) = ?`) | The plain column index is unusable; index the expression instead |
| Write-heavy table | Every index is a tax on every `INSERT`/`UPDATE`; measure the write cost, not just the read gain |

Re-run `EXPLAIN ANALYZE` after. An index that did not change the plan is a revert (Step 4), and it is not free: it still costs on every write.

## Connection Pool Exhaustion

The signature is distinctive: **every** endpoint slows at once, the slow time is spent waiting for a connection rather than executing, and the database reports mostly idle sessions.

```typescript
// BAD: a pool per request or per module — under serverless this multiplies
// by instance count and exhausts the database's connection limit
// GOOD: one pool per process, sized against the database's ceiling
const pool = new Pool({
  max: 10,                        // instances × max must stay under max_connections
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000, // fail fast instead of queueing forever
});
```

**Bigger is not faster.** A pool larger than what the database can execute concurrently just relocates the queue from your app to the database, where it is harder to see. When instance count is unbounded (serverless, autoscaling), a proxy that multiplexes connections (pgbouncer, RDS Proxy) is the fix, not a higher `max`.

## Missing Image Optimization (Frontend)

```html
<!-- BAD: No dimensions, no format optimization -->
<img src="/hero.jpg" />

<!-- GOOD: Hero / LCP image — art direction + resolution switching, high priority -->
<!--
  Two techniques combined:
  - Art direction (media): different crop/composition per breakpoint
  - Resolution switching (srcset + sizes): right file size per screen density
-->
<picture>
  <!-- Mobile: portrait crop (8:10) -->
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.avif 400w, /hero-mobile-800.avif 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/avif"
  />
  <source
    media="(max-width: 767px)"
    srcset="/hero-mobile-400.webp 400w, /hero-mobile-800.webp 800w"
    sizes="100vw"
    width="800"
    height="1000"
    type="image/webp"
  />
  <!-- Desktop: landscape crop (2:1) -->
  <source
    srcset="/hero-800.avif 800w, /hero-1200.avif 1200w, /hero-1600.avif 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/avif"
  />
  <source
    srcset="/hero-800.webp 800w, /hero-1200.webp 1200w, /hero-1600.webp 1600w"
    sizes="(max-width: 1200px) 100vw, 1200px"
    width="1200"
    height="600"
    type="image/webp"
  />
  <img
    src="/hero-desktop.jpg"
    width="1200"
    height="600"
    fetchpriority="high"
    alt="Hero image description"
  />
</picture>

<!-- GOOD: Below-the-fold image — lazy loaded + async decoding -->
<img
  src="/content.webp"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
  alt="Content image description"
/>
```

## Unnecessary Re-renders (React)

```tsx
// BAD: Creates new object on every render, causing children to re-render
function TaskList() {
  return <TaskFilters options={{ sortBy: 'date', order: 'desc' }} />;
}

// GOOD: Stable reference
const DEFAULT_OPTIONS = { sortBy: 'date', order: 'desc' } as const;
function TaskList() {
  return <TaskFilters options={DEFAULT_OPTIONS} />;
}

// Use React.memo for expensive components
const TaskItem = React.memo(function TaskItem({ task }: Props) {
  return <div>{/* expensive render */}</div>;
});

// Use useMemo for expensive computations
function TaskStats({ tasks }: Props) {
  const stats = useMemo(() => calculateStats(tasks), [tasks]);
  return <div>{stats.completed} / {stats.total}</div>;
}
```

## Large Bundle Size

```typescript
// Modern bundlers (Vite, webpack 5+) handle named imports with tree-shaking automatically,
// provided the dependency ships ESM and is marked `sideEffects: false` in package.json.
// Profile before changing import styles — the real gains come from splitting and lazy loading.

// GOOD: Dynamic import for heavy, rarely-used features
const ChartLibrary = lazy(() => import('./ChartLibrary'));

// GOOD: Route-level code splitting wrapped in Suspense
const SettingsPage = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <SettingsPage />
    </Suspense>
  );
}
```

## Missing Caching (Backend)

Cache what is expensive to produce and read far more often than it changes. Caching a query that was already fast adds a network hop, a staleness bug, and an eviction policy to maintain, in exchange for nothing.

**Pick the layer deliberately:**

| Layer | Visible to | Use when | Cost |
|---|---|---|---|
| In-process (`Map`, LRU) | One instance | Small, hot, per-instance staleness is acceptable | Each instance drifts independently; invalidation reaches only one |
| Shared (Redis, Memcached) | All instances | Instances must agree, or the value is expensive to recompute | A network hop, and another service to run and monitor |
| CDN / edge | Everyone, per URL | Responses are public and identical for a given key | Invalidation is the hard part; assume you cannot recall a bad response quickly |

```typescript
// Cache frequently-read, rarely-changed data
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedConfig: AppConfig | null = null;
let cacheExpiry = 0;

async function getAppConfig(): Promise<AppConfig> {
  if (cachedConfig && Date.now() < cacheExpiry) {
    return cachedConfig;
  }
  cachedConfig = await db.config.findFirst();
  cacheExpiry = Date.now() + CACHE_TTL;
  return cachedConfig;
}

// HTTP caching headers for static assets
app.use('/static', express.static('public', {
  maxAge: '1y',           // Cache for 1 year
  immutable: true,        // Never revalidate (use content hashing in filenames)
}));

// Cache-Control for API responses
res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
```

**Key design decides correctness.** Every input that changes the response belongs in the key: tenant, locale, permissions, feature flags. A key that omits the viewer is how one user's data gets served to another, and that ships as a performance win.

**Choose one invalidation strategy, not three:**

| Strategy | Trade-off |
|---|---|
| TTL | Simplest. You accept staleness up to the TTL, so state the acceptable window explicitly |
| Event or tag based | Fresh on write, but writers now have to know the cache topology |
| Versioned keys (`user:42:profile:v7`) | Never invalidate, just stop reading old keys. Costs memory until eviction |

**Guard against the stampede.** A hot key expires, every concurrent request misses together, and the origin takes the full load at once, which is how a cache turns into an outage instead of preventing one. Serve stale while a single request recomputes (`stale-while-revalidate`), or coalesce concurrent misses behind one in-flight promise so N waiters cause one recompute.

**Do not cache:** anything whose staleness is a correctness bug (balances, permissions, inventory at checkout), or per-user data under a key that does not identify the user. See `../../../references/performance-checklist.md#caching-strategies` for request coalescing, write strategies, negative caching, and the cache checklist.
