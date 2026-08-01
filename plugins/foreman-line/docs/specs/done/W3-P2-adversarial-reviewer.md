---
ticket: KONE-TBD
title: Foreman Line - W3-P2 Adversarial Reviewer dispatch-and-collect
status: active
owner: clinton.morgan
created: 2026-07-24
updated: 2026-07-24
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
routing_class: architecture/risk
data_classification: internal
surfaces: [plugins/foreman-line/verification/**]
permission_profile: builder-standard
---

# W3-P2 — Adversarial Reviewer dispatch-and-collect

## Intent

Extend the existing `plugins/foreman-line/verification/` package (shipped by
W3-P1 — do **not** rescaffold) with a `src/adversarial/` sub-module implementing
Stage D.2: the dispatch-and-collect infrastructure for the adversarial reviewer
(charter D3 as re-ratified 2026-07-24; plan-review ruling F3). Three concerns:

- **DISPATCH (in-process):** generate the adversarial review kickstarter for a
  target parcel (code-review skill per the `adversarial_reviewer:` matrix;
  parcel spec + repo canon references only — zero coordinator triage context),
  create the reviewer worktree via the shipped permission-profiles
  `dispatch-worktree` emitter under the exact registry profile
  `reviewer-readonly`, and emit a review-dispatch Stage-D sub-receipt chained
  via W3-P1's `allocateSequence`.
- **LAUNCH (D3 re-ratified mechanism):** start the reviewer as a **headless
  full-session CLI** (`claude -p`, cwd = the emitted reviewer worktree) so the
  `reviewer-readonly` envelope binds at session start. The parcel's first AC is
  a fixture-isolated probe proving the envelope actually loads under headless
  launch — `permission-profiles/PROBE.md` explicitly scopes its evidence to
  top-level interactive sessions and names headless `claude -p` "a different
  invocation mode whose settings-loading behavior is not the thing under test";
  this parcel supplies that missing evidence or falls back (contingency ladder
  below).
- **COLLECT (in-process):** `parseAdversarialFindings(rawText):
  AdversarialFinding[]` — a typed parser validating reviewer output against the
  frozen `AdversarialFinding` shape (`summary`/`citation`/`severity`), with
  malformed output quarantined and a named parse-failure receipt emitted —
  never a crash, never silent acceptance.

The review **judgment** is produced entirely inside the independent reviewer
session (charter D4 invariant). This parcel builds the mechanics around that
session; it never grades code, never triages findings, and never assembles the
`VerificationVerdict` (that is W3-P3).

## Architecture

### Sub-module, not a new package

`src/adversarial/index.ts` inside `plugins/foreman-line/verification/`
(charter D2 — one package per pipeline stage; sub-module per concern). The
existing scaffold (`package.json` `@foreman-line/verification`,
`tsconfig.json`, `biome.json`, deps `{ ajv, yaml }`) is reused unchanged.
`src/index.ts` gains the new exports while preserving every existing W3-P1
export (`recordBuildResult`, `allocateSequence`, `runHarness`,
`VerificationError`, `AC_CONVENTION_PATH`, and the harness types).

### Cross-package imports (relative ESM `.js`, no workspace linking — W3-P1 precedent)

```
../../contracts/src/stages/d-verification.js       — AdversarialFinding, FindingSeverity (frozen)
../../receipts/src/index.js                        — receiptPath, receiptDocumentSchema, validateReceiptDocument, validateChain
../../approval/src/index.js                        — canonicalize, sha256Hex, writeReceiptDocument
../../skill-injection/src/index.js                 — parseSkillInjectionMatrixYaml, validateSkillInjectionMatrix, SkillInjectionMatrix
../../permission-profiles/src/emitter.js           — resolveProfile, projectEnvelope, SHIPPED_REGISTRY_PATH, branchForParcel
./harness/index.js (same package)                  — allocateSequence
```

**Ratified amendment (2026-07-24 — coordinator ruling on RA-1):** the
wholesale `dispatchWorktree` verb creates a **NEW** builder branch
(`git worktree add <path> -b <branch>`) and is **no longer cited as this
parcel's mechanism**. `dispatchReview` targets an **EXISTING** parcel branch:
it creates the reviewer worktree itself via
`git worktree add <path> <existing-branch>` (no `-b`) and writes the projected
`reviewer-readonly` settings by composing the frozen emitter's exported
`resolveProfile` + `projectEnvelope` against `SHIPPED_REGISTRY_PATH`. The
emitter's no-clobber guards are preserved verbatim: the worktree path must not
already exist, and an existing `settings.local.json` is never overwritten.

Note two verified facts that constrain the design: (a) the emitter exports
(`resolveProfile`, `projectEnvelope`, `SHIPPED_REGISTRY_PATH`,
`branchForParcel`) live in `permission-profiles/src/emitter.ts` and are **not**
re-exported from that package's `src/index.ts` — import them from the emitter
module directly, exactly as `dispatch/src/approval-cli/index.ts:29` already
does; (b) W3-P1 exports **no** standalone receipt-writing helper — Stage-D
sub-receipt writes in this parcel compose `allocateSequence` (chain tip) with
the `approval` package's `writeReceiptDocument`/`canonicalize`/`sha256Hex`,
mirroring the harness's internal pattern.

### Public functions

**`generateReviewKickstarter(input: ReviewDispatchInput): string`** — pure.
Renders the adversarial-review kickstarter (shape modeled on
`docs/kickstarters/adversarial-review-SCAF-P1.md`): reviewer identity and
never-fix/never-commit charge; workspace = the reviewer worktree path and
branch; the target parcel's spec path (`active/`); the AC convention reference
(`AC_CONVENTION_PATH`); the injected review skills resolved from the
`adversarial_reviewer:` section of `skill-injection.yaml` against the built
surfaces (`'*'` → `code-review`, path-segment glob rule identical to W2-P5/
W3-P1); hostile-probing license (lesson #12); PowerShell + full-capture
discipline (lessons #10/#11); and the **findings output contract** (§ Collect
below) the parser depends on. The input type has **no field** for harness
results, coordinator findings, or triage notes — zero-coordinator-context is
enforced at the type level and asserted by test.

**`dispatchReview(input: ReviewDispatchInput, deps?: ReviewDispatchDeps):
ReviewDispatchResult`** — side-effectful, ordered (worktree-first, the lesson
#18 discipline applied to the amended mechanism): (1) shape-validate every
input field before any interpolation (`INPUT_INVALID`) and verify the target
parcel's **existing** branch exists (`git rev-parse --verify` via the git
seam; `BRANCH_MISSING`); (2) pre-flight no-clobber: the worktree path must not
exist (`WORKTREE_PATH_EXISTS`); (3) create the reviewer worktree via
`git worktree add <path> <existing-branch>` (**no `-b`** — the branch already
exists; `WORKTREE_DISPATCH_FAILED` on git failure); (4) write the projected
`reviewer-readonly` settings by composing the frozen emitter's exported
`resolveProfile` (against `SHIPPED_REGISTRY_PATH`) + `projectEnvelope`
(`PROFILE_RESOLVE_FAILED` / `SETTINGS_WRITE_FAILED`), refusing to overwrite an
existing `settings.local.json` (`SETTINGS_EXISTS`; the worktree is left in
place for explicit cleanup, mirroring the emitter); (5) write the generated
kickstarter into the worktree; (6) emit the review-dispatch Stage-D
sub-receipt. Any failure in (1)–(4) aborts before any kickstarter or receipt
write. All git calls go through an injectable execFileSync-style seam
(`deps.gitFn`) — the package ships no process-spawning import (W3-P1 static
scaffold guarantee), so the caller injects the real git runner and the
deterministic suite injects a stub; a missing `gitFn` is a typed
`WORKTREE_DISPATCH_FAILED`, never an implicit spawn.

**`buildReviewerLaunchCommand(worktreePath: string, kickstarterPath: string):
ReviewerLaunchCommand`** — pure. Returns
`{ command: 'claude', args, cwd: worktreePath, env }`.
The cwd **is** the mechanism by which the emitted `settings.local.json` binds
at session start; `--dangerously-skip-permissions` (or any bypass flag) must
never appear in `args` under any input (it voids the envelope —
permission-profiles README/PROBE.md).

**Launch-command faithfulness (ratified amendment):** the production command
this builder emits must match, flag-for-flag, the command the AC-1 probe
proved — a probe run with flags the builder does not emit (or vice versa)
proves nothing about the production launch. If the flagless headless reviewer
is functionally inert (cannot run its licensed probing), the builder emits the
**minimal** flag set that the `reviewer-readonly` envelope still constrains
(deny rules override `--allowedTools` grants — proven), the probe is re-run
with exactly that command, and the evidence + verdict are recorded honestly in
`PROBE-HEADLESS.md`. An honest FAIL + rung-2 fallback engagement is
acceptable; a stale overreaching PASS is a defect.

**Hygienic environment (ratified amendment):** `ReviewerLaunchCommand` carries
an explicit `env` — a minimal pass-through of documented variables only
(binary/shell resolution, Claude Code config/credential discovery, temp dirs),
never wholesale `process.env` inheritance. The pass-through list and each
variable's reason are documented at the builder.

**`launchReviewer(cmd: ReviewerLaunchCommand, deps?: LaunchDeps):
LaunchResult`** — thin, side-effectful wrapper that starts the headless
process via an injectable `spawnFn`. Every external call is wrapped in a typed
try-catch rethrowing `AdversarialError` (lesson #22). The deterministic suite
exercises this only through the injected seam — `claude -p` is never invoked
in unit tests. Runtime guards (ratified amendment): the command binary marker
is asserted (`command === 'claude'`) and `args` are **whitelisted** — only the
flag shape the builder emits is launchable; any unknown flag or foreign binary
is a typed `LAUNCH_FAILED`. Async-error/stdio seam (ratified amendment,
RA-3): the spawn seam accepts an explicit `env` and a `stdoutPath`; the
reviewer's stdout is directed to that file (the `rawText` provenance for
`collectAdversarialFindings` — no pipe backpressure), and when the spawned
handle exposes event registration, `launchReviewer` registers an `'error'`
listener that emits the rung-2 `reviewer-launch-stop-report` sub-receipt on
async launch failure — an async failure is never silent.

**`emitStopReport(workflowId: string, reason: string, ...): string`** — the
contingency-ladder emitter: writes a Stage-D sub-receipt
(`claimRef: 'reviewer-launch-stop-report'`) recording that headless launch is
not viable and the fallback (kickstarter + human-relay launch) is in effect.
Returns the receipt locator.

**`parseAdversarialFindings(rawText: string): AdversarialFinding[]`** — pure
typed parser (exact signature per charter D3). Extracts the findings block per
the output contract, JSON-parses it, and validates **every** element against
the frozen `AdversarialFinding` shape — the `adversarialFindings.items`
sub-schema of `contracts/schemas/verification-verdict.schema.json`
(`additionalProperties: false`; required `summary`/`citation`/`severity`;
`severity` ∈ `info|low|medium|high|critical`; `summary`/`citation`
`minLength: 1`). Any deviation throws `AdversarialError('PARSE_FAILED')` —
never a partial array, never silent acceptance.

**`collectAdversarialFindings(workflowId: string, rawText: string, deps?):
CollectResult`** — orchestrates collection: on parse success, emits an
adversarial-findings Stage-D sub-receipt (subject = the findings array) and
returns `{ findings, receiptLocator }`; on parse failure, quarantines the raw
text and emits a named parse-failure sub-receipt
(`claimRef: 'adversarial-parse-failure'`), then returns a discriminated
failure result (the coordinator decides what happens next — this module does
not crash and does not retry).

### Findings output contract (the parser's wire format)

The kickstarter instructs the reviewer to end its session output with exactly
one fenced code block opened by the line
` ```adversarial-findings ` and closed by ` ``` `, containing a JSON array of
`AdversarialFinding` objects (`[]` when no findings). The parser scans for the
**last** such fence pair with linear-time scans (`indexOf` line-walk — no
regex over the untrusted reviewer text, lesson #19), then `JSON.parse`s the
enclosed text inside a typed try-catch. Zero fences, unterminated fence,
multiple ambiguous candidates resolved to the last, non-array JSON, or any
element failing the frozen shape → `PARSE_FAILED`. This contract lives in this
spec and in the generated kickstarter text — it adds nothing to any frozen
contract (the frozen type governs the elements; the fence is transport).

### Quarantine

Quarantine directory: `docs/receipts/<workflowId>/quarantine/`. Malformed raw
reviewer output is written as
`quarantine/<seq6>-adversarial-raw.txt` where `<seq6>` is the zero-padded
sequence the paired parse-failure receipt consumed from `allocateSequence` —
the receipt and its quarantined evidence share a number, making the trail
walkable. Files under `quarantine/` do **not** match the 6-digit receipt
filename convention's `.json` shape scanned by `allocateSequence` (which scans
only the workflow dir's conforming `*.json` receipts, not subdirectories), so
quarantine writes never perturb sequence allocation. Quarantine writes are
exclusive (no overwrite) and wrapped (`QUARANTINE_WRITE_FAILED`).

### Stage-D sub-receipts emitted by this parcel

All are `ReceiptDocument { kind: 'claim', stage: 'D', signature: null }`,
sequence + `prevHash` from `allocateSequence(workflowId)` called fresh before
each write, `correlation.workflowId`/`correlation.correlationId` inherited
from the chain-tip receipt (fresh `sessionId`/`runId`; never
`generateCorrelationContext` — it forks the chain, same hazard W3-P1/W2-P2
named), validated against `receiptDocumentSchema` before write:

| Event | `claimRef` | `subjectKind` | `subject` |
|---|---|---|---|
| Reviewer dispatched | `review-dispatch` | `ReviewDispatch` | `{ parcelRef, worktreePath, branch, kickstarterPath, profile: 'reviewer-readonly', injectedSkills }` |
| Findings collected | `adversarial-findings` | `AdversarialFindings` | `{ findings }` |
| Malformed output quarantined | `adversarial-parse-failure` | `AdversarialParseFailure` | `{ quarantinePath, reason }` |
| Headless launch not viable | `reviewer-launch-stop-report` | `ReviewerLaunchStopReport` | `{ reason, fallback: 'kickstarter+human-relay' }` |

### Contingency ladder (ratified — lessons #20/#21; charter D3 re-ratification)

1. **Rung 1 (primary):** headless full-session CLI launch — `claude -p`, cwd =
   the emitted reviewer worktree — proven by the AC-1 probe before the launch
   path is trusted.
2. **Rung 2 (probe fails):** fall back to kickstarter generation + **human-relay
   launch** (Clint starts a top-level `claude` session in the worktree, the
   already-proven PROBE.md mode) **and** `emitStopReport` — a stop-report to
   Clint, never a silent downgrade. Dispatch and collect remain fully
   functional on this rung; only the launch mechanism changes.

There is no rung 3. A failure of rung 2's mechanics is a loop-stop.

### Error handling (lesson #22)

`AdversarialError extends Error` with a `code` union (this sub-module's own
error type — W3-P1's shipped `VerificationError` union is not modified):
`WORKFLOW_ID_INVALID` (workflowId fails the `UUID_PATTERN` guard before any
path join — same fail-loud rule as the harness), `INPUT_INVALID` (a dispatch
input field fails its shape guard before any interpolation — ratified
amendment), `MATRIX_UNREADABLE`,
`MATRIX_INVALID` (skill-injection YAML read/validate), `SPEC_UNREADABLE` (the
target parcel spec path cannot be read when the kickstarter embeds its
reference), `BRANCH_MISSING` (the target parcel branch does not exist),
`WORKTREE_PATH_EXISTS` (no-clobber pre-flight), `WORKTREE_DISPATCH_FAILED`
(the git seam threw, returned non-zero, or is not injected; message carries
git's stderr), `PROFILE_RESOLVE_FAILED` (`resolveProfile` returned errors),
`SETTINGS_EXISTS` (an emitted-envelope target `settings.local.json` already
exists — never overwritten), `SETTINGS_WRITE_FAILED`,
`KICKSTARTER_WRITE_FAILED`,
`LAUNCH_FAILED` (spawn boundary, arg-whitelist or binary-marker violation),
`PARSE_FAILED` (findings block missing,
unparsable, or any element fails the frozen shape),
`QUARANTINE_WRITE_FAILED`, `RECEIPT_WRITE_FAILED`, `RECEIPT_EXISTS`
(exclusive-write guard), `SEQUENCE_READ_FAILED`. Every external call —
matrix read/parse, spec read, git-seam invocation, settings write, kickstarter
write, spawn,
quarantine write, receipt-dir scan, receipt write — is wrapped in a typed
try-catch rethrowing `AdversarialError`; no foreign exception escapes the
public API.

## Constraints

- **Module location:** `plugins/foreman-line/verification/src/adversarial/`;
  extend `src/index.ts`. No new package, no scaffold changes; `package.json`
  name/scripts/engines/deps unchanged.
- **Frozen contracts (modification is a loop-stop):** `AdversarialFinding` /
  `FindingSeverity` (`contracts/src/stages/d-verification.ts`), the
  `adversarialFindings.items` sub-schema of
  `contracts/schemas/verification-verdict.schema.json`,
  `ReceiptDocument`/`receiptDocumentSchema`, `DispatchOrder`. This parcel does
  **not** emit `VerificationVerdict` (W3-P3) and does not modify
  `skill-injection.yaml` or `permission-profiles.yaml`.
- **Exact profile name:** `reviewer-readonly` — a `PROFILE_NAMES` member
  (`permission-profiles/src/types.ts`). Never hand-roll the envelope: the
  projected settings are composed **only** from the frozen emitter's exported
  `resolveProfile` + `projectEnvelope` against `SHIPPED_REGISTRY_PATH`, and an
  existing `settings.local.json` is never clobbered (`SETTINGS_EXISTS` —
  same guard the emitter enforces). The wholesale `dispatchWorktree` verb is
  reserved for NEW builder branches and is not invoked by this parcel.
- **Worktree-first ordering (lesson #18, amended mechanism):** branch
  verification, worktree creation (`git worktree add` on the existing branch,
  no `-b`), and settings projection all run before any kickstarter or receipt
  write; never pre-create the worktree by hand.
- **Zero coordinator context (charter D4 / stop condition; ruling F8):** the
  kickstarter carries only the parcel spec reference, repo canon references,
  worktree/branch/output-contract mechanics. No harness claims, no coordinator
  triage, no prior findings. Type-level: `ReviewDispatchInput` has no field
  that could carry them. Violation is an architectural stop condition, not a
  rework item.
- **No bypass flags ever:** `--dangerously-skip-permissions` (or any
  permission-bypass argument) must be unrepresentable in the launch-command
  builder's output — it voids the envelope (PROBE.md "void under bypass mode").
- **Hermetic deterministic suite:** `claude -p` is never invoked by unit
  tests. The probe (AC-1) is an integration/spike deliverable with recorded
  human-observed evidence; the unit-testable seams are command construction,
  cwd, env, kickstarter content, receipts, and the parser. All side effects go
  through injectable deps (`gitFn`, `spawnFn`, fs roots via
  `repoRoot`), fixture-isolated in temp dirs (lesson #21). One integration
  test (AC-22) exercises the REAL git path in a scratch fixture repo,
  injecting a real git runner from the test file itself (the src/ tree stays
  free of process-spawning imports).
- **Linear-time string ops (lesson #19):** fence extraction and all scans over
  reviewer output (untrusted, potentially adversarial, potentially huge) use
  `indexOf`/`startsWith`/char-code loops — no regex over reviewer text. Must
  survive CodeQL polynomial-redos.
- **Read-only w.r.t. the target parcel:** no git mutation of the target
  parcel's branch; the only git side effect in this parcel is the reviewer
  `git worktree add <path> <existing-branch>` (plus its read-only
  `rev-parse --verify` pre-flight), and only through the injected git seam.
- **Receipt discipline:** `stage` (not `stageId`); `kind: 'claim'` with
  non-null `claimRef`; exclusive writes; sequence/prevHash from
  `allocateSequence` fresh per write; chain must satisfy `validateChain`
  including the AC5c shared-correlation invariant.
- **No `headroom_compress` calls** (lesson #23 ceiling — nothing here
  compresses context).
- **Deterministic-pass environment (lessons #10/#11):** PowerShell; `node -v`
  first; full-capture before `$LASTEXITCODE`.
- **Branch/worktree (lesson #9):** builder works on branch
  `w3-p2-adversarial-reviewer` in its own worktree (named in the kickstarter,
  not here).
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

AC-1: **Headless-launch probe (integration/spike deliverable — the parcel's
gating evidence, run before the launch path is trusted).** A headless
`claude -p` session started with cwd = a freshly emitted `reviewer-readonly`
worktree provably loads that worktree's `.claude/settings.local.json`: deny
rules are observed **in-session** (a Write-tool write is denied; a
`git commit` is denied in at least one shell), with a `builder-standard`
worktree as positive control (same operations succeed), fixture-isolated in
throwaway worktrees (lesson #21) — mirroring PROBE.md's structure but in the
headless invocation mode PROBE.md explicitly does not cover. The run, its
observed outputs, and its PASS/FAIL verdict are recorded in
`plugins/foreman-line/verification/PROBE-HEADLESS.md`. On FAIL: the
contingency ladder's rung 2 is invoked — kickstarter + human-relay launch +
`emitStopReport` — and the spec's launch functions remain shipped but
documented as fallback-gated; a silent downgrade (shipping headless launch
without a PASS record, or quietly relaying without a stop-report) is a defect.
The deterministic suite covers AC-1 with a test asserting `PROBE-HEADLESS.md`
exists and contains an explicit `Verdict: PASS` or `Verdict: FAIL` line (the
hermetic proxy; the probe itself is not a unit test). **Launch-command
faithfulness (ratified amendment):** the probed command must be EXACTLY the
production command `buildReviewerLaunchCommand` emits — no extra flags the
builder does not emit; a stale overreaching PASS is a defect.

AC-2: `src/adversarial/` exists inside the existing
`plugins/foreman-line/verification/` package; `package.json` (name
`@foreman-line/verification`, scripts, `engines`, deps `{ ajv, yaml }`),
`tsconfig.json`, and `biome.json` are byte-unchanged from `origin/main` (no
rescaffold; `origin/main`, not a possibly-stale local `main`). A test or the
deterministic pass diffs them against `origin/main`.

AC-3: `npx tsc --noEmit` passes with zero errors in `verification/`.

AC-4: `npx biome check .` passes with zero diagnostics in `verification/`.

AC-5: `src/index.ts` exports `generateReviewKickstarter`, `dispatchReview`,
`buildReviewerLaunchCommand`, `launchReviewer`, `emitStopReport`,
`parseAdversarialFindings`, `collectAdversarialFindings`, `AdversarialError`,
and the public types (`ReviewDispatchInput`, `ReviewDispatchResult`,
`ReviewerLaunchCommand`, `LaunchResult`, `CollectResult`,
`AdversarialErrorCode`), while every pre-existing W3-P1 export
(`recordBuildResult`, `allocateSequence`, `runHarness`, `VerificationError`,
`AC_CONVENTION_PATH`, harness types) remains exported unchanged.

AC-6: `generateReviewKickstarter` output contains: the target `parcelRef`; the
parcel spec path; the reviewer worktree path and branch; the AC convention
reference (`AC_CONVENTION_PATH`); the skills resolved from the
`adversarial_reviewer:` section of `skill-injection.yaml` against the built
surfaces (`'*'` → `code-review`, path-segment glob rule); the
`reviewer-readonly` never-fix/never-commit charge; the hostile-probing license
(lesson #12); and the fenced `adversarial-findings` output contract verbatim.
Tests assert each element's presence.

AC-7: Zero coordinator context: `ReviewDispatchInput` has no field for harness
results, triage notes, or prior findings (type-level exclusion), and a test
seeds a canary string into every ambient input the function can reach (spec
fixture body excluded — the spec reference is allowed, its body is not
inlined) and asserts the canary and any findings/triage-shaped text never
appear in the generated kickstarter.

AC-8: The `adversarial_reviewer` matrix is read via
`parseSkillInjectionMatrixYaml` + `validateSkillInjectionMatrix`; an
unreadable matrix file raises `AdversarialError('MATRIX_UNREADABLE')` and an
invalid one raises `AdversarialError('MATRIX_INVALID')`.

AC-9 (as amended): `dispatchReview` runs worktree creation **first** (lesson
#18 discipline on the amended mechanism): via the injected `gitFn` it verifies
the existing parcel branch (`BRANCH_MISSING` when absent), pre-flights the
path (`WORKTREE_PATH_EXISTS` when present), runs
`git worktree add <path> <existing-branch>` with **no `-b`**, and writes the
projected `reviewer-readonly` settings composed from the frozen emitter's
`resolveProfile` + `projectEnvelope` (`SETTINGS_EXISTS` when a
`settings.local.json` is already present) — all before any kickstarter or
receipt write; a stub asserts the git argument shapes and call ordering. A
failing git call raises `AdversarialError('WORKTREE_DISPATCH_FAILED')`
carrying git's stderr, and no settings, kickstarter, or receipt is written.

AC-10: On worktree-creation success, the kickstarter is written inside the
reviewer worktree and its path returned in `ReviewDispatchResult`; a forced
write failure raises `AdversarialError('KICKSTARTER_WRITE_FAILED')`.

AC-11: `dispatchReview` emits the review-dispatch sub-receipt:
`ReceiptDocument { kind: 'claim', stage: 'D', claimRef: 'review-dispatch',
subjectKind: 'ReviewDispatch', signature: null }` with subject
`{ parcelRef, worktreePath, branch, kickstarterPath, profile, injectedSkills }`,
`sequence`/`prevHash` from `allocateSequence`, correlation inherited from the
chain-tip receipt; the document validates against `receiptDocumentSchema` and
a test asserts the extended chain passes `validateChain`.

AC-12: `buildReviewerLaunchCommand(worktreePath, kickstarterPath)` returns
`{ command: 'claude', args, cwd, env }` with `cwd === worktreePath` and `args`
containing `-p` and the kickstarter reference; for all inputs, `args` never
contains `--dangerously-skip-permissions` or any permission-bypass flag —
tests assert command, args, cwd, and the bypass-flag absence.

AC-13: `launchReviewer` starts the process only through the injected
`spawnFn`; a `spawnFn` that throws is rethrown as
`AdversarialError('LAUNCH_FAILED')`; no test spawns a real `claude` process
(the deterministic suite is hermetic).

AC-14: `emitStopReport(workflowId, reason, ...)` writes a
`claimRef: 'reviewer-launch-stop-report'` Stage-D sub-receipt whose subject
records the reason and the fallback (`kickstarter+human-relay`), chained via
`allocateSequence`, and returns its locator — the mechanical never-silent
half of contingency rung 2 (lessons #20/#21).

AC-15: `parseAdversarialFindings` on well-formed input — a fenced
`adversarial-findings` block containing a JSON array of frozen-shape findings
— returns the typed `AdversarialFinding[]` (empty array for `[]`); every
element is schema-validated against the frozen `adversarialFindings.items`
shape from `verification-verdict.schema.json`.

AC-16: Hostile-input fixtures each raise `AdversarialError('PARSE_FAILED')`
with no partial acceptance: no fence; unterminated fence; fence containing
non-JSON prose; a JSON object instead of an array; an element missing
`citation`; an empty-string `summary`; a `severity` outside the frozen enum
(e.g. `blocker`); an element with an extra property (must be rejected —
`additionalProperties: false`); and prose *around* a valid fence attempting
instruction-injection (parser reads only the fenced payload). Multiple fences
resolve deterministically to the last. Tests cover every listed fixture.

AC-17: `collectAdversarialFindings` on malformed input writes the raw text to
`docs/receipts/<workflowId>/quarantine/<seq6>-adversarial-raw.txt` (exclusive
write; `<seq6>` = the paired receipt's sequence) and emits the
`claimRef: 'adversarial-parse-failure'` sub-receipt whose subject carries the
quarantine path and reason — never a crash, never silent acceptance; on
well-formed input it emits the `claimRef: 'adversarial-findings'` sub-receipt
with the findings as subject. Tests cover both paths and assert quarantine
files never affect a subsequent `allocateSequence` result.

AC-18: Fence extraction and every scan over reviewer output are linear-time
(`indexOf`/`startsWith`/char-code loops); no regex is applied to reviewer
text; a 100k-char hostile input (long runs of backticks/dashes/digits)
completes within the suite without pathological slowdown; a grep over
`src/adversarial/` finds no backtracking-prone regex applied to untrusted
text.

AC-19: `workflowId` is validated against `UUID_PATTERN` at entry to every
function that joins it into `docs/receipts/<workflowId>/`
(`AdversarialError('WORKFLOW_ID_INVALID')` before any filesystem access), and
every external boundary — matrix read/parse, spec read, git-seam call,
settings write, kickstarter write, spawn, quarantine write, receipt-dir scan,
receipt write —
rethrows `AdversarialError` with its documented code; tests force each
boundary and assert no foreign exception escapes the public API (lesson #22).

AC-20: The sub-module performs no git mutation of any target parcel branch
(the only git side effect flows through the injected `gitFn` seam: the
reviewer worktree add + its rev-parse pre-flight), no
Jira call, no `VerificationVerdict` assembly, and no findings triage; a grep
over `src/adversarial/` returns zero matches for such calls and no
process-spawning import.

AC-21: All tests pass via `npx tsx --test tests/*.test.ts` in `verification/`
(W3-P1's existing tests still green), and every `AC-N` in this spec (AC-1
through AC-29, AC-1 via its PROBE-HEADLESS.md proxy test) is named by at
least one test per `AC-CONVENTION.md`.

AC-22 (ratified amendment): One integration test exercises the REAL git path,
fixture-isolated in a scratch git repo (lesson #21), with a real git runner
injected from the test file: `dispatchReview` against a **pre-existing**
branch adds the worktree on that branch (no new branch is created — asserted
by branch enumeration before/after), writes a `settings.local.json`
byte-equal to
`projectEnvelope(resolveProfile('reviewer-readonly').profile.envelope)`, and
the no-clobber guards hold (existing path → `WORKTREE_PATH_EXISTS`; existing
settings → `SETTINGS_EXISTS`; absent branch → `BRANCH_MISSING`).

AC-23 (ratified amendment): Launch-command faithfulness — the production
command emitted by `buildReviewerLaunchCommand` matches the probed command
recorded in `PROBE-HEADLESS.md` flag-for-flag; a test extracts the recorded
production-command flags from `PROBE-HEADLESS.md` and compares them against
the builder's output.

AC-24 (ratified amendment): Async-error surfacing + stdout capture —
`launchReviewer` passes an explicit `env` and `stdoutPath` to the spawn seam
(reviewer stdout goes to the file that is the `rawText` provenance for
collect); when the spawned handle exposes `on`, an `'error'` listener is
registered that emits the rung-2 `reviewer-launch-stop-report` sub-receipt on
async launch failure — never silent. Fake-spawner tests cover both the
async-error path (receipt observed) and the stdout-capture path (stdoutPath
propagated).

AC-25 (ratified amendment): Dispatch inputs are shape-validated before any
interpolation into the kickstarter — `parcelRef` against a slug pattern,
`specPath`/`worktreePath` as sane path fields, every `surfaces` entry as a
repo-relative path token; violations raise `AdversarialError('INPUT_INVALID')`.
The AC-7 canary test is extended to seed triage prose into the INPUT FIELDS
themselves and assert rejection.

AC-26 (ratified amendment): Quarantine/receipt pairing is retryable — if the
paired parse-failure receipt write fails, the just-written quarantine file is
removed before the typed error propagates, so a subsequent retry of
`collectAdversarialFindings` succeeds without human deletion; a
failure-injection test covers the path.

AC-27 (ratified amendment): `launchReviewer` whitelists `args` (only the flag
shape the builder emits is launchable) and asserts the command binary marker
(`command === 'claude'`) at runtime; an unknown flag or foreign binary raises
`AdversarialError('LAUNCH_FAILED')` before any spawn.

AC-28 (ratified amendment): The builder constructs a minimal hygienic `env`
from a documented pass-through whitelist (each variable's reason documented at
the builder); a test seeds a canary variable into `process.env` and asserts it
never appears in the constructed command's `env` (no wholesale `process.env`
inheritance).

AC-29 (ratified amendment): The generated kickstarter documents the
byte-strict fence format to the reviewer: the exact fence lines, at column 0,
with no indentation and no trailing whitespace; a test asserts the wording is
present.

## Out of Scope

- **Running or triaging the review** — the reviewer session's judgment is its
  own; the coordinator triages. This module never ranks, filters, or disposes
  of findings.
- **`VerificationVerdict` assembly, `reworkSignal`, and rework routing** —
  W3-P3 consumes `AdversarialFinding[]`; this parcel only produces it.
- **Human review gate and Jira ticket update** (W3-P4); any Jira read/write.
- **The PRF-9 severity-blocking rule** (adversarial `severity ≥ high` blocks
  regardless of triage) — that is verdict-assembly policy, owned by W3-P3.
- **Modifying `permission-profiles.yaml`, the emitter, or `PROBE.md`** — the
  registry and emitter are shipped and frozen for this goal; this parcel adds
  its own `PROBE-HEADLESS.md`, it does not edit theirs.
- **Modifying `skill-injection.yaml`, any frozen W0 contract, or any W3-P1
  shipped surface** (including `VerificationError`'s code union) — consume
  only; modification is a loop-stop.
- **Dual-review orchestration mechanics** — running two reviewers over this
  parcel is the coordinator's dispatch discipline (charter D5), not code in
  this module; the module dispatches one reviewer per call.
- **Interactive (non-headless) launch automation** — rung 2's human-relay
  launch is performed by a human; this parcel only emits the stop-report and
  the kickstarter that rung reuses.
- **Retry/backoff policy for a failed or hung reviewer session** — the
  coordinator owns session lifecycle; this module returns typed results.
- **CI wiring** for any of this — deferred to W4, same as every sibling.

## Context & References

- `plugins/foreman-line/docs/goals/w3-verification/charter.md` — D3 as
  re-ratified 2026-07-24 (headless CLI launch + probe AC + relay fallback),
  D4 (isolation invariant), D5 (elevated / architecture/risk / dual review),
  Stop conditions (coordinator-context leak = architectural stop).
- `plugins/foreman-line/docs/goals/w3-verification/plan-review-findings.md` —
  rulings F3 (dispatch/collect boundary) and F8 (session-start-load AC).
- `plugins/foreman-line/contracts/src/stages/d-verification.ts` — frozen
  `AdversarialFinding` / `FindingSeverity`.
- `plugins/foreman-line/contracts/schemas/verification-verdict.schema.json` —
  the frozen `adversarialFindings.items` shape the parser validates against.
- `plugins/foreman-line/permission-profiles/src/emitter.ts` —
  `resolveProfile` / `projectEnvelope` / `SHIPPED_REGISTRY_PATH` /
  `branchForParcel` (not re-exported from the package index; import the
  emitter module directly). Its `dispatchWorktree` verb (NEW builder
  branches) is precedent for the no-clobber guards, not this parcel's
  mechanism (ratified amendment).
- `plugins/foreman-line/permission-profiles/permission-profiles.yaml` +
  `src/types.ts` (`PROFILE_NAMES`) — the exact `reviewer-readonly` profile.
- `plugins/foreman-line/permission-profiles/README.md` and `PROBE.md` — the
  session-start-load bound, its failure modes (subagent-inert, bypass-void),
  and the interactive-mode probe this parcel's AC-1 extends to headless mode.
- `plugins/foreman-line/skill-injection/skill-injection.yaml`
  (`adversarial_reviewer:` → `'*': [code-review]`) and
  `.../skill-injection/src/index.ts` (parse/validate exports).
- `plugins/foreman-line/verification/src/harness/index.ts` + `src/index.ts` —
  `allocateSequence` and the receipt-write/typed-error pattern to mirror;
  `AC-CONVENTION.md` + `AC_CONVENTION_PATH`.
- `plugins/foreman-line/receipts/src/{types.ts,paths.ts,validator.ts}` —
  `ReceiptDocument`, `receiptPath`, `validateChain` (AC4a/b, AC5c).
- `plugins/foreman-line/approval/src/index.ts` — `writeReceiptDocument`,
  `canonicalize`, `sha256Hex`.
- `plugins/foreman-line/dispatch/src/approval-cli/index.ts` — the
  emitter-injection + typed-error + emitter-first precedent (lesson #18).
- `plugins/foreman-line/docs/kickstarters/adversarial-review-SCAF-P1.md` (and
  siblings `adversarial-review-W0-P3/P4`, `permission-profile-registry-review-P3-A/B`)
  — the kickstarter shape to generate.
- `docs/SPEC-CONVENTION.md` §4 (schema v0.2);
  `docs/transcripts/defects_lessons.md` #12, #18, #20, #21, #22 (also #9,
  #10, #11, #19, #23 as cited inline);
  `plugins/foreman-line/docs/specs/done/W3-P1-verification-harness.md`.

## Open Questions (design decisions adopted with recommended defaults — coordinator may override at lint)

- **Findings wire format:** adopted — a fenced ` ```adversarial-findings `
  block containing a JSON `AdversarialFinding[]`, last-fence-wins. No repo
  precedent existed for a machine-readable reviewer output contract (prior
  reviews were prose transcribed by the coordinator); this is this parcel's
  design decision, carried in the spec + generated kickstarter only.
- **Quarantine location:** adopted —
  `docs/receipts/<workflowId>/quarantine/<seq6>-adversarial-raw.txt`,
  sequence-paired with the parse-failure receipt. No prior quarantine
  precedent in the repo; chosen to keep evidence adjacent to the receipt
  chain without perturbing `allocateSequence`'s `*.json` scan.
- **Probe evidence document:** adopted — new
  `verification/PROBE-HEADLESS.md` (mirrors `permission-profiles/PROBE.md`'s
  structure) rather than editing the shipped PROBE.md, with a hermetic proxy
  test asserting its existence + verdict line so AC-1 satisfies the named-test
  convention.
- **`launchReviewer` result shape on rung 1:** adopted — fire-and-return
  (`LaunchResult` carries the child-process handle/pid and stdio capture
  configuration via the injected seam); the coordinator, not this module, owns
  waiting for session completion. Flag for coordinator confirmation.
- **`parseAdversarialFindings` strictness on duplicate findings:** adopted —
  duplicates are legal (the frozen schema imposes no uniqueness); dedup, if
  ever wanted, is triage policy (W3-P3+), not parser policy.

## Verification Plan

Deterministic: `npx tsc --noEmit` (AC-3); `npx biome check .` (AC-4); full
`npx tsx --test tests/*.test.ts` including all pre-existing W3-P1 tests
(AC-21); scaffold-unchanged diff (AC-2); greps for bypass flags, git/Jira
calls, and regex-over-untrusted-text (AC-12, AC-18, AC-20). Runs in
PowerShell; `node -v` first; full-capture before `$LASTEXITCODE` (lessons
#10/#11). The AC-1 probe is executed and its evidence recorded in
`PROBE-HEADLESS.md` **before** the launch path is claimed complete; a FAIL
verdict triggers contingency rung 2 and a stop-report, not a rework of this
spec.

**Two independent adversarial reviews** (elevated / architecture/risk —
charter D5, lesson #12). Mandated focus questions:

1. **Envelope-binding reality:** does the AC-1 probe evidence actually show
   deny rules firing *in the headless session* (not inferred from file
   contents), with the positive control isolating cause? Is any completion
   claim resting on the interactive-mode PROBE.md evidence instead of the
   headless probe? Is a bypass flag representable anywhere in the launch path?
2. **Context-leak hunt (charter stop condition):** enumerate every string that
   can reach the generated kickstarter from `ReviewDispatchInput` and ambient
   reads; attempt to smuggle coordinator triage content through each (spec
   path, surfaces, skill names, canon refs) and confirm the type-level and
   test-level exclusions hold.
3. **Hostile reviewer output:** attack `parseAdversarialFindings` beyond the
   shipped fixtures — nested/adjacent fences, fences inside JSON strings,
   BOM/CRLF variants, 100k+ inputs, findings arrays with `__proto__` keys —
   and confirm linear-time behavior, all-or-nothing acceptance, and correct
   quarantine pairing (receipt sequence ↔ quarantine filename).
4. **Receipt-chain integrity:** perturb correlation identity, sequence gaps,
   and pre-existing quarantine files, and confirm `validateChain` acceptance
   of the emitted chain plus `allocateSequence` immunity to quarantine
   contents; confirm the stop-report path emits before any human-relay
   fallback proceeds (never-silent invariant, lessons #20/#21).

## Epic/Story Projection (proposal only — Jira registration is Stage B)

- **Epic:** Foreman Line - W3 Verification
  - **Story:** W3-P2 - Adversarial Reviewer dispatch-and-collect
    - **Task:** Headless-launch probe + `PROBE-HEADLESS.md` evidence + contingency ladder — AC-1, AC-14
    - **Task:** `src/adversarial/` sub-module + exports (no rescaffold) — AC-2, AC-3, AC-4, AC-5
    - **Task:** Kickstarter generator + zero-context guarantee + matrix resolution — AC-6, AC-7, AC-8
    - **Task:** `dispatchReview` emitter-first flow + review-dispatch sub-receipt — AC-9, AC-10, AC-11
    - **Task:** Launch-command builder + `launchReviewer` seam — AC-12, AC-13
    - **Task:** Parser + hostile-input fixtures + quarantine/collection receipts — AC-15, AC-16, AC-17
    - **Task:** Linear-time ops, typed-error wrapping, scope greps, dogfooded tests — AC-18, AC-19, AC-20, AC-21
