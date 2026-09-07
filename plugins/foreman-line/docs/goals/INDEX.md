# Foreman Line Goal Index

This file is a discovery projection. Each goal's `charter.md` and `loop-directive.md`
remain authoritative for status, ownership, gates, and next action. Never infer authority
from an index row.

## Coordinator pickup queue

| Goal | State | Entry | Current authority |
|---|---|---|---|
| [hierarchical-coordination-sidecars](hierarchical-coordination-sidecars/charter.md) | `awaiting_coordinator_claim` | `/goal resume hierarchical-coordination-sidecars` | Goal intake requested; Gate 1/2 absent; Gate 3 human |
| [heterogeneous-agent-worker-fabric](heterogeneous-agent-worker-fabric/charter.md) | `awaiting_coordinator_claim` | `/goal resume heterogeneous-agent-worker-fabric` | Completion requested; Gate 1/2 absent; default-route Gate 3 human |

## Active goals awaiting a human gate

| Goal | Owner | State | Current authority |
|---|---|---|---|
| [governed-model-fleet](governed-model-fleet/charter.md) | `/root` | `gmf_p0_shaped_awaiting_gate_2` | D1–D24 plus A1/P0–P9 ratified; P0 draft linted; Gate 2 and external effects absent |

## Frozen or stopped goals

| Goal | State | Current authority |
|---|---|---|
| [model-fleet-v1](model-fleet-v1/charter.md) | `stopped_at_mf_p0_no_go` | Frozen predecessor evidence; MF-P1–MF-P4 not dispatched; no active implementation authority |

These are separate goals and require separate owning coordinators. A coordinator may own
only one of these queues at a time unless a future ratified hierarchy explicitly permits a
subordinate arrangement. Shared serialization points are sequenced, never co-owned.

## Existing goal directories

The following goal records predate this index. Read their charter and loop directive, when
present, rather than projecting status from their directory name:

- `foreman-kernel` (present in a separate active goal worktree at intake time, not on this
  branch's base);
- [keon-full-platform-gtm-readiness](keon-full-platform-gtm-readiness/charter.md);
- [keon-proof-led-portfolio-priority](keon-proof-led-portfolio-priority/charter.md);
- [permission-profile-registry](permission-profile-registry/charter.md);
- [plugin-packaging-and-scaffolder](plugin-packaging-and-scaffolder/charter.md);
- [w1-intake-registration](w1-intake-registration/charter.md);
- [w2-dispatch](w2-dispatch/charter.md);
- [w3-verification](w3-verification/charter.md);
- [w4-ci-integration](w4-ci-integration/charter.md); and
- [w4-closeout](w4-closeout/charter.md).

## Update rule

The owning coordinator updates its row whenever it claims, stops, transfers, or completes
the goal. The goal-local ownership block is still the source of truth; conflicting index
state is a stop-and-reconcile condition.
