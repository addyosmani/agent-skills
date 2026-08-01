/**
 * AC4: the semantic guard rejects emission when parcelSpecRefs is empty (even
 * though such a payload is schema-valid), accepts >=1 ref, and normalizes
 * Windows-style separators to repo-relative POSIX.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emitShapingResult, toPosixRelative } from '../src/index.js'
import { makeTempRepoRoot } from './helpers.js'

test('AC4: guard rejects emission when parcelSpecRefs is empty', () => {
  assert.throws(
    () =>
      emitShapingResult({
        sessionSlug: 'ac4-empty',
        parcelSpecRefs: [],
        repoRoot: makeTempRepoRoot(),
      }),
    /parcelSpecRefs is empty/,
  )
})

test('AC4: guard accepts a payload with >=1 ref', () => {
  const { payload } = emitShapingResult({
    sessionSlug: 'ac4-ok',
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/x.md'],
    repoRoot: makeTempRepoRoot(),
  })
  assert.equal(payload.parcelSpecRefs.length, 1)
})

test('AC4: Windows-style separators normalize to POSIX in the emitted payload', () => {
  const { payload } = emitShapingResult({
    sessionSlug: 'ac4-posix',
    parcelSpecRefs: ['plugins\\foreman-line\\docs\\specs\\active\\x.md'],
    repoRoot: makeTempRepoRoot(),
  })
  assert.equal(payload.parcelSpecRefs[0], 'plugins/foreman-line/docs/specs/active/x.md')
  assert.equal(toPosixRelative('a\\b\\c'), 'a/b/c')
})
