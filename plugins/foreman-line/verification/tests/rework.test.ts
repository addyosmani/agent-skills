/**
 * W3-P1 rework-cycle tests (adversarial findings RF-1..RF-4, RF-6). Each test
 * names the AC it extends per the named-test convention:
 *   RF-1 → AC-6  (BuildResult subject validation error routing)
 *   RF-2 → AC-5  (chain-source consistency in recordBuildResult)
 *   RF-3 → AC-13 (workflowId UUID guard before any filesystem access)
 *   RF-4 → AC-5/AC-10 (exclusive-write guard — never overwrite a receipt)
 *   RF-6 → AC-8  (duplicate/gapped AC labels are SPEC_INVALID, not deduped)
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { writeClaimReceipt } from '../src/harness/index.js'
import type { HarnessInput } from '../src/index.js'
import { allocateSequence, recordBuildResult, runHarness, VerificationError } from '../src/index.js'
import { makeOrder, makeTempRepoRoot, mintStageCReceipt, passCheck, writeSpec } from './helpers.js'

function makeHarnessInput(repoRoot: string, workflowId: string, specPath: string): HarnessInput {
  const surfaces = ['plugins/foreman-line/verification/src/index.ts']
  return {
    workflowId,
    order: makeOrder(),
    buildResult: { branch: 'feat/test', commitShas: ['abc1234'], touchedSurfaces: surfaces },
    specPath,
    testResults: { passed: ['AC-1: covered'], failed: [] },
    matrixChecks: { 'test-coverage.check': passCheck },
    repoRoot,
  }
}

// ─── RF-2 → AC-5: chain-source consistency guard ─────────────────────────────

test('AC-5 (RF-2): a stale dispatchReceiptLocator whose hash is no longer the chain tip raises CHAIN_TIP_MISMATCH', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    // The chain advances past the dispatch receipt (a later receipt exists),
    // so writing prevHash = dispatch hash would fork the chain.
    const dir = join(repoRoot, 'docs', 'receipts', workflowId)
    writeFileSync(join(dir, '000001-D-build-result.json'), JSON.stringify({ hash: 'f'.repeat(64) }))
    assert.throws(
      () => recordBuildResult(workflowId, stageC.locator, 'feat/x', ['abc1234'], ['x'], repoRoot),
      (err: unknown) => err instanceof VerificationError && err.code === 'CHAIN_TIP_MISMATCH',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test("AC-5 (RF-2): an adversarial locator naming another workflow's receipt raises CHAIN_TIP_MISMATCH", () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const otherWorkflowId = randomUUID()
    mintStageCReceipt(repoRoot, workflowId)
    const foreign = mintStageCReceipt(repoRoot, otherWorkflowId)
    // Readable receipt, but it is not this workflow's chain tip.
    assert.throws(
      () => recordBuildResult(workflowId, foreign.locator, 'feat/x', ['abc1234'], ['x'], repoRoot),
      (err: unknown) => err instanceof VerificationError && err.code === 'CHAIN_TIP_MISMATCH',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── RF-3 → AC-13: workflowId UUID guard before any filesystem access ────────

test('AC-13 (RF-3): traversal workflowId fails loud with WORKFLOW_ID_INVALID in allocateSequence before any filesystem access', () => {
  // repoRoot deliberately does not exist: if the guard ran after filesystem
  // access we would see SEQUENCE_READ_FAILED/ENOENT semantics instead.
  const bogusRoot = join(makeTempRepoRoot({ matrix: false }), 'does-not-exist')
  assert.throws(
    () => allocateSequence('../../..', bogusRoot),
    (err: unknown) => err instanceof VerificationError && err.code === 'WORKFLOW_ID_INVALID',
  )
})

test('AC-13 (RF-3): traversal workflowId fails loud with WORKFLOW_ID_INVALID in recordBuildResult', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    assert.throws(
      () => recordBuildResult('../../..', stageC.locator, 'feat/x', ['abc1234'], ['x'], repoRoot),
      (err: unknown) => err instanceof VerificationError && err.code === 'WORKFLOW_ID_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-13 (RF-3): traversal workflowId fails loud with WORKFLOW_ID_INVALID in runHarness before the spec is read', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    // specPath is unreadable on purpose: the workflowId guard must fire first.
    const input = makeHarnessInput(repoRoot, '../../..', join(repoRoot, 'missing-spec.md'))
    await assert.rejects(
      runHarness(input),
      (err: unknown) => err instanceof VerificationError && err.code === 'WORKFLOW_ID_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── RF-4 → AC-5/AC-10: exclusive-write guard ─────────────────────────────────
// The guard defends the allocate→write window (a file appearing at the target
// path after allocation — concurrent writer or tampering). Fixture planting
// through the public API trips the chain-tip scan first, so the guard is
// tested at the writer itself.

test('AC-5 AC-10 (RF-4): writeClaimReceipt raises RECEIPT_EXISTS for a pre-existing file at the allocated sequence path and never overwrites it', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    const dir = join(repoRoot, 'docs', 'receipts', workflowId)
    const targetPath = join(dir, '000001-D-build-result.json')
    const planted = '"planted — must not be overwritten"'
    writeFileSync(targetPath, planted)
    assert.throws(
      () =>
        writeClaimReceipt({
          workflowId,
          repoRoot,
          claimRef: 'build-result',
          subjectKind: 'BuildResult',
          subject: { branch: 'feat/x', commitShas: ['abc1234'], touchedSurfaces: ['x'] },
          sequence: 1,
          prevHash: stageC.hash,
          correlation: {
            ...stageC.correlation,
            sessionId: randomUUID(),
            runId: randomUUID(),
          } as Parameters<typeof writeClaimReceipt>[0]['correlation'],
        }),
      (err: unknown) => err instanceof VerificationError && err.code === 'RECEIPT_EXISTS',
    )
    assert.equal(readFileSync(targetPath, 'utf8'), planted, 'pre-existing file is untouched')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── RF-6 → AC-8: duplicate/gapped AC labels fail loud ───────────────────────

test('AC-8 (RF-6): duplicate AC-N labels in the spec raise SPEC_INVALID instead of being silently deduped', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    recordBuildResult(workflowId, stageC.locator, 'feat/x', ['abc1234'], ['x'], repoRoot)
    const specPath = writeSpec(
      repoRoot,
      ['AC-1: first criterion', 'AC-2: second criterion', 'AC-2: duplicated label'].join('\n'),
    )
    await assert.rejects(
      runHarness(makeHarnessInput(repoRoot, workflowId, specPath)),
      (err: unknown) => err instanceof VerificationError && err.code === 'SPEC_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-8 (RF-6): gapped (non-sequential) AC-N labels raise SPEC_INVALID per AC-CONVENTION §2', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    recordBuildResult(workflowId, stageC.locator, 'feat/x', ['abc1234'], ['x'], repoRoot)
    const specPath = writeSpec(
      repoRoot,
      ['AC-1: first criterion', 'AC-3: gapped — AC-2 is missing'].join('\n'),
    )
    await assert.rejects(
      runHarness(makeHarnessInput(repoRoot, workflowId, specPath)),
      (err: unknown) => err instanceof VerificationError && err.code === 'SPEC_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-8 (RF-6): labels not starting at AC-1 raise SPEC_INVALID', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    recordBuildResult(workflowId, stageC.locator, 'feat/x', ['abc1234'], ['x'], repoRoot)
    const specPath = writeSpec(repoRoot, 'AC-2: starts at two')
    await assert.rejects(
      runHarness(makeHarnessInput(repoRoot, workflowId, specPath)),
      (err: unknown) => err instanceof VerificationError && err.code === 'SPEC_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
