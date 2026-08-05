/**
 * AC9: the four semantic guards (a)-(d), each with a passing fixture and a
 * rejecting fixture proving the guard fires where the frozen schema (no
 * minItems anywhere) would accept the payload.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ShapingResult } from '../../contracts/src/index.js'
import { assertSemanticGuards } from '../src/index.js'

const input: ShapingResult = {
  parcelSpecRefs: ['a.md', 'b.md'],
  epics: [],
}

function validOutput(): ShapingResult {
  return {
    parcelSpecRefs: ['a.md', 'b.md'],
    epics: [
      {
        key: 'epic-x',
        title: 'Epic',
        stories: [
          { key: 'a', title: 'A' },
          { key: 'b', title: 'B' },
        ],
      },
    ],
  }
}

test('AC9 (a) passing: parcelSpecRefs preserved verbatim does not throw', () => {
  assert.doesNotThrow(() => assertSemanticGuards(input, validOutput()))
})

test('AC9 (a) rejecting: a mutated parcelSpecRefs is refused even though it is schema-valid', () => {
  const bad = validOutput()
  const mutated: ShapingResult = { ...bad, parcelSpecRefs: ['a.md'] }
  assert.throws(() => assertSemanticGuards(input, mutated), /guard \(a\)/)
})

test('AC9 (b) passing: every parcelSpecRef represented by exactly one Story does not throw', () => {
  assert.doesNotThrow(() => assertSemanticGuards(input, validOutput()))
})

test('AC9 (b) rejecting: a dropped Story is refused even though epics is non-empty (schema-valid)', () => {
  const bad = validOutput()
  const dropped: ShapingResult = {
    ...bad,
    epics: [{ key: 'epic-x', title: 'Epic', stories: [{ key: 'a', title: 'A' }] }],
  }
  assert.throws(() => assertSemanticGuards(input, dropped), /guard \(b\)/)
})

test('AC9 (c) passing: every Epic non-empty does not throw', () => {
  assert.doesNotThrow(() => assertSemanticGuards(input, validOutput()))
})

test('AC9 (c) rejecting: an Epic with stories: [] is refused even though it is schema-valid (no minItems)', () => {
  const emptyEpic: ShapingResult = {
    parcelSpecRefs: ['a.md', 'b.md'],
    epics: [{ key: 'epic-x', title: 'Epic', stories: [] }],
  }
  assert.throws(() => assertSemanticGuards(input, emptyEpic), /guard \(c\)/)
})

test('AC9 (d) passing: epics.length >= 1 does not throw', () => {
  assert.doesNotThrow(() => assertSemanticGuards(input, validOutput()))
})

test("AC9 (d) rejecting: epics: [] is refused even though it is schema-valid (the W1-P1 emitter's own shape)", () => {
  const empty: ShapingResult = { parcelSpecRefs: ['a.md', 'b.md'], epics: [] }
  assert.throws(() => assertSemanticGuards(input, empty), /guard \(d\)/)
})
