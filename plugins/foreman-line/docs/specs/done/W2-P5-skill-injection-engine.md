---
ticket: KONE-TBD
title: Foreman Line - W2-P5 Skill injection engine
status: done
owner: clinton.morgan
created: 2026-07-23
updated: 2026-07-23
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/dispatch/]
routing_class: standard-feature
permission_profile: builder-standard
---

# W2-P5 — Skill Injection Engine

## Intent

Add the `skill-resolver` sub-module to the existing `plugins/foreman-line/dispatch/` package. The module takes a parcel's `surfaces:` array, evaluates each surface against the frozen `skill-injection.yaml` (builder role only) using the Surface-Glob Resolution Semantics specified in the W0-P5 README, deduplicates the union of all matched skill arrays, writes an injection receipt, and returns the resolved `SkillName[]` plus the receipt's repo-relative path (`injectionReceiptRef`). The receipt path is used by W2-P2 when assembling the builder kickstarter.

This is a pure evaluation engine: no network calls, no MCP, no Jira access. The algorithm is deterministic: load + validate the frozen matrix YAML, evaluate each glob pattern against the surfaces array, union and deduplicate.

## Constraints

- **Frozen matrix (read only):** `plugins/foreman-line/skill-injection/skill-injection.yaml` is a frozen artifact. W2-P5 reads it; it does not modify it, copy its content inline, or re-implement its validator. Load with `readFileSync`, parse with `parseSkillInjectionMatrixYaml`, validate with `validateSkillInjectionMatrix` — both imported from `'../../../skill-injection/src/index.js'`. A `ValidationResult.valid === false` result throws `SkillResolverError` with `code: 'MATRIX_INVALID'`.
- **Type imports from skill-injection:** `SkillInjectionMatrix`, `SkillName`, `RoleSkillMap`, `ValidationResult`, `parseSkillInjectionMatrixYaml`, `validateSkillInjectionMatrix` are imported from `'../../../skill-injection/src/index.js'` (relative ESM specifier — no npm workspace linking exists for `plugins/foreman-line/*` packages; do not add any). Do not redefine these types in W2-P5.
- **Module location:** `plugins/foreman-line/dispatch/src/skill-resolver/index.ts`. This sub-module is added to the existing `dispatch/` package — do not create a new package.
- **Builder role only:** W2-P5 resolves the `builder` role from the matrix. Verifier harness, adversarial reviewer, coordinator, and integration role resolution are out of scope.
- **Surface-Glob Resolution Semantics (verbatim from W0-P5 README):** The resolved skill set is the **union, deduplicated by skill name**, of every glob pattern's skill array where the pattern is `'*'` OR the parcel has at least one `surfaces:` entry that matches the glob's prefix at a **path-segment boundary** — the entry either equals the prefix exactly or starts with the prefix followed by a literal `/` (the glob with its trailing `/*` stripped, e.g. `'ui/*'` → prefix `ui`). This is deliberately **not** a raw string-prefix test: `surfaces: ['uix/foo.ts']` does NOT match `'ui/*'`, even though the raw string `'uix/foo.ts'` starts with the substring `'ui'` — only a path-segment match counts. This is **additive, not override-based** — the union of all matching patterns.
  - Algorithm in full:
    1. Collect `builderMap = matrix.builder` (a `RoleSkillMap` — `{ [glob: string]: readonly string[] }`).
    2. Initialize `resolved = new Set<string>()`.
    3. For each `[glob, skills]` entry in `Object.entries(builderMap)`:
       - If `glob === '*'`: add all `skills` to `resolved`.
       - Else (glob is `'prefix/*'`): strip the trailing `/*` to get `prefix`. For each `surface` in `input.surfaces`: if `surface === prefix` OR `surface.startsWith(prefix + '/')`, add all `skills` to `resolved` and break (one matching surface is sufficient to fire the rule).
    4. Return `Array.from(resolved)` (order: iteration order of the Set, which is insertion order from the glob pattern walk).
  - The `'*'` pattern fires unconditionally — it does not require any surface entries. An empty `surfaces` array still gets the universal `'*'` skills.
