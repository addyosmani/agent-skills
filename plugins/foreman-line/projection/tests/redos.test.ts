/**
 * Linear-time discipline (lesson #19). This package's own string derivation
 * (specFilenameStem, deriveEpicKey, slugFromInputPath) uses no regex at all
 * (basename/endsWith/slice only), so no polynomial-backtracking site exists to
 * pin - this test proves the claim by feeding pathologically large inputs and
 * asserting fast, correct completion.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveEpicKey, slugFromInputPath, specFilenameStem } from '../src/index.js'

const BUDGET_MS = 1000
const HUGE = 200_000

function timed(fn: () => void): number {
  const start = performance.now()
  fn()
  return performance.now() - start
}

test('specFilenameStem completes fast on a pathologically long path segment', () => {
  const hostile = `${'a'.repeat(HUGE)}.md`
  let result!: string
  const ms = timed(() => {
    result = specFilenameStem(`plugins/foreman-line/docs/specs/active/${hostile}`)
  })
  assert.ok(ms < BUDGET_MS, `specFilenameStem took ${ms}ms`)
  assert.equal(result, 'a'.repeat(HUGE))
})

test('deriveEpicKey completes fast on a pathologically long slug', () => {
  const hostile = 'x'.repeat(HUGE)
  let result!: string
  const ms = timed(() => {
    result = deriveEpicKey(hostile)
  })
  assert.ok(ms < BUDGET_MS, `deriveEpicKey took ${ms}ms`)
  assert.equal(result, `epic-${hostile}`)
})

test('slugFromInputPath completes fast on a pathologically long filename', () => {
  const hostile = `${'b'.repeat(HUGE)}.shaping-result.json`
  let result!: string
  const ms = timed(() => {
    result = slugFromInputPath(`/some/root/active/${hostile}`)
  })
  assert.ok(ms < BUDGET_MS, `slugFromInputPath took ${ms}ms`)
  assert.equal(result, 'b'.repeat(HUGE))
})
