# Builder Kickstarter — W3-P1 Verification Harness

You are the Builder for Foreman Line parcel W3-P1 — the Verification Harness. Your spec — the sole source of truth — is `plugins/foreman-line/docs/specs/active/W3-P1-verification-harness.md` (status: active). Read it in full, then every file its Context & References section names.

**Where you stand (non-negotiable):** worktree `C:\Repos\foreman-line-w3-p1-verification-harness`, branch `feat/foreman-line-W3-P1` (created by the permission-profiles dispatch emitter — verify with `git branch --show-current` before anything else). You never touch `C:\Repos\kaseya-one-productivity-tools`'s working tree, never check out another branch, never push. All work is committed on this branch in this worktree.

**What you are building:** the `plugins/foreman-line/verification/` package — a brand-new package that does not yet exist. Three public functions: `recordBuildResult` (Stage-C→D bridge sub-receipt), `allocateSequence` (monotonic sequence allocator for all Stage-D sub-receipts), and `runHarness` (named-test AC convention execution + matrix-check invocation + per-claim receipt emission). Package scaffold mirrors `dispatch/` exactly (package.json, tsconfig.json, biome.json, src/index.ts, src/harness/).

**Environment:** Windows. Node toolchain in PowerShell ONLY (lesson #10); `node -v` first (>=24.11.1). Exit codes read via full-capture before `$LASTEXITCODE` (lesson #11). No Git Bash for Node/npm. Linear-time string handling everywhere — AC-label extraction and test-name matching use char-code / `indexOf` / `startsWith`, never backtracking regex; must survive CodeQL `js/polynomial-redos` gate (lesson #19).

**Frozen / read-only surfaces (modification is a Stop-and-Report):** `contracts/`, `shaping/`, `projection/`, `approval/`, `receipts/`, `spec-linter/`, `schema-scaffold/`, `routing-policy/`, `skill-injection/`, `permission-profiles/`, `registration/`, `dispatch/`, root `package.json`. The named-test convention doc `plugins/foreman-line/verification/AC-CONVENTION.md` was authored by the shaping agent and shipped in the coordinator commit — you implement it exactly; you do not modify it.

## Step 0 — restate and STOP (mandatory gate)

Before writing any code: run `node -v` in PowerShell, confirm >=24.11.1. Then:

1. Restate the parcel scope in your own words — the three public functions, their signatures, what they write, what they return.
2. Enumerate every file you will create or modify (exact paths). The boundary is `plugins/foreman-line/verification/`; the only other write surface is `docs/receipts/<workflowId>/` for receipt files (written by tests into a temp dir — not the repo's actual `docs/receipts/`).
3. Confirm every Out of Scope item explicitly — no adversarial review, no rework routing, no VerificationVerdict assembly, no Jira calls, no git ops on any target branch.
4. State the AC count (17 ACs) and your planned test approach: how many test files, which ACs each covers, expected test count per file.
5. Flag every ambiguity, contradiction, or spec gap with a recommended resolution each.

Then STOP for the coordinator's ruling. A real spec gap becomes a coordinator-ratified amendment committed alone before code.

## Critical implementation notes (coordinator-verified)

**Receipt field names (F7, D7):** the field is `stage` (not `stageId`); confirmed against `receipts/src/types.ts`. `kind: 'claim'` receipts carry a non-null `claimRef`. `subjectKind` slugifies for the filename: `BuildResult` → `...-D-build-result.json`, `HarnessClaimResult` → `...-D-harness-claim-result.json`. No `stageId` field exists in the frozen schema — do not invent one.

**Chain identity (AC5c):** `receipts/src/validator.ts` `validateChain` verifies that every receipt in the chain shares both `correlation.workflowId` AND `correlation.correlationId`. Stage-D sub-receipts must inherit both from the chained receipt (the Stage-C receipt for `recordBuildResult`; the prior Stage-D receipt for subsequent claims). Do NOT call `generateCorrelationContext()` (from the approval package) — it mints a fresh `workflowId` and would break the chain. Mint fresh `sessionId`/`runId` only.

**`allocateSequence` file filter:** only 6-digit-prefixed filenames (`\d{6}-<stage>-<slug>.json`) count toward the highest sequence. `skill-injection.json` and similar non-conforming files are ignored. Sequence-prefix parsing is linear-time integer parsing of the 6-char prefix, not a regex scan.

**Matrix-check selection (IoC pattern):** the harness owns which checks are required (policy from `skill-injection.yaml` `verifier_harness:` section: `test-coverage.check` always; `kds-sweep` for `ui/*` surfaces; `tenant-isolation` for `tenancy/*` surfaces). The caller owns the implementations (`MatrixCheckSet` injected via `HarnessInput`). A required check with no injected implementation → `VerificationError('MATRIX_CHECK_MISSING')`, not silent skip. Surface matching uses the path-segment glob rule from `dispatch/src/skill-resolver/index.ts` — reuse that logic, do not re-implement.

**`recordBuildResult` prevHash source:** reads the `hash` field of the receipt at `dispatchReceiptLocator`. Validates `{ branch, commitShas, touchedSurfaces }` against `buildResultSchema` (from `contracts/src/stages/c-dispatch.js`) before embedding. Read failure → `VerificationError('DISPATCH_RECEIPT_UNREADABLE')`.

**Cross-package imports (relative ESM `.js`, no workspace linking):**
```
../../contracts/src/stages/c-dispatch.js     — DispatchOrder, BuildResult, buildResultSchema
../../contracts/src/stages/d-verification.js — HarnessClaimResult
../../receipts/src/index.js                  — ReceiptDocument, receiptPath, receiptDocumentSchema, validateChain, validateReceiptDocument
../../approval/src/index.js                  — canonicalize, sha256Hex, writeReceiptDocument
../../skill-injection/src/index.js           — parseSkillInjectionMatrixYaml, validateSkillInjectionMatrix, SkillInjectionMatrix
../../dispatch/src/skill-resolver/index.js   — path-segment glob resolution (reuse, do not re-implement)
```

**Package scaffold — exact versions from `dispatch/package.json`:**
- deps: `ajv: 8.20.0`, `yaml: 2.9.0` (no `@modelcontextprotocol/sdk` — not needed here)
- devDeps: `@biomejs/biome: 2.5.3`, `@types/node: 26.1.1`, `tsx: 4.23.1`, `typescript: 7.0.2`

**`signature` field:** always `null` — no signing infra this wave. The frozen `ReceiptDocument` schema allows `null`.

## Build rules

- Commits end with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.
- Every external call — spec read, dispatch-receipt read, receipt-dir scan, receipt write, matrix YAML parse, and each `MatrixCheck` invocation — is wrapped in a typed try-catch rethrowing `VerificationError` with the documented `code` (lesson #22). Both read AND write boundaries.
- Tests run in a temp directory — never write actual `docs/receipts/` files under test. Use `os.tmpdir()` or a fixture approach that cleans up.
- No `npm install` needed — the worktree has node_modules from the main repo? Actually: fresh worktree has no `node_modules`; run `npm install` in `verification/` before running typecheck/test/lint.
- `npx tsc --noEmit`, `npx tsx --test tests/*.test.ts`, `npx biome check .` must all pass in `verification/` before claiming completion.
- AC-14 grep (no backtracking regex): run `grep -rE "(\\+|\\*|\\.\\*|\\[^\\]|\\{[0-9])" src/` — if the pattern would match, examine each hit and justify or eliminate.
- AC-17 grep (no git/Jira/spawn): `grep -rE "(execSync|spawnSync|child_process|JIRA|jira|git )" src/` — zero matches expected.

## Completion claim format

Map each AC number (AC-1 through AC-17) to concrete evidence. State total test count. Call out explicitly:
- Which ACs each test file covers
- That AC-14 (linear-time) and AC-17 (no-spawn) are verified by grep with the command and output
- That `validateChain` passes on the emitted receipt sequence in at least one test (AC-10)
- That the dogfooding check (AC-16) is satisfied: this parcel's spec has AC-N labels, and its tests name each one

A wrong-shaped completion claim is presumptively empty. Do not claim completion until all three deterministic checks pass.
