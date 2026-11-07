// Issue #181: the routing CLI, a drop-in for review-router.sh.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(HERE, 'review-route.ts')
const TSX = join(HERE, '..', 'node_modules', '.bin', 'tsx')

const CONFIG = `
export const review = {
  routes: [{ agent: 'silent-failure-hunter', why: 'error handling', added: /runCatching/ }],
  fallback: ['code-reviewer'],
}
export default { rules: [] }
`

function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), 'review-route-cli-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim()
  const write = (file, content) => {
    mkdirSync(join(dir, dirname(file)), { recursive: true })
    writeFileSync(join(dir, file), content)
  }
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@example.com')
  git('config', 'user.name', 't')
  write('probity.config.mjs', CONFIG)
  git('add', '.')
  git('commit', '-q', '-m', 'init')
  git('switch', '-q', '-c', 'feature')
  return { dir, git, write }
}

function route(dir, extra = []) {
  const res = spawnSync(TSX, [SCRIPT, '--root', dir, ...extra], { encoding: 'utf8', cwd: dir })
  return { status: res.status, stdout: res.stdout ?? '', stderr: res.stderr ?? '' }
}

test('should print agent|why lines against the merge-base with main by default', (t) => {
  const { dir, git, write } = repo(t)
  write('src/main/A.kt', 'val a = runCatching { 1 }\n')
  git('add', '.')
  git('commit', '-q', '-m', 'work') // committed: invisible to a HEAD base
  const res = route(dir)
  assert.equal(res.status, 0, res.stderr)
  assert.equal(res.stdout, 'silent-failure-hunter|error handling\n')
})

test('should print json with the base it used', (t) => {
  const { dir, write } = repo(t)
  write('src/main/A.kt', 'val a = 1\n')
  const res = route(dir, ['--format', 'json'])
  const parsed = JSON.parse(res.stdout)
  assert.deepEqual(parsed.agents, [{ agent: 'code-reviewer', why: ['no specific trigger; default pass for source changes'] }])
  assert.match(parsed.base, /^[0-9a-f]{40}$/)
})

test('should print nothing on stdout and a note on stderr when nothing is warranted', (t) => {
  const { dir, write } = repo(t)
  write('docs/x.md', 'runCatching\n')
  const res = route(dir)
  assert.equal(res.stdout, '')
  assert.match(res.stderr, /no review agents warranted/)
})

test('should honour --base', (t) => {
  const { dir, git, write } = repo(t)
  write('src/main/A.kt', 'val a = runCatching { 1 }\n')
  git('add', '.')
  git('commit', '-q', '-m', 'work')
  assert.equal(route(dir, ['--base', 'HEAD']).stdout, '')
})

test('should list the obligations a diff incurs, from the config\'s rule blocks', (t) => {
  const { dir, write } = repo(t)
  write('probity.config.mjs', `
import { reviewedBlock } from '${join(HERE, '..', 'rules', 'review-obligations.ts')}'
export const review = { fallback: ['code-reviewer'] }
export default { rules: [reviewedBlock({ files: ['ui/**', { glob: '!ui/**/*Screen.kt', id: 'thin-rendering', reviewWith: 'code-reviewer', check: 'renders only', reason: 'thin' }], rules: [] })] }
`)
  write('ui/notes/NotesScreen.kt', 'Text(title)\n')
  const json = JSON.parse(route(dir, ['--format', 'json']).stdout)
  assert.deepEqual(json.obligations.map((o) => [o.id, o.files]), [['thin-rendering', ['ui/notes/NotesScreen.kt']]])
  assert.match(route(dir).stdout, /^code-reviewer\|.*obligation thin-rendering: renders only/m)
})
