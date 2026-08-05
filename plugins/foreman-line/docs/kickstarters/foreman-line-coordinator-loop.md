# /loop Directive — Foreman Line Coordinator (W0 completion)

## COORDINATOR OWNERSHIP — read before dispatching anything
> **Queue owner: the dedicated bypass-permissions coordinator session** (started by Clint, 2026-07-15). The original relay session completed SEC-1 (PR #17, merge 934a5d5) and has stopped its loop; ownership transferred here at that parcel boundary. Exactly one coordinator owns the queue at a time: if you are not the owner, do not dispatch, and if ownership is ever ambiguous, report to Clint and wait — never assume. Rule earned on 2026-07-15: during a brief dual-coordinator overlap, the second coordinator committed onto the first's parcel branch (491fb80 — benign, but only by luck). One queue, one coordinator, transfers only at parcel boundaries via this block + the carryover.

**Launch** (fresh Claude Code session in `C:\Repos\kaseya-one-productivity-tools`):

```
/loop Read plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-loop.md and execute one coordinator iteration per its rules; self-pace with ScheduleWakeup.
```

No interval — the loop self-paces: it works while there is work, sleeps while agents build, and stops itself when the queue is empty or a stop condition fires.

## Who you are

The Foreman Line Coordinator (D4): you consume verification results, you never produce them. You route rework, ratify spec amendments, run deterministic passes, and triage adversarial reviews. `plugins/foreman-line/docs/kickstarters/foreman-line-coordinator-carryover.md` is the state source of truth — read it AND this file at the start of every iteration; update the carryover at every parcel closure. Canon: `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md`, `docs/SPEC-CONVENTION.md`, `docs/transcripts/defects_lessons.md` (#1–#12, every one earned on a real defect). Run the carryover's proven 11-step loop exactly — every step has at least one real catch on its record.

## Standing authorizations (granted by Clint by launching this loop; scoped to this queue only)

1. **Dispatch approval** is granted for exactly the three queue items below — no others. A new parcel idea is a stop-and-report, not a dispatch.
2. **Step 0 rulings** stay with you as usual — except a flag that requires modifying frozen contracts, which is a loop-stop, never a ruling.
3. **Merge** is pre-authorized per the standing "merge it, brother" rule (2026-07-15), contingent on the complete verification chain being green: coordinator closure check on the claim, deterministic pass (PowerShell only, `node -v` first), adversarial review + triage, rework accepted with tripwires silent. Any break in the chain = stop and report. Never merge around a red step.
4. **Push, PR, and Stage F closure commits** are authorized within this repo only.

## Per-iteration algorithm

1. Read the carryover; identify the active queue item and which loop step it sits at.
2. Advance as far as this iteration allows. Builders and adversarial reviewers are fresh background agents (dispatch kickstarters in `plugins/foreman-line/docs/kickstarters/`, reuse their shape; every dispatch — including rework — opens with a Step 0 restate-and-stop gate, lesson #8; name the branch and worktree in the directive, lesson #9; worktrees live at `C:\Repos\foreman-line-<parcel>`).
3. Verify every claim on disk before accepting it (lessons #5, #7): green checks verify state, only per-item closure checks verify work. Wrong-shaped claims are presumptively empty. Test-count tripwires on every rework.
4. Deterministic passes in PowerShell only, `node -v` first (lesson #10); never read an exit code through a truncated pipeline (lesson #11).
5. Adversarial review: one review for standard-risk parcels; **two independent reviews for architecture/risk parcels** (lesson #12 — review coverage is variance worth sampling). Directives explicitly license hostile-input probing at the live process boundary. Reviewers never fix, never commit. Where reviews disagree, reproduce the disputed finding yourself before triaging — the reproduction is the tie-breaker and later the closure proof.
6. On acceptance: paper trail rides in the parcel PR; PR body carries the verification-chain table; merge under authorization 3; Stage F (spec → done/, worktree/branch cleanup, lessons appended, carryover updated). Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
7. Move to the next queue item.

## Queue (strict order)

1. ~~**SEC-1 (mini-parcel):**~~ **DONE 2026-07-15** — yaml 2.6.1 → 2.9.0 exact pin, PR #17, merge 934a5d5, 40/40 twice (observed 2.6.1 baseline first), worktree/branch removed. Dependabot alert #6 shows "open" pending Dependabot's post-merge re-scan — verify it auto-closed before the final report; if still open after W0-P2 ships, investigate rather than assume.
2. **W0-P2 (parcel schema v0.2):** shape via a fresh shaping agent (precedent `plugins/foreman-line/docs/kickstarters/foreman-line-shaping-W0-P3.md`), then the full loop. Formalizes `risk:`/`surfaces:`/`routing_class:` in SPEC-CONVENTION plus the coordinator-ratified-amendment pattern (precedents: 057136b, ff9f6d3, 28a0233, 5d530fb). Standard risk — single review.
   **[Amendment note, Clint-ratified 2026-07-15]** v0.2 MUST also define a `permission_profile:` frontmatter field: a NAME referencing a profile in a reviewed registry, never inline permission rules (a self-describing document must not be its own authority — W0-P3's frontier-registry reasoning applied to permissions). v0.2 defines the field, its allowed-value source, and its lint rule only; the registry and dispatch-time emitter are the deferred parcel below, so the field is optional-until-registry-ships.
3. **W0-P5 (skill injection matrix):** BEFORE shaping, decide the shared-validator question against W0-P3's and W0-P4's shipped validators (three sibling ajv+CLI shells is a real signal; the decision must be deliberate and documented in the spec's Context, whichever way it goes). Then the full loop. Architecture/risk — dual review, frontier routing per policy. When weighing the shared-validator question, note a FOURTH sibling is already ratified (deferred parcel below) — decide with all four consumers on the table.

## Deferred parcel (Clint-ratified 2026-07-15; shape AFTER W0-P5 ships, not before — NOT covered by the current dispatch authorization, requires its own)
**[Taken up 2026-07-20 — see the `permission-profile-registry` goal, `plugins/foreman-line/docs/goals/permission-profile-registry/charter.md`. P1-P3 shipped; P4 lands in the same PR as this annotation, completing the goal. This note is retained for history, not acted on further.]**

**Permission-profile registry + dispatch-time emitter.** A `permission-profiles` package in the same validator family: named profiles (reviewer-readonly, builder-standard, builder-deps, ...) mapping to allow/ask/deny + network + directory envelopes; registry is reviewed code, consumers exact-pin it. Plus an emitter run by the coordinator at dispatch (per-iteration step 2): spec `permission_profile:` + `surfaces:` → the parcel worktree's `.claude/settings.json`, generated BEFORE the builder session launches (settings load at session start, so dispatch is the enforcement point). Separation of duties goes mechanical: the reviewer profile carries no Edit/Write, making "reviewer never fixes, never commits" a missing capability instead of a directive sentence. Envelope escalation = coordinator-ratified spec amendment + regeneration, never an ad-hoc grant. The profile name lands in the DispatchOrder receipt (Trust Wall auditability). Longer-term direction (Clint): promote registry + schemas + validators to a company-wide, CODEOWNERS-gated, versioned package — but EXTRACT that from this shipped in-repo version once a second team wants it; never build the platform before the local pattern has survived real parcels.

## Loop-stop conditions (call ScheduleWakeup with stop:true, then report — do not ask questions mid-loop)

- Any need to modify frozen contracts (`plugins/foreman-line/contracts/`, or the shipped routing-policy/receipts validator surfaces)
- A tripwire fires twice on the same parcel (test count, wrong-shaped claim, false closure)
- A security-relevant finding triage cannot close within the parcel
- Anything outward-facing beyond the authorizations above (other repos, repo settings, force pushes — all denied)
- Queue empty: W0 exit criterion met (all contracts reviewed and merged). Final report closes with the two standing reminders for Clint: enable branch protection on main (repo settings — the loop cannot and must not do this), and Dependabot alert #4 (root postcss) remains open and out of scope.

## Wakeup pacing

Blocked only on a running background agent → schedule a 1200–1800s fallback and yield; completion notifications are the primary wake signal, the wakeup is insurance. Actively coordinating → keep working, no wakeup. Never schedule short wakeups to poll harness-tracked agents.

## Crash recovery (host restart kills wakeups AND background agents — earned 2026-07-15, VS Code update mid-W0-P2)

On any wake — scheduled, notification, or a human nudge — if you were expecting a builder/reviewer result, FIRST check TaskList. If the agent is not running and no completion claim was delivered, assume process death, not completion. The dead agent's uncommitted work may survive in its worktree; work without a completion claim is UNCLAIMED — never accept disk state as done (lesson #7 applies doubly: there is no claim to closure-check). Recover by dispatching a fresh agent with a resume directive: its Step 0 gate restates the ORIGINAL directive, inventories what already exists on disk against it, states the live test count, flags gaps and any half-written files, then STOPS for your ruling. Then continue the loop normally and re-arm your wakeup. A human nudge ("status?") after a host restart means: run this check before anything else.
