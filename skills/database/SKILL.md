---
name: database
description: Database rules — PostgreSQL, fail-on-conflict instead of speculative concurrency handling, connection pooling, backward-compatible migrations with rollback, schema kept separate from code, DB schema and DB design document maintained for every persistent service, drawdb schema-as-code. Use when you create or alter a table, write a migration, add a query, set up a DB connection, or design a data model — even if the user only says "store this" or "add a column".
category: coding
---

# Database

## Overview

The rules for every persistent store in the project, each with an ID (D1–D11) that designs and reviews point at. The migration checklist is the process a schema change follows.

## When to Use

- Creating or altering a table, writing a migration, adding a query, setting up a DB connection, or designing a data model — even if the user only says "store this" or "add a column".
- Writing the data model section of an LLD.
- NOT for the domain model itself (`domain-modeling`) or for replacing a live flow end to end (`deprecation-and-migration`).

## Rules

| ID | Rule |
| --- | --- |
| D1 | **PostgreSQL**. |
| D2 | **Fail on conflict; do not build for hypothetical high concurrency.** Use a fail-on-conflict approach (unique constraints, optimistic checks) rather than locks, queues, or retry loops. |
| D3 | **Connection pooling.** |
| D4 | **Migrations, backward compatible for one release, with rollback.** `main` stays releasable: a migration must work with the previous release's code running. |
| D5 | **The schema lives separately from the code.** |
| D6 | **Database design docs:** maintain the DB schema and a DB design document whenever the service has a persistent database. Override: no persistence. |
| D7 | **Schema as code:** the DB schema diagram is a drawdb file next to `LLD.md`, committed and reviewed like code. |
| D8 | **Be deliberate about DB models** during planning; the HLD/LLD includes the DB schema. |
| D9 | Once the DB model and the API contracts are decided, backend services work concurrently. |
| D10 | DB model is separate from domain and API models; persistence models never leak into public APIs. |
| D11 | No sharding, caches, or read replicas without a current requirement recorded in an ADR. |

## Migration checklist

1. Additive first (new column nullable / with default, new table); switch code; then remove the old shape in a later release (D4).
2. Provide the rollback (D4).
3. If a migration genuinely cannot be sliced, say so on the ticket.
4. Update the drawdb schema file and the DB design document in the same PR (D6, D7).
5. Large-scale data migrations follow `deprecation-and-migration`.

## Interaction with other skills

- `lld` holds the data model section these rules shape; `domain-modeling` owns the domain model the persistence model is translated from.
- `deprecation-and-migration` runs a large-scale data migration; `continuous-delivery` is where an unsliceable migration is declared; `adrs` records the requirement behind any scale infrastructure.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Two writers might collide, add a lock or a retry loop." | Fail on conflict with a unique constraint or an optimistic check; do not build for hypothetical high concurrency (D2). |
| "We can add the migration rollback later." | A migration without rollback is a one-way door nobody approved (D4). |
| "Drop the old column in the same release, it's cleaner." | The previous release's code must still run against the migrated schema. Additive first, remove later (D4). |
| "The ORM models are the schema." | The schema lives separately from the code (D5). |
| "The schema diagram can be drawn later, or lives in a wiki." | It is a drawdb file next to `LLD.md`, committed and reviewed like code, updated in the same PR (D6, D7). |
| "Return the row as the API response, it's the same shape." | Persistence models never leak into public APIs (D10). |
| "We'll need a cache or a read replica eventually, add it now." | Not without a current requirement recorded in an ADR (D11). |

## Red Flags

- A lock, queue, or retry loop where a unique constraint or an optimistic check would fail on conflict (D2).
- A connection opened per request instead of taken from a pool (D3).
- A migration without a rollback, or one the previous release's code cannot run against (D4).
- A persistent service with no drawdb schema file or DB design document, or a schema change in a PR that leaves them untouched (D6, D7).
- A DB schema decided during implementation instead of in the HLD/LLD (D8).
- A persistence model in a public API response (D10).
- Sharding, a cache, or a read replica with no ADR (D11).

## Verification

- [ ] The store is PostgreSQL and connections are pooled (D1, D3).
- [ ] Conflicts fail through unique constraints or optimistic checks; no locks, queues, or retry loops were added (D2).
- [ ] The migration is additive first, works with the previous release's code running, and has a rollback (D4); if it cannot be sliced, the ticket says so.
- [ ] The schema lives separately from the code (D5).
- [ ] The drawdb schema file and the DB design document are updated in the same PR (D6, D7).
- [ ] The DB schema is in the HLD/LLD and the DB model is separate from the domain and API models (D8, D10).
- [ ] Any sharding, cache, or read replica has a current requirement recorded in an ADR (D11).
