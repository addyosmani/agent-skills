# Coordinator Pickup Directive — Heterogeneous Agent Worker Fabric

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
/goal resume heterogeneous-agent-worker-fabric
```

## Purpose of this pre-Gate-1 directive

This is a pickup and reconciliation directive, not an implementation loop and not a grant
of historical authority. After current-instance Gate 1 and the mandatory plan review, the
owning coordinator replaces it with a full loop directive containing the ratified queue,
standing authorizations, worktree rules, tripwires, and wakeup state.

## Intake queue

1. Claim ownership in this block.
2. Verify `historical-charter-source.md` against the SHA-256 pinned in `charter.md`, then
   read both files completely.
3. Reconcile current Git, branches/worktrees, goal owners, routing policy, installed
   packages, provider adapters, specs, receipts, and exact decision-number state.
4. Build a claim ledger for every historical WF parcel and PR: `verified_current`,
   `historical_only`, `superseded`, `missing`, or `conflicting`. Credit nothing from prose.
5. Revalidate model/provider availability, capabilities, data eligibility, cost metadata,
   and security posture without reading or emitting credential values.
6. Present the reconciled locked decisions, exact parcel graph, exit criterion, and requested
   authorizations for explicit developer Gate 1.
7. Run the mandatory fresh plan-level adversarial review after Gate 1, triage findings, and
   re-ratify decision-changing corrections.
8. Replace this pickup directive with the full coordinator loop and request exact Gate 2.
9. Continue until the exit criterion is evidenced or a human-only gate produces an exact
   stop report. A copied charter or completed reconnaissance is not goal completion.

## Current authority

- Goal creation, coordinator pickup, and pursuit to completion are requested by Clinton
  Morgan on 2026-09-03.
- Gate 1 is not granted.
- Gate 2 is not granted.
- Gate 3/default-route promotion is not delegated.
- Provider calls, spend, secret access, external writes, and production routing changes are
  not authorized by the historical source.

## Stop conditions

Stop if ownership is ambiguous; current evidence contradicts a historical authority claim;
a required serialization point is owned elsewhere; model or provider identity cannot be
verified; any step would expose a secret; the proposed graph cannot preserve independent
verification; or progress requires dispatch, spend, external effects, merge, production
promotion, or another human gate not explicitly granted in the current charter.
