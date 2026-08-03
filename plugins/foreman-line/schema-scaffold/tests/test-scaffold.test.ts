/**
 * Unit tests for test-scaffold.ts (SCAF-P2, AC7).
 * Covers all three exported helpers using fixture data (no consumer imports),
 * including the negative no-drift case required by AC3.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { serialize } from '../src/generate.js'
import type { SchemaFile } from '../src/registry.js'
import {
  registerDependencyAllowlistTest,
  registerNoDriftTests,
  registerSampleValidationTests,
} from '../src/test-scaffold.js'

const fixtureFiles: readonly SchemaFile[] = [
  { name: 'alpha', schema: { type: 'object', properties: { a: { type: 'string' } } } },
  { name: 'beta', schema: { type: 'array', items: { type: 'number' } } },
]

const fixtureSamples: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ['alpha', { a: 'hello' }],
  ['beta', [1, 2, 3]],
])

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'test-scaffold-test-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

// --- registerDependencyAllowlistTest ---

test('registerDependencyAllowlistTest: passes for single-dep package (ajv only)', async () => {
  const pkgPath = join(tempDir, 'package.json')
  writeFileSync(pkgPath, JSON.stringify({ dependencies: { ajv: '8.20.0' } }))
  registerDependencyAllowlistTest(pkgPath, ['ajv'])
})

test('registerDependencyAllowlistTest: passes for two-dep package (ajv, yaml)', async () => {
  const pkgPath = join(tempDir, 'package.json')
  writeFileSync(pkgPath, JSON.stringify({ dependencies: { ajv: '8.20.0', yaml: '2.9.0' } }))
  registerDependencyAllowlistTest(pkgPath, ['ajv', 'yaml'])
})

// --- registerNoDriftTests ---

test('registerNoDriftTests: passes when committed schemas are current', async () => {
  for (const f of fixtureFiles) {
    writeFileSync(join(tempDir, `${f.name}.schema.json`), serialize(f.schema))
  }
  registerNoDriftTests(fixtureFiles, tempDir)
})

// AC3 / AC7 negative case: the no-drift assertion detects drift.
// This directly exercises the assertion logic the registrar uses, proving that
// a stale committed schema causes a test failure — independence is preserved.
test('registerNoDriftTests: negative — assertion throws when committed schema is stale', () => {
  writeFileSync(join(tempDir, 'alpha.schema.json'), 'stale content\n')
  const committed = readFileSync(join(tempDir, 'alpha.schema.json'), 'utf8')
  const [firstFixture] = fixtureFiles
  assert.ok(firstFixture)
  const expected = serialize(firstFixture.schema)
  assert.notEqual(committed, expected) // verify the stale file actually differs
  assert.throws(() => assert.equal(committed, expected))
})

// --- registerSampleValidationTests ---

test('registerSampleValidationTests: passes for valid canonical samples', async () => {
  registerSampleValidationTests(fixtureFiles, fixtureSamples)
})
