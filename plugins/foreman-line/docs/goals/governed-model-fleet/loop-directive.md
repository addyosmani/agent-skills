# /loop Directive — Governed Model Fleet

## COORDINATOR OWNERSHIP — read before any dispatch

> **Queue owner:** `/root`, the Remote-safe Codex coordinator that opened
> `governed-model-fleet` on 2026-09-03. One goal has one coordinator. Ownership may transfer
> only at a parcel boundary by updating this block, `charter.md`, and the goal index. If
> ownership or repository-writing authority is ambiguous, stop and report; never assume.

`model-fleet-v1` is a frozen predecessor stopped at MF-P0 `NO-GO`. It is not an active queue
owned by this loop, and none of its files or evidence may be amended by Governed Model
Fleet.

## Governing records

Read these at the start of every iteration:

1. `plugins/foreman-line/docs/goals/governed-model-fleet/charter.md`
2. `plugins/foreman-line/docs/goals/governed-model-fleet/amendment-a1.md`
3. `plugins/foreman-line/docs/goals/governed-model-fleet/plan-review-findings.md`
4. `plugins/foreman-line/docs/goals/governed-model-fleet/discovery.md`
5. `plugins/foreman-line/docs/goals/INDEX.md`
6. `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`
7. `plugins/foreman-line/skills/parcel-driven-development/SKILL.md`

The charter with incorporated Amendment A1 is authoritative. The index is a discovery
projection only. Current Git state, approved parcel specs, receipts, and evidence must be
reconciled before trusting any carryover status.

## Ratification and standing-authority record

The owner issued these directives verbatim:

> “Ratify Governed Model Fleet Stage Zero assumptions A1–A7 and authorize successor
> charter drafting plus plan-level adversarial review.”

> “Ratify Governed Model Fleet D1–D24 and GMF-P0–GMF-P6.”

> “Ratify Governed Model Fleet Amendment A1 and revised graph through GMF-P9.”

Their controlling interpretation is narrow:

1. A1–A7, D1–D24 as amended by A1, and the graph through GMF-P9 are Gate-1 ratified.
2. The plan-level adversarial review is complete and its accepted findings are incorporated.
3. Gate 1 authorizes the plan, not parcel execution.
4. **Gate 2 is absent.** No builder, implementation reviewer, repository mutation, or parcel
   execution may be dispatched until the owner grants Gate 2 for the exact named parcel or
   parcel set and its shaped Allowed Files.
5. Repository creation/protection is the separate human prerequisite `GMF-HG-R1`; no parcel,
   Gate 2, or coordinator may infer it.
6. Provider spend/model calls, private/internal disclosure, patch promotion, merges,
   user-local installation, deployment, publication, and Gate 3 each remain separate
   explicit human actions at their actual boundaries.
7. Passive local inspection and goal-record maintenance may continue only as necessary to
   reconcile state and prepare a Gate request. They confer no product authority.

Harness permission prompts and filesystem access are not governance gates.

## Current state and next safe action

**State:** `gmf_p0_shaped_awaiting_gate_2`  
**Active queue item:** GMF-P0  
**Product implementation:** none authorized  
**External effects:** none authorized

GMF-P0 is shaped and coordinator-linted at
`plugins/foreman-line/docs/specs/active/GMF-P0-governed-model-fleet-discovery-and-negative-contracts.md`.
Its status remains `draft`. The next safe action is the owner's explicit Gate 2 decision for
that exact spec, five new goal-local output files, named branch/worktree, passive-only
commands, and dual-review route. Gate 2 activation may flip only this spec from `draft` to
`active`; it grants none of the external effects withheld above.

## Dependency queue

The queue is strict by dependency, with parallelism permitted only where explicitly shown
and only after collision analysis:

1. **GMF-P0 — discovery/canon/threat model/expanded negative matrix.** Shaped and
   coordinator-linted; awaiting Gate 2. Zero implementation and zero external effects.
2. **GMF-P1 — contracts.** Depends on accepted GMF-P0.
3. **GMF-P2A — durable Runtime authority/accounting store and migration.** Depends on P1.
4. **GMF-P2B — atomic spend/reservation/concurrency/pre-effect receipt.** Depends on P2A.
5. **GMF-P2C — terminal reconciliation, lease recovery, settlement, verification
   primitives.** Depends on P2B.
6. After P2C, two dependency branches may proceed if separately gated and collision-safe:
   - **GMF-P5 — MCP capability admission** in `keon-mcp-gateway`;
   - **GMF-HG-R1 — human repository creation/protection**, which is not a parcel.
7. After GMF-HG-R1 establishes protected repositories and initial base commits:
   - **GMF-P3A → GMF-P3B — model-gateway baseline, then governed gateway**;
   - **GMF-P4A → GMF-P4B — executor baseline, then deny-only executor**.
   P3 and P4 branches may be parallel only because they write separate repositories.
8. **GMF-P4C — bounded synthetic/public allowed execution.** Depends on independently
   accepted P3B and P4B. P4B denial closure must be complete before P4C shaping/dispatch.
