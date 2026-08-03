---
ticket: KONE-TBD
title: Foreman Line - W2-P3 Model routing evaluation engine
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

# W2-P3 — Model Routing Evaluation Engine

## Intent

Add the `routing-eval` sub-module to the existing `plugins/foreman-line/dispatch/` package. The module takes a parcel's `routing_class` (string from spec frontmatter) and `data_classification` tier, evaluates them against the frozen `routing-policy.yaml`, and returns the single concrete model ID the builder session should use (`resolvedModelId`) plus a routing receipt written to `docs/receipts/<workflowId>/routing-decision.json`. The receipt's repo-relative path is returned as `routingDecisionRef` — the value W2-P2 places verbatim into `DispatchOrder.routingDecisionRef`.

This is a pure evaluation engine: no network calls, no MCP, no Jira access. The algorithm is deterministic: load + validate the frozen policy YAML, intersect class allowlist tiers with data_classification eligibility, return the first eligible model in policy order.

## Constraints

- **Frozen policy (read only):** `plugins/foreman-line/routing-policy/routing-policy.yaml` is a frozen artifact. W2-P3 reads it; it does not modify it, copy its content inline, or re-implement the routing-policy validator. Validate the loaded document with `validatePolicy` imported from `'../../../routing-policy/src/index.js'` before use. A `ValidationResult.valid === false` result throws `RoutingError` with `code: 'POLICY_INVALID'`.
- **Type imports from routing-policy:** `ClassName`, `CLASS_NAMES`, `DataClassificationTier`, `DATA_CLASSIFICATION_TIERS`, `RoutingPolicy`, `validatePolicy` are imported from `'../../../routing-policy/src/index.js'` (relative ESM specifier — no npm workspace linking exists for `plugins/foreman-line/*` packages; do not add any). Do not redefine these types in W2-P3.
- **YAML parsing:** read the policy file with `readFileSync` and parse with `parse` from the `yaml` package. Add `"yaml": "2.9.0"` to `dispatch/package.json` dependencies (same version already used by `@foreman-line/routing-policy`).
- **Module location:** `plugins/foreman-line/dispatch/src/routing-eval/index.ts`. This sub-module is added to the existing `dispatch/` package — do not create a new package.
- **Resolution algorithm (verified against live YAML):**
  1. Read and parse `<repoRoot>/plugins/foreman-line/routing-policy/routing-policy.yaml`.
  2. Validate with `validatePolicy`; throw `RoutingError('POLICY_INVALID')` if invalid.
  3. Runtime-validate `routing_class` is in `CLASS_NAMES`; throw `RoutingError('UNKNOWN_CLASS')` if not.
  4. Runtime-validate `data_classification` is in `DATA_CLASSIFICATION_TIERS`; throw `RoutingError('UNKNOWN_DATA_CLASSIFICATION')` if not.
  5. Get `classEntry = policy.classes[routing_class as ClassName]`.
  6. Get `eligible = new Set(policy.data_classification[data_classification as DataClassificationTier].eligible_models)`.
  7. For each `tier` in `classEntry.allowlist` (in policy order):
     - Get `tierModels = policy.model_tiers[tier] ?? []`.
     - Find the first model in `tierModels` that is also in `eligible`.
     - Return it as `resolvedModelId`; `tier` is `resolvedTier`.
  8. If no eligible model found after all tiers → throw `RoutingError('NO_ELIGIBLE_MODEL')`.
  The function returns exactly one model ID. N>1 sub-parcel-split enforcement (charter D7) is W2-P2's responsibility.
