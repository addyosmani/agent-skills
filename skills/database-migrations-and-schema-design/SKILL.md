---
name: database-migrations-and-schema-design
description: Guides schema design and database migration execution. Use when creating or modifying database schemas, writing SQL/NoSQL migration scripts, optimizing slow queries, or designing zero-downtime database updates.
---

# Database Migrations and Schema Design

## Overview

A robust database schema and structured migration workflow prevent data corruption, application downtime, and performance degradation. As applications grow, direct modifications to database tables can lock tables, drop user data, or break active application instances. This skill details the process to design relational schemas, index strategically, and execute zero-downtime migrations.

## When to Use

- Creating new database tables, collections, or columns.
- Modifying existing schemas (renaming columns, changing data types, dropping constraints).
- Writing and structuring migration files (SQL DDL or NoSQL scripts).
- Optimizing slow queries by adding or adjusting database indexes.
- Preparing rollback plans for database releases.

**When NOT to Use:**
- Writing mock data seeds for local development.
- Simple client-side formatting changes of database outputs.

## Core Process

```
[Design & Constraints] ──> [Indexing Strategy] ──> [Write Migration & Rollback] ──> [Local Dry Run] ──> [Query Profiling]
```

### Step 1: Design Schema with Constraints

Enforce integrity at the database layer, not just in application code. Application code can bypass checks, but the database should not.

1. **Define Keys**: Every table must have a Primary Key. Use UUIDs (for distributed systems) or auto-incrementing bigints.
2. **Apply Constraints**: Use `NOT NULL` by default unless a column is explicitly optional. Use `UNIQUE` constraints to enforce business rules (e.g., unique emails).
3. **Use Foreign Keys**: Programmatically link related tables to guarantee referential integrity (`ON DELETE CASCADE` or `ON DELETE RESTRICT`).

### Step 2: Index Strategically

Indexes speed up reads but slow down writes (INSERT, UPDATE, DELETE) and consume disk/memory space.

1. **Index Foreign Keys**: Almost all foreign keys should be indexed, as they are frequently used in `JOIN` operations.
2. **Index Search Fields**: Index columns used in `WHERE`, `ORDER BY`, and `GROUP BY` clauses.
3. **Avoid Over-indexing**: Do not index columns with low cardinality (e.g., boolean flags like `is_active`).

*Good SQL Indexing:*
```sql
-- Indexing foreign key and query parameters
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status_created ON tasks(status, created_at);
```

### Step 3: Write Safe Migrations (Zero-Downtime)

To modify a database without downtime, use the **Expand-Contract Pattern**. Never rename or delete a column in a single step while the application is running.

#### Column Rename Workflow (Expand-Contract)
1. **Expand**: Add the new column to the database (nullable or with default).
2. **Dual-Write**: Deploy application code that reads from the old column but writes to *both* the old and new columns.
3. **Backfill**: Run a script to copy old data to the new column for existing rows.
4. **Switch**: Deploy application code that reads and writes *only* to the new column.
5. **Contract**: Deploy a migration to drop the old column from the database.

#### Avoid Table Locks on Large Tables
Adding a column with a default value, adding a NOT NULL constraint, or changing a data type on large tables (millions of rows) can lock the table and cause downtime.
- In PostgreSQL, adding a column with a default value is fast in modern versions, but adding a check constraint or modifying types still locks.
- Use tools like `gh-ost` or `pt-online-schema-change` for large MySQL tables, or safe DDL strategies in PostgreSQL (e.g., `ADD CONSTRAINT ... NOT VALID`, followed by `VALIDATE CONSTRAINT` asynchronously).

### Step 4: Implement Rollback Scripts

Every migration must have a matching rollback script (often called `Down` migration) to revert changes in case of deployment failure.

*Example Migration Structure (SQL):*
```sql
-- UP: Migrate database forward
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- DOWN: Rollback changes
ALTER TABLE tasks DROP COLUMN completed_at;
```

### Step 5: Verify and Profile Queries

Before deploying a schema change or a new query:

1. **Analyze query plans**: Use `EXPLAIN ANALYZE` (PostgreSQL/MySQL) to confirm queries use the indexes you created.
2. **Watch for Seq Scan (Sequential Scans)**: If a query on a large table performs a full table scan instead of an index scan, adjust your index design.

*Profiling Example:*
```sql
EXPLAIN ANALYZE SELECT * FROM tasks WHERE user_id = '123' AND status = 'pending';
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll index every column in the table to make sure all queries are fast." | Every index adds overhead to writes and updates. Over-indexing degrades database write performance and bloats storage. |
| "This is a quick rename, I can just do it in one migration during the night." | If the application is running, it will attempt to access the old column name and crash. The Expand-Contract pattern is mandatory for high-availability systems. |
| "I don't need database constraints if my backend application validates input." | Code bugs, manual database scripts, or direct SQL updates can bypass backend validation, corrupting the data. Database constraints are the final line of defense. |
| "I'll write the rollback script later when we need it." | If a release fails and you need to rollback, writing the script under pressure increases the risk of data loss. Always ship migrations and rollbacks together. |

## Red Flags

- Migration scripts that contain `DROP TABLE` or `DROP COLUMN` without a data backup and explicit approval.
- Modifying a column's data type directly on a production table containing millions of rows.
- Joins performed on columns that lack foreign key indexes.
- Database credentials or connection strings committed within migration files or code repositories.
- Lack of a `down` or rollback SQL script paired with a new `up` script.

## Verification

After creating a schema modification or migration:

- [ ] Every migration file has a corresponding rollback/down script.
- [ ] No data-loss commands (`DROP`, `TRUNCATE`) are included without a data migration safety plan.
- [ ] All foreign key columns have corresponding database indexes.
- [ ] Critical queries are validated with `EXPLAIN` to ensure they perform Index Scans, not Sequential Scans.
- [ ] Columns representing timestamps/dates include timezone awareness (e.g., `TIMESTAMP WITH TIME ZONE`).
- [ ] Table alterations on large tables are designed using the Expand-Contract pattern to prevent application downtime.
- [ ] Migration runs locally without errors and rolls back cleanly using the down script.
