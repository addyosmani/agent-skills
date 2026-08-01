---
ticket: KONE-TBD
title: Foreman Line - W4-P2 DocSpine CI hook (doc-claims validation against repo state via pinned runVerify; hermetic + wiring-deferred)
status: active
owner: clinton.morgan
created: 2026-07-27
updated: 2026-07-27
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/integration/]
routing_class: standard-feature
permission_profile: builder
---

# W4-P2 — DocSpine CI hook

## Intent

Build the **DocSpine CI hook** for the Foreman Line integration package — a pure,
hermetically-tested function that accepts a `DocSpineRunVerifyFn` seam, calls it with the
repo root and a registry, processes the resulting `AuditReport`, and returns GitHub
annotation strings plus a report-only `exitCode: 0`.

Two outputs:

1. **`runDocSpineHook(seams?)`** in `integration/src/docspine-hook.ts` — the pure hook
   logic; claims annotations emit as `::warning::` (broken/moved) or `::notice::`
   (unverifiable, summary, gaps, contradictions); always exits 0.

2. **`integration/src/docspine-report.ts`** — the live entrypoint (same shape as
   `report.ts`); documents the pinned DocSpine commit `48bc338` that the CI step would
   install; calls `runDocSpineHook()` (no seams = live path) and exits 0.

**`foreman-line-ci.yml` is BYTE-UNCHANGED** (wiring deferred to §7a org-transfer). The
coordinator produces a human-applied wiring diff in the PR body at Stage F. The
§7a-transfer stop condition fires when the coordinator reaches the live wiring step in a
future session.

## Coordinator rulings

| # | Question | Ruling |
|---|---|---|
| Q1 | DocSpine types imported directly or local mirrors? | **Local mirrors** — define minimal local interfaces (`DocSpineAuditReport`, `DocSpineDocFinding`, `DocSpineClaimFinding`) that structurally match DocSpine's output. No direct package import from DocSpine. Keeps `integration/` hermetic; live seam uses a dynamic import in `docspine-report.ts`. |
| Q2 | `DocSpineRunVerifyFn` registry parameter type? | **`unknown`** — the live seam passes the real `registry` object; tests pass `undefined` (ignored by the mock). |
| Q3 | Should `DocSpineHookError` extend `IntegrationError`? | **No** — `IntegrationError` union is frozen (byte-unchanged). Add a standalone `DocSpineHookError` class only if a typed error class is needed for the `catch` path; otherwise inline. |
| Q4 | Does `foreman-line-ci.yml` get a step this parcel? | **No** — wiring deferred. The entrypoint `docspine-report.ts` exists so the STEP can trivially invoke `tsx src/docspine-report.ts`; the step itself is a human-applied diff after §7a transfer. |
| Q5 | Pinned commit for the live seam? | **`48bc338`** — the current HEAD of `C:\Repos\docspine` (latest W1 registry wiring). Named in a comment in `docspine-report.ts`. |
| Q6 | `analysisDepth` in summary annotation? | **Yes** — include it; DocSpine produces `"path-only-spike"` at this version; useful for CI log context. |

## Acceptance criteria

### Package surface (integration/src/docspine-hook.ts + integration/src/docspine-report.ts)

**AC1 — Exports:** `runDocSpineHook`, `DocSpineHookResult`, `DocSpineHookSeams`,
`DocSpineRunVerifyFn`, `DocSpineAuditReport`, `DocSpineDocFinding`,
`DocSpineClaimFinding` are exported from `integration/src/index.ts`. All pre-existing
W4-P1/P3/P4 exports are byte-unchanged. `integration/src/index.ts` changes are additive
only.

**AC2 — Always exits 0:** `runDocSpineHook(seams?)` returns `{ annotations, exitCode: 0 }`
unconditionally. No thrown exception, no non-zero exit code, even when DocSpine reports
broken claims. Report-only / non-blocking invariant.

**AC3 — Broken/moved annotations:** For each `DocSpineClaimFinding` with
`status === 'broken' | 'moved'`, emits exactly one `::warning::` annotation containing
`docId`, `claim.line`, `claim.kind`, `claim.value`, and `detail` (when present).

**AC4 — Unverifiable annotations:** For each `DocSpineClaimFinding` with
`status === 'unverifiable'`, emits exactly one `::notice::` annotation (not `::warning::`)
containing `docId`, `claim.line`, `claim.kind`, `claim.value`, and `detail` (when present).

**AC5 — Ok claims are silent:** `DocSpineClaimFinding` with `status === 'ok'` produces no
annotation. A report with only `ok` findings emits only the summary annotation (AC6).

**AC6 — Summary annotation:** Exactly one `::notice::` summary annotation per run, emitted
FIRST (before per-claim annotations), containing: `totalDocs`, `brokenDocs` (docs with
≥1 broken or moved finding), `brokenClaims`, `unverifiableClaims`, `totalGaps`,
`totalContradictions`, `analysisDepth`. Even when all counts are 0 the summary is still
emitted.

**AC7 — Empty report:** `AuditReport` with `docFindings: []`, `gaps: []`,
`contradictions: []` → exactly 1 annotation (the summary with all counts = 0, exitCode: 0).

**AC8 — Injected seam accepted:** `DocSpineHookSeams.runVerifyFn` is the single injection
point. When absent or `undefined`, the live `docspine-report.ts` entrypoint supplies it
(not the hook itself — the hook has no default; the entrypoint wires the default). Tests
ALWAYS inject a mock.

