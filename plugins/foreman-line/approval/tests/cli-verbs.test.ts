/**
 * AC7: CLI verb + exit-code contract, exercised as a real subprocess (not an
 * in-process import) so the actual entry point - argv parsing, TTY check,
 * file I/O - is what's under test. `show` renders read-only and mints
 * nothing (exercisable non-interactively); `approve` on non-TTY stdin
 * refuses with exit code 2 and writes nothing (asserted by absence on
 * disk); `reject` records a rejection with a reason and mints no receipt.
 * A grep asserts there is no `--yes`/`--force`/auto-approve flag anywhere.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { approvalRecordPath } from '../src/approval-record.js'
import {
  makeTempRepoRoot,
  writeProjectedFixture,
  writeShapingResultFixture,
  writeSpecDraft,
} from './helpers.js'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const tsxCli = join(packageRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs')

function runCli(
  args: readonly string[],
  input = '',
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, 'src/cli.ts', ...args], {
    cwd: packageRoot,
    encoding: 'utf8',
    input,
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function projectedFixtureRepo(): string {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeProjectedFixture(repoRoot, 'example', {
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/example.md'],
    epics: [
      {
        key: 'epic-example',
        title: 'Example Epic',
        stories: [{ key: 'example', title: 'Example' }],
      },
    ],
  })
  return repoRoot
}

// --- show: exit 0, read-only, mints nothing, safe non-interactively ---

test('show: exit 0, renders the Epic/Story tree, mints nothing', () => {
  const repoRoot = projectedFixtureRepo()
  const { status, stdout, stderr } = runCli(['show', 'example', '--repo-root', repoRoot])
  assert.equal(status, 0, stderr)
  assert.ok(stdout.includes('epic-example'))
  assert.ok(stdout.includes('Example Epic'))
  assert.equal(existsSync(join(repoRoot, 'docs', 'receipts')), false)
  assert.equal(existsSync(approvalRecordPath('example', repoRoot)), false)
})

test('show: exit 2 on a missing artifact with no --epic-title to project one', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeShapingResultFixture(repoRoot, 'example', [
    'plugins/foreman-line/docs/specs/active/example.md',
  ])
  const { status } = runCli(['show', 'example', '--repo-root', repoRoot])
  assert.equal(status, 2)
})

// --- approve: non-TTY refuses, exit 2, writes nothing ---

test('approve: non-TTY stdin refuses with exit 2 and writes NEITHER a receipt NOR an approval record', () => {
  const repoRoot = projectedFixtureRepo()
  const { status, stderr } = runCli([
    'approve',
    'example',
    '--repo-root',
    repoRoot,
    '--approver',
    'clinton.morgan',
  ])
  assert.equal(status, 2)
  assert.ok(stderr.length > 0)
  assert.equal(existsSync(join(repoRoot, 'docs', 'receipts')), false)
  assert.equal(existsSync(approvalRecordPath('example', repoRoot)), false)
})

test('approve: missing --approver refuses with exit 2 before any TTY check, writes nothing', () => {
  const repoRoot = projectedFixtureRepo()
  const { status } = runCli(['approve', 'example', '--repo-root', repoRoot])
  assert.equal(status, 2)
  assert.equal(existsSync(join(repoRoot, 'docs', 'receipts')), false)
  assert.equal(existsSync(approvalRecordPath('example', repoRoot)), false)
})

// --- reject: records a rejection, mints no receipt ---

test('reject: exit 0, writes a rejection record with a reason, mints no receipt', () => {
  const repoRoot = projectedFixtureRepo()
  const { status, stdout, stderr } = runCli([
    'reject',
    'example',
    '--repo-root',
    repoRoot,
    '--reason',
    'not ready yet',
  ])
  assert.equal(status, 0, stderr)
  assert.ok(stdout.includes('rejected'))
  assert.equal(existsSync(join(repoRoot, 'docs', 'receipts')), false)
  assert.equal(existsSync(approvalRecordPath('example', repoRoot)), false)

  const rejectionPath = join(
    repoRoot,
    'plugins',
    'foreman-line',
    'docs',
    'specs',
    'active',
    'example.rejection.json',
  )
  assert.ok(existsSync(rejectionPath))
  const parsed = JSON.parse(readFileSync(rejectionPath, 'utf8'))
  assert.equal(parsed.decision, 'rejected')
  assert.equal(parsed.reason, 'not ready yet')
})

// --- usage errors ---

test('exit 2 on a missing slug|path argument', () => {
  const { status } = runCli(['show'])
  assert.equal(status, 2)
})

test('exit 2 on an unknown command', () => {
  const { status } = runCli(['explain', 'example'])
  assert.equal(status, 2)
})

// --- no auto-approve escape hatch anywhere in the package ---

test('no --yes/--force/auto-approve flag of any kind appears anywhere in the package sources', () => {
  // Scoped to code, not prose: doc comments in cli.ts name these strings
  // (`` `--yes`/`--force`/auto-approve ``) to document that they are banned,
  // which would otherwise self-trigger a false positive. Strip block and
  // line comments before scanning.
  const pattern = /--yes|--force|auto-?approve/i
  const files = collectTsFiles(join(packageRoot, 'src'))
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const code = text.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    assert.equal(
      pattern.test(code),
      false,
      `${file} references a banned auto-approve escape hatch in code`,
    )
  }
})

function collectTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectTsFiles(full))
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}
