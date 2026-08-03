/**
 * Rework item 1: slug containment before path construction - the third
 * occurrence of this defect class in this goal (W1-P1's `sessionSlug`,
 * W1-P2's `slug`/`specRef`). `approvalRecordPath`, `rejectionRecordPath`,
 * and `resolveArtifact`'s bare-slug branch each validate `slug` against
 * `^[a-z0-9-]+$` BEFORE any path is constructed, throwing naming the
 * offending slug. Covers traversal (`../`), both separators (`/` and `\`),
 * and uppercase, for both write paths plus the read-path argument-acceptance
 * point.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { approvalRecordPath } from '../src/approval-record.js'
import { rejectionRecordPath } from '../src/rejection-record.js'
import { resolveArtifact } from '../src/resolve-input.js'
import { assertSafeSlug } from '../src/slug-guard.js'
import { makeTempRepoRoot } from './helpers.js'

const UNSAFE_SLUGS: ReadonlyArray<{ readonly label: string; readonly slug: string }> = [
  { label: 'traversal', slug: '../escape' },
  { label: 'forward-slash separator', slug: 'foo/bar' },
  { label: 'backslash separator', slug: 'foo\\bar' },
  { label: 'uppercase', slug: 'Example' },
]

test('assertSafeSlug accepts a valid lowercase-alphanumeric-hyphen slug', () => {
  assert.doesNotThrow(() => assertSafeSlug('example-slug-1'))
})

test('assertSafeSlug rejects an empty slug', () => {
  assert.throws(() => assertSafeSlug(''))
})

for (const { label, slug } of UNSAFE_SLUGS) {
  test(`approvalRecordPath refuses a ${label} slug before constructing any path`, () => {
    const repoRoot = makeTempRepoRoot()
    assert.throws(
      () => approvalRecordPath(slug, repoRoot),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok(err.message.includes(JSON.stringify(slug)), err.message)
        return true
      },
    )
  })

  test(`rejectionRecordPath refuses a ${label} slug before constructing any path`, () => {
    const repoRoot = makeTempRepoRoot()
    assert.throws(
      () => rejectionRecordPath(slug, repoRoot),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok(err.message.includes(JSON.stringify(slug)), err.message)
        return true
      },
    )
  })

  test(`resolveArtifact's bare-slug branch refuses a ${label} argument before constructing any path`, () => {
    const repoRoot = makeTempRepoRoot()
    assert.throws(
      () => resolveArtifact(slug, { repoRoot }),
      (err: unknown) => {
        assert.ok(err instanceof Error)
        assert.ok(err.message.includes(JSON.stringify(slug)), err.message)
        return true
      },
    )
  })
}

test('assertSafeSlug completes fast on a pathologically long hostile input (linear-time, lesson #19)', () => {
  const hostile = `${'a'.repeat(500_000)}/../escape`
  const start = performance.now()
  assert.throws(() => assertSafeSlug(hostile))
  const ms = performance.now() - start
  assert.ok(ms < 1000, `assertSafeSlug took ${ms}ms`)
})
