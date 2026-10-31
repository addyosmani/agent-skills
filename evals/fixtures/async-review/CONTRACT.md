# Asynchronous evidence review

Review `before.py` against the requested candidate. These are supplied snapshots,
not an external service. Work read-only.

- A proof belongs to a run revision: `(id, head, suite, attempt, updated)`.
  Refreshing any revision field invalidates cached results. Refreshing the same
  revision preserves them. A changed attempt can retain the same commit head.
- Cleanup sends a group stop, reaps the leader, and confirms that no live group
  members remain. A reaped leader does not prove that its children exited.
  Return false if reaping fails or live members remain; the caller must then
  stop before diagnostics. Callbacks model this boundary without real processes.
- Staging requires a successful producer, a complete marker, exactly the expected
  coverage parts, and nonempty contents for every part. A failed producer can
  leave a nonempty partial report for diagnostics; it must not become release
  evidence. A complete successful report must remain accepted.

Inputs have the keys shown in the snapshots: producer `conclusion`, Boolean
`complete`, and a `parts` map. Expected part names are a nonempty set. Malformed
input handling is outside this change.

`oracle.py SNAPSHOT` checks these contracts without changing the snapshot. It is
an executable fixture oracle, not a measured evaluation of model behavior. Report
actual commands and results separately from static review. Do not infer real
process cleanup or hosted-service behavior from these callback simulations.
