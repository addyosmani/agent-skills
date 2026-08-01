/**
 * AC5: artifact path/naming beneath the given root, deriveSessionSlug rules,
 * the refuse-to-overwrite collision guard, and valid parseable JSON content.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { deriveSessionSlug, emitShapingResult } from '../src/index.js'
import { makeTempRepoRoot } from './helpers.js'

test('AC5: artifact is written to active/<session-slug>.shaping-result.json beneath the root', () => {
  const root = makeTempRepoRoot()
  const { artifactPath, artifactRef } = emitShapingResult({
    sessionSlug: 'my-session',
    parcelSpecRefs: ['x.md'],
    repoRoot: root,
  })
  const expected = join(
    root,
    'plugins',
    'foreman-line',
    'docs',
    'specs',
    'active',
    'my-session.shaping-result.json',
  )
  assert.equal(artifactPath, expected)
  assert.equal(artifactRef, 'plugins/foreman-line/docs/specs/active/my-session.shaping-result.json')
  assert.ok(existsSync(artifactPath))
})

test('AC5: emitted file content is valid, parseable JSON', () => {
  const { artifactPath } = emitShapingResult({
    sessionSlug: 'json-check',
    parcelSpecRefs: ['x.md'],
    repoRoot: makeTempRepoRoot(),
  })
  const parsed = JSON.parse(readFileSync(artifactPath, 'utf8'))
  assert.deepEqual(parsed, { parcelSpecRefs: ['x.md'], epics: [] })
})

test('AC5: deriveSessionSlug lowercases, trims, collapses, and strips', () => {
  assert.equal(deriveSessionSlug('  Hello World!!  '), 'hello-world')
  assert.equal(deriveSessionSlug('W1-P1 Shaping Agent'), 'w1-p1-shaping-agent')
  assert.equal(deriveSessionSlug('--Already__Slug--'), 'already-slug')
})

test('AC5: deriveSessionSlug throws on an empty result', () => {
  assert.throws(() => deriveSessionSlug('   '), /empty slug/)
  assert.throws(() => deriveSessionSlug('!!!'), /empty slug/)
})

test('AC5: emitter refuses to overwrite an existing artifact (collision guard)', () => {
  const root = makeTempRepoRoot()
  emitShapingResult({ sessionSlug: 'dupe', parcelSpecRefs: ['x.md'], repoRoot: root })
  assert.throws(
    () => emitShapingResult({ sessionSlug: 'dupe', parcelSpecRefs: ['y.md'], repoRoot: root }),
    /refusing to overwrite/,
  )
})

test('Item 1: emitter rejects a `../` traversal sessionSlug before any path construction', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () =>
      emitShapingResult({ sessionSlug: '../../evil', parcelSpecRefs: ['x.md'], repoRoot: root }),
    /sessionSlug '\.\.\/\.\.\/evil' is not canonical/,
  )
})

test('Item 1: emitter rejects a sessionSlug containing a separator (/ or \\)', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => emitShapingResult({ sessionSlug: 'a/b', parcelSpecRefs: ['x.md'], repoRoot: root }),
    /sessionSlug 'a\/b' is not canonical/,
  )
  assert.throws(
    () => emitShapingResult({ sessionSlug: 'a\\b', parcelSpecRefs: ['x.md'], repoRoot: root }),
    /is not canonical/,
  )
})

test('Item 1: emitter rejects an uppercase (non-canonical) sessionSlug', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => emitShapingResult({ sessionSlug: 'MySession', parcelSpecRefs: ['x.md'], repoRoot: root }),
    /sessionSlug 'MySession' is not canonical/,
  )
})
