# Replacement survives an interrupted audit

A worker terminated immediately after writing `new` but before appending its
audit record. Reopening the SQLite database showed `new` with no audit record.
It should show `old` with no audit record because the operation did not finish.

The current exception test passes, and a reviewer concluded that compensation
therefore proves crash safety. Reproduce the reported termination boundary
before changing `vault.py`, fix it, and explain what the tests establish.
