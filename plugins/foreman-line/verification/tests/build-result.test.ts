/**
 * W3-P1 Stage-C→D bridge + sequence-allocator tests: AC-5, AC-6, AC-7, and the
 * recordBuildResult/allocateSequence failure boundaries of AC-13.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateReceiptDocument } from '../../receipts/src/index.js'
import { allocateSequence, recordBuildResult, VerificationError } from '../src/index.js'
import { makeTempRepoRoot, mintStageCReceipt, readReceipt } from './helpers.js'

const FAKE_HASH_A = 'a'.repeat(64)
const FAKE_HASH_B = 'b'.repeat(64)
const FAKE_HASH_C = 'c'.repeat(64)

// ─── AC-5: recordBuildResult writes the BuildResult bridge sub-receipt ───────

test('AC-5: recordBuildResult writes a schema-valid Stage-D BuildResult claim receipt and returns its locator', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    const locator = recordBuildResult(
      workflowId,
      stageC.locator,
      'feat/foreman-line-TEST',
      ['abc1234', 'def5678'],
      ['plugins/foreman-line/verification/src/index.ts'],
      repoRoot,
    )
    assert.equal(locator, `docs/receipts/${workflowId}/000001-D-build-result.json`)

    const doc = readReceipt(repoRoot, locator)
    assert.equal(doc.kind, 'claim')
    assert.equal(doc.stage, 'D')
    assert.equal(doc.claimRef, 'build-result')
    assert.equal(doc.subjectKind, 'BuildResult')
    assert.deepEqual(doc.subject, {
      branch: 'feat/foreman-line-TEST',
      commitShas: ['abc1234', 'def5678'],
      touchedSurfaces: ['plugins/foreman-line/verification/src/index.ts'],
    })
    assert.equal(doc.prevHash, stageC.hash, 'prevHash is the Stage-C receipt hash (ruling F4)')
    assert.equal(doc.sequence, 1)
    assert.equal(doc.signature, null)

    const correlation = doc.correlation as Record<string, unknown>
    assert.equal(correlation.workflowId, stageC.correlation.workflowId)
    assert.equal(correlation.correlationId, stageC.correlation.correlationId)
    assert.notEqual(correlation.sessionId, stageC.correlation.sessionId, 'fresh sessionId')
    assert.notEqual(correlation.runId, stageC.correlation.runId, 'fresh runId')

    const validation = validateReceiptDocument(doc)
    assert.ok(validation.valid, `receiptDocumentSchema-valid: ${validation.errors.join('; ')}`)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-6: subject validated against the frozen buildResultSchema ────────────

test('AC-6: recordBuildResult rejects an invalid BuildResult subject (empty branch) with BUILD_RESULT_INVALID (RF-1)', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    // RF-1: a pre-write schema failure is BUILD_RESULT_INVALID (builder emitted
    // an invalid BuildResult; routes to rework), never RECEIPT_WRITE_FAILED
    // (disk/infra failure; routes to retry).
    assert.throws(
      () => recordBuildResult(workflowId, stageC.locator, '', ['abc1234'], ['x'], repoRoot),
      (err: unknown) => err instanceof VerificationError && err.code === 'BUILD_RESULT_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-7: allocateSequence disk-scan semantics ───────────────────────────────

function receiptsDirFor(repoRoot: string, workflowId: string): string {
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  mkdirSync(dir, { recursive: true })
  return dir
}

test('AC-7: allocateSequence returns highest+1 and the highest receipt hash from a 000000..000002 chain', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const dir = receiptsDirFor(repoRoot, workflowId)
    writeFileSync(join(dir, '000000-A-shaping-result.json'), JSON.stringify({ hash: FAKE_HASH_A }))
    writeFileSync(join(dir, '000001-B-registration.json'), JSON.stringify({ hash: FAKE_HASH_B }))
    writeFileSync(join(dir, '000002-C-dispatch-order.json'), JSON.stringify({ hash: FAKE_HASH_C }))
    assert.deepEqual(allocateSequence(workflowId, repoRoot), {
      sequence: 3,
      prevHash: FAKE_HASH_C,
    })
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-7: allocateSequence ignores non-conforming files such as skill-injection.json', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const dir = receiptsDirFor(repoRoot, workflowId)
    writeFileSync(join(dir, '000000-C-dispatch-order.json'), JSON.stringify({ hash: FAKE_HASH_A }))
    writeFileSync(join(dir, 'skill-injection.json'), JSON.stringify({ role: 'builder' }))
    writeFileSync(join(dir, '999999-Z-not-a-stage.json'), JSON.stringify({ hash: FAKE_HASH_B }))
    writeFileSync(join(dir, 'notes.txt'), 'not a receipt')
    assert.deepEqual(allocateSequence(workflowId, repoRoot), {
      sequence: 1,
      prevHash: FAKE_HASH_A,
    })
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-7: allocateSequence on an empty directory yields sequence 0 and null prevHash', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    receiptsDirFor(repoRoot, workflowId)
    assert.deepEqual(allocateSequence(workflowId, repoRoot), { sequence: 0, prevHash: null })
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-13: bridge/allocator failure boundaries rethrow VerificationError ────

test('AC-13: unreadable dispatch receipt raises DISPATCH_RECEIPT_UNREADABLE', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    assert.throws(
      () =>
        recordBuildResult(
          workflowId,
          `docs/receipts/${workflowId}/000000-C-dispatch-order.json`,
          'feat/x',
          ['abc1234'],
          ['x'],
          repoRoot,
        ),
      (err: unknown) =>
        err instanceof VerificationError && err.code === 'DISPATCH_RECEIPT_UNREADABLE',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-13: dispatch receipt that is not valid JSON raises DISPATCH_RECEIPT_UNREADABLE', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const dir = receiptsDirFor(repoRoot, workflowId)
    writeFileSync(join(dir, '000000-C-dispatch-order.json'), '{not json')
    assert.throws(
      () =>
        recordBuildResult(
          workflowId,
          `docs/receipts/${workflowId}/000000-C-dispatch-order.json`,
          'feat/x',
          ['abc1234'],
          ['x'],
          repoRoot,
        ),
      (err: unknown) =>
        err instanceof VerificationError && err.code === 'DISPATCH_RECEIPT_UNREADABLE',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-13: unparseable highest-sequence receipt raises SEQUENCE_READ_FAILED', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const dir = receiptsDirFor(repoRoot, workflowId)
    writeFileSync(join(dir, '000000-C-dispatch-order.json'), '{broken json')
    assert.throws(
      () => allocateSequence(workflowId, repoRoot),
      (err: unknown) => err instanceof VerificationError && err.code === 'SEQUENCE_READ_FAILED',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-13: a non-UUID workflowId fails loud at entry with WORKFLOW_ID_INVALID (RF-3)', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const workflowId = randomUUID()
    const stageC = mintStageCReceipt(repoRoot, workflowId)
    // RF-3: 'not-a-uuid' now fails the entry guard before any filesystem access
    // (previously it only failed deep inside the write boundary).
    assert.throws(
      () => recordBuildResult('not-a-uuid', stageC.locator, 'feat/x', ['abc1234'], ['x'], repoRoot),
      (err: unknown) => err instanceof VerificationError && err.code === 'WORKFLOW_ID_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
