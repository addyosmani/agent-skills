/**
 * AC5: unit-tests `serialize`/`generate(files, outDir)` directly, with no
 * consumer-specific data - a small fixture SchemaFile[] and a temp outDir.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, test } from 'node:test'
import { generate, serialize } from '../src/generate.js'
import type { SchemaFile } from '../src/registry.js'

const fixtureFiles: readonly SchemaFile[] = [
  { name: 'alpha', schema: { type: 'object', properties: { a: { type: 'string' } } } },
  { name: 'beta', schema: { type: 'array', items: { type: 'number' } } },
]

let tempDir: string

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'schema-scaffold-test-'))
})

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

test('serialize renders pretty-printed JSON with a trailing newline', () => {
  const result = serialize({ type: 'string' })
  assert.equal(result, `${JSON.stringify({ type: 'string' }, null, 2)}\n`)
  assert.ok(result.endsWith('\n'))
})

test('generate writes one <name>.schema.json per fixture entry, byte-identical to serialize(schema)', () => {
  const outDir = join(tempDir, 'schemas')
  generate(fixtureFiles, outDir)

  const written = readdirSync(outDir).sort()
  assert.deepEqual(written, ['alpha.schema.json', 'beta.schema.json'])

  for (const file of fixtureFiles) {
    const committed = readFileSync(join(outDir, `${file.name}.schema.json`), 'utf8')
    assert.equal(committed, serialize(file.schema))
  }
})

test('generate creates outDir if absent (mkdirSync recursive behavior)', () => {
  const outDir = join(tempDir, 'nested', 'does', 'not', 'exist', 'yet')
  generate(fixtureFiles, outDir)
  assert.deepEqual(readdirSync(outDir).sort(), ['alpha.schema.json', 'beta.schema.json'])
})
