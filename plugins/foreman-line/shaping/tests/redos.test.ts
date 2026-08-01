/**
 * ReDoS regression pins. The three polynomial-backtracking regexes flagged by
 * CodeQL (js/polynomial-redos) were replaced by linear string operations. Each
 * test feeds a ~100k-char hostile line and asserts fast completion (<1000 ms) -
 * catastrophic backtracking would take many seconds. Behavior is also asserted
 * so the linear rewrite stays correct, not merely fast.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkBodySections, deriveSessionSlug } from '../src/index.js'

const BUDGET_MS = 1000
const HUGE = 100_000

/** Run `fn`, return elapsed ms. */
function timed(fn: () => void): number {
  const start = performance.now()
  fn()
  return performance.now() - start
}

test('Site 1 (extractH2Headings): a `##` heading line of pure whitespace completes fast', () => {
  // `## ` followed by 100k tabs - the old /^##(?!#)\s+(.+?)\s*$/ backtracked here.
  const content = `## ${'\t'.repeat(HUGE)}`
  let result!: ReturnType<typeof checkBodySections>
  const ms = timed(() => {
    result = checkBodySections(content)
  })
  assert.ok(ms < BUDGET_MS, `extractH2Headings took ${ms}ms (budget ${BUDGET_MS}ms)`)
  // A whitespace-only `##` line is not a heading, so all required sections are missing.
  assert.equal(result.valid, false)
})

test('Site 2 (sectionBody heading scan): a hostile `##` whitespace line completes fast', () => {
  // The hostile line is scanned by sectionBody's start-search (parseH2Heading) and
  // its boundary check (startsWithH2) while resolving the Out of Scope body.
  const content = [
    `## ${'\t'.repeat(HUGE)}`,
    '## Intent',
    'x',
    '## Constraints',
    'x',
    '## Acceptance Criteria',
    'x',
    '## Out of Scope',
    '- A real boundary.',
    '## Context & References',
    '- ref',
  ].join('\n')
  let result!: ReturnType<typeof checkBodySections>
  const ms = timed(() => {
    result = checkBodySections(content)
  })
  assert.ok(ms < BUDGET_MS, `sectionBody scan took ${ms}ms (budget ${BUDGET_MS}ms)`)
  // The hostile line is not a heading; the five real sections are present and in order.
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('Site 3 (deriveSessionSlug): a long trailing dash run completes fast', () => {
  let slug!: string
  const ms = timed(() => {
    slug = deriveSessionSlug(`a${'-'.repeat(HUGE)}`)
  })
  assert.ok(ms < BUDGET_MS, `deriveSessionSlug took ${ms}ms (budget ${BUDGET_MS}ms)`)
  assert.equal(slug, 'a')
  // An all-dash input still collapses to empty and throws (fast).
  const throwMs = timed(() => {
    assert.throws(() => deriveSessionSlug('-'.repeat(HUGE)), /empty slug/)
  })
  assert.ok(throwMs < BUDGET_MS, `deriveSessionSlug throw path took ${throwMs}ms`)
})
