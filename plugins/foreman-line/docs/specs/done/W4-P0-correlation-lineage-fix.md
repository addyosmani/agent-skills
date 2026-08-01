---
ticket: KONE-TBD
title: Foreman Line - W4-P0 Correlation-lineage fix (Stage-C inherit)
status: active
owner: clinton.morgan
created: 2026-07-26
updated: 2026-07-26
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/dispatch/]
routing_class: architecture/risk
permission_profile: builder-architecture
---

# W4-P0 — Correlation-lineage fix (Stage-C inherit)

## Intent

The shipped dispatch machinery mints a **fresh** `correlationId` at the Stage-C
`DispatchOrder` receipt assembly (`dispatch/src/approval-cli/index.ts:384`,
`correlationId: randomUUID()`). Because the receipts validator's AC5c invariant
(`receipts/src/validator.ts:147-168`, `checkSharedCorrelation`) requires **every**
participant in a chain to share one identical `workflowId` **and** `correlationId`,
any chain that extends past A→B forks its correlation at C and is therefore
`validateChain`-**invalid**. `workflowId` is already threaded correctly
(index.ts:386); only `correlationId` diverges. This parcel makes Stage C
**inherit** the prior stage's `correlationId` — mirroring the already-shipped
Stage-D `inheritCorrelation` pattern (`verification/src/harness/index.ts:314-338`) —
while continuing to mint fresh `sessionId`/`runId`, so newly-minted chains are
`validateChain`-valid.

## Constraints

- **Sole authorized reopen this wave (D3):** the only surface edited is
  `plugins/foreman-line/dispatch/`. No other shipped package is touched.
- **No frozen-contract change (loop-stop guard):** `correlation-context.schema.json`
  pins UUID *format* only, and `STAGE_IDS` already covers A–F
  (`contracts/src/envelope.ts:7`). If the fix appears to require any edit under
  `plugins/foreman-line/contracts/`, that is a **loop-stop** — STOP and report; it
  is not a shaping or build decision.
- **Coordinator-ruled edit surface (in-scope, not an escalation):** the prior
  `correlation.correlationId` is already on disk in the Stage-B receipt that
  `prepareDispatch` already reads and JSON-parses at index.ts:228-254 (it currently
  keeps only `.hash` → `prevHash`). The minimal fix, entirely within `dispatch/`:
  1. In `prepareDispatch`, at the point the Stage-B receipt is already parsed
     (`stageBParsed`, index.ts:248), extract `correlation.correlationId` and assert
     it is a non-empty string.
  2. Carry it on `DispatchPackage` as a new required field
     `priorCorrelationId: CorrelationId` (index.ts:77-86).
  3. In `executeDispatch`'s Stage-C receipt assembly (index.ts:383-388), use
     `pkg.priorCorrelationId` for `correlationId` instead of `randomUUID()`; keep
     minting fresh `sessionId` and `runId`.
- **Fail-loud, never fall back to minting:** if the Stage-B receipt lacks a valid
  string `correlation.correlationId`, throw a typed `DispatchError` with a new code
  `PRIOR_CORRELATION_MISSING` (added to the code union at index.ts:43-52, in the
  `PRIOR_RECEIPT_UNREADABLE` family). Silent fallback to `randomUUID()` is
  forbidden — that is the exact defect being removed.
