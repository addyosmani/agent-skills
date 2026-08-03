# Loop Directive — w3-verification

## COORDINATOR OWNERSHIP — read before dispatching anything
> **Queue owner: the `/goal w3-verification` coordinator session (Clint-launched, 2026-07-23).** Exactly one coordinator owns this goal at a time. If you are not the owner, do not dispatch; if ownership is ambiguous, report to Clint and wait. Ownership transfers only at parcel boundaries via this block. On every loop stop, update the state line below.
>
> **State (update on every stop/closure):** Charter RATIFIED 2026-07-23 (D1–D9, all Stage Zero recommendations). Plan adversarial review COMPLETE 2026-07-23 (4 BLOCKERs + 3 SHOULD-FIXes + 2 INFOs; all triaged; D3 redrawn PAR-1; D7 amended; P1/P3/P4 one-liners amended; findings in `plan-review-findings.md`). Loop directive GENERATED 2026-07-23. **D3 Gate 1 RE-RATIFIED 2026-07-24** — Clint ruled: headless full-session CLI launch (`claude -p`, cwd = the emitted reviewer worktree), so the `reviewer-readonly` envelope binds mechanically at session start (the CLI-subprocess option). W3-P2's first AC is a probe proving the envelope loads under headless launch; probe failure → kickstarter + human-relay fallback and a stop-report. P2 dispatch gate is cleared. **W3-P1 SHIPPED 2026-07-24** (PR #61, squash e887b05; 41/41 tests, tsc/biome clean; adversarial SHIP WITH FOLLOW-UPS — 0 BLOCKERs, 5 SHOULD-FIXes RF-1..4,6 closed in rework with ratified spec amendment d050390 adding BUILD_RESULT_INVALID/CHAIN_TIP_MISMATCH/WORKFLOW_ID_INVALID/RECEIPT_EXISTS to the error union; test-count tripwire silent 32→41; spec → done/, worktree/branch removed). Coordinator rulings: matrix-check source = BuildResult.touchedSurfaces confirmed; missing injected check = fail-loud confirmed; RECEIPT_WRITE_FAILED split per RF-1. **W3-P1 FULLY CLOSED 2026-07-24** — follow-on rework PR #64 (squash 4266ede) merged: SF-2 try-catch wrap for validateSkillInjectionMatrix (lesson #22), SF-1 dogfood scanner extractTestNames + left-boundary guard; 41/41 tests, tsc/biome clean on main; adversarial re-review post-rework: 0 BLOCKERs (RS-1 RECEIPT_WRITE_FAILED test gap accepted — code path correct, OS-level coverage deferred). **W3-P2 SHIPPED 2026-07-24** (PR #66, squash a7f7c08; 71/71 tests, tsc/biome clean; PROBE-HEADLESS PASS with exact production command; dual adversarial review — A: 1 BLOCKER RA-1 + 4 SHOULD-FIX + 5 INFO, B: SHIP WITH FOLLOW-UPS RB-1 + 7 INFO; RA-1 coordinator-reproduced on disk, then closed via ratified amendment 129af0e — reviewer dispatch targets an EXISTING branch, composing the frozen emitter's exported resolveProfile/projectEnvelope, real-git fixture test added; all accepted findings closed in rework attempt 1, tripwire silent 62→71 (spec now 29 ACs); lessons #24 (rtk-hook prefix-deny evasion — out-of-session git-detection control mandatory after every review) and #25 (emitter is new-branch-only; verify machinery invocation shape at shaping time) appended; spec → done/, worktree/branch removed). **Standing discipline rules adopted (RA-5, RA-9):** never commit the current workflow's Stage-C/D receipts to a branch before its review dispatch; every reviewer worktree must carry the reviewer-readonly envelope, dogfood reviews included. **W3-P3 SHIPPED 2026-07-24** (PR #69, squash ad1156b; 96/96 tests, tsc/biome clean; adversarial SHIP WITH FOLLOW-UPS — 0 BLOCKERs, PRF-9 confirmed mechanically unbeatable and rework cap un-lowerable; RP-1..RP-4 closed in rework attempt 1 behind ratified amendment f569109 (ENVELOPE_WRITE_FAILED, idempotent retry for emitVerificationVerdict/routeRework, table-cell escaping); tripwire silent 93→96; spec → done/, worktree/branch removed). **W3-P4 SHIPPED 2026-07-24** (PR #73, squash 7fd9ebd; 135/135 tests, tsc/biome clean; adversarial SHIP WITH FOLLOW-UPS — 0 BLOCKERs, no gate bypass found; RH-1/3/7/8 closed in crash-recovered rework attempt 1 behind ratified amendment 0cb6ebc — locator validation, executeHumanGate closure pre-check, name-only transition resolution, approval-only crash recovery; RH-2/RH-6 accepted as trust-model ceiling pending pcc signing; RH-5 fromStatus pending live probe; tripwire silent 129→135; spec → done/, worktree/branch removed). Crash-recovery protocol exercised: dead rework session's uncommitted RH-3 work inventoried and adopted after verification. Final queue item: **SCAF-P3** (exit proof). Spec ACTIVE (PR #75, 5 harness-checkable ACs). **Stage A COMPLETE 2026-07-24** — workflowId 1912af36-9159-45b4-8c32-35ce77baacc8, genesis receipt valid on disk (uncommitted, with shaping sidecars in specs/active/ as durable re-entry state). **LOOP-STOPPED at Stage B:** the `atlassian-remote` Docker MCP gateway is not authorized (OAuth lapsed since SCAF-P2; secrets-engine socket errors suggest a Docker Desktop restart may also be needed). HUMAN ACTION: complete the Atlassian OAuth consent (`docker mcp oauth authorize atlassian-remote`), then resume. Resume path: registration branch → re-run scratchpad stage-b driver (register() commits ticket backfill + Stage-B receipt on the branch, SCAF-P2 precedent) → Stage C prepareDispatch/executeDispatch → builder → recordBuildResult → harness → W3-P2 review → P3 verdict → P4 human gate (Clint one-tap) → Jira transition. GROUND-TRUTH FINDING: shipped executeDispatch mints a fresh correlationId at Stage C, so validateChain's shared-correlationId invariant only holds A→B even on the committed SCAF-P2 chain — exit-criterion chain-walk is provable via document validity + sequence + prevHash linkage; the correlation divergence is a shipped-machinery gap to surface to Clint (candidate W4 item, not a SCAF-P3 defect). **SCAF-P3 SHIPPED 2026-07-25** (PR #80, squash c148db0; 153/153 tests (18 new chainwalk + 135 existing), tsc/biome clean; adversarial PASS 0 BLOCKERs — 2 info non-blockers accepted (CR cell-escaping path untested; error code names differ from kickstarter hints, spec-compliant); Stage-D receipt chain committed PR #81; lesson #26 appended; spec → done/). **Goal COMPLETE** — all 5 parcels shipped (W3-P1, W3-P2, W3-P3, W3-P4, SCAF-P3). Exit proof demonstrated: walkChain + renderChainTable traversed the SCAF-P3 workflow's A→C receipt chain, verified sequence/prevHash linkage, and passed 5 harness-checkable ACs end-to-end through the full W3 pipeline. W4 candidate: correlation divergence in shipped executeDispatch (correlationId forks at Stage C).

