# Builder Kickstarter — W3-P4 Human Review Gate + Jira Ticket Update

You are the Builder for Foreman Line parcel W3-P4 — the Human Review Gate + Jira Ticket Update. Your spec — the sole source of truth — is `plugins/foreman-line/docs/specs/active/W3-P4-human-gate-jira.md` (status: active). Read it in full, then every file its Context & References section names.

**Where you stand (non-negotiable):** worktree `C:\Repos\foreman-line-w3-p4-human-gate`, branch `feat/foreman-line-W3-P4` (created by the permission-profiles dispatch emitter — verify with `git branch --show-current` before anything else). You never touch `C:\Repos\kaseya-one-productivity-tools`'s working tree, never check out another branch, never push. All work is committed on this branch in this worktree.

**What you are building:** the `src/human-gate/` sub-module inside the existing `plugins/foreman-line/verification/` package (do NOT rescaffold — package.json, tsconfig.json, biome.json are frozen). Extend `src/index.ts` only; `src/harness/`, `src/adversarial/`, and `src/pipeline/` sources are frozen for this parcel. Four public functions: `prepareHumanGate` (Phase 1: validate + pre-draft summary), `executeHumanGate` (Phase 2: side-effectful approve/decline + Jira), `retryHalfClosed` (PRF-12c idempotent retry), `createHumanGateJiraAdapter` (production adapter). Plus exported error class `HumanGateError` and all public types.

