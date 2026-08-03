---
ticket: KONE-TBD
title: Foreman Line - W3-P4 Human review gate + Jira ticket update
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

# W3-P4 — Human Review Gate + Jira Ticket Update

## Intent

Extend the existing `plugins/foreman-line/verification/` package (shipped by
W3-P1/P2/P3 — do **not** rescaffold) with a `src/human-gate/` sub-module
implementing Stage D.4 (charter W3-P4 row, D8, PRF-12c): validate the
precondition that a schema-valid `verdict: 'pass'` VerificationVerdict
envelope exists on disk for the workflow; pre-draft the human review summary
(harness pass counts, adversarial findings disposition table, receipt chain
table walked via the shipped validator); present it for the coordinator's
one-tap approval using the **W2-P2 two-phase prepare/execute contract**; on
approval, transition the KONE Jira ticket behind a default-deny gate and post
the receipt-chain link; and emit the Stage-D closure sub-receipt. An explicit
decline emits a declined receipt and writes nothing to Jira. An
approve-then-Jira-fail emits a named `half-closed` state receipt so the
coordinator can retry the Jira write without re-approval (PRF-12c), and the
retry path is idempotent (W3-P3 idempotency precedent, RP-1/RP-3).

## Architecture

### Sub-module, not a new package

`src/human-gate/index.ts` inside `plugins/foreman-line/verification/`
(charter D2). The existing scaffold (`package.json`
`@foreman-line/verification`, `tsconfig.json`, `biome.json`) is reused
unchanged; the shipped `src/harness/`, `src/adversarial/`, and `src/pipeline/`
sources are frozen for this parcel (barrel `src/index.ts` gains exports only).

### The one-tap contract as it actually ships (lesson #25 — verified on disk)

The W2-P2 pattern in `dispatch/src/approval-cli/index.ts` is **not** an
interactive prompt: there is no readline, no stdin read, and no process exit
code in the shipped module (verified — zero matches for
`readline`/`process.exit`/`stdin` in `dispatch/`). The shipped contract is a
**two-phase library API**: Phase 1 (`prepareDispatch`) assembles and validates
the full package with no irreversible side effect; the coordinator presents it
to Clint, whose reply in the coordinator session **is** the one tap; Phase 2
(`executeDispatch`) performs the side effects only after that tap. W3-P4
mirrors this exactly: `prepareHumanGate` (Phase 1) / `executeHumanGate`
(Phase 2, taking the recorded decision as input). This spec deliberately does
not invent a prompt/exit-code surface the W2-P2 precedent never had.

### Cross-package imports (relative ESM `.js` — W3-P1/P2/P3 precedent)

```
../../contracts/src/stages/d-verification.js — VerificationVerdict, HarnessClaimResult, AdversarialFinding (frozen)
../../contracts/src/envelope.js              — StageOutput (frozen)
../../receipts/src/index.js                  — ReceiptDocument, receiptDocumentSchema, validateReceiptDocument, validateChain
../../approval/src/index.js                  — canonicalize, sha256Hex, writeReceiptDocument
../../registration/src/index.js              — ALLOWED_PROJECT_KEYS, McpToolClient, McpClientFactory, SITE_URL
./harness/index.js (same package)            — allocateSequence
./pipeline/index.js (same package)           — Disposition (type; disposition table rendering)
```

