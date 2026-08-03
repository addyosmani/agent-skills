/**
 * AC3: the parcel consumes the shipped `readShapingResult`/`discoverShapingResults`
 * from `../../shaping/src/index.js` (never re-implemented, never modifying
 * `shaping/`), and a projected `*.projected.shaping-result.json` artifact is
 * not selectable as an input via the fallback discovery.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { discoverProjectableInputs, writeProjectedResult } from '../src/index.js'
import {
  diffStatSinceMergeBase,
  makeTempRepoRoot,
  writeShapingResultFixture,
  writeSpecDraft,
} from './helpers.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRootOfMonorepo = join(packageDir, '..', '..', '..')
const srcDir = join(packageDir, 'src')

test('AC3: readShapingResult and discoverShapingResults are imported from ../../shaping/src/index.js', () => {
  const files = readdirSync(srcDir).filter((f) => f.endsWith('.ts'))
  const text = files.map((f) => readFileSync(join(srcDir, f), 'utf8')).join('\n')
  assert.match(text, /from '\.\.\/\.\.\/shaping\/src\/index\.js'/)
  assert.match(text, /readShapingResult/)
  assert.match(text, /discoverShapingResults/)
})

test('AC3: no file under shaping/ is modified by this parcel since the branch fork point', () => {
  // Diffed from the merge-base with origin/main (rework item 2), not HEAD.
  const out = diffStatSinceMergeBase(repoRootOfMonorepo, 'plugins/foreman-line/shaping')
  assert.equal(out.trim(), '')
})

test("AC3: the fallback discovery filters out this package's own projected artifact", () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'Title')
  const inputPath = writeShapingResultFixture(root, 'disc-slug', [
    'plugins/foreman-line/docs/specs/active/w1-p2.md',
  ])
  writeProjectedResult(inputPath, 'Epic Title', { repoRoot: root })

  const found = discoverProjectableInputs(root)
  assert.equal(found.length, 1)
  assert.ok(found[0]?.endsWith('disc-slug.shaping-result.json'))
  assert.ok(!found.some((p) => p.endsWith('.projected.shaping-result.json')))
})

test('AC3: discoverProjectableInputs returns [] when active/ does not exist', () => {
  assert.deepEqual(discoverProjectableInputs(makeTempRepoRoot()), [])
})
