---
ticket: KONE-TBD
title: Foreman Line - W2-P2 Dispatch approval CLI
status: active
owner: clinton.morgan
created: 2026-07-23
updated: 2026-07-23
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: elevated
surfaces: [plugins/foreman-line/dispatch/]
routing_class: architecture/risk
permission_profile: builder-standard
---

# W2-P2 — Dispatch Approval CLI (integrating CLI)

## Intent

Add the `approval-cli` sub-module to `plugins/foreman-line/dispatch/`. This is the integrating CLI: it orchestrates W2-P3 (routing eval), W2-P5 (skill resolver), and W2-P4 (Kompress) into a complete dispatch package, presents the assembled `DispatchOrder` to the coordinator for one-tap human approval, and — on approval — invokes the permission-profile emitter to create the builder worktree, emits a schema-valid `DispatchOrder`, and writes the Stage-C dispatch receipt with the correct `prevHash` (Stage-B receipt hash) and Kompress metadata in `subject`.

W2-P2 is the sole mechanism the coordinator uses to execute Gate 2. Approval is Clint's one-tap decision on the pre-assembled dispatch package; the approval decision is preserved in the Stage-C receipt.

## Architecture

### Two-phase API

**Phase 1 — `prepareDispatch` (pure, no disk writes):** reads the spec, reads the Stage-B receipt, runs P3/P5/P4 in sequence, assembles the `DispatchOrder`, validates it against the frozen schema. Returns a `DispatchPackage` for coordinator review. No side effects.

