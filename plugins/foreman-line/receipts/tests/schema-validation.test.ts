/**
 * AC3: strict schema validation (`additionalProperties: false`) rejects each
 * of the documented structural violations.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateReceiptDocument } from '../src/validator.js'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function loadFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesDir, name), 'utf8'))
}

function assertRejected(name: string): void {
  const result = validateReceiptDocument(loadFixture(name))
  assert.equal(result.valid, false, `expected '${name}' to be rejected`)
  assert.ok(result.errors.length > 0)
}

test('rejects a missing required field', () => {
  assertRejected('reject-missing-field.json')
})

test('rejects kind outside {stage, claim}', () => {
  assertRejected('reject-kind-invalid.json')
})

test('rejects stage outside the six StageId values', () => {
  assertRejected('reject-stage-invalid.json')
})

test('rejects a negative sequence', () => {
  assertRejected('reject-sequence-negative.json')
})

test('rejects a non-integer sequence', () => {
  assertRejected('reject-sequence-noninteger.json')
})

test('rejects prevHash not matching the 64-char hex pattern', () => {
  assertRejected('reject-prevhash-badpattern.json')
})

test('rejects hash not matching the 64-char hex pattern', () => {
  assertRejected('reject-hash-badpattern.json')
})

test('rejects timestamp not matching ISO_UTC_PATTERN', () => {
  assertRejected('reject-timestamp-badpattern.json')
})

test('rejects an unknown top-level field', () => {
  assertRejected('reject-unknown-field.json')
})

// Rework amendment (AC3): the imported correlationContextSchema's
// additionalProperties: false stays load-bearing in this package's
// composition — a strictness regression in the imported schema fails here.
test('rejects an unknown field nested inside correlation', () => {
  const result = validateReceiptDocument(loadFixture('reject-correlation-unknown-field.json'))
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(
      (e) => e.includes('/correlation') && e.includes('must NOT have additional properties'),
    ),
    JSON.stringify(result.errors),
  )
})

test('accepts the canonical valid genesis fixture', () => {
  const result = validateReceiptDocument(loadFixture('hash-vector-genesis.json'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})
