---
ticket: KONE-TBD
title: Foreman Line - W3-P1 Verification Harness
status: active
owner: clinton.morgan
created: 2026-07-23
updated: 2026-07-24
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
routing_class: standard-feature
data_classification: internal
surfaces: [plugins/foreman-line/verification/**]
permission_profile: builder-standard
---

# W3-P1 — Verification Harness

## Intent

Create the `plugins/foreman-line/verification/` package (the home for all W3
parcels' Stage-D sub-modules) and implement the deterministic verification
harness: the first layer of Stage D (FOREMAN-LINE-PLAN §2 Stage D.1). The
harness takes a built parcel's Stage-C outputs — the frozen `DispatchOrder`
(`parcelRef`) and `BuildResult` (`branch`, `commitShas`, `touchedSurfaces`) —
plus the parcel spec resolved via `parcelRef` and a structured test result, and
executes the parcel's acceptance criteria as pass/fail checks under the
named-test convention (`AC-CONVENTION.md`, plan-review ruling **F2**). It runs
the verifier-side matrix checks (`test-coverage.check` universal; `kds-sweep`
for `ui/*`; `tenant-isolation` for `tenancy/*`; all blocking — §5a), and emits
one RFC-8785 Stage-D claim sub-receipt per check, chained by `prevHash` from the
Stage-C dispatch receipt through a `BuildResult` bridge sub-receipt.

The harness produces evidence; it never grades its own work and never assembles
the pass/rework verdict — that is W3-P3 (charter D4, D7 as amended). It is
read-only relative to the target parcel's code and branch; its only writes are
Stage-D receipt files under `docs/receipts/<workflowId>/`.

## Architecture

### Package scaffold (mirrors W1/W2 exactly)

Follows the `plugins/foreman-line/dispatch/` package pattern verbatim:
`package.json` (`@foreman-line/verification`, `private`, `"type": "module"`,
`engines.node >= 24.11.1`, `exports: { ".": "./src/index.ts" }`, scripts
`typecheck`/`test`/`lint`), `tsconfig.json` (identical `compilerOptions` to
`dispatch/tsconfig.json`), `biome.json` (identical to `dispatch/biome.json`),
`src/index.ts` (barrel), `src/harness/` sub-module. Runtime deps `{ ajv, yaml }`;
devDeps `{ @biomejs/biome, @types/node, tsx, typescript }` at the versions
`dispatch/package.json` pins. Sub-module extraction beyond `harness/` is deferred
(charter D2).

### Cross-package imports (relative ESM `.js`, no workspace linking)

```
../../contracts/src/stages/c-dispatch.js    — DispatchOrder, BuildResult, buildResultSchema
../../contracts/src/stages/d-verification.js — HarnessClaimResult (frozen return type)
../../receipts/src/index.js                  — ReceiptDocument, receiptPath, validateReceiptDocument
../../approval/src/index.js                  — canonicalize, sha256Hex, writeReceiptDocument
../../skill-injection/src/index.js           — parseSkillInjectionMatrixYaml, validateSkillInjectionMatrix, SkillInjectionMatrix
```

### Three public functions

**`recordBuildResult(workflowId, dispatchReceiptLocator, branch, commitShas,
touchedSurfaces): string`** (ruling **F4** — signature is positional per the
ruling). The Stage-C→Stage-D bridge. Reads the Stage-C dispatch receipt at
`dispatchReceiptLocator` to obtain its `hash` (used as `prevHash`) and its
`correlation` (see chain-identity constraint below). Validates
`{ branch, commitShas, touchedSurfaces }` against the frozen `buildResultSchema`.
Writes a `ReceiptDocument { kind: 'claim', stage: 'D', claimRef: 'build-result',
subjectKind: 'BuildResult', subject: { branch, commitShas, touchedSurfaces },
prevHash: <Stage-C hash>, sequence: <from allocateSequence> }`, validated against
`receiptDocumentSchema`. Returns its locator. Called by the coordinator after the
builder completes, before `runHarness`.

**`allocateSequence(workflowId): { sequence: number; prevHash: string | null }`**
(ruling **F6**, Batch-1 Q2 resolution (a)). Scans
`docs/receipts/<workflowId>/`, considering **only** files whose names match the
6-digit-prefix receipt convention (`^\d{6}-<stage>-<slug>.json`, per
`receipts/src/paths.ts`) — non-conforming files (e.g. `skill-injection.json`)
are ignored. Returns `sequence = highest + 1` and `prevHash = the hash field of
the highest-sequence receipt` (both from disk, never session state — PRF-7
spirit). If no conforming receipt exists, returns `{ sequence: 0, prevHash: null }`
(will not occur in Stage D, where genesis/A/B/C precede). Called fresh before
every sub-receipt write so sequential writes within one run chain correctly.

**`runHarness(input: HarnessInput): Promise<HarnessResult>`** (Batch-1 Q1
resolution (b), Q3 resolution (b)). Orchestrates: reads the spec at
`input.specPath`; extracts `AC-N` labels (linear-time); applies the named-test
convention against `input.testResults` (`{ passed, failed }` test-name arrays
the coordinator produced by running the built parcel's suite); resolves the
`verifier_harness` matrix against `input.buildResult.touchedSurfaces` and invokes
the injected `MatrixCheck` functions for the required checks; emits one Stage-D
claim sub-receipt per AC claim and per matrix claim; returns all
`HarnessClaimResult`s. `async` because `MatrixCheck` is async.

### Types (public)

```typescript
interface TestResults { readonly passed: readonly string[]; readonly failed: readonly string[] }
interface MatrixCheckResult { readonly passed: boolean; readonly evidence: string }
type MatrixCheck = (workflowId: string, surfaces: readonly string[]) => Promise<MatrixCheckResult>
interface MatrixCheckSet { readonly [checkName: string]: MatrixCheck }
interface HarnessInput {
  readonly workflowId: string          // receipt-dir UUID (matches UUID_PATTERN)
  readonly order: DispatchOrder        // carries parcelRef (the ticket key)
  readonly buildResult: BuildResult    // branch, commitShas, touchedSurfaces
  readonly specPath: string            // coordinator-resolved from parcelRef (active/)
  readonly testResults: TestResults
  readonly matrixChecks: MatrixCheckSet
  readonly repoRoot?: string           // defaults to process.cwd(); tests pass a tmp dir
}
interface HarnessResult {
  readonly claims: readonly HarnessClaimResult[]   // AC claims ++ matrix-check claims
  readonly receiptLocators: readonly string[]      // aligned with claims
  readonly blocked: boolean                        // true iff any claim.passed === false
}
```

### Matrix-check selection (inversion of control)

The harness owns the *policy* (which checks are required for which surfaces) and
the caller owns the *implementations*. The harness reads + validates
`skill-injection.yaml` via the skill-injection package, resolves the
`verifier_harness` map against `buildResult.touchedSurfaces` using the frozen
path-segment glob rule (`'*'` always fires; `'prefix/*'` fires iff a surface
`=== prefix` or `startsWith(prefix + '/')` — identical to W2-P5), then invokes
`input.matrixChecks[checkName]` for each required check. A required check with no
injected implementation is a caller misconfiguration → `VerificationError`
(`MATRIX_CHECK_MISSING`), not a silent skip.

### Chain identity (walkable-chain requirement)

`receipts/src/validator.ts` `validateChain` AC5c requires every receipt in a
chain to share `correlation.workflowId` **and** `correlation.correlationId`.
Stage-D sub-receipts therefore inherit both fields from the receipt they chain
from (the Stage-C receipt for the `BuildResult` bridge; the prior Stage-D receipt
for each subsequent claim), minting fresh `sessionId`/`runId` for the current
verification session. Using `generateCorrelationContext()` (fresh `workflowId`)
is forbidden — it breaks the chain (same hazard the W2-P2 spec called out).
`signature` is `null` (frozen: no signing infra this wave).

### Error handling (lesson #22)

`VerificationError extends Error` with a `code` union: `SPEC_UNREADABLE`,
`SPEC_INVALID` (no `AC-N` labels found where ≥1 is required; also duplicate
`AC-N` labels or non-sequential/gapped IDs — AC-CONVENTION §2 mandates
sequential, no gaps), `DISPATCH_RECEIPT_UNREADABLE`, `SEQUENCE_READ_FAILED`,
`MATRIX_UNREADABLE`, `MATRIX_INVALID`, `MATRIX_CHECK_MISSING`,
`MATRIX_CHECK_FAILED` (an injected check throws — distinct from a check
returning `passed: false`), `RECEIPT_WRITE_FAILED` (disk/infra failure at the
receipt write boundary; routes to retry), `BUILD_RESULT_INVALID` (pre-write
`BuildResult` schema-validation failure — the builder emitted an invalid
`BuildResult`; routes to rework — distinct from `RECEIPT_WRITE_FAILED`),
`CHAIN_TIP_MISMATCH` (chain-source consistency guard in `recordBuildResult`:
the on-disk chain tip's `hash` from `allocateSequence` does not equal the
`hash` of the receipt at `dispatchReceiptLocator` — a stale or adversarial
locator would fork the chain), `WORKFLOW_ID_INVALID` (`workflowId` fails the
`UUID_PATTERN` guard at entry to any function that joins it into
`docs/receipts/<workflowId>/` — traversal input fails loud before any
filesystem access), `RECEIPT_EXISTS` (exclusive-write guard: the target
receipt path already exists; the harness never overwrites a receipt).
*(Ratified coordinator amendment per adversarial findings RF-1/RF-2/RF-3/RF-4:
`BUILD_RESULT_INVALID`, `CHAIN_TIP_MISMATCH`, `WORKFLOW_ID_INVALID`,
`RECEIPT_EXISTS` added to the union.)* Every external call — spec read, dispatch-receipt read,
receipt-dir scan, receipt write, matrix YAML parse, and each `MatrixCheck`
invocation — is wrapped in a typed try-catch that rethrows as
`VerificationError`. Both the read boundary and the write boundary get wrapped
(lesson #22, verbatim).

## Constraints

- **Module location:** `plugins/foreman-line/verification/`; harness logic under
  `src/harness/`.
- **Frozen contracts (charter canon — modification is a loop-stop):**
  `HarnessClaimResult`, `BuildResult`/`buildResultSchema`, `DispatchOrder`,
  `ReceiptDocument`/`receiptDocumentSchema`, `StageId`. The harness returns
  `HarnessClaimResult[]` exactly (`claim`/`passed`/`evidence`,
  `additionalProperties: false`). It does **not** emit `VerificationVerdict` or a
  `StageOutput` — that is W3-P3/P4 (charter D7 as amended).
- **Receipt field names verified on disk (ruling F7, D7):** the field is `stage`
  (enum `A`–`F`); there is **no** `stageId`. `kind: 'claim'` receipts carry a
  non-null `claimRef` (validator AC4a); `prevHash` is null iff `sequence === 0`
  (validator AC4b). `subjectKind` slugifies (camel→kebab, lowercased) into the
  filename — `BuildResult` → `...-D-build-result.json`, `HarnessClaimResult` →
  `...-D-harness-claim-result.json`.
- **`recordBuildResult` prevHash source:** the `hash` of the receipt at
  `dispatchReceiptLocator` (the authoritative Stage-C bridge), not "whatever is
  highest" — for the first Stage-D write these coincide, but the explicit source
  is the ruling (F4). Read failure → `DISPATCH_RECEIPT_UNREADABLE`.
- **`allocateSequence` file filter:** only 6-digit-prefixed receipt filenames
  count toward the highest sequence; ignore all others. Sequence parsing is
  linear-time integer parsing of the 6-char prefix, not a backtracking regex.
- **Linear-time string ops (lesson #19):** AC-label extraction and test-name
  matching use char-code loops / `indexOf` / `startsWith`; no regex over
  spec-body or test-name text. The AC-ID match is right-bounded by a non-digit so
  `AC-1` never matches `AC-10` (AC-CONVENTION §4). Must survive CodeQL
  polynomial-redos.
- **Named-test convention is authored in `AC-CONVENTION.md`** (delivered by this
  parcel, non-frozen convention doc — charter/PRF-6). `runHarness` implements it
  exactly; SCAF-P3's ACs bind to it.
- **Matrix-check surface source:** `BuildResult.touchedSurfaces` (what the build
  actually changed — the honest signal per lesson #7), not the spec's declared
  `surfaces:`.
- **Read-only w.r.t. the target parcel:** no git operations on the target
  branch, no reads/writes of the target worktree beyond the coordinator-supplied
  test results and spec path. The harness's only writes are Stage-D receipt files.
- **No `headroom_compress` calls** (harness does no context compression — lesson
  #23 ceiling does not apply here).
- **Deterministic-pass environment (lessons #10, #11):** verify in PowerShell;
  `node -v` first; full-capture before reading `$LASTEXITCODE`.
- **Branch/worktree (lesson #9):** builder works on branch
  `w3-p1-verification-harness` in its own worktree (named in the kickstarter, not
  here).
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

AC-1: The `plugins/foreman-line/verification/` package exists with the W1/W2
scaffold — `package.json` (name `@foreman-line/verification`, `private`,
`"type": "module"`, `engines.node >= 24.11.1`, `exports: { ".": "./src/index.ts" }`,
scripts `typecheck`/`test`/`lint`, deps `{ ajv, yaml }`), `tsconfig.json`
(compilerOptions identical to `dispatch/`), `biome.json` (identical to
`dispatch/`), `src/index.ts`, `src/harness/`.

AC-2: `npx tsc --noEmit` passes with zero errors in `verification/`.

AC-3: `npx biome check .` passes with zero diagnostics in `verification/`.

AC-4: `src/index.ts` exports `recordBuildResult`, `allocateSequence`,
`runHarness`, `VerificationError`, the string constant `AC_CONVENTION_PATH`
(equal to `plugins/foreman-line/verification/AC-CONVENTION.md`), and the types
`HarnessInput`, `HarnessResult`, `TestResults`, `MatrixCheck`, `MatrixCheckSet`,
`MatrixCheckResult`.

AC-5: `recordBuildResult(workflowId, dispatchReceiptLocator, branch, commitShas,
touchedSurfaces)` writes a `ReceiptDocument` with `kind: 'claim'`, `stage: 'D'`,
`claimRef: 'build-result'`, `subjectKind: 'BuildResult'`,
`subject: { branch, commitShas, touchedSurfaces }`, `prevHash` equal to the
`hash` field of the receipt at `dispatchReceiptLocator`, `sequence` from
`allocateSequence`, `signature: null`; validates it against
`receiptDocumentSchema`; and returns its locator. A test provides a temp Stage-C
receipt with a known `hash` and asserts every field and the returned locator.

AC-6: `recordBuildResult` validates its `{ branch, commitShas, touchedSurfaces }`
subject against the frozen `buildResultSchema` before embedding; a test with an
invalid subject (e.g. empty `branch`) asserts a `VerificationError`.

AC-7: `allocateSequence(workflowId)` returns `{ sequence, prevHash }` where
`sequence` is one greater than the highest 6-digit filename prefix in
`docs/receipts/<workflowId>/` and `prevHash` is that highest receipt's `hash`
field; non-conforming files (e.g. `skill-injection.json`) are ignored; an empty
directory yields `{ sequence: 0, prevHash: null }`. Tests cover: a dir with
`000000..000002` receipts (→ `sequence: 3`, `prevHash` = 000002's hash), a dir
containing a `skill-injection.json` (ignored), and an empty dir.

AC-8: `runHarness` reads the spec at `input.specPath` and extracts sequential
`AC-N` labels from its Acceptance Criteria via a linear-time scan; a spec with
no `AC-N` label raises `VerificationError('SPEC_INVALID')`; an unreadable
`specPath` raises `VerificationError('SPEC_UNREADABLE')`.

AC-9: For each `AC-N`, `runHarness` maps test results per the named-test
convention: ≥1 covering test all passing → `{ passed: true, evidence: <names> }`;
any covering test failing → `passed: false`; no covering test → `passed: false`
with evidence `no test references AC-N`. `passed: true` never has empty evidence.
The AC-ID match is right-bounded so `AC-1` does not match a test named `AC-10`.
Tests cover all four situations including the `AC-1` vs `AC-10` boundary.

AC-10: `runHarness` emits one Stage-D claim sub-receipt per AC claim —
`ReceiptDocument { kind: 'claim', stage: 'D', claimRef: '<AC-N: text>',
subjectKind: 'HarnessClaimResult' }` — each chained by `prevHash` via
`allocateSequence`, and each inheriting `correlation.workflowId` and
`correlation.correlationId` from the receipt it chains from. A test asserts the
emitted receipts form a chain that `validateChain` accepts.

AC-11: `runHarness` resolves the `verifier_harness` matrix against
`buildResult.touchedSurfaces` (path-segment glob rule) and invokes the injected
`MatrixCheck` for each required check (`test-coverage.check` always; `kds-sweep`
iff a `ui/*` surface; `tenant-isolation` iff a `tenancy/*` surface); each result
becomes a `HarnessClaimResult` with `claim: 'matrix:<name>'` and its own Stage-D
claim sub-receipt. A required check absent from `input.matrixChecks` raises
`VerificationError('MATRIX_CHECK_MISSING')`; a `MatrixCheck` that throws raises
`VerificationError('MATRIX_CHECK_FAILED')`. Tests use stub checks over
`ui/*`/`tenancy/*`/plain surfaces.

AC-12: `runHarness` returns `HarnessResult { claims, receiptLocators, blocked }`
with `claims` = AC claims followed by matrix claims, `receiptLocators` aligned
one-to-one with `claims`, and `blocked === true` iff any `claim.passed` is false.
A test asserts `blocked` flips with a single failing claim.

AC-13: Every external call in the package — spec read, dispatch-receipt read,
receipt-dir scan, receipt write, matrix YAML parse, and `MatrixCheck` invocation
— is wrapped in a typed try-catch rethrowing `VerificationError` with the
documented `code`. Tests force each failure boundary and assert the code.

AC-14: AC-label extraction and test-name matching are linear-time (char-code /
`indexOf` / `startsWith`); a grep over `src/` finds no backtracking-prone regex
applied to spec-body or test-name text.

AC-15: `plugins/foreman-line/verification/AC-CONVENTION.md` exists and documents
the named-test convention (authoring rules, token-boundary matching, per-AC
reporting table, matrix-check reporting); `AC_CONVENTION_PATH` equals its
repo-relative path.

AC-16: All tests pass via `npx tsx --test tests/*.test.ts` in `verification/`,
and every `AC-N` above is named by at least one test (this parcel dogfoods its
own convention — charter Batch-2 Q6).

AC-17: The package performs no git operation on any target branch, no Jira call,
and no agent-session spawn; a grep over `src/` for such calls returns zero
matches.

## Out of Scope

- **Adversarial review orchestration** — kickstarter generation, reviewer
  worktree, `parseAdversarialFindings` (W3-P2).
- **Rework routing and the rework cap** — build-fix-loop / re-coordination /
  stop-condition (W3-P3).
- **`VerificationVerdict` assembly and the `StageOutput<VerificationVerdict>`
  pipeline output** — W3-P3/P4 own the verdict; the harness only produces
  `HarnessClaimResult[]` + sub-receipts (charter D7 amended, F1 ruling).
- **Human review gate and one-tap approval** (W3-P4).
- **Any Jira write or read** — the harness touches no Jira transport.
- **Any git operation on the target parcel's branch or worktree** — the harness
  is read-only relative to the target; the coordinator runs the built suite and
  passes `TestResults` in.
- **Running the test suite itself** — the coordinator executes the parcel's
  `tsx --test` and constructs `{ passed, failed }` (Batch-1 Q1 (b)); the harness
  consumes names, it does not spawn test processes.
- **Implementing the three matrix-check skills** (`test-coverage.check`,
  `kds-sweep`, `tenant-isolation`) — the harness defines the `MatrixCheck`
  interface and invokes injected implementations; the checks themselves are
  external skills.
- **`headroom_compress` / Kompress** — no context compression here.
- **Modifying any frozen W0 contract or the `skill-injection.yaml` matrix** —
  consume only; modification is a loop-stop.

## Context & References

- `plugins/foreman-line/verification/AC-CONVENTION.md` — the named-test
  convention this parcel delivers and implements (read first).
- `plugins/foreman-line/docs/goals/w3-verification/charter.md` — D2 (single
  package), D7 amended (receipt trail vs. pipeline output), Stop conditions.
- `plugins/foreman-line/docs/goals/w3-verification/plan-review-findings.md` —
  rulings F2 (named-test), F4 (`recordBuildResult`), F6 (`allocateSequence`), F7
  (verify field names on disk).
- `plugins/foreman-line/contracts/src/stages/d-verification.ts` — frozen
  `HarnessClaimResult` (the return type).
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts` — frozen
  `BuildResult` / `buildResultSchema`, `DispatchOrder`.
- `plugins/foreman-line/receipts/src/types.ts`, `paths.ts`, `validator.ts` —
  `ReceiptDocument` shape (`stage`, not `stageId`), `receiptPath` guards, and the
  `validateChain` invariants (AC4a/b claimRef & genesis; AC5c shared
  correlationId — the chain-identity constraint).
- `plugins/foreman-line/dispatch/src/approval-cli/index.ts` — the W2 receipt-
  write + typed-error + injectable-dependency pattern to mirror
  (`ExecuteResult`, `DispatchError`, `writeReceiptDocument`,
  `canonicalize`/`sha256Hex`).
- `plugins/foreman-line/dispatch/src/skill-resolver/index.ts` — the frozen
  path-segment glob resolution to reuse for `verifier_harness` selection.
- `plugins/foreman-line/dispatch/{package.json,tsconfig.json,biome.json}` — the
  exact scaffold to copy.
- `plugins/foreman-line/skill-injection/skill-injection.yaml` (`verifier_harness:`
  section) and `.../skill-injection/src/index.ts` (parse/validate exports).
- `docs/SPEC-CONVENTION.md` §4 (schema v0.2), `docs/transcripts/defects_lessons.md`
  #7, #11, #12, #14, #16, #19, #22, #23.

## Open Questions (design decisions adopted with recommended defaults — coordinator may override at lint)

- **Batch-1 Q1 (test-result input):** adopted **(b)** — coordinator runs the
  built parcel's `tsx --test` suite and passes `TestResults { passed, failed }`
  (test names) into `runHarness`. Keeps the harness free of process-spawning and
  testable with fixtures.
- **Batch-1 Q2 (`allocateSequence` return):** adopted **(a)** —
  `{ sequence, prevHash }`; chain-linkage logic stays co-located.
- **Batch-1 Q3 (matrix-check interface):** adopted **(b)** — IoC `MatrixCheck`
  interface `(workflowId, surfaces) => Promise<{ passed, evidence }>` injected by
  the coordinator; the harness owns which checks are *required* (matrix
  resolution), the caller owns the *implementations*. Testable without real skill
  CLIs.
- **Batch-1 Q4 (public API):** adopted — `src/index.ts` exports the three
  functions + `VerificationError` + `AC_CONVENTION_PATH` + the public types
  (AC-4).
- **Batch-2 Q5 (out of scope):** confirmed — see Out of Scope.
- **Batch-2 Q6 (dogfood):** confirmed — this spec's ACs use `AC-N` labels and its
  tests name each (AC-16).
- **New sub-decision — matrix-check surface source:** `BuildResult.touchedSurfaces`
  (recommended over declared spec `surfaces:` — verifies what was built, lesson
  #7). Flag for coordinator confirmation.
- **New sub-decision — missing injected check:** a required check with no injected
  implementation is a `VerificationError`, not a silent skip (fail-loud on
  misconfiguration).

## Verification Plan

Deterministic: `tsc --noEmit` (AC-2); `biome check .` (AC-3); full `npx tsx
--test tests/*.test.ts` (AC-16); read-only grep confirming no git/Jira/spawn
calls (AC-17) and no backtracking regex over untrusted text (AC-14). Runs in
PowerShell; `node -v` first; full-capture before `$LASTEXITCODE` (lessons #10,
#11).

Single adversarial review (standard/standard-feature — charter D5). Mandated
focus questions:

1. **Receipt field correctness & chain linkage:** confirm emitted receipts use
   `stage` (not `stageId`), `kind: 'claim'` with non-null `claimRef`, correct
   `subjectKind` slugging, `signature: null`; confirm `allocateSequence` produces
   contiguous sequences and correct `prevHash` such that the full
   Stage-C→BuildResult→AC-claim sequence passes `validateChain` — including the
   AC5c shared-`correlationId` invariant (perturb one sub-receipt's correlationId
   and confirm `validateChain` rejects it).
2. **Named-test convention edge cases:** AC with no matching test (must fail, not
   silently pass); an AC ID appearing in multiple test names (all-pass vs
   any-fail semantics); the `AC-1` vs `AC-10` right-boundary; and the test-count
   tripwire (a passing claim must cite non-empty evidence — lesson #7).
3. **Linear-time string ops:** AC-label extraction and test-name matching survive
   hostile input (long dash/whitespace/digit runs) at linear cost — live-probe at
   100k chars, no polynomial backtracking (lesson #19, CodeQL parity).
4. **External-call wrapping:** every read *and* write boundary (spec read,
   dispatch-receipt read, dir scan, receipt write, matrix parse, `MatrixCheck`
   invocation) rethrows `VerificationError`; force each and confirm no foreign
   exception escapes the public API (lesson #22).

## Epic/Story Projection (proposal only — Jira registration is Stage B)

- **Epic:** Foreman Line - W3 Verification
  - **Story:** W3-P1 - Verification Harness
    - **Task:** Scaffold `verification/` package (package.json, tsconfig, biome, index, harness/) — AC-1..AC-4
    - **Task:** `recordBuildResult` + `allocateSequence` (Stage-C→D bridge, sequence allocator) — AC-5, AC-6, AC-7
    - **Task:** `runHarness` AC extraction + named-test mapping + claim sub-receipts — AC-8, AC-9, AC-10
    - **Task:** verifier-side matrix-check resolution + invocation — AC-11, AC-12
    - **Task:** `VerificationError` wrapping + linear-time string ops — AC-13, AC-14
    - **Task:** `AC-CONVENTION.md` + tests dogfooding the convention — AC-15, AC-16, AC-17
