# Coordinator Pickup Directive — Hierarchical Coordination and Coordinator Sidecars

## COORDINATOR OWNERSHIP — claim before substantive work

> **Queue owner: UNCLAIMED.** A coordinator claims this goal by replacing this sentence
> with its exact task/session identity and timestamp in the goal's isolated worktree before
> doing substantive Stage Zero work. One goal has one root coordinator. If another live
> owner is named or ownership is ambiguous, stop and report.

**State:** `awaiting_coordinator_claim`

**Pickup precondition:** claim from a dedicated goal worktree after this intake commit is
merged, or from a dedicated worktree based on the exact intake commit. Do not run either
queued goal from the shared registration worktree.

**Entry prompt:**

```text
/goal resume hierarchical-coordination-sidecars
```

## Purpose of this pre-Gate-1 directive

This file makes the requested goal discoverable and resumable before a coordinator has
claimed it. It grants no implementation authority. After Gate 1 and the mandatory plan
review, the owning coordinator replaces this file with the full parcel-loop directive and
records the ratified standing authorizations verbatim.

## Intake queue

1. Claim ownership in this block at a parcel boundary.
2. Verify `source-proposed-amendment-A3.md` against the SHA-256 pinned in `charter.md`,
   then read both files completely.
3. Reconcile the live Foreman Kernel goal, its ownership block, branches/worktrees, current
   decision sequence, and all overlapping serialization points.
4. Verify the source proposal's anchor claims against current disk state. Historical or
   cross-worktree claims are inputs, never assumed facts.
5. Interrogate unresolved Stage Zero decisions and present the final decision list, parcel
   graph, exit criterion, and requested gates for explicit developer Gate 1 ratification.
6. After Gate 1, dispatch the mandatory fresh plan-level adversarial review. Triage it and
   reopen Gate 1 only for decision-changing findings.
7. Replace this pickup directive with the full coordinator loop and request the scoped
   Gate 2 grant. Do not dispatch before then.

## Current authority

- Goal creation and coordinator pickup are requested by Clinton Morgan on 2026-09-03.
- Gate 1 is not granted.
- Gate 2 is not granted.
- Gate 3 is not delegated.
- No Foreman Kernel ownership transfer is granted.

## Stop conditions

Stop if the live Foreman Kernel owner is active on a required surface, the source anchor has
drifted, decision IDs collide, current canon contradicts a proposed invariant, or progress
would require implementation, dispatch, merge, external effects, or an inferred human gate.
