/**
 * AC4: a fixture ShapingResult with N parcelSpecRefs projects to exactly one
 * Epic with exactly N Stories, in input order. No Story lacks a corresponding
 * parcelSpecRef; no parcelSpecRef is dropped.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectShapingResult } from '../src/index.js'
import { makeTempRepoRoot, writeSpecDraft } from './helpers.js'

test('AC4: N parcelSpecRefs project to exactly one Epic with N Stories, in order', () => {
  const root = makeTempRepoRoot()
  const refs = ['a', 'b', 'c'].map((letter) => {
    const rel = `plugins/foreman-line/docs/specs/active/${letter}.md`
    writeSpecDraft(root, rel, `Title ${letter.toUpperCase()}`)
    return rel
  })
  const output = projectShapingResult({ parcelSpecRefs: refs, epics: [] }, 'Epic', 'slug', {
    repoRoot: root,
  })
  assert.equal(output.epics.length, 1)
  const stories = output.epics[0]?.stories ?? []
  assert.equal(stories.length, 3)
  assert.deepEqual(
    stories.map((s) => s.key),
    ['a', 'b', 'c'],
  )
  assert.deepEqual(
    stories.map((s) => s.title),
    ['Title A', 'Title B', 'Title C'],
  )
})

test('AC4: a single parcelSpecRef projects to exactly one Epic with exactly one Story', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/solo.md', 'Solo Title')
  const output = projectShapingResult(
    { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/solo.md'], epics: [] },
    'Epic',
    'slug',
    { repoRoot: root },
  )
  assert.equal(output.epics.length, 1)
  assert.equal(output.epics[0]?.stories.length, 1)
})
