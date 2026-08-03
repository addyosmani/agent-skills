---
ticket: KONE-TBD
title: Foreman Line - CLOSE-P1 minted-chain exit vehicle (live seam wiring + real A->F run)
status: active
owner: clinton.morgan
created: 2026-07-28
updated: 2026-07-28
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/integration/, plugins/foreman-line/docs/specs/, docs/receipts/]
routing_class: architecture/risk
permission_profile: builder-architecture
---

# CLOSE-P1 — Minted-chain exit vehicle

## Intent

Close W4 exit item 6 honestly (charter D2/D3, goal `w4-closeout`): wire the live seams no test
has ever exercised (lesson #28) — FUP-2 (Stage F through the real `emitClosureReceipt`), RW3
(caller passes the chain-tip), and W4-P1-FUP-1 (GitHub effective-rules JSON →
`EffectiveRulesResponse` normalization) — and then use **this parcel's own lifecycle as the run
vehicle**: its shaping, registration-equivalent, dispatch, verification, integration (a real PR),
and closure (a real human merge) each emit a receipt into ONE fresh chain under `docs/receipts/`,
sealed A→F. The coordinator's deterministic exit pass (not the parcel's tests) proves
`validateChain` + `isSealed` + the explicit stage sequence `['A','B','C','D','E','F']`, with the
Stage-E/F subjects cross-checked against `gh` (plan-review S1/B1 amendments).

## Constraints

- Standing constraints apply — `plugins/foreman-line/docs/kickstarters/STANDING-CONSTRAINTS.md`.
  Load-bearing here: **Builder #1** (typed try-catch at every external boundary), **Builder #2**
  (seams the tests never exercise return `unknown`/raw — normalization happens explicitly at the
  boundary where it can be tested against a real response), and **Builder #12** (parcel-time
  freezes live in the coordinator's deterministic pass, never in the shipped suite — no byte-pins).