- **Local helper, not a cross-package import (coordinator ruling Q2):** replicate
  the inherit pattern as a small local function in `dispatch`, wrapped in a typed
  try-catch (Lesson #22), mirroring the harness helper's fail-code/source-label
  shape (`verification/src/harness/index.ts:314-338`). Do **not** import or export
  the harness helper: `verification` consumes `dispatch` output, so a
  `dispatch → verification` edge inverts the dependency direction. The intentional
  pattern-duplication is noted here on purpose.
- **`DispatchPackage` sole-constructor (verified):** grep confirms `prepareDispatch`
  is the only constructor of `DispatchPackage` — every test obtains `pkg` from
  `prepareDispatch` (approval-cli.test.ts, all `pkg = await prepareDispatch(...)`),
  none hand-builds a literal. Adding a required field is therefore not a
  literal-construction breaking change. **However**, the test helper
  `writeStageBReceipt` (approval-cli.test.ts:97-113) writes a fake Stage-B receipt
  with **no `correlation` object**; once `prepareDispatch` requires
  `correlation.correlationId`, every existing test routed through that helper would
  throw `PRIOR_CORRELATION_MISSING`. The helper MUST be updated in-parcel to write a
  valid `correlation` object (with a well-formed `correlationId`).
- **Lesson #22:** the new correlation extraction is an external-shape read; wrap it
  in a typed try-catch that rethrows as `DispatchError`.
- **Lesson #26:** run `git diff --stat origin/main` before opening the PR.
- **Integration is PR-only; spec moves to `done/` in the merge PR.**

## Acceptance Criteria

1. **New `DispatchError` code.** `DispatchError`'s code union gains
   `'PRIOR_CORRELATION_MISSING'` (index.ts:43-52). Additive; no existing code
   removed or renamed.

2. **`DispatchPackage` carries the inherited id.** `DispatchPackage` gains a
   required `readonly priorCorrelationId: CorrelationId` field. `prepareDispatch`
   populates it from the parsed Stage-B receipt's `correlation.correlationId`.

3. **Extraction + fail-loud.** `prepareDispatch` reads
   `stageBParsed.correlation.correlationId`. A test asserts that when the Stage-B
   receipt has a valid `correlation.correlationId`, `pkg.priorCorrelationId` equals
   that exact value. A second test asserts that a Stage-B receipt missing the
   `correlation` object, or with a missing/empty/whitespace-only/non-string
   `correlationId`, throws `DispatchError('PRIOR_CORRELATION_MISSING')` — never a
   silent mint. (The extraction guard rejects `correlationId.trim().length === 0`,
   so a blank or whitespace-only prior id fails loud at `prepareDispatch` rather
   than downstream; RB4-2/RA4-2.)

4. **Stage-C inherits, does not mint.** In `executeDispatch`, the Stage-C receipt
   `correlation.correlationId` is `pkg.priorCorrelationId` (not `randomUUID()`).
   `sessionId` and `runId` remain freshly minted (`randomUUID()`), and `workflowId`
   remains `pkg.candidate.workflowId` as before. A test asserts the written Stage-C
   receipt's `correlation.correlationId === pkg.priorCorrelationId` and that
   `sessionId`/`runId` differ from it. The test also asserts the fresh
   `sessionId`/`runId` differ from the **Stage-B receipt's own** `sessionId`/`runId`
   (not just from the correlationId), so a future regression that inherited B's
   session/run instead of minting would fail (RB4-1).

5. **Regression — chain validates past C (the load-bearing AC).** A
   fixture-isolated test builds a chain `genesis→A→B` as synthetic valid
   `ReceiptDocument` fixtures that all share one `correlationId` (with correct
   `prevHash` linkage and sequences so `validateChain`'s non-AC5c checks also pass),
   runs the **real fixed `executeDispatch`** to produce the Stage-C receipt on disk
   (Stage C MUST execute the fixed inherit code path — not a hand-rebuilt receipt).
   The test asserts BOTH:
   - `validateChain([A, B, C]).valid === true`, and
   - `C.correlation.correlationId === B.correlation.correlationId`.
   (Coordinator ruling Q-D: the regression stops at C — the maximal chain dispatch
   owns end-to-end. Stage D is NOT synthesized here: its inherit logic is already
   shipped/correct, so a synthetic D would assert already-shipped behavior and risk
   drifting from the real D shape. The full A→F `validateChain` proof is deferred to
   SCAF-P4.)

6. **Negative guard.** A test builds a chain whose Stage-C `correlationId` is forked
   (differs from A/B) and asserts `validateChain(...).valid === false` with an error
   naming the AC5c `correlation.workflowId/correlationId diverges` divergence. This
   locks the regression against a future re-introduction of the mint.

7. **No frozen-contract edit.** No file under `plugins/foreman-line/contracts/` is
   modified. (`git diff --stat origin/main` shows changes confined to
   `plugins/foreman-line/dispatch/`.)

8. **Existing tests updated, not weakened.** The `writeStageBReceipt` fixture helper
   is updated to emit a valid `correlation` object so the existing
   `prepareDispatch`/`executeDispatch` suite continues to pass; no existing assertion
   is deleted to accommodate the change.

9. **`npx tsc --noEmit`** passes with zero errors (run in `dispatch/`, PowerShell).

10. **`biome check .`** passes with zero diagnostics (run in `dispatch/`).

11. **All tests pass** via the package's existing test runner
    (`npx tsx --test tests/*.test.ts`), including the new W4-P0 regression and
    negative-guard tests (ACs 3–6).

## Out of Scope

- **Pre-fix on-disk chains are non-migratable.** Existing hash-chained receipts
  (e.g. `1912af36…`, `bfdba601…`) minted before this fix remain AC5c-invalid and are
  NOT migrated, rewritten, or re-hashed. The fix applies only to newly-minted
  chains. Rewriting a hash-chained receipt would break `prevHash` linkage — never do
  it.
- **Any frozen-contract change.** No edit to `correlation-context.schema.json`,
  `STAGE_IDS`, or anything under `plugins/foreman-line/contracts/`. A need to touch a
  frozen contract is a loop-stop, not part of this parcel.
- **Any surface other than `plugins/foreman-line/dispatch/`.** No edit to
  `verification/`, `receipts/`, `approval/`, or `contracts/`. In particular, the
  harness `inheritCorrelation` helper is neither modified nor exported.
- **Full end-to-end A→F `validateChain` proof.** Stage-E and Stage-F emitters do not
  exist yet (they are W4-P1 / W4-P4); the true A→F assertion is deferred to SCAF-P4
  (the exit vehicle). This parcel does NOT synthesize E/F receipts to fake an A→F
  assertion.
- **Status promotion, epics/Jira, receipts, implementation sequencing.** Shaping
  produces the draft only; coordinator lint is the sole promotion authority.

## Follow-ups (accepted, out of scope)

- **RA4-1 (hardening, deferred).** Stage-C `correlation.workflowId` is taken from
  `candidate.workflowId` and is NOT co-validated against the prior (Stage-B)
  receipt's `correlation.workflowId`. AC5c checks both axes (`workflowId` **and**
  `correlationId`), so a divergent `workflowId` would still be caught at
  `validateChain` time — but this parcel does not add a `prepareDispatch`-time
  cross-check of the two workflowIds. It is unreachable in the happy path (the
  spec scopes `workflowId` as already-threaded-correctly, index.ts:386), so this
  is recorded as accepted hardening for a later parcel, not implemented here.

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md` — D1
  (P0 first), D3 (this fix, sole authorized reopen), D9 (chain validity via
  `validateChain`).
- Plan review: `plugins/foreman-line/docs/goals/w4-ci-integration/plan-review-findings.md`
  — PR4-8 defect + fix shape; "Verified-true on disk" (Stage-C mint confirmed on
  chain `1912af36…`; no frozen-contract change needed; AC5c is the binding
  invariant).
- Defect site: `plugins/foreman-line/dispatch/src/approval-cli/index.ts:378-388`
  (Stage-C draft; line 384 is the mint), `:228-254` (Stage-B receipt already parsed;
  `prevHash` extracted, correlation currently discarded), `:43-52`
  (`DispatchError` code union), `:77-86` (`DispatchPackage` shape).
- Pattern to mirror: `plugins/foreman-line/verification/src/harness/index.ts:314-338`
  (`inheritCorrelation`).
- Invariant to satisfy: `plugins/foreman-line/receipts/src/validator.ts:147-170`
  (`checkSharedCorrelation` / `validateChain`).
- Prior contract (the decision being corrected):
  `plugins/foreman-line/docs/specs/done/W2-P2-dispatch-approval-cli.md` — its Receipt
  Chain section explicitly chose `correlationId = randomUUID()` at Stage C.
- Test fixture to update: `plugins/foreman-line/dispatch/tests/approval-cli.test.ts:97-113`
  (`writeStageBReceipt`).
- Canon: `docs/SPEC-CONVENTION.md`; `docs/transcripts/defects_lessons.md`
  (esp. #22 typed try-catch, #26 pre-PR `git diff --stat origin/main`);
  `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`.

## Verification Plan

- **Deterministic, fixture-isolated:** all fixtures write under a temp `repoRoot`
  (per the existing suite's pattern) so the test is Windows/temp-dir safe and does
  not depend on real on-disk chains.
- **Real Stage-C execution is non-negotiable** (AC5): the C receipt in the
  regression must be the output of the actual fixed `executeDispatch`, not a
  reconstruction. A/B are synthetic genesis fixtures; the chain under assertion is
  A→B→C (Q-D ruling). D→F are out of scope (deferred to SCAF-P4).
- **Dual adversarial review (D7):** elevated risk, `architecture/risk` routing —
  two independent reviewers, since this reopens shipped W2 dispatch machinery.

## Open Questions

- **Q-D (Stage-D in the regression) — RESOLVED by coordinator lint 2026-07-26.**
  Ruling: narrow the regression to **A→B→C** (drop the synthetic D). Rationale: the
  fix is fully proven by A→B→C validating + `C.correlationId === B.correlationId` +
  the negative guard (AC6); a synthetic D asserts already-shipped inherit behavior
  and risks drifting from the real D shape. The full A→F `validateChain` proof is
  the SCAF-P4 exit criterion. AC5 and the Verification Plan reflect this.
- **KONE ticket** — `ticket: KONE-TBD` placeholder. Coordinator to assign the real
  KONE key (or confirm W4 build parcels need no Jira registration) before the merge
  PR; not a blocker for build dispatch.
