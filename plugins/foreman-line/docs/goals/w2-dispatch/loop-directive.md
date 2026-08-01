# Loop Directive — w2-dispatch

## COORDINATOR OWNERSHIP — read before dispatching anything
> **Queue owner: the `/goal w2-dispatch` coordinator session (Clint-launched, 2026-07-23).** Exactly one coordinator owns this goal at a time. If you are not the owner, do not dispatch; if ownership is ambiguous, report to Clint and wait. Ownership transfers only at parcel boundaries via this block. On every loop stop, update the state line below.
>
> **State (update on every stop/closure):** Charter RATIFIED 2026-07-23. Plan adversarial review COMPLETE 2026-07-23 (2 BLOCKERs + 3 SHOULD-FIXes, all ruled, charter amended). Loop directive GENERATED 2026-07-23. W2-P1 SHIPPED 2026-07-23 (PR #48, squash 667eae7; 15/15 tests, tsc/biome clean, adversarial SHIP WITH FOLLOW-UPS 0 BLOCKERs, spec → done/, worktree/branch removed). W2-P3 SHIPPED 2026-07-23 (PR #49, squash 9bb5d44; 37/37 tests, tsc/biome clean, adversarial 3 SHOULD-FIXes closed in rework, lesson #22 added, spec → done/, worktree/branch removed). W2-P5 SHIPPED 2026-07-23 (PR #50, squash 0701de57; 49/49 tests, tsc/biome clean, adversarial 1 SHOULD-FIX closed in rework, spec → done/, worktree/branch removed). W2-P4 SHIPPED 2026-07-23 (PR #51, squash c025900; 59/59 tests, tsc/biome clean, dual adversarial review SHIP WITH FOLLOW-UPS, 3+1 SHOULD-FIXes closed in rework, spec → done/, worktree/branch removed). W2-P2 SHIPPED 2026-07-23 (PR #53, squash e4073ac; 81/81 tests, tsc/biome clean, dual adversarial review SHIP WITH FOLLOW-UPS, 3 SHOULD-FIXes closed in rework, spec → done/, worktree/branch removed). SCAF-P2 SHIPPED 2026-07-23 (PR #57 squash a4d58c94; 352 tests pass across all 7 packages, tsc/biome clean, adversarial SHIP — 3 apparent BLOCKERs were diff-base artifacts resolved by coordinator rebase onto main, 0 true BLOCKERs; README path fix applied; spec → done/ PR #57, worktree/branch removed). Dispatch via PR #55 squash e4899dfb; Stage-C receipt 000002-C-dispatch-order.json walkable. Coordinator rulings: headroom_compress effective ceiling ~200 tokens (router:noop only; Lesson #23 added); SCAF-P2 spec amended with data_classification:internal (omitted at shaping); KONE-23195 assigned+transitioned In Progress for W2-P1 JQL. W2 EXIT CRITERION MET 2026-07-23: SCAF-P2 dispatched through complete W2 machinery end-to-end and builder shipped. QUEUE COMPLETE.

**Resume prompt** (fresh session): `/goal resume w2-dispatch`

## Who you are
The Foreman Line Coordinator (D4 of master plan): you consume verification results, you never produce them. Charter: `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` (source of truth for scope and locked decisions D1–D9 as amended post-plan-review). Plan-review findings: `plugins/foreman-line/docs/goals/w2-dispatch/plan-review-findings.md`. Canon: `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`, `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md`, `docs/SPEC-CONVENTION.md`, `docs/transcripts/defects_lessons.md` (#1–#22), the kickstarters directory for directive shapes, and the W1 coordinator carryover for the 11-step loop.

## Standing authorizations (granted at Gate 1 ratification; scoped to this goal only)
1. **Gate 2 — dispatch** is granted for exactly W2-P1, W2-P3, W2-P5, W2-P4, W2-P2, SCAF-P2 in dependency order, effective per-parcel once its shaped spec passes coordinator lint (every factual claim verified on disk). A new parcel idea is a stop-and-report, not a dispatch.
2. **Step 0 rulings** stay with the coordinator — except a flag requiring modification of a frozen contract, which is a loop-stop, never a ruling.
3. **Gate 3 — merge** is pre-authorized contingent on the complete verification chain being green: coordinator closure check, deterministic pass (PowerShell only, `node -v` first), adversarial review(s) + triage, rework accepted with tripwires silent. Any red step voids the authorization. Never merge around a red step.
4. **Push, PR, and Stage F closure work** authorized within this repo only. Main requires PRs (tools protector ruleset); closure commits go through PRs, never direct to main.
5. **Jira writes**: KONE project only, read-only during W2-P1 (no writes), through the W1-P4 transport, behind the default-deny gate. Any Jira write during W2-P1 is a stop condition.

## Queue (strict dependency order — charter D1, D2)
1. **W2-P1** ✅ SHIPPED PR #48 — Jira query + next-candidate ranking.
2. **W2-P3** ✅ SHIPPED — Model routing evaluation engine.
3. **W2-P5** ✅ SHIPPED — Skill injection engine.
4. **W2-P4** ✅ SHIPPED PR #51 — Kompress integration — architecture/risk: frontier builder, dual review. Calls `headroom_compress` on parcel spec + prior receipts; returns artifact ID + retrieval metadata recorded in Stage-C receipt `subject` (not in DispatchOrder — D5 amendment PAR-1). Shaping MUST probe all `headroom_compress` argument types and record contingency ladder (lesson #20/#21, PAR-6).
5. **W2-P2** ✅ SHIPPED PR #53 — Step 0 + one-tap dispatch approval (integrating CLI) — architecture/risk: frontier builder, dual review. Integrates P3/P5/P4; reads `permission_profile` from spec, populates `DispatchOrder.permissionProfile`, invokes permission-profile emitter for builder worktree (lesson #18, PAR-3); reads Stage-B receipt hash via candidate's receipt locator, chains into Stage-C receipt `prevHash` (PAR-5). SCAF-P2 kickstarter must cite charter D3 as dispatch precondition authorization (PAR-7).
6. **SCAF-P2** (KONE-23195) ✅ SHIPPED PR #57 — standard-feature: mid-tier builder, single review. First real parcel to travel the complete W2 dispatch machinery; exit proof vehicle. EXIT CRITERION MET.

## Per-iteration algorithm
1. Read this directive + the charter; identify the active queue item and its current loop step.
2. Advance as far as the iteration allows. Shaping agents, builders, and reviewers are fresh background agents; every dispatch (including rework) opens with a Step 0 restate-and-stop gate; branch + worktree named in the directive (`C:\Repos\foreman-line-w2-<parcel-slug>`); emit the parcel's permission-profile envelope at dispatch via the shipped emitter (lesson #18 — never pre-create the worktree by hand).
3. Verify every claim on disk before accepting it. Wrong-shaped claims are presumptively empty. Confirm a real commit exists on the branch before dispatching any review.
4. Deterministic passes in PowerShell only, `node -v` first (repo root `engines.node >= 24.11.1`); never read exit code through a truncated pipeline (lesson #11).
5. One review for standard-feature parcels (P1, P3, P5); two independent reviews for architecture/risk (P4, P2). Reviewers never fix, never commit; hostile-input probing licensed. Reproduce disputed findings before triage.
6. On acceptance: paper trail rides in the parcel PR; PR body carries the verification-chain table; merge under authorization 3; Stage F (spec → done/, worktree/branch cleanup, lessons appended, this directive's state line updated).
7. Next queue item.

## Key parcel-specific notes

### W2-P4 shaping checklist (elevated risk)
- [ ] Live probe of `headroom_compress` with ALL argument types it will receive in production (not string-only) — lesson #20
- [ ] Contingency ladder ratified in the spec at shaping time — lesson #20
- [ ] Probe runs fixture-isolated (scratch data, not production receipts) — lesson #21
- [ ] Round-trip smoke test: compress → retrieve → verify identity — shaping stop condition if this fails

### W2-P2 integration checklist (highest risk parcel)
- [ ] `DispatchOrder.permissionProfile` populated from spec frontmatter `permission_profile`
- [ ] Permission-profile emitter invoked for worktree creation before DispatchOrder emitted
- [ ] `ReceiptDocument.prevHash` populated from Stage-B receipt hash via candidate's `priorReceiptLocator`
- [ ] `ReceiptDocument.subject` contains Kompress artifact ID + retrieval metadata (from W2-P4 output)
- [ ] SCAF-P2 kickstarter cites charter D3 + Gate 1 ratification date as dispatch precondition authorization

## Stop conditions (ScheduleWakeup stop:true, then report to Clint — no mid-loop questions)
- A frozen contract needs modification (`plugins/foreman-line/contracts/` or shipped validator surfaces)
- A tripwire fires twice on one parcel
- A security finding can't close in-parcel
- Anything outward-facing beyond the standing authorizations
- Any Jira write during W2-P1 (read-only boundary — any write attempt is a stop)
- `headroom_compress`/`headroom_retrieve` round-trip fails at W2-P4 shaping time
- `DispatchOrder` schema incompatibility with the frozen `c-dispatch.ts` contract
- Queue empty: exit criterion met — final report includes anything Clint must do by hand

## Wakeup pacing
Blocked only on a running background agent → 1200–1800s fallback wakeup and yield; completion notifications are the primary signal. Actively coordinating → keep working. Never poll harness-tracked agents.

## Crash recovery
On any wake, if a builder/reviewer result was expected: check task state first. No completion claim = process death, not completion; worktree contents are UNCLAIMED. Recover with a fresh resume-directive dispatch whose Step 0 restates the ORIGINAL directive, inventories disk against it, states the live test count, flags gaps, and STOPS for a ruling.
