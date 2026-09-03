# Goal Charter — Hierarchical Coordination and Coordinator Sidecars

**Goal slug:** `hierarchical-coordination-sidecars`
**Created:** 2026-09-03
**Owner:** Clinton Morgan
**Status:** PROPOSED — queued for current-instance Stage Zero and Gate 1; not ratified
**Coordinator:** unassigned — claim through `loop-directive.md`
**Mode:** repo-local architecture and implementation goal
**Source proposal:** `source-proposed-amendment-A3.md`, SHA-256
`a5d9196c994d3215cd1966a234764174c1421f888d3cf68b901d31f07d221695`

## Objective

Carry the proposed hierarchical-coordination contract through current-instance authority
reconciliation, Gate 1, implementation, integration proof, and closure. The result must
remove the owning coordinator's personal scheduling and adjudication queues as throughput
bottlenecks without splitting root accountability, weakening independent verification, or
creating a shared global coordinator.

Copying or ratifying prose is not completion. This goal must produce an implemented and
evidenced coordination seam, or stop at a named human gate with an exact completion ledger.

## Provenance and authority

The source proposal was drafted in this instance from a historical, differently deployed
Foreman Line. It is preserved byte-for-byte beside this charter. Its D23–D25 text is a
proposal, not current authority.

At intake time, the live `foreman-kernel` goal was owned by another coordinator and FK-P0
was at human Gate 3 in a separate worktree. This goal must reconcile that live state before
editing any Foreman Kernel charter, branch, worktree, or owned serialization point. A safe
sequence or explicit ownership transfer is required; this charter creates neither.

## Proposed locked decisions

These decisions are candidates for Gate 1. They are not binding before explicit developer
ratification.

| ID | Proposed decision | Reasoning |
|---|---|---|
| D1 | The source proposal's hierarchy, coordinator-scoped sidecars, and structural roll-up rules are the design baseline; changes require explicit Gate 1 disposition. | The recovered concept is the reason for the goal, while the current instance still needs authority reconciliation. |
| D2 | Every goal retains exactly one root owning coordinator. Subordinate coordinators receive mechanically disjoint, revision-bound domains and strictly narrower authority. | Throughput must not dissolve accountability or manufacture authority. |
| D3 | Every coordinator receives a deterministic scheduler and stateless adjudicator pool scoped to that coordinator's queue. Scheduler progress cannot require the coordinator to spend a turn. | A sidecar that waits for the owner to advance it preserves the bottleneck under another name. |
| D4 | Shared kernel, storage, lease, admission, and compute services remain neutral infrastructure; no shared scheduler, adjudicator pool, or queue becomes a global coordinator. | The current kernel can be reused without recreating the rejected flat control plane. |
| D5 | Roll-ups are structured claims resolved against canonical evidence. Independence is enforced at principal and occupancy level; no role or pool member verifies its own evidence. | Hierarchical summaries must not become self-graded assurance. |
| D6 | Implementation is contract-first and fail-closed for stale domain digests, double ownership, invalid edge transitions, nondeterministic scheduler inputs, unresolved evidence, and independence collisions. | These are the failure modes that can make a compliant-looking hierarchy unsafe. |
| D7 | Gate 1 and Gate 3 remain human-owned. Gate 2 may be requested only for parcels named by the ratified charter after plan review. | This goal changes coordination mechanics, not the source of authority. |

## Candidate parcel decomposition

The claiming coordinator must reconcile and reshape this graph before Gate 1. No row is
dispatchable in its current proposed state.

| Parcel | Outcome | Risk / routing | Dependencies |
|---|---|---|---|
| HCS-P0 — Authority and collision reconnaissance | Maps current goal ownership, kernel contracts, state authority, queue mechanics, active serialization points, and the exact landing target for A3. | critical / architecture-risk | none |
| HCS-P1 — Coordination contracts | Versions coordinator identity, delegated-domain digest, authority ceiling, commissioning depth, edge lifecycle, scheduler input, adjudication request, and roll-up envelopes. | critical / architecture-risk | HCS-P0 |
| HCS-P2 — Delegation and edge lifecycle | Implements commission, quiesce, revoke, close, restart recovery, and single-root/single-domain ownership refusal. | critical / architecture-risk | HCS-P1 |
| HCS-P3 — Deterministic scheduler sidecar | Advances a coordinator-local queue without a coordinator turn; records frozen inputs and proves repeat-run ordering identity. | critical / architecture-risk | HCS-P1 |
| HCS-P4 — Stateless adjudicator sidecar | Implements bounded pool dispatch, principal/occupancy separation, no private durable authority, and typed disposition results. | critical / architecture-risk | HCS-P1 |
| HCS-P5 — Structural roll-up resolver | Resolves references, domains, digests, counts, versions, sampling triggers, and named-gate re-derivation without accepting prose assurance. | critical / architecture-risk | HCS-P2, HCS-P4 |
| HCS-P6 — Collision, crash, and restart proof | Exercises stale-domain, double-lease, parent termination, restart, queue isolation, self-verification, and shared-infrastructure contention paths. | critical / architecture-risk | HCS-P2, HCS-P3, HCS-P5 |
| HCS-P7 — Adoption and exit evidence | Lands the ratified seam in its reconciled owner, proves a real parent/child run, and binds code, schemas, policy, identities, tests, and known gaps in an exit manifest. | critical / architecture-risk | HCS-P6 |

## Proposed exit criterion

This goal exits only when:

1. the current-instance authority owner and serialization sequence are reconciled on disk;
2. the developer explicitly ratifies the final locked decisions, graph, and standing gates;
3. a fresh plan-level adversarial review is triaged, with scoped re-ratification for every
   decision-changing fix;
4. all ratified HCS parcels complete the Foreman parcel loop and merge through human Gate 3;
5. one real parent and child coordinator execute a revision-bound delegated domain while
   the parent scheduler continues without consuming the parent's turn;
6. negative controls prove single-root ownership, continuing disjointness, deterministic
   scheduling, edge revocation/restart safety, queue isolation, and verifier independence;
7. parent roll-up verification remains bounded and structural on the normal path, with
   full re-derivation only under ratified sampling, refusal, or a named gate; and
8. a committed evidence manifest states what is mechanically enforced, detected, sampled,
   human-judged, unsupported, and deferred.

## Human gates and requested standing authority

- **Gate 1:** not granted. The claiming coordinator presents the reconciled decision list.
- **Gate 2:** not granted. Request only for the final named parcel graph after Gate 1 and
  plan review.
- **Gate 3:** not delegated. Every merge and any production activation remain human-owned.

## Stop conditions

Stop and report if another live owner controls a required goal/worktree; the current A3
landing target is ambiguous; a required serialization point is already owned; a domain is
treated as disjoint without a revision-bound mechanical proof; root ownership can split;
delegated authority can widen or return implicitly; scheduler progress consumes the owning
coordinator's turn; a parent accepts unresolved evidence; one principal or pool occupancy
is presented as independent from itself; a parcel needs unratified scope; or any human gate
would need to be inferred.

## Gate 1 record

_Unratified. The developer's request on 2026-09-03 creates and queues this goal; it does not
ratify the proposed decisions or grant parcel dispatch._