**Resume prompt** (fresh session): `/goal resume w3-verification`

## Who you are
The Foreman Line Coordinator (D4 of master plan): you consume verification results, you never produce them. Charter: `plugins/foreman-line/docs/goals/w3-verification/charter.md` (source of truth for scope and locked decisions D1–D9 as amended post-plan-review). Plan-review findings: `plugins/foreman-line/docs/goals/w3-verification/plan-review-findings.md`. Canon: `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`, `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md`, `docs/SPEC-CONVENTION.md`, `docs/transcripts/defects_lessons.md` (#1–#23), the kickstarters directory for directive shapes, and the W2 coordinator carryover for the 11-step loop.

## Standing authorizations (granted at Gate 1 ratification; scoped to this goal only)
1. **Gate 2 — dispatch** is granted for exactly W3-P1, W3-P2, W3-P3, W3-P4, SCAF-P3 in dependency order once their shaped spec passes coordinator lint (every factual claim verified on disk). W3-P2's D3 gate was re-ratified 2026-07-24 (headless CLI launch) — its dispatch is now gated only on spec lint. A new parcel idea is a stop-and-report, not a dispatch.
2. **Step 0 rulings** stay with the coordinator — except a flag requiring modification of a frozen contract, which is a loop-stop, never a ruling.
3. **Gate 3 — merge** is pre-authorized contingent on the complete verification chain being green: coordinator closure check, deterministic pass (PowerShell only, `node -v` first), adversarial review(s) + triage, rework accepted with tripwires silent. Any red step voids the authorization. Never merge around a red step.
4. **Push, PR, and Stage F closure work** authorized within this repo only. Main requires PRs (tools protector ruleset); closure commits go through PRs, never direct to main.
5. **Jira writes**: KONE project only, through the W1-P4 transport, behind the default-deny gate. W3-P4 owns the Jira ticket transition on human approval.

## Queue (strict dependency order — charter D1)
1. **W3-P1** ☐ PENDING — Verification Harness. Standard/standard-feature. Single adversarial review. Package scaffold + `recordBuildResult` + `runHarness` (named-test AC convention) + `allocateSequence`.
2. **W3-P2** ☐ PENDING — Adversarial Reviewer dispatch-and-collect. D3 re-ratified 2026-07-24: headless `claude -p` launch from the emitted reviewer worktree (probe AC first; relay fallback + stop-report on probe failure). Architecture/risk — frontier builder, dual adversarial review. Shape against the redrawn D3 (PAR-1) + the launch ruling.
3. **W3-P3** ☐ PENDING — Stage-D pipeline runner + rework routing. Standard/standard-feature. Single adversarial review. Assembles and emits the frozen `VerificationVerdict` stage envelope; implements rework cap (attempt count from receipt chain, never from session state).
4. **W3-P4** ☐ PENDING — Human review gate + Jira ticket update. Standard/standard-feature. Single adversarial review. Precondition: `verdict: pass` VerificationVerdict envelope from P3.
5. **SCAF-P3** ☐ PENDING — Exit proof vehicle. **Shaping precondition: W3-P1 spec must pass coordinator lint first** (so SCAF-P3's ACs can bind to the named-test convention defined in P1's spec). Standard/standard-feature. Single adversarial review. Shape → register (W1) → dispatch (W2) → builder runs out-of-band → `recordBuildResult` → harness → adversarial review → rework routing → human gate → ticket update.

## Per-iteration algorithm
1. Read this directive + the charter; identify the active queue item and its current loop step. Re-check SCAF-P3's precondition (P1 lint-passed) and W3-P2's precondition (D3 re-ratified) on every iteration.
2. Advance as far as the iteration allows. Shaping agents, builders, and reviewers are fresh background agents; every dispatch (including rework) opens with a Step 0 restate-and-stop gate; branch + worktree named in the kickstarter (`C:\Repos\foreman-line-w3-<parcel-slug>`); emit the parcel's permission-profile envelope at dispatch via the shipped emitter (lesson #18 — never pre-create the worktree by hand).
3. Verify every claim on disk before accepting it. Wrong-shaped claims are presumptively empty. Confirm a real commit exists on the branch before dispatching any review.
4. Deterministic passes in PowerShell only, `node -v` first (repo root `engines.node >= 24.11.1`); never read exit code through a truncated pipeline (lesson #11).
5. One review for standard-feature parcels (P1, P3, P4, SCAF-P3); two independent reviews for architecture/risk (P2). Reviewers never fix, never commit; hostile-input probing licensed. Reproduce disputed findings before triage.
6. On acceptance: paper trail rides in the parcel PR; PR body carries the verification-chain table; merge under authorization 3; Stage F (spec → done/, worktree/branch cleanup, lessons appended, this directive's state line updated).
7. Next queue item.

## Key parcel-specific notes

### W3-P1 shaping checklist (package scaffold + harness)
- [ ] Spec defines the named-test AC convention as a non-frozen convention doc in `verification/` (e.g., `verification/AC-CONVENTION.md`) — this is the living reference SCAF-P3 will bind to
- [ ] `recordBuildResult` signature: `(workflowId, dispatchReceiptLocator, branch, commitShas, touchedSurfaces)` — reads Stage-C receipt hash for `prevHash` chaining; writes `BuildResult`-typed Stage-D sub-receipt; returns locator
- [ ] `allocateSequence(workflowId)` is the single monotonic allocator for all Stage-D sub-receipts — reads highest existing sequence in `docs/receipts/<workflowId>/`, increments; all P1/P2/P3/P4 sub-receipts call this
- [ ] Verify `ReceiptDocument` field names on disk before writing any receipt code (field is `stage`, not `stageId`; per-claim uses `kind: 'claim'` + `claimRef` — confirm against shipped `receipts/` validator)
- [ ] Package scaffold follows W1/W2 pattern exactly (package.json, tsconfig.json, biome.json, src/index.ts); engines.node matches root
- [ ] Linear-time string ops from the start (lesson #19) — any harness regex must survive CodeQL polynomial-redos check

### W3-P2 shaping checklist (gated on D3 re-ratification)
- [ ] **First AC = launch probe**: headless `claude -p` session started with cwd in the emitted reviewer worktree provably loads that worktree's `settings.local.json` (deny rules observed in-session); probe is fixture-isolated (lesson #21); probe failure → relay fallback + stop-report, not a silent downgrade
- [ ] Reviewer session launched via the ratified headless-CLI mechanism with zero coordinator triage context
- [ ] Kickstarter carries zero coordinator findings — only parcel spec, AC convention reference, and repo canon
- [ ] `parseAdversarialFindings` validates output against the frozen `AdversarialFinding` schema; malformed reviewer output is quarantined and emits a named `parse-failure` receipt (hostile-input AC — lesson #12)
- [ ] Adversarial permission profile used: exact registry name `reviewer-readonly`
- [ ] Two independent adversarial reviews (architecture/risk, lesson #12)

### W3-P3 shaping checklist (rework routing)
- [ ] Attempt count derived from receipt-chain walk (`ReworkSignal` receipts in `docs/receipts/<workflowId>/`) — never from session state
- [ ] Original build = attempt 0; first rework = attempt 1; second rework = attempt 2; third failure = stop condition
- [ ] `ReworkSignal` emitted per the frozen `rework-signal.schema.json` on every rework decision
- [ ] `VerificationVerdict` assembled and emitted by P3 (not P4) — P3 owns the verdict, P4 consumes it
- [ ] Adversarial review re-runs after rework only if the rework touched code (not docs-only rework)

### W3-P4 shaping checklist (human gate + Jira)
- [ ] Precondition: `verdict: pass` VerificationVerdict envelope present on disk before P4 invoked
- [ ] CLI one-tap approval pattern mirrors W2-P2 exactly
- [ ] Jira transition wrapped in typed try-catch (lesson #22); approve-then-Jira-fail emits a named `half-closed` state receipt for coordinator retry
- [ ] W1-P4 Jira MCP transport consumed (not rebuilt)

### SCAF-P3 sequencing
- Shape AFTER W3-P1 spec passes coordinator lint (so ACs bind to the convention doc)
- Register via W1 machinery (`jira-workflow` skill, W1-P4 transport)
- Dispatch via W2 machinery (`executeDispatch` CLI)
- Builder session runs out-of-band; coordinator waits for completion notification
- Coordinator calls P1's `recordBuildResult` after builder completes; THEN runs harness
- Content must stay under ~200-token Kompress dispatch-context ceiling (lesson #23) — size at shaping

## Stop conditions (ScheduleWakeup stop:true, then report to Clint — no mid-loop questions)
- A frozen contract needs modification (`plugins/foreman-line/contracts/` or shipped validator surfaces)
- A tripwire fires twice on one parcel
- A security finding can't close in-parcel
- Anything outward-facing beyond the standing authorizations
- Rework cap exceeded (third failure on one parcel) — stop, structured failure report; no third rework without explicit authorization
- W3-P2 automated dispatch leaks coordinator context into reviewer session — architectural invariant violation
- `ReceiptDocument` / `VerificationVerdict` schema incompatibility with frozen W0 contract — loop-stop, not a ruling
- SCAF-P3 cannot be shaped to ≥3 harness-checkable ACs without touching a frozen boundary — stop and report

## Wakeup pacing
Blocked only on a running background agent → 1200–1800s fallback wakeup and yield; completion notifications are the primary wake signal. Actively coordinating → keep working. Never poll harness-tracked agents.

## Crash recovery
On any wake, if a builder/reviewer result was expected: check task state first. No completion claim = process death, not completion; worktree contents are UNCLAIMED. Recover with a fresh resume-directive dispatch whose Step 0 restates the ORIGINAL directive, inventories disk against it, states the live test count, flags gaps, and STOPS for a ruling.
