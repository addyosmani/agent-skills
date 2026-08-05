/**
 * AC5: chain-level semantic invariants via `validateChain`, each with a
 * passing and a rejecting fixture. AC6: `isSealed`.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { ReceiptDocument } from '../src/types.js'
import { isSealed, validateChain } from '../src/validator.js'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function loadChain(dirName: string): ReceiptDocument[] {
  const dir = join(fixturesDir, dirName)
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as ReceiptDocument)
}

test('accepts the valid sealed chain fixture', () => {
  const result = validateChain(loadChain('chain-sealed'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('accepts the valid unsealed chain fixture', () => {
  const result = validateChain(loadChain('chain-unsealed'))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

// AC5a: sequence values are exactly 0..N-1, contiguous, no gaps or duplicates.
test('AC5a: rejects a chain with a sequence gap', () => {
  const result = validateChain(loadChain('chain-reject-sequence-gap'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('sequence values must be exactly')))
})

// AC5b: receipts[i].prevHash === receipts[i-1].hash.
test('AC5b: rejects a chain with a prevHash pointer mismatch', () => {
  const result = validateChain(loadChain('chain-reject-prevhash-mismatch'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('does not match')))
})

// AC5c: every receipt shares an identical workflowId and correlationId.
test('AC5c: rejects a chain with a correlation mismatch', () => {
  const result = validateChain(loadChain('chain-reject-correlation-mismatch'))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('diverges')))
})

// AC5d (rework amendment): validateChain never throws on malformed members;
// they are excluded per-comparison and reported via their schema violations.
test('AC5d: a scalar-JSON member does not throw — reported via schema violations, no spurious chain violations', () => {
  const result = validateChain(loadChain('chain-reject-scalar-member'))
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) => e.includes('receipts[2]') && e.includes('must be object')),
    JSON.stringify(result.errors),
  )
  // The valid members must not be blamed: no contiguity/prevHash/correlation noise.
  assert.ok(!result.errors.some((e) => e.includes('sequence values must be exactly')))
  assert.ok(!result.errors.some((e) => e.includes('does not match')))
  assert.ok(!result.errors.some((e) => e.includes('diverges')))
})

test('AC5d: a null-correlation member does not throw — reported via schema violations', () => {
  const result = validateChain(loadChain('chain-reject-null-correlation'))
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) => e.includes('/correlation') && e.includes('must be object')),
    JSON.stringify(result.errors),
  )
  // It still participates in the comparisons its present fields support.
  assert.ok(!result.errors.some((e) => e.includes('diverges')))
})

// AC5d (rework amendment): the library verdict for an empty chain is invalid,
// matching the ratified CLI semantics (the CLI's exit-2 usage error pre-empts
// this path for directory input; this protects direct consumers like W3).
test('AC5d: validateChain([]) is invalid — chain contains no receipts', () => {
  const result = validateChain([])
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('chain contains no receipts')))
})

// AC6: isSealed
test('AC6: isSealed is true when the highest-sequence receipt is stage F', () => {
  assert.equal(isSealed(loadChain('chain-sealed')), true)
})

test('AC6: isSealed is false when the highest-sequence receipt is not stage F', () => {
  assert.equal(isSealed(loadChain('chain-unsealed')), false)
})

// Step 0 ratification: single-file directory validates as a trivial chain.
test('a single-file chain is valid iff the lone receipt is a genesis', () => {
  const validGenesis = validateChain(loadChain('chain-single-genesis'))
  assert.equal(validGenesis.valid, true, JSON.stringify(validGenesis.errors))

  const invalidNonGenesis = validateChain(loadChain('chain-single-nongenesis'))
  assert.equal(invalidNonGenesis.valid, false)
})
