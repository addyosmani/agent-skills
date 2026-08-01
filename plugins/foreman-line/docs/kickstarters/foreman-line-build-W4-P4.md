# Builder Kickstarter — W4-P4 GitHub Gate Assembly + Stage-F Closure

You are the Builder for Foreman Line parcel **W4-P4** — GitHub gate assembly + Stage-F closure
receipt sealing the chain. Your spec — the sole source of truth — is
`plugins/foreman-line/docs/specs/active/W4-P4-github-gate-stage-f-closure.md` (status: active).
Read it in full, then every file its Context & References section names.

**Where you stand (non-negotiable):** worktree `C:\Repos\foreman-line-w4-p4`, branch
`feat/foreman-line-w4-p4` (verify with `git branch --show-current` before anything else). You
never touch `C:\Repos\kaseya-one-productivity-tools`'s working tree, never check out another
branch, never push. All work is committed on this branch in this worktree.

**What you are building:** three new source files extending the existing
`plugins/foreman-line/integration/` package (do NOT rescaffold — `package.json`, `tsconfig.json`,
`biome.json` are frozen):

1. `src/closure-receipt.ts` — the `emitClosureReceipt` Stage-F emitter: given the current chain-tip
   `ReceiptDocument` + `ClosureRecord` inputs, emits a `stage:'F'` receipt inheriting
   `correlationId`/`workflowId` from the tip.
2. `src/closure.ts` — two-phase coordinator-invoked orchestration: `prepareClosure` (Phase 1 —
   validates + loads chain tip, no side effects) / `executeClosure` (Phase 2 — Jira transition +
   comment + sealing Stage-F receipt, half-closed on post-merge Jira failure) /
   `retryHalfClosedClosure` (idempotent retry). Plus the `ClosureJiraTransport` injected boundary,
   its production adapter (`createClosureJiraAdapter`), the default-deny `assertClosureJiraGate`,
   and the `ClosureError` typed error class.
3. `src/gate-assembly.ts` — `composeRequiredChecks` + `buildBranchProtectionDiff`: pure functions
   producing a stop-and-present data artifact (`applied:false`), never applying a ruleset.

Plus `tests/closure-receipt.test.ts`, `tests/closure.test.ts`, `tests/gate-assembly.test.ts`, and
additive exports in `src/index.ts`.

