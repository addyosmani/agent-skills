# Build Kickstarter — W4-P2 DocSpine CI hook

**Parcel:** W4-P2  
**Risk:** standard  
**Permission profile:** builder  
**Spec:** `plugins/foreman-line/docs/specs/active/W4-P2-docspine-ci-hook.md`  
**Worktree:** `C:\Repos\foreman-line-w4-p2`  
**Branch:** `feat/foreman-line-w4-p2`

---

## Step 0 — Gate (read before writing a single line of code)

1. Confirm you are in worktree `C:\Repos\foreman-line-w4-p2`, branch `feat/foreman-line-w4-p2`.
2. Read the spec at `plugins/foreman-line/docs/specs/active/W4-P2-docspine-ci-hook.md` in full.
3. Run `git diff --stat origin/main` — expected: only your new files (zero from main after branching from post-#90).
4. Run `node -v` in PowerShell — must report ≥ 24.11.1 (repo `engines.node >= 24.11.1`).
5. Run `npx tsc --noEmit` in `plugins/foreman-line/` — must be zero errors **before** you write anything.
6. Run the test suite: `cd plugins/foreman-line && npx vitest run` — confirm 96/96 pass (the W4-P4 baseline).
7. **STOP** if any baseline check fails — report to coordinator, do not proceed.

---

## Context

W4-P2 extends `plugins/foreman-line/integration/` with a **DocSpine CI hook**: a pure
function (`runDocSpineHook`) that accepts a `DocSpineRunVerifyFn` seam, calls DocSpine's
`runVerify`, processes the `AuditReport`, and returns GitHub annotation strings plus
`exitCode: 0` (always — report-only / non-blocking).

The companion live entrypoint `docspine-report.ts` documents the pinned DocSpine commit
(`48bc338`) the CI step would install, but **does NOT add a CI step** — the `foreman-line-ci.yml`
is BYTE-UNCHANGED this parcel (AC14). The CI wiring is a human-applied step after the §7a
DocSpine org-transfer; the exact job YAML snippet is the "wiring diff artifact" the spec
defines (AC15) — include it in the PR body.

DocSpine is **not installed as a package dependency** in `integration/`. The live seam in
`docspine-report.ts` acquires `runVerify` via a dynamic import that only resolves when CI
installs DocSpine at the pinned commit. Tests ALWAYS inject a mock — never import from
`C:\Repos\docspine`.

---

## Files to create / modify

| File | Action |
|------|--------|
| `plugins/foreman-line/integration/src/docspine-hook.ts` | **NEW** |
| `plugins/foreman-line/integration/src/docspine-report.ts` | **NEW** |
| `plugins/foreman-line/integration/src/index.ts` | **ADDITIVE** exports only |
| `plugins/foreman-line/integration/tests/docspine-hook.test.ts` | **NEW** |
| `.github/workflows/foreman-line-ci.yml` | **BYTE-UNCHANGED** |

No `package.json` changes. No new npm dependencies.

---

## Critical implementation notes

### 1. Local mirror interfaces (no DocSpine import)

Define in `docspine-hook.ts` — these structurally mirror DocSpine's output contracts:

```ts
export interface DocSpineClaimFinding {
  claim: { docId: string; line: number; kind: string; value: string }
  status: 'ok' | 'broken' | 'moved' | 'unverifiable'
  detail?: string
  movedTo?: string
}

export interface DocSpineDocFinding {
  docId: string
  claimFindings: DocSpineClaimFinding[]
}

export interface DocSpineAuditReport {
  generatedAtSha: string
  toolVersion: string
  analysisDepth: string
  docFindings: DocSpineDocFinding[]
  gaps: Array<{ target: string }>
  contradictions: Array<{ docIds: [string, string] }>
}

export type DocSpineRunVerifyFn = (repoRoot: string, registry: unknown) => Promise<DocSpineAuditReport>

export interface DocSpineHookSeams {
  readonly runVerifyFn: DocSpineRunVerifyFn
  readonly getRepoRoot?: () => string
}

export interface DocSpineHookResult {
  readonly annotations: readonly string[]
  readonly exitCode: 0
}
```

### 2. `runDocSpineHook` — annotation format

**Summary annotation (always first):**
```
::notice::docspine-hook: totalDocs=<N> brokenDocs=<N> brokenClaims=<N> unverifiableClaims=<N> totalGaps=<N> totalContradictions=<N> analysisDepth=<depth> sha=<generatedAtSha>
```

**Per-claim broken/moved (`::warning::`):**
```
::warning::docspine-hook [<docId>:<line>] kind=<kind> value=<value> status=<broken|moved> detail=<detail>
```
Omit `detail=` when `detail` is undefined.

**Per-claim unverifiable (`::notice::`):**
```
::notice::docspine-hook [<docId>:<line>] kind=<kind> value=<value> status=unverifiable detail=<detail>
```

**Gaps (only when `gaps.length > 0`):**
```
::notice::docspine-hook: <N> coverage gaps found (details in report artifact)
```

**Contradictions (only when `contradictions.length > 0`):**
```
::notice::docspine-hook: <N> contradiction candidates found (advisory — human review)
```

Order: [summary, ...per-claim annotations, gaps (if any), contradictions (if any)]

### 3. Error resilience

`runDocSpineHook` wraps the `runVerifyFn` call in try/catch:
```ts
} catch (err) {
  return {
    annotations: [`::warning::docspine-hook: skipped — runVerify threw: ${String(err)}`],
    exitCode: 0,
  }
}
```

### 4. `docspine-report.ts` live seam pattern

```ts
// PINNED: DocSpine commit 48bc338 (W1 registry wiring complete — clint-morgan/docspine).
// CI installs via: npm install --no-save github:clint-morgan/docspine#48bc338
// After §7a org transfer: update to github:KaseyaOne/docspine#48bc338
async function getLiveRunVerifyFn(): Promise<DocSpineRunVerifyFn> {
  const { runVerify } = await import('docspine/src/pipeline/run-verify.js')
  const { registry } = await import('docspine/src/registry.js')
  return (root: string) => runVerify(root, registry)
}
```

Fallback on import error: return the error-resilient path (same pattern as `runReport`'s
live-seam error handling). `docspine-report.ts` is a script — `invokedDirectly()` guards
the entrypoint block.

`DocSpineReportSeams`:
```ts
export interface DocSpineReportSeams {
  readonly runVerifyFn?: DocSpineRunVerifyFn  // default: live import
  readonly getRepoRoot?: () => string          // default: git rev-parse
}
```

### 5. `getRepoRoot` default

```ts
function realGetRepoRoot(): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim()
}
```

### 6. `integration/src/index.ts` — additive exports only

Append after the last existing export block. Do not touch existing lines. The existing
file ends with the `report.js` exports block — add after it.

### 7. `foreman-line-ci.yml` — BYTE-UNCHANGED

Do NOT add a job or step. Confirm with `git diff .github/workflows/foreman-line-ci.yml`
returning empty before committing.

---

## Test coverage requirements (docspine-hook.test.ts)

Write a single Vitest test file covering all 18 ACs. Minimum test cases:

| Test | AC |
|------|----|
| Empty report → 1 summary annotation, exitCode 0 | AC2, AC6, AC7 |
| All-ok findings → 1 summary annotation, no claim annotations | AC5, AC6 |
| One broken claim → summary + 1 warning annotation | AC3, AC6 |
| One moved claim → summary + 1 warning annotation (status=moved) | AC3 |
| One unverifiable claim → summary + 1 notice annotation | AC4 |
| Mixed findings → correct counts in summary | AC6 |
| `gaps.length > 0` → extra notice annotation | AC10 |
| `contradictions.length > 0` → extra notice annotation | AC11 |
| `runVerifyFn` throws → 1 warning annotation, exitCode 0 | AC9 |
| `runVerifyFn` rejects (async) → 1 warning annotation, exitCode 0 | AC9 |
| `detail` present → appears in annotation | AC3, AC4 |
| `detail` absent → annotation omits `detail=` | AC3 |
| No DocSpine import in test file (assertion by absence) | AC16 |

Also add a conformance test:
- `foreman-line-ci.yml` content read from disk == content at `origin/main` (same byte-comparison pattern as existing `conformance.test.ts` AC19) | AC14 |

---

## Completion claim format

When done, output exactly:

```
W4-P2 BUILD COMPLETE
TSC: <error count>
BIOME: <diagnostic count>
TESTS: <pass>/<total>
FILES: <count of new/modified files>
COMMIT: <sha>
BRANCH: feat/foreman-line-w4-p2
```

Then stop. Do not open a PR. Do not push. Coordinator handles that.
