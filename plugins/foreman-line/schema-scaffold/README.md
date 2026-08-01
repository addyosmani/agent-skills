# @foreman-line/schema-scaffold

Shared schema-serialization machinery extracted from six independently-authored
copies (SCAF-P1). Each of `contracts`, `routing-policy`, `receipts`,
`spec-linter`, `skill-injection`, and `permission-profiles` previously carried
its own `generate.ts` (writing `allSchemaFiles` to `schemas/*.schema.json`) and
its own `registry.ts` `SchemaFile`/`Contract` interface declaration - identical
shape everywhere, only the registry *data* differed. This package is that
duplicated machinery, extracted once.

## What it exports (`src/index.ts`)

- **`SchemaFile`** - `{ readonly name: string; readonly schema: SchemaObject }`.
  Replaces each consumer's local `export interface SchemaFile {...}`
  declaration in `src/registry.ts` (`contracts` additionally converged its
  interface usage from `Contract` to `SchemaFile`, a naming-only change).
- **`serialize(schema: object): string`** - unchanged from every consumer's
  prior implementation: `` `${JSON.stringify(schema, null, 2)}\n` ``.
- **`generate(files: readonly SchemaFile[], outDir: string): void`** - the
  parameterized form of every consumer's prior `generate()`. Creates `outDir`
  (`mkdirSync(outDir, { recursive: true })`), writes
  `${outDir}/${name}.schema.json` for every file via `serialize`, and logs
  `` `generated ${files.length} schema files in ${outDir}` ``.

`outDir` is an explicit parameter rather than derived from this module's own
location via `import.meta.url`. The old per-package form assumed its own file
lived inside the package whose schemas it generated - true when `generate.ts`
and `schemas/` were siblings in the same package, false once the function
lives here, in a different package than every caller. Each consumer's thin
`src/generate.ts` wrapper computes its own `schemasDir` from its own
`import.meta.url` and passes it in explicitly.

## What stays per-package (not extracted)

`allSchemaFiles` (and any package-specific composition, e.g. `contracts`'s
`standaloneContracts`/`composedBoundaries`) is inherently package-specific
registry *data*, not scaffolding, and is not part of this package. Each
consumer keeps a local `src/registry.ts` holding its own `allSchemaFiles`
(typed against the `SchemaFile` imported from here) and a local
`src/generate.ts` thin wrapper that imports `generate`/`serialize` from here
and supplies its own `allSchemaFiles` and `schemasDir`.

## Import mechanism

Filesystem-relative ESM specifier only, from each consumer's `src/`:

```ts
import { generate } from '../../schema-scaffold/src/generate.js'
import type { SchemaFile } from '../../schema-scaffold/src/registry.js'
```

No npm workspace linking exists across `plugins/foreman-line/*` (the root
`package.json` `workspaces` array covers only `apps/*`/`packages/*`). The bare
specifier `@foreman-line/schema-scaffold` **does not resolve** here and MUST
NOT be used anywhere in this package or its consumers. Adding workspace
linking to the root `package.json` is out of scope for this extraction and is
a separate decision with a blast radius spanning every plugin - it is not a
prerequisite for this package to work.

## Test-scaffold helpers (`src/test-scaffold.ts`)

Extracted from six consumer packages at SCAF-P2. Pure parameterized machinery:
imports nothing from any consumer and bakes in zero consumer-specific data.

### Import rule

Test files only, via filesystem-relative ESM specifier:

```ts
import { registerNoDriftTests } from '../../schema-scaffold/src/test-scaffold.js'
```

`test-scaffold.ts` is **NOT re-exported** from `src/index.ts`. It must not be
imported from any `src/` runtime module. `schema-scaffold`'s `dependencies`
remain exactly `{ajv}` — `node:test` is a built-in and adds no package.json
entry.

### Three parameterized helpers

**`registerDependencyAllowlistTest(packageJsonPath, expected)`**
Registers one `node:test` asserting the package at `packageJsonPath` has
exactly the `expected` runtime-dependency keys (sorted). Consolidates the
near-identical `dependency-allowlist.test.ts` files that differ only in the
expected key set (`['ajv']` for receipts/schema-scaffold; `['ajv', 'yaml']` for
routing-policy, spec-linter, skill-injection, permission-profiles).

**`registerNoDriftTests(allSchemaFiles, schemasDir)`**
Registers one `node:test` per schema file asserting that the committed
`${schemasDir}/${name}.schema.json` is byte-identical to `serialize(schema)`.
Each consumer passes its own `allSchemaFiles` and `schemasDir` — the data under
test stays per-package even though the assertion code is shared, so the drift
check cannot collapse into self-attestation.

**`registerSampleValidationTests(allSchemaFiles, samplesByName)`**
Registers one `node:test` per schema file validating the canonical sample from
`samplesByName` against the compiled AJV schema. Used by routing-policy,
skill-injection, and permission-profiles (the three packages that carry a
`samplesByName: ReadonlyMap<string, unknown>` map in their parity tests).
Packages with a different sample-validation pattern (contracts, receipts,
spec-linter) keep their existing tests unchanged.

### `testing.ts` scope (not extracted, and not future work either)

`testing.ts` in the five consumers that have one (contracts, routing-policy,
skill-injection, permission-profiles, spec-linter) was considered for
extraction and ruled out at SCAF-P1 shaping: only `contracts/src/testing.ts`
has shared-shaped helper machinery (`ContractFixture`, `samplesByName`,
`allContractFixtures`); the other four are flat, package-specific
`sample<Type>` constant exports with nothing in common beyond a doc-comment
convention. There is no executable duplication there to extract - see
`docs/specs/done/SCAF-P1-shared-schema-scaffold-extraction.md`, Constraints
and Out of Scope, for the full ruling. Do not re-propose extracting it without
re-reading why it was ruled out here.