9. **GMF-P6 — isolated Promotion Actuator.** Depends on P1, P2C, and P4C.
10. Two branches may then proceed if separately gated and collision-safe:
    - **GMF-P7 — foreman adapter and distributable skill** depends on P3B, P4C, P5, P6;
    - **GMF-P8 — offline verifier implementation and independent acceptance** depends on
      P1, P2C, P3B, P4C, P5, P6.
11. **GMF-P9 — verification-only adversarial E2E.** Depends on P7 and independently accepted
    P8. Verifier source and fixtures are forbidden from P9 Allowed Files.

No dependency arrow grants authority. Every parcel or explicitly named parallel parcel set
requires its own Gate 2 record.

## Per-parcel coordinator algorithm

1. Reconcile the governing records, repo HEAD/status, existing worktrees/branches, open
   writers, prior handoffs, and current environment. Preserve all pre-existing dirty work.
2. Shape the parcel in a fresh bounded session. The spec must name exact repository/base
   commit, branch/worktree, Allowed Files, Forbidden/Out of Scope, contracts, integration
   surfaces, data class, environment identity, required tests, independent observation
   points, rollback/cleanup, evidence, collision risk, and stop-and-report rules.
3. Lint every factual claim against disk and current canon. A missing owner, contract,
   observation point, environment, or authority boundary is a stop, not a shaping guess.
4. Present the exact parcel or parcel-set Gate 2 request. Do not infer approval from Gate 1,
   prior Fleet authority, harness settings, or silence.
5. After Gate 2, dispatch a fresh builder in the named isolated worktree/branch. Its Step 0
   must restate scope, files, contracts, test count, environment, and blockers, then stop for
   coordinator ruling before implementation.
6. A real spec or contract gap becomes an amendment. Frozen/cross-project contract changes
   stop affected work until the amendment lands before dependents resume.
7. On a completion claim, verify the claim shape and inspect repository state before running
   anything. Evidence must map to every acceptance criterion; wrong-shaped claims are
   presumptively empty.
8. Run deterministic verification in the exact required environment. Environment-local
   green never upgrades another environment.
9. Every GMF parcel is architecture/security risk and receives **two independent fresh
   adversarial reviews**. Reviewers never fix or commit. They may perform safe hostile-input
   probing only when the parcel's explicit authority permits it.
10. Triage findings as fix, accept-as-documented, or informational. Reproduce disputed
    findings independently before ruling. Rework repeats Step 0 and carries a test-count
    tripwire.
11. A green parcel chain is not merge or release authority. Present the required human merge
    or Gate 3 action; never perform it unless explicitly granted for that exact target.
12. After authorized acceptance/merge, perform Stage F: archive the spec, clean only the
    parcel-owned worktree/branch, append lessons/handoff/evidence, and update charter/index/
    loop state. Never delete or reset user-owned work.

## Effect-specific invariants

- **Execution:** no source-bearing preparation before spend; one spend starts at most one
  isolated root process tree; the whole tree terminates on failure; post-spend source
  bootstrap precedes cognition.
- **Inference:** one exact provider attempt per spend; no automatic provider retry/fallback;
  unknown post-send cost remains reserved until append-only settlement or human resolution.
- **Promotion:** only the isolated Promotion Actuator may apply; target is a new isolated
  worktree/ref under exact patch/HEAD/path/review/CAS binding; promotion cannot merge.
- **Authority:** only Runtime-issued `IPermission` is canonical. `FleetPermissionEnvelope`,
  role, prompt, profile, receipt, evidence, confidence, and coordinator judgment confer no
  authority.
- **Isolation:** Runtime governs capabilities; the container/VM/OS boundary enforces them.
  Neither substitutes for the other.
- **Evidence:** denial and failure are durable evidence. Missing or unverifiable evidence
  fails closed. P9 may consume but not modify the verifier it uses.

## Stop conditions

Stop the loop and report when:

- Gate 2 is required and absent;
- `GMF-HG-R1` repository creation/protection is required and absent;
- provider spend, private/internal disclosure, promotion, merge, installation, deployment,
  publication, or Gate 3 is required and not explicitly authorized;
- another live coordinator/writer owns overlapping scope or a required worktree is dirty;
- a ratified invariant, effect class, contract owner, source/environment identity, data
  class, cost/settlement rule, receipt lifecycle, or target needs to change;
- a security finding cannot close inside the active parcel;
- a denial observer is not independent of the component under test;
- a receipt/evidence write cannot be made durable before the effect;
- an idempotency/recovery path could create a second process tree, provider attempt, or patch
  application;
- P4C is proposed before P4B's full independent closure;
- P9 would modify verifier source/fixtures or use self-produced proof;
- a tripwire fires twice in one parcel; or
- the queue is empty or the goal exit criterion is met.

## Wakeup and crash recovery

Completion notifications are the primary wake signal. Use long fallback wakeups only while
an authorized background agent is running; never short-poll. On resume after interruption,
check live agents and repository/worktree state before trusting expected output. Disk state
without a completion claim is unclaimed. Recover through a fresh bounded resume session
whose Step 0 inventories surviving work and stops for coordinator ruling.

When stopped at a human gate, persist the exact state and requested action, then yield. A
human-only gate is never a loop condition the agent pretends it can satisfy.
