/**
 * Tier-1 unit coverage for the P3 emitter engine (AC3, AC4, AC5, and the
 * dispatchWorktree half of AC6). Projection and resolution are exercised
 * in-process; worktree creation runs against a throwaway temp git repo so no
 * real repo state is touched.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  branchForParcel,
  dispatchWorktree,
  projectEnvelope,
  resolveProfile,
} from '../src/emitter.js'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturesDir = join(packageRoot, 'tests', 'fixtures')

/** The ten enumerated git-mutation deny rules reviewer-readonly must carry. */
const TEN_MUTATION_RULES = [
  'Bash(git commit*)',
  'PowerShell(git commit*)',
  'Bash(git push*)',
  'PowerShell(git push*)',
  'Bash(git apply*)',
  'PowerShell(git apply*)',
  'Bash(git stash*)',
  'PowerShell(git stash*)',
  'Bash(git merge*)',
  'PowerShell(git merge*)',
]

// --- AC3: profile resolution, gated through validateRegistry ---

test('AC3: resolveProfile returns the exact reviewer-readonly envelope from the shipped registry', () => {
  const { profile, errors } = resolveProfile('reviewer-readonly')
  assert.deepEqual(errors, [])
  assert.ok(profile, 'expected a resolved profile')
  assert.ok(profile.envelope.deny.includes('Edit'))
  assert.ok(profile.envelope.deny.includes('Write'))
  for (const rule of TEN_MUTATION_RULES) {
    assert.ok(profile.envelope.deny.includes(rule), `expected deny to include ${rule}`)
  }
})

test('AC3: resolveProfile against a registry that fails validateRegistry yields errors and no profile', () => {
  const { profile, errors } = resolveProfile(
    'reviewer-readonly',
    join(fixturesDir, 'reject-self-mod-guard.yaml'),
  )
  assert.equal(profile, undefined)
  assert.ok(errors.length > 0, 'expected at least one validation error')
})

test('AC3/AC6: dispatchWorktree rejects an unknown --profile with code 2 before any git call', () => {
  const result = dispatchWorktree({
    parcel: 'PX',
    profile: 'not-a-real-profile',
    path: join(tmpdir(), 'p3-should-never-be-created'),
    cwd: packageRoot,
  })
  assert.equal(result.code, 2)
  assert.ok(result.stderr.includes('unknown --profile'))
  assert.ok(!existsSync(join(tmpdir(), 'p3-should-never-be-created')))
})

// --- AC4: projection fidelity ---

test('AC4: reviewer-readonly projection denies Edit/Write + the ten rules; no allow/network/bypass', () => {
  const { profile } = resolveProfile('reviewer-readonly')
  assert.ok(profile)
  const projected = projectEnvelope(profile.envelope)
  const deny = projected.permissions.deny

  assert.ok(deny.includes('Edit'), 'bare Edit must be denied')
  assert.ok(deny.includes('Write'), 'bare Write must be denied')
  for (const rule of TEN_MUTATION_RULES) {
    assert.ok(deny.includes(rule), `expected deny to include ${rule}`)
  }
  assert.ok(!deny.includes('Bash'), 'bare Bash must NOT be denied (shell retained)')
  assert.ok(!deny.includes('PowerShell'), 'bare PowerShell must NOT be denied (shell retained)')

  // allow and network are documentation-only and must not appear.
  assert.ok(!('allow' in projected.permissions), 'allow must not be projected')
  assert.ok(!('network' in projected.permissions), 'network must not be projected')

  // bypassPermissions must never appear anywhere in the emitted artifact.
  assert.ok(!JSON.stringify(projected).includes('bypassPermissions'))
})

test('AC4: builder-standard projection denies force-push + .claude self-mod guard; does not deny bare Write', () => {
  const { profile } = resolveProfile('builder-standard')
  assert.ok(profile)
  const deny = projectEnvelope(profile.envelope).permissions.deny

  assert.ok(deny.includes('Bash(git push --force*)'))
  assert.ok(deny.includes('Bash(git push -f *)'))
  assert.ok(deny.includes('PowerShell(git push --force*)'))
  assert.ok(deny.includes('PowerShell(git push -f *)'))
  assert.ok(deny.includes('Edit(.claude/**)'))
  assert.ok(deny.includes('Write(.claude/**)'))
  assert.ok(!deny.includes('Write'), 'builder-standard must NOT deny the bare Write tool')
  assert.ok(!deny.includes('Edit'), 'builder-standard must NOT deny the bare Edit tool')
})