**Phase 2 — `executeDispatch` (on coordinator approval):** calls `dispatchWorktree` (permission-profile emitter) BEFORE any file writes (lesson #18 — emitter owns worktree creation, never pre-create by hand); then writes the Stage-C `ReceiptDocument`; returns the final `DispatchOrder` + receipt locator + worktree path. On any failure, rethrows as `DispatchError`.

### Cross-package imports (no npm workspace linking)

All cross-package imports use relative ESM specifiers with `.js` extension (TypeScript NodeNext):

```
../../../contracts/src/stages/c-dispatch.js   — DispatchOrder, dispatchOrderSchema
../../../receipts/src/index.js                — ReceiptDocument, receiptPath, validateReceiptDocument
../../../approval/src/index.js                — canonicalize, sha256Hex, writeReceiptDocument
../../../permission-profiles/src/emitter.js   — dispatchWorktree (injectable for tests)
../routing-eval/index.js                      — evaluateRouting
../skill-resolver/index.js                    — resolveSkills
../kompress-adapter/index.js                  — kompressContext, KompressFn
../query/index.js                             — CandidateRecord (type)
```

### CompressFn injection

`prepareDispatch` accepts `compressFn: KompressFn`. The coordinator provides the real implementation. Tests mock it.

### `dispatchWorktree` injection

`executeDispatch` accepts an optional `dispatchWorktreeFn?: (opts: DispatchWorktreeInput) => DispatchWorktreeOutput`. Tests inject a mock. Production omits the option (real emitter called).

```typescript
interface DispatchWorktreeInput {
  parcel: string
  profile: string
  path: string
  cwd?: string
}
interface DispatchWorktreeOutput {
  code: 0 | 1 | 2
  stdout: string
  stderr: string
}
```

### Receipt chain

Stage-C receipt: `sequence: 2`, `stage: 'C'`, `prevHash` = Stage-B receipt's `hash` field (read from `candidate.priorReceiptLocator`), `subjectKind: 'DispatchOrder'`, `subject` = Kompress + routing metadata. Written via `writeReceiptDocument` from the `approval` package. Hash computed as `sha256Hex(canonicalize(draft without hash key))`.

**IMPORTANT:** Do NOT use `generateCorrelationContext()` from approval package — it generates a fresh `workflowId`, breaking the chain. Instead construct `CorrelationContext` manually: `correlationId` = `randomUUID()`, `sessionId` = `randomUUID()`, `runId` = `randomUUID()`, `workflowId` = `candidate.workflowId` (the existing chain key from W1).

### `priorReceiptChain` for Kompress

`kompressContext` is called with `priorReceiptChain` = `[stageBReceiptText]` — the raw JSON text of the Stage-B receipt file. `parcelSpecText` is the full text of the spec file at `specPath`.

## Constraints

- **Module location:** `plugins/foreman-line/dispatch/src/approval-cli/index.ts`
- **No new dependencies:** `dispatch/package.json` already has `@modelcontextprotocol/sdk`, `ajv`, `yaml`. Add zero new runtime dependencies.
- **Frozen contract:** `DispatchOrder` 5 fields, `additionalProperties: false`. Validate with AJV before returning from `prepareDispatch`.
- **Lesson #18:** `dispatchWorktree` called BEFORE any receipt/file write in `executeDispatch`. If it fails (code ≠ 0), throw `DispatchError('WORKTREE_FAILED')` — no receipt written.
- **Lesson #22:** every external call wrapped in typed try-catch → `DispatchError`.
- **Spec frontmatter:** parse YAML frontmatter between `---` delimiters. Required: `routing_class` (string), `data_classification` (string), `surfaces` (string[]). Optional: `permission_profile` (string).
- **`parcelRef`:** `candidate.ticketKey`.
- **`routingDecisionRef`:** `RoutingResult.routingDecisionRef`.
- **`injectedSkills`:** `SkillResolverResult.injectedSkills`.
- **`permissionProfile`:** from frontmatter (optional in DispatchOrder).
- **Stage-C `subject`:** `{ kompressArtifactId, kompressReceiptRef, compressedText, routingDecisionRef, injectedSkills, permissionProfile? }`.
- **`workflowId` null guard:** if `candidate.workflowId` is null, throw `DispatchError('SPEC_INVALID_FRONTMATTER')` — no receipt chain possible.
- **`priorReceiptLocator` null guard:** if `candidate.priorReceiptLocator` is null OR the file doesn't exist, throw `DispatchError('PRIOR_RECEIPT_UNREADABLE')`.
- **`prevHash` validation:** after parsing the Stage-B receipt JSON, validate that the `hash` field is a non-empty string. If missing, throw `DispatchError('PRIOR_RECEIPT_UNREADABLE')`.
- **`permissionProfile` default for emitter:** if frontmatter omits `permission_profile`, use `'builder-standard'` when calling `dispatchWorktree`. The `DispatchOrder.permissionProfile` remains `undefined`.
- **Integration is PR-only; spec moves to `done/` in the merge PR.**

## Acceptance Criteria

1. `plugins/foreman-line/dispatch/src/approval-cli/index.ts` exports `prepareDispatch`, `executeDispatch`, `DispatchError`, and types `DispatchInput`, `DispatchPackage`, `ExecuteResult`, `DispatchOptions`, `SpecFrontmatter`.

2. **Spec reading:** `prepareDispatch` reads the file at `input.specPath` and parses its YAML frontmatter. A test provides a temp file with valid frontmatter. Parsed values reflected in `DispatchPackage`.

3. **Prior receipt reading:** reads Stage-B receipt at `candidate.priorReceiptLocator` (joined with `repoRoot`). Extracts `hash` field as `prevHash`. A test provides a temp receipt file with a known `hash` value and asserts `pkg.prevHash === knownHash`. If valid JSON but no `hash` field, throws `DispatchError('PRIOR_RECEIPT_UNREADABLE')`.

4. **Routing eval called correctly:** `evaluateRouting` called with input `{ routing_class: <from frontmatter>, data_classification: <from frontmatter>, workflowId: candidate.workflowId }` and options `{ repoRoot }`. Result's `routingDecisionRef` populates `pkg.order.routingDecisionRef`.

5. **Skill resolver called correctly:** `resolveSkills` called with input `{ surfaces: <from frontmatter>, workflowId: candidate.workflowId }` and options `{ repoRoot }`. Result's `injectedSkills` populates `pkg.order.injectedSkills`.

6. **Kompress called correctly:** `kompressContext` called with `{ parcelSpecText: <full spec file text>, priorReceiptChain: [<stage-B receipt JSON text>], workflowId: candidate.workflowId }` and the injected `compressFn`. A test asserts exact `parcelSpecText` and `priorReceiptChain` values.

7. **Step 0 restatement format:** `pkg.order.stepZeroRestatement` contains: the parcel ticket key, the workflow ID, the resolved model ID, injected skills as comma-joined list, and the string `"artifact ID:"` followed by the kompressArtifactId. A test asserts each substring.

8. **DispatchOrder validates against frozen schema:** AJV validation in `prepareDispatch`. If validation fails, throw `DispatchError('ORDER_INVALID')`.

9. **`executeDispatch` calls `dispatchWorktree` first:** mock asserts `dispatchWorktreeFn` was called BEFORE any file write (verify receipt file does NOT exist if mock is called but receipt write hasn't run yet — test via mock that fails).

10. **WORKTREE_FAILED:** injected `dispatchWorktreeFn` returns `{ code: 1, ... }` → `DispatchError('WORKTREE_FAILED')`. Receipt file does NOT exist after error.

11. **Stage-C receipt written correctly:** after successful `executeDispatch`, `docs/receipts/<workflowId>/000002-C-dispatch-order.json` exists with: `stage: 'C'`, `sequence: 2`, `prevHash: <stage-B hash>`, `subjectKind: 'DispatchOrder'`, `subject.kompressArtifactId`, `subject.routingDecisionRef`, valid non-empty `hash`.

12. **`executeDispatch` returns correct shape:** `{ order: DispatchOrder, receiptLocator: 'docs/receipts/<workflowId>/000002-C-dispatch-order.json', worktreePath }`.

13. **`SPEC_UNREADABLE`:** non-existent `specPath` → `DispatchError('SPEC_UNREADABLE')`.

14. **`SPEC_INVALID_FRONTMATTER`:** missing required frontmatter field → `DispatchError('SPEC_INVALID_FRONTMATTER')`. Null `workflowId` → same code.

15. **`PRIOR_RECEIPT_UNREADABLE`:** null locator OR missing file → `DispatchError('PRIOR_RECEIPT_UNREADABLE')`. Missing `hash` field in JSON → same code. Tests cover each sub-case.

16. **`COMPRESS_FAILED`:** injected `compressFn` rejects → `DispatchError('COMPRESS_FAILED')`.

17. **Barrel re-exports:** all exports from `approval-cli/index.ts` re-exported from `dispatch/src/index.ts`.

18. **`npx tsc --noEmit`** passes with zero errors.

19. **`biome check .`** passes with zero diagnostics.

20. **All tests pass** via `npx tsx --test tests/*.test.ts`. Total count ≥ 59 (existing) + at least 14 new W2-P2 tests covering ACs 2–16.

21. **No new runtime dependencies** added to `dispatch/package.json`.

22. **`permissionProfile` default:** if frontmatter omits `permission_profile`, `dispatchWorktreeFn` receives `profile: 'builder-standard'`. `pkg.order.permissionProfile` is `undefined`.
