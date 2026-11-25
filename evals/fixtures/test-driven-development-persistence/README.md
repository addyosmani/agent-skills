# Audited secret replacement

This Python/SQLite project has no dependencies beyond the standard library.

Run the full suite with `python3 -m unittest`.

`replace_secret` must persist a replacement and its matching audit record
together. After a failed operation, reopening the database must show the old
value and no new audit record. A successful operation must persist both.
The `after_write` callback is a fault-injection boundary after the secret write
and before the audit write; keep it there when fixing the implementation.
