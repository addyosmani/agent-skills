/**
 * AC4: single-document semantic invariants, each with a passing and a
 * rejecting fixture.
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

// AC4a: claimRef is null iff kind === 'stage'.
test('AC4a: accepts kind:stage with null claimRef', () => {
  const result = validateReceiptDocument(loadFixture('pass-claimref-stage-null.json'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('AC4a: rejects kind:stage with non-null claimRef', () => {
  const result = validateReceiptDocument(loadFixture('reject-claimref-stage-nonnull.json'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('claimRef')))
})

test('AC4a: accepts kind:claim with non-null claimRef', () => {
  const result = validateReceiptDocument(loadFixture('pass-claimref-claim-nonnull.json'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('AC4a: rejects kind:claim with null claimRef', () => {
  const result = validateReceiptDocument(loadFixture('reject-claimref-claim-null.json'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('claimRef')))
})

// AC4b: prevHash === null iff sequence === 0.
test('AC4b: accepts a genesis with null prevHash', () => {
  const result = validateReceiptDocument(loadFixture('pass-genesis-null-prevhash.json'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('AC4b: rejects a genesis with non-null prevHash', () => {
  const result = validateReceiptDocument(loadFixture('reject-genesis-nonnull-prevhash.json'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('prevHash')))
})

test('AC4b: accepts a non-genesis with non-null prevHash', () => {
  const result = validateReceiptDocument(loadFixture('pass-nongenesis-nonnull-prevhash.json'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('AC4b: rejects a non-genesis with null prevHash', () => {
  const result = validateReceiptDocument(loadFixture('reject-nongenesis-null-prevhash.json'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('prevHash')))
})
