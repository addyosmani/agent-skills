# Customer identifier migration

Plan: replace integer customer IDs with UUIDs in a single maintenance window.

1. Disable writes.
2. Run `ALTER TABLE customers DROP COLUMN id CASCADE`.
3. Add a UUID `id` column and populate it.
4. Re-enable writes after fifteen minutes.

Claims made by the author:

- All foreign keys will be recreated automatically.
- The table contains fewer than one million rows.
- The operation completes within the maintenance window.
- The backup from last night is sufficient rollback protection.
- No external systems persist the integer identifier.

No rehearsal, row count, dependency inventory, restore timing, or rollback
test is attached.