**Environment:** Windows. Node toolchain in **PowerShell ONLY** (lesson #10); `node -v` first
(>=24.11.1). Exit codes read via full-capture before `$LASTEXITCODE` (lesson #11). No Git Bash for
Node/npm. Linear-time string guards throughout (lesson #19).

**Frozen / read-only (modification is a Stop-and-Report):** every existing file under
`plugins/foreman-line/integration/src/` and `plugins/foreman-line/integration/tests/`; all files
under `contracts/`, `receipts/`, `approval/`, `shaping/`, `projection/`, `registration/`,
`dispatch/`, `verification/`, `spec-linter/`, `permission-profiles/`; and
`.github/workflows/foreman-line-ci.yml` (byte-unchanged from `origin/main` — AC19).

## Step 0 — restate and STOP (mandatory gate)

Before writing any code: run `node -v` in PowerShell, confirm >=24.11.1. Then:

1. Restate the parcel scope in your own words — the three new source modules, what each builds,
   what they write/return, and the coordinator-invoked orchestration model.
2. Enumerate every file you will create or modify (exact paths). Boundary: three new
   `integration/src/*.ts` files + three new `integration/tests/*.test.ts` files +
   `integration/src/index.ts` (additive exports only — existing exports byte-unchanged). No other
   modifications; `.github/workflows/foreman-line-ci.yml` is untouched.
3. Confirm every Out of Scope item explicitly: no `foreman-line-ci.yml` amendment, no frozen-
   contract edit, no `integration → verification`/`dispatch`/`spec-linter` import, no git-mv/
   filesystem-move/commit/push inside the closure orchestration, no live Jira/GitHub/MCP call in
   tests.
4. State the current test count (90 passing on `origin/main`) and your planned test approach: how
   many files, which ACs each covers, expected new test count.
5. Flag every ambiguity, contradiction, or spec gap with a recommended resolution.

Then STOP for the coordinator's ruling. A real spec gap becomes a coordinator-ratified amendment
committed alone before code.

## Critical implementation notes (coordinator-verified)

### General constraints
- **No `foreman-line-ci.yml` amendment (AC19, Q6).** The workflow file is byte-unchanged. W4-P4's
  surface is `plugins/foreman-line/integration/` only. Diff the file against `origin/main` in the
  deterministic pass to confirm.
- **No frozen-contract change.** `ClosureRecord`/`closureRecordSchema`/`TicketTransition`/
  `SpecLifecycleMove` exist at `contracts/src/stages/f-closure.ts` — consumed read-only via
  relative ESM (`../../contracts/src/stages/f-closure.js`). Stage `'F'` is already in `STAGE_IDS`
  at `contracts/src/envelope.ts`. A need to touch any file under `contracts/` is a loop-stop.
- **No forbidden cross-package imports.** No `integration → verification`, `integration →
  spec-linter`, `integration → dispatch`. The ONLY new cross-package edge is `integration →
  registration` (gateway primitives — downstream→upstream, no cycle). Verify with a grep before
  claiming completion.
- **`IntegrationError` union is byte-unchanged (AC1, OQ4).** The shipped `integration/src/errors.ts`
  is frozen. `ClosureError` is a NEW class in `closure.ts` with its own `ClosureErrorCode` union —
  it does NOT extend `IntegrationError`. `emitClosureReceipt` throws `IntegrationError` (existing
  codes `PRIOR_CORRELATION_MISSING`/`RECEIPT_WRITE_FAILED` — the same two the Stage-E emitter uses).
- **All pre-existing 90 tests must stay green** in the final run.

### `closure-receipt.ts` — Stage-F emitter
- **Local copy of `inheritCorrelation` (AC1/OQ4).** Do NOT modify `integration/src/receipt.ts` or
  extract a shared helper. Copy the `inheritCorrelation` function body from `receipt.ts:67-110`
  verbatim (or adapt as needed) into `closure-receipt.ts`. The W4-P1 `receipt.ts` is byte-unchanged
  from `origin/main`; verify with a diff.
- Mirrors `emitIntegrationReceipt` exactly one stage later: `kind:'stage'`, `stage:'F'`,
  `claimRef:null`, `subjectKind:'ClosureRecord'`, `subject: closureRecord`,
  `sequence = prior.sequence + 1`, `prevHash = prior.hash`, `hash = sha256Hex(canonicalize(draft))`,
  `validateReceiptDocument` before write, `receiptPath(workflowId, sequence, 'F', 'ClosureRecord')`.
- Helpers: `canonicalize`, `sha256Hex`, `writeReceiptDocument` from `../../approval/src/index.js`;
  `receiptPath`, `validateReceiptDocument`, `validateChain` from `../../receipts/src/index.js`.
- Throws `IntegrationError('PRIOR_CORRELATION_MISSING')` — never mints a fresh `correlationId`.
  Throws `IntegrationError('RECEIPT_WRITE_FAILED')` on sequence/hash/write faults.

### `closure.ts` — orchestration + Jira transport
**`ClosureError` and error codes:**
```ts
export type ClosureErrorCode =
  | 'WORKFLOW_ID_INVALID'
  | 'CLOSURE_INPUT_INVALID'
  | 'MERGE_SHA_INVALID'
  | 'SPEC_MOVE_INVALID'
  | 'CHAIN_INVALID'
  | 'STAGE_E_TIP_INVALID'
  | 'RECEIPT_WRITE_FAILED'
  | 'JIRA_GATE_REFUSED'
  | 'JIRA_TRANSITION_UNAVAILABLE'
  | 'JIRA_CALL_FAILED'
  | 'CLOSURE_STATE_MISSING'
export class ClosureError extends Error {
  readonly code: ClosureErrorCode
  constructor(code: ClosureErrorCode, message: string) { ... }
}
```

**`ClosureJiraTransport` interface:**
```ts
export interface ClosureJiraTransport {
  getTransitions(issueKey: string): Promise<readonly { id: string; name: string; toStatus: string }[]>
  transitionIssue(issueKey: string, transitionId: string): Promise<void>
  addComment(issueKey: string, body: string): Promise<string>
}
```

**`createClosureJiraAdapter`:** follows `registration/src/adapter-docker-mcp.ts` pattern exactly —
inject `McpClientFactory` (default: `createDockerMcpAdapter` from `../../registration/src/index.js`),
stdio client against `atlassian-remote` gateway, lazy cloudId discovery via
`getAccessibleAtlassianResources`, `SITE_URL` from `registration/src/index.js`. Tool arg keys are
VERIFY-AT-PROBE (coordinator-owned live probe against throwaway `[TEST]` ticket at SCAF-P4 exit,
lessons #20/#21); define them as named string constants (e.g. `TOOL_GET_TRANSITIONS`,
`TOOL_TRANSITION_ISSUE`, `TOOL_ADD_COMMENT`) so they're trivially swappable. The adapter is
**never instantiated in deterministic tests** — tests inject a recording fixture transport.

**`assertClosureJiraGate(issueKey: string)`:** split the key on the first `-` (linear-time,
lesson #19 — NO regex split); project segment must be in `ALLOWED_PROJECT_KEYS` (from
`registration/src/index.js`). Throw `ClosureError('JIRA_GATE_REFUSED')` before any client call if
not. Embed this inside the adapter's `transitionIssue`/`addComment` methods as defense-in-depth.

**`mergeSha` shape guard:** 7–64 chars, lowercase hex `[0-9a-f]` only. Non-matching →
`ClosureError('MERGE_SHA_INVALID')`. Linear-time charset scan, no regex (lesson #19).

**`specLifecycleMove` path guard:** `from` must start with `docs/specs/active/` and end with
`.md`; `to` must start with `docs/specs/done/` and end with `.md`. No `..`, no absolute path, no
backslash, no control chars. Linear-time scan. Invalid → `ClosureError('SPEC_MOVE_INVALID')`.

**`prepareClosure` (Phase 1 — no side effects, no receipt):**
1. Validate `workflowId` against `UUID_PATTERN` (from `../../contracts/src/correlation.js`) →
   `WORKFLOW_ID_INVALID`.
2. Validate all input fields (non-empty strings, `mergeSha` hex, `specLifecycleMove` paths).
3. Load chain via injected `loadReceiptChainFn` (default: scan `docs/receipts/<workflowId>/` for
   conforming-named receipts `\d{6}-[A-F]-\S+\.json`, ignoring `quarantine/`/`rework/`/
   `human-gate/` subdirs and non-receipt files). Read and parse each file (typed try-catch, lesson
   #22). Run `validateChain` from `../../receipts/src/index.js` → `CHAIN_INVALID` if not valid.
4. Tip = highest-`sequence` receipt. Assert `tip.stage === 'E'` → `STAGE_E_TIP_INVALID`.
5. Return the `ClosurePackage` carrying the validated tip. No receipt written.

**`executeClosure` (Phase 2 — side-effectful, ordered):**
1. Idempotency pre-check: reload chain; if a `stage:'F'` / `subjectKind:'ClosureRecord'` sealing
   receipt exists → return `{kind:'closed', closureReceiptLocator, ticketTransition}` with zero
   transport calls/writes.
2. `assertClosureJiraGate(ticketKey)`.
3. Transition (idempotent): if `currentStatus === targetStatus` skip the `transitionIssue` call.
   Else call `getTransitions`, find the entry whose `.name === targetStatus` (case-sensitive; if
   absent or ambiguous → `JIRA_TRANSITION_UNAVAILABLE`). Call `transitionIssue(issueKey,
   resolvedId)`.
4. Call `addComment(issueKey, body)` where `body` contains only controlled/validated values:
   `workflowId`, Stage-E tip hash + locator, `mergeSha` (no reviewer/finding text — W3-P4 minimal-
   comment precedent).
5. **On any Jira failure at step 3 or 4:** emit a `kind:'claim'`, `stage:'F'`,
   `claimRef:'stage-f-half-closed'`, `subjectKind:'HalfClosedClosure'` receipt (chained off the
   current tip, inheriting correlation), where `subject` is `{ mergeSha, ticketKey,
   requestedStatus: targetStatus, currentStatus, failedStep: 'transition'|'comment', errorMessage,
   specLifecycleMove, stageETip: { hash, locator } }`. Use `emitClosureReceipt`'s sibling logic
   (local `inheritCorrelation`, same sequence/prevHash/hash/validate/write pattern) but with
   `kind:'claim'`, non-null `claimRef`. **Return** `{ kind:'half-closed',
   halfClosedReceiptLocator }` — do NOT throw.
6. **On Jira success:** build `ClosureRecord { mergeSha, ticketTransition: { ticketKey,
   fromStatus: currentStatus, toStatus: targetStatus }, specLifecycleMove }`. Call
   `emitClosureReceipt({ closureRecord, priorReceipt: <current tip>, repoRoot, writeFn })`.
   Return `{ kind:'closed', closureReceiptLocator, ticketTransition }`.

All boundaries — chain load, each transport call, receipt write — wrapped in typed try-catch
(lesson #22). Failures before the first Jira call (bad gate, bad input, bad tip) **throw**
`ClosureError`. Failures after the merge (Jira steps 3/4) **return** the half-closed state.

**`retryHalfClosedClosure`:**
1. Idempotency pre-check → `{kind:'closed'}` if already sealed (zero calls/writes).
2. Find the most-recent `claimRef:'stage-f-half-closed'` receipt on the chain → `CLOSURE_STATE_MISSING` if none found and no seal (the coordinator re-runs `prepareClosure`/`executeClosure` from scratch for the no-progress case; step-3 idempotency handles crash-after-transition).
3. Reconstruct from the half-closed subject, re-run steps 3–6 of `executeClosure` (respecting the
   already-satisfied transition rule — `failedStep === 'comment'` means transition already done).
   On repeated failure emit another half-closed receipt and return `kind:'half-closed'`.

### `gate-assembly.ts` — pure composition
Both functions are **pure** (no GitHub API calls, no mutations):

```ts
export interface CandidateCheck { readonly name: string; readonly owningWorkflow: string; readonly blocking: boolean }
export interface RequiredCheckComposition {
  readonly requiredChecks: readonly string[]
  readonly requirePullRequest: boolean
  readonly requireHumanReview: boolean
  readonly rationale: readonly string[]
}
export function composeRequiredChecks(candidates: readonly CandidateCheck[]): RequiredCheckComposition

export interface BranchProtectionDiff {
  readonly applied: false
  readonly currentPosture: BranchProtectionVerdict
  readonly desiredRuleset: unknown
  readonly diff: readonly string[]
  readonly humanChecklist: readonly string[]
}
export function buildBranchProtectionDiff(
  current: EffectiveRulesResponse,
  desired: RequiredCheckComposition,
  identity: string,
): BranchProtectionDiff
```

`composeRequiredChecks`: filter `candidates` to the blocking ones and extract their names into
`requiredChecks`; set `requirePullRequest: true`, `requireHumanReview: true`, populate `rationale`.
Report-only candidates are NOT included in `requiredChecks`.

`buildBranchProtectionDiff`: call `verifyBranchProtectionPosture(current, identity)` (W4-P1,
`../../integration/src/branch-protection.js` — same package, relative import) to produce
`currentPosture`; compute the gap between current required checks and `desired.requiredChecks`;
build `desiredRuleset` (a plain data object describing the desired GitHub ruleset config), `diff`
(human-readable current→desired deltas), `humanChecklist` (the D8 stop-and-present steps for a
human to follow). Always `applied: false`. Calls NO mutating API.

### Cross-package imports (relative ESM `.js`)
```
../../contracts/src/index.js              — UUID_PATTERN, ClosureRecord, TicketTransition, SpecLifecycleMove, closureRecordSchema, STAGE_IDS
../../contracts/src/stages/f-closure.js  — ClosureRecord, TicketTransition, SpecLifecycleMove (if preferred over index)
../../approval/src/index.js              — canonicalize, sha256Hex, writeReceiptDocument
../../receipts/src/index.js              — receiptPath, validateReceiptDocument, validateChain, ReceiptDocument
../../registration/src/index.js          — createDockerMcpAdapter, McpClientFactory, McpToolClient, SITE_URL, ALLOWED_PROJECT_KEYS, assertRegistrationGate
./branch-protection.js                   — verifyBranchProtectionPosture, EffectiveRulesResponse, BranchProtectionVerdict, fetchEffectiveRulesLive (gate-assembly)
./errors.js                              — IntegrationError (closure-receipt only; ClosureError is new in closure.ts)
```

Do NOT use workspace bare specifiers (`@foreman-line/...`). Do NOT import from
`../../registration/src/adapter-docker-mcp.ts` directly — only via `index.js`.

### Hermetic test requirements
- **Zero network, zero process spawn, zero docker, zero external-repo path** in tests.
- `ClosureJiraTransport` in tests: a recording fixture that stores calls and returns configured
  responses or throws — never the real adapter.
- Chain fixtures: build synthetic `genesis→A→B→C→D→E` chains in a temp `repoRoot` (e.g.
  `os.tmpdir()` sub-path, unique per test). Write fixtures via `writeReceiptDocument` or build
  plain objects matching the schema. The chain-validation AC (AC6) must run the **real**
  `emitClosureReceipt`, not a reconstruction.
- `loadReceiptChainFn` seam: inject fixture chain arrays directly instead of disk scan in most
  tests; use a temp-dir fixture for the few tests that exercise the real disk scan.
- A grep in the deterministic pass confirms `tests/closure*.test.ts` and
  `tests/gate-assembly.test.ts` contain no: `docker`, `StdioClientTransport`, `child_process`,
  `spawn(`, live `gh`/`git` (outside the seam default).

## Build rules
- Commits end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
- Every external boundary is wrapped in typed try-catch (lesson #22). No untyped `catch(e)`.
- Linear-time string handling throughout (no polynomial regex on untrusted input — lesson #19).
- `npx tsc --noEmit`, `npx tsx --test tests/*.test.ts`, `npx biome check .` must all pass in
  `integration/` (PowerShell, `node -v` first) before claiming completion. The existing 90 tests
  must remain green.
- AC19 diff: `.github/workflows/foreman-line-ci.yml` byte-unchanged from `origin/main`.
- AC1 diff: `integration/src/receipt.ts`, `branch-protection.ts`, `audit-trigger.ts`,
  `governing-spec.ts`, `pr-plan.ts`, `report.ts`, `errors.ts` byte-unchanged from `origin/main`.
- Forbidden-import grep: `grep -rE "from '.*verification" src/` and
  `grep -rE "from '.*dispatch" src/` and `grep -rE "from '.*spec-linter" src/` — zero matches.
- Correlation-mint guard: `grep -rE "generateCorrelationContext|correlationId.*randomUUID|randomUUID.*correlationId" src/` — zero matches (only `sessionId`/`runId` use `randomUUID`).
- No `git mv`, no `fs.rename`, no `writeFileSync` (only `writeReceiptDocument`): `grep -rE "git mv|fs\.rename|renameSync" src/` — zero matches.
- `git diff --stat origin/main` (lesson #26) before opening the PR — verify only expected files changed.

## Completion claim format

Map each AC number (AC1 through AC22) to concrete evidence. State:
- Total test count (90 prior + N new, all green).
- Which test files cover which ACs.
- AC1 frozen-sibling evidence (diff commands + outputs).
- AC6 chain-validates-through-F: the real `emitClosureReceipt` was called; `validateChain` passes.
- AC19 workflow-unchanged evidence.
- The four grep results (forbidden imports, correlation-mint guard, no git-mv, no docker in tests).
- That `npx tsc --noEmit`, `npx tsx --test`, `npx biome check .` all pass.

A wrong-shaped completion claim is presumptively empty. Do not claim completion until all three deterministic checks pass.
