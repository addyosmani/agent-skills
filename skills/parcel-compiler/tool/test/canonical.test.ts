import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { JsonValue } from '../src/receipts/canonical.js'
import { canonicalize } from '../src/receipts/canonical.js'

function str(v: JsonValue): string {
  return new TextDecoder().decode(canonicalize(v))
}

describe('canonicalize – RFC 8785 test vectors', () => {
  test('empty object', () => {
    assert.equal(str({}), '{}')
  })

  test('empty array', () => {
    assert.equal(str([]), '[]')
  })

  test('null value', () => {
    assert.equal(str(null), 'null')
  })

  test('boolean true', () => {
    assert.equal(str(true), 'true')
  })

  test('boolean false', () => {
    assert.equal(str(false), 'false')
  })

  test('integer number', () => {
    assert.equal(str(42), '42')
  })

  test('floating-point number', () => {
    assert.equal(str(1.5), '1.5')
  })

  test('key ordering – single level', () => {
    // RFC 8785: keys sorted by Unicode code unit value
    assert.equal(str({ b: 1, a: 2 }), '{"a":2,"b":1}')
  })

  test('key ordering – uppercase before lowercase (Unicode order)', () => {
    // 'A' (U+0041) < 'a' (U+0061) in code unit order
    assert.equal(str({ a: 1, A: 2 }), '{"A":2,"a":1}')
  })

  test('nested object key ordering', () => {
    assert.equal(str({ z: { b: 1, a: 2 }, a: 0 }), '{"a":0,"z":{"a":2,"b":1}}')
  })

  test('string with escaping – double quote', () => {
    assert.equal(str({ k: '"hi"' }), '{"k":"\\"hi\\""}')
  })

  test('string with escaping – backslash', () => {
    assert.equal(str({ k: 'a\\b' }), '{"k":"a\\\\b"}')
  })

  test('array of mixed values', () => {
    assert.equal(str([1, 'two', true, null]), '[1,"two",true,null]')
  })

  test('no whitespace in output', () => {
    const result = str({ a: 1, b: [2, 3] })
    assert.ok(!/\s/.test(result), 'canonical form must contain no whitespace')
  })
})

describe('canonicalize – RFC 8785 §3.2.2.3 rejects non-finite numbers', () => {
  test('NaN throws', () => {
    assert.throws(() => canonicalize(Number.NaN), RangeError)
  })

  test('Infinity throws', () => {
    assert.throws(() => canonicalize(Number.POSITIVE_INFINITY), RangeError)
  })

  test('-Infinity throws', () => {
    assert.throws(() => canonicalize(Number.NEGATIVE_INFINITY), RangeError)
  })
})

describe('canonicalize – determinism', () => {
  test('same input produces identical bytes on repeated calls', () => {
    const value: JsonValue = { z: [1, 2], a: { nested: true } }
    const first = canonicalize(value)
    const second = canonicalize(value)
    assert.deepEqual(first, second)
  })

  test('different inputs produce different bytes', () => {
    const a = canonicalize({ key: 'a' })
    const b = canonicalize({ key: 'b' })
    assert.notDeepEqual(a, b)
  })
})
