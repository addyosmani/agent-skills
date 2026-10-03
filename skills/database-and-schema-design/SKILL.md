---
name: database-and-schema-design
description: Designs database schemas, expand/contract migrations, constraints, and query-shaped indexes for new or changing tables. Use when modeling entities, writing schema migrations, renaming columns without downtime, adding foreign keys or CHECK constraints, or reviewing data-layer correctness before a schema change ships.
---

# Database and Schema Design

## Overview

Schema is the hardest layer to undo. A bad column, missing constraint, or irreversible migration outlives the code that introduced it. This skill makes data modeling, migration discipline, indexing, and constraints explicit workflows — so agents stop treating the database as an afterthought to the API.

**Boundary with sibling skills:**
- Query tuning, N+1 fixes, and EXPLAIN analysis → `performance-optimization`
- System/API sunset and consumer migration → `deprecation-and-migration`
- API shape informed by the schema → `api-and-interface-design` (design the schema here first)

## When to Use

- Designing or changing tables, columns, relationships, or enums
- Writing or reviewing database migrations
- Adding or changing indexes and constraints
- Choosing normalization vs intentional denormalization
- Expanding/contracting a live schema without downtime

**When NOT to use:** Pure query-performance work with no schema change (use `performance-optimization`). Pure API deprecation with no data-shape change (use `deprecation-and-migration`).

## Process

```
1. MODEL     → Entities, relationships, ownership, cardinality
2. CONSTRAIN → Encode invariants in the database, not only in app code
3. MIGRATE   → Expand → backfill → contract; every step reversible
4. INDEX     → From real query shapes, not speculation
5. VERIFY    → Up + down against realistic data; old and new code both valid
```

### Step 1: Model

Before writing SQL or an ORM model, answer:

1. **What are the entities and who owns each row?** (user, team, tenant)
2. **What are the relationships and cardinalities?** (1:1, 1:N, M:N — M:N needs a join table)
3. **What is the source of truth for each fact?** (avoid dual-write of the same fact into two tables without a clear owner)
4. **What identifiers are public vs internal?** (never expose auto-increment IDs as public API if you can use opaque IDs)
5. **What soft-deletes, audit fields, or temporal needs exist?** (decide now; bolting them on later is a migration)

Prefer a short entity sketch over jumping straight to columns:

```
Order (id, customer_id, status, currency, created_at)
  1:N OrderLine (id, order_id, sku, qty, unit_price)
  status ∈ {draft, paid, cancelled, refunded}
  money stored as integer minor units + currency code
```

### Step 2: Constrain for Correctness

Application validation is necessary but not sufficient. Encode invariants the database can enforce:

| Invariant | Mechanism |
|-----------|-----------|
| Required fields | `NOT NULL` |
| Unique business keys | `UNIQUE` (including composite) |
| Referential integrity | `FOREIGN KEY` with explicit `ON DELETE` |
| Allowed values | `CHECK` or enum type |
| Multi-column rules | `CHECK` (e.g. `ended_at IS NULL OR ended_at >= started_at`) |

**Rules:**
- **Foreign keys are not optional** for relationships the app depends on. Missing FKs are how orphans appear.
- **Decide `ON DELETE` explicitly** (`RESTRICT`, `CASCADE`, `SET NULL`) — the default is rarely what you meant.
- **Store money as integer minor units + currency**, never floating point.
- **Timestamps are timezone-aware** (`timestamptz` or equivalent). Naive timestamps cause production incidents.
- **Nullable means "unknown or not applicable."** Don't use NULL as a fourth boolean state if you can use a real enum.

### Step 3: Migrate with Expand / Contract

Never change a column in place on a live system. During rollout, old and new code often run together — an in-place rename or drop breaks one of them.

```
EXPAND ──────────────→ BACKFILL / DUAL-WRITE ──────────────→ CONTRACT
add new shape,         populate it, keep old               once nothing
nullable/additive,     and new both valid                  reads the old
alongside the old                                          shape, drop it
```

**Worked example — rename `name` → `full_name`:**

1. **Expand.** Add nullable `full_name`. Deploy. (Old code ignores it.)
2. **Dual-write.** App writes both columns. Deploy.
3. **Backfill.** Copy existing rows in throttled batches (no table-wide lock).
4. **Switch reads.** Read `full_name`, keep dual-writing. Deploy and bake.
5. **Contract.** Stop writing `name`, then — in a *later, separate* deploy — drop it.

