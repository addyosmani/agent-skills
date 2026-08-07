---
name: database-design-and-migrations
description: Guides solid relational (and pragmatic document) data modeling plus safe schema migrations. Use when designing tables, indexes, constraints, or writing/reviewing migrations that must be reversible, zero/low-downtime, and production-safe.
---

# Database Design and Migrations

## Overview

Schema is long-lived product surface. Bad models create permanent pain; bad migrations create outages. Design for integrity and query patterns first, then evolve with explicit, reviewable, preferably reversible migrations.

## When to Use

- Designing new tables, relationships, or indexes
- Writing or reviewing schema migrations
- Changing nullability, types, or constraints on live data
- Modeling multi-tenant or soft-delete data
- Choosing between normalization and controlled denormalization

**Not for:** pure ORM API trivia, or caching layers (those are separate concerns).

## Core Principles

### 1. Model the domain, not the UI

Tables should reflect durable entities and invariants. Do not create a column for every form field without a clear ownership and lifecycle story.

### 2. Integrity belongs in the database

- Primary keys, foreign keys, unique constraints, and check constraints enforce rules the app will eventually forget.
- Prefer DB constraints over "we validate in the service" for anything that must never be wrong.

### 3. Indexes follow access patterns

- Add indexes for real queries (filters, joins, order + limit).
- Avoid speculative indexes that slow writes and bloat storage.
- Composite indexes should match left-prefix usage.

### 4. Migrations are production code

- Every migration is reviewed like application code.
- Prefer expand → migrate data → contract over in-place destructive changes.
- Avoid long locks on hot tables; use batched backfills when needed.

### 5. Reversibility is a design goal

- Forward migration must have a tested rollback path when practical.
- When rollback is impossible (destructive data removal), document the decision and the recovery plan.

### 6. Explicit nullability and defaults

- Nullable columns need a semantic reason.
- Defaults should be intentional, not accidents of the ORM.

## Safe Migration Patterns

**Additive (usually safe):** new nullable column, new table, new index created concurrently where supported.

**Expand/contract:**
1. Add new column/table.
2. Dual-write or backfill.
3. Switch reads.
4. Remove old column in a later migration.

**Dangerous (need a plan):** drop column, change type, add non-null without default, rewrite large tables, add FK on huge existing data without validation strategy.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll enforce uniqueness in the app" | Race conditions will create duplicates. Use a unique constraint. |
| "Just add the column as NOT NULL" | On large tables this can lock or fail. Expand/contract instead. |
| "Migrations don't need tests" | A broken migration takes production down. Dry-run and stage them. |
| "We'll clean up the old column later" | Later rarely comes. Schedule the contract step. |

## Red Flags

- Migrations that drop data without a backup/rollback story
- Missing foreign keys "for flexibility"
- Indexes added with no measured query need
- Non-null columns added to populated tables without a default or backfill plan
- Business rules only in application code that the DB cannot enforce

## Verification

- [ ] Constraints match stated invariants
- [ ] Indexes map to known queries
- [ ] Migration is expand/contract or otherwise low-lock
- [ ] Rollback path exists or intentional irreversibility is documented
- [ ] Staged/dry-run on production-like data when risk is high
- [ ] Nullability and defaults are deliberate
