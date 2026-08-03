/**
 * AC9: given an existing `active/<slug>.projected.shaping-result.json`, the
 * CLI loads and renders it without re-projecting (asserted by unchanged
 * mtime/content). Given no projected artifact, it invokes
 * `writeProjectedResult(inputPath, epicTitle)` with `--epic-title`, then
 * renders; approval binds to the presented artifact. `--epic-title` is used
 * only on the project path.
 */
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { test } from 'node:test'
import { resolveArtifact } from '../src/resolve-input.js'
import {
  makeTempRepoRoot,
  writeProjectedFixture,
  writeShapingResultFixture,
  writeSpecDraft,
} from './helpers.js'

test('AC9: load-if-exists - an existing projected artifact is read unchanged (mtime/content)', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const projectedPath = writeProjectedFixture(repoRoot, 'example', {
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/example.md'],
    epics: [
      { key: 'epic-example', title: 'Example', stories: [{ key: 'example', title: 'Example' }] },
    ],
  })
  const before = statSync(projectedPath)
  const beforeContent = readFileSync(projectedPath, 'utf8')

  const resolved = resolveArtifact('example', { repoRoot })

  const after = statSync(projectedPath)
  const afterContent = readFileSync(projectedPath, 'utf8')
  assert.equal(afterContent, beforeContent)
  assert.equal(after.mtimeMs, before.mtimeMs)
  assert.equal(resolved.wasProjected, false)
  assert.equal(resolved.artifactPath, projectedPath)
  assert.equal(resolved.projectedResult.epics.length, 1)
})

test('AC9: no projected artifact -> project-then-present via writeProjectedResult, epicTitle used', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeShapingResultFixture(repoRoot, 'example', [
    'plugins/foreman-line/docs/specs/active/example.md',
  ])

  const resolved = resolveArtifact('example', { repoRoot, epicTitle: 'My Epic' })

  assert.equal(resolved.wasProjected, true)
  assert.equal(resolved.projectedResult.epics.length, 1)
  assert.equal(resolved.projectedResult.epics[0]?.title, 'My Epic')
  assert.ok(resolved.artifactPath.endsWith('example.projected.shaping-result.json'))
})

test('AC9: approval binds to the artifact actually presented (the just-projected one, not re-read/regenerated)', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeShapingResultFixture(repoRoot, 'example', [
    'plugins/foreman-line/docs/specs/active/example.md',
  ])

  const resolved = resolveArtifact('example', { repoRoot, epicTitle: 'My Epic' })
  const onDisk = readFileSync(resolved.artifactPath, 'utf8')
  assert.deepEqual(JSON.parse(onDisk), resolved.projectedResult)
})

test('AC9: --epic-title has no effect when a projected artifact already exists (used ONLY on the project path)', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeProjectedFixture(repoRoot, 'example', {
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/example.md'],
    epics: [
      {
        key: 'epic-example',
        title: 'Original Title',
        stories: [{ key: 'example', title: 'Example' }],
      },
    ],
  })

  const resolved = resolveArtifact('example', { repoRoot, epicTitle: 'Ignored Title' })

  assert.equal(resolved.projectedResult.epics[0]?.title, 'Original Title')
})

test('AC9: no projected artifact and no --epic-title supplied -> throws (usage error upstream)', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeShapingResultFixture(repoRoot, 'example', [
    'plugins/foreman-line/docs/specs/active/example.md',
  ])

  assert.throws(() => resolveArtifact('example', { repoRoot }))
})
