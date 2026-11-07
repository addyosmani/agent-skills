// Issue #63: requireGreenTestRun recognized a commit only by the literal
// text "git commit", so `git -C <dir> commit` and `git -c k=v commit`
// skipped the commit-on-green gate entirely. With enforceForPaths set, it
// also listed staged files in the hook's checkout, so a commit made inside
// a linked worktree nested in the project (.claude/worktrees/<name>) was
// scoped by the main checkout's staged files.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'

import type { RuleContext } from '@nizos/probity'

import { requireGreenTestRun } from './gates.ts'

const noRuns = { history: async () => [] } as unknown as RuleContext
const gate = (extra: Parameters<typeof requireGreenTestRun>[0] extends infer O ? Partial<O> : never = {}) =>
  requireGreenTestRun({
    command: /gradlew\b.*\btest\b/,
    successPattern: /BUILD SUCCESSFUL/,
    failurePattern: /BUILD FAILED|FAILED/,
    ...extra,
  })

test('git -C <dir> commit and git -c key=value commit are gated', async () => {
  for (const command of ['git -C /repo commit -m x', 'git -C "/my repo" commit -m x', 'git -c user.name=t commit -m x']) {
    const result = await gate()({ kind: 'command', command }, noRuns)
    assert.equal(result.kind, 'violation', command)
  }
})

test('commands that are not commits still pass', async () => {
  for (const command of ['git commit-tree abc', 'git log --grep commit', 'echo done']) {
    const result = await gate()({ kind: 'command', command }, noRuns)
    assert.equal(result.kind, 'pass', command)
  }
})

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], {
    cwd,
    stdio: ['ignore', 'pipe', 'ignore'],
  })

function write(root: string, rel: string, content: string) {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), content)
}

/** A project with a linked worktree nested at .claude/worktrees/agent-a; the hook runs at the root. */
function project(t: { after: (fn: () => void) => void }) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), 'probity-green-wt-')))
  const originalCwd = process.cwd()
  t.after(() => {
    process.chdir(originalCwd)
    rmSync(repo, { recursive: true, force: true })
  })
  git(repo, 'init', '-q', '-b', 'main')
  write(repo, 'src/main/kotlin/App.kt', 'fun main() {}\n')
  write(repo, 'README.md', '# app\n')
  write(repo, '.gitignore', '.claude/worktrees/\n')
  git(repo, 'add', '.')
  git(repo, 'commit', '-q', '-m', 'init')
  const worktree = join(repo, '.claude/worktrees/agent-a')
  git(repo, 'worktree', 'add', '-q', worktree, '-b', 'agent-a')
  process.chdir(repo)
  return { repo, worktree, rule: gate({ enforceForPaths: /^src\// }) }
}

test('a worktree commit staging code is gated by its own staged files', async (t) => {
  const { worktree, rule } = project(t)
  write(worktree, 'src/main/kotlin/App.kt', 'fun main() { println() }\n')
  git(worktree, 'add', '.')
  for (const command of [`cd ${worktree} && git commit -m x`, `git -C "${worktree}" commit -m x`]) {
    const result = await rule({ kind: 'command', command }, noRuns)
    assert.equal(result.kind, 'violation', command)
  }
})

test('code staged in the main checkout does not scope a docs-only worktree commit', async (t) => {
  const { repo, worktree, rule } = project(t)
  write(repo, 'src/main/kotlin/App.kt', 'fun main() { error("x") }\n')
  git(repo, 'add', '.')
  write(worktree, 'README.md', '# app, documented\n')
  git(worktree, 'add', '.')
  const fromWorktree = await rule({ kind: 'command', command: `cd ${worktree} && git commit -m x` }, noRuns)
  assert.equal(fromWorktree.kind, 'pass', fromWorktree.kind === 'violation' ? fromWorktree.reason : '')
  const fromMain = await rule({ kind: 'command', command: 'git commit -m x' }, noRuns)
  assert.equal(fromMain.kind, 'violation')
})

test('an injected lister receives the root of the tree being committed', async (t) => {
  const { repo, worktree } = project(t)
  const seen: string[] = []
  const rule = gate({
    enforceForPaths: /^src\//,
    listCommitFiles: (_command, cwd) => {
      seen.push(cwd)
      return []
    },
  })
  await rule({ kind: 'command', command: `cd ${worktree} && git commit -m x` }, noRuns)
  await rule({ kind: 'command', command: 'git commit -m x' }, noRuns)
  assert.deepEqual(seen, [worktree, repo])
})

// Issue #152: one session with two sibling worktrees of the same repo. A
// deliberate red run in one held a docs commit in the other hostage, because
// the gate judged the last test run anywhere in the session.

/** A repo at <tmp>/repo with a sibling linked worktree at <tmp>/repo-b; the hook runs in the repo. */
function siblings(t: { after: (fn: () => void) => void }) {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'probity-green-sib-')))
  const originalCwd = process.cwd()
  t.after(() => {
    process.chdir(originalCwd)
    rmSync(base, { recursive: true, force: true })
  })
  const a = join(base, 'repo')
  const b = join(base, 'repo-b')
  mkdirSync(a)
  git(a, 'init', '-q', '-b', 'main')
  write(a, 'src/main/kotlin/App.kt', 'fun main() {}\n')
  git(a, 'add', '.')
  git(a, 'commit', '-q', '-m', 'init')
  git(a, 'worktree', 'add', '-q', b, '-b', 'b')
  process.chdir(a)
  return { a, b }
}

const run = (command: string, output: string) => ({ kind: 'command' as const, command, output })
const edit = (path: string) => ({ kind: 'write' as const, path, content: '' })
const historyOf = (...events: unknown[]) => ({ history: async () => events }) as unknown as RuleContext
const GREEN = 'BUILD SUCCESSFUL in 4s'
const RED = 'MySudoPushesTest FAILED\nBUILD FAILED in 3s'

test('a red run in another worktree does not judge this worktree\'s commit', async (t) => {
  const { a, b } = siblings(t)
  const history = historyOf(
    edit(join(a, 'README.md')),
    run(`cd ${a} && ./gradlew test`, GREEN),
    edit(join(b, 'src/main/kotlin/App.kt')),
    run(`cd ${b} && ./gradlew test --tests '*MySudoPushesTest*'`, RED),
  )
  const inA = await gate()({ kind: 'command', command: `cd ${a} && git commit -m docs` }, history)
  assert.equal(inA.kind, 'pass', inA.kind === 'violation' ? inA.reason : '')
  const inB = await gate()({ kind: 'command', command: `git -C ${b} commit -m red` }, history)
  assert.equal(inB.kind, 'violation')
})

test('a change in this worktree after its green run still needs a rerun', async (t) => {
  const { a, b } = siblings(t)
  const history = historyOf(
    run(`cd ${a} && ./gradlew test`, GREEN),
    edit(join(a, 'src/main/kotlin/App.kt')),
    run(`cd ${b} && ./gradlew test`, GREEN),
  )
  const result = await gate()({ kind: 'command', command: `cd ${a} && git commit -m x` }, history)
  assert.equal(result.kind, 'violation')
})

test('a run with no directory of its own still counts for every worktree', async (t) => {
  const { a } = siblings(t)
  const history = historyOf(run(`cd ${a} && ./gradlew test`, GREEN), run('./gradlew test', RED))
  const result = await gate()({ kind: 'command', command: `cd ${a} && git commit -m x` }, history)
  assert.equal(result.kind, 'violation')
})
