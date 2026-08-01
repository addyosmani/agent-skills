# /loop Directive — Permission-Profile Registry + Dispatch-Time Emitter

Modeled on `docs/kickstarters/foreman-line-coordinator-loop.md`. Governs the parcel loop for the goal charter at `docs/goals/permission-profile-registry/charter.md` (Gate 1 fully ratified 2026-07-16, including the D9-amendment triage recorded in `docs/goals/permission-profile-registry/plan-review-findings.md`).

## GOAL OWNERSHIP — read before dispatching anything

> **Goal owner: this coordinator session**, entered via `/goal permission-profile registry + dispatch-time emitter, per the deferred parcel in docs/kickstarters/foreman-line-coordinator-loop.md` (2026-07-16). One goal, one coordinator; ownership transfers only at parcel boundaries via this block. If ownership is ever ambiguous, report to Clint and wait — never assume (the W0 loop's dual-coordinator lesson, 491fb80, applies here too).

**Launch/resume** (fresh Claude Code session in `C:\Repos\kaseya-one-productivity-tools`):

```
/loop Read docs/goals/permission-profile-registry/loop-directive.md and execute one coordinator iteration per its rules; self-pace with ScheduleWakeup.
```

## Who you are

The Coordinator (D4) for this goal: you consume verification results, you never produce them. `docs/goals/permission-profile-registry/charter.md` is the ratified plan — read it AND this file at the start of every iteration. Canon: `docs/COORDINATOR-PATTERN.md`, `docs/FOREMAN-LINE-PLAN.md`, `docs/SPEC-CONVENTION.md`, `docs/transcripts/defects_lessons.md`. Run the proven 11-step loop (`docs/kickstarters/foreman-line-coordinator-carryover.md` §"The proven loop") exactly, with the goal-specific overlay below.

## CRITICAL overlay: dispatch-mechanics departure from W0 practice — scoped to P3 only

**Per the charter's D9-amendment(a) (narrowed 2026-07-16): builders and reviewers for P3 specifically MUST NOT be dispatched as this session's Agent/Task-tool background subagents.** A subagent shares this coordinator's already-loaded settings and never reloads a worktree-local `.claude/settings.local.json` — it would make P3's own capability-probe a placebo (plan-review finding F-A). **P1, P2, and P4 ship no enforcement code, do not test the mechanism, and dispatch normally as Agent-tool background subagents — exactly like every W0 parcel. Do not over-apply this overlay to them** (the coordinator did on first pass, caught it, and narrowed the charter the same day — see charter D9-amendment(a) for the full note).

P3's builder and reviewer sessions must be **top-level `claude` CLI sessions**: a separate terminal/window, cwd = the parcel worktree, normal (non-bypass) permission mode. In practice this means: Clint starts the session by hand (most reliable), or the coordinator hands Clint a ready-to-paste launch command + kickstarter and waits for the session to report back — never an in-session Agent tool call for P3's builder/reviewer work. If you catch yourself about to call the Agent tool for P3's builder or reviewer, STOP — that is exactly the mistake this overlay exists to prevent.

(Using the Agent tool for P1, P2, P4 builders/reviewers, or for any other coordinator activity that doesn't depend on the permission-profile mechanism under test — e.g. a plan-level review, shaping sessions, research/lookups — is unaffected by this overlay.)

## Standing authorizations (granted by Clint at Gate 1 ratification; scoped to this goal's queue only)

1. **Dispatch approval** granted for exactly P1–P4 below, in that order — no others. A new parcel idea is a stop-and-report.
2. **Merge** pre-authorized per "merge it, brother," contingent on the complete verification chain being green (closure check, deterministic pass, adversarial review + triage, rework tripwires silent) for every parcel including P2 and P3. Any break in the chain = stop and report. P2 and P3 additionally require DUAL independent adversarial review before Gate 3 — an extra gate, not a substitute for standing merge authorization.
3. **Push, PR, and Stage F closure commits** authorized within this repo only.

## Per-iteration algorithm

1. Read the charter and this directive; identify the active parcel and which loop step it sits at.
2. Advance as far as this iteration allows, respecting the dispatch-mechanics overlay above. Every dispatch — including rework — opens with a Step 0 restate-and-stop gate (lesson #8); name the branch and worktree in the directive (lesson #9); worktrees live at `C:\Repos\foreman-line-<parcel>` per existing convention.
3. Verify every claim on disk before accepting it (lessons #5, #7): green checks verify state, only per-item closure checks verify work. Wrong-shaped claims are presumptively empty. Test-count tripwires on every rework.
4. Deterministic passes in PowerShell only, `node -v` first (lesson #10); never read an exit code through a truncated pipeline (lesson #11).
5. Adversarial review: single review for P1 and P4 (standard risk); **dual independent reviews for P2 and P3** (elevated/architecture-risk). For P3 specifically, the dual review's mandated focus questions are fixed by the charter (F-K): real launch mechanism, shell-based write/commit denial, positive control, post-probe `git status` clean. Where reviews disagree, reproduce the disputed finding yourself before triaging.
6. **P3-specific closure requirement:** before accepting P3's completion claim, personally verify (not just read the claim) that the live capability-probe used a top-level CLI launch in normal mode, tested both a Write-tool and a shell-based write/commit, included the positive control, and left the reviewer worktree's `git status` clean. This is this goal's version of "closure check before re-running anything" (lesson #7) — a P3 claim that only shows the deny half is presumptively empty (charter F-C).
7. On acceptance: paper trail rides in the parcel PR; PR body carries the verification-chain table; merge under standing authorization; Stage F (spec → `done/`, worktree/branch cleanup, lessons appended, this directive's queue table updated). Commits end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
8. At P1's Stage F closure specifically: also add the "shared-scaffold extraction" candidate to `docs/kickstarters/foreman-line-coordinator-carryover.md`'s next-wave list (charter D3/F-J).
9. At P4's Stage F closure specifically: also land the two doc-only closures (COORDINATOR-PATTERN.md dispatch-table envelope column; mark the deferred-parcel note taken up in `docs/kickstarters/foreman-line-coordinator-loop.md`).
10. Move to the next queue item.

## Queue (strict order)

1. ~~**P1 — permission-profile registry schema + validator.**~~ **DONE 2026-07-16** — PR #21, merge `cbd0376`, single adversarial review clean (4 informational-only observations, no blockers), 52/52 tests, spec in `done/`, worktree/branch removed. Built and reviewed as normal Agent-tool subagents (charter D9-amendment(a), narrowed same-day to P3-only).
2. ~~**P2 — DispatchOrder `permissionProfile` field.**~~ **DONE 2026-07-16** — PR #22, merge `e9950ee`. Dual independent adversarial review, both reviewers clean with zero disagreement (no reproduction needed). 72/72 tests (66 baseline + 6 attributable). D2 amended same-day mid-parcel to explicitly cover the generated composed-schema derivative (same class of fix as F-F). Spec in `done/`, worktree/branch removed.
3. ~~**P3 — dispatch-time emitter.**~~ **DONE 2026-07-20** — PR #23, merge (squash) onto `main`. Committed at `074f793` after a coordinator process gap was caught by both reviewers (Tier 1 build initially reviewed uncommitted — see the lesson below): builder committed at `8ce32f2`, then a README-staleness fix landed at `074f793` (Reviewer B's one non-blocking finding). Dual independent adversarial review, both reviewers PASS with no blocking findings; both independently reproduced Tier 1 green (70/70) and the live probe via headless `claude -p`, correctly declining to cite headless mode as AC11-14 evidence per spec. Tier 2 (interactive, top-level CLI) probe evidence from the builder: both write vectors denied under `reviewer-readonly`, positive control succeeded under `builder-standard`, post-probe `git status` clean save the disclosed F-B residual. Coordinator step-6 personal verification performed against all four criteria. Spec in `done/`, worktrees/branch removed. **Lesson recorded:** the coordinator dispatched the dual review against the builder's uncommitted working tree once — verify a `git log`/committed SHA, not just files-on-disk, before dispatching review.
4. ~~**P4 — spec-linter enum upgrade.**~~ **DONE 2026-07-20** — PR #24, squash-merged to `main` (`eb08723`+doc fix). Single adversarial review PASS with no blocking findings; the reviewer independently reproduced the deterministic tier (53/53, 52 pass/1 pre-existing-and-unrelated fail) and caught one non-blocking wording defect (a "P1-P4 all shipped" annotation written before this PR itself had merged) — fixed pre-merge. Doc-only closures (COORDINATOR-PATTERN.md envelope column, deferred-parcel note) landed in a separate labeled commit. Spec in `done/`, worktrees/branch removed.

**All four parcels shipped. Goal complete — see the Exit criterion below and the charter's Status line.**

## Loop-stop conditions (call ScheduleWakeup with stop:true, then report — do not ask questions mid-loop)

- Any P2 finding or rework that would touch anything beyond D2's exact three-artifact surface, or any other file in `plugins/foreman-line/contracts/`.
- Any need to modify `routing-policy`, `receipts`, `skill-injection`, or `spec-linter` beyond P4's narrow enum change.
- A P3 builder or reviewer session about to be dispatched as an Agent-tool subagent or in bypass mode — this is a stop-and-report on the coordinator's own conduct, not just a builder tripwire.
- A tripwire fires twice on the same parcel (test count, wrong-shaped claim, false closure).
- A P3 (or any) reviewer session leaves a dirty `git status` in its worktree post-review (charter D9-amendment's standing detection control) that cannot be explained and closed within the parcel.
- A security-relevant finding triage cannot close within the parcel.
- Anything outward-facing beyond the authorizations above (other repos, repo settings, force pushes — all denied).
- Queue empty: all four parcels shipped and closed (exit criterion met). Final report closes with anything Clint must do by hand (none currently anticipated, but check the charter's scope-limit notes — F-E's producer gap and F-G's non-mandatory invocation are honest limitations to restate, not defects to silently claim fixed).

## Wakeup pacing

Blocked on a running background agent (P1, P2, P4 builders/reviewers, or any shaping/plan-review dispatch) → schedule a 1200–1800s fallback and yield; completion notifications are the primary wake signal. Blocked on a Clint-driven top-level CLI session (P3's builder/reviewer only, per the overlay) → same pacing, since there's no background-agent completion notification to rely on for that one parcel. Actively coordinating → keep working, no wakeup. Never schedule short wakeups to poll.

## Crash recovery

Same procedure as `docs/kickstarters/foreman-line-coordinator-loop.md` §"Crash recovery" — on any wake, if expecting a result and none arrived, check for a completion claim before assuming completion; the dead session's uncommitted work may survive in its worktree but is UNCLAIMED until a real completion claim exists. Additionally for this goal: if resuming after a crash, re-confirm the resumed builder/reviewer session is (still) a top-level CLI session per the overlay, not silently restarted as a subagent for convenience.
