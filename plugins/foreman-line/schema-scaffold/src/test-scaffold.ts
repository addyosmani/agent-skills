/**
 * Shared test-scaffold helpers extracted from six consumer packages (SCAF-P2).
 * Pure parameterized machinery: imports nothing from any consumer and bakes in
 * zero consumer-specific data. Import from tests/** via relative ESM specifier
 * only — NOT re-exported from index.ts and never imported from runtime code.
 *
 * Three exports:
 *   registerDependencyAllowlistTest — registers one node:test asserting the
 *     package at packageJsonPath has exactly the expected runtime-dep keys.
 *   registerNoDriftTests — registers one node:test per schema file asserting
 *     committed JSON === serialize(schema).
 *   registerSampleValidationTests — registers one node:test per schema file
 *     validating the samplesByName entry against the compiled AJV schema.
 *
 * @see plugins/foreman-line/schema-scaffold/README.md — test-scaffold section
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { Ajv, type SchemaObject } from 'ajv'
import { serialize } from './generate.js'
import type { SchemaFile } from './registry.js'

/**
 * Registers a node:test asserting the package at `packageJsonPath` has exactly
 * the `expected` runtime-dependency keys (sorted). Equivalent to the per-package
 * `dependency-allowlist.test.ts` pattern, parameterized so `receipts` (passing
 * `['ajv']`) and others (passing `['ajv', 'yaml']`) share one code path.
 */
export function registerDependencyAllowlistTest(
  packageJsonPath: string,
  expected: readonly string[],
): void {
  const sorted = [...expected].sort()
  test(`runtime dependencies are exactly {${sorted.join(', ')}}`, () => {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
    }
    const keys = Object.keys(pkg.dependencies ?? {}).sort()
    assert.deepEqual(keys, sorted)
  })
}

/**
 * Registers one node:test per schema file asserting that the committed
 * `${schemasDir}/${name}.schema.json` is byte-identical to `serialize(schema)`.
 * Independence is preserved: the data under test (`allSchemaFiles`, `schemasDir`)
 * stays per-package even though the assertion code is shared.
 */
export function registerNoDriftTests(
  allSchemaFiles: readonly SchemaFile[],
  schemasDir: string,
): void {
  for (const contract of allSchemaFiles) {
    test(`no drift: ${contract.name}.schema.json matches typed source`, () => {
      const committed = readFileSync(join(schemasDir, `${contract.name}.schema.json`), 'utf8')
      assert.equal(committed, serialize(contract.schema))
    })
  }
}

/**
 * Registers one node:test per schema file validating the canonical sample from
 * `samplesByName` against the compiled AJV schema. Each registered test fails
 * if: (a) no sample is registered for the schema name, or (b) the sample does
 * not validate against the schema.
 */
export function registerSampleValidationTests(
  allSchemaFiles: readonly SchemaFile[],
  samplesByName: ReadonlyMap<string, unknown>,
): void {
  const ajv = new Ajv({ allErrors: true })
  for (const contract of allSchemaFiles) {
    test(`canonical sample validates: ${contract.name}`, () => {
      const sample = samplesByName.get(contract.name)
      assert.notEqual(sample, undefined, `no canonical sample registered for '${contract.name}'`)
      const validate = ajv.compile(contract.schema as SchemaObject)
      assert.ok(validate(sample), JSON.stringify(validate.errors))
    })
  }
}
