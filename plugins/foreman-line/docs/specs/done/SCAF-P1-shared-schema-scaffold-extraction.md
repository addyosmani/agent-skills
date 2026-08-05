---
ticket: KONE-TBD            # register via jira-workflow at Stage B; replace before dispatch
title: Foreman Line - shared schema-scaffold extraction (SCAF-P1)
status: done
owner: clinton.morgan
created: 2026-07-21
updated: 2026-07-21
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/schema-scaffold/**, plugins/foreman-line/contracts/src/generate.ts, plugins/foreman-line/contracts/src/registry.ts, plugins/foreman-line/routing-policy/src/generate.ts, plugins/foreman-line/routing-policy/src/registry.ts, plugins/foreman-line/receipts/src/generate.ts, plugins/foreman-line/receipts/src/registry.ts, plugins/foreman-line/spec-linter/src/generate.ts, plugins/foreman-line/spec-linter/src/registry.ts, plugins/foreman-line/skill-injection/src/generate.ts, plugins/foreman-line/skill-injection/src/registry.ts, plugins/foreman-line/permission-profiles/src/generate.ts, plugins/foreman-line/permission-profiles/src/registry.ts]
routing_class: standard-feature
permission_profile: builder-deps   # coordinator lint fix: null fails the linter enum; builder-deps = builder-standard + registry egress, needed to npm-install the new package's ajv dep
---

# SCAF-P1 - Shared Schema-Scaffold Extraction

## Intent

Six packages under `plugins/foreman-line/` (contracts, routing-policy, receipts, spec-linter, skill-injection, permission-profiles) each carry an independently-authored copy of the same schema-serialization machinery: a `generate.ts` that writes `allSchemaFiles` to `schemas/*.schema.json`, and a `registry.ts` whose `SchemaFile`/`Contract` interface shape is identical everywhere even though the registry *data* is not. This is deliberately scheduled refactor work in a zero-conflict window (the pipeline is empty, W1 has not started) rather than a drive-by cleanup, because D9 says the Line is built via PDD and debt gets a parcel, not ad-hoc edits mixed into unrelated work. This parcel extracts the genuinely-duplicated machinery into a new sibling package, `plugins/foreman-line/schema-scaffold/`, and migrates all six consumers to import from it, with zero change to any committed `schemas/*.schema.json` file and zero change to any package's public type surface.

## Constraints

- **New package:** `plugins/foreman-line/schema-scaffold/` - TypeScript, ESM-only, `engines.node >= 22` (matching the `contracts`/`routing-policy`/`receipts` precedent), `npx tsc --noEmit` clean, `biome check .` clean, tests via `node --test` (`npx tsx --test`). Package name `@foreman-line/schema-scaffold`, `"private": true`, matching the sibling packages' `package.json` shape.
- **Exactly what schema-scaffold exports** (from `src/index.ts`, re-exporting `src/registry.ts` and `src/generate.ts`):
  - `SchemaFile` interface: `{ readonly name: string; readonly schema: SchemaObject }` (the shape every consumer's local interface already has, byte-for-byte, regardless of which of the two names - `SchemaFile` or `Contract` - a given consumer currently uses).
  - `serialize(schema: object): string` - unchanged from every consumer's current implementation (`` `${JSON.stringify(schema, null, 2)}\n` ``).
  - `generate(files: readonly SchemaFile[], outDir: string): void` - the parameterized form of the current `generate()`: creates `outDir` (`mkdirSync(outDir, { recursive: true })`), writes `${outDir}/${name}.schema.json` for every file via `serialize`, logs `` `generated ${files.length} schema files in ${outDir}` ``. Taking `outDir` as an explicit parameter (not deriving it from `import.meta.url`) is the required change versus today's per-package copies - the old form assumed its *own* file location was inside the package whose schemas it generated, which stops being true once the function lives in a different package than every caller.
- **What stays per-package (not extracted):**
  - `allSchemaFiles` (and any package-specific composition like `contracts`'s `standaloneContracts`/`composedBoundaries`, or `spec-linter`'s equivalent) - inherently package-specific data, not scaffolding.
  - Each consumer keeps a local `src/generate.ts` as a thin wrapper (see below) and a local `src/registry.ts` holding its own `allSchemaFiles` (typed against the imported `SchemaFile`).
  - **`testing.ts` in all five packages that have one (contracts, routing-policy, skill-injection, permission-profiles, spec-linter) is entirely out of scope - see Out of Scope. Re-verified at shaping, correcting the dispatch-trigger note: only `contracts/src/testing.ts` contains the `ContractFixture`/`samplesByName`/`allContractFixtures` helper machinery. The other four `testing.ts` files are flat `sample<Type>` constant exports with no shared executable logic - there is no "~36-line common testing core" duplicated across packages to extract. That phrase in the trigger note does not hold up against the files on disk and is superseded by this spec.**
- **Per-consumer migration shape (identical across all six, byte-for-byte after migration except for each package's own `allSchemaFiles` import target):**
  - `src/registry.ts`: replace the local `export interface SchemaFile {...}` (contracts: `export interface Contract {...}`) declaration with an import-plus-re-export pair: `import type { SchemaFile } from '../../schema-scaffold/src/registry.js'` followed by `export type { SchemaFile }` *(amended at completion review, coordinator-ratified: the originally-specified single-statement `export type ... from` form re-exports without creating a local binding, so it cannot compile in any consumer that also uses the type in its own annotations - which all six do; the two-statement form is the correct realization of the same intent, with biome's import-organizer ordering applied)* - **in all six consumers uniformly, not conditionally** (coordinator lint fix: a bare `import type` breaks at least two known consumers of the name - `contracts/src/index.ts`'s `export * from './registry.js'` public surface, and `spec-linter/tests/parity.test.ts:14`'s `import type { SchemaFile } from '../src/registry.js'` - and uniformity keeps the six registries' scaffold portion identical). `allSchemaFiles` (and any composed structures) keep their current shape, now typed against the imported `SchemaFile`.
  - **Naming convergence (locked at shaping, zero test impact):** `contracts/src/registry.ts`'s local interface is currently named `Contract`, not `SchemaFile` - the only one of the six that differs. No test in `contracts/tests/` imports `Contract` by name (verified: `grep -rn 'Contract\b' plugins/foreman-line/contracts/tests` returns nothing). `contracts` therefore renames its usage to `SchemaFile` during migration, converging all six on one interface name. This is a naming decision only - the exported member `standaloneContracts`/`composedBoundaries`/`allSchemaFiles` names are unaffected.
  - `src/generate.ts`: replaced by a thin wrapper, identical in every consumer:
    ```ts
    import { dirname, join } from 'node:path'
    import { fileURLToPath } from 'node:url'
    import { generate } from '../../schema-scaffold/src/generate.js'
    import { allSchemaFiles } from './registry.js'

    export { serialize } from '../../schema-scaffold/src/generate.js'

    const here = dirname(fileURLToPath(import.meta.url))
    const schemasDir = join(here, '..', 'schemas')

    if (process.argv[1] === fileURLToPath(import.meta.url)) {
      generate(allSchemaFiles, schemasDir)
    }
    ```
    This re-exports `serialize` under the same local path every existing `tests/parity.test.ts` already imports it from (`../src/generate.js`) - **zero test file requires an edit**, verified against all six `tests/parity.test.ts` files at shaping (each imports only `serialize` from `../src/generate.js` and `allSchemaFiles`/the interface type from `../src/registry.js` - neither import needs to change).
  - **spec-linter's one-word comment divergence is reconciled, not preserved:** the pre-migration difference ("runtime agents" vs "runtime agents and CI consume") lived in a docstring on the old per-package `generate.ts`. The thin wrapper shown above carries no such docstring (it is 9 lines of pure delegation); the substantive doc comment moves into `schema-scaffold/src/generate.ts` once, using spec-linter's wording ("...the parity test asserts they are byte-identical to what this script produces...runtime agents and CI consume the committed JSON files...") as more accurate than the other five's. After migration, all six consumers' `generate.ts` files are byte-identical to each other again.
- **Import mechanism:** filesystem-relative ESM specifier only - `'../../schema-scaffold/src/generate.js'` / `'../../schema-scaffold/src/registry.js'` from each consumer's `src/`, per the W0-P4-ratified precedent (`docs/specs/done/W0-P4-receipt-chain-schema-validator.md`, Constraints). Bare specifiers (`@foreman-line/schema-scaffold`) MUST NOT be used - no npm workspace linking exists across `plugins/foreman-line/*` today (root `package.json` `workspaces` covers only `apps/*`/`packages/*`). **Adding workspace linking to the root `package.json` is out of scope and a Stop-and-Report** if a builder concludes it's needed - it is a separate decision with a blast radius spanning every plugin, not scoped to this parcel's six consumers.
- **Frozen-contracts ruling (ratified at shaping, binding on this parcel):** `plugins/foreman-line/contracts/` is frozen per W0-P1, but that freeze covers its **exported type/schema surface** - the types re-exported from `src/index.ts` and the committed `schemas/*.schema.json` files. `registry.ts` and `generate.ts` are internal build scaffolding, not that frozen surface, and are in scope for migration exactly like the other five consumers. The freeze is honored by construction here: this parcel's entire safety net (AC1-AC3) is that every one of `contracts`'s eleven-plus committed `schemas/*.schema.json` files, and every type contracts exports from `src/index.ts`, is byte-identical before and after. Nothing about `ReceiptRef`, `HarnessClaimResult`, `AdversarialFinding`, or any stage contract type changes.
- **Dependency allowlist:** `schema-scaffold`'s own `package.json` `dependencies` MUST equal exactly `{ajv}` (for the `SchemaObject` type only - `generate.ts`/`registry.ts` use no other runtime dependency), machine-enforced by a test reading `package.json`, per the W0-P3/W0-P4 pattern. No consumer's `package.json` changes - the relative-import mechanism requires no new `dependencies` entry (same as the W0-P4 precedent for its `contracts` import), so every consumer's existing dependency-allowlist test (where one exists) continues to pass unchanged. This is the concrete form of "the shared package must not smuggle a runtime dependency into anyone."
- **Standing repo rule:** ajv's `JSONSchemaType` is banned as a schema authority anywhere in this repo; `SchemaFile.schema` is typed as ajv's `SchemaObject`, matching every consumer today.
- **Branch/worktree (defects_lessons #9):** builder works on a named feature branch `feat/foreman-line-scaf-p1`, isolated in its own worktree - never directly in the main working tree. This line goes into the dispatch kickstarter verbatim.
- **Deterministic-pass environment (defects_lessons #10):** verification runs in PowerShell only. `node -v` is checked first, before any other command; repo root `package.json` `engines.node` requires `>=24.11.1`, and `schema-scaffold`'s own `engines.node` (`>=22`) must be satisfied by whatever the coordinator's machine reports. Per lesson #11, any exit-code check on a CLI invocation captures output in full before reading `$LASTEXITCODE` - never truncate a pipeline whose exit code is being trusted.
- Integration is PR-only by standing policy; per SPEC-CONVENTION §3 this spec moves to `done/` in the same PR (or an immediate follow-up) as a merge-checklist item.

## Acceptance Criteria

1. `npx tsc --noEmit` passes in `schema-scaffold` and in all six migrated consumer packages.
2. **Byte-identical schemas, the heart of this spec:** for every one of the six consumer packages, every committed `schemas/*.schema.json` file is byte-identical before and after migration. Proven per-package (all six, not sampled) by each package's own existing parity test continuing to pass unmodified (it re-derives the committed file from `serialize(contract.schema)` and asserts equality) - a diff of `git diff --stat -- '**/schemas/*.schema.json'` across the whole migration commit range MUST show zero changes as an additional, independent proof beyond the tests.
3. Every existing test in all six consumer packages passes unchanged (no test file's content or import path is edited) - verified per package: `grep` each `tests/*.test.ts` for `from '../src/generate.js'` / `from '../src/registry.js'` importing only `serialize`, `allSchemaFiles`, `composedBoundaries`, and the interface type, and confirm none of those specifiers or imported names changed.
4. `schema-scaffold` exports exactly `SchemaFile`, `serialize`, `generate` from `src/index.ts` (or from `src/registry.js`/`src/generate.js` directly, consumed via the relative-import mechanism - no bare-specifier resolution is exercised by any test).
5. `generate(files, outDir)` is unit-tested directly in `schema-scaffold`'s own test suite: given a small fixture `SchemaFile[]` and a temp `outDir`, it writes one `<name>.schema.json` per fixture entry, byte-identical to `serialize(schema)`, and creates `outDir` if absent (`mkdirSync` recursive behavior covered).
6. Each of the six consumers' `src/generate.ts` is reduced to the thin-wrapper shape (Constraints), re-exports `serialize` from `schema-scaffold`, and calls the shared `generate(allSchemaFiles, schemasDir)` only under the direct-invoke guard (`process.argv[1] === fileURLToPath(import.meta.url)`) - never on import.
7. Each of the six consumers' `src/registry.ts` imports `SchemaFile` from `schema-scaffold` via the relative-path specifier (no local `SchemaFile`/`Contract` interface declaration remains in any consumer); `contracts` additionally converges its interface usage from `Contract` to `SchemaFile` with zero test impact (AC3 covers this - no test imports `Contract` by name today).
8. After migration, all six consumers' `src/generate.ts` files are byte-identical to each other (the spec-linter comment divergence no longer has anywhere to live, since the substantive doc comment moved into `schema-scaffold/src/generate.ts`).
9. `schema-scaffold`'s `package.json` `dependencies` keys equal exactly `{ajv}`, enforced by a test reading `package.json`. No consumer's `package.json` `dependencies`/`devDependencies` changes; each consumer's pre-existing dependency-allowlist test (where present) passes unmodified.
10. No bare specifier (`@foreman-line/schema-scaffold` or similar) appears anywhere in any of the six consumers or in `schema-scaffold` itself - grep-verified. Root `package.json` is unmodified (`git diff --stat -- package.json` shows no change).
11. `biome check .` passes with zero diagnostics in `schema-scaffold` and in all six migrated consumers.
12. `schema-scaffold/README.md` documents: what it exports and why (the exact duplicated-machinery boundary, citing which files in which packages it replaces), the parameterized `generate(files, outDir)` signature and why `outDir` must be passed explicitly rather than derived from the shared module's own location, the relative-import mechanism and the explicit ban on bare specifiers, and a one-line pointer to this spec's re-verified correction on `testing.ts` scope (so a future reader does not re-propose extracting it without re-reading why it was ruled out here).
13. All tests pass via `npx tsx --test` in `schema-scaffold` and via each consumer's existing `npm test` in all six consumers.

## Out of Scope

- `testing.ts` in any of the five packages that have one (contracts, routing-policy, skill-injection, permission-profiles, spec-linter). Re-verified at shaping: only `contracts/src/testing.ts` has shared-shaped helper machinery (`ContractFixture`, `samplesByName`, `allContractFixtures`); the other four are flat, package-specific sample-value exports with nothing in common beyond a doc-comment convention. There is no executable duplication here to extract, and a documentation-only comment-standardization pass across five shipped packages was explicitly considered and rejected at shaping as cosmetic scope-widening with no behavioral value.
- `receipts` adopting the `testing.ts` pattern it has never had. Moot given the ruling above - adoption of a testing helper it never had is not extraction, and there is no shared testing core left to adopt after the ruling above.
- Any change to `plugins/foreman-line/contracts/`'s exported type/schema surface - `ReceiptRef`, `HarnessClaimResult`, `AdversarialFinding`, every stage-boundary type, and every committed `schemas/*.schema.json` byte. The frozen-contracts ruling above scopes this parcel to internal build scaffolding only; the exported surface does not change by one byte, proven by AC2.
- `skills/parcel-compiler/tool/` in any direction - it has its own canonical.ts/hash.ts; not scaffold, not touched, no dependency added in either direction.
- Adding npm workspace linking to the root `package.json`, or any other root `package.json` change. A Stop-and-Report if a builder concludes it's needed (see Constraints).
- All W1 parcels and anything downstream of them - this parcel enables future extraction hygiene, it does not start W1 work.
- CI workflow changes beyond keeping existing checks green - no new GitHub Actions step is added or wired for `schema-scaffold`; that is a future wave's concern (same deferral pattern as every prior W0 parcel).
- Jira registration - a proposal is included below; actual ticket creation is Stage B (W1), not this session.
- Any modification to a consumer's own package-specific registry data (`allSchemaFiles` contents, `standaloneContracts`, `composedBoundaries`, or equivalents) beyond retyping against the imported `SchemaFile`.

## Context & References

- `plugins/foreman-line/docs/FOREMAN-LINE-PLAN.md` - §3 D9 (the Line is built via PDD; debt gets a parcel), §8 (W0 exit: "downstream waves build against frozen interfaces" - this parcel runs in the resulting zero-conflict window, standalone, not itself a W0/W1 wave parcel).
- `docs/SPEC-CONVENTION.md` - schema this parcel is written under.
- `docs/specs/done/W0-P4-receipt-chain-schema-validator.md` - the ratified cross-package relative-import precedent (Constraints: "Cross-package import... Mechanism, exactly: a filesystem-relative ESM specifier") this parcel reuses verbatim for all six consumers; also the "no workspace linking exists, adding it is out of scope and a Stop-and-Report" language, reused near-verbatim above.
- `docs/specs/done/W0-P1-pipeline-stage-contracts.md`, `docs/specs/done/W0-P3-routing-policy-schema-validator.md` - the frozen-contract posture and the dependency-allowlist test pattern this parcel's AC9 mirrors.
- `docs/transcripts/defects_lessons.md` #9 (name the branch/worktree), #10 (PowerShell + `node -v` first), #11 (never trust `$LASTEXITCODE` after a truncating pipeline), #15 (verify claims against the actual source, not against a prior note's restatement of it - the governing lesson behind this spec's `testing.ts` correction).
- `plugins/foreman-line/contracts/src/{generate.ts,registry.ts,index.ts}`, `plugins/foreman-line/{routing-policy,receipts,spec-linter,skill-injection,permission-profiles}/src/{generate.ts,registry.ts}` and each package's `tests/parity.test.ts` - read in full at shaping; hashes and diffs re-verified against disk, not assumed from the dispatch trigger note.

## Verification Plan

Deterministic: `tsc --noEmit` in all seven packages (AC1); each of the six consumers' existing parity test suite re-run unmodified as the byte-identical proof (AC2) plus the independent `git diff --stat` check over `**/schemas/*.schema.json`; a grep sweep confirming zero test files changed imports (AC3) and zero bare-specifier usage anywhere (AC10); `schema-scaffold`'s own new unit tests for `serialize`/`generate` (AC5); a byte-diff of all six migrated `generate.ts` files against each other (AC8); the dependency-allowlist test (AC9); `biome check .` across all seven packages (AC11); full `npx tsx --test` run per package (AC13). Deterministic pass runs in PowerShell on the coordinator's machine; `node -v` is the first command run (defects_lessons #10), and any CLI exit-code check captures output in full before reading `$LASTEXITCODE` (defects_lessons #11).

Adversarial review mandated focus questions:
1. **Byte-identical schemas, actually verified per package:** do not trust that "the parity tests pass" implies byte-identical files - independently re-derive at least one `schemas/*.schema.json` per consumer (all six) by hand from its typed source and diff against the committed file, the same way the coordinator re-verified this spec's own ground truth against disk rather than trusting the trigger note (defects_lessons #15).
2. **Circularity hunt:** confirm `schema-scaffold/src/{generate.ts,registry.ts}` imports nothing from any of the six consumers, and that no consumer's `allSchemaFiles`/registry data leaked into `schema-scaffold` (it must remain pure, parameterized machinery with zero consumer-specific data).
3. **Frozen-surface hunt (contracts):** confirm `contracts/src/index.ts`'s re-exported public surface is unchanged - every type name, every schema export - despite the internal `Contract`→`SchemaFile` rename; confirm no `schemas/*.schema.json` file under `contracts/` differs by one byte from its pre-migration committed version (git history comparison, not just the parity test result).
4. **Did the extraction widen any package's public surface?** For each of the six consumers, confirm `src/index.ts` (or equivalent public entry point) exports the same names it did before migration - no new re-export of `schema-scaffold` internals leaking through a consumer's public surface.
5. **Bare-specifier and workspace-config hunt:** grep the full diff for `@foreman-line/schema-scaffold` (should find zero matches outside comments/docs) and confirm root `package.json`'s `workspaces` array is byte-identical to its pre-parcel state.
6. **`testing.ts` scope-creep hunt:** confirm no commit in this parcel touches any of the five `testing.ts` files, and that the README's ruling on this (AC12) is quoted accurately, not softened into implying a future extraction is expected.

## Epic/Story/Task Projection (proposal only - Jira registration is W1, not this session)

- **Epic:** Foreman Line - Foundation Hygiene
  - **Story:** SCAF-P1 - Shared schema-scaffold extraction
    - **Task:** Scaffold `plugins/foreman-line/schema-scaffold/` package (package.json, tsconfig, biome config, `src/{registry,generate,index}.ts`, README skeleton)
    - **Task:** Implement + unit-test `serialize`/`generate(files, outDir)` in `schema-scaffold` (AC5)
    - **Task:** Migrate `contracts` (registry rename `Contract`→`SchemaFile`, thin-wrapper `generate.ts`) and prove byte-identical schemas
    - **Task:** Migrate `routing-policy`, `receipts`, `spec-linter`, `skill-injection`, `permission-profiles` (same thin-wrapper pattern each)
    - **Task:** Cross-consumer verification sweep - byte-diff all six `generate.ts` against each other, dependency-allowlist tests, bare-specifier grep, `biome check` across all seven packages
    - **Task:** `schema-scaffold/README.md` (AC12)
