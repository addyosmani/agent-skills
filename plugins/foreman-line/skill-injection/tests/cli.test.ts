/**
 * AC6: the `validate <path>` CLI's exit-code contract, exercised as a real
 * subprocess against the local `tsx` binary (not an in-process import) so
 * the actual entry point — argv parsing, file I/O, stderr — is what's under
 * test. Output is captured in full before `status` is read (defects_lessons
 * #11 — never truncate a pipeline whose exit code is under test).
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

test('exit 0 on the shipped valid matrix', () => {
  const { status, stderr } = runCli(['validate', 'skill-injection.yaml'])
  assert.equal(status, 0, stderr)
})

test('exit 1 on missing-top-level-key rejecting fixture (AC3a), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-missing-toplevel.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('verifier_harness'))
})

test('exit 1 on unknown-top-level-key rejecting fixture (AC3b), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-unknown-toplevel.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on malformed-glob-key rejecting fixture (AC3c), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-bad-glob.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('/builder'))
})

test('exit 1 on unknown-nested-key rejecting fixture (AC3d), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-unknown-nested.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('/coordinator'))
})

test('exit 1 on empty-glob-array rejecting fixture (AC4b), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-empty-glob-array.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('/builder'))
})

test('exit 1 on empty coordinator.rework_first rejecting fixture (AC4c), violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-empty-rework-first.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('rework_first'))
})

test('exit 1 on empty integration.jira rejecting fixture (AC4c), violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-empty-jira.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('jira'))
})

test('exit 1 on whitespace-only skill name rejecting fixture (AC4d), violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-whitespace-skill-name.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('/adversarial_reviewer'))
})

test('exit 1 lists every violation, not just the first, on a multiply-invalid document', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-multiple-violations.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(
    stderr.includes('verifier_harness'),
    `expected verifier_harness violation, got: ${stderr}`,
  )
  assert.ok(stderr.includes('/builder'), `expected a /builder glob violation, got: ${stderr}`)
})

test('exit 2 on a duplicated top-level key (AC4e), a parse-time failure', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-duplicate-top-level.yaml'),
  ])
  assert.equal(status, 2)
  assert.ok(/unique/i.test(stderr), `expected a duplicate-key message, got: ${stderr}`)
})

test('exit 2 on a duplicated nested glob key (AC4e), a parse-time failure', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-duplicate-nested-key.yaml'),
  ])
  assert.equal(status, 2)
  assert.ok(/unique/i.test(stderr), `expected a duplicate-key message, got: ${stderr}`)
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
  const { status } = runCli(['evaluate', 'skill-injection.yaml'])
  assert.equal(status, 2)
})