**Migration rules:**
- **Additive first, destructive last and alone.** Adds ship anytime; drops/renames get their own deploy after zero references.
- **Every migration has a tested `down`.** A migration you cannot reverse is a deploy you cannot roll back. Write and run the down path before merging.
- **Backfill in batches, off the hot path.** Chunk and throttle; never one giant `UPDATE` over millions of rows.
- **Build large indexes without blocking writes** (e.g. Postgres `CREATE INDEX CONCURRENTLY`).
- **Migrations are code review artifacts.** Review the SQL (or generated SQL), not just the ORM DSL.
- Treat each phase as a thin vertical slice — see `incremental-implementation`.

For consumer/API sunset strategy around a schema change, also follow `deprecation-and-migration`.

### Step 4: Index from Query Shapes

Indexes are not free — each one slows writes and uses space. Add them from evidence:

1. List the queries that will hit this table (from the feature, not from imagination).
2. For each frequent filter/join/order, decide whether an index is justified.
3. Prefer composite indexes whose **leftmost columns** match the query's equality filters.
4. Index foreign-key columns used in joins (many ORMs do not do this automatically).
5. Skip speculative indexes "in case we need them."

**When an index will not help:** low-selectivity columns alone (booleans, low-cardinality status), leading-wildcard `LIKE '%x'`, or tables small enough that sequential scans are fine.

After a missing-index incident in production, fix the schema here, then tune the query path with `performance-optimization`.

### Step 5: Verify Before Merge

Run every schema change against a database that looks like production (volume order-of-magnitude, realistic NULLs, duplicate-prone data):

```
1. Apply the up migration on a realistic dump or seed
2. Run the application test suite against the new schema
3. Apply the down migration; confirm it succeeds and leaves a coherent schema
4. Re-apply the up migration (proves the cycle is stable)
5. If expand/contract: confirm old and new application code both work at the expand stage
```

## Common Patterns

### Soft deletes

If you soft-delete, make it consistent: `deleted_at`, partial unique indexes that ignore deleted rows, and every query explicitly chooses whether to include them. Half-adopted soft deletes are worse than hard deletes.

### Multi-tenant data

Tenant ID on every tenant-owned table, enforced in constraints and in the default query path. Missing tenant predicates are data leaks — treat them as security defects (`security-and-hardening`).

### Enums and status fields

Prefer database enums or `CHECK` constraints for statuses the app branches on. Stringly-typed status columns drift (`"cancelled"` vs `"canceled"`) without a constraint.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The ORM will handle migrations" | ORMs generate SQL; they do not design expand/contract, backfills, or rollback strategy. Review the SQL. |
| "We'll add the foreign key later" | Orphans appear immediately. Add the FK when the relationship is created. |
| "Just rename the column, it's one line" | During rollout, old and new code run together — one will query a missing column. Expand/contract. |
| "I'll add and drop in the same migration" | That couples a safe add to a destructive drop. Drops ship alone, after zero references. |
| "We'll write the rollback if we need it" | A migration with no down path is a deploy you cannot reverse. Write and run `down` before merging. |
| "Index every column we filter on" | Speculative indexes tax every write. Index from measured or designed query shapes. |
| "Constraints belong in application code" | App code is bypassed by scripts, jobs, and future bugs. Encode invariants in the database too. |
| "NULL is fine for now" | Nullable columns change query semantics forever. Decide nullability deliberately. |

## Red Flags

- Schema change and the code that depends on it shipping in the same irreversible deploy
- Column renamed or dropped in place rather than via expand/contract
- Migration merged with no tested down path
- Backfill that locks a hot table
- Relationship without a foreign key
- Money stored as float / double
- Timestamps without timezone
- Indexes added "just in case" with no query shape
- Soft-delete column that most queries forget to filter
- Multi-tenant table without a tenant predicate in the default access path

## Verification

After any schema or migration work:

- [ ] Entities, relationships, and ownership are explicit (sketch or equivalent)
- [ ] Invariants are enforced with constraints (`NOT NULL`, `UNIQUE`, `FK`, `CHECK`) where the database can uphold them
- [ ] Migration is additive-first; destructive steps are isolated and deferred until zero references
- [ ] `up` and `down` both run successfully against realistic data
- [ ] At the expand stage, old and new application code remain valid against the schema
- [ ] Indexes map to real query shapes; foreign keys used in joins are indexed
- [ ] No float money, no timezone-naive timestamps, no silent orphan relationships
- [ ] Query-only performance follow-ups are handed to `performance-optimization`, not stuffed into the migration
