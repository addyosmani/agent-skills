// Issue #151: the TDD judge rejected every generalising step (a loop, a
// recursive call) for a test that needed the general case, and asked for
// one more hard-coded case per test. Every TDD judge must count
// replacing special cases with the general one as the minimum green, and
// name the step it would accept when it does block.
import assert from 'node:assert/strict'
import test from 'node:test'

import { KOTLIN_TDD_ADDENDUM } from '../internal/kotlin-tdd.ts'
import { SWIFT_TDD_ADDENDUM } from '../internal/swift-tdd.ts'
import { JS_TDD_ADDENDUM } from './js-tdd.ts'

for (const [name, addendum] of [
  ['Kotlin', KOTLIN_TDD_ADDENDUM],
  ['Swift', SWIFT_TDD_ADDENDUM],
  ['JS', JS_TDD_ADDENDUM],
] as const) {
  test(`${name} TDD addendum counts generalising special cases as the minimum green`, () => {
    assert.match(addendum, /Generalising is a minimal green/)
    assert.match(addendum, /loop or recursion/)
    assert.match(addendum, /one more hard-coded case/)
    assert.match(addendum, /refactor under green/)
  })
}
