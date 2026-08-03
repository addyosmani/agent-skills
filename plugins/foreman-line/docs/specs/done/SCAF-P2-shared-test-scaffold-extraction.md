---
ticket: KONE-23195
title: Foreman Line - shared test-scaffold extraction (SCAF-P2)
status: done
owner: clinton.morgan
created: 2026-07-22
updated: 2026-07-23
supersedes: null
superseded_by: null
# --- schema v0.2 fields (frozen by W0-P2) ---
risk: standard
surfaces: [plugins/foreman-line/schema-scaffold/src/test-scaffold.ts, plugins/foreman-line/schema-scaffold/tests/**, plugins/foreman-line/contracts/tests/**, plugins/foreman-line/routing-policy/tests/**, plugins/foreman-line/receipts/tests/**, plugins/foreman-line/spec-linter/tests/**, plugins/foreman-line/skill-injection/tests/**, plugins/foreman-line/permission-profiles/tests/**]
routing_class: standard-feature
data_classification: internal
permission_profile: builder-standard   # tests-only change, no new runtime dependency and no registry egress (node_modules already present); minimal-privilege builder envelope. Upgrade to builder-deps only if the deterministic pass proves a fresh-worktree install needs egress.
---

# SCAF-P2 - Shared Test-Scaffold Extraction

## Intent

Extract the genuinely-duplicated *per-package test harness* under `plugins/foreman-line/{contracts,routing-policy,receipts,spec-linter,skill-injection,permission-profiles}/tests/` into one shared, parameterized helper, and migrate all six consumers' tests to it. Three pieces recur verbatim (modulo parameters) across the six: (a) the runtime-dependency allowlist test, byte-near-identical in five packages, differing only in the expected key set; (b) the parity "no-drift" loop that asserts each committed `schemas/*.schema.json` is byte-identical to `serialize(schema)`, identical across all six; and (c) the "canonical sample validates against its schema" loop, shared by the several packages that carry a `samplesByName` map. This is scheduled hygiene in a zero-conflict window (D9: debt gets a parcel, not a drive-by edit), consolidating test scaffold the way SCAF-P1 consolidated the registry/generate scaffold - with zero change to any non-test source and zero change to any shipped schema byte.

## Constraints

- **Scope was honestly re-derived by shaping against disk, not the trigger note (defects_lessons #15).** The raw idea named "registry/generate/testing scaffold" across five packages. Two-thirds of that premise is stale: **the registry/generate scaffold is already extracted and migrated** - SCAF-P1 (shipped, `done/`) already converged all six packages (the five named plus `contracts`) onto `schema-scaffold`, verified on disk (every consumer's `src/generate.ts` is the thin wrapper importing `generate`/`serialize` from `../../schema-scaffold/src/generate.js`, and every `src/registry.ts` imports `SchemaFile` from `../../schema-scaffold/src/registry.js`). There is zero residual registry/generate duplication. The genuine residual is the *test* harness, described below. See Context & References for why this re-scoping is itself the exit proof working.
- **`src/testing.ts` in any of the five packages that have one is OUT of scope** - carried verbatim from SCAF-P1's still-valid, disk-re-verified ruling: *"only `contracts/src/testing.ts` has shared-shaped helper machinery (`ContractFixture`, `samplesByName`, `allContractFixtures`); the other four are flat, package-specific `sample<Type>` constant exports with nothing in common beyond a doc-comment convention. There is no executable duplication there to extract."* Re-verified again at this shaping against disk; the ruling holds. Do not re-propose extracting `src/testing.ts` without re-reading why it was ruled out (SCAF-P1, Constraints and Out of Scope, and `schema-scaffold/README.md`'s explicit warning).
- **New shared helper:** exactly one module, `plugins/foreman-line/schema-scaffold/src/test-scaffold.ts`, holding all three extracted pieces as parameterized exports (Q3 - one helper, not three modules):
  - a runtime-dependency allowlist assertion taking `packageJsonPath` and the `expected` key set as parameters (so `receipts` passing `['ajv']` and the other four passing `['ajv', 'yaml']` both flow through one code path);
  - a no-drift parity registrar taking a consumer's `allSchemaFiles` and its `schemasDir` and registering one `node:test` per schema file asserting `committed === serialize(schema)`;
  - a canonical-sample validation registrar taking a consumer's `allSchemaFiles` and its `samplesByName` map and registering one `node:test` per file that compiles the schema with `ajv` and validates the sample.
- **Purity / independence guardrail (Q5, the load-bearing constraint of this parcel):** `test-scaffold.ts` MUST be **pure parameterized machinery** - it imports nothing from any of the six consumers (grep-verified), and holds zero consumer-specific data (no `allSchemaFiles`, no `samplesByName`, no expected dependency set baked in). Every consumer passes its own registry data and its own paths in as arguments. Crucially, each per-package test still **executes in that package's own test process, against that package's own committed files** - extracting the assertion into the same package that owns `serialize`/`generate` must not collapse the drift check into self-attestation. The no-drift assertion still fails iff a consumer's committed schema diverges from what its own typed source serializes to; the safety net's per-package independence is preserved because the *data under test* stays per-package even though the *assertion code* is shared.
- **Test-only, runtime surface frozen (Q4):** `test-scaffold.ts` is imported **only** from consumers' `tests/**` via a filesystem-relative ESM specifier (`'../../schema-scaffold/src/test-scaffold.js'`), never from any `src/index.ts` or other runtime module. It is **NOT** re-exported from `schema-scaffold/src/index.ts` - so it never enters `schema-scaffold`'s or any consumer's runtime public surface, and `node:test`/`ajv`-as-test-tool never becomes a runtime dependency of anyone. `schema-scaffold`'s `dependencies` stay exactly `{ajv}`; no consumer's `package.json` `dependencies`/`devDependencies` changes; every consumer's existing dependency-allowlist assertion yields the same key set it does today.
- **Import mechanism:** filesystem-relative ESM specifier only, per the W0-P4 / SCAF-P1 precedent. The bare specifier `@foreman-line/schema-scaffold` MUST NOT appear anywhere (no npm workspace linking exists across `plugins/foreman-line/*`; the root `package.json` `workspaces` covers only `apps/*`/`packages/*`). Adding workspace linking to the root `package.json` is out of scope and a **Stop-and-Report**.
- **DISPATCH PRECONDITION (shaping proposes; only a future charter can authorize):** this parcel modifies `plugins/foreman-line/schema-scaffold/` - a **shipped, review-closed** package (SCAF-P1) - by adding `src/test-scaffold.ts` and its unit tests. Per the coordinator carryover, touching shipped packages is a future, separately-ratified goal. **This draft MUST NOT be dispatched (status flip draft -> active) until that goal's own Gate either ratifies an explicit exception to modify the shipped `schema-scaffold` package or issues a loop-stop ruling.** Shaping records this precondition; it does not and cannot grant the exception.
- **Branch/worktree (defects_lessons #9):** builder works on a named feature branch, isolated in its own worktree - never in the main working tree. This line goes into the dispatch kickstarter verbatim when (and only when) the precondition above is met.
- **Deterministic-pass environment (defects_lessons #10, #11):** verification runs in PowerShell only; `node -v` first (repo root `engines.node >= 24.11.1`, `schema-scaffold`'s own `>= 22`); any CLI exit-code check captures output in full before reading `$LASTEXITCODE`.
- Integration is PR-only by standing policy; per SPEC-CONVENTION §3 this spec moves to `done/` in the same PR (or an immediate follow-up) as a merge-checklist item.

## Acceptance Criteria

1. `npx tsc --noEmit` passes in `schema-scaffold` and in all six consumer packages.
2. **Tests-only diff (Q7), the heart of this spec's safety net:** across the whole migration commit range, `git diff --stat` shows changes confined to `**/tests/**` plus the single new file `plugins/foreman-line/schema-scaffold/src/test-scaffold.ts` (and its own new test). Every other `src/**/*.ts` file and **every committed `schemas/*.schema.json` file in all six consumers is byte-identical before and after** (`git diff --stat -- '**/schemas/*.schema.json'` shows zero changes; `git diff --stat -- '**/src/**' ':!**/schema-scaffold/src/test-scaffold.ts'` shows zero changes).
3. **Purity / independence (Q5):** `schema-scaffold/src/test-scaffold.ts` imports nothing from any of the six consumers (grep-verified) and contains no consumer-specific data (no literal `allSchemaFiles`, `samplesByName`, or expected-dependency set). Each consumer passes its own registry data and paths as arguments, and each per-package parity/allowlist test still executes in that consumer's own test process reading that consumer's own committed files - proven by the no-drift assertion still failing if a consumer's committed schema is perturbed (covered by `schema-scaffold`'s own negative unit test on the registrar).
4. The three duplicated harness pieces are extracted into exactly one module (`test-scaffold.ts`) with parameterized exports: (a) runtime-dependency allowlist assertion (`expected` key set as a parameter), (b) no-drift parity registrar (`allSchemaFiles` + `schemasDir` parameters), (c) canonical-sample validation registrar (`allSchemaFiles` + `samplesByName` parameters).
5. All six consumers' `tests/` are migrated to import the shared helper via the relative ESM specifier; each consumer's parity test and (where present) dependency-allowlist test produce the same pass outcomes and the same expected dependency key set as before migration.
6. `test-scaffold.ts` is **not** re-exported from `schema-scaffold/src/index.ts`; `schema-scaffold`'s runtime public surface is unchanged and its `dependencies` keys equal exactly `{ajv}`; no consumer's `package.json` `dependencies`/`devDependencies` changes.
7. `schema-scaffold`'s own test suite covers all three helper functions directly (a fixture `allSchemaFiles`, a temp `schemasDir`, and a fixture `samplesByName`), including the negative case in AC3.
8. No bare specifier (`@foreman-line/schema-scaffold`) appears anywhere in any of the six consumers or in `schema-scaffold`; root `package.json` is unmodified (`git diff --stat -- package.json` shows no change).
9. `biome check .` passes with zero diagnostics in `schema-scaffold` and all six migrated consumers.
10. All tests pass via `npx tsx --test` in `schema-scaffold` and via each consumer's existing `npm test` in all six consumers.
11. `schema-scaffold/README.md` documents the new `test-scaffold.ts` export (the three parameterized helpers, its pure/parameterized contract, the test-only import rule and the `index.ts` non-re-export), and reiterates the one-line pointer that `src/testing.ts` remains out of scope per SCAF-P1.

