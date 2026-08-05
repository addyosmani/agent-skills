/**
 * AC9: the body-section self-check (this package's thin complementary check)
 * confirms the §4 required sections are present and in order and that Out of
 * Scope is non-empty. Conformant passes; missing / out-of-order / empty-"None"
 * each reject. Every case has a fixture (see helpers.ts).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkBodySections } from '../src/index.js'
import {
  CONFORMANT_DRAFT,
  DRAFT_EMPTY_OUT_OF_SCOPE,
  DRAFT_MISSING_SECTION,
  DRAFT_NUMBERED_OUT_OF_SCOPE,
  DRAFT_OUT_OF_ORDER,
  DRAFT_PROSE_OUT_OF_SCOPE,
} from './helpers.js'

test('AC9: a conformant draft passes the body-section check', () => {
  const result = checkBodySections(CONFORMANT_DRAFT)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('AC9: a draft missing a required section is rejected', () => {
  const result = checkBodySections(DRAFT_MISSING_SECTION)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('Constraints')))
})

test('AC9: a draft with out-of-order sections is rejected', () => {
  const result = checkBodySections(DRAFT_OUT_OF_ORDER)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('out of order')))
})

test('AC9: a draft with an empty / "None" Out of Scope is rejected', () => {
  const result = checkBodySections(DRAFT_EMPTY_OUT_OF_SCOPE)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('Out of Scope')))
})

test('Item 2: a prose-only (no bullet) Out of Scope passes', () => {
  const result = checkBodySections(DRAFT_PROSE_OUT_OF_SCOPE)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('Item 2: a numbered-list Out of Scope passes', () => {
  const result = checkBodySections(DRAFT_NUMBERED_OUT_OF_SCOPE)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})