- **Typed error class:** `export class RoutingError extends Error` with `readonly code: 'UNKNOWN_CLASS' | 'UNKNOWN_DATA_CLASSIFICATION' | 'NO_ELIGIBLE_MODEL' | 'POLICY_INVALID' | 'POLICY_UNREADABLE' | 'RECEIPT_WRITE_FAILED'` (coordinator amendment: `RECEIPT_WRITE_FAILED` added at rework for F-02). All error paths throw `RoutingError` (never a bare `Error`); the error message includes the offending input value. Tests assert on `.code`.
- **Receipt write:** on successful evaluation, write the following JSON to `<repoRoot>/docs/receipts/<workflowId>/routing-decision.json`, creating the directory if absent:
  ```json
  {
    "workflowId": "<workflowId>",
    "routing_class": "<routing_class>",
    "data_classification": "<data_classification>",
    "resolvedTier": "<resolvedTier>",
    "resolvedModelId": "<resolvedModelId>",
    "timestamp": "<ISO 8601 UTC>",
    "policyRef": "plugins/foreman-line/routing-policy/routing-policy.yaml"
  }
  ```
  `policyRef` is the fixed string above — not an absolute path, not a computed value.
- **routingDecisionRef:** the repo-relative path string `docs/receipts/<workflowId>/routing-decision.json`. This is the value returned in `RoutingResult.routingDecisionRef` and placed verbatim into `DispatchOrder.routingDecisionRef` by W2-P2.
- **repoRoot option:** `RoutingOptions.repoRoot?: string` defaults to `process.cwd()`. All file paths (policy YAML read, receipt write) resolve relative to `repoRoot`. Tests pass a temp directory as `repoRoot` so no production receipts are touched.
- **No regex over untrusted data (lesson #19):** model IDs and class names are short, fixed-vocabulary strings — use strict equality (`===`) and `Set`/array membership checks, not regex. Do not apply regex to anything sourced from the policy YAML or caller arguments.
- **Linear-time intersection:** the eligibility intersection uses `new Set(eligible_models)` for O(1) lookup per model.
- **Exports:** `evaluateRouting`, `RoutingInput`, `RoutingResult`, `RoutingOptions`, `RoutingError` exported from `dispatch/src/routing-eval/index.ts` and re-exported from `dispatch/src/index.ts`. Also re-export `ClassName` and `DataClassificationTier` from `dispatch/src/index.ts` so callers do not need to import directly from the routing-policy package.
- **Branch/worktree (lesson #9):** builder works on branch `feat/foreman-line-w2-p3` (emitter-assigned) in worktree `C:\Repos\foreman-line-w2-p3`.
- **Deterministic-pass environment (lessons #10, #11):** `node -v` first; PowerShell only; `$LASTEXITCODE` only after full-capture (never through a truncating pipeline).
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

1. `plugins/foreman-line/dispatch/src/routing-eval/index.ts` exists and exports `evaluateRouting`, `RoutingInput`, `RoutingResult`, `RoutingOptions`, `RoutingError`.
2. `evaluateRouting({ routing_class: 'standard-feature', data_classification: 'internal', workflowId: 'test-wf-001' }, { repoRoot: tmpDir })` returns `{ resolvedModelId: 'claude-sonnet-5', resolvedTier: 'standard', routingDecisionRef: 'docs/receipts/test-wf-001/routing-decision.json' }`.
3. `evaluateRouting({ routing_class: 'architecture/risk', data_classification: 'public', workflowId: 'test-wf-002' }, { repoRoot: tmpDir })` returns `{ resolvedModelId: 'claude-opus-4-8', resolvedTier: 'frontier', routingDecisionRef: 'docs/receipts/test-wf-002/routing-decision.json' }`.
4. `evaluateRouting({ routing_class: 'boilerplate', data_classification: 'public', workflowId: 'test-wf-003' }, { repoRoot: tmpDir })` returns `{ resolvedModelId: 'claude-haiku-4-5', resolvedTier: 'economy', routingDecisionRef: 'docs/receipts/test-wf-003/routing-decision.json' }`.
5. `evaluateRouting({ routing_class: 'implementation/standard', data_classification: 'restricted', workflowId: 'test-wf-004' }, { repoRoot: tmpDir })` returns `{ resolvedModelId: 'claude-sonnet-5', resolvedTier: 'standard', routingDecisionRef: 'docs/receipts/test-wf-004/routing-decision.json' }`.
6. All four routing classes tested against all three `data_classification` tiers: ≥12 evaluation test cases, all returning the correct `resolvedModelId` per the live YAML.
7. Passing `routing_class: 'standard'` (the PAR-2 wrong label — not a valid `ClassName`) throws `RoutingError` with `code: 'UNKNOWN_CLASS'`. A dedicated test asserts this.
8. Passing an unrecognized `data_classification` value throws `RoutingError` with `code: 'UNKNOWN_DATA_CLASSIFICATION'`.
9. After a successful call, `<repoRoot>/docs/receipts/<workflowId>/routing-decision.json` contains valid JSON with all seven required fields: `workflowId`, `routing_class`, `data_classification`, `resolvedTier`, `resolvedModelId`, `timestamp`, `policyRef`. `policyRef === 'plugins/foreman-line/routing-policy/routing-policy.yaml'`. `timestamp` is parseable as an ISO 8601 date.
10. A second call with the same `workflowId` overwrites the receipt cleanly (no error, no partial write). A test verifies the overwrite case.
11. `dispatch/package.json` dependencies include `"yaml": "2.9.0"`. The dependency-allowlist test asserts the updated `dependencies` object.
12. `RoutingError`, `ClassName`, `DataClassificationTier` are re-exported from `dispatch/src/index.ts` alongside the existing W2-P1 exports.
13. `npx tsc --noEmit` passes with zero errors in `plugins/foreman-line/dispatch/`.
14. `biome check .` passes with zero diagnostics in `plugins/foreman-line/dispatch/`.
15. All tests pass via `npx tsx --test tests/*.test.ts` in `plugins/foreman-line/dispatch/`. Total test count ≥ 25 (achieved: 37/37).
16. No backtracking regex applied to model IDs, class names, tier names, or any string sourced from the policy YAML or caller input.

## Out of Scope

- Creating a new `plugins/foreman-line/routing-eval/` package — W2-P3 is a sub-module added to the existing `dispatch/` package.
- Modifying any file in `plugins/foreman-line/routing-policy/` — that package is frozen.
- Modifying `plugins/foreman-line/contracts/` — frozen.
- Implementing the N>1 sub-parcel-split enforcement (charter D7) — W2-P2's responsibility; W2-P3 returns exactly one model ID per call.
- Skill injection, Kompress integration, or the integrating CLI — W2-P5, W2-P4, W2-P2.
- Adding npm workspace linking to the root `package.json` — Stop-and-Report.
- Parsing or loading parcel spec YAML frontmatter — W2-P3 only reads the routing-policy YAML, not parcel specs.

## Context & References

- `plugins/foreman-line/routing-policy/routing-policy.yaml` — the frozen policy document.
- `plugins/foreman-line/routing-policy/src/index.ts` — exports `ClassName`, `CLASS_NAMES`, `DataClassificationTier`, `DATA_CLASSIFICATION_TIERS`, `RoutingPolicy`, `validatePolicy`.
- `plugins/foreman-line/dispatch/src/index.ts` — extended to re-export W2-P3 surface alongside W2-P1 exports.
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts` — frozen `DispatchOrder` interface.
- `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` — D7 (N>1 is W2-P2's stop condition), D8 (W2-P3: standard-feature risk, single review).
- `docs/transcripts/defects_lessons.md` — #9, #10, #11, #19, #22 (typed error wrapping at module boundaries).

## Adversarial review findings (2026-07-23)

| ID | Severity | Ruling | Resolved in |
|---|---|---|---|
| F-01 | SHOULD-FIX | SUSTAINED — `parse()` unwrapped; rethrow as `POLICY_INVALID` | rework commit f802874 |
| F-02 | SHOULD-FIX | SUSTAINED — receipt I/O unwrapped; new `RECEIPT_WRITE_FAILED` code | rework commit f802874 |
| F-03 | SHOULD-FIX | SUSTAINED — malformed YAML test added | rework commit f802874 |
| INFO-01 | INFO | ACKNOWLEDGED — spec on main, not feature branch (expected pattern) | n/a |