// --- AC5: worktree creation against a throwaway temp git repo ---

function makeTempRepo(): { base: string; repo: string } {
  const base = mkdtempSync(join(tmpdir(), 'p3-emitter-'))
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

test('AC5: dispatch-worktree creates the worktree + branch and writes settings.local.json (exit 0)', () => {
  const { base, repo } = makeTempRepo()
  try {
    const wt = join(base, 'wt-builder')
    const result = dispatchWorktree({
      parcel: 'PX',
      profile: 'builder-standard',
      path: wt,
      cwd: repo,
    })
    assert.equal(result.code, 0, result.stderr)

    // Worktree directory and settings file exist.
    assert.ok(existsSync(wt), 'worktree directory should exist')
    const settingsPath = join(wt, '.claude', 'settings.local.json')
    assert.ok(existsSync(settingsPath), 'settings.local.json should exist')

    // Branch is feat/foreman-line-PX.
    const head = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: wt,
      encoding: 'utf8',
    }).trim()
    assert.equal(head, branchForParcel('PX'))

    // Settings content matches the projected builder-standard envelope.
    const written = JSON.parse(readFileSync(settingsPath, 'utf8'))
    const { profile } = resolveProfile('builder-standard')
    assert.ok(profile)
    assert.deepEqual(written, projectEnvelope(profile.envelope))

    // Audit line names profile/branch/path and is NOT a DispatchOrder.
    assert.ok(result.stdout.includes('profile: builder-standard'))
    assert.ok(result.stdout.includes(`branch: ${branchForParcel('PX')}`))
    assert.ok(!result.stdout.includes('DispatchOrder'))
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('AC5: re-running against an already-existing --path exits 1 (no clobber)', () => {
  const { base, repo } = makeTempRepo()
  try {
    const wt = join(base, 'wt-exists')
    mkdirSync(wt) // pre-create the target path
    const result = dispatchWorktree({
      parcel: 'PY',
      profile: 'builder-standard',
      path: wt,
      cwd: repo,
    })
    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes('already exists'))
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('AC5: a pre-existing settings.local.json in a fresh worktree exits 1 (no overwrite)', () => {
  // Simulate the settings file already present by creating the worktree first,
  // seeding the file, then removing the worktree dir tracking is not needed —
  // we exercise the guard directly by pointing at a path whose .claude file
  // exists once the worktree is created. Since a fresh worktree cannot already
  // contain the untracked file, we assert the guard via a committed decoy:
  const { base, repo } = makeTempRepo()
  try {
    // Commit a .claude/settings.local.json into the branch base so the new
    // worktree checks it out and the no-overwrite guard fires.
    mkdirSync(join(repo, '.claude'), { recursive: true })
    writeFileSync(join(repo, '.claude', 'settings.local.json'), '{"decoy":true}\n', 'utf8')
    execFileSync('git', ['add', '-f', '.claude/settings.local.json'], { cwd: repo })
    execFileSync('git', ['commit', '-q', '-m', 'decoy settings'], { cwd: repo })

    const wt = join(base, 'wt-decoy')
    const result = dispatchWorktree({
      parcel: 'PZ',
      profile: 'builder-standard',
      path: wt,
      cwd: repo,
    })
    assert.equal(result.code, 1)
    assert.ok(result.stderr.includes('refusing to overwrite'))
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})

test('AC6: dispatchWorktree returns 1 on a registry-integrity failure (before any git call)', () => {
  const { base, repo } = makeTempRepo()
  try {
    const wt = join(base, 'wt-badreg')
    const result = dispatchWorktree({
      parcel: 'PB',
      profile: 'reviewer-readonly',
      path: wt,
      cwd: repo,
      registryPath: join(fixturesDir, 'reject-self-mod-guard.yaml'),
    })
    assert.equal(result.code, 1)
    assert.ok(result.stderr.length > 0)
    // Fail-fast: no worktree was created.
    assert.ok(!existsSync(wt), 'no git state should exist after a bad-registry stop')
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
})
