/**
 * AC7: the `validate <path>` CLI's exit-code contract, exercised as a real
 * subprocess against the local `tsx` entry script (not an in-process import)
 * so the actual entry point — argv parsing, file I/O, stderr — is what's
 * under test. Same pattern as W0-P3/W0-P4's cli.test.ts.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturesDir = join(packageRoot, 'tests', 'fixtures')
const repoRoot = join(packageRoot, '..', '..', '..')
const doneDir = join(repoRoot, 'plugins', 'foreman-line', 'docs', 'specs', 'done')
// The real `tsx` entry script (not the .cmd/.sh shim), so it can be invoked
// directly via `node` with no shell — avoids Node's shell-argument-escaping
// security warning entirely.
const tsxCli = join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')

function runCli(args: readonly string[]): {
  status: number | null
  stderr: string
  stdout: string
} {
  const result = spawnSync(process.execPath, [tsxCli, 'src/cli.ts', ...args], {
    cwd: packageRoot,
    encoding: 'utf8',
  })
  return { status: result.status, stderr: result.stderr, stdout: result.stdout }
}

// Exit 0 -------------------------------------------------------------------

test('exit 0 on a single valid spec file', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'valid-spec.md')])
  assert.equal(status, 0, stderr)
})

test('exit 0 (with advisory warning) on all four shipped docs/specs/done specs, directory mode', () => {
  const { status, stderr } = runCli(['validate', doneDir])
  assert.equal(status, 0, stderr)
})

test('exit 0 unaffected by advisory warnings; W0-P1 vocabulary warning appears on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(doneDir, 'W0-P1-pipeline-stage-contracts.md'),
  ])
  assert.equal(status, 0)
  assert.ok(stderr.includes('does not begin with a known vocabulary prefix'))
})

// Exit 1 --------------------------------------------------------------------

test('exit 1 on AC6a rejecting fixture (bad risk), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-risk.md')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('risk'))
})

test('exit 1 on AC6b rejecting fixture (bad routing_class), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-routing-class.md')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('routing_class'))
})

test('exit 1 on AC6c rejecting fixture (empty surfaces), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-surfaces-empty.md')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('surfaces'))
})

test('exit 1 on AC6d rejecting fixture (whitespace permission_profile), violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-permission-profile-whitespace.md'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('permission_profile'))
})

test('exit 1 on AC6d rejecting fixture (unregistered permission_profile name), violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-permission-profile-unknown.md'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('permission_profile'))
})

test('exit 1 on AC6e rejecting fixture (bad status), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-status.md')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('status'))
})

test('exit 1 on AC6f rejecting fixture (superseded with null superseded_by), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-superseded-null.md')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('superseded_by'))
})

test('exit 1 on permission_profile: null fixture (explicit null, distinct from absent)', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'permission-profile-null.md')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('permission_profile'))
})

test('exit 1 lists every violation, not just the first', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-risk.md')])
  assert.equal(status, 1)
  // reject-risk.md is only invalid on one field, but this proves the CLI
  // writes every entry in `result.errors` to stderr, not just the first.
  const lines = stderr
    .trim()
    .split('\n')
    .filter((l) => l.length > 0)
  assert.ok(lines.length >= 1)
})

// permission_profile warning behavior ---------------------------------------

test('permission_profile warning: absent -> exit 0 + exactly one advisory warning on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'valid-spec-no-perm.md')])
  assert.equal(status, 0)
  const warningLines = stderr.split('\n').filter((l) => l.includes('permission_profile is absent'))
  assert.equal(warningLines.length, 1)
})

test('--no-permission-profile-warning fully suppresses the advisory with no other side effects', () => {
  const { status, stderr } = runCli([
    'validate',
    '--no-permission-profile-warning',
    join(fixturesDir, 'valid-spec-no-perm.md'),
  ])
  assert.equal(status, 0)
  assert.ok(!stderr.includes('permission_profile is absent'))
})

test('permission_profile: null -> exit 1 (rejected, not warned)', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'permission-profile-null.md')])
  assert.equal(status, 1)
  assert.ok(!stderr.includes('permission_profile is absent'))
})

// surfaces vocabulary warning behavior ----------------------------------------

test('surfaces vocabulary warning: unknown prefix -> advisory warning on stderr, exit 0', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'valid-spec-unknown-surface.md'),
  ])
  assert.equal(status, 0)
  assert.ok(stderr.includes('does not begin with a known vocabulary prefix'))
})

test('surfaces vocabulary warning: known prefix -> no warning', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'valid-spec.md')])
  assert.equal(status, 0)
  assert.ok(!stderr.includes('does not begin with a known vocabulary prefix'))
})

// Grandfather scoping (CLOSE-P2 rework R1a, CLI-level) -------------------------

test('R1a regression: grandfathered basename in a NON-done/ scratch dir -> exit 1 (no waiver)', () => {
  const scratchDir = mkdtempSync(join(tmpdir(), 'spec-linter-scratch-'))
  const probeFile = join(scratchDir, 'P1-permission-profile-registry-schema.md')
  writeFileSync(
    probeFile,
    [
      '---',
      'ticket: KONE-PROBE',
      'title: reviewer probe replica',
      'status: done',
      'owner: clinton.morgan',
      'created: 2026-07-28',
      'updated: 2026-07-28',
      'risk: standard',
      'surfaces: [docs/]',
      'routing_class: standard-feature',
      'permission_profile: builder',
      '---',
      'probe',
      '',
    ].join('\n'),
    'utf8',
  )
  try {
    const { status, stderr } = runCli(['validate', probeFile])
    assert.equal(status, 1)
    assert.ok(stderr.includes('permission_profile'))
    assert.ok(!stderr.includes('grandfathered'))
  } finally {
    rmSync(scratchDir, { recursive: true, force: true })
  }
})

// Exit 2 ----------------------------------------------------------------------

test('exit 2 on a missing path', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'does-not-exist.md')])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on a directory containing no .md files', () => {
  const emptyDir = mkdtempSync(join(tmpdir(), 'spec-linter-empty-'))
  writeFileSync(join(emptyDir, 'not-markdown.txt'), 'no markdown here\n', 'utf8')
  try {
    const { status, stderr } = runCli(['validate', emptyDir])
    assert.equal(status, 2)
    assert.ok(stderr.includes('no .md files'))
  } finally {
    rmSync(emptyDir, { recursive: true, force: true })
  }
})

test('exit 2 on a missing path argument', () => {
  const { status } = runCli(['validate'])
  assert.equal(status, 2)
})

test('exit 2 on an unknown command', () => {
  const { status } = runCli(['explain', join(fixturesDir, 'valid-spec.md')])
  assert.equal(status, 2)
})

// Directory mode: recursion ----------------------------------------------------

test('directory mode: validates every .md file found recursively, propagating exit 1 if any fails', () => {
  const { status, stderr } = runCli(['validate', fixturesDir])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})
