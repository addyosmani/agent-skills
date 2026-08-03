/**
 * AC6 (CLI plumbing half): the `dispatch-worktree` subcommand's 0/1/2
 * exit-code contract, exercised as a real subprocess against the local `tsx`
 * binary so argv parsing, stdout/stderr, and the process exit code are what is
 * under test. Full output is captured (spawnSync) before the status is read
 * (lesson #11 — never truncate a pipeline whose exit code is under test).
 *
 * The CLI is passed as an ABSOLUTE script path with cwd = the temp git repo,
 * so `git worktree add` runs in the throwaway repo while the emitter still
 * resolves its shipped registry via import.meta.url (cwd-independent).
 */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsxCli = join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')
const cliScript = join(packageRoot, 'src', 'cli.ts')

function runDispatch(
  args: readonly string[],
  cwd: string = packageRoot,
): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(process.execPath, [tsxCli, cliScript, 'dispatch-worktree', ...args], {
    cwd,
    encoding: 'utf8',
  })
  return { status: result.status, stderr: result.stderr, stdout: result.stdout }
}

function makeTempRepo(): { base: string; repo: string } {
  const base = mkdtempSync(join(tmpdir(), 'p3-cli-'))
  const repo = join(base, 'repo')
  mkdirSync(repo)
  execFileSync('git', ['init', '-q'], { cwd: repo })
  execFileSync('git', ['config', 'user.email', 'p3-test@example.invalid'], { cwd: repo })
  execFileSync('git', ['config', 'user.name', 'P3 Test'], { cwd: repo })
  writeFileSync(join(repo, 'seed.txt'), 'seed\n', 'utf8')
  execFileSync('git', ['add', '-A'], { cwd: repo })
  execFileSync('git', ['commit', '-q', '-m', 'seed'], { cwd: repo })
  return { base, repo }
}

test('exit 2 on missing required flags', () => {
  const { status, stderr } = runDispatch(['--parcel', 'PX'])
  assert.equal(status, 2)
  assert.ok(stderr.includes('missing required flag'))
})

test('exit 2 on an unknown flag', () => {
  const { status, stderr } = runDispatch([
    '--parcel',
    'PX',
    '--profile',
    'builder-standard',
    '--path',
    'x',
    '--bogus',
    'y',
  ])
  assert.equal(status, 2)
  assert.ok(stderr.includes('unknown flag'))
})

test('exit 2 on a --profile value not in PROFILE_NAMES (before any git mutation)', () => {
  const { status, stderr } = runDispatch([
    '--parcel',
    'PX',
    '--profile',
    'nope',
    '--path',
    join(tmpdir(), 'p3-cli-should-not-exist'),
  ])
  assert.equal(status, 2)
  assert.ok(stderr.includes('unknown --profile'))
  assert.ok(!existsSync(join(tmpdir(), 'p3-cli-should-not-exist')))
})

test('exit 0 end-to-end: creates worktree + settings via the real CLI entry point', () => {
  const { base, repo } = makeTempRepo()
  try {
    const wt = join(base, 'wt')
    const { status, stdout, stderr } = runDispatch(
      ['--parcel', 'PX', '--profile', 'reviewer-readonly', '--path', wt],
      repo,
    )
    assert.equal(status, 0, stderr)
    assert.ok(existsSync(join(wt, '.claude', 'settings.local.json')))
    assert.ok(stdout.includes('profile: reviewer-readonly'))
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('exit 1 no-clobber: --path already exists', () => {
  const { base, repo } = makeTempRepo()
  try {
    const wt = join(base, 'wt')
    mkdirSync(wt)
    const { status, stderr } = runDispatch(
      ['--parcel', 'PX', '--profile', 'builder-standard', '--path', wt],
      repo,
    )
    assert.equal(status, 1)
    assert.ok(stderr.includes('already exists'))
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
