---
name: database
description: Database rules — PostgreSQL, fail-on-conflict instead of speculative concurrency handling, connection pooling, backward-compatible migrations with rollback, schema kept separate from code, DB schema and DB design document maintained for every persistent service, drawdb schema-as-code. Load whenever you create or alter a table, write a migration, add a query, set up a DB connection, or design a data model — even if the user only says "store this" or "add a column".
---

# Database

| ID | Rule |
| --- | --- |
| D1 | **PostgreSQL** (SQLite is not an option). |
| D2 | **Fail on conflict; do not build for hypothetical high concurrency.** Use a fail-on-conflict approach (unique constraints, optimistic checks) rather than locks, queues, or retry loops. |
| D3 | **Connection pooling.** |
| D4 | **Migrations, backward compatible for one release, with rollback.** `main` stays releasable: a migration must work with the previous release's code running. |
| D5 | **The schema lives separately from the code.** |
| D6 | **Database design docs:** maintain the DB schema and a DB design document whenever the service has a persistent database. Override: no persistence. |
| D7 | **Schema as code:** the DB schema diagram is a drawdb file next to `LLD.md`, committed and reviewed like code. |
| D8 | **Be deliberate about DB models** during planning; the HLD/LLD includes the DB schema. |
| D9 | Once the DB model and the API contracts are decided, backend services work concurrently. |
| D10 | DB model is separate from domain and API models; persistence models never leak into public APIs. |
| D11 | No sharding, caches, or read replicas without a current requirement recorded in `DECISIONS.md`. |

## Migration checklist

1. Additive first (new column nullable / with default, new table); switch code; then remove the old shape in a later release (D4).
2. Provide the rollback (D4).
3. If a migration genuinely cannot be sliced, say so on the ticket (`continuous-delivery` L8).
4. Update the drawdb schema file and the DB design document in the same PR (D6, D7).
5. Large-scale data migrations follow `deprecation-migration`.
