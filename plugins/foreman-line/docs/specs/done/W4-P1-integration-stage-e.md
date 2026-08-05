---
ticket: KONE-TBD
title: Foreman Line - W4-P1 Integration / Stage-E (commit-push-PR + branch-protection posture + Stage-E receipt emitter)
status: active
owner: clinton.morgan
created: 2026-07-26
updated: 2026-07-26
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/integration/, .github/workflows/foreman-line-ci.yml]
routing_class: standard-feature
permission_profile: builder-standard
---

# W4-P1 — Integration / Stage-E

## Intent

Build **Stage E (Integration)** of the Foreman Line: the capability that takes a
built, Stage-D-**verified** parcel branch and carries it across the integration
boundary. Three testable outputs plus one report-only workflow: (a) **PR-automation**
logic that plans the commit/push/PR-open for a built branch; (b) a **branch-protection
posture verifier** that proves "the agent/coordinator identity cannot merge" from the
GitHub **effective-rules API** (lesson #15) — verified, never assumed; and (c) a
**Stage-E `ReceiptDocument` emitter** (`stage: 'E'`) that captures the integration
outcome and **inherits** the prior stage's `correlationId` from the Stage-D receipt
so the chain stays `validateChain`-valid end-to-end. All logic ships as the sandboxed,
hermetically-tested `plugins/foreman-line/integration/` package of pure/injectable
functions; a new **report-only, non-blocking** `.github/workflows/foreman-line-ci.yml`
invokes it. This parcel builds the *capability*; the live Stage-E receipt is emitted
during SCAF-P4's travel (using this emitter + W4-P3's audit-trigger engine).

## Constraints

- **Build shape (charter D2):** all reversible/testable logic lives in the new TS
  package `plugins/foreman-line/integration/`, mirroring the `dispatch/` package
  pattern exactly — `package.json` (`"type":"module"`, `engines.node >=24.11.1`,
  scripts `typecheck`/`test`/`lint`, `exports { ".": "./src/index.ts" }`),
  `tsconfig.json`, `biome.json`, `src/index.ts` public surface, `tests/*.test.ts`
  run by `tsx --test`. Contracts and shipped helpers are consumed via **relative ESM
  specifiers** (`../../contracts/src/index.js`, etc.) — the bare scoped specifier is
  banned (W0-P4 precedent; see `dispatch` imports).
- **Hermetic tests are mandatory (charter D2 / PR4-5).** `plugins.yml:44-78`
  auto-runs `npm test` on **every** package as a **blocking** gate on
  `ubuntu-latest`. The `integration/` suite MUST therefore be fully hermetic: **no
  secrets, no network, no live `gh`/`git`, no external-repo path.** Every
  side-effect (git push, `gh pr create`, the live effective-rules API call) is an
  **injected function seam** — mirroring `dispatch`'s `dispatchWorktreeFn ?? realDispatchWorktree`
  pattern (`dispatch/src/approval-cli/index.ts:411`). Tests exercise the pure planners
  and the emitter with fixtures and mock seams only.
