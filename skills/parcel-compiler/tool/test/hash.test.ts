import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { canonicalize } from '../src/receipts/canonical.js'
import { sha256Hex } from '../src/util/hash.js'

// Known SHA-256 of canonicalize({}) = SHA-256 of UTF-8 bytes of "{}"
const KNOWN_EMPTY_OBJECT_HEX = '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a'

// Known SHA-256 of canonicalize({a:1}) = SHA-256 of UTF-8 bytes of '{"a":1}'
const KNOWN_A1_HEX = '015abd7f5cc57a2dd94b7590f04ad8084273905ee33ec5cebeae62276a97f862'

describe('sha256Hex – stable digests (AC10)', () => {
  test('empty object produces known digest', () => {
    const bytes = canonicalize({})
    assert.equal(sha256Hex(bytes), KNOWN_EMPTY_OBJECT_HEX)
  })

  test('{a:1} produces known digest', () => {
    const bytes = canonicalize({ a: 1 })
    assert.equal(sha256Hex(bytes), KNOWN_A1_HEX)
  })

  test('output is 64 lowercase hex characters', () => {
    const digest = sha256Hex(canonicalize({ x: 'test' }))
    assert.match(digest, /^[0-9a-f]{64}$/)
  })

  test('determinism – independently canonicalized equal values hash the same', () => {
    const first = canonicalize({ stable: true })
    const second = canonicalize({ stable: true })
    assert.equal(sha256Hex(first), sha256Hex(second))
  })

  test('different inputs produce different digests', () => {
    const d1 = sha256Hex(canonicalize({ v: 1 }))
    const d2 = sha256Hex(canonicalize({ v: 2 }))
    assert.notEqual(d1, d2)
  })
})