**AC9 — Error resilience:** If `runVerifyFn` throws or rejects, `runDocSpineHook` catches
the error and returns `{ annotations: ['::warning::docspine-hook: skipped — runVerify
threw: <message>'], exitCode: 0 }`. Non-blocking contract holds.

**AC10 — Gaps annotation:** When `AuditReport.gaps.length > 0`, emits a `::notice::`
annotation with the gap count. When 0, no gaps annotation (count is in the summary).

**AC11 — Contradictions annotation:** When `AuditReport.contradictions.length > 0`, emits
a `::notice::` annotation with the count. When 0, no contradictions annotation.

**AC12 — Entrypoint script:** `integration/src/docspine-report.ts` calls
`runDocSpineHook({ runVerifyFn: liveRunVerifyFn })` (live seam, acquired via dynamic
import), prints all annotation lines to stdout, calls `process.exit(result.exitCode)`.
Guarded by `invokedDirectly()` check (same pattern as `report.ts`). Exports
`DocSpineReportSeams` (seam interface for the entrypoint-level injection).

**AC13 — Pinned commit documented:** `docspine-report.ts`'s live seam acquisition is
accompanied by a comment naming the pinned DocSpine commit `48bc338` (the commit the CI
wiring step would install via `npm install github:clint-morgan/docspine#48bc338` or
equivalent). This comment is a standing placeholder; the wiring is a human step post-§7a
transfer.

### Conformance

**AC14 — `foreman-line-ci.yml` byte-unchanged:** `diff` between the PR's
`foreman-line-ci.yml` and `origin/main`'s copy is empty. The wiring step is NOT added in
this parcel.

**AC15 — Wiring diff artifact:** The PR body (or a file committed in the PR) contains the
exact `foreman-line-ci.yml` job snippet that a human would apply post-§7a transfer — the
stop-and-present artifact. This is the coordinator's deliverable for the live-wiring
hand-off.

**AC16 — Hermetic tests:** All tests in `integration/tests/docspine-hook.test.ts` inject a
mock `runVerifyFn`. No test imports from `C:\Repos\docspine` or any live DocSpine path.
No test touches the network, filesystem (beyond test fixtures), or real git.

**AC17 — No `IntegrationError` mutation:** `plugins/foreman-line/integration/src/errors.ts`
is byte-unchanged. `IntegrationError`'s union members are byte-unchanged.

**AC18 — `integration/src/index.ts` update count:** File is exported from but not
re-organized. All existing export blocks are byte-unchanged; new exports are appended.

## Implementation notes

### Local mirror interfaces

```ts
// integration/src/docspine-hook.ts
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

### Summary annotation format

```
::notice::docspine-hook: totalDocs=3 brokenDocs=1 brokenClaims=2 unverifiableClaims=0 totalGaps=0 totalContradictions=0 analysisDepth=path-only-spike sha=<generatedAtSha>
```

### Per-claim annotation format (broken)

```
::warning::docspine-hook [<docId>:<line>] kind=<kind> value=<value> status=broken detail=<detail>
```

### Per-claim annotation format (unverifiable)

```
::notice::docspine-hook [<docId>:<line>] kind=<kind> value=<value> status=unverifiable detail=<detail>
```

### Gaps annotation format (when gaps.length > 0)

```
::notice::docspine-hook: <N> coverage gaps found (details in report artifact)
```

### Contradictions annotation format (when contradictions.length > 0)

```
::notice::docspine-hook: <N> contradiction candidates found (advisory — human review)
```

### Wiring diff artifact (AC15)

The foreman-line-ci.yml snippet to be added by a human post-§7a transfer:

```yaml
  docspine-hook:
    name: docspine-hook
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
      - name: Install dependencies
        run: npm ci
        working-directory: plugins/foreman-line
      - name: Install DocSpine at pinned commit
        run: npm install --no-save github:clint-morgan/docspine#48bc338
        working-directory: plugins/foreman-line/integration
      - name: Run DocSpine hook (report-only)
        run: npx tsx src/docspine-report.ts
        working-directory: plugins/foreman-line/integration
```

**Note:** After §7a transfer, `clint-morgan/docspine` becomes `KaseyaOne/docspine`. Update
the install URL accordingly.

### Live runVerifyFn acquisition pattern

```ts
// docspine-report.ts — live seam
// PINNED: DocSpine commit 48bc338 (W1 registry wiring complete).
// CI installs via: npm install --no-save github:clint-morgan/docspine#48bc338
// After §7a transfer: github:KaseyaOne/docspine#48bc338
const { runVerify } = await import('docspine/src/pipeline/run-verify.js')
const { registry } = await import('docspine/src/registry.js')
const liveRunVerifyFn: DocSpineRunVerifyFn = (root) => runVerify(root, registry)
```

### getRepoRoot default

The live entrypoint resolves repoRoot via `execFileSync('git', ['rev-parse',
'--show-toplevel'])` (same as `report.ts`'s real seam). This may also be an injected seam
for testing the entrypoint itself.

## File layout

| File | Action |
|------|--------|
| `integration/src/docspine-hook.ts` | NEW — pure hook logic |
| `integration/src/docspine-report.ts` | NEW — live entrypoint script |
| `integration/src/index.ts` | ADDITIVE exports only |
| `integration/tests/docspine-hook.test.ts` | NEW — hermetic unit tests |
| `.github/workflows/foreman-line-ci.yml` | BYTE-UNCHANGED |

No other files change. No new packages. No `package.json` changes.