Verified invocation shapes (lesson #25): `allocateSequence(workflowId)`
returns `{ sequence, prevHash }`, called fresh before every receipt write;
receipt writes compose `allocateSequence` +
`writeReceiptDocument`/`canonicalize`/`sha256Hex` (the P1/P2/P3 internal
pattern — no standalone receipt helper is exported). The frozen W3-P3
envelope location is
`docs/receipts/<workflowId>/verification-verdict.envelope.json`, validated
against `stage-envelope.verification-verdict.schema.json`, whose `payload` is
the frozen `VerificationVerdict` and whose `receipt` carries the verdict
sub-receipt's `{ hash, locator }`.

**Jira transport reality (verified on disk — the charter row's literal
wording drifted):** the frozen W1-P4 `JiraTransport`
(`registration/src/types.ts`) exposes only
`createIssue`/`updateIssue`/`search`/`addRemoteLink`, and `updateIssue` is
**structurally incapable of touching `status`** (update-never-clobber,
jira-integration F2). No transition tool is wrapped anywhere in the shipped
machinery (verified — zero `transition` matches outside `contracts/`). So
"invokes the W1-P4 Jira MCP transport to transition ticket state" is
implemented as: **reuse the W1-P4 transport *pattern and gateway*, not a
method that does not exist** — a new injected `HumanGateJiraTransport`
boundary in this sub-module whose production adapter follows
`registration/src/adapter-docker-mcp.ts` exactly (injectable
`McpClientFactory`, stdio client against the `atlassian-remote` gateway, lazy
cloudId discovery via `getAccessibleAtlassianResources` selecting
`SITE_URL`), calling the gateway's transition tools
(`getTransitionsForJiraIssue` / `transitionJiraIssue` — arg names and
response shapes are **VERIFY-AT-PROBE**, lesson #20/#21) and
`addCommentToJiraIssue` for the receipt-chain link. The registration package
is consumed, never modified. See Open Questions — flagged for coordinator
confirmation.

**Default-deny gate:** `assertHumanGateJiraGate(issueKey)` — the key's
project segment (text before the first `-`, linear-time split) must be a
member of the imported `ALLOWED_PROJECT_KEYS` (the committed allowlist,
verified content `["KONE"]`); anything else throws typed
`HumanGateError('JIRA_GATE_REFUSED')` **before any client call**, embedded in
the adapter's mutating methods as defense-in-depth (the R4 pattern). The
transition id is never guessed: `transitionIssue` resolves it from the live
`getTransitionsForJiraIssue` response by matching the coordinator-supplied
target status against the transition **name only** (RH-7 clarification: the
`toStatus` field is informational and is never matched — matching it would
let a differently-named transition fire on a status-name collision); a target status not offered by the ticket's current
workflow state is `JIRA_TRANSITION_UNAVAILABLE`, not a raw-id write.

### Public functions

**`prepareHumanGate(input: HumanGateInput, deps?): HumanGatePackage`** —
Phase 1; validates everything, writes only the summary document.
1. `workflowId` validated against `UUID_PATTERN` before any filesystem access
   (`WORKFLOW_ID_INVALID` — the W3-P1/P2/P3 rule).
2. **Precondition intake (typed refusals, never trust):** reads
   `docs/receipts/<workflowId>/verification-verdict.envelope.json`. Missing
   file → `VERDICT_MISSING`. Unparseable/failing
   `stage-envelope.verification-verdict.schema.json` → `VERDICT_INVALID`.
   `payload.verdict !== 'pass'` (a rework envelope) → `VERDICT_NOT_PASS`.
   Each is a refusal — P4 never proceeds on a rework or missing verdict.
   **Locator shape (RH-1 amendment):** before any path join, the envelope's
   `receipt.locator` must be a repoRoot-relative path matching the receipts
   convention (`docs/receipts/<uuid>/<conforming-receipt-name>.json`) — no
   `..`/`.` segments, no absolute path (no leading `/`, no drive/`:`), no
   backslashes, no control characters or CR/LF, forward-slash segments from a
   fixed charset, validated by a linear-time char/shape guard
   (`RECEIPT_LOCATOR_INVALID` otherwise). The filesystem join happens only
   after this validation, and any Jira comment body interpolates only the
   validated locator.
   Cross-check: the (shape-validated) `receipt.locator` must resolve to an
   on-disk receipt whose `hash` equals `receipt.hash`
   (`VERDICT_RECEIPT_MISMATCH` otherwise — a forged envelope must not pass
   intake).
3. **Chain walk via the shipped validator:** loads the conforming-named
   receipts in `docs/receipts/<workflowId>/` (same filename-convention scan
   as `allocateSequence`; `quarantine/`, `rework/`, `human-gate/`, and the
   envelope file are invisible) and runs `validateChain`; an invalid chain is
   `CHAIN_INVALID` — the human never approves on top of a broken chain.
4. **Summary pre-draft:** renders the review summary markdown —
   (a) harness pass counts (`n/m` from `payload.harnessClaims`, plus the
   per-claim table: claim, passed, evidence); (b) adversarial findings
   disposition table (finding summary, citation, severity, and the
   coordinator-supplied disposition/note from `input.dispositions`, validated
   for shape); (c) receipt chain table walked from the validated chain
   (sequence, stage, kind, claimRef, subjectKind, hash, locator). **Every
   untrusted string** (claim text, evidence, finding summaries/citations,
   disposition notes, reasons) interpolated into a table cell has pipes
   escaped (`\|`) and CR/LF neutralized to a single space — the W3-P3 RP-4
   cell-escaping precedent, linear-time char loop, no regex (lesson #19).
5. Writes the summary to
   `docs/receipts/<workflowId>/human-gate/review-summary.md` (exclusive
   write; `SUMMARY_EXISTS` / `SUMMARY_WRITE_FAILED`; the `human-gate/`
   subdirectory is invisible to `allocateSequence` and every sibling scan —
   the `rework/` precedent). Returns the package
   `{ workflowId, verdict, envelope, summaryText, summaryPath,
   chainTip: { hash, locator } }`. No receipt is written in Phase 1 — a
   package that is never tapped leaves no receipt residue.

**`executeHumanGate(pkg: HumanGatePackage, decision: HumanGateDecision,
deps?): Promise<HumanGateResult>`** — Phase 2; side-effectful, ordered.
`HumanGateDecision = { decision: 'approve' | 'decline', decidedBy: string,
note: string }` (`note` non-empty; the tap is chain evidence, lesson #7
spirit — silence never reads as approval; there is no default decision).

**Idempotency pre-check (RH-3 amendment):** before any write or Jira call
(for both decisions), `executeHumanGate` pre-flights the workflow's chain
from disk for an existing `claimRef: 'stage-d-closure'` sub-receipt. If one
exists, the gate has already closed: the call is a typed no-op returning
`{ kind: 'closed', ... }` referencing the existing closure receipt — never a
second approval receipt, never a second decline receipt, never any Jira
call (zero transport calls; the W3-P3 RP-1/RP-3 idempotency precedent).

- **Decline path:** emits a declined Stage-D sub-receipt
  (`kind: 'claim'`, `stage: 'D'`, `claimRef: 'human-gate-declined'`,
  `subjectKind: 'HumanGateDecision'`, `signature: null`, subject
  `{ decision: 'declined', decidedBy, note, summaryPath,
  verdictReceipt: { hash, locator } }`), sequence/`prevHash` from a fresh
  `allocateSequence`, correlation `workflowId`/`correlationId` inherited from
  the chain-tip receipt (fresh `sessionId`/`runId`; **never**
  `generateCorrelationContext` — it forks the chain), validated against
  `receiptDocumentSchema` before an exclusive write. Returns
  `{ kind: 'declined', declineReceiptLocator }`. **No Jira call of any kind
  occurs on decline** — no transport method is invoked, asserted by test.

- **Approve path (ordered; each boundary typed try-catch, lesson #22):**
  1. Emits the approval Stage-D sub-receipt (`claimRef:
     'human-gate-approved'`, `subjectKind: 'HumanGateDecision'`, subject
     `{ decision: 'approved', decidedBy, note, summaryPath, ticketKey,
     requestedStatus, verdictReceipt }` — `ticketKey`/`requestedStatus` are
     carried so the RH-8 crash-recovery path is fully disk-derivable) — same
     receipt discipline as above. The approval is
     on disk **before** any Jira write, so a Jira failure can never lose the
     human's decision (PRF-12c).
  2. Jira transition via the injected `HumanGateJiraTransport`: gate assert,
     resolve transition id by target status name, transition. Then posts the
     receipt-chain link comment (`addComment`) carrying the closure
     sub-receipt-to-be's workflow id, the verdict receipt locator, and the
     chain-tip hash.
  3. **On any Jira failure (transition or comment):** emits the named
     half-closed Stage-D sub-receipt (`claimRef: 'half-closed'`,
     `subjectKind: 'HalfClosedState'`, subject `{ ticketKey,
     requestedStatus, failedStep: 'transition' | 'comment',
     errorMessage, approvalReceiptLocator }`) and returns
     `{ kind: 'half-closed', approvalReceiptLocator,
     halfClosedReceiptLocator }`. A Jira failure after approval is a
     **returned state, not a thrown error** — the coordinator's retry logic
     branches on the discriminant (PRF-12c). Failures *before* the approval
     receipt lands still throw typed `HumanGateError`.
  4. On Jira success: emits the Stage-D **closure sub-receipt**
     (`claimRef: 'stage-d-closure'`, `subjectKind: 'StageDClosure'`, subject
     `{ ticketKey, ticketTransition: { fromStatus, toStatus },
     approvalReceiptLocator, jiraCommentRef, summaryPath,
     verdictReceipt }`) — chained via fresh `allocateSequence`, accepted by
     `validateChain`. Returns `{ kind: 'closed', closureReceiptLocator,
     ticketTransition }`.

  **The frozen `ClosureRecord` envelope is NOT emitted here** — verified on
  disk: `ClosureRecord` (`contracts/src/stages/f-closure.ts`,
  `closure-record.schema.json`) is the **Stage F** output
  (`{ mergeSha, ticketTransition, specLifecycleMove }`); `mergeSha` and the
  spec's `active/ → done/` move do not exist at Stage D (the parcel is not
  merged when the human gate runs). The frozen contract mandates nothing at
  Stage D beyond D7's `ReceiptDocument` reuse; the Stage-D closure is the
  sub-receipt above. See Open Questions.

**`retryHalfClosed(workflowId: string, decision-free, deps?):
Promise<HumanGateResult>`** — the PRF-12c coordinator retry, idempotent
(W3-P3 RP-1/RP-3 precedent — a transient Jira fault never burns the
approval):
1. Pre-flight from disk, never from session state: if a
   `claimRef: 'stage-d-closure'` sub-receipt already exists for this
   workflow, return `{ kind: 'closed', ... }` referencing it — **no duplicate
   closure receipt and no second Jira transition is ever emitted** (a repeat
   retry after success is a no-op).
2. Requires an existing `human-gate-approved` sub-receipt on the chain
   (`APPROVAL_MISSING` otherwise — retry never substitutes for approval).
   **Crash recovery (RH-8 amendment):** an approval receipt with **no**
   `half-closed` sub-receipt and no closure is the documented
   crash-between-approval-and-Jira state (the process died after step 1 of
   the approve path but before either the half-closed receipt or the
   closure landed). `retryHalfClosed` recovers it: `ticketKey` and
   `requestedStatus` are read from the approval receipt's subject, and the
   Jira steps are resumed with the already-transitioned-is-satisfied
   behavior (the transition may or may not have fired before the crash, so
   it is verified against the live transitions list, never re-fired
   blindly). The approval is never re-asked. When a `half-closed`
   sub-receipt does exist, the retry proceeds from it exactly as below.
3. Re-runs step 2 of the approve path (transition + comment; if the
   half-closed receipt's `failedStep` is `'comment'`, the transition is
   verified/skipped rather than re-fired — the transition-by-name resolution
   makes an already-transitioned ticket detectable via
   `getTransitionsForJiraIssue`, and an already-done transition is treated as
   satisfied, not an error). On success emits the closure sub-receipt
   exactly as above; on repeated failure emits **another** half-closed
   sub-receipt (each attempt is chain evidence) and returns
   `{ kind: 'half-closed', ... }`. No re-approval, no human input, no
   attempt cap here — retry authority and pacing are the coordinator's.

**`createHumanGateJiraAdapter(clientFactory?: McpClientFactory):
HumanGateJiraTransport & { dispose(): Promise<void> }`** — the production
adapter described above; never instantiated by a deterministic test (tests
inject a recording fixture transport — the W1-P4 stub pattern). Exact
tool-arg keys and response shapes are VERIFY-AT-PROBE against a throwaway
fixture ticket (never production data; probe runs gate-first — lesson #21).

**`assertHumanGateJiraGate(issueKey: string): void`** — exported so the gate
is independently testable; project-segment allowlist membership, typed
refusal, linear-time.

### Types (public)

```typescript
interface HumanGateInput {
  readonly workflowId: string
  readonly ticketKey: string
  readonly targetStatus: string                 // transition resolved by NAME, never raw id
  readonly dispositions: readonly DispositionEntry[]  // coordinator triage for the summary table
  readonly repoRoot?: string                    // defaults to process.cwd(); tests pass a tmp dir
}
interface HumanGateDecision { readonly decision: 'approve' | 'decline'; readonly decidedBy: string; readonly note: string }
interface HumanGatePackage { /* workflowId, verdict, envelope, summaryText, summaryPath, chainTip */ }
type HumanGateResult =
  | { kind: 'declined'; declineReceiptLocator: string }
  | { kind: 'closed'; closureReceiptLocator: string; ticketTransition: { fromStatus: string; toStatus: string } }
  | { kind: 'half-closed'; approvalReceiptLocator: string; halfClosedReceiptLocator: string }
interface HumanGateJiraTransport {
  getTransitions(issueKey: string): Promise<readonly { id: string; name: string; toStatus: string }[]>
  transitionIssue(issueKey: string, transitionId: string): Promise<void>
  addComment(issueKey: string, body: string): Promise<string>
}
```

### Error handling (lesson #22)

`HumanGateError extends Error` with a `code` union (this sub-module's own
type; the shipped `VerificationError`/`AdversarialError`/`PipelineError`
unions are not modified): `WORKFLOW_ID_INVALID`, `VERDICT_MISSING`,
`VERDICT_INVALID`, `VERDICT_NOT_PASS`, `RECEIPT_LOCATOR_INVALID` (RH-1 —
the envelope's `receipt.locator` fails the shape guard),
`VERDICT_RECEIPT_MISMATCH`, `CHAIN_INVALID`, `INPUT_INVALID` (decision/dispositions/ticketKey/
targetStatus shape guards; empty `note`), `SUMMARY_EXISTS`,
`SUMMARY_WRITE_FAILED`, `SEQUENCE_READ_FAILED`, `RECEIPT_WRITE_FAILED`,
`RECEIPT_EXISTS`, `JIRA_GATE_REFUSED`, `JIRA_TRANSITION_UNAVAILABLE`,
`JIRA_CALL_FAILED` (carried inside the half-closed subject's `errorMessage`
when it occurs post-approval; thrown when pre-approval),
`APPROVAL_MISSING` (`NOT_HALF_CLOSED` is retired by the RH-8 amendment —
the approval-without-half-closed state is now the recoverable crash state,
not a refusal). Every external boundary — envelope
read, receipt-dir scan, receipt read/write, summary write, every transport
method — is wrapped in a typed try-catch rethrowing (or, post-approval,
recording) `HumanGateError`; no foreign exception escapes the public API.

## Constraints

- **Module location:** `plugins/foreman-line/verification/src/human-gate/`;
  extend `src/index.ts` only. No new package, no scaffold changes;
  `src/harness/`, `src/adversarial/`, and `src/pipeline/` sources are frozen
  for this parcel.
- **Frozen contracts (modification is a loop-stop):**
  `verification-verdict.schema.json`,
  `stage-envelope.verification-verdict.schema.json`,
  `closure-record.schema.json`, `stage-envelope.closure-record.schema.json`,
  `VerificationVerdict`/`StageOutput`/`ClosureRecord` types,
  `ReceiptDocument`/`receiptDocumentSchema`, the W1-P4 `registration/`
  package (consumed via its exported surface only — no new method on the
  frozen `JiraTransport`, no edit to `adapter-docker-mcp.ts`).
- **Precondition is mechanical:** no code path reaches a Jira write or a
  closure receipt without a schema-valid `verdict: 'pass'` envelope whose
  `receipt` cross-check passes and whose chain validates. A rework envelope
  is a typed refusal, never a warning.
- **Jira default-deny (standing authorization 5):** KONE only, via the
  committed allowlist; transition resolved by status name from the live
  transitions list; the gate asserts inside the adapter's mutating methods
  (defense-in-depth), and no Jira method is callable on the decline path.
- **Approval durability (PRF-12c):** the approval sub-receipt lands before
  the first Jira call; approve-then-Jira-fail is the named `half-closed`
  discriminant, not an exception that loses state; retry is idempotent and
  never re-prompts approval.
- **Receipt discipline (W3-P1/P2/P3 verbatim):** `stage: 'D'` (not
  `stageId`); `kind: 'claim'` with non-null `claimRef`; `signature: null`;
  exclusive writes; sequence/`prevHash` from `allocateSequence` fresh per
  write; correlation inherited from the chain tip (never
  `generateCorrelationContext`); the extended chain must satisfy
  `validateChain` including the AC5c shared-correlation invariant.
- **Scan invisibility preserved:** `human-gate/` artifacts and the summary
  file never perturb `allocateSequence`, `countReworkAttempts`, or any
  sibling scan.
- **Untrusted text discipline:** all interpolation of claim/finding/note
  text into the summary uses the RP-4 cell-escaping rule; linear-time string
  ops throughout (lesson #19); must survive CodeQL polynomial-redos.
- **Hermetic deterministic suite (lesson #21):** injectable seams for fs
  (`repoRoot` temp dirs, P1/P2/P3 pattern) and the Jira transport (recording
  fixture; **no real Jira call, no gateway spawn, no network in any
  deterministic test**); the decision is a function argument, so there is no
  prompt to fake (**no real prompts** by construction). The production
  adapter's live behavior is a VERIFY-AT-PROBE coordinator action against a
  throwaway fixture ticket.
- **Generate/consume boundary:** P4 launches no session, spawns no process,
  performs no git operation, runs no harness/adversarial/pipeline re-run,
  and never assembles a verdict (P3 owns the verdict; P4 consumes it).
- **No `headroom_compress` calls** (lesson #23).
- **Deterministic-pass environment (lessons #10/#11):** PowerShell; `node
  -v` first; full-capture before `$LASTEXITCODE`.
- **Branch/worktree (lesson #9):** builder works on branch
  `w3-p4-human-gate-jira` in its own worktree (named in the kickstarter, not
  here).
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

AC-1: `src/human-gate/` exists inside the existing
`plugins/foreman-line/verification/` package; `package.json`,
`tsconfig.json`, `biome.json`, and every file under `src/harness/`,
`src/adversarial/`, and `src/pipeline/` are byte-unchanged from
`origin/main`; every file under `plugins/foreman-line/registration/` is
byte-unchanged from `origin/main`. A test or the deterministic pass diffs
them.

AC-2: `npx tsc --noEmit` passes with zero errors in `verification/`.

AC-3: `npx biome check .` passes with zero diagnostics in `verification/`.

AC-4: `src/index.ts` exports `prepareHumanGate`, `executeHumanGate`,
`retryHalfClosed`, `createHumanGateJiraAdapter`, `assertHumanGateJiraGate`,
`HumanGateError`, and the public types (`HumanGateInput`,
`HumanGateDecision`, `HumanGatePackage`, `HumanGateResult`,
`HumanGateJiraTransport`, `HumanGateErrorCode`), while every pre-existing
W3-P1/P2/P3 export remains exported unchanged.

AC-5: Precondition intake refuses typed: a missing envelope file raises
`HumanGateError('VERDICT_MISSING')`; an envelope failing
`stage-envelope.verification-verdict.schema.json` (malformed correlation,
missing `reworkSignal` key, extra property — `additionalProperties: false`)
raises `VERDICT_INVALID`; a schema-valid envelope with
`payload.verdict: 'rework'` raises `VERDICT_NOT_PASS`; an envelope whose
`receipt.locator` is missing on disk or whose on-disk receipt `hash` differs
from `receipt.hash` raises `VERDICT_RECEIPT_MISMATCH`. Hostile fixtures
cover each class; no summary, receipt, or Jira call results from any of
them.

AC-6: `workflowId` is validated against `UUID_PATTERN` at entry to every
function that joins it into `docs/receipts/<workflowId>/`
(`WORKFLOW_ID_INVALID` before any filesystem access); traversal-shaped
inputs (`../x`, empty string) are covered by tests.

AC-7: `prepareHumanGate` runs `validateChain` over the workflow's
conforming-named receipts and raises `CHAIN_INVALID` on a broken or
correlation-perturbed chain (perturbation probe included); `quarantine/`,
`rework/`, `human-gate/` contents and the envelope file are invisible to the
walk.

AC-8: The generated summary contains (a) the harness pass count `n/m` and a
per-claim table matching `payload.harnessClaims`; (b) an adversarial
findings disposition table pairing each finding with its coordinator
disposition and note; (c) a receipt chain table with one row per chain
receipt carrying sequence, stage, kind, claimRef, subjectKind, hash, and
locator, in sequence order. Tests assert each section against a fixture
workflow.

AC-9: Every untrusted string rendered into a summary table cell is escaped
per the RP-4 precedent: embedded `|` arrives as `\|`, CR/LF arrive as single
spaces; a hostile finding summary containing pipes, newlines, a markdown
fence, and a column-0 heading cannot split a cell, add a row, or open a
fence/heading (rendered-output assertions). Escaping is a linear-time char
loop; a 100k-char hostile input completes without pathological slowdown.

AC-10: The summary is written to
`docs/receipts/<workflowId>/human-gate/review-summary.md` with an exclusive
write (`SUMMARY_EXISTS` on re-run); a subsequent `allocateSequence` and
`countReworkAttempts` are unaffected by anything under `human-gate/`.

AC-11: `prepareHumanGate` writes no receipt: after Phase 1 alone, the
receipt directory's conforming-named contents are byte-identical to before
(asserted), so an untapped package leaves no chain residue.

AC-12: `executeHumanGate` with `decision: 'decline'` emits exactly one
Stage-D sub-receipt (`kind: 'claim'`, `stage: 'D'`,
`claimRef: 'human-gate-declined'`, `subjectKind: 'HumanGateDecision'`,
`signature: null`, subject carrying `decision: 'declined'`, `decidedBy`,
`note`, `summaryPath`, `verdictReceipt`), chained via fresh
`allocateSequence` with correlation inherited from the chain tip, accepted
by `validateChain`; the fixture transport records **zero** calls; the result
discriminant is `'declined'`. An empty `note` or malformed decision object
raises `INPUT_INVALID` before any write.

AC-13: `executeHumanGate` with `decision: 'approve'` emits the
`claimRef: 'human-gate-approved'` sub-receipt **before** the first transport
call (fixture transport asserts the receipt exists on disk at
call-intercept time), then resolves the transition id by matching
`targetStatus` against the live `getTransitions` names (never a hardcoded
id), transitions, posts the receipt-chain-link comment (body carries the
workflowId, the verdict receipt locator, and the chain-tip hash), and emits
the `claimRef: 'stage-d-closure'` sub-receipt (subject carrying `ticketKey`,
`ticketTransition { fromStatus, toStatus }`, `approvalReceiptLocator`,
`jiraCommentRef`, `summaryPath`, `verdictReceipt`); the extended chain
passes `validateChain`; the result discriminant is `'closed'`.

AC-14: The default-deny gate is mechanical: `assertHumanGateJiraGate`
refuses any issue key whose project segment is not in
`ALLOWED_PROJECT_KEYS` (`JIRA_GATE_REFUSED`), including hostile shapes
(`EVIL-1`, `KONEX-1`, `kone-1`, empty, no dash); the gate is asserted inside
the adapter's `transitionIssue` and `addComment` before any client call
(fixture client asserts zero calls on refusal); a `targetStatus` absent from
the live transitions list raises `JIRA_TRANSITION_UNAVAILABLE` with no
transition call.

AC-15: Approve-then-Jira-fail is the named half-closed state (PRF-12c): with
a fixture transport whose `transitionIssue` (and separately whose
`addComment`) rejects, `executeHumanGate` emits the `claimRef: 'half-closed'`
sub-receipt (`subjectKind: 'HalfClosedState'`, subject carrying `ticketKey`,
`requestedStatus`, `failedStep` naming the failed call, `errorMessage`, and
`approvalReceiptLocator`) and **returns** `kind: 'half-closed'` (does not
throw); the approval receipt remains on disk; the chain still validates.

AC-16: `retryHalfClosed` is idempotent and approval-preserving: (a) from a
half-closed fixture state, a retry with a now-working transport performs the
Jira steps and emits the closure sub-receipt **without** any new approval
receipt or human input; (b) when the half-closed `failedStep` is
`'comment'`, the transition is not re-fired blindly — an
already-transitioned ticket is treated as satisfied; (c) a retry after
closure already exists returns `kind: 'closed'` referencing the existing
closure receipt and performs zero transport calls and zero writes; (d) a
retry with no approval receipt on the chain raises `APPROVAL_MISSING`; (e)
a retry that fails again emits a further half-closed sub-receipt and
returns `kind: 'half-closed'`. Tests cover all five. (The former
approval-without-half-closed `NOT_HALF_CLOSED` refusal is superseded by
AC-24's recovery requirement.)

AC-17: No `ClosureRecord` envelope is emitted anywhere in this sub-module
(the frozen `ClosureRecord` is Stage F output — `mergeSha` does not exist at
Stage D); a grep over `src/human-gate/` finds no reference to
`closure-record` schemas or the `ClosureRecord` type, and no file matching
`*closure*envelope*` is written by any test scenario.

AC-18: Every external boundary — envelope read, receipt-dir scan, chain-tip
read, receipt write, summary write, and each transport method — is wrapped
in a typed try-catch rethrowing (or, post-approval, recording)
`HumanGateError` with its documented code; tests force each boundary
(including a throwing fixture fs seam) and assert no foreign exception
escapes the public API (lesson #22).

AC-19: The deterministic suite is hermetic: no test spawns a process,
touches the network, instantiates the production adapter's default client
factory, or prompts; the decision enters as a function argument; a grep over
`tests/` for the human-gate suite finds no `docker`, no
`StdioClientTransport`, and no child-process import.

AC-20: The sub-module performs no process spawn, no git operation, no
harness/adversarial/pipeline invocation, and no verdict assembly; a grep
over `src/human-gate/` returns zero matches for such calls, and the only
Jira surface is the injected `HumanGateJiraTransport`.

AC-21: All tests pass via `npx tsx --test tests/*.test.ts` in
`verification/` (every pre-existing W3-P1/P2/P3 test still green), and every
`AC-N` in this spec is named by at least one test per `AC-CONVENTION.md`.

AC-22 (RH-1): the envelope's `receipt.locator` is shape-validated at intake
before any path join: a `..`-traversal locator, a newline/control-character
locator, an absolute-path locator (leading `/` or drive-letter/`:`), and a
backslash locator each raise `HumanGateError('RECEIPT_LOCATOR_INVALID')`
with no filesystem read at the hostile path; the guard is a linear-time
charset/shape scan; only the validated locator is ever interpolated into
the Jira comment body.

AC-23 (RH-3): `executeHumanGate` is idempotent after closure: with a
`stage-d-closure` receipt already on the chain, a second `executeHumanGate`
(approve or decline) returns `kind: 'closed'` referencing the existing
closure receipt with zero transport calls and zero receipt writes — never a
second approval receipt and never a second Jira call.

AC-24 (RH-8): the approval-exists/no-half-closed/no-closure crash state is
recoverable: with only the `human-gate-approved` sub-receipt on the chain
(its subject carrying `ticketKey`/`requestedStatus`), `retryHalfClosed`
resumes the Jira steps — the transition fires exactly once (verified
against the live transitions list, an already-transitioned ticket treated
as satisfied), the comment posts, and the closure sub-receipt is emitted —
with no new approval receipt and no human input.

AC-25 (RH-7): `resolveTransitionId` matches the transition NAME only: a
transitions list whose only route to the target status carries a different
name (`toStatus` equal, `name` different) raises
`JIRA_TRANSITION_UNAVAILABLE`; a name match resolves even when `toStatus`
differs from the name; ambiguity/absence behavior is unchanged.

## Out of Scope

- **Assembling or re-grading the verdict** — P3 owns `VerificationVerdict`;
  P4 consumes the pass envelope and refuses everything else.
- **Any rework routing, harness run, or adversarial dispatch** — a
  `VERDICT_NOT_PASS` refusal hands control back to the coordinator; P4 never
  routes.
- **Emitting the frozen `ClosureRecord` / Stage-F envelope, merging the PR,
  or moving the spec to `done/`** — Stage F work (verified: `ClosureRecord`
  requires `mergeSha` + `specLifecycleMove`, which do not exist at the
  Stage-D gate). W3-P4 emits only the Stage-D closure sub-receipt.
- **Jira issue creation, update, JQL search, or any write to a non-KONE
  project** — creation/update belong to W1 machinery; the gate hard-refuses
  non-allowlisted keys.
- **Modifying the frozen `registration/` package or the frozen
  `JiraTransport` interface** — the transition transport is a new injected
  boundary in this sub-module; touching W1 code is a loop-stop.
- **Building an interactive prompt/TTY surface or a QCC panel** — the
  one-tap is the coordinator-session tap over the two-phase API (D8: CLI in
  W2 pattern; a panel is a later wave).
- **Live Jira probing inside the parcel's deterministic suite** — the
  VERIFY-AT-PROBE evidence for `getTransitionsForJiraIssue` /
  `transitionJiraIssue` arg shapes is a coordinator-owned action against a
  throwaway fixture ticket (lesson #21), not builder scope.
- **Retry pacing/caps for half-closed states** — retry authority is the
  coordinator's; this module exposes the idempotent mechanism only.
- **Modifying any frozen W0 contract, `skill-injection.yaml`,
  `routing-policy.yaml`, or the shipped `src/harness/`, `src/adversarial/`,
  `src/pipeline/` sources** — consume only; modification is a loop-stop.
- **`headroom_compress` / Kompress** — no context compression here.
- **CI wiring** — deferred to W4, same as every sibling.

## Context & References

- `plugins/foreman-line/docs/goals/w3-verification/charter.md` — W3-P4 row,
  D8 (CLI-first one-tap), D7 (ReceiptDocument reuse), exit criterion
  ("on approval the Jira ticket transitions and the Stage-D closure receipt
  is emitted"), standing authorization 5 (KONE only, default-deny).
- `plugins/foreman-line/docs/goals/w3-verification/loop-directive.md` — the
  binding W3-P4 shaping checklist (pass-envelope precondition; W2-P2 one-tap
  mirror; typed try-catch Jira; half-closed receipt; W1-P4 transport
  consumed, not rebuilt) and PRF-12c.
- `plugins/foreman-line/contracts/schemas/verification-verdict.schema.json`,
  `stage-envelope.verification-verdict.schema.json` — the frozen intake
  shapes; `closure-record.schema.json`,
  `stage-envelope.closure-record.schema.json` +
  `contracts/src/stages/f-closure.ts` — the Stage-F contract this parcel
  deliberately does **not** emit.
- `plugins/foreman-line/dispatch/src/approval-cli/index.ts` — the W2-P2
  two-phase prepare/execute one-tap contract mirrored here (verified: no
  prompt/exit-code surface exists in the shipped pattern).
- `plugins/foreman-line/registration/src/{types.ts,adapter-docker-mcp.ts,gate.ts,index.ts}`
  — the frozen `JiraTransport` (no transition method; update-never-clobber),
  the adapter pattern (injectable `McpClientFactory`, cloudId discovery,
  `SITE_URL`), `ALLOWED_PROJECT_KEYS` (`["KONE"]`), the R4
  gate-in-adapter defense-in-depth precedent.
- `plugins/foreman-line/verification/src/{index.ts,harness/index.ts,pipeline/index.ts}`
  — `allocateSequence` (`{ sequence, prevHash }`), the receipt-write and
  typed-error patterns, the RP-4 cell-escaping and RP-1/RP-3 idempotency
  precedents; `AC-CONVENTION.md`.
- `plugins/foreman-line/receipts/src/{types.ts,validator.ts}` —
  `ReceiptDocument` (`kind: 'stage' | 'claim'`, `stage`, `claimRef`),
  `validateChain`, `UUID_PATTERN`.
- `plugins/foreman-line/approval/src/index.ts` — `writeReceiptDocument`,
  `canonicalize`, `sha256Hex`.
- `docs/SPEC-CONVENTION.md` §4 (schema v0.2);
  `docs/transcripts/defects_lessons.md` #7, #9, #11, #19, #20, #21, #22,
  #24, #25; `plugins/foreman-line/docs/specs/done/W3-P1-verification-harness.md`,
  `W3-P2-adversarial-reviewer.md`, `W3-P3-pipeline-rework.md`,
  `W2-P2-dispatch-approval-cli.md`.

## Open Questions (design decisions adopted with recommended defaults — coordinator may override at lint)

- **Jira transition transport (the biggest drift):** the charter/loop
  directive say "invokes the W1-P4 Jira MCP transport to transition ticket
  state," but the frozen `JiraTransport` has **no transition method** and
  `updateIssue` structurally cannot set `status` (update-never-clobber, by
  design); no transition tool is wrapped anywhere shipped. Adopted: a new
  `HumanGateJiraTransport` injected boundary in this sub-module whose
  production adapter reuses the W1-P4 *pattern and gateway* (same
  `atlassian-remote` stdio gateway, same `McpClientFactory` seam, same
  cloudId discovery, same allowlist) calling `getTransitionsForJiraIssue` /
  `transitionJiraIssue` / `addCommentToJiraIssue` — tool names/args
  VERIFY-AT-PROBE (lesson #20). The alternative (adding a method to the
  frozen `JiraTransport`) modifies a frozen W1 package and is a loop-stop.
  **Flag for coordinator confirmation.**
- **`ClosureRecord` at Stage D:** verified on disk — `ClosureRecord` is the
  **Stage F** output (`mergeSha`, `ticketTransition`, `specLifecycleMove`;
  `f-closure.ts`, propagation test binds it to stage 'F'). The frozen
  contracts mandate no Stage-D envelope beyond P3's verdict envelope.
  Adopted: the "Stage-D closure receipt" is a `ReceiptDocument` sub-receipt
  (`claimRef: 'stage-d-closure'`) per D7; the `ClosureRecord` envelope stays
  Stage-F scope (whoever runs Stage F may reuse this receipt's
  `ticketTransition` payload). Flag for coordinator confirmation.
- **One-tap surface:** the shipped W2-P2 pattern has no prompt or exit code —
  the tap is Clint's reply between `prepare*` and `execute*`. Adopted: mirror
  that contract exactly (decision as a validated function argument); building
  a readline CLI would be a new interaction surface with no precedent to
  mirror. Flag for coordinator confirmation.
- **Half-closed as returned state, not exception:** post-approval Jira
  failures return the `'half-closed'` discriminant (with the receipt
  emitted) rather than throwing, because the caller must branch on it for
  retry (PRF-12c); pre-approval failures still throw typed. Adopted;
  flagged.
- **Decline reusability:** a decline receipt does not poison the workflow —
  adopted: after a decline, a fresh `executeHumanGate` approval on the same
  package remains legal (the decline stays on the chain as evidence; the
  human may re-decide). The summary file is not rewritten (`SUMMARY_EXISTS`
  guards Phase 1 re-runs; the coordinator passes the existing package).
  Flagged.
- **Transition-by-name ambiguity:** if the live transitions list offers two
  transitions to the same target status name, adopted: refuse typed
  (`JIRA_TRANSITION_UNAVAILABLE` with both ids in the message) rather than
  pick one — ambiguity is a coordinator ruling, not an adapter guess.
  Flagged.
- **Summary/receipt-chain comment body:** adopted minimal — workflowId,
  verdict receipt locator, chain-tip hash, and the human-gate summary path;
  no finding text is posted to Jira (untrusted reviewer text stays out of
  ticket comments). Flagged.

## Verification Plan

Deterministic: `npx tsc --noEmit` (AC-2); `npx biome check .` (AC-3); full
`npx tsx --test tests/*.test.ts` including all pre-existing W3-P1/P2/P3
tests (AC-21); frozen-sibling and frozen-`registration/` diff against
`origin/main` (AC-1); greps for spawn/git/pipeline calls, ClosureRecord
references, and network/docker imports in tests (AC-17, AC-19, AC-20). Runs
in PowerShell; `node -v` first; full-capture before `$LASTEXITCODE`
(lessons #10/#11). Post-review git-detection control on the reviewer
worktree (lesson #24) is coordinator discipline, standing. The
VERIFY-AT-PROBE evidence for the transition tools (arg keys, response
shapes, already-transitioned behavior) is a coordinator-owned live probe
against a throwaway `[TEST]`-fixture ticket, gate-first (lessons #20/#21),
recorded before the production path is trusted.

Single adversarial review (standard/standard-feature — charter D5). Mandated
focus questions:

1. **Precondition bypass hunt:** attempt to reach any Jira call or closure
   receipt without a schema-valid pass envelope — forged envelopes (verdict
   flipped post-hash, receipt locator pointing at a different receipt,
   rework envelope with `reworkSignal: null`), chain tampering, and direct
   `executeHumanGate`/`retryHalfClosed` invocation shapes; confirm every
   route is a typed refusal.
2. **Gate integrity:** attack `assertHumanGateJiraGate` and the adapter with
   hostile keys (case tricks, prefix-similar projects, unicode dashes,
   injection via `targetStatus`); confirm no client call precedes the gate
   and no path writes outside KONE.
3. **Half-closed/retry state machine:** force every interleaving —
   transition-fail, comment-fail, retry-after-success, double retry,
   crash-between-approval-and-half-closed-emission — and confirm the chain
   always tells the truth, no duplicate closure or approval receipt is
   possible, and no interleaving loses the approval or double-fires a
   transition.
4. **Summary injection:** confirm hostile claim/finding/note text cannot
   break the summary's table structure, smuggle markdown headings/fences, or
   alter what the human is shown relative to the on-disk verdict (the
   summary must be a faithful rendering — probe for content omission as well
   as injection).

## Epic/Story Projection (proposal only — Jira registration is Stage B)

- **Epic:** Foreman Line - W3 Verification
  - **Story:** W3-P4 - Human Review Gate + Jira Ticket Update
    - **Task:** `src/human-gate/` sub-module + exports (frozen siblings untouched) — AC-1, AC-2, AC-3, AC-4
    - **Task:** Pass-verdict precondition intake + chain walk — AC-5, AC-6, AC-7
    - **Task:** Review summary pre-draft + RP-4 escaping + scan invisibility — AC-8, AC-9, AC-10, AC-11
    - **Task:** Decline path + approve path receipts + closure sub-receipt — AC-12, AC-13, AC-17
    - **Task:** Default-deny Jira gate + transition-by-name adapter — AC-14
    - **Task:** Half-closed state + idempotent retry (PRF-12c) — AC-15, AC-16
    - **Task:** Typed-error wrapping, hermetic seams, scope greps, dogfooded tests — AC-18, AC-19, AC-20, AC-21
