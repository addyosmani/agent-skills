---
ticket: KONE-TBD
title: Foreman Line - W3-P3 Stage-D pipeline runner + rework routing
status: active
owner: clinton.morgan
created: 2026-07-24
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

# W3-P3 — Stage-D Pipeline Runner + Rework Routing

## Intent

Extend the existing `plugins/foreman-line/verification/` package (shipped by
W3-P1/W3-P2 — do **not** rescaffold) with a `src/pipeline/` sub-module
implementing Stage D.3: verdict assembly and rework routing (charter W3-P3 row
as amended; rulings F1, F5). Four concerns:

- **ASSEMBLE:** build the frozen `VerificationVerdict { verdict, harnessClaims,
  adversarialFindings }` from schema-validated harness claims + adversarial
  findings under the mechanical PRF-9 rule: any adversarial finding with
  `severity` ∈ `{high, critical}` → `verdict: 'rework'` regardless of anything
  else; any `harnessClaims[].passed === false` → `'rework'`; otherwise
  `'pass'`. A coordinator-supplied disposition input applies **only** to
  findings below `high` — a disposition targeting a `high`/`critical` finding
  is a typed error, never an override.
- **EMIT:** write the verdict as a Stage-D sub-receipt (chained via W3-P1's
  `allocateSequence`) and as the frozen
  `StageOutput<VerificationVerdict>` envelope — schema-validated against
  `stage-envelope.verification-verdict.schema.json` (which **requires**
  `reworkSignal`; non-null exactly when the verdict is `'rework'`) before any
  write.
- **ROUTE (rework cap table, charter D4; ruling F5):** derive the attempt
  count by counting schema-valid `ReworkSignal` receipts on disk in
  `docs/receipts/<workflowId>/` — never from session state. Attempt 1 →
  generate a build-fix-loop rework kickstarter (small model); attempt 2 →
  generate a frontier re-coordination kickstarter; attempt 3 → emit a
  stop-condition receipt + structured failure report document (the coordinator
  loop-stops; a third rework is never authorized here). Every rework verdict
  emits a `ReworkSignal` receipt per the frozen `rework-signal.schema.json`.
- **LOOP-BACK POLICY (ruling PRF-8):** encode, as data, that the harness
  re-runs after **every** rework attempt and the adversarial review re-runs
  **only if** the rework touched code (validated input flag).

P3 **generates** rework kickstarters; it never launches sessions, never runs
the build-fix-loop skill, and never re-runs the harness or reviewer itself —
the coordinator launches rework sessions from the generated kickstarters (the
same generate/launch boundary the F3 ruling drew for W3-P2). P3 owns the
verdict (loop-directive checklist: P4 consumes it, never assembles it). The
coordinator never grades rework.

## Architecture

### Sub-module, not a new package

`src/pipeline/index.ts` inside `plugins/foreman-line/verification/` (charter
D2). The existing scaffold (`package.json` `@foreman-line/verification`,
`tsconfig.json`, `biome.json`, deps `{ ajv, yaml }`) is reused unchanged; the
shipped `src/harness/` and `src/adversarial/` sources are frozen for this
parcel (barrel `src/index.ts` gains exports only).

### Cross-package imports (relative ESM `.js` — W3-P1/P2 precedent)

```
../../contracts/src/stages/d-verification.js — VerificationVerdict, HarnessClaimResult, AdversarialFinding, FindingSeverity, verificationVerdictSchema, verificationVerdictOutputSchema (frozen)
../../contracts/src/envelope.js              — ReworkSignal, reworkSignalSchema, StageOutput (frozen)
../../receipts/src/index.js                  — ReceiptDocument, receiptPath, receiptDocumentSchema, validateReceiptDocument, validateChain
../../approval/src/index.js                  — canonicalize, sha256Hex, writeReceiptDocument
./harness/index.js (same package)            — allocateSequence
```