## Out of Scope

- `src/testing.ts` in any of the five packages that have one (contracts, routing-policy, skill-injection, permission-profiles, spec-linter). Ruled out at SCAF-P1 and re-verified against disk at this shaping (see Constraints); there is no shared executable duplication there to extract, and a documentation-only comment-standardization pass across shipped packages was already rejected at SCAF-P1 as cosmetic scope-widening.
- Any change to the registry/generate scaffold - it is already extracted and migrated (SCAF-P1). This parcel touches only the test harness.
- Any change to any consumer's non-test source (`src/**`, excluding the one new `schema-scaffold/src/test-scaffold.ts`) or to any committed `schemas/*.schema.json` byte - proven by AC2. No package's exported type/schema surface changes.
- Adding npm workspace linking to the root `package.json`, or any other root `package.json` change. A Stop-and-Report if a builder concludes it is needed.
- Re-exporting `test-scaffold.ts` (or any test helper) from any `src/index.ts` - it stays test-only, off every runtime public surface.
- `skills/parcel-compiler/tool/` in any direction - it has its own canonical/hash machinery; not scaffold, not touched.
- Jira registration - a proposal is included below; actual ticket creation is Stage B (W1), not this shaping session.
- Dispatching this parcel before its shipped-package dispatch precondition (Constraints) is satisfied by a future charter's Gate.

