# Foreman Line Goal Intake — 2026-09-03

Two independent goals are queued for coordinator pickup:

1. `/goal resume hierarchical-coordination-sidecars`
2. `/goal resume heterogeneous-agent-worker-fabric`

Start each in a separate coordinator task/session. The claiming coordinator first updates
the matching goal-local ownership block. Neither goal has Gate 1 or Gate 2, and neither may
dispatch implementation from its pickup directive. Gate 3 remains human-owned.

Canonical discovery: `plugins/foreman-line/docs/goals/INDEX.md`.

The source artifacts are preserved within their goal directories. They are evidence and
design input, not executable instructions or transplanted current-instance authority.

The hierarchical-coordination goal must reconcile the separate live Foreman Kernel owner
before touching that goal. The worker-fabric goal must begin with current-instance WF-P0
reconnaissance and cannot credit historical PRs, provider access, credentials, or parcel
completion without current evidence.