- **CROSS-PARCEL CORRELATION INVARIANT (load-bearing — from W4-P0).** The Stage-E
  receipt MUST **inherit** the prior (Stage-D) receipt's `correlationId` **and**
  `workflowId`, minting only fresh `sessionId`/`runId`. Minting a fresh
  `correlationId` is **forbidden** — it fails the receipts validator's AC5c invariant
  (`receipts/src/validator.ts:147-167`, `checkSharedCorrelation`) and would break
  SCAF-P4's A→F exit chain. Mirror the shipped inherit pattern
  (`verification/src/harness/index.ts:314-338`, `inheritCorrelation`) as a **local**
  helper wrapped in a typed try-catch (lesson #22); do **not** import/export across
  packages (an `integration → verification` edge would invert the dependency direction,
  same reasoning as W4-P0's local-helper ruling).
- **Receipt assembly mirrors the shipped Stage-C path.** Build the Stage-E draft,
  hash via `sha256Hex(canonicalize(draft))` and write via `writeReceiptDocument`
  (all from `approval/src/index.js`), using `receiptPath(workflowId, sequence, 'E', 'IntegrationResult')`
  (`receipts/src/index.js`) for the locator and `validateReceiptDocument` before
  write — exactly as `dispatch/src/approval-cli/index.ts:434-478` does for Stage C.
  `sequence` and `prevHash` come from the prior receipt (prior `sequence + 1`; prior
  `hash`), not minted.
- **`auditTrigger` is an emitter INPUT, never a baked placeholder (coordinator ruling Q2).**
  The frozen `IntegrationResult` (`contracts/src/stages/e-integration.ts`) requires
  `{prRef, ciJobs, auditTrigger}`. The emitter takes `auditTrigger` (and `prRef`,
  `ciJobs`) as **parameters**; the real value is computed by **W4-P3's**
  `max(declared,derived)` engine at integration time and passed in. W4-P1 does **not**
  emit a live receipt hardcoding `{triggered:false}`. Tests exercise the emitter with
  **fixture** `auditTrigger` values — include both `{triggered:true, reason:...}` and
  `{triggered:false}` — and with **empty AND non-empty** `ciJobs` (both schema-valid:
  `ciJobs` has no `minItems`, `auditTrigger` requires only `triggered:boolean`).
- **No frozen-contract change (loop-stop guard).** No file under
  `plugins/foreman-line/contracts/` is edited. Verified on disk: `STAGE_IDS` already
  enumerates A–F (`contracts/src/envelope.ts:7`); `IntegrationResult` /
  `integrationResultSchema` already exist. A need to touch a frozen contract is a
  **loop-stop** — STOP and report; not a build decision.
- **`foreman-line-ci.yml` is created by the BUILDER, and is report-only (charter D2/D8,
  PR4-9).** This spec *describes* the workflow (see §Workflow scaffold below); the
  builder authors the file post-dispatch. It is the report-only **scaffold** W4-P3/P4
  amend additively; W4-P1 is its sole creator. Required guards (spec constraints):
  (a) `on.pull_request.paths` scoped to foreman-line surfaces only; (b) every job is
  **report-only / non-blocking**; (c) the builder adds **no** job to any required-status
  set; (d) its path filter MUST NOT re-run the per-package suites `plugins.yml`
  already owns (PR4-9 — one named owning workflow per check). Any future promotion to
  *required status* is an explicit human stop-and-present (D8), out of this parcel.
- **Branch-protection verifier is a read-only assertion over an INJECTED payload
  (coordinator ruling Q3).** The package function asserts, over an effective-rules API
  response supplied as a parameter (fixtured in tests), that the coordinator/agent
  identity **cannot merge**. The real GitHub effective-rules API call is an injected
  seam exercised live only at exit by the coordinator/human. **Ruleset configuration
  is NEVER agent-applied** (D8 outward-facing carve-out).
- **Lesson #26:** run `git diff --stat origin/main` before opening the PR (standing
  per-parcel gate; P0–P4 land serially to main between builder branches).
- **Integration is PR-only; spec moves to `done/` in the merge PR.**

## Acceptance Criteria

1. **Package scaffold.** `plugins/foreman-line/integration/` exists with
   `package.json`/`tsconfig.json`/`biome.json`/`src/index.ts`/`tests/`, mirroring the
   `dispatch/` package shape (`"type":"module"`, `engines.node >=24.11.1`, scripts
   `typecheck`/`test`/`lint`, single `exports` entry). Its public surface
   (`src/index.ts`) exports the PR-plan function(s), the branch-protection verifier,
   and `emitIntegrationReceipt`.

2. **Stage-E receipt emitter — signature + inheritance.** `emitIntegrationReceipt(...)`
   is a pure function parameterized by (at least) `prRef: string`, `ciJobs: readonly CiJobOutcome[]`,
   `auditTrigger: AuditTriggerEvaluation`, the **prior Stage-D `ReceiptDocument`** (for
   correlation inheritance + `prevHash` + `sequence`), and an injected write seam +
   `repoRoot`. It produces a `stage:'E'`, `kind:'stage'`, `subjectKind:'IntegrationResult'`
   receipt whose `subject` is exactly `{prRef, ciJobs, auditTrigger}`. A test asserts
   the written receipt's `correlation.correlationId === priorReceipt.correlation.correlationId`
   and `correlation.workflowId === priorReceipt.correlation.workflowId`, while
   `sessionId`/`runId` are freshly minted (differ from the prior receipt's, and from
   the correlationId).

3. **Fail-loud on a bad prior receipt.** If the prior receipt lacks a valid string
   `correlation.correlationId`/`workflowId`, the emitter throws a typed error (its own
   error class, mirroring `DispatchError`'s shape) — it **never** falls back to minting
   a fresh `correlationId`. A test asserts the throw on a prior receipt with a
   missing/empty/whitespace-only/non-string `correlationId`, **and** a separate test
   asserts the throw on a prior receipt with a valid `correlationId` but a
   missing/empty/whitespace-only/non-string `workflowId` (locks the `workflowId`
   guard branch independently — review finding RW2).

4. **Sequence + prevHash chaining.** The emitted receipt's `sequence` is
   `priorReceipt.sequence + 1` and `prevHash` is `priorReceipt.hash`; `hash` is
   `sha256Hex(canonicalize(draft-without-hash))`; the document passes
   `validateReceiptDocument(...).valid === true`; and the locator is
   `receiptPath(workflowId, sequence, 'E', 'IntegrationResult')`.

5. **`auditTrigger` + `ciJobs` are honest inputs (load-bearing — coordinator ruling Q2).**
   Tests exercise the emitter across fixture `auditTrigger` values **both**
   `{triggered:true, reason:<string>}` **and** `{triggered:false}`, and across **empty**
   AND **non-empty** `ciJobs` arrays, asserting each round-trips into `subject`
   unchanged. No test relies on a hardcoded placeholder trigger.

6. **Chain validates through E (the load-bearing chain AC).** A fixture-isolated test
   builds a synthetic valid chain `genesis→A→…→D` of `ReceiptDocument` fixtures that all
   share one `correlationId`/`workflowId` (correct `prevHash` linkage + contiguous
   `sequence` so `validateChain`'s non-AC5c checks also pass), runs the **real
   `emitIntegrationReceipt`** to produce the Stage-E receipt on disk, and asserts BOTH:
   - `validateChain([...A..D, E]).valid === true`, and
   - `E.correlation.correlationId === D.correlation.correlationId`.
   (Mirrors W4-P0's AC5. The full A→F proof remains the SCAF-P4 exit criterion — Stage F
   is not synthesized here.)

7. **Negative guard.** A test builds a chain whose Stage-E `correlationId` is forked
   (differs from A–D) and asserts `validateChain(...).valid === false` with an error
   naming the AC5c `correlation.workflowId/correlationId diverges` divergence. Locks the
   regression against a future re-introduction of the mint.

8. **Branch-protection posture verifier.** A read-only function consumes an
   effective-rules API response (parameter; fixtured in tests) and returns a structured
   verdict asserting whether the coordinator/agent identity can merge. Tests cover:
   (a) a ruleset that **binds** the identity (require-PR + required-checks, no bypass) →
   verdict "cannot merge" (posture OK); (b) a ruleset with a bypass actor / missing
   require-PR → verdict "can merge" (posture FAIL). The live GitHub API call is an
   injected seam; **no test performs a network call.**

9. **PR-automation planner.** A pure function assembles the commit/push/PR-open plan
   for a built branch (branch name, base, PR title/body from inputs) with the actual
   git/`gh` operations behind an **injected** seam (default = real, tests = mock). A
   test asserts the assembled plan for given inputs and that the mock seam is invoked
   with the expected arguments; **no test shells out to real `git`/`gh`.**

10. **`foreman-line-ci.yml` is described, not created during shaping; builder creates
    the report-only scaffold.** The spec's §Workflow scaffold gives the concrete initial
    content. The builder's file satisfies guards (a)-(d) from Constraints; a reviewer
    can confirm the workflow adds no required-status job and does not duplicate
    `plugins.yml`'s package-test gate.

11. **`npx tsc --noEmit`** passes with zero errors (run in `integration/`, PowerShell).

12. **`biome check .`** passes with zero diagnostics (run in `integration/`).

13. **All tests pass** via `npx tsx --test tests/*.test.ts`, including ACs 2-9. The
    suite is hermetic (no network/secrets/external-repo path) so it is green under
    `plugins.yml` on `ubuntu-latest`.

## Out of Scope

- **The audit-trigger engine (`max(declared,derived)`) — W4-P3.** W4-P1 accepts
  `auditTrigger` as an input only; it does **not** compute the trigger decision,
  resolve PR→governing-spec, or read `risk:`/`surfaces:`. No `spec-linter` re-enablement.
- **GitHub gate assembly, human-review gate, merge, Jira closure, Stage-F receipt — W4-P4.**
  No `stage:'F'` receipt, no merge automation, no `active/→done/` move of any *other*
  spec, no Jira transition.
- **DocSpine CI hook — W4-P2.** No doc-claim validation, no DocSpine interface.
- **Any live-workflow gating change, branch-protection/ruleset change, or promotion to
  required status (D8 carve-out).** The verifier only *reads* effective rules; it never
  writes/configures a ruleset. `foreman-line-ci.yml` is report-only and adds no
  required-status job. These outward-facing acts are human stop-and-present.
- **Emitting a LIVE Stage-E receipt in this parcel.** W4-P1's verification is hermetic
  unit tests; the live emission happens during SCAF-P4's travel (emitter + P3 engine).
- **Modifying any other shipped package** (`dispatch/`, `verification/`, `receipts/`,
  `approval/`, `contracts/`, `permission-profiles/`). They are consumed read-only via
  relative ESM imports; none is edited.
- **Any frozen-contract change** (`plugins/foreman-line/contracts/`) — a loop-stop.
- **Status promotion, epics/Jira projection, receipt emission during shaping,
  implementation sequencing.** Shaping produces the draft + ShapingResult only;
  coordinator lint is the sole promotion authority.

## Workflow scaffold — proposed initial `.github/workflows/foreman-line-ci.yml`

> Descriptive only; the **builder** creates this file post-dispatch. Report-only,
> non-blocking, foreman-line-path-scoped, and it does **not** duplicate `plugins.yml`'s
> per-package `npm test` gate (PR4-9). W4-P3/P4 amend it additively.

```yaml
name: foreman-line-ci

# Report-only Stage-E/integration checks for the Foreman Line. Non-blocking:
# no job here is a required status (promotion to required is a human step, D8).
# Path filter is foreman-line-scoped and deliberately excludes the per-package
# test surfaces plugins.yml already owns (PR4-9 — one owning workflow per check).
on:
  pull_request:
    paths:
      - 'plugins/foreman-line/integration/**'
      - '.github/workflows/foreman-line-ci.yml'

permissions:
  contents: read

jobs:
  integration-report:
    runs-on: ubuntu-latest
    # Report-only: surfaces the Stage-E integration posture; never blocks the PR.
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - name: Install integration package deps
        run: cd plugins/foreman-line/integration && npm install --no-audit --no-fund
      - name: Report Stage-E integration posture (non-blocking)
        # Invokes the integration package's report entrypoint; annotations only.
        run: cd plugins/foreman-line/integration && npm run report --if-present
```

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md` — D2 (build
  shape: package + report-only workflow; hermetic tests; path filter must not
  double-run `plugins.yml`), D7 (P1 standard / standard-feature / single review),
  D8 (outward-facing carve-out), D9 (Stage-E receipt reuses `ReceiptDocument`,
  `stage:'E'`), the W4-P1 decomposition row + PR4-9 collision discipline.
- Loop directive: `plugins/foreman-line/docs/goals/w4-ci-integration/loop-directive.md`
  — the cross-parcel correlation invariant; `foreman-line-ci.yml` ownership (P1 CREATES,
  P3/P4 AMEND).
- Cross-parcel invariant origin: `plugins/foreman-line/docs/specs/done/W4-P0-correlation-lineage-fix.md`
  (Stage-C inherit; the pattern this parcel mirrors at Stage E).
- Frozen contract (consume, do not edit): `plugins/foreman-line/contracts/src/stages/e-integration.ts`
  (`IntegrationResult` / `integrationResultSchema`); `contracts/src/envelope.ts:7`
  (`STAGE_IDS` A–F); `contracts/src/correlation.ts` (`CorrelationContext`).
- Stage-D hand-off consumed: `plugins/foreman-line/contracts/src/stages/d-verification.ts`
  (`VerificationVerdict`); `plugins/foreman-line/verification/` (Stage-D closure receipt).
- Receipt assembly to mirror: `plugins/foreman-line/dispatch/src/approval-cli/index.ts:434-478`
  (Stage-C build/hash/validate/write); helpers `canonicalize`/`sha256Hex`/`writeReceiptDocument`
  from `approval/src/index.js`, `receiptPath`/`validateReceiptDocument` from `receipts/src/index.js`.
- Correlation-inherit pattern to mirror (local copy, not import):
  `plugins/foreman-line/verification/src/harness/index.ts:314-338` (`inheritCorrelation`).
- Invariant to satisfy: `plugins/foreman-line/receipts/src/validator.ts:147-170`
  (`checkSharedCorrelation` / `validateChain`).
- Package pattern to mirror: `plugins/foreman-line/dispatch/` (package.json, tsconfig.json,
  biome.json, src/index.ts, tests/) and its injected-seam pattern (`dispatchWorktreeFn`,
  `dispatch/src/approval-cli/index.ts:411`).
- Existing CI: `.github/workflows/plugins.yml` (blocking per-package `npm test`, lines 44-78).
- Canon: `docs/SPEC-CONVENTION.md`; `docs/transcripts/defects_lessons.md` (#15 effective-rules
  API for branch protection, #19 linear-time string ops, #22 typed try-catch, #26 pre-PR
  `git diff --stat origin/main`); `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`.

## Verification Plan

- **Deterministic, fixture-isolated:** all receipt fixtures write under a temp `repoRoot`
  (per the `dispatch`/`verification` suite pattern), Windows/temp-safe, independent of
  real on-disk chains. All external effects (git, `gh`, effective-rules API) are mocked
  seams — zero network, zero secrets, zero external-repo path.
- **Real emitter execution is non-negotiable** (AC6): the E receipt in the chain
  regression must be the output of the actual `emitIntegrationReceipt`, not a
  reconstruction. A–D are synthetic fixtures; the chain under assertion is A→…→D→E.
- **Single review (D7):** standard risk, `standard-feature` routing — one reviewer.

## Open Questions (resolved at coordinator lint 2026-07-26)

- **KONE ticket — RESOLVED: keep `KONE-TBD`.** Verified precedent: every shipped wave
  *build* parcel (W0/W1/W2/W3, 20+ specs) carries `ticket: KONE-TBD`; only SCAF *exit
  vehicles* that go through real Jira registration get a KONE key. W4-P1 is a build
  parcel — no Jira registration; `KONE-TBD` is correct.
- **`subjectKind` slug — RESOLVED: `'IntegrationResult'`** (→ locator slug
  `integration-result`, e.g. `000006-E-integration-result.json`), mirroring the shipped
  Stage-C `'DispatchOrder'` convention (`dispatch/src/approval-cli/index.ts:453`).
- **Lint note (non-blocking) — sequence source.** AC4 derives `sequence`/`prevHash` from
  the passed prior Stage-D receipt (`prior.sequence + 1`, `prior.hash`). This is
  deliberate given the no-`integration → verification` import rule (so `allocateSequence`
  is not imported): the emitter's contract is that the **caller passes the chain-TIP
  Stage-D receipt**. The builder must state this precondition in the emitter's doc/types,
  and the reviewer should probe the wrong-prior-receipt (non-tip) case.

## Follow-ups (accepted, out of scope)

Recorded at the single-adversarial-review rework pass (SHIP-WITH-FOLLOWUPS, zero
BLOCKERs). Both are accepted as deliberate scope boundaries of this parcel, not
build-decision gaps — closing either would require live/non-hermetic work this
parcel's Verification Plan explicitly excludes.

- **W4-P1-FUP-1 (from RW1).** `fetchEffectiveRulesLive` returns `unknown`, not
  `EffectiveRulesResponse` — raw GitHub effective-rules JSON does not have this
  package's simplified `{rules, bypassActors}` shape. The full
  GitHub-effective-rules-JSON → `EffectiveRulesResponse` normalization (and its
  validation) is **deferred to SCAF-P4's live exit wiring**: it cannot be
  hermetically tested against the real API (Q3), so it is out of this parcel's
  reach by design. The exit-time caller MUST normalize before calling
  `verifyBranchProtectionPosture` — passing the raw fetch result straight through
  would either throw or silently produce a wrong posture verdict on a security
  control.
- **RW3 (no runtime chain-tip/stage-D guard on `priorReceipt`).** `emitIntegrationReceipt`
  does not verify at runtime that the `priorReceipt` it is given is actually the
  chain-TIP Stage-D receipt (see the Open Questions lint note above) — this is a
  deliberate caller-passes-tip contract, matching the no-`integration → verification`
  import rule (`allocateSequence` stays unimported). SCAF-P4's live wiring is
  responsible for passing the true chain tip; a future parcel may add a defensive
  runtime check if that contract proves fragile in practice.
