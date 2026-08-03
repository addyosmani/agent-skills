/**
 * AC8: the filled artifact is written to active/<slug>.projected.shaping-result.json;
 * parcelSpecRefs is copied verbatim; the pristine input <slug>.shaping-result.json
 * is unmodified; the emitter refuses to overwrite an existing projected artifact.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { writeProjectedResult } from '../src/index.js'
import { makeTempRepoRoot, writeShapingResultFixture, writeSpecDraft } from './helpers.js'

test('AC8: the projected artifact is written to active/<slug>.projected.shaping-result.json', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'Title')
  const inputPath = writeShapingResultFixture(root, 'out-slug', [
    'plugins/foreman-line/docs/specs/active/w1-p2.md',
  ])
  const { artifactPath, artifactRef } = writeProjectedResult(inputPath, 'Epic', { repoRoot: root })
  const expected = join(
    root,
    'plugins',
    'foreman-line',
    'docs',
    'specs',
    'active',
    'out-slug.projected.shaping-result.json',
  )
  assert.equal(artifactPath, expected)
  assert.equal(
    artifactRef,
    'plugins/foreman-line/docs/specs/active/out-slug.projected.shaping-result.json',
  )
  assert.ok(existsSync(artifactPath))
})

test('AC8: the projected artifact file is valid, parseable JSON', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'Title')
  const inputPath = writeShapingResultFixture(root, 'json-slug', [
    'plugins/foreman-line/docs/specs/active/w1-p2.md',
  ])
  const { artifactPath } = writeProjectedResult(inputPath, 'Epic', { repoRoot: root })
  const parsed = JSON.parse(readFileSync(artifactPath, 'utf8'))
  assert.deepEqual(parsed.parcelSpecRefs, ['plugins/foreman-line/docs/specs/active/w1-p2.md'])
  assert.equal(parsed.epics.length, 1)
})

test('AC8: parcelSpecRefs is copied verbatim from the input into the output', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/a.md', 'A')
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/b.md', 'B')
  const refs = [
    'plugins/foreman-line/docs/specs/active/a.md',
    'plugins/foreman-line/docs/specs/active/b.md',
  ]
  const inputPath = writeShapingResultFixture(root, 'verbatim-slug', refs)
  const { payload } = writeProjectedResult(inputPath, 'Epic', { repoRoot: root })
  assert.deepEqual(payload.parcelSpecRefs, refs)
})

test('AC8: the pristine input <slug>.shaping-result.json is left unmodified (no in-place mutation)', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'Title')
  const inputPath = writeShapingResultFixture(root, 'pristine-slug', [
    'plugins/foreman-line/docs/specs/active/w1-p2.md',
  ])
  const before = readFileSync(inputPath, 'utf8')
  writeProjectedResult(inputPath, 'Epic', { repoRoot: root })
  const after = readFileSync(inputPath, 'utf8')
  assert.equal(before, after)
  assert.deepEqual(JSON.parse(after).epics, [])
})

test('AC8: refuses to overwrite an existing projected artifact', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'Title')
  const inputPath = writeShapingResultFixture(root, 'collide-slug', [
    'plugins/foreman-line/docs/specs/active/w1-p2.md',
  ])
  writeProjectedResult(inputPath, 'Epic', { repoRoot: root })
  assert.throws(
    () => writeProjectedResult(inputPath, 'Epic', { repoRoot: root }),
    /refusing to overwrite existing projected artifact/,
  )
})