**Environment:** Windows. Node toolchain in PowerShell ONLY (lesson #10); `node -v` first (>=24.11.1). Exit codes read via full-capture before `$LASTEXITCODE` (lesson #11). No Git Bash for Node/npm. Linear-time string handling throughout — RP-4 cell-escaping is a char-code loop, no regex (lesson #19, CodeQL polynomial-redos).

**Frozen / read-only surfaces (modification is a Stop-and-Report):** `contracts/`, `shaping/`, `projection/`, `approval/`, `receipts/`, `spec-linter/`, `schema-scaffold/`, `routing-policy/`, `skill-injection/`, `permission-profiles/`, `registration/`, `dispatch/`, root `package.json`, and every existing file under `src/harness/`, `src/adversarial/`, `src/pipeline/` in verification.

## Step 0 — restate and STOP (mandatory gate)

Before writing any code: run `node -v` in PowerShell, confirm >=24.11.1. Then:

1. Restate the parcel scope in your own words — the four public functions, their phases, what they write, what they return.
2. Enumerate every file you will create or modify (exact paths). Boundary: `plugins/foreman-line/verification/src/human-gate/` (new files) + `plugins/foreman-line/verification/src/index.ts` (new exports appended) + `plugins/foreman-line/verification/tests/human-gate*.test.ts` (new test files). No other modifications.
3. Confirm every Out of Scope item explicitly — no verdict assembly, no rework routing, no harness/adversarial/pipeline invocation, no git operations, no ClosureRecord/Stage-F envelope emission.
4. State the AC count (21 ACs) and your planned test approach: how many test files, which ACs each covers, expected test count.
5. Flag every ambiguity, contradiction, or spec gap with a recommended resolution.

Then STOP for the coordinator's ruling. A real spec gap becomes a coordinator-ratified amendment committed alone before code.

## Critical implementation notes (coordinator-verified)

**Coordinator rulings on Open Questions (all adopted):**
- `HumanGateJiraTransport` is a NEW injected boundary in this sub-module — do NOT modify the frozen `JiraTransport` interface in `registration/`. A new production adapter (`createHumanGateJiraAdapter`) follows the `registration/src/adapter-docker-mcp.ts` pattern exactly (injectable `McpClientFactory`, stdio client against `atlassian-remote` gateway, lazy `cloudId` discovery via `getAccessibleAtlassianResources`, SITE_URL = `'https://kaseya.atlassian.net'`).
- **ClosureRecord NOT emitted at Stage D** — verified on disk: `ClosureRecord` is Stage-F output requiring `mergeSha`/`specLifecycleMove`. The Stage-D closure is a `ReceiptDocument` sub-receipt (`claimRef: 'stage-d-closure'`).
- **Two-phase API** — decision enters as a validated function argument; no readline, no process.exit, no stdin (verified: the W2-P2 `approval-cli` pattern has none). The coordinator presents the Phase 1 summary to Clint; Clint's reply IS the tap.
- **Half-closed is a returned state, not an exception** — post-approval Jira failures return `{ kind: 'half-closed', ... }`; pre-approval failures throw `HumanGateError`.
- **Decline does not poison the workflow** — a fresh `executeHumanGate` with `decision: 'approve'` on the same Phase 1 package is legal after a decline.
- **Transition-by-name ambiguity → typed refusal** — if `getTransitionsForJiraIssue` returns two transitions to the same target status name, throw `HumanGateError('JIRA_TRANSITION_UNAVAILABLE')` with both ids in the message.
- **Summary comment body is minimal** — only workflowId, verdict receipt locator, chain-tip hash, human-gate summary path. No finding text in Jira comments.

**Jira transport tool names (VERIFY-AT-PROBE — coordinator will probe against throwaway fixture before prod use):**
The existing `registration` gateway (`atlassian-remote`) exposes:
- `addCommentToJiraIssue` — CONFIRMED (already used by W1-P4; args include `cloudId`, `commentBody`, `issueKey`)
- `getTransitionsForJiraIssue` — **ASSUMED name** (VERIFY-AT-PROBE); expected args `cloudId`, `issueKey`; expected response: array of `{ id, name, to: { name } }` or similar
- `transitionJiraIssue` — **ASSUMED name** (VERIFY-AT-PROBE); expected args `cloudId`, `issueKey`, `transitionId`

Define these as named constants in the adapter (e.g., `TOOL_GET_TRANSITIONS`, `TOOL_TRANSITION`, `TOOL_COMMENT`). The deterministic suite injects a fixture transport and NEVER calls the real gateway. The production adapter's live behavior is a coordinator probe action (not builder scope).

**Receipt field names (D7):** `stage: 'D'` (not `stageId`); `kind: 'claim'`; non-null `claimRef`; `signature: null`; `sequence`/`prevHash` from a fresh `allocateSequence(workflowId, repoRoot)` before each write. Cross-check: `allocateSequence` from `../harness/index.js` returns `{ sequence, prevHash }`.

**Chain correlation (AC5c):** inherit `workflowId` + `correlationId` from the chain tip (the prior Stage-D sub-receipt). Do NOT call `generateCorrelationContext()` (forks the chain). Mint fresh `sessionId`/`runId` only.

**Receipt-dir scan invisibility:** `human-gate/` subdirectory contents and the `verification-verdict.envelope.json` file are invisible to `allocateSequence` and `countReworkAttempts` — same pattern as `rework/` in `src/pipeline/`. The scan reads only conforming-named `\d{6}-<stage>-<slug>.json` files in the root of `docs/receipts/<workflowId>/`.

**Verdict envelope location:** `docs/receipts/<workflowId>/verification-verdict.envelope.json` — validated against `stage-envelope.verification-verdict.schema.json`. The inner `payload` field is the frozen `VerificationVerdict`. Schema and type are in `contracts/`. Validate with AJV against the schema (same pattern as P3); a schema-valid envelope with `payload.verdict !== 'pass'` → `VERDICT_NOT_PASS`.

**Cross-check integrity (AC-5):** after schema validation, verify `envelope.receipt.locator` resolves on disk (relative to `repoRoot`) and the on-disk receipt's `hash` field equals `envelope.receipt.hash`. Mismatch → `VERDICT_RECEIPT_MISMATCH`.

**Cross-package imports (relative ESM `.js`, no workspace linking):**
```
../../contracts/src/index.js                  — UUID_PATTERN (from correlation.js), VerificationVerdict, HarnessClaimResult, AdversarialFinding (from stages/d-verification.js)
../../contracts/src/stages/d-verification.js  — VerificationVerdict, HarnessClaimResult, AdversarialFinding
../../receipts/src/index.js                   — ReceiptDocument, receiptDocumentSchema, validateChain, validateReceiptDocument
../../approval/src/index.js                   — canonicalize, sha256Hex, writeReceiptDocument
../../registration/src/index.js              — ALLOWED_PROJECT_KEYS, McpClientFactory, McpToolClient, SITE_URL
../harness/index.js (same package)           — allocateSequence
../pipeline/index.js (same package)          — Disposition (type only, for disposition table rendering)
```

Do NOT import from `../../registration/src/adapter-docker-mcp.ts` directly — use only the exported surface (`index.js`). The `SITE_URL` constant is exported from `registration/src/index.js` (verify on disk before using).

**RP-4 cell-escaping (AC-9):** `|` → `\|`, CR → single space, LF → single space. Linear-time char-code loop, no `.replace()` with regex. Function is independently testable. 100k-char hostile input must complete in <2000ms (assert with `performance.now()`).

**Summary structure (AC-8):** three sections:
1. Harness pass count — `n/m` from `payload.harnessClaims` (count passing vs total), then a table per claim (claim ref, passed boolean, evidence string — all cells escaped)
2. Adversarial findings disposition — one row per finding in `payload.adversarialFindings` (summary, citation, severity, coordinator disposition, note — all cells escaped), paired with `input.dispositions` by index
3. Receipt chain table — one row per receipt from `validateChain`'s result (sequence, stage, kind, claimRef, subjectKind, hash, locator)

**No real npm install needed if node_modules already exist.** Check first with `ls plugins/foreman-line/verification/node_modules/` — if present, skip. If absent, run `npm install` in `verification/`. AJV and yaml are already in the package's devDeps from P1-P3.

## Build rules

- Commits end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
- Every external boundary (envelope read, receipt-dir scan, chain-tip read, receipt write, summary write, every transport method) is wrapped in typed try-catch rethrowing `HumanGateError` with the documented code (lesson #22). Post-approval Jira failures are RECORDED as half-closed state and returned, not thrown.
- Tests are hermetic — no network, no real gateway spawn, no `StdioClientTransport`, no `docker` calls. Decision enters as a function argument (no prompt to fake). Fixture `HumanGateJiraTransport` is a recording stub (records calls, returns configured responses or throws).
- `npx tsc --noEmit`, `npx tsx --test tests/*.test.ts`, `npx biome check .` must all pass in `verification/` before claiming completion.
- AC-20 grep: `grep -rE "(execSync|spawnSync|child_process|spawn\(|git |runHarness|parseAdversarialFindings|runPipeline)" src/human-gate/` — zero matches expected.
- AC-19 grep: `grep -rE "(docker|StdioClientTransport|child_process)" tests/human-gate*` — zero matches expected.
- AC-17 grep: `grep -rE "(closure-record|ClosureRecord)" src/human-gate/` — zero matches expected.
- Every pre-existing W3-P1/P2/P3 test (96 total) must remain green.

## Completion claim format

Map each AC number (AC-1 through AC-21) to concrete evidence. State total test count (prior 96 + new tests). Call out explicitly:
- Which ACs each test file covers
- That AC-9 (RP-4 escaping, linear-time) is verified by the 100k hostile-input timing assertion
- That AC-17, AC-19, AC-20 are verified by grep with the exact commands and outputs
- That AC-1 (frozen siblings unchanged) is verified by diff against `origin/main`
- That `validateChain` passes on the extended chain in at least one approve-path test (AC-13)
- That AC-21 dogfood scan names every AC-1..AC-21 in `tests/human-gate*.test.ts`

A wrong-shaped completion claim is presumptively empty. Do not claim completion until all three deterministic checks pass.