- **No regex over untrusted data (lesson #19):** surface paths and skill names are matched with `===`, `startsWith`, and `Set` membership checks only. Do not apply regex to surfaces input or matrix content.
- **Typed error class:** `export class SkillResolverError extends Error` with `readonly code: 'MATRIX_UNREADABLE' | 'MATRIX_INVALID' | 'RECEIPT_WRITE_FAILED'`. All error paths throw `SkillResolverError` (never bare `Error`). Tests assert on `.code`.
- **External-call wrapping (lesson #22):** every external call at the module boundary is wrapped in a typed try-catch and rethrows as `SkillResolverError`:
  - `readFileSync` → catch → `MATRIX_UNREADABLE`
  - `parseSkillInjectionMatrixYaml` → catch → `MATRIX_INVALID` (it throws `YAMLParseError` on malformed YAML)
  - `mkdirSync` / `writeFileSync` → single try-catch → `RECEIPT_WRITE_FAILED`
- **Receipt write:** on successful evaluation, write the following JSON to `<repoRoot>/docs/receipts/<workflowId>/skill-injection.json`, creating the directory if absent:
  ```json
  {
    "workflowId": "<workflowId>",
    "role": "builder",
    "surfaces": ["<surfaces array>"],
    "injectedSkills": ["<resolved SkillName[]>"],
    "matrixRef": "plugins/foreman-line/skill-injection/skill-injection.yaml",
    "timestamp": "<ISO 8601 UTC>"
  }
  ```
  `matrixRef` is the fixed string above — not an absolute path, not a computed value.
- **injectionReceiptRef:** the repo-relative path string `docs/receipts/<workflowId>/skill-injection.json`. Returned in `SkillResolverResult.injectionReceiptRef`.
- **repoRoot option:** `SkillResolverOptions.repoRoot?: string` defaults to `process.cwd()`. All file operations (matrix read, receipt write) resolve relative to `repoRoot`. Tests pass a temp directory as `repoRoot`.
- **Branch/worktree (lesson #9):** builder works on branch `feat/foreman-line-w2-p5` (emitter-assigned) in worktree `C:\Repos\foreman-line-w2-p5`.
- **Deterministic-pass environment (lessons #10, #11):** `node -v` first; PowerShell only; `$LASTEXITCODE` only after full-capture.
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

1. `plugins/foreman-line/dispatch/src/skill-resolver/index.ts` exists and exports `resolveSkills`, `SkillResolverInput`, `SkillResolverResult`, `SkillResolverOptions`, `SkillResolverError`.

2. `resolveSkills({ surfaces: ['ui/components/Button.ts'], workflowId: 'test-wf-001' }, { repoRoot: tmpDir })` returns `{ injectedSkills: ['test-coverage', 'kds-figma'], injectionReceiptRef: 'docs/receipts/test-wf-001/skill-injection.json' }`. Both the universal `'*'` rule and the `'ui/*'` rule fire.

3. `resolveSkills({ surfaces: ['plugins/foreman-line/dispatch/src/index.ts'], workflowId: 'test-wf-002' }, { repoRoot: tmpDir })` returns `{ injectedSkills: ['test-coverage'], ... }`. Only the `'*'` rule fires — the surface does not match `'ui/*'` at a path-segment boundary.

4. **PAR-2 regression / path-segment boundary:** `resolveSkills({ surfaces: ['uix/legacy-widget.ts'], workflowId: 'test-wf-003' }, { repoRoot: tmpDir })` returns `{ injectedSkills: ['test-coverage'], ... }`. `'uix/...'` shares the substring `'ui'` but does NOT match the `'ui/*'` prefix at a path-segment boundary. A dedicated test asserts this.

5. **Exact-prefix match:** `resolveSkills({ surfaces: ['ui'], workflowId: 'test-wf-004' }, { repoRoot: tmpDir })` returns `{ injectedSkills: ['test-coverage', 'kds-figma'], ... }`. A surface equal to the prefix exactly satisfies the path-segment boundary rule.

6. **Deduplication:** `resolveSkills({ surfaces: ['ui/foo.ts', 'ui/bar.ts'], workflowId: 'test-wf-005' }, { repoRoot: tmpDir })` returns `injectedSkills: ['test-coverage', 'kds-figma']` — each skill appears exactly once despite two surfaces matching the `'ui/*'` rule.

7. **Multi-surface union:** `resolveSkills({ surfaces: ['backend/service.ts', 'ui/button.ts'], workflowId: 'test-wf-006' }, { repoRoot: tmpDir })` returns `injectedSkills: ['test-coverage', 'kds-figma']` — the union of `'*'` (test-coverage) and `'ui/*'` (kds-figma), deduplicated. `test-coverage` appears once, not twice.

8. **Universal rule fires on empty surfaces:** `resolveSkills({ surfaces: [], workflowId: 'test-wf-007' }, { repoRoot: tmpDir })` returns `injectedSkills: ['test-coverage']`. The `'*'` pattern fires unconditionally.

9. **Receipt fields:** after a successful call, `<repoRoot>/docs/receipts/<workflowId>/skill-injection.json` exists and contains valid JSON with exactly these six fields: `workflowId`, `role`, `surfaces`, `injectedSkills`, `matrixRef`, `timestamp`. `role === 'builder'`. `matrixRef === 'plugins/foreman-line/skill-injection/skill-injection.yaml'`. `timestamp` is parseable as an ISO 8601 date.

10. **Receipt overwrite:** a second call with the same `workflowId` overwrites the receipt cleanly (no error, no partial write). A test verifies the overwrite case.

11. **MATRIX_UNREADABLE:** calling with a `repoRoot` where the matrix YAML does not exist throws `SkillResolverError` with `code === 'MATRIX_UNREADABLE'`.

12. **MATRIX_INVALID — malformed YAML:** calling with a `repoRoot` where `skill-injection.yaml` contains `'builder: {invalid: [unclosed'` throws `SkillResolverError` with `code === 'MATRIX_INVALID'` (lesson #22: `parseSkillInjectionMatrixYaml` throw is caught and rethrown).

13. **MATRIX_INVALID — schema violation:** calling with a `repoRoot` where the matrix file is valid YAML but fails schema validation (e.g. missing `builder` key) throws `SkillResolverError` with `code === 'MATRIX_INVALID'`.

14. `SkillResolverError`, `SkillResolverInput`, `SkillResolverResult`, `SkillResolverOptions` are re-exported from `dispatch/src/index.ts` alongside the existing W2-P1 and W2-P3 exports. Also re-export `SkillName` from `dispatch/src/index.ts` so callers do not need to import directly from the skill-injection package.

15. `npx tsc --noEmit` passes with zero errors in `plugins/foreman-line/dispatch/`.

16. `biome check .` passes with zero diagnostics in `plugins/foreman-line/dispatch/`.

17. All tests pass via `npx tsx --test tests/*.test.ts` in `plugins/foreman-line/dispatch/`. Total test count ≥ 45 (existing 37 + at least 8 new W2-P5 tests covering ACs 2–13).

18. No backtracking regex applied to surface paths, skill names, or any string sourced from the matrix YAML or caller input (lesson #19). Path-segment boundary matching is implemented with `===` and `String.prototype.startsWith` only.

## Out of Scope

- Creating a new `plugins/foreman-line/skill-resolver/` package — W2-P5 is a sub-module added to the existing `dispatch/` package.
- Modifying any file in `plugins/foreman-line/skill-injection/` — that package is frozen.
- Modifying `plugins/foreman-line/contracts/` — frozen.
- Resolving verifier harness, adversarial reviewer, coordinator, or integration roles — W2-P5 resolves the builder role only.
- Skill-name existence checking against any `skills/` directory — explicitly deferred (see W0-P5 README: "Skill-name existence is out of scope").
- Adding npm workspace linking to the root `package.json` — Stop-and-Report.

## Context & References

- `plugins/foreman-line/skill-injection/skill-injection.yaml` — the frozen matrix document. Concrete v0 content: `builder: { '*': ['test-coverage'], 'ui/*': ['kds-figma'] }`.
- `plugins/foreman-line/skill-injection/src/index.ts` — exports `SkillInjectionMatrix`, `SkillName`, `RoleSkillMap`, `parseSkillInjectionMatrixYaml`, `validateSkillInjectionMatrix`, `ValidationResult`.
- `plugins/foreman-line/skill-injection/src/validate.ts` — `parseSkillInjectionMatrixYaml(raw: string): unknown` (throws `YAMLParseError` on parse error); `validateSkillInjectionMatrix(doc: unknown): ValidationResult`.
- `plugins/foreman-line/skill-injection/README.md` — Surface-Glob Resolution Semantics (normative), path-segment-boundary rule, worked example.
- `plugins/foreman-line/dispatch/src/index.ts` — to be extended with W2-P5 re-exports.
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts` — frozen `DispatchOrder` interface (not modified by W2-P5).
- `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` — D6 (one dispatch package), D8 (W2-P5: standard-feature, single review).
- `docs/transcripts/defects_lessons.md` — #9, #10, #11, #19, #22.

## Adversarial focus questions

1. **Path-segment boundary false positives:** Does the implementation correctly reject `'uix/foo.ts'` against `'ui/*'` (different path segment, not a match), while accepting `'ui/components/Button.ts'`? Probe the boundary between raw-string-prefix and path-segment semantics directly.
2. **Universal rule with empty surfaces:** Does the `'*'` rule fire when `surfaces` is `[]`? The spec says yes — verify the implementation and test agree.
3. **Deduplication completeness:** If two different surfaces both match the same glob pattern (e.g. `'ui/foo.ts'` and `'ui/bar.ts'` both matching `'ui/*'`), does each skill appear exactly once in `injectedSkills`? Does the same skill from two different matching globs also deduplicate?
4. **External-call wrapping (lesson #22):** Are all three external calls — `readFileSync`, `parseSkillInjectionMatrixYaml`, and the `mkdirSync`/`writeFileSync` pair — individually wrapped so that their specific exception types surface as `SkillResolverError` with the correct code? Probe by triggering each independently (missing file, malformed YAML, write to read-only path).
5. **Receipt field completeness and role field:** Does the written receipt contain all six required fields? Is `role: 'builder'` present and correct? Would a receipt written for an empty-surfaces call correctly record `surfaces: []` and `injectedSkills: ['test-coverage']`?
## Adversarial review findings (2026-07-23)

| ID | Severity | Ruling | Resolved in |
|---|---|---|---|
| S1 | SHOULD-FIX | SUSTAINED — AC8 test missing receipt read for empty-surfaces case (spec Q5 gap) | rework commit a179c2d |
| I1 | INFO | ACKNOWLEDGED — sort before compare is intentional; insertion order not the stated invariant | n/a |
| I2 | INFO | ACKNOWLEDGED — uikit probe confirmed correct by reviewer; no test added | n/a |
| I3 | INFO | ACKNOWLEDGED — barrel re-exports verified by tsc (AC15 gate) | n/a |
| I4 | INFO | ACKNOWLEDGED — workflowId is internal value, not untrusted external input | n/a |
