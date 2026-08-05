/**
 * Rework item 1 (path containment, same class as W1-P1's MAJOR slug finding):
 * (a) `slug` must never contain `/`, `\`, or `..` - guarded at both the
 * key-minting point (`projectShapingResult`) and the path-construction point
 * (`writeProjectedArtifact`), same `assertSafeSlug` helper (Flag 1 ruling).
 * (b) a `parcelSpecRef` that resolves outside `repoRoot` is refused before
 * any existence check or read (`assertContainedPath`, used by `readSpecTitle`).
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  assertContainedPath,
  assertSafeSlug,
  projectShapingResult,
  readSpecTitle,
  writeProjectedArtifact,
} from '../src/index.js'
import { makeTempRepoRoot, writeSpecDraft } from './helpers.js'

function fixture(root: string) {
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/x.md', 'X Title')
  return { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/x.md'], epics: [] as const }
}

// --- assertSafeSlug direct ---

test('Item 1a: assertSafeSlug rejects a slug containing "/"', () => {
  assert.throws(() => assertSafeSlug('a/b'), /assertSafeSlug: slug 'a\/b'/)
})

test('Item 1a: assertSafeSlug rejects a slug containing "\\"', () => {
  assert.throws(() => assertSafeSlug('a\\b'), /assertSafeSlug: slug 'a\\b'/)
})

test('Item 1a: assertSafeSlug rejects a slug containing ".."', () => {
  assert.throws(() => assertSafeSlug('../evil'), /assertSafeSlug: slug '\.\.\/evil'/)
})

test('Item 1a: assertSafeSlug accepts an ordinary canonical slug', () => {
  assert.doesNotThrow(() => assertSafeSlug('my-ordinary-slug'))
})

// --- writeProjectedArtifact (path-construction point) ---

test('Item 1a: writeProjectedArtifact rejects a traversal slug before any path is constructed', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => writeProjectedArtifact('../evil', { parcelSpecRefs: [], epics: [] }, { repoRoot: root }),
    /assertSafeSlug/,
  )
  // No stray file escaped the temp root as a side effect of the rejected call.
  assert.equal(existsSync(join(root, '..', 'evil.projected.shaping-result.json')), false)
})

test('Item 1a: writeProjectedArtifact rejects a separator slug before any path is constructed', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => writeProjectedArtifact('a/b', { parcelSpecRefs: [], epics: [] }, { repoRoot: root }),
    /assertSafeSlug/,
  )
})

// --- projectShapingResult (key-minting point) ---

test('Item 1a: projectShapingResult rejects a traversal slug before deriveEpicKey runs', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => projectShapingResult(fixture(root), 'Epic', '../evil', { repoRoot: root }),
    /assertSafeSlug/,
  )
})

test('Item 1a: projectShapingResult rejects a separator slug before deriveEpicKey runs', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => projectShapingResult(fixture(root), 'Epic', 'a\\b', { repoRoot: root }),
    /assertSafeSlug/,
  )
})

// --- assertContainedPath / readSpecTitle (parcelSpecRef containment) ---

test('Item 1b: assertContainedPath rejects a specRef that resolves outside repoRoot', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => assertContainedPath(root, join(root, '..', 'outside.md'), '../outside.md'),
    /resolves outside repoRoot/,
  )
})

test('Item 1b: assertContainedPath accepts a specRef properly contained under repoRoot', () => {
  const root = makeTempRepoRoot()
  assert.doesNotThrow(() =>
    assertContainedPath(
      root,
      join(root, 'plugins', 'foreman-line', 'docs', 'specs', 'active', 'x.md'),
      'plugins/foreman-line/docs/specs/active/x.md',
    ),
  )
})

test('Item 1b: readSpecTitle refuses a traversal parcelSpecRef, naming the ref, before reading anything', () => {
  const root = makeTempRepoRoot()
  // Deliberately do NOT create a file at the escaping location - if the guard
  // fired before any existence check, the error is the containment error, not
  // a "does not exist" error.
  assert.throws(() => readSpecTitle(root, '../../../outside.md'), /resolves outside repoRoot/)
})

test('Item 1b: projectShapingResult propagates the traversal-specRef rejection end-to-end', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () =>
      projectShapingResult({ parcelSpecRefs: ['../../../outside.md'], epics: [] }, 'Epic', 'slug', {
        repoRoot: root,
      }),
    /resolves outside repoRoot/,
  )
})
