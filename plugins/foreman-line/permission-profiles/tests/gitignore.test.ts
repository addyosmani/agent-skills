/**
 * AC7 (F-D): the repo-tracked `.gitignore` — not a machine-local global
 * ignore — is what keeps an emitted worktree `settings.local.json` from riding
 * a PR into main. Assert the repo-root `.gitignore` carries both patterns AND
 * that `git check-ignore -v` resolves an emitted path to that repo-tracked
 * file (source prints as `.gitignore`, not an absolute path into the user's
 * home/global config).
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageRoot, '..', '..', '..')

test('AC7: repo-root .gitignore contains both settings.local.json patterns', () => {
  const gitignore = readFileSync(join(repoRoot, '.gitignore'), 'utf8')
  assert.ok(
    gitignore.split('\n').some((l) => l.trim() === '.claude/settings.local.json'),
    'expected a bare .claude/settings.local.json entry',
  )
  assert.ok(
    gitignore.split('\n').some((l) => l.trim() === '**/.claude/settings.local.json'),
    'expected a **/.claude/settings.local.json entry',
  )
})

test('AC7: git check-ignore resolves an emitted worktree settings file to the repo-tracked .gitignore', () => {
  // A hypothetical emitted worktree path inside the repo tree; the file need
  // not exist for check-ignore to resolve the matching rule + its source.
  const emitted = join(packageRoot, 'some-emitted-worktree', '.claude', 'settings.local.json')
  const out = execFileSync('git', ['check-ignore', '-v', emitted], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim()

  // `-v` prints `<source>:<line>:<pattern>\t<pathname>`. The source must be the
  // repo-tracked `.gitignore` (relative), never an absolute global config path.
  const source = out.split('\t')[0]?.split(':')[0]
  assert.equal(source, '.gitignore', `check-ignore source was '${out}'`)
})
