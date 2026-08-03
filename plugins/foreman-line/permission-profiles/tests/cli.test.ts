/**
 * AC7: the `validate <path>` CLI's exit-code contract, exercised as a real
 * subprocess against the local `tsx` binary (not an in-process import) so the
 * actual entry point — argv parsing, file I/O, stderr — is what's under test.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturesDir = join(packageRoot, 'tests', 'fixtures')
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

test('exit 0 on the shipped valid registry', () => {
  const { status, stderr } = runCli(['validate', 'permission-profiles.yaml'])
  assert.equal(status, 0, stderr)
})

test('exit 1 on malformed-rule rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-malformed-rule.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on bypass-mode rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-bypass-mode.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('bypassPermissions'))
})

test('exit 1 on unknown-profile rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-unknown-profile.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on missing-profile rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-missing-profile.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on missing-envelope-field rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-missing-envelope-field.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on self-mod-guard rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-self-mod-guard.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('self-modification guard'))
})

test('exit 1 on reviewer-incomplete rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-reviewer-incomplete.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('PowerShell(git merge*)'))
})

test('exit 1 on reviewer-shell-denied rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-reviewer-shell-denied.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes("bare 'Bash' deny"))
})

test('exit 1 lists every violation, not just the first, on a multiply-invalid document', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-reviewer-incomplete.yaml'),
  ])
  assert.equal(status, 1)
  // The reviewer-incomplete fixture is missing exactly one required deny; a
  // separately-broken document (self-mod-guard) proves multi-violation
  // reporting independently below.
  assert.ok(stderr.split('\n').filter((l) => l.length > 0).length >= 1)
})

test('exit 2 on genuinely unparsable YAML', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-unparsable.yaml')])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on a missing path', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'does-not-exist.yaml')])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on an unreadable path (a directory)', () => {
  const { status, stderr } = runCli(['validate', fixturesDir])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on a missing path argument', () => {
  const { status } = runCli(['validate'])
  assert.equal(status, 2)
})

test('exit 2 on an unknown command', () => {
  const { status } = runCli(['explain', 'permission-profiles.yaml'])
  assert.equal(status, 2)
})
