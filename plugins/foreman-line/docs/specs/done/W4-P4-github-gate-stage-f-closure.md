---
ticket: KONE-TBD
title: Foreman Line - W4-P4 GitHub gate assembly + Stage-F closure (required-check composition + branch-protection diff + merge->Jira->closure receipt sealing the chain)
status: active
owner: clinton.morgan
created: 2026-07-27
updated: 2026-07-27
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/integration/]
routing_class: architecture/risk
permission_profile: builder-architecture
---

# W4-P4 — GitHub gate assembly + Stage-F closure

## Intent

Build **Stage F (Closure)** of the Foreman Line plus the **GitHub gate-assembly**
composition — the capability that, once a human has merged the parcel PR, seals the
receipt chain and records the closure. Three testable capabilities, all pure/injectable
functions extending the shipped `plugins/foreman-line/integration/` package (Stage E and
Stage F are cohesive; the Stage-F emitter mirrors W4-P1's `emitIntegrationReceipt` exactly
one stage later):

1. **Stage-F closure receipt emitter** — `emitClosureReceipt(...)`: given the current
   chain-tip `ReceiptDocument` (the shipped Stage-E receipt at first attempt) plus the merge
   SHA, the ticket transition, and the spec lifecycle move, build a `kind:'stage'`,
   `stage:'F'`, `subjectKind:'ClosureRecord'` receipt whose subject is the frozen
   `ClosureRecord`, **inheriting `correlationId`/`workflowId`** from the tip (minting only
   fresh `sessionId`/`runId`), sealing the chain. Fail-loud on missing prior correlation —
   never mint.
2. **Closure orchestration triggered by the human merge** — a coordinator-invoked
   two-phase `prepareClosure` / `executeClosure` library API (mirroring the shipped W2-P2 /
   W3-P4 prepare/execute one-tap contract): validate the Stage-E tip on disk, transition the
   Jira ticket to closed **reusing the W1-P4 transport pattern/gateway** (a new injected
   `ClosureJiraTransport` over `registration/`'s primitives — NOT a rebuild, NOT a frozen-
   method call), record the spec `active/ -> done/` lifecycle move in the `ClosureRecord`,
   and emit the sealing Stage-F receipt. An **approve-then-Jira-fail** (merge succeeded, Jira
   transition/comment failed) emits a named `half-closed` claim receipt and **returns** that
   state for idempotent retry — it does not throw (mirroring W3-P4).
3. **GitHub gate assembly (the D8-bounded part)** — `composeRequiredChecks(...)` +
   `buildBranchProtectionDiff(...)`: compose/document the required-check set + human-review
   requirement and **produce** the branch-protection/ruleset config diff (verified via the
   effective-rules posture using W4-P1's `verifyBranchProtectionPosture` over an **injected**
   payload) as a **stop-and-present data artifact**. It NEVER applies the ruleset, calls no
   mutating GitHub API, and adds no required-status job. Application + required-status
   promotion are **human D8 steps** at SCAF-P4 exit.

W4-P4 builds the *capability*; the LIVE closure (real merge SHA, real Jira transition, real
effective-rules fetch, real spec `git mv`) runs during **SCAF-P4's** travel. Per the
coordinator's Step-0 rulings (Q1-Q7, 2026-07-27): closure is coordinator-invoked (not a CI
job); the spec `active/ -> done/` git move is **recorded-only** (the coordinator performs the
`git mv` in the normal Stage-F closure PR); **no `foreman-line-ci.yml` amendment** (Q6).

## Constraints

- **Build shape (charter D2) — extend the shipped `integration/` package (coordinator ruling,
  Step 0).** New files live in `plugins/foreman-line/integration/src/`: `closure-receipt.ts`
  (the `emitClosureReceipt` Stage-F emitter), `closure.ts` (the `prepareClosure`/
  `executeClosure`/`retryHalfClosedClosure` orchestration + the injected `ClosureJiraTransport`
  boundary + production adapter + default-deny gate + `ClosureError`), and `gate-assembly.ts`
  (`composeRequiredChecks` + `buildBranchProtectionDiff`). New tests in `tests/*.test.ts`
  (`tsx --test`). Mirror the package's existing shape exactly (`"type":"module"`,
  `engines.node >=24.11.1`, relative ESM specifiers). `src/index.ts` gains exports **additively**
  (every pre-existing W4-P1/P3 export remains exported unchanged). Rationale for extending vs. a
  new `closure/` package: Stage E and F are cohesive; the Stage-F emitter reuses the exact
  `integration/` helpers and the local correlation-inherit pattern; one owning workflow per
  surface (PR4-9).
- **No frozen-contract change (loop-stop guard).** No file under
  `plugins/foreman-line/contracts/` is edited. Verified on disk: `ClosureRecord` /
  `closureRecordSchema` exist (`contracts/src/stages/f-closure.ts`), and `stage:'F'` is in
  `STAGE_IDS` (`contracts/src/envelope.ts`). The emitter **consumes** these read-only via
  relative ESM specifiers. A need to touch a frozen contract is a **loop-stop** — STOP and
  report; not a build decision. (Note: the frozen `f-closure.ts` doc-comment example says
  `specs/shipped/`, but the real convention is `specs/done/` — this parcel uses `done/`.)
- **No forbidden cross-package import edges.** No `integration -> verification`,
  `integration -> spec-linter`, or `integration -> dispatch` import (the W4-P0/P1/P3 rule).
  `integration -> registration` **is** permitted (registration is a W1 base package;
  `verification` itself consumes it) and is how the Jira transport is reused. The correlation-
  inherit helper is a **local** copy (see below), not an import from `verification`.
