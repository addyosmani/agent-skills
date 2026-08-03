/**
 * AC8: a worked hash-domain test vector, computed independently against the
 * documented canonicalization + sha256Hex algorithm (via the test-only
 * helper in `tests/support/canonical.ts`, never shipped as a runtime
 * dependency of the validator).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { canonicalize, type JsonObject, sha256Hex } from './support/canonical.js'

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'hash-vector-genesis.json',
)

test('AC8: recomputing canonical bytes reproduces the documented hash', () => {
  const doc = JSON.parse(readFileSync(fixturePath, 'utf8')) as JsonObject & { hash: string }
  const { hash, ...rest } = doc
  const recomputed = sha256Hex(canonicalize(rest))
  assert.equal(recomputed, hash)
  assert.match(hash, /^[0-9a-f]{64}$/)
})