Verified invocation shapes (lesson #25): W3-P1 exports `allocateSequence(workflowId): { sequence, prevHash }`
(fresh call before every write); receipt writes compose `allocateSequence` +
the `approval` package's `writeReceiptDocument`/`canonicalize`/`sha256Hex`
(the harness/adversarial internal pattern — no standalone receipt helper is
exported). The build-fix-loop skill is **not** repo-local machinery — it is a
Claude Code skill invocable by name `build-fix-loop`; the attempt-1
kickstarter references it by name for the rework session to invoke, exactly as
review kickstarters reference `code-review`.

### Public functions

**`assembleVerdict(input: VerdictInput): VerificationVerdict`** — pure.
Schema-validates `input.harnessClaims` against the `harnessClaims.items`
sub-schema and `input.adversarialFindings` against the
`adversarialFindings.items` sub-schema of the frozen
`verification-verdict.schema.json` (`additionalProperties: false`) — malformed
intake is `PipelineError('INPUT_INVALID')`, never trusted (hostile-input AC).
Validates `input.dispositions` (see Disposition rules). Applies the PRF-9
mechanical rule and returns the frozen shape, itself validated against
`verificationVerdictSchema` before return (`VERDICT_INVALID` on failure — a
belt-and-suspenders guard, not a reachable path under correct code).

**Disposition rules (charter exit criterion, PRF-9):**
`Disposition = { findingIndex: number, disposition: 'accept' | 'rework', note: string }`.
- Every finding with `severity` below `high` (`info`/`low`/`medium`) MUST have
  exactly one disposition entry; a missing or duplicate entry is
  `DISPOSITION_INVALID` (fail-loud — the coordinator's triage is evidence, not
  an optional garnish).
- A disposition whose `findingIndex` targets a `high`/`critical` finding, is
  out of range, or is non-integer is `DISPOSITION_INVALID` — coordinator
  disposition **never** applies at or above `high`.
- A sub-high finding dispositioned `'rework'` forces `verdict: 'rework'`; all
  sub-high findings dispositioned `'accept'` do not block.
- `note` is non-empty (`minLength` 1 equivalent guard).

**`countReworkAttempts(workflowId: string, deps?): number`** — derives the
attempt state from disk (ruling F5; loop-directive checklist). Scans
`docs/receipts/<workflowId>/` for files matching the 6-digit receipt filename
convention whose slug segment is `-D-rework-signal.json`; each candidate must
parse, validate against `receiptDocumentSchema` with
`kind: 'claim'`, `stage: 'D'`, `subjectKind: 'ReworkSignal'`, and carry a
`subject` valid against the frozen `rework-signal.schema.json`. A
conforming-named file that fails any of these checks is
`PipelineError('REWORK_RECEIPT_INVALID')` — a **typed error, not a skip**
(tampered receipts must halt routing, never silently lower the attempt count).
Non-conforming filenames and everything under subdirectories (including
`quarantine/`) are invisible, exactly as `allocateSequence` scans (quarantine
invisibility preserved — W3-P2 precedent). Returns the count of valid
`ReworkSignal` receipts; original build = attempt 0, so the next attempt
number is `count + 1`.

**`emitVerificationVerdict(workflowId, verdict, reworkSignal, deps?):
{ receiptLocator, envelopePath }`** — side-effectful, ordered: (1) writes the
verdict Stage-D sub-receipt `ReceiptDocument { kind: 'claim', stage: 'D',
claimRef: 'verification-verdict', subjectKind: 'VerificationVerdict',
subject: <the verdict>, signature: null }`, sequence/`prevHash` from
`allocateSequence` called fresh, correlation `workflowId`/`correlationId`
inherited from the chain-tip receipt (fresh `sessionId`/`runId`; never
`generateCorrelationContext` — it forks the chain, the W3-P1/P2/W2-P2 hazard),
validated against `receiptDocumentSchema` before write, exclusive write
(`RECEIPT_EXISTS`); (2) assembles the `StageOutput<VerificationVerdict>`
envelope — `correlation` from the same inherited context, `receipt` =
`{ hash, locator }` of the just-written verdict sub-receipt, `timestamp`,
`reworkSignal` (null iff `verdict === 'pass'`; the frozen envelope schema
requires the key either way), `payload` = the verdict — validates it against
`stage-envelope.verification-verdict.schema.json` (`ENVELOPE_INVALID` before
any write), and writes it to
`docs/receipts/<workflowId>/verification-verdict.envelope.json` (exclusive;
`ENVELOPE_EXISTS`). The envelope filename deliberately does not match the
6-digit receipt convention, so it is invisible to `allocateSequence` (same
class as the existing non-conforming `skill-injection.json`).

**`routeRework(input: ReworkRoutingInput, deps?): ReworkRoutingResult`** —
side-effectful; called only on a `'rework'` verdict. Orchestrates the D4 cap
table:
1. `attempt = countReworkAttempts(workflowId) + 1`.
2. Builds the frozen `ReworkSignal { reason, originStage: 'D',
   targetStage: 'C', attempt, verdictReceipt: { hash, locator } }` — `reason`
   is a deterministic summary naming every failing claim and every blocking
   finding (`verdictReceipt` = the verdict sub-receipt from
   `emitVerificationVerdict`); validated against `reworkSignalSchema`.
3. Emits the ReworkSignal Stage-D sub-receipt
   (`claimRef: 'rework-signal'`, `subjectKind: 'ReworkSignal'`, subject = the
   signal) — chained via `allocateSequence`, exclusive write. Emitted on
   **every** rework verdict, attempt 3 included.
4. Cap table:
   - **attempt 1** → writes the build-fix-loop kickstarter (from
     `generateBuildFixKickstarter`) to
     `docs/receipts/<workflowId>/rework/<seq6>-build-fix-kickstarter.md`
     (`<seq6>` = the ReworkSignal receipt's sequence — the W3-P2
     quarantine-pairing pattern; the `rework/` subdirectory is invisible to
     `allocateSequence` and to `countReworkAttempts`).
   - **attempt 2** → writes the frontier re-coordination kickstarter (from
     `generateRecoordinationKickstarter`) to
     `.../rework/<seq6>-recoordination-kickstarter.md`.
   - **attempt ≥ 3** → NO kickstarter. Emits a stop-condition Stage-D
     sub-receipt (`claimRef: 'rework-cap-exceeded'`,
     `subjectKind: 'ReworkCapExceeded'`, subject
     `{ attempt, reason, failureReportPath }`) and writes the structured
     failure report document to `.../rework/<seq6>-failure-report.md`
     (parcel identity, attempt history table walked from the on-disk
     ReworkSignal receipts, every failing claim/finding verbatim, the receipt
     locators). Exceeding the cap is a stop condition for the coordinator, not
     a routing option (charter D4) — the result's discriminant says so.
5. Returns a discriminated `ReworkRoutingResult`:
   `{ kind: 'build-fix', attempt: 1, kickstarterPath, signalReceiptLocator }` |
   `{ kind: 'recoordination', attempt: 2, ... }` |
   `{ kind: 'stop-condition', attempt, stopReceiptLocator, failureReportPath }`.

**`generateBuildFixKickstarter(input: ReworkKickstarterInput): string`** —
pure. Renders the attempt-1 rework kickstarter (shape modeled on the shipped
kickstarters in `plugins/foreman-line/docs/kickstarters/`): Step 0
restate-and-stop gate (lesson #8); branch + worktree named from input (lesson
#9); the `build-fix-loop` skill named as the mechanical fix vehicle; small
model routing note (the routing policy's `boilerplate` class — economy tier —
is the corroborating instantiation; the kickstarter states the tier, the
coordinator's dispatch applies it); the failing harness claims and blocking
adversarial findings **verbatim** with their receipt locators; the "fix every
X, not just the listed X" charge (lesson #16); the test-count tripwire (lesson
#7/#8); PowerShell + `node -v` + full-capture discipline (lessons #10/#11);
and the explicit charge that the builder never merges and never grades its own
rework. Unlike W3-P2's review kickstarter, a rework kickstarter **does** carry
the findings — that is its payload; what it never carries is a verdict
pre-judgment ("the coordinator never grades rework": the kickstarter states
what failed, not what the outcome of rework will be deemed).

**`generateRecoordinationKickstarter(input: ReworkKickstarterInput): string`**
— pure. Renders the attempt-2 kickstarter: frontier-model re-coordination
framing (design-level re-examination, not mechanical fixing — charter D4
reasoning), the full attempt-1 history (its ReworkSignal receipt locator and
what the attempt-1 session claimed vs. what re-verification found), plus the
same Step 0 / branch-worktree / tripwire / environment charges as attempt 1.

**`planReverification(input: { reworkTouchedCode: boolean }):
ReverificationPlan`** — pure; the PRF-8 loop-back policy as data:
`{ rerunHarness: true, rerunAdversarial: input.reworkTouchedCode }`.
`rerunHarness` is unconditionally `true` (harness re-runs after **every**
rework attempt). `reworkTouchedCode` must be exactly a boolean
(`INPUT_INVALID` otherwise — a truthy string is not a validated flag). The
coordinator consumes the plan; P3 performs neither re-run.

### Types (public)

```typescript
interface Disposition { readonly findingIndex: number; readonly disposition: 'accept' | 'rework'; readonly note: string }
interface VerdictInput {
  readonly harnessClaims: readonly HarnessClaimResult[]
  readonly adversarialFindings: readonly AdversarialFinding[]
  readonly dispositions: readonly Disposition[]
}
interface ReworkRoutingInput {
  readonly workflowId: string
  readonly verdictReceipt: { readonly hash: string; readonly locator: string }
  readonly verdict: VerificationVerdict        // must be verdict: 'rework'
  readonly parcelRef: string
  readonly branch: string
  readonly worktreePath: string
  readonly repoRoot?: string                   // defaults to process.cwd(); tests pass a tmp dir
}
interface ReworkKickstarterInput { /* parcelRef, branch, worktreePath, attempt, failing claims/findings, receipt locators */ }
type ReworkRoutingResult = /* discriminated union above */
interface ReverificationPlan { readonly rerunHarness: true; readonly rerunAdversarial: boolean }
```

### Error handling (lesson #22)

`PipelineError extends Error` with a `code` union (this sub-module's own type;
the shipped `VerificationError`/`AdversarialError` unions are not modified):
`WORKFLOW_ID_INVALID` (`UUID_PATTERN` guard at entry to every function that
joins `workflowId` into a path — before any filesystem access, the W3-P1/P2
rule), `INPUT_INVALID` (intake claims/findings/flags fail their frozen-schema
or shape guards), `DISPOSITION_INVALID`, `VERDICT_INVALID`,
`ENVELOPE_INVALID`, `ENVELOPE_EXISTS`, `ENVELOPE_WRITE_FAILED` (non-EEXIST
envelope write failure — distinct from `RECEIPT_WRITE_FAILED` because it
occurs **after** a successful verdict-receipt write and the caller's retry
logic must be able to tell the two states apart; RP-2), `REWORK_RECEIPT_INVALID`
(tampered conforming-named ReworkSignal receipt), `SEQUENCE_READ_FAILED`,
`RECEIPT_WRITE_FAILED`, `RECEIPT_EXISTS` (exclusive-write guard),
`KICKSTARTER_WRITE_FAILED`, `REPORT_WRITE_FAILED`. Every external call —
receipt-dir scan, receipt read, receipt write, envelope write, kickstarter
write, report write — is wrapped in a typed try-catch rethrowing
`PipelineError`; no foreign exception escapes the public API.

### Idempotent retry (RP-1/RP-3 — a transient fault never burns evidence or a rung)

- **`emitVerificationVerdict` is idempotent across an envelope-write failure:**
  before writing a new verdict sub-receipt it pre-flights for an existing
  verdict sub-receipt at this workflow's chain tip (the receipt, not just the
  envelope). On retry after `ENVELOPE_WRITE_FAILED`, the existing verdict
  receipt is **reused** — the envelope is written referencing it; no duplicate
  verdict receipt and no orphaned receipt is ever emitted.
- **`routeRework` is idempotent/resumable across a kickstarter-write failure:**
  before emitting a new ReworkSignal receipt it detects an existing signal
  receipt whose paired kickstarter (`rework/<seq6>-*.md`) is missing — an
  orphaned attempt — and **resumes** it: the kickstarter for **that** attempt
  number is regenerated (same attempt, same cap-table row) instead of counting
  the orphan as a completed attempt and escalating. A transient
  kickstarter-write fault must not burn a rework rung.

### Failure-report cell escaping (RP-4)

Untrusted text (finding summaries, claim text, reasons) interpolated into a
failure-report markdown **table cell** must have pipe characters escaped
(`\|`) and CR/LF neutralized (replaced with a single space) so hostile text
can never split a cell, break a row, or open a column-0 heading/fence from
inside the table. Linear-time char loop, no regex (lesson #19).

## Constraints

- **Module location:** `plugins/foreman-line/verification/src/pipeline/`;
  extend `src/index.ts` only. No new package, no scaffold changes;
  `src/harness/` and `src/adversarial/` sources are frozen for this parcel.
- **Frozen contracts (modification is a loop-stop):**
  `VerificationVerdict`/`HarnessClaimResult`/`AdversarialFinding`/
  `FindingSeverity`/`verificationVerdictSchema`
  (`contracts/src/stages/d-verification.ts`), `ReworkSignal`/
  `reworkSignalSchema`/`StageOutput` (`contracts/src/envelope.ts`),
  `contracts/schemas/verification-verdict.schema.json`,
  `stage-envelope.verification-verdict.schema.json`,
  `rework-signal.schema.json`, `ReceiptDocument`/`receiptDocumentSchema`.
- **PRF-9 is mechanical and non-negotiable:** severity ≥ `high` blocks
  regardless of dispositions, harness state, or attempt count. No code path
  may pass a high/critical finding.
- **Attempt state lives on disk only (ruling F5):** no counter parameter, no
  session-state input, no cache. Note the F5 ruling's literal phrase
  ("files where `kind === 'rework-signal'`") predates W3-P1's shipped receipt
  layer, whose frozen `ReceiptKind` is `'stage' | 'claim'` only; the ruling's
  intent (on-disk derivation) is implemented via
  `kind: 'claim'` + `claimRef: 'rework-signal'` + `subjectKind: 'ReworkSignal'`
  (see Open Questions).
- **Verdict ownership:** P3 assembles and emits `VerificationVerdict`; P4
  consumes it (loop-directive checklist). This parcel emits no Stage-D
  closure receipt (P4) and performs no human-gate or Jira work.
- **Generate, never launch:** no process spawn, no `spawnFn` seam, no git
  operation of any kind, no skill invocation. The build-fix-loop and
  re-coordination sessions are launched by the coordinator from the generated
  kickstarters (F3-equivalent boundary).
- **Receipt discipline (W3-P1/P2 verbatim):** `stage` (not `stageId`);
  `kind: 'claim'` with non-null `claimRef`; `signature: null`; exclusive
  writes; sequence/`prevHash` from `allocateSequence` fresh per write; the
  extended chain must satisfy `validateChain` including the AC5c
  shared-correlation invariant.
- **Quarantine invisibility preserved:** nothing this parcel writes or scans
  perturbs `allocateSequence`; `quarantine/` and `rework/` subdirectories are
  never counted by any scan.
- **Linear-time string ops (lesson #19):** `reason` assembly, filename-slug
  checks, and all kickstarter interpolation use `indexOf`/`startsWith`/
  char-code loops; no backtracking-prone regex over claim/finding text
  (reviewer-originated findings are untrusted text). Must survive CodeQL
  polynomial-redos.
- **Hermetic deterministic suite (lesson #21):** all side effects go through
  injectable fs seams / `repoRoot` temp dirs following the P1/P2 patterns; no
  real sessions, no real skill invocations, no network.
- **No `headroom_compress` calls** (lesson #23 — nothing here compresses
  context; the generated kickstarters are files, not dispatch-context
  payloads).
- **Deterministic-pass environment (lessons #10/#11):** PowerShell; `node -v`
  first; full-capture before `$LASTEXITCODE`.
- **Branch/worktree (lesson #9):** builder works on branch
  `w3-p3-pipeline-rework` in its own worktree (named in the kickstarter, not
  here).
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

AC-1: `src/pipeline/` exists inside the existing
`plugins/foreman-line/verification/` package; `package.json`, `tsconfig.json`,
`biome.json`, and every file under `src/harness/` and `src/adversarial/` are
byte-unchanged from `origin/main` (no rescaffold, frozen siblings untouched).
A test or the deterministic pass diffs them against `origin/main`.

AC-2: `npx tsc --noEmit` passes with zero errors in `verification/`.

AC-3: `npx biome check .` passes with zero diagnostics in `verification/`.

AC-4: `src/index.ts` exports `assembleVerdict`, `countReworkAttempts`,
`emitVerificationVerdict`, `routeRework`, `generateBuildFixKickstarter`,
`generateRecoordinationKickstarter`, `planReverification`, `PipelineError`,
and the public types (`VerdictInput`, `Disposition`, `ReworkRoutingInput`,
`ReworkRoutingResult`, `ReworkKickstarterInput`, `ReverificationPlan`,
`PipelineErrorCode`), while every pre-existing W3-P1 and W3-P2 export remains
exported unchanged.

AC-5: `assembleVerdict` schema-validates intake: a harness claim or
adversarial finding failing its frozen sub-schema (missing field, empty
`summary`, severity outside the enum, an extra property —
`additionalProperties: false`) raises `PipelineError('INPUT_INVALID')` with no
partial acceptance. Hostile fixtures cover each malformation class for both
arrays.

AC-6: PRF-9 severity blocking is mechanical: any finding with severity `high`
or `critical` yields `verdict: 'rework'` even when all harness claims pass and
every sub-high finding is dispositioned `'accept'` — and no disposition input
can change it. Tests cover `high` and `critical`, alone and mixed with
passing state.

AC-7: Any `harnessClaims[].passed === false` yields `verdict: 'rework'` even
with zero adversarial findings; all claims passing + no findings ≥ high + all
sub-high findings dispositioned `'accept'` yields `verdict: 'pass'`. Tests
cover both.

AC-8: Disposition validation: a missing disposition for any `info`/`low`/
`medium` finding, a duplicate disposition for one finding, an out-of-range or
non-integer `findingIndex`, an empty `note`, or a disposition targeting a
`high`/`critical` finding each raise `PipelineError('DISPOSITION_INVALID')`;
a sub-high finding dispositioned `'rework'` forces `verdict: 'rework'`. Tests
cover every listed case.

AC-9: `countReworkAttempts` counts exactly the schema-valid ReworkSignal
receipts: fixtures with 0, 1, and 2 valid receipts return those counts;
non-conforming filenames, the `verification-verdict.envelope.json` file, and
files under `quarantine/` and `rework/` subdirectories are ignored; a
conforming-named `...-D-rework-signal.json` whose document fails
`receiptDocumentSchema`, whose `kind`/`stage`/`subjectKind` mismatch, or
whose `subject` fails the frozen `rework-signal.schema.json` raises
`PipelineError('REWORK_RECEIPT_INVALID')` — a typed error, not a skip. Tests
cover each tampering class.

AC-10: `workflowId` is validated against `UUID_PATTERN` at entry to every
function that joins it into `docs/receipts/<workflowId>/`
(`PipelineError('WORKFLOW_ID_INVALID')` before any filesystem access);
traversal-shaped inputs (`../x`, empty string) are covered by tests.

AC-11: `emitVerificationVerdict` writes the verdict sub-receipt
`ReceiptDocument { kind: 'claim', stage: 'D', claimRef:
'verification-verdict', subjectKind: 'VerificationVerdict', signature: null }`
with subject = the frozen verdict, sequence/`prevHash` from
`allocateSequence` and correlation `workflowId`/`correlationId` inherited from
the chain-tip receipt; the document validates against `receiptDocumentSchema`
and a test asserts the extended chain passes `validateChain` (including a
perturbed-correlation rejection probe).

AC-12: `emitVerificationVerdict` writes the
`StageOutput<VerificationVerdict>` envelope to
`docs/receipts/<workflowId>/verification-verdict.envelope.json`, validated
against `stage-envelope.verification-verdict.schema.json` **before** write;
`reworkSignal` is null iff `verdict === 'pass'` and equals the routing
signal's shape on rework; `receipt` carries the verdict sub-receipt's
`{ hash, locator }`; an invalid envelope raises
`PipelineError('ENVELOPE_INVALID')` and writes nothing; an existing envelope
file raises `ENVELOPE_EXISTS` (exclusive write); a subsequent
`allocateSequence` result is unaffected by the envelope file. Tests cover
pass, rework, invalid, and exclusivity.

AC-13: `routeRework` emits a ReworkSignal Stage-D sub-receipt on **every**
rework verdict (attempts 1, 2, and 3): `claimRef: 'rework-signal'`,
`subjectKind: 'ReworkSignal'`, subject valid against the frozen
`rework-signal.schema.json` with `originStage: 'D'`, `targetStage: 'C'`,
`attempt` = on-disk count + 1, `verdictReceipt` = the verdict sub-receipt's
`{ hash, locator }`, and `reason` naming every failing claim and blocking
finding; chained via `allocateSequence` and accepted by `validateChain`.

AC-14: With zero prior ReworkSignal receipts on disk, `routeRework` returns
`kind: 'build-fix'` with `attempt: 1` and writes the build-fix kickstarter to
`docs/receipts/<workflowId>/rework/<seq6>-build-fix-kickstarter.md` where
`<seq6>` is the paired ReworkSignal receipt's zero-padded sequence; the
kickstarter names the `build-fix-loop` skill, the small-model
(economy/boilerplate) routing tier, a Step 0 restate-and-stop gate, the
branch and worktree, the failing claims/findings verbatim with receipt
locators, the "fix every X, not just the listed X" charge, the test-count
tripwire, and the PowerShell/`node -v`/full-capture rules. Tests assert each
element's presence and the path pairing.

AC-15: With exactly one valid ReworkSignal receipt on disk, `routeRework`
returns `kind: 'recoordination'` with `attempt: 2` and writes the frontier
re-coordination kickstarter (frontier framing, attempt-1 history including its
ReworkSignal receipt locator, plus the same Step 0/branch-worktree/tripwire/
environment charges). Tests assert the elements and the attempt derivation
from disk, not from any input parameter.

AC-16: With two or more valid ReworkSignal receipts on disk, `routeRework`
returns `kind: 'stop-condition'`, writes **no** kickstarter, emits the
`claimRef: 'rework-cap-exceeded'` Stage-D sub-receipt (subject carries
`attempt`, `reason`, `failureReportPath`), and writes the structured failure
report to `.../rework/<seq6>-failure-report.md` containing the parcel
identity, the attempt-history table walked from the on-disk ReworkSignal
receipts, every failing claim/finding verbatim, and the receipt locators.
A test asserts no kickstarter file appears and both the stop receipt and
report exist.

AC-17: `planReverification({ reworkTouchedCode })` returns
`{ rerunHarness: true, rerunAdversarial: reworkTouchedCode }`;
`rerunHarness` is `true` for both flag values; a non-boolean
`reworkTouchedCode` raises `PipelineError('INPUT_INVALID')`. Tests cover
`true`, `false`, and a truthy-string rejection.

AC-18: Files written to `rework/` and the envelope file never perturb
sequence allocation or attempt counting: after a full attempt-1 route, a
subsequent `allocateSequence` and `countReworkAttempts` reflect only the
conforming `*.json` receipts in the workflow directory root. A test runs the
sequence end-to-end in a fixture dir and asserts both.

AC-19: Every external boundary — receipt-dir scan, chain-tip read,
ReworkSignal-receipt read, receipt write, envelope write, kickstarter write,
report write — is wrapped in a typed try-catch rethrowing `PipelineError`
with its documented code (`SEQUENCE_READ_FAILED`, `REWORK_RECEIPT_INVALID`,
`RECEIPT_WRITE_FAILED`, `RECEIPT_EXISTS`, `ENVELOPE_INVALID`,
`ENVELOPE_EXISTS`, `ENVELOPE_WRITE_FAILED` for a non-EEXIST envelope write
failure, `KICKSTARTER_WRITE_FAILED`, `REPORT_WRITE_FAILED`); tests
force each boundary and assert no foreign exception escapes the public API
(lesson #22).

AC-20: All string handling over claim/finding text (reason assembly,
kickstarter interpolation, filename-slug matching) is linear-time
(`indexOf`/`startsWith`/char-code loops); a 100k-char hostile finding summary
(long runs of dashes/digits/whitespace) completes without pathological
slowdown; a grep over `src/pipeline/` finds no backtracking-prone regex
applied to claim or finding text.

AC-21: The sub-module performs no process spawn, no git operation, no Jira
call, no skill invocation, and no harness/adversarial re-run; a grep over
`src/pipeline/` returns zero matches for such calls and no process-spawning
import.

AC-22: All tests pass via `npx tsx --test tests/*.test.ts` in `verification/`
(every pre-existing W3-P1 and W3-P2 test still green), and every `AC-N` in
this spec is named by at least one test per `AC-CONVENTION.md`.

## Out of Scope

- **Running the harness or the adversarial review** — P3 emits the
  loop-back *policy* (`planReverification`) and the routing artifacts; the
  coordinator invokes `runHarness` / W3-P2 dispatch for re-verification.
- **Launching any session** — build-fix-loop, re-coordination, and rework
  builder sessions are coordinator-launched from the generated kickstarters
  (the F3 generate/launch boundary). No spawn seam exists in this module.
- **Grading rework** — neither P3 nor the coordinator grades rework output;
  re-verification is the harness + (conditionally) the adversarial review.
- **Human review gate, one-tap approval, Stage-D closure receipt, and any
  Jira read/write** (W3-P4).
- **Findings triage itself** — the coordinator produces the disposition
  input; P3 validates and applies it mechanically, it never ranks or filters
  findings.
- **Authorizing a third rework attempt** — attempt ≥ 3 is a stop condition
  (charter D4); the coordinator loop-stops and reports to Clint. There is no
  override parameter.
- **Modifying any frozen W0 contract, `skill-injection.yaml`,
  `routing-policy.yaml`, the shipped `src/harness/` or `src/adversarial/`
  sources, or the `VerificationError`/`AdversarialError` code unions** —
  consume only; modification is a loop-stop.
- **Implementing or vendoring the build-fix-loop skill** — the kickstarter
  references the skill by name; the skill itself is external machinery.
- **`headroom_compress` / Kompress** — no context compression here.
- **CI wiring** — deferred to W4, same as every sibling.

## Context & References

- `plugins/foreman-line/docs/goals/w3-verification/charter.md` — W3-P3 row
  (as amended), D4 (rework cap), D7 (receipt trail vs. pipeline output), the
  PRF-9 severity rule in the exit criterion, Stop conditions (rework cap
  exceeded).
- `plugins/foreman-line/docs/goals/w3-verification/loop-directive.md` — the
  binding W3-P3 shaping checklist (attempt count from receipt chain; verdict
  owned by P3; conditional adversarial re-run).
- `plugins/foreman-line/docs/goals/w3-verification/plan-review-findings.md` —
  rulings F5 (attempt derivation), F1 (verdict is the frozen type in a
  StageEnvelope), F8 context.
- `plugins/foreman-line/contracts/src/stages/d-verification.ts` — frozen
  `VerificationVerdict`/`HarnessClaimResult`/`AdversarialFinding`/
  `FindingSeverity`, `verificationVerdictSchema`,
  `verificationVerdictOutputSchema`.
- `plugins/foreman-line/contracts/src/envelope.ts` — frozen `ReworkSignal`,
  `reworkSignalSchema`, `StageOutput`, `stageOutputSchema`.
- `plugins/foreman-line/contracts/schemas/verification-verdict.schema.json`,
  `stage-envelope.verification-verdict.schema.json` (requires `reworkSignal`),
  `rework-signal.schema.json` — the frozen JSON instantiations.
- `plugins/foreman-line/verification/src/harness/index.ts` + `src/index.ts` —
  `allocateSequence` (`{ sequence, prevHash }`), the receipt-write/typed-error
  pattern to mirror; `AC-CONVENTION.md`.
- `plugins/foreman-line/verification/src/adversarial/index.ts` — the
  quarantine/sequence-pairing and pure-generator/orchestrator precedents.
- `plugins/foreman-line/receipts/src/{types.ts,paths.ts,validator.ts}` —
  `ReceiptDocument` (`ReceiptKind = 'stage' | 'claim'`), `receiptPath` +
  `UUID_PATTERN` guard, filename convention, `validateChain` (AC4a/b, AC5c).
- `plugins/foreman-line/approval/src/index.ts` — `writeReceiptDocument`,
  `canonicalize`, `sha256Hex`.
- `plugins/foreman-line/routing-policy/routing-policy.yaml` — `boilerplate`
  (economy) and `standard-feature` class keys the kickstarters and this
  spec's frontmatter cite.
- `plugins/foreman-line/docs/kickstarters/` — the kickstarter shapes the
  generators model.
- `docs/SPEC-CONVENTION.md` §4 (schema v0.2);
  `docs/transcripts/defects_lessons.md` #7, #8, #9, #16, #19, #22, #24, #25;
  `plugins/foreman-line/docs/specs/done/W3-P1-verification-harness.md`,
  `W3-P2-adversarial-reviewer.md`.

## Open Questions (design decisions adopted with recommended defaults — coordinator may override at lint)

- **ReworkSignal receipt identification:** the F5 ruling's literal phrase
  ("files where `kind === 'rework-signal'`") predates the shipped receipt
  layer; the frozen `ReceiptKind` enum is `'stage' | 'claim'` only. Adopted:
  `kind: 'claim'` + `claimRef: 'rework-signal'` + `subjectKind: 'ReworkSignal'`
  + subject valid against the frozen `rework-signal.schema.json`, counted via
  the filename slug `-D-rework-signal.json`. Ruling intent (on-disk
  derivation, never session state) preserved exactly. Flag for coordinator
  confirmation.
- **Envelope on-disk location:** no prior stage wrote a `StageOutput`
  envelope to disk (verified: `dispatch/src` contains no envelope emission).
  Adopted: `docs/receipts/<workflowId>/verification-verdict.envelope.json` —
  adjacent to the receipt chain, deliberately non-conforming to the 6-digit
  filename convention so `allocateSequence` ignores it (the
  `skill-injection.json` precedent). Flag for coordinator confirmation.
- **Disposition strictness:** adopted — every sub-high finding (including
  `info`) requires exactly one disposition entry; missing is fail-loud
  `DISPOSITION_INVALID`, not an implicit accept. Rationale: the coordinator's
  triage is chain evidence; silence must never read as acceptance (lesson #7
  spirit).
- **Rework artifact location:** adopted —
  `docs/receipts/<workflowId>/rework/<seq6>-*.md`, sequence-paired with the
  emitting receipt (the W3-P2 quarantine-pairing pattern), invisible to all
  scans.
- **Attempt-3 ReworkSignal:** adopted — the ReworkSignal receipt and the
  rework-verdict envelope are still emitted at attempt 3 (the frozen envelope
  schema requires `reworkSignal` on a rework verdict; the stop-condition
  receipt and failure report ride alongside, replacing the kickstarter).
- **`build-fix-loop` provenance:** the skill is not repo-local — it resolves
  from the kaseya-one plugin marketplace and is invocable by name. The
  kickstarter references it by name only; if the skill is unavailable in a
  rework session, that session reports it (Step 0), it is not this module's
  runtime dependency. Flag for coordinator confirmation.

## Verification Plan

Deterministic: `npx tsc --noEmit` (AC-2); `npx biome check .` (AC-3); full
`npx tsx --test tests/*.test.ts` including all pre-existing W3-P1/P2 tests
(AC-22); frozen-sibling diff against `origin/main` (AC-1); greps for
spawn/git/Jira/skill calls and regex-over-untrusted-text (AC-20, AC-21). Runs
in PowerShell; `node -v` first; full-capture before `$LASTEXITCODE` (lessons
#10/#11). Post-review git-detection control on the reviewer worktree (lesson
#24) is coordinator discipline, standing.

Single adversarial review (standard/standard-feature — charter D5). Mandated
focus questions:

1. **PRF-9 bypass hunt:** attempt to construct any input — disposition
   combinations, empty arrays, duplicate findings, boundary severities,
   hostile `findingIndex` values (negative, `NaN`, `1e300`) — under which a
   `high`/`critical` finding or a failed harness claim yields `verdict:
   'pass'`; confirm the mechanical rule is unreachable-around.
2. **Attempt-count integrity:** attack `countReworkAttempts` with tampered,
   truncated, duplicated, and re-sequenced ReworkSignal receipts, files
   planted in `quarantine/`/`rework/`, and symlink/naming tricks; confirm
   tampering is a typed halt (never a silently lowered count) and that the
   attempt number can never be steered below the true on-disk history.
3. **Chain + envelope coherence:** confirm the verdict sub-receipt, the
   ReworkSignal receipt, and the envelope agree (same verdict, same
   `verdictReceipt` hash/locator, `reworkSignal` null-ness matching the
   verdict), the extended chain passes `validateChain` (AC5c perturbation
   probe), and no write ordering leaves a half-emitted state on injected
   failure.
4. **Kickstarter content honesty:** confirm the generated rework kickstarters
   carry every failing claim/finding (a floor, not a ceiling — lesson #16),
   no verdict pre-judgment, and no interpolation path by which hostile
   finding text can smuggle markdown/instruction structure that alters the
   kickstarter's directive frame (fence/heading injection probes).

## Epic/Story Projection (proposal only — Jira registration is Stage B)

- **Epic:** Foreman Line - W3 Verification
  - **Story:** W3-P3 - Stage-D Pipeline Runner + Rework Routing
    - **Task:** `src/pipeline/` sub-module + exports (frozen siblings untouched) — AC-1, AC-2, AC-3, AC-4
    - **Task:** `assembleVerdict` intake validation + PRF-9 rule + dispositions — AC-5, AC-6, AC-7, AC-8
    - **Task:** `countReworkAttempts` on-disk derivation + tamper handling — AC-9, AC-10
    - **Task:** Verdict sub-receipt + `StageOutput` envelope emission — AC-11, AC-12
    - **Task:** `routeRework` cap table + ReworkSignal receipts + kickstarter generators + failure report — AC-13, AC-14, AC-15, AC-16
    - **Task:** `planReverification` loop-back policy + scan invisibility — AC-17, AC-18
    - **Task:** Typed-error wrapping, linear-time ops, scope greps, dogfooded tests — AC-19, AC-20, AC-21, AC-22
