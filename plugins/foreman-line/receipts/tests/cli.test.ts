/**
 * AC9: the `validate <path>` CLI's exit-code contract, exercised as a real
 * subprocess (not an in-process import) so the actual entry point — argv
 * parsing, file/directory I/O, stderr — is what's under test.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturesDir = join(packageRoot, 'tests', 'fixtures')
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

function fixture(name: string): string {
  return join(fixturesDir, name)
}

// --- exit 0 ---

test('exit 0 on a valid single receipt', () => {
  const { status, stderr } = runCli(['validate', fixture('hash-vector-genesis.json')])
  assert.equal(status, 0, stderr)
})

test('exit 0 on a valid chain directory', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-sealed')])
  assert.equal(status, 0, stderr)
})

// --- exit 1: AC3 schema-layer rejecting fixtures ---

test('exit 1 on a schema violation, every violation listed on stderr', () => {
  const { status, stderr } = runCli(['validate', fixture('reject-unknown-field.json')])
  assert.equal(status, 1)
  assert.ok(stderr.length > 0)
})

// --- exit 1: AC4 single-document semantic-invariant rejecting fixtures ---

test('exit 1 on AC4a claimRef/kind violation', () => {
  const { status, stderr } = runCli(['validate', fixture('reject-claimref-stage-nonnull.json')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('claimRef'))
})

test('exit 1 on AC4b prevHash/genesis violation', () => {
  const { status, stderr } = runCli(['validate', fixture('reject-genesis-nonnull-prevhash.json')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('prevHash'))
})

// --- exit 1: AC5 chain-level rejecting fixtures ---

test('exit 1 on AC5a sequence-gap chain, every violation listed on stderr', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-reject-sequence-gap')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('sequence values must be exactly'))
})

test('exit 1 on AC5b prevHash-pointer-mismatch chain', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-reject-prevhash-mismatch')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('does not match'))
})

test('exit 1 on AC5c correlation-mismatch chain', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-reject-correlation-mismatch')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('diverges'))
})

// --- exit 1: AC5d malformed-chain-member robustness (rework amendment) ---

test('AC5d: exit 1 on a chain containing a scalar-JSON member — violations on stderr, no stack trace', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-reject-scalar-member')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('must be object'), stderr)
  assert.ok(!stderr.includes('TypeError'), stderr)
})

test('AC5d: exit 1 on a chain member with null correlation — violations on stderr, no stack trace', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-reject-null-correlation')])
  assert.equal(status, 1)
  assert.ok(stderr.includes('correlation'), stderr)
  assert.ok(stderr.includes('must be object'), stderr)
  assert.ok(!stderr.includes('TypeError'), stderr)
})

// --- exit 2: usage errors ---

test('exit 2 on a missing path', () => {
  const { status, stderr } = runCli(['validate', fixture('does-not-exist.json')])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on an unreadable file (malformed JSON)', () => {
  const { status, stderr } = runCli(['validate', fixture('malformed.json')])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on an empty chain directory (Step 0 ratification)', () => {
  const { status, stderr } = runCli(['validate', fixture('chain-empty')])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
})

test('exit 2 on a missing path argument', () => {
  const { status } = runCli(['validate'])
  assert.equal(status, 2)
})

test('exit 2 on an unknown command', () => {
  const { status } = runCli(['explain', fixture('hash-vector-genesis.json')])
  assert.equal(status, 2)
})