## Context & References

- **The stale-premise finding IS the exit proof working (charter D2).** The raw idea asked to "eliminate verbatim copies of the registry/generate/testing scaffold." Shaping read the six packages on disk and found the registry/generate two-thirds already shipped by SCAF-P1 and the `src/testing.ts` third already ruled out - honestly re-scoping the parcel down to the one genuine residual (the test harness) rather than dispatching a build against a premise that no longer holds. The pipeline catching a stale premise at Stage A, before any builder was dispatched, is precisely the W1 exit proof demonstrating its value: shaping is the gate that stops stale work from entering the Line.
- `plugins/foreman-line/docs/specs/done/SCAF-P1-shared-schema-scaffold-extraction.md` - the registry/generate extraction this parcel is the test-harness sibling to; source of the verbatim `src/testing.ts` out-of-scope ruling and the byte-identical-safety-net pattern AC2 mirrors.
- `plugins/foreman-line/schema-scaffold/README.md` - the shipped shared package this parcel extends (test-only); its "do not re-propose `testing.ts` extraction" warning and its relative-import / no-bare-specifier mechanism.
- `docs/specs/done/W0-P4-receipt-chain-schema-validator.md`, `docs/specs/done/W0-P3-routing-policy-schema-validator.md` - the ratified cross-package relative-import precedent and the dependency-allowlist test pattern this parcel consolidates.
- `docs/SPEC-CONVENTION.md` - schema this parcel is written under (§3 lifecycle, §4 required sections).
- `docs/transcripts/defects_lessons.md` #9 (name the branch/worktree), #10 (PowerShell + `node -v` first), #11 (never trust `$LASTEXITCODE` after a truncating pipeline), #15 (verify claims against the actual source, not a prior note's restatement - the governing lesson behind this parcel's re-scoping).
- The six consumers' `tests/parity.test.ts` and `tests/dependency-allowlist.test.ts` - read in full at shaping; the duplicated no-drift loop, sample-validation loop, and near-identical allowlist test are the concrete extraction targets.