- **CROSS-PARCEL CORRELATION INVARIANT (load-bearing — from W4-P0).** The Stage-F receipt (and
  any intermediate `half-closed` receipt) MUST **inherit** the current chain-tip receipt's
  `correlationId` **and** `workflowId`, minting only fresh `sessionId`/`runId`. Minting a fresh
  `correlationId` is **forbidden** — it fails the receipts validator's AC5c invariant
  (`receipts/src/validator.ts`, `checkSharedCorrelation`) and would break SCAF-P4's A->F exit
  chain. Mirror W4-P1's local `inheritCorrelation` (`integration/src/receipt.ts:67-110`,
  itself adapted from `verification/src/harness/index.ts`) as a **local** helper wrapped in a
  typed try-catch (lesson #22). To keep the shipped `receipt.ts` byte-unchanged, the builder
  copies the local `inheritCorrelation` into `closure-receipt.ts` (the W4-P1 local-copy
  precedent) OR extracts a package-internal helper consumed by both — provided `receipt.ts`'s
  exported behavior stays byte-identical. Default: local copy.
- **Receipt assembly mirrors the shipped Stage-C/E path.** Build the Stage-F draft, hash via
  `sha256Hex(canonicalize(draft))` and write via `writeReceiptDocument` (all from
  `approval/src/index.js`), locator `receiptPath(workflowId, sequence, 'F', 'ClosureRecord')`
  (`receipts/src/index.js`), `validateReceiptDocument` before write — exactly as
  `integration/src/receipt.ts` does for Stage E. `sequence` is `priorReceipt.sequence + 1` and
  `prevHash` is `priorReceipt.hash` (derived from the passed current tip, not minted, not
  re-scanned inside the emitter — the caller-passes-tip contract, W4-P1 precedent + FUP RW3).
  The emitter throws the shipped `IntegrationError` (existing codes `PRIOR_CORRELATION_MISSING`
  / `RECEIPT_WRITE_FAILED` — **no change to `IntegrationError`'s union**).
- **Closure is a coordinator-invoked two-phase library API (coordinator ruling Q1) — NOT a CI
  job.** A post-merge CI job would need Jira secrets in CI (violates the hermetic/no-secrets
  mandate + D8) and would push the spec-move/receipt to `main` (violates standing-authorization
  4 — closure commits go through PRs). `prepareClosure` (Phase 1) validates everything and
  writes no receipt (no chain residue if never executed); the coordinator observes the human
  merge; `executeClosure` (Phase 2) performs the Jira transition + receipt. The coordinator's
  invocation between the two phases is the "tap" (the W2-P2/W3-P4 contract — no prompt/TTY
  surface is invented). There is **no decline branch**: not closing is simply not invoking
  `executeClosure`.
- **`mergeSha` and the merged state are honest caller inputs (coordinator ruling Q1).** The
  orchestrator cannot verify a live merge hermetically; `mergeSha` (and the coordinator-observed
  `currentStatus`) are supplied by the coordinator **after** the human merge, validated for
  shape (`mergeSha` non-empty 7-64 char lowercase hex; `MERGE_SHA_INVALID` otherwise). This
  mirrors W4-P1's caller-passes-tip contract; a runtime "is-actually-merged" check is a possible
  future follow-up, not this parcel.
- **Spec `active/ -> done/` move is RECORDED-ONLY (coordinator ruling Q2).** The orchestrator
  captures `specLifecycleMove {from: docs/specs/active/<slug>.md, to: docs/specs/done/<slug>.md}`
  in the `ClosureRecord` and emits the Stage-F receipt; it performs **no `git mv`, no filesystem
  move, no commit, no push**. The actual move + closure commit is the coordinator's normal
  Stage-F closure PR (as every prior parcel did; W3-P4 moved no spec). Both paths are shape-
  validated (repo-relative POSIX, `from` under `docs/specs/active/`, `to` under
  `docs/specs/done/`, no `..`/absolute/backslash/control chars — the W3-P4 RH-1 linear-time
  guard; `SPEC_MOVE_INVALID` otherwise).
- **Jira transport reuse (coordinator ruling Q4) — reuse the W1-P4 pattern/gateway, do NOT
  rebuild it and do NOT reopen frozen `registration/`.** The frozen `JiraTransport`
  (`registration/src/types.ts`) has **no transition method** and `updateIssue` cannot set
  `status` (update-never-clobber — verified for W3-P4). So the transition is a **new injected
  `ClosureJiraTransport` boundary** in this module (`getTransitions`/`transitionIssue`/
  `addComment`) whose production adapter reuses `registration/`'s exported gateway primitives
  (`createDockerMcpAdapter`/`McpClientFactory`/`SITE_URL`, cloudId discovery, the
  `atlassian-remote` stdio gateway) calling `getTransitionsForJiraIssue` / `transitionJiraIssue`
  / `addCommentToJiraIssue` — tool arg keys + response shapes are **VERIFY-AT-PROBE** (lessons
  #20/#21), a coordinator-owned live probe against a throwaway `[TEST]` fixture ticket, not
  builder scope. This deliberately parallels W3-P4's `HumanGateJiraTransport` transition-by-name
  logic (both hermetically tested; sharing it would need an `integration -> verification` edge or
  a frozen-`registration/` reopen — both refused). Consolidation is recorded as follow-up
  **W4-FUP-JIRA**.
- **Default-deny Jira gate (standing authorization 6):** `assertClosureJiraGate(issueKey)` — the
  key's project segment (text before the first `-`, linear-time split) must be a member of the
  imported `ALLOWED_PROJECT_KEYS` (`registration/`, verified content `["KONE"]`); anything else
  throws typed `ClosureError('JIRA_GATE_REFUSED')` **before any client call**, embedded in the
  adapter's mutating methods as defense-in-depth (the R4 pattern). The transition id is never
  guessed: resolved from the live `getTransitions` response by matching the coordinator-supplied
  `targetStatus` against the transition **name only** (RH-7 — `toStatus` is informational, never
  matched); a target status not offered by the ticket's current workflow state is
  `JIRA_TRANSITION_UNAVAILABLE`, not a raw-id write.
- **Sealing order + half-closed as returned state (coordinator ruling Q5).** The human merge is
  already durable on `main` (captured by `mergeSha`), so no pre-Jira receipt is needed. Order:
  (merge -> `mergeSha` durable) -> idempotency pre-check -> gate -> transition Jira -> comment ->
  on success emit the sealing `kind:'stage'` / `stage:'F'` / `subjectKind:'ClosureRecord'`
  receipt (it carries `toStatus`, so it can only seal **post-transition**) inheriting
  `correlationId`/`workflowId` from the current tip. On any Jira failure (transition or comment)
  emit a named half-closed **`kind:'claim'`** sub-receipt (`claimRef:'stage-f-half-closed'`) and
  **return** `{kind:'half-closed', ...}` — a Jira failure after merge is a returned state, not a
  thrown error (PRF-12c). Failures *before* the first Jira call (bad gate, bad input, bad tip)
  still throw typed `ClosureError`.
- **GitHub gate assembly produces DATA, never applies it (coordinator ruling Q3 / D8).**
  `composeRequiredChecks` + `buildBranchProtectionDiff` are pure functions over **injected**
  descriptors (candidate checks) and an **injected** current `EffectiveRulesResponse` (fixtured
  in tests; the live effective-rules fetch is `fetchEffectiveRulesLive` from W4-P1, returning
  `unknown`, exercised live only by the human/coordinator at SCAF-P4 exit — lesson #15/#28).
  They return a stop-and-present artifact (`applied: false`) — the desired required-status set +
  human-review requirement + the ruleset config diff + a human checklist — reusing
  `verifyBranchProtectionPosture` (W4-P1) to report the current posture and the gap. They call
  **no** GitHub write API, apply **no** ruleset, and add **no** required-status job. The actual
  ruleset application + required-status promotion are **human D8 stop-and-present steps** at
  SCAF-P4 exit.
- **No `foreman-line-ci.yml` amendment (coordinator ruling Q6).** W4-P4's surface is
  `plugins/foreman-line/integration/` only. The workflow file is **byte-unchanged** from
  `origin/main`. PR4-9's "P4 amends" was collision discipline *if* P4 touched the workflow — it
  does not (the gate composition is delivered as data + the branch-protection application is the
  human D8 step). A CI posture-annotation is a trivial future follow-on if ever wanted.
- **Hermetic tests are mandatory (charter D2 / PR4-5).** `plugins.yml:44-78` auto-runs
  `npm test` on **every** package as a **blocking** gate on `ubuntu-latest`. The `integration/`
  suite MUST stay fully hermetic: **no secrets, no network, no live `gh`/`git`/`docker`, no
  external-repo path.** Every external effect — the Jira transport, the receipt-chain load, the
  effective-rules payload, the receipt write — is an **injected function seam** (default = real,
  tests = recording fixtures / fixture data). The production `ClosureJiraTransport` adapter's
  default client factory is never instantiated by a deterministic test.
- **Untrusted-text discipline.** The Jira receipt-chain comment body interpolates only
  controlled/validated values (workflowId, the validated Stage-E tip hash + locator, `mergeSha`)
  — no reviewer/finding text, no spec-body text (W3-P4 minimal-comment precedent). The
  spec-move-path guard is a linear-time charset/shape scan (lesson #19; survives CodeQL
  polynomial-redos).
- **Typed try-catch on every external boundary (lesson #22).** Receipt-dir scan, chain-tip read,
  receipt read/write, and each transport method are wrapped, rethrowing (or, post-merge/post-
  Jira, recording) `ClosureError`/`IntegrationError`; no foreign exception escapes the public API.
- **Deterministic-pass environment (lessons #10/#11):** PowerShell; `node -v` first; full-capture
  before `$LASTEXITCODE`. **Lesson #26:** run `git diff --stat origin/main` before opening the PR
  (standing per-parcel gate; P0-P4 land serially to main between builder branches).
- **Integration is PR-only; the spec moves to `done/` in the coordinator's Stage-F closure PR.**

## Design

### Stage-F receipt emitter (`closure-receipt.ts`)

```ts
export interface EmitClosureReceiptArgs {
  readonly closureRecord: ClosureRecord          // frozen: { mergeSha, ticketTransition, specLifecycleMove }
  readonly priorReceipt: ReceiptDocument         // the CURRENT chain tip (Stage-E first attempt; the
                                                 // half-closed receipt on a retry) — caller passes the tip
  readonly repoRoot: string
  readonly writeFn?: WriteReceiptFn              // injected write seam; default = real writeReceiptDocument
}
export function emitClosureReceipt(args: EmitClosureReceiptArgs): ReceiptDocument
```

Mirrors `emitIntegrationReceipt` one stage later: `kind:'stage'`, `stage:'F'`, `claimRef:null`,
`subjectKind:'ClosureRecord'`, `subject: closureRecord`, `correlation` inherited from the tip
(fresh `sessionId`/`runId` only), `sequence = prior + 1`, `prevHash = prior.hash`, `hash =
sha256Hex(canonicalize(draft))`, `validateReceiptDocument` before write, locator
`receiptPath(workflowId, sequence, 'F', 'ClosureRecord')`. Throws `IntegrationError`
(`PRIOR_CORRELATION_MISSING` on a bad prior correlation — never mints; `RECEIPT_WRITE_FAILED` on
sequence/hash/write faults).

### Closure orchestration (`closure.ts`)

```ts
export interface ClosureInput {
  readonly workflowId: string
  readonly ticketKey: string
  readonly targetStatus: string                  // transition resolved by NAME
  readonly currentStatus: string                 // coordinator-observed fromStatus (see OQ2)
  readonly mergeSha: string
  readonly specLifecycleMove: { readonly from: string; readonly to: string }  // active/ -> done/, recorded-only
  readonly repoRoot?: string
}
export interface ClosurePackage {
  readonly workflowId: string
  readonly ticketKey: string
  readonly targetStatus: string
  readonly currentStatus: string
  readonly mergeSha: string
  readonly specLifecycleMove: { readonly from: string; readonly to: string }
  readonly stageETip: ReceiptDocument            // validated chain tip (must be stage:'E')
}
export type ClosureResult =
  | { kind: 'closed'; closureReceiptLocator: string; ticketTransition: TicketTransition }
  | { kind: 'half-closed'; halfClosedReceiptLocator: string; failedStep: 'transition' | 'comment' }

export interface PrepareClosureDeps { readonly loadReceiptChainFn?: LoadReceiptChainFn }   // default: scan docs/receipts/<workflowId>/
export interface ExecuteClosureDeps { readonly transport: ClosureJiraTransport; readonly writeFn?: WriteReceiptFn; readonly loadReceiptChainFn?: LoadReceiptChainFn }

export function prepareClosure(input: ClosureInput, deps?: PrepareClosureDeps): Promise<ClosurePackage>
export function executeClosure(pkg: ClosurePackage, deps: ExecuteClosureDeps): Promise<ClosureResult>
export function retryHalfClosedClosure(workflowId: string, deps: ExecuteClosureDeps & { repoRoot?: string }): Promise<ClosureResult>

export interface ClosureJiraTransport {
  getTransitions(issueKey: string): Promise<readonly { id: string; name: string; toStatus: string }[]>
  transitionIssue(issueKey: string, transitionId: string): Promise<void>
  addComment(issueKey: string, body: string): Promise<string>
}
export function createClosureJiraAdapter(clientFactory?: McpClientFactory): ClosureJiraTransport & { dispose(): Promise<void> }
export function assertClosureJiraGate(issueKey: string): void
export class ClosureError extends Error { readonly code: ClosureErrorCode /* see below */ }
```

**`prepareClosure` (Phase 1 — no side effects, no receipt):**
1. `workflowId` validated against `UUID_PATTERN` before any filesystem access
   (`WORKFLOW_ID_INVALID`).
2. Input shape guards: `ticketKey`/`targetStatus`/`currentStatus` non-empty; `mergeSha` matches
   the hex shape (`MERGE_SHA_INVALID`); `specLifecycleMove` passes the path guard
   (`SPEC_MOVE_INVALID`).
3. Load the chain via the injected `loadReceiptChainFn` (default: scan
   `docs/receipts/<workflowId>/` conforming-named receipts, ignoring `quarantine/`/`rework/`/
   `human-gate/` and non-receipt files) and run `validateChain` (`CHAIN_INVALID` on a broken/
   correlation-perturbed chain — closure never seals on top of a broken chain).
4. The tip = highest-`sequence` receipt; assert it is `stage:'E'` (`STAGE_E_TIP_INVALID`
   otherwise — Stage F chains off Stage E). Return the package carrying the validated tip
   `ReceiptDocument`. **No receipt is written** (an unexecuted package leaves no residue).

**`executeClosure` (Phase 2 — side-effectful, ordered; each boundary typed try-catch):**
1. **Idempotency pre-check:** reload the chain; if a `stage:'F'` `ClosureRecord` sealing receipt
   already exists, return `{kind:'closed', ...}` referencing it with **zero** transport calls and
   **zero** writes (RH-3 precedent).
2. `assertClosureJiraGate(ticketKey)` (KONE-only).
3. **Transition (idempotent):** if `currentStatus === targetStatus`, the transition is treated
   as already satisfied (no `transitionIssue` call — handles a crash-after-transition re-run).
   Otherwise resolve the transition id from `getTransitions` by **name** match on `targetStatus`
   (`JIRA_TRANSITION_UNAVAILABLE` if absent/ambiguous) and call `transitionIssue`.
4. `addComment` with the receipt-chain link (workflowId, Stage-E tip hash + locator, `mergeSha`).
5. **On Jira failure at step 3 or 4:** emit the half-closed claim receipt
   (`kind:'claim'`, `stage:'F'`, `claimRef:'stage-f-half-closed'`,
   `subjectKind:'HalfClosedClosure'`, subject `{ mergeSha, ticketKey, requestedStatus,
   currentStatus, failedStep, errorMessage, specLifecycleMove, stageETip:{hash,locator} }`),
   chained off the current tip (inherits correlation), and **return** `{kind:'half-closed', ...}`
   (not thrown).
6. **On Jira success:** build `ClosureRecord {mergeSha, ticketTransition:{ticketKey,
   fromStatus:currentStatus, toStatus:targetStatus}, specLifecycleMove}`, call
   `emitClosureReceipt(priorReceipt=<current tip>, ...)` to seal, and return
   `{kind:'closed', closureReceiptLocator, ticketTransition}`.

**`retryHalfClosedClosure` (idempotent, no re-merge, no re-approval):**
1. Idempotency pre-check as above -> `{kind:'closed'}` no-op if already sealed.
2. Require an existing `stage-f-half-closed` receipt on the chain; none (and no closure) ->
   `CLOSURE_STATE_MISSING` (nothing in-progress to retry — the coordinator runs
   `prepareClosure`/`executeClosure` afresh, whose step-3 idempotency covers the
   crash-after-transition-before-any-receipt state).
3. Reconstruct from the half-closed receipt's subject (`mergeSha`, `ticketKey`,
   `requestedStatus`, `currentStatus`, `specLifecycleMove`, `stageETip`) and re-run steps 3-6 of
   `executeClosure` (respecting the already-satisfied-transition rule); on repeat failure emit a
   further half-closed receipt (each attempt is chain evidence). No re-approval, no human input,
   no attempt cap (retry authority/pacing are the coordinator's).

**`ClosureErrorCode`:** `WORKFLOW_ID_INVALID`, `CLOSURE_INPUT_INVALID`, `MERGE_SHA_INVALID`,
`SPEC_MOVE_INVALID`, `CHAIN_INVALID`, `STAGE_E_TIP_INVALID`, `RECEIPT_WRITE_FAILED`,
`JIRA_GATE_REFUSED`, `JIRA_TRANSITION_UNAVAILABLE`, `JIRA_CALL_FAILED` (recorded in the
half-closed subject when post-merge; thrown when pre-Jira), `CLOSURE_STATE_MISSING`. (The
sealing/half-closed emit itself reuses the shipped `IntegrationError` codes; `ClosureError` is
this module's own class — the W4-P1 `IntegrationError` union is byte-unchanged.)

### GitHub gate assembly (`gate-assembly.ts`)

```ts
export interface CandidateCheck { readonly name: string; readonly owningWorkflow: string; readonly blocking: boolean }
export interface RequiredCheckComposition {
  readonly requiredChecks: readonly string[]     // check names that SHOULD gate the merge
  readonly requirePullRequest: boolean
  readonly requireHumanReview: boolean
  readonly rationale: readonly string[]
}
export function composeRequiredChecks(candidates: readonly CandidateCheck[]): RequiredCheckComposition

export interface BranchProtectionDiff {
  readonly applied: false                         // ALWAYS false — this is a stop-and-present artifact
  readonly currentPosture: BranchProtectionVerdict // from W4-P1 verifyBranchProtectionPosture over the injected current rules
  readonly desiredRuleset: unknown                 // the ruleset config a human would apply
  readonly diff: readonly string[]                 // human-readable required->desired deltas
  readonly humanChecklist: readonly string[]       // the D8 stop-and-present steps
}
export function buildBranchProtectionDiff(
  current: EffectiveRulesResponse,                 // INJECTED (fixtured in tests; live fetch is human at exit)
  desired: RequiredCheckComposition,
  identity: string,
): BranchProtectionDiff
```

Both are pure. `buildBranchProtectionDiff` reuses `verifyBranchProtectionPosture` (W4-P1) to
report the current posture over the **injected** effective-rules payload and computes the gap to
`desired`; it produces a data artifact (`applied:false`) and **never** calls a mutating GitHub
API. The required-status promotion the artifact describes is the SCAF-P4 human D8 step.

## Acceptance Criteria

1. **Package extension + additive surface + no forbidden edges + no contract edit.**
   `integration/src/` gains `closure-receipt.ts`, `closure.ts`, `gate-assembly.ts`; `src/index.ts`
   additionally exports `emitClosureReceipt` (+ `EmitClosureReceiptArgs`), `prepareClosure`,
   `executeClosure`, `retryHalfClosedClosure`, `ClosureJiraTransport`, `createClosureJiraAdapter`,
   `assertClosureJiraGate`, `ClosureError`, and the public types (`ClosureInput`,
   `ClosurePackage`, `ClosureResult`, `ClosureErrorCode`, gate-assembly types), while **every
   pre-existing W4-P1/P3 export remains exported unchanged**. No file under `contracts/` is edited
   (`ClosureRecord`/`closureRecordSchema` + `stage:'F'` imported read-only via relative ESM). A
   grep confirms no `integration -> verification`/`spec-linter`/`dispatch` import; the only new
   cross-package import is `integration -> registration` (gateway primitives). The shipped
   `receipt.ts`/`branch-protection.ts`/`audit-trigger.ts`/`governing-spec.ts`/`pr-plan.ts`/
   `report.ts` and `IntegrationError`'s code union are byte-unchanged from `origin/main` (a test
   or the deterministic pass diffs them).

2. **Stage-F emitter — signature + subject.** `emitClosureReceipt(...)` produces a `stage:'F'`,
   `kind:'stage'`, `subjectKind:'ClosureRecord'` receipt whose `subject` is exactly the frozen
   `ClosureRecord {mergeSha, ticketTransition{ticketKey,fromStatus,toStatus},
   specLifecycleMove{from,to}}`. A test asserts the shape and that `subject` deep-equals the
   supplied `ClosureRecord`.

3. **Correlation inheritance.** The emitted Stage-F receipt's
   `correlation.correlationId === priorReceipt.correlation.correlationId` and
   `correlation.workflowId === priorReceipt.correlation.workflowId`, while `sessionId`/`runId`
   are freshly minted (differ from the prior receipt's and from the correlationId).

4. **Fail-loud on a bad prior correlation.** If the prior (tip) receipt lacks a valid string
   `correlation.correlationId`/`workflowId`, `emitClosureReceipt` throws
   `IntegrationError('PRIOR_CORRELATION_MISSING')` — it **never** mints a fresh `correlationId`.
   Separate tests assert the throw for a missing/empty/whitespace-only/non-string `correlationId`
   **and** for a valid `correlationId` with a bad `workflowId` (locks the `workflowId` branch —
   the W4-P1 RW2 precedent).

5. **Sequence + prevHash + validation + locator.** The emitted receipt's `sequence` is
   `priorReceipt.sequence + 1`, `prevHash` is `priorReceipt.hash`, `hash` is
   `sha256Hex(canonicalize(draft-without-hash))`, `validateReceiptDocument(...).valid === true`,
   and the locator is `receiptPath(workflowId, sequence, 'F', 'ClosureRecord')`.

6. **Chain validates through F (the load-bearing chain AC — the A->F proof at capability level).**
   A fixture-isolated test builds a synthetic valid chain `genesis->A->...->E` of `ReceiptDocument`
   fixtures sharing one `correlationId`/`workflowId` (correct `prevHash` linkage + contiguous
   `sequence`), runs the **real `emitClosureReceipt`** to produce the Stage-F receipt on disk, and
   asserts BOTH `validateChain([...A..E, F]).valid === true` and
   `F.correlation.correlationId === E.correlation.correlationId`. (Mirrors W4-P1 AC6; the full
   **live** A->F proof remains the SCAF-P4 exit criterion, D9.)

7. **Negative guard.** A test builds a chain whose Stage-F `correlationId` is forked (differs from
   A-E) and asserts `validateChain(...).valid === false` with an error naming the AC5c
   `correlation.workflowId/correlationId diverges` divergence. Locks the regression against a
   future re-introduction of the mint.

8. **`prepareClosure` — validation + no residue.** Over fixture inputs + an injected chain seam:
   a valid Stage-E-tipped chain yields a package carrying the validated tip; a broken/perturbed
   chain -> `CHAIN_INVALID`; a tip that is not `stage:'E'` -> `STAGE_E_TIP_INVALID`; a bad
   `workflowId`/`mergeSha`/`specLifecycleMove` -> `WORKFLOW_ID_INVALID`/`MERGE_SHA_INVALID`/
   `SPEC_MOVE_INVALID` before any read. After Phase 1 alone the receipt directory's conforming
   contents are byte-identical to before (no residue).

9. **`executeClosure` — closed path.** With a fixture transport that succeeds: idempotency
   pre-check passes (no existing seal), the gate passes (KONE), the transition resolves by
   **name** and fires (or is skipped when `currentStatus === targetStatus`), the comment posts
   (body carries workflowId + Stage-E tip hash/locator + `mergeSha`), and the sealing `stage:'F'`
   `ClosureRecord` receipt is emitted with `ticketTransition {fromStatus:currentStatus,
   toStatus:targetStatus}`; the extended chain passes `validateChain`; the result discriminant is
   `'closed'`.

10. **Default-deny Jira gate.** `assertClosureJiraGate` refuses any issue key whose project
    segment is not in `ALLOWED_PROJECT_KEYS` (`JIRA_GATE_REFUSED`), including hostile shapes
    (`EVIL-1`, `KONEX-1`, `kone-1`, empty, no dash); the gate is asserted inside the adapter's
    `transitionIssue`/`addComment` before any client call (a fixture client asserts zero calls on
    refusal); a `targetStatus` absent from the live transitions list raises
    `JIRA_TRANSITION_UNAVAILABLE` with no transition call.

11. **Merge-then-Jira-fail is the named half-closed state (PRF-12c / Q5).** With a fixture
    transport whose `transitionIssue` (and separately whose `addComment`) rejects, `executeClosure`
    emits the `claimRef:'stage-f-half-closed'` claim receipt (`subjectKind:'HalfClosedClosure'`,
    subject carrying `mergeSha`, `ticketKey`, `requestedStatus`, `currentStatus`, `failedStep`,
    `errorMessage`, `specLifecycleMove`, `stageETip`) chained off the current tip (correlation
    inherited), and **returns** `kind:'half-closed'` (does not throw); the chain still validates.

12. **`retryHalfClosedClosure` — idempotent + approval/merge-preserving.** Tests cover: (a) from a
    half-closed fixture state, a retry with a now-working transport seals and emits the Stage-F
    receipt without re-merging; (b) when `failedStep` is `'comment'` (transition already done), the
    transition is not re-fired; (c) a retry after a seal exists returns `kind:'closed'` referencing
    the existing sealing receipt with zero transport calls and zero writes; (d) a retry with no
    half-closed receipt and no seal raises `CLOSURE_STATE_MISSING`; (e) a retry that fails again
    emits a further half-closed receipt and returns `kind:'half-closed'`.

13. **Spec move is recorded-only (Q2).** `subject.specLifecycleMove` uses a
    `docs/specs/done/...` `to` (never `shipped/`); a grep over the new sources finds no `git mv`,
    no filesystem move/rename call, and no commit/push; a test asserts `executeClosure` performs no
    spec-file move (the fixture `repoRoot` spec files are untouched).

14. **`composeRequiredChecks` — pure composition.** Over injected `CandidateCheck` descriptors, it
    returns the desired `requiredChecks` set (the blocking-owning checks), `requirePullRequest`,
    `requireHumanReview:true`, and a non-empty `rationale`. Tests assert the composition for a
    representative candidate set (e.g. `plugins/test` blocking + a report-only foreman-line check +
    CodeQL Analyze) and that report-only checks are NOT promoted into `requiredChecks`.

15. **`buildBranchProtectionDiff` — data artifact, never applied (Q3 / D8).** Over an injected
    current `EffectiveRulesResponse` + a desired composition, it returns `{applied:false,
    currentPosture, desiredRuleset, diff, humanChecklist}`; `currentPosture` equals
    `verifyBranchProtectionPosture(current, identity)`; a `current` that binds the identity yields a
    matching posture and a diff/checklist describing the required-status promotion. A grep confirms
    the module calls no mutating GitHub API (no `gh api ... -X`/`--method POST|PUT|PATCH|DELETE`, no
    ruleset write) and adds no required-status job to any workflow.

16. **Typed try-catch on every external boundary (lesson #22).** Receipt-dir scan, chain-tip read,
    receipt write, and each transport method are wrapped, rethrowing (or, post-Jira, recording)
    `ClosureError`/`IntegrationError` with a documented code; tests force each boundary (including a
    throwing fixture fs seam and a throwing transport) and assert no foreign exception escapes the
    public API.

17. **Correlation-mint guard.** No new file in this parcel constructs a `correlation` object with a
    fresh `correlationId`; the only correlation path is inheritance from the passed tip. A
    test/reviewer-checkable assertion (grep for `randomUUID`/`generateCorrelationContext`) confirms
    `randomUUID` is used **only** for `sessionId`/`runId`, never `correlationId`, and
    `generateCorrelationContext` is never imported.

18. **Hermetic suite.** No test spawns a process, touches the network, instantiates the production
    adapter's default client factory, or reads an external-repo path; the transport is an injected
    recording fixture; a grep over the new tests finds no `docker`, no `StdioClientTransport`, no
    child-process import, no live `gh`/`git`. Green under `plugins.yml` on `ubuntu-latest`.

19. **No `foreman-line-ci.yml` change (Q6).** `.github/workflows/foreman-line-ci.yml` is
    byte-unchanged from `origin/main` (the deterministic pass diffs it).

20. **`npx tsc --noEmit`** passes with zero errors (run in `integration/`, PowerShell).

21. **`biome check .`** passes with zero diagnostics (run in `integration/`).

22. **All tests pass** via `npx tsx --test tests/*.test.ts`, including every pre-existing
    W4-P1/P3 test; every `AC-N` in this spec is named by at least one test per `AC-CONVENTION.md`.
    The suite is hermetic (no network/secrets/external-repo path).

## Out of Scope

- **No agent-applied ruleset / branch-protection / required-status change (D8).** W4-P4 delivers
  the composition + the config **diff as data** (`applied:false`); the actual ruleset application
  and the report-only->required promotion are **human stop-and-present** steps at SCAF-P4 exit.
  No mutating GitHub API is called; no required-status job is added anywhere.
- **No frozen-contract change** (`plugins/foreman-line/contracts/`) — `ClosureRecord`/
  `closureRecordSchema`/`stage:'F'` already exist; a need to touch them is a **loop-stop**.
- **No `registration/` reopen and no `integration -> verification` edge.** The Jira transition is a
  new injected boundary in `integration/` reusing `registration/`'s exported gateway primitives;
  the frozen `registration/` package and `JiraTransport` interface are untouched, and W3-P4's
  `HumanGateJiraTransport` is NOT imported (the transition-by-name parallel is deliberate —
  follow-up W4-FUP-JIRA).
- **No `foreman-line-ci.yml` amendment (Q6)** and no `plugins.yml` edit — W4-P4's only surface is
  `plugins/foreman-line/integration/`.
- **No live Jira, live merge, live effective-rules fetch, or live `git mv` inside the parcel.** All
  are injected seams / caller inputs; the live exercise is SCAF-P4 (coordinator/human owned,
  VERIFY-AT-PROBE for the transition tools against a throwaway `[TEST]` ticket, lessons #20/#21).
- **Spec `active/ -> done/` git move is recorded-only (Q2)** — the orchestrator records
  `specLifecycleMove` and emits the receipt; the coordinator performs the `git mv` + closure commit
  in the normal Stage-F closure PR. No filesystem move/commit/push here.
- **No live Stage-F receipt emission in this parcel** — verification is hermetic unit tests; the
  live seal happens during SCAF-P4's travel.
- **The audit RUN, DocSpine hook, SCAF-P4 exit vehicle** — W4-FUP-AUDIT / W4-P2 / SCAF-P4
  respectively.
- **Modifying any other shipped package** (`dispatch/`, `verification/`, `receipts/`, `approval/`,
  `contracts/`, `permission-profiles/`, `registration/`, `spec-linter/`) — consumed read-only via
  relative ESM; none is edited.
- **Status promotion, epics/Jira projection, receipt emission during shaping, implementation
  sequencing.** Shaping produces the draft + ShapingResult only; coordinator lint is the sole
  promotion authority.

## Context & References

- Charter: `plugins/foreman-line/docs/goals/w4-ci-integration/charter.md` — the W4-P4
  decomposition row; **D8** (outward-facing carve-out: branch-protection/ruleset + required-status
  promotion are human stop-and-present, never agent-applied); **D9** (Stage-F receipt reuses
  `ReceiptDocument`, `stage:'F'`); the amended **exit criterion** + **D6** (SCAF-P4's merge is the
  non-delegable human gate; "blocking" is a second human-gated phase — PR4-7); the cross-parcel
  correlation invariant; **D7** (P4 elevated / architecture-risk / dual review).
- Plan review: `.../plan-review-findings.md` — **PR4-1** (branch protection binding the coordinator
  identity is a verified precondition; human merge is structural), **PR4-7** (report-only ->
  required is a human phase), **PR4-9** (`foreman-line-ci.yml`: P1 creates, P3/P4 amend
  additively — W4-P4 does NOT amend it, Q6).
- Loop directive: `.../loop-directive.md` — the NEXT:W4-P4 scope paragraph; the cross-parcel
  correlation invariant.
- Coordinator Step-0 rulings (2026-07-27): Q1 coordinator-invoked two-phase API; Q2 recorded-only
  spec move; Q3 gate-assembly diff as data; Q4 new `ClosureJiraTransport` reusing `registration/`
  primitives (follow-up W4-FUP-JIRA); Q5 sealing order + half-closed claim receipt; Q6 no
  `foreman-line-ci.yml` amendment; Q7 draft in `active/`, `KONE-TBD`, ShapingResult sidecar.
- Frozen contract (consume, DO NOT edit): `plugins/foreman-line/contracts/src/stages/f-closure.ts`
  (`ClosureRecord`/`TicketTransition`/`SpecLifecycleMove`/`closureRecordSchema`);
  `contracts/src/envelope.ts` (`STAGE_IDS` incl. `'F'`); `contracts/src/correlation.ts`
  (`CorrelationContext`).
- Emitter to mirror: `plugins/foreman-line/integration/src/receipt.ts` (`emitIntegrationReceipt` —
  local `inheritCorrelation`, sequence/prevHash from the tip, `sha256Hex(canonicalize)`,
  `validateReceiptDocument`, `receiptPath`, injected `WriteReceiptFn`); helpers
  `canonicalize`/`sha256Hex`/`writeReceiptDocument` from `approval/src/index.js`,
  `receiptPath`/`validateReceiptDocument`/`validateChain` from `receipts/src/index.js`.
- Branch-protection verifier reused: `plugins/foreman-line/integration/src/branch-protection.ts`
  (`verifyBranchProtectionPosture`, `EffectiveRulesResponse`, `fetchEffectiveRulesLive` returns
  `unknown` — lesson #28); `IntegrationError` in `integration/src/errors.ts`; public surface
  `integration/src/index.ts`.
- Jira closure precedent to mirror (NOT import): `plugins/foreman-line/verification/src/human-gate/`
  (`HumanGateJiraTransport`, transition-by-name RH-7, half-closed + idempotent retry PRF-12c,
  default-deny gate) via `docs/specs/done/W3-P4-human-gate-jira.md`.
- Gateway primitives reused: `plugins/foreman-line/registration/src/index.ts`
  (`createDockerMcpAdapter`, `McpClientFactory`, `SITE_URL`, `ALLOWED_PROJECT_KEYS`,
  `assertRegistrationGate`).
- Invariant to satisfy: `plugins/foreman-line/receipts/src/validator.ts`
  (`checkSharedCorrelation`/`validateChain` — AC5c); `UUID_PATTERN`.
- CI: `.github/workflows/plugins.yml` (blocking per-package `npm test`, lines 44-78);
  `.github/workflows/foreman-line-ci.yml` (byte-unchanged by W4-P4).
- Canon: `docs/SPEC-CONVENTION.md`; `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md` (§2 Stage F,
  §8 W4); `docs/transcripts/defects_lessons.md` (#15 effective-rules API, #19 linear-time string
  ops, #20/#21 VERIFY-AT-PROBE, #22 typed try-catch, #26 pre-PR `git diff --stat origin/main`,
  #28 seam returns `unknown`); `plugins/foreman-line/docs/COORDINATOR-PATTERN.md`.
- Shape to mirror: `plugins/foreman-line/docs/specs/done/W4-P1-integration-stage-e.md`,
  `W4-P3-risk-driven-audit-triggers.md`.

## Verification Plan

- **Deterministic, fixture-isolated:** all receipt fixtures write under a temp `repoRoot` (the
  `dispatch`/`integration` suite pattern), Windows/temp-safe, independent of real on-disk chains.
  Every external effect (Jira transport, chain load, effective-rules payload, receipt write) is a
  mocked/injected seam — zero network, zero secrets, zero live `gh`/`git`/`docker`, zero
  external-repo path — green under `plugins.yml` on `ubuntu-latest`.
- **Real emitter execution is non-negotiable** (AC6): the F receipt in the chain regression must be
  the output of the actual `emitClosureReceipt`, not a reconstruction. A-E are synthetic fixtures;
  the chain under assertion is A->...->E->F.
- **Half-closed/retry state machine:** force every interleaving — transition-fail, comment-fail,
  retry-after-seal, double-retry, crash-after-transition-before-any-receipt (re-run
  `executeClosure`, transition already satisfied) — and confirm the chain always tells the truth,
  no duplicate seal is possible, no interleaving loses the merge or double-fires a transition.
- **Frozen-sibling + workflow diff** against `origin/main` (AC1, AC19); greps for forbidden import
  edges, mint/`generateCorrelationContext`, `git mv`/move calls, mutating GitHub API, and
  network/docker imports in tests (AC1, AC13, AC15, AC17, AC18).
- Runs in PowerShell; `node -v` first; full-capture before `$LASTEXITCODE` (lessons #10/#11).
- **Dual adversarial review (D7):** elevated / architecture-risk — two independent reviewers.
  Mandated focus: (1) correlation-mint hunt (any path that could mint a fresh `correlationId` at F,
  breaking AC5c end-to-end); (2) D8 boundary integrity (any path that could apply a ruleset /
  promote a required status / call a mutating GitHub API); (3) half-closed/retry state machine (no
  duplicate seal, no double transition, no lost merge across every interleaving); (4) Jira gate +
  transition-by-name integrity (hostile keys, `targetStatus` injection, ambiguous transitions);
  (5) frozen-contract + frozen-sibling + no-forbidden-edge conformance.

## Open Questions (resolved at coordinator lint 2026-07-27)

- **OQ1 — `data_classification` — RESOLVED: OMIT.** Adding it now would fail `spec-linter`'s `additionalProperties:false` (that unschematized field is exactly the W4-P5 corpus debt); W4-P5 schematizes it. Omitting matches sibling W4-P1/P3 and keeps this frontmatter linter-valid. Future specs adopt `data_classification` after W4-P5 lands.
- **OQ2 — `fromStatus` source — RESOLVED: coordinator-supplied `currentStatus` input.** Confirmed. Mirrors W3-P4's minimal transport (no status-read boundary to verify non-hermetically); the coordinator observes the ticket's current status at closure and passes it; recorded as `ticketTransition.fromStatus`.
- **OQ3 — Chain-tip load seam — RESOLVED: injected `loadReceiptChainFn` (default: local conforming-name scan) + `validateChain`.** Confirmed. Avoids the `integration → verification` edge; tests inject fixture chains.
- **OQ4 — `inheritCorrelation` placement — RESOLVED: LOCAL COPY (AC1 byte-unchanged).** Keep the dual-reviewed W4-P1 `receipt.ts` byte-identical (a clean property for an architecture/risk parcel); the correlation invariant is independently test-locked in each emitter (AC3/AC4/AC6 here + W4-P1's), so cross-copy drift is test-caught. A deliberate package-internal consolidation of the two `integration/` copies is recorded as follow-up **W4-FUP-CORRELATION-HELPER** (do it later without this parcel's blast radius). Do NOT extract in W4-P4.
- **OQ5 — Idempotency terminal guard — RESOLVED: confirmed.** The `stage:'F'` `ClosureRecord` seal's existence is the terminal guard; a benign duplicate Jira comment on a genuine retry-before-seal is accepted (comment not idempotent, seal is); comment-idempotency is a possible future refinement.
- **OQ6 — `mergeSha` shape — RESOLVED: 7-64 char lowercase hex (`MERGE_SHA_INVALID`).** Confirmed; the "commit-exists-on-main" check is non-hermetic → caller precondition at SCAF-P4 (W4-P1 caller-passes-tip precedent).
- **Lint verification (coordinator):** confirmed on disk that `registration/src/index.ts` exports `createDockerMcpAdapter`/`McpClientFactory`/`SITE_URL`/`ALLOWED_PROJECT_KEYS`/`assertRegistrationGate` (the Q4 reuse basis); the `integration → registration` edge is downstream→upstream (no cycle) and not in the forbidden list; the transition-tool arg shapes stay VERIFY-AT-PROBE (coordinator-owned live probe at SCAF-P4, not build scope).

## Epic/Story Projection (proposal only — Jira registration is Stage B)

- **Epic:** Foreman Line - W4 CI Integration
  - **Story:** W4-P4 - GitHub gate assembly + Stage-F closure
    - **Task:** Stage-F closure receipt emitter + correlation inheritance + chain-validates-through-F — AC1, AC2, AC3, AC4, AC5, AC6, AC7
    - **Task:** Two-phase closure orchestration (prepare/execute) + Stage-E tip validation — AC8, AC9
    - **Task:** `ClosureJiraTransport` + default-deny gate + transition-by-name adapter — AC10
    - **Task:** Half-closed state + idempotent retry (PRF-12c / Q5) — AC11, AC12
    - **Task:** Recorded-only spec move + GitHub gate-assembly data artifact (Q2/Q3/D8) — AC13, AC14, AC15
    - **Task:** Typed-error boundaries, correlation-mint guard, hermetic seams, no-workflow-change, dogfooded tests — AC16, AC17, AC18, AC19, AC20, AC21, AC22
