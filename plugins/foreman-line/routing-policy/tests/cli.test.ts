/**
 * AC6: the `validate <path>` CLI's exit-code contract, exercised as a real
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

test('exit 0 on the shipped valid policy', () => {
  const { status, stderr } = runCli(['validate', 'routing-policy.yaml'])
  assert.equal(status, 0, stderr)
})

test('exit 1 on classification-gate rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-classification-gate.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('data_classification.restricted'))
})

test('exit 1 on role-pinning rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-role-pinning.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('roles.coordinator'))
})

test('exit 1 on security-override rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-security-override.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('security_flavored but allowlist contains non-frontier tier'))
})

test('exit 1 on security-override derived-guard rejecting fixture, violation on stderr', () => {
  const { status, stderr } = runCli([
    'validate',
    join(fixturesDir, 'reject-security-undeclared.yaml'),
  ])
  assert.equal(status, 1)
  assert.ok(stderr.includes('looks security/audit-flavored by name'))
})

test('exit 1 on ceiling-missing rejecting fixture', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-ceiling-missing.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on ceiling-zero rejecting fixture', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-ceiling-zero.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

test('exit 1 on the purely structural rejecting fixture, lists every violation (not just the first)', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-structural.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('roles'))
})

test('exit 1 lists every violation, not just the first, on a multiply-invalid document', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-multiple.yaml')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('roles.coordinator'))
  assert.ok(stderr.includes('security_flavored but allowlist contains non-frontier tier'))
})

test('exit 1 lists violations from BOTH the schema layer and the semantic layer together, no short-circuit (Nit 1)', () => {
  const { status, stderr } = runCli(['validate', join(fixturesDir, 'reject-both.yaml')])
  assert.equal(status, 1)
  // Schema-layer violation: the required top-level `roles` property is missing.
  assert.ok(stderr.includes('roles'), `expected a schema violation naming 'roles', got: ${stderr}`)
  // Semantic-layer violation: security-override, independent of `roles` being present.
  assert.ok(
    stderr.includes('security_flavored but allowlist contains non-frontier tier'),
    `expected a semantic-invariant violation, got: ${stderr}`,
  )
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
  const { status } = runCli(['explain', 'routing-policy.yaml'])
  assert.equal(status, 2)
})