## Verification Plan

Deterministic: `tsc --noEmit` in all seven packages (AC1); the tests-only `git diff --stat` gates over `**/schemas/*.schema.json` and `**/src/**` excluding the one new file (AC2); a grep sweep confirming `test-scaffold.ts` imports nothing consumer-specific (AC3) and zero bare-specifier usage anywhere (AC8); `schema-scaffold`'s new unit tests including the negative no-drift case (AC7); `biome check .` across all seven packages (AC9); full `npx tsx --test` per package (AC10). Runs in PowerShell; `node -v` first (defects_lessons #10); CLI exit-code checks capture output in full before reading `$LASTEXITCODE` (defects_lessons #11).

Adversarial review mandated focus questions:
1. **Independence not collapsed:** confirm the shared no-drift assertion still fails when a consumer's committed schema is perturbed - i.e. the extraction shared the *assertion code* but kept the *data under test* per-package. Perturb one committed schema in a scratch checkout and confirm that consumer's test goes red.
2. **Purity hunt:** confirm `test-scaffold.ts` imports nothing from any of the six consumers and bakes in no consumer-specific data.
3. **Runtime-surface hunt:** confirm `test-scaffold.ts` is not reachable from any `src/index.ts`; confirm `schema-scaffold`'s `dependencies` are still exactly `{ajv}` and no consumer's `package.json` changed.
4. **Tests-only diff, actually verified:** independently confirm (git history, not just the diff-stat command's exit) that no `schemas/*.schema.json` and no non-test `src/**` file differs by one byte.
5. **`src/testing.ts` scope-creep hunt:** confirm no commit touches any of the five `src/testing.ts` files, and the README's SCAF-P1 pointer is quoted accurately, not softened.
6. **Shipped-package precondition honored:** confirm the parcel was dispatched only under a charter-ratified exception to touch the shipped `schema-scaffold` package (or a loop-stop ruling), per the dispatch precondition.

## Epic/Story/Task Projection (proposal only - Jira registration is W1-P4, not this session)

- **Epic:** Foreman Line - Foundation Hygiene
  - **Story:** SCAF-P2 - Shared test-scaffold extraction
    - **Task:** Add `schema-scaffold/src/test-scaffold.ts` (three parameterized helpers) + its unit tests, including the negative no-drift case (AC4, AC7)
    - **Task:** Migrate `contracts`, `routing-policy`, `receipts`, `spec-linter`, `skill-injection`, `permission-profiles` tests onto the shared helper (AC5)
    - **Task:** Verification sweep - tests-only diff gates, purity/runtime-surface grep, bare-specifier grep, `biome check` across all seven packages (AC2, AC3, AC6, AC8, AC9)
    - **Task:** `schema-scaffold/README.md` update (AC11)
