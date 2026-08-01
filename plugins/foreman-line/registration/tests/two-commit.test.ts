/**
 * AC9: two-commit shape + sidecar (Q7). Commit 1 carries the frontmatter
 * back-fill (the permalink-bound SHA); commit 2 carries the Stage-B receipt +
 * the RegistrationResult sidecar at active/<slug>.registration.json (valid
 * parseable JSON, non-`.md`).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { register } from '../src/register.js'
import { FakeAdapter, git, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

function filesInCommit(repoRoot: string, ref: string): string[] {
  return git(repoRoot, ['show', '--name-only', '--format=', ref])
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

test('AC9: commit 1 = back-fill; commit 2 = Stage-B receipt + RegistrationResult sidecar', async () => {
  const fx = singleStoryFixture()
  const outcome = await register({
    slug: fx.slug,
    repoRoot: fx.repoRoot,
    adapter: new FakeAdapter(),
    timestamp: TS,
  })

  const commit1 = filesInCommit(fx.repoRoot, 'HEAD~1')
  const commit2 = filesInCommit(fx.repoRoot, 'HEAD')

  // Commit 1: only the back-filled spec .md.
  assert.deepEqual(commit1, [fx.specRefs[0] as string])

  // Commit 2: the Stage-B receipt + the sidecar, nothing else.
  const sidecarRel = `plugins/foreman-line/docs/specs/active/${fx.slug}.registration.json`
  assert.equal(commit2.length, 2)
  assert.ok(commit2.includes(outcome.receiptLocator as string))
  assert.ok(commit2.includes(sidecarRel))

  // The sidecar is valid parseable JSON and is not a .md file.
  const sidecarAbs = join(fx.repoRoot, ...sidecarRel.split('/'))
  assert.ok(!sidecarRel.endsWith('.md'))
  const parsed = JSON.parse(readFileSync(sidecarAbs, 'utf8'))
  assert.deepEqual(parsed, outcome.result)
})
