# Builder Kickstarter — SCAF-P3 Receipt-Chain Walker (exit-proof vehicle)

You are the Builder for Foreman Line parcel SCAF-P3 — the receipt-chain walker. Your spec — the sole source of truth — is `plugins/foreman-line/docs/specs/active/SCAF-P3-receipt-chain-walker.md` (status: active). Read it in full before writing a line of code.

**Where you stand (non-negotiable):** worktree `C:\Repos\foreman-line-scaf-p3-chain-walker`, branch `feat/foreman-line-KONE-23209` (created by the permission-profiles dispatch emitter — verify with `git branch --show-current` before anything else). You never touch `C:\Repos\kaseya-one-productivity-tools`'s working tree, never check out another branch, never push.

**Dispatch context (pre-compressed):** SCAF-P3: add read-only receipt-chain walker to `verification/` — two new files only (`src/chainwalk/index.ts`, `tests/chainwalk.test.ts`), nothing else modified. `walkChain(workflowId, repoRoot)` validates UUID input pre-fs, scans `docs/receipts/<workflowId>/` (6-digit-prefix names only), verifies contiguous sequences + `prevHash` linkage + `validateReceiptDocument` per receipt; returns typed `ChainWalkResult` or throws `ChainWalkError` (named codes, one per defect class). `renderChainTable` renders a deterministic markdown table (snapshot-tested). No barrel export, no new deps, no writes, no network. Linear-time scans (#19), typed try-catch on every read (#22). Five ACs, named-test convention (AC-CONVENTION.md). Gates: tsc, biome, `tsx --test`.

**Resolved model:** claude-sonnet-5 | **Injected skill:** test-coverage | **Profile:** builder-standard

**Environment:** Windows. Node toolchain in PowerShell ONLY (lesson #10); `node -v` first (>=24.11.1). Exit codes read via full-capture before `$LASTEXITCODE` (lesson #11). No Git Bash for Node/npm. Linear-time string handling throughout — all filename scanning and chain walking is char-code / `indexOf` / `startsWith`; no backtracking regex (lesson #19, CodeQL polynomial-redos).

**What you are building:** exactly two new files in the existing `plugins/foreman-line/verification/` package:
1. `plugins/foreman-line/verification/src/chainwalk/index.ts` — `walkChain`, `renderChainTable`, `ChainWalkError`
2. `plugins/foreman-line/verification/tests/chainwalk.test.ts` — named-test coverage of AC-1..AC-5

No other file is modified. Not even `src/index.ts` (the chainwalk module is deliberately NOT re-exported from the barrel — precedent: `writeClaimReceipt` in harness). The package.json, tsconfig.json, biome.json, and all existing sources are frozen for this parcel.

**Frozen / read-only surfaces (modification is a Stop-and-Report):** everything under `verification/` EXCEPT the two new files above. Specifically: `src/index.ts`, `src/harness/`, `src/adversarial/`, `src/pipeline/`, `src/human-gate/`, and all test files that are not `chainwalk.test.ts`. Also frozen: `contracts/`, `receipts/`, `registration/`, root `package.json`, `verification/package.json`, `verification/tsconfig.json`, `verification/biome.json`.

## Step 0 — restate and STOP (mandatory gate)

Before writing any code: run `node -v` in PowerShell, confirm >=24.11.1. Then:

1. Restate the parcel scope in your own words — what `walkChain` does, what `renderChainTable` does, what `ChainWalkError` is, and what the two files add.
2. List the EXACT two files you will create (paths relative to repo root).
3. Confirm every Out of Scope item: no barrel export, no new deps, no writes, no network, no harness/adversarial/pipeline/human-gate invocation, no git operations.
4. State the AC count (5 ACs: AC-1 through AC-5) and your planned test approach.
5. Flag any ambiguity or spec gap with a recommended resolution.

Then STOP for the coordinator's ruling. Only proceed once the ruling is issued in the conversation.

## Critical implementation notes

**Cross-package imports (relative ESM `.js`, from `verification/src/chainwalk/index.ts`):**
```
../../../receipts/src/index.js   — validateReceiptDocument, receiptPath (CONSUME, never modify)
```

No other cross-package import is needed. All other machinery (`allocateSequence`, etc.) must NOT be imported — the walker is read-only and purely derives its chain-walking logic independently.

**UUID guard (pre-fs, AC-3):** before any `readdirSync`/`readFileSync`, validate `workflowId` against the hyphenated 8-4-4-4-12 hex UUID shape using a linear-time char-code guard (mirror of harness's `assertValidWorkflowId` at line 227, reimplemented locally — do NOT import it because it is private). Traversal input like `../../..` must throw `ChainWalkError` with a distinct named code BEFORE any filesystem access.

**Receipt-name recognition:** the 6-digit-prefix convention is `\d{6}-<stage>-<slug>.json` per `receipts/src/paths.ts`. Use `indexOf` / `startsWith` / char-code loop (no regex) to recognize conforming names. Non-conforming filenames (e.g., `kompress.json`, `routing-decision.json`, the envelope file) are silently ignored — same pattern as `allocateSequence` in harness.

**Fail-loud completeness (AC-3):** every distinct defect class needs a distinct named `ChainWalkError` code. Distinct classes:
- missing/empty receipt directory (`RECEIPT_DIR_MISSING`)
- unreadable/unparsable receipt file (`RECEIPT_UNREADABLE`)
- receipt failing `validateReceiptDocument` (`RECEIPT_INVALID`)
- sequence gap or duplicate (`SEQUENCE_GAP`)
- `prevHash` mismatch (`HASH_MISMATCH`)
- genesis `prevHash` not null (`GENESIS_INVALID`)
- `workflowId` UUID guard failure (`INVALID_WORKFLOW_ID`)

Never return `{ ok: true }` with a partial chain.

**`renderChainTable` (AC-4):** deterministic GitHub-markdown table. Columns: sequence, stage, kind, claimRef/subjectKind, hash prefix (first 12 chars). Must be snapshot-testable (pure function of `ChainWalkResult` — no timestamps, no env reads). The RP-4 cell-escaping rule from W3-P4 applies: `|` → `\|`, CR/LF → space, linear char-code loop (lesson #19).

**No re-export from barrel (AC-1):** `verification/src/index.ts` must NOT be modified.

**`git diff --stat` check (AC-1):** the commit range from the parent of the first SCAF-P3 commit to the HEAD of your branch must show additions only to the two new files. Zero modification lines on any existing file.

**Dependency allowlist (AC-1 + AC-5):** the runtime dependency key set of `verification/package.json` must remain byte-identical. Do NOT add `ajv`, `yaml`, or any other package as a dependency (they are already devDeps; `validateReceiptDocument` from `receipts/` is imported via relative ESM, not as a package dep).

## Build rules

- Commits end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
- Every filesystem read in `walkChain` is wrapped in a typed try-catch that rethrows as `ChainWalkError` (lesson #22). No raw `fs` exception escapes the public API.
- Tests are hermetic — no network, no real Jira, no docker. Fixture chains built in a `tmpdir`.
- `npx tsc --noEmit`, `npx tsx --test tests/*.test.ts`, `npx biome check .` must all pass in `verification/` before claiming completion.
- AC-1 diff check: `git diff --stat origin/main -- plugins/foreman-line/verification/` confirms additions only.

## Completion claim format

Map each AC number (AC-1 through AC-5) to concrete evidence. State total test count (prior 135 + new chainwalk tests). Call out explicitly:
- That AC-1 is verified by `git diff --stat` showing additions only (exact command + output)
- That AC-3 covers ALL 7 defect classes (list which test exercises which code)
- That AC-4 `renderChainTable` is snapshot-tested (test asserts byte-identical output)
- That AC-5 shows tsc=0, biome=0, full test count, and no backtracking regex in the new files
- That AC-5 dogfood scan (the harness running against chainwalk.test.ts) passes for all 5 ACs
