// Issue #178: the CI backstop. Checks the review record on merges that
// the PreToolUse gate never saw (UI merges, squashes, a human at a shell).
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(HERE, 'review-record.ts')
const TSX = join(HERE, '..', 'node_modules', '.bin', 'tsx')

const CONFIG = `
export const review = { mainBranch: 'main', record: { enforceForPaths: /^src\\// } }
export default { rules: [] }
`
const RECORD = 'Reviewed-by-agent: code-reviewer (ran, 0 findings)'

function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'review-record-ci-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@example.com')
  git('config', 'user.name', 't')
  writeFileSync(join(dir, 'probity.config.mjs'), CONFIG)
  writeFileSync(join(dir, 'README.md'), 'x\n')
  git('add', '.')
  git('commit', '-q', '-m', 'init')
  const base = git('rev-parse', 'HEAD')
  const merge = (branch, file, message) => {
    git('switch', '-q', '-c', branch)
    mkdirSync(join(dir, dirname(file)), { recursive: true })
    writeFileSync(join(dir, file), `${branch}\n`)
    git('add', '.')
    git('commit', '-q', '-m', `work on ${branch}`)
    git('switch', '-q', 'main')
    git('merge', '-q', '--no-ff', branch, '-m', message)
  }
  return { dir, git, base, merge }
}

function check(dir, range, extra = []) {
  const res = spawnSync(
    TSX,
    [SCRIPT, '--range', range, '--root', dir, '--config', join(dir, 'probity.config.mjs'), ...extra],
    { encoding: 'utf8' },
  )
  return { status: res.status, out: (res.stdout ?? '') + (res.stderr ?? '') }
}

test('should pass when every enforced merge in the range carries a valid record', (t) => {
  const { dir, base, merge } = repo(t)
  merge('a', 'src/a.kt', `Merge a\n\n${RECORD}`)
  const { status, out } = check(dir, `${base}..HEAD`)
  assert.equal(status, 0, out)
})

test('should fail and name the merge that lacks a record', (t) => {
  const { dir, base, merge, git } = repo(t)
  merge('a', 'src/a.kt', `Merge a\n\n${RECORD}`)
  merge('b', 'src/b.kt', 'Merge b')
  const { status, out } = check(dir, `${base}..HEAD`)
  assert.equal(status, 1, out)
  assert.match(out, new RegExp(git('rev-parse', '--short', 'HEAD')))
  assert.match(out, /Merge b/)
  assert.match(out, /no Reviewed-by-agent/)
})

test('should skip merges that touch no enforced path', (t) => {
  const { dir, base, merge } = repo(t)
  merge('docs', 'docs/x.md', 'Merge docs')
  assert.equal(check(dir, `${base}..HEAD`).status, 0)
})

test('should ignore merges before the range base, so adoption can start clean', (t) => {
  const { dir, merge, git } = repo(t)
  merge('old', 'src/old.kt', 'Merge old without record')
  const adopted = git('rev-parse', 'HEAD')
  merge('new', 'src/new.kt', `Merge new\n\n${RECORD}`)
  assert.equal(check(dir, `${adopted}..HEAD`).status, 0)
})

test('should check direct first-parent commits too with --all-first-parent', (t) => {
  const { dir, base, git } = repo(t)
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src/sq.kt'), 'x\n')
  git('add', '.')
  git('commit', '-q', '-m', 'Squashed feature')
  assert.equal(check(dir, `${base}..HEAD`).status, 0)
  assert.equal(check(dir, `${base}..HEAD`, ['--all-first-parent']).status, 1)
})

test('should exit 2 when the config has no review export', (t) => {
  const { dir, base } = repo(t)
  writeFileSync(join(dir, 'probity.config.mjs'), 'export default { rules: [] }\n')
  const { status, out } = check(dir, `${base}..HEAD`)
  assert.equal(status, 2, out)
  assert.match(out, /export const review/)
})

// --- #181: routed checks on the pushed range only ------------------------------

const ROUTED_CONFIG = `
export const review = {
  record: { enforceForPaths: /^src\\//, requireRoutedAgents: true },
  routes: [{ agent: 'agent-skills:security-auditor', why: 'secrets', added: /password/i }],
}
export default { rules: [] }
`

test('should check routed agents only on --routed-range, presence on --range', (t) => {
  const { dir, base, merge, git } = repo(t)
  writeFileSync(join(dir, 'probity.config.mjs'), ROUTED_CONFIG)
  git('add', '.')
  git('commit', '-q', '-m', 'config')
  merge('old', 'src/old.kt', `Merge old\n\n${RECORD}`) // touches no secret: fine
  const before = git('rev-parse', 'HEAD')
  merge('password-reset', 'src/pw.kt', `Merge password-reset\n\n${RECORD}`) // content routes security-auditor; record omits it
  const routed = check(dir, `${base}..HEAD`, ['--routed-range', `${before}..HEAD`])
  assert.equal(routed.status, 1, routed.out)
  assert.match(routed.out, /security-auditor/)
  assert.match(routed.out, /Merge password-reset/)
  // Without --routed-range, only presence and format are judged.
  assert.equal(check(dir, `${base}..HEAD`).status, 0)
})

test('should skip routed checks for an all-zero before (new branch push)', (t) => {
  const { dir, base, merge, git } = repo(t)
  writeFileSync(join(dir, 'probity.config.mjs'), ROUTED_CONFIG)
  git('add', '.')
  git('commit', '-q', '-m', 'config')
  merge('password-reset', 'src/pw.kt', `Merge password-reset\n\n${RECORD}`)
  const res = check(dir, `${base}..HEAD`, ['--routed-range', `${'0'.repeat(40)}..HEAD`])
  assert.equal(res.status, 0, res.out)
  assert.match(res.out, /skipp/i)
})
