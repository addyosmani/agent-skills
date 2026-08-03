---
ticket: KONE-TBD
title: Foreman Line - W2-P4 Kompress integration
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

# W2-P4 — Kompress Integration

## Intent

Add the `kompress-adapter` sub-module to the existing `plugins/foreman-line/dispatch/` package. The module assembles the dispatch context (parcel spec text + prior receipt chain), compresses it via an injected `CompressFn` (see Architecture section), writes a compression receipt, and returns the compressed text plus artifact ID and receipt reference. The compressed text is what W2-P2 places in the builder kickstarter; the artifact ID and receipt ref are recorded in the Stage-C dispatch receipt `subject` field.

Kompress is mandatory on all pipeline context (plan D7). System-prompt content is explicitly exempt and is never passed to the CompressFn. W2-P4 enforces the system-prompt exemption by construction: it only receives parcel spec text and prior receipts — system-prompt content is never an input to this module.

## Architecture — why CompressFn injection, not direct MCP call

**Probe findings (2026-07-23, coordinator-executed, fixture-isolated per lesson #21):**

The `headroom_compress` MCP tool is available as a Claude Code plugin (`headroom@headroom-marketplace`, loaded from `https://github.com/chopratejas/headroom.git`). It is **not** a remote HTTP server with a stable network endpoint. Key probe observations:
1. `headroom_compress` accepts only `{ content: string }` — no number, object, or optional parameters (type ceiling: string-only, no complex types, lesson #20 verified).
2. Round-trip confirmed: `headroom_compress(content)` → hash; `headroom_retrieve(hash)` → verbatim original content.
3. **Session-local storage**: the hash is valid only within the current Claude Code session. The hint field says "Content compressed via headroom_compress is stored for the session." A builder session (separate process) cannot retrieve content by hash from a prior coordinator session.
4. Bad hash behavior: `headroom_retrieve(badHash)` returns `{ error: "Content not found..." }` — not a thrown exception. Callers must check the response shape.
5. `headroom_compress` is a Claude Code plugin (stdio-based subprocess), not accessible from a spawned Node.js process via HTTP.

**Contingency ladder (ratified at shaping, per lessons #20/#21):**
| Scenario | Resolution |
|---|---|
| `headroom_compress` available in coordinator session | Primary path: CompressFn calls it directly |
| `headroom_compress` unavailable (plugin not loaded) | KompressError('COMPRESS_FAILED') — dispatch aborts; no fallback (Kompress mandatory) |
| Receipt write fails | KompressError('RECEIPT_WRITE_FAILED') — dispatch aborts |
| CompressFn returns malformed response (missing hash) | KompressError('COMPRESS_FAILED') with descriptive message |

**Architecture decision:** W2-P4's `kompressContext` function accepts a `CompressFn: (content: string) => Promise<KompressCallResult>`. In production, the coordinator (W2-P2) supplies a function that calls `headroom_compress` directly (available in the coordinator's Claude Code session). In tests, the factory is a synchronous-wrapped mock. W2-P4 does NOT call `headroom_compress` itself — it receives the compressed result and handles content assembly, receipt writing, and error classification.

**Session-scope implication:** Because hashes are session-local, the builder kickstarter must contain the **compressed text** (the `compressed` field from `headroom_compress`), not only the hash. The hash is recorded in the receipt for audit trail and for the coordinator's same-session retrieval only.

## Constraints

- **Module location:** `plugins/foreman-line/dispatch/src/kompress-adapter/index.ts`. This sub-module is added to the existing `dispatch/` package — do not create a new package.
- **No new dependencies:** `dispatch/package.json` already has `@modelcontextprotocol/sdk`, `ajv`, and `yaml`. W2-P4 adds no new runtime dependencies. The `CompressFn` injection eliminates the need for any new MCP client setup in this module.
- **CompressFn contract:** the injected function `CompressFn: (content: string) => Promise<KompressCallResult>` where:
  ```typescript
  export interface KompressCallResult {
    readonly compressed: string     // the compressed/stored text (may equal input for small content)
    readonly hash: string           // artifact ID for session-local retrieval
    readonly originalTokens: number
    readonly compressedTokens: number
    readonly tokensSaved: number
    readonly transforms: readonly string[]  // e.g. ['router:noop'] or ['summarize', ...]
  }
  ```
  The function must reject (throw) on any failure — W2-P4 does NOT inspect response error fields; it trusts that a rejected promise = failure. If the underlying MCP tool returns an error object (like `{ error: "Content not found" }`), the CompressFn wrapper in W2-P2 is responsible for converting that to a rejection. Tests mock this function.
- **Content assembly:** W2-P4 assembles content as: `parcelSpecText`, then for each receipt in `priorReceiptChain`, appended with `\n\n---\n\n` as a separator. The separator is deterministic and constant. System-prompt content is NEVER included.
- **Typed error class:** `export class KompressError extends Error` with `readonly code: 'COMPRESS_FAILED' | 'RECEIPT_WRITE_FAILED'`. All error paths throw `KompressError`. Tests assert on `.code`.
- **External-call wrapping (lesson #22):** the `CompressFn` call and the `mkdirSync`/`writeFileSync` pair are each wrapped in typed try-catch:
  - `await compressFn(content)` → catch → `KompressError('COMPRESS_FAILED', ...)`
  - `mkdirSync` / `writeFileSync` → single catch → `KompressError('RECEIPT_WRITE_FAILED', ...)`
- **Receipt write:** on successful compression, write the following JSON to `<repoRoot>/docs/receipts/<workflowId>/kompress.json`, creating the directory if absent:
  ```json
  {
    "workflowId": "<workflowId>",
    "artifactId": "<hash>",
    "compressedTokens": N,
    "originalTokens": N,
    "tokensSaved": N,
    "transforms": ["<transforms>"],
    "sessionScoped": true,
    "timestamp": "<ISO 8601 UTC>"
  }
  ```
  `sessionScoped: true` documents the session-local hash constraint.
- **kompressReceiptRef:** `docs/receipts/<workflowId>/kompress.json` (repo-relative, returned in `KompressResult`).
- **repoRoot option:** `KompressOptions.repoRoot?: string` defaults to `process.cwd()`. Tests pass a tmpDir.
- **Branch/worktree (lesson #9):** builder works on branch `feat/foreman-line-w2-p4` (emitter-assigned) in worktree `C:\Repos\foreman-line-w2-p4`.
- **Deterministic-pass environment (lessons #10, #11):** `node -v` first; PowerShell only; full-capture before reading `$LASTEXITCODE`.
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

1. `plugins/foreman-line/dispatch/src/kompress-adapter/index.ts` exists and exports `kompressContext`, `KompressInput`, `KompressResult`, `KompressOptions`, `KompressFn`, `KompressCallResult`, `KompressError`.

2. **Content assembly — basic:** `kompressContext({ parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'test-001' }, mockFn, { repoRoot: tmpDir })` calls `mockFn` with `'SPEC'` (no separator when chain is empty). A test asserts the exact string passed to `compressFn`.

3. **Content assembly — with receipts:** `kompressContext({ parcelSpecText: 'SPEC', priorReceiptChain: ['R1', 'R2'], workflowId: 'test-002' }, mockFn, { repoRoot: tmpDir })` calls `mockFn` with `'SPEC\n\n---\n\nR1\n\n---\n\nR2'`. A test asserts the exact assembled string.

4. **Result shape:** `kompressContext(...)` resolves to `{ artifactId: '<hash>', compressedText: '<compressed>', originalTokens: N, compressedTokens: N, tokensSaved: N, transforms: [...], kompressReceiptRef: 'docs/receipts/<workflowId>/kompress.json' }`.

5. **Receipt written:** after a successful call, `<repoRoot>/docs/receipts/<workflowId>/kompress.json` contains valid JSON with all seven required fields: `workflowId`, `artifactId`, `compressedTokens`, `originalTokens`, `tokensSaved`, `transforms`, `sessionScoped`, `timestamp`. `sessionScoped === true`. `timestamp` is parseable as ISO 8601.

6. **Receipt overwrite:** a second call with the same `workflowId` and different content overwrites the receipt cleanly.

7. **COMPRESS_FAILED — CompressFn rejects:** when `compressFn` rejects with any error, `kompressContext` rejects with `KompressError` with `code === 'COMPRESS_FAILED'`. Test mocks `compressFn` to throw `new Error('headroom unavailable')`.

8. **COMPRESS_FAILED — malformed response:** when `compressFn` resolves with a result missing the `hash` field (e.g. `{ compressed: 'x', originalTokens: 0, ... }` with no hash), `kompressContext` rejects with `KompressError` with `code === 'COMPRESS_FAILED'`. Tests assert response shape validation.

9. **RECEIPT_WRITE_FAILED:** when the receipt directory is not writable (mock the write by pointing to an invalid path or wrapping writeFileSync), `kompressContext` rejects with `KompressError` with `code === 'RECEIPT_WRITE_FAILED'`.

10. `KompressError`, `KompressInput`, `KompressResult`, `KompressOptions`, `KompressFn`, `KompressCallResult` are re-exported from `dispatch/src/index.ts` alongside existing W2-P1, W2-P3, and W2-P5 exports.

11. `npx tsc --noEmit` passes with zero errors in `plugins/foreman-line/dispatch/`.

12. `biome check .` passes with zero diagnostics in `plugins/foreman-line/dispatch/`.

13. All tests pass via `npx tsx --test tests/*.test.ts` in `plugins/foreman-line/dispatch/`. Total test count ≥ 57 (existing 49 + at least 8 new W2-P4 tests covering ACs 2–9).

14. No new runtime dependencies added to `dispatch/package.json`. The dependency-allowlist test (`dependency-allowlist.test.ts`) still asserts exactly `{@modelcontextprotocol/sdk, ajv, yaml}`.

## Out of Scope

- Calling `headroom_compress` directly — the CompressFn caller (W2-P2) provides the implementation. W2-P4 is the receipt writer and coordinator.
- Implementing `headroom_retrieve` — retrieval is the coordinator's same-session concern, not W2-P4's.
- System-prompt compression — explicitly exempt (plan D7). System-prompt content never reaches W2-P4.
- Creating a new package for the kompress adapter — it is a sub-module of the existing `dispatch/` package.
- Modifying `plugins/foreman-line/contracts/` — frozen.
- Adding npm workspace linking — Stop-and-Report.

## Context & References

- `plugins/foreman-line/dispatch/src/index.ts` — to be extended with W2-P4 re-exports.
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts` — frozen `DispatchOrder` interface (no Kompress fields per D5 amendment — Kompress data goes in receipt `subject`, not DispatchOrder).
- `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` — D4 (headroom IS Kompress), D5 (Kompress data goes in Stage-C receipt `subject`, not DispatchOrder), D7 (Kompress mandatory, system prompts exempt), D8 (W2-P4: architecture/risk, dual review).
- `docs/transcripts/defects_lessons.md` — #9, #10, #11, #20, #21, #22.
- Live probe results (2026-07-23): `headroom_compress({ content: string })` → `{ compressed, hash, original_tokens, compressed_tokens, tokens_saved, savings_percent, transforms, note }`. `headroom_retrieve({ hash })` → `{ hash, source: 'local', original_content, ... }`. Session-local storage confirmed. Round-trip identity confirmed.
- **Open I4 defect (systemic):** `workflowId` is not sanitized before use in file paths. A value containing `../` segments escapes `receipts/`, `docs/`, or `repoRoot`. This same defect is present in W2-P3 (`routing-eval/index.ts:185`), W2-P5 (`skill-resolver/index.ts:137`), and W2-P1 (`query/index.ts:204,217`). Remediation should be applied as a single sanitization utility across all four modules in a follow-up parcel; patching W2-P4 in isolation would be inconsistent. Adversarial review B confirmed the defect but explicitly recommended the package-level fix approach.

## W2-P4 shaping checklist (elevated risk — charter requirement)

- [x] Live probe of `headroom_compress` with ALL argument types — only `content: string` accepted (no numbers, no objects, no optional params). Type ceiling: string-only. Lesson #20 verified.
- [x] Contingency ladder ratified in the spec — see Architecture section table above.
- [x] Probe fixture-isolated — synthetic test payload `"W2-P4 PROBE FIXTURE — NOT PRODUCTION DATA"` used; no production receipts touched. Lesson #21 verified.
- [x] Round-trip smoke test: compress → retrieve → identity verified. Hash `e197dc536e9f992edb4d1fce` retrieved verbatim. Lesson #21 verified.
- [x] Session-scope implication documented — builder kickstarter must include compressed TEXT, not just hash. Spec AC4 returns `compressedText` for exactly this reason.

## Adversarial focus questions

1. **Content assembly determinism:** Is the separator between `parcelSpecText` and each receipt (`\n\n---\n\n`) deterministic and tested? What if `priorReceiptChain` is empty — does the assembled content equal exactly `parcelSpecText` (no trailing separator)? Probe both the empty-chain and the multi-receipt cases with exact string assertions.

2. **CompressFn response validation:** The spec says W2-P4 validates that the resolved result has a truthy `hash` field (AC8). Is this the right validation boundary? What other fields could be missing or zero in a malformed response that would silently produce wrong output (e.g., `originalTokens: undefined` serialized as `null` in the receipt)?

3. **External-call wrapping (lesson #22):** Is the `await compressFn(content)` call itself in a try-catch (AC7: CompressFn rejects), separate from the receipt write try-catch? Are both independently triggerable in tests?

4. **`sessionScoped: true` semantic:** The receipt field `sessionScoped: true` documents that the hash is not cross-session. Is this the only documentation of the constraint? Does W2-P2 have any other mechanism to enforce that the compressed text (not the hash) is what goes in the builder kickstarter?

5. **No new dependencies (AC14):** W2-P4 adds zero runtime dependencies. Does the dependency-allowlist test in the suite catch a regression here automatically? Verify the test still asserts exactly `{@modelcontextprotocol/sdk, ajv, yaml}` after W2-P4 is added.