- **D2 (charter, lesson #33):** exit item 6 is satisfied ONLY by real receipts persisted on disk
  with the three exit-pass assertions green over the minted chain — never by fixtures. Emitters
  invoked against the pre-existing A→D chain (`docs/receipts/1912af36-…`) with hand-assembled
  subjects do NOT satisfy it (S1). That chain and `bfdba601-…` stay untouched (orphaned, per W4).
- **D6 (charter, re-ratified):** the vehicle PR is merged by **Clint, not an agent**. The Stage-F
  receipt is therefore emitted by the coordinator AFTER the human merge, with the real merge SHA.
- **Hermetic suite stays hermetic:** `plugins.yml` runs every package's tests blocking; no test
  in this parcel performs network/`gh`/`git` calls. The live A→F emission is coordinator-side
  procedure, not test code.
- **Frozen surfaces:** no edit to `plugins/foreman-line/contracts/` (loop-stop), no edit to
  `receipts/`, `approval/`, `verification/`, `dispatch/`, `registration/`, `shaping/` packages,
  no edit to `.github/workflows/*` (CLOSE-P3 owns those; standing authorization 5 does not cover
  this parcel). `IntegrationError`'s union may gain a member only if a new typed error class is
  not used instead — prefer a new standalone error class (SCAF-P4 Q2 precedent).
- **Chain-tip discipline (RW3):** every live emission passes the true on-disk chain tip
  (highest-sequence receipt of the minted workflow directory) as `priorReceipt`. The runner
  reads it via a local conforming-name scan (mirror `closure.ts`'s `defaultLoadReceiptChain`
  pattern; typed try-catch, linear-time name checks — lessons #19/#22).
- **No self-graded claims (D4-the-decision):** no stage's receipt is emitted by the agent whose
  work it attests. See the per-stage emitter table below; the exit pass is coordinator-owned.

## Design — what the builder ships (code, hermetically testable)

One new module cluster in `plugins/foreman-line/integration/src/`, additive exports only:

1. **`normalizeEffectiveRules(raw: unknown): EffectiveRulesResponse`** (W4-P1-FUP-1).
   Validates and maps raw GitHub effective-rules JSON (the `gh api
   repos/:owner/:repo/rules/branches/:branch` array shape) into the package's
   `{rules, bypassActors}` shape. Any shape mismatch throws a typed error
   (`EffectiveRulesNormalizationError extends Error`, `.name` set) — typed-closed, never a cast,
   never a partial/defaulted result (Builder #1/#2). Bypass-actor extraction: absent bypass data
   normalizes to `bypassActors: []` ONLY if the raw shape genuinely carries no bypass field for
   the branch-rules endpoint — the builder verifies the real shape from the captured fixture and
   documents which raw field maps to `bypassActors`; guessing is a stop condition.
2. **Captured-response fixture.** The coordinator captures ONE real response from the live
   endpoint (pre-dispatch, attached to the dispatch kickstarter) and the builder checks it in as
   `integration/tests/fixtures/effective-rules-live-capture.json` with a provenance header
   comment (capture date, command). Tests run `normalizeEffectiveRules` against this REAL
   capture (positive) and against mutated copies (negative: missing `type`, non-array root,
   wrong field types — one test per invalid shape, Builder #3 spirit).
3. **`mint-chain` runner functions** (e.g. `integration/src/exit-vehicle.ts`): thin, exported
   stage-runner functions the coordinator invokes live — each loads the on-disk chain tip for a
   given `workflowId`/`repoRoot`, then calls the REAL existing emitter with the real default
   `writeReceiptDocument` (no injected stub in live use):
   - `runStageE({workflowId, repoRoot, prRef, headSha, ciJobs, auditTrigger})` → chain-tip scan →
     `emitIntegrationReceipt` with `prRef` carrying the real PR number and the subject carrying
     the real head SHA (see Open Q1 for field placement within the frozen `IntegrationResult`).
   - `runStageF({workflowId, repoRoot, closureRecord})` → chain-tip scan → the REAL
     `emitClosureReceipt` (FUP-2) — NOT a bespoke Stage-F writer, NOT `executeClosure` (the Jira
     leg is deferred debt; `executeClosure` hard-requires a transport).
   Hermetic tests exercise both runners against temp-dir chains with injected `writeFn` where
   asserting write behavior, and with the real write into a temp `repoRoot` for the chain-walk
   assertions. The runners refuse (typed error) when the loaded chain tip's stage is not the
   expected predecessor (E expects tip `D`; F expects tip `E`) — this is the RW3 defensive
   closure of the caller-passes-tip contract.

## Design — how the parcel's own lifecycle mints the chain (live procedure, coordinator-owned)

A fresh `workflowId` (new UUID, new `docs/receipts/<workflowId>/` directory) is minted at
Stage A. `correlationId` is minted once at Stage A; every later stage inherits it from the
on-disk chain tip (the shipped emitters enforce this). The chain contains **exactly six
`kind:'stage'` receipts, sequences 0–5** — no claim sub-receipts (see Open Q2).

| Stage | Event it records | Emitted by | Emitter path | Subject correlation source |
|---|---|---|---|---|
| A | This spec's shaping/promotion | Coordinator, at coordinator lint/promotion | `shaping/` package's ShapingResult emitter | Mints `workflowId` + `correlationId` (fresh chain) |
| B | Registration-equivalent — **no Jira** (charter S2a deferred debt); subject records `ticketKey: 'KONE-TBD'` and an explicit `jiraLeg: 'deferred'` marker if the frozen `RegistrationResult` shape permits, else the deferral is recorded in the B-receipt's coordinator notes | Coordinator | `registration/` package's receipt emitter with the Jira transport unexercised (no MCP call) | Inherits from tip (A) |
| C | Builder dispatch of this parcel | Coordinator, at dispatch | `dispatch/` approval-CLI Stage-C path | Inherits from tip (B) |
| D | The adversarial review verdict on the builder's work | Coordinator, from the reviewer's relayed verdict — never the builder | `verification/` verdict-receipt emission (single stage receipt; see Open Q2) | Inherits from tip (C) |
| E | The REAL vehicle PR: subject names the actual PR number and the PR head SHA observed at emission time | Coordinator, after opening the PR and observing CI | `runStageE` → real `emitIntegrationReceipt` | Inherits from tip (D) |
| F | The REAL human merge: subject (`ClosureRecord`) names the actual merge SHA `gh` reports | Coordinator, AFTER Clint merges (D6) | `runStageF` → real `emitClosureReceipt` (FUP-2) | Inherits from tip (E) |

**Receipt persistence vs. the PR it describes (the head-SHA chicken-and-egg):** receipts A–D are
minted before the vehicle PR opens and ride IN the vehicle PR. The E and F receipts describe
events (PR open, merge) that postdate the PR's content, so they cannot ride in it: the
coordinator persists E and F to `main` in a follow-up **docs-only receipts-persistence PR**
(standing Gate-3 authorization applies to that PR — it is not the D6 human-merge vehicle). The
E subject's head SHA is the vehicle PR head at emission; the coordinator's `gh` cross-check
asserts that SHA is a commit of the vehicle PR (`gh pr view <n> --json commits,headRefOid`),
tolerating later commits only if the recorded SHA remains in the PR's commit list.

**Effective-rules normalization live use:** before opening the vehicle PR, the coordinator runs
`fetchEffectiveRulesLive` → `normalizeEffectiveRules` → `verifyBranchProtectionPosture` and
records the verdict in the loop directive (lesson #15). This is the first-ever live traversal of
that seam; a normalization throw on the real response is a stop-and-report, not a hotfix.

## Acceptance Criteria

### (a) Code ACs — hermetic, builder-owned

1. `normalizeEffectiveRules` exported from `integration/src/index.ts` (additive append);
   positive test consumes the checked-in REAL captured fixture and yields an
   `EffectiveRulesResponse` accepted by `verifyBranchProtectionPosture` without a cast.
2. Typed-closed negatives: one test per invalid shape (non-array/non-object root, missing/wrong
   `type` on a rule entry, wrong bypass field type, `null`, string input) — each throws
   `EffectiveRulesNormalizationError`; none returns a defaulted/partial response.
3. `runStageE`/`runStageF` exported; each loads the chain tip from a temp-dir on-disk chain and
   passes it as `priorReceipt` (RW3): a test asserts the emitted receipt's `sequence`/`prevHash`
   derive from the true highest-sequence receipt even when lower-sequence receipts exist.
4. `runStageF` routes through the real `emitClosureReceipt` (FUP-2): the test asserts the receipt
   is `kind:'stage'`, `stage:'F'`, `subjectKind:'ClosureRecord'`, correlation inherited — and the
   implementation contains no second Stage-F draft-construction path (reviewer verifies by
   reading, not just by test green).
5. Wrong-predecessor refusal: `runStageE` on a chain whose tip is not stage `D`, and `runStageF`
   on a chain whose tip is not stage `E`, each throw a typed error; no receipt is written
   (assert via injected recording `writeFn`).
6. Post-E/F chain-walk test: starting from a synthetic valid A→D temp-dir chain, running the real
   `runStageE` then `runStageF` yields a chain where `validateChain(...).valid === true`,
   `isSealed(...) === true`, and the ordered stage list is exactly `['A','B','C','D','E','F']` —
   the same triple the exit pass asserts, proven bindable in miniature. A mutation companion test
   (lesson #32) breaks each dimension (fork correlation, drop F, reorder) and asserts the
   corresponding check fails.
7. `npx tsc --noEmit`, `biome check`, and `npx tsx --test tests/*.test.ts` all green in
   `integration/` (hermetic; green under `plugins.yml` on ubuntu-latest). No pre-existing export
   is modified; `errors.ts` byte-unchanged unless the coordinator rules otherwise.

**These fixture-based ACs prove the machinery, not the exit criterion** — D2: no code AC's green
counts toward exit item 6.

### (b) Live-run ACs — coordinator-owned at Stage E/F (verify-at-probe, lesson #21)

8. A fresh `docs/receipts/<new-workflowId>/` chain exists on `main` with exactly six stage
   receipts A→F, minted by the per-stage procedure above during this parcel's own lifecycle.
9. Stage-E subject names the real vehicle PR number and a head SHA that `gh pr view` confirms is
   a commit of that PR. Stage-F subject's `mergeSha` equals the merge SHA `gh` reports for the
   vehicle PR (`gh pr view <n> --json mergeCommit`). Both cross-checks recorded in the loop
   directive with the exact commands and outputs.
10. The Stage-F receipt was emitted after Clint's merge (D6) — the F receipt's timestamp
    postdates the merge event `gh` reports.
11. The live `fetchEffectiveRulesLive → normalizeEffectiveRules → verifyBranchProtectionPosture`
    traversal ran against the real API before the vehicle PR opened; verdict recorded.

### (c) Exit-pass ACs — coordinator-owned, deterministic

12. The coordinator's deterministic pass (a one-off script over the minted chain on `main`, not a
    shipped test — Builder #12) asserts ALL THREE: `validateChain` valid, `isSealed` true, and
    the receipts' ordered stage values exactly `['A','B','C','D','E','F']`.
13. Bind-proof (lesson #32): the pass is additionally run against three mutated in-memory copies
    (forked `correlationId`; F receipt removed; E/F swapped) and each mutation turns the
    corresponding assertion red. Outputs recorded in the loop directive.

## Out of Scope

- **The Jira leg** — no KONE ticket mint, no MCP transition/comment, no `executeClosure` /
  `retryHalfClosedClosure` live invocation (charter S2a deferred debt; a future parcel).
- **D4 ruleset hardening** — no ruleset/branch-protection write of any kind; this parcel only
  READS effective rules.
- **CLOSE-P2** (spec-linter corpus reconciliation) and **CLOSE-P3** (already shipped; its files
  `plugins.yml` / `foreman-line-ci.yml` are untouched here).
- **The orphaned pre-existing chains** `docs/receipts/1912af36-…` and `bfdba601-…` — byte-
  untouched, never used as substrate, never "completed" with E/F receipts.
- **The spec-linter** — no linter code, config, or CI change.
- **Frozen contracts** (`plugins/foreman-line/contracts/`) and all shipped packages other than
  `integration/` — read-only consumption.
- **SCAF-P4-FUP-1 / SCAF-P4-FUP-3 / W4-FUP-AUDIT** — deferred debts, not this parcel.

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-closeout/charter.md` — CLOSE-P1 row, D2, D3, D6,
  exit item 1 (as amended). Findings: `plan-review-findings.md` — S1, S2, B1, I1 (this parcel
  runs under the stricter net CLOSE-P3 built; `integration/src/index.ts` was lint-fixed there).
- Seams wired: `integration/src/closure-receipt.ts` (`emitClosureReceipt`),
  `integration/src/receipt.ts` (`emitIntegrationReceipt`, `WriteReceiptFn`),
  `integration/src/branch-protection.ts` (`fetchEffectiveRulesLive`, `EffectiveRulesResponse`),
  `integration/src/closure.ts` (`defaultLoadReceiptChain` pattern to mirror locally).
- Validators the exit pass binds to: `receipts/src/validator.ts:170-189` (`validateChain`),
  `:192-196` (`isSealed` — reads only the tip, hence the B1 stage-sequence assertion).
- Predecessor follow-ups carried: `docs/specs/done/W4-P1-integration-stage-e.md` (§Follow-ups —
  W4-P1-FUP-1, RW3); `docs/specs/done/SCAF-P4-exit-vehicle.md` (FUP-2 provenance; the fixture
  A→F proof this parcel upgrades to a real run).
- Canon: `docs/SPEC-CONVENTION.md` §4.5; `docs/transcripts/defects_lessons.md` #15, #19, #21,
  #22, #28, #32, #33.

## Open Questions — RULED at coordinator lint (2026-07-28)

- **Q1 — RULED.** `prRef` (free `string` in the frozen shape — verified `integration/src/receipt.ts:45`)
  carries the exact format `pr-<number>@<full-40-char-head-sha>` (e.g. `pr-104@a1b2…`). No
  contract edit; the exit-pass S1 cross-check parses this format and matches the SHA against the
  vehicle PR's commit list via `gh`. Builder pins the format with a parse helper + test.
- **Q2 — RULED: single Stage-D verdict receipt (proposal accepted).** The vehicle's D receipt is
  ONE coordinator-emitted verdict-stage receipt from the relayed dual-review verdict, bypassing
  the claim-emitting pipeline. The exactly-`['A'..'F']` six-receipt assertion stands as the
  charter ratified it. Reasoning recorded: the W3 claim machinery was already proven live on
  `1912af36-…`; this vehicle exists to prove E/F emission + sealing, and every one of its six
  receipts still records a real event. A fuller-fidelity chain with claim sub-receipts would
  need a Gate-1 re-ratification of the sequence wording — deliberately not sought.
- **Q3 — RULED: honest emptiness.** `registrationResultSchema` has no `minItems` (verified
  `contracts/src/stages/b-registration.ts:30-31`), so the deferred-Jira Stage-B subject is
  `{ticketKeys: [], links: []}` — schema-valid and truthful. The receipt's claim text names the
  charter's S2a deferral. Inventing ticket keys is prohibited.
- **A1 — FLAG-1 ruling recorded (2026-07-28, coordinator).** The branch-rules endpoint carries no
  bypass-actors field (verified live; lesson #15's API-surface split). Ruled design:
  `normalizeEffectiveRules(raw)` normalizes the branch-rules response only;
  `normalizeRulesetBypass(raw)` normalizes the ruleset endpoint's bypass shape;
  `composeEffectiveRules` joins them typed. **Live-run procedure (AC11):** the coordinator queries
  the bypass of EVERY distinct `ruleset_id` appearing in the branch-rules response (the capture
  names 8520252, 19044225, 19402394) and composes the union — an unqueried ruleset's bypass
  defaulting to empty would fail toward the GOOD posture verdict on a security control (reviewer
  B, SF-3). **A1 supersedes the Design-item-1 single-function signature.**

## Verification Plan

- **Dual review (charter: architecture/risk).** Two independent adversarial reviewers; standing
  reviewer rules apply (STANDING-CONSTRAINTS §Reviewer, esp. #11 mutate-to-prove and #12
  hostile-input probing on `normalizeEffectiveRules`).
- **Mandated reviewer focus questions:**
  1. **The S1 trap:** does any AC, test, or runner path permit a fixture or hand-assembled
     subject to stand in for the real PR/merge events — including the pre-existing
     `1912af36-…` chain as substrate? Attempt the naive reading: could a builder satisfy every
     code AC and the coordinator still be handed a fixture wearing a disk path?
  2. **Exit-pass binding (lesson #32):** are `validateChain`, `isSealed`, AND the explicit
     stage-sequence assertion each actually asserted in the coordinator's exit pass, and does
     each bind to its own invariant? Verify AC13's mutations each turn exactly the matching
     assertion red — `isSealed` reads only the tip; a chain `[A,F]` must fail the sequence
     assertion even though `isSealed` passes.
  3. **Typed-closed normalization (Builder #1/#2):** does `normalizeEffectiveRules` fail closed
     with a typed error on every shape-mismatched effective-rules response, with one negative
     test per structural invariant — and is the positive fixture genuinely a captured real
     response (provenance header present), not a hand-written imitation?
  4. **Self-grading (D4-the-decision):** for each of the six stages, who emits the receipt, and
     can any emitter attest its own work? In particular: the builder must not emit D, E, or F;
     the coordinator must not merge the vehicle PR (D6); and the exit pass must not be a test
     shipped by the builder whose green the builder itself reports.
- Deterministic coordinator gates: lesson #26 `git diff --stat origin/main` pre-PR; post-review
  git-detection control (#24); D4 interlock check on every wake (charter stop conditions).
- **A2 — live-probe refinement of A1's per-ruleset union (2026-07-28, coordinator, discovered at the first live AC11 traversal).** The Enterprise-source ruleset (8520252, repository-visibility policy) omits `bypass_actors` entirely via the repo rulesets endpoint (jq renders the absent key as null); `normalizeRulesetBypass` correctly refuses it fail-closed. Ruled procedure: the bypass union covers every ruleset contributing at least one **merge-gating** rule type (`pull_request`, `required_status_checks`, `code_scanning`, `code_quality`, `non_fast_forward`, `deletion`) in the branch-rules response. A ruleset whose contributed rules are all non-merge-gating (here: `repository_visibility` only) AND whose `bypass_actors` is `null` **or absent** is excluded, with the exclusion recorded in the traversal evidence. `bypass_actors` null-or-absent on a MERGE-GATING ruleset remains a hard stop. The shipped normalizer is unchanged — the filter lives in the coordinator's traversal procedure.
