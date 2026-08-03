/**
 * W4-P1 ACs 2-7 — Stage-E `ReceiptDocument` emitter.
 *
 * Coverage:
 *   AC2: signature + inheritance — correlationId/workflowId inherited from
 *        the prior Stage-D receipt; sessionId/runId freshly minted.
 *   AC3: fail-loud on a bad prior receipt (missing/empty/whitespace/non-string
 *        correlationId) — never falls back to minting a fresh correlationId.
 *   AC4: sequence = prior.sequence + 1; prevHash = prior.hash; hash =
 *        sha256Hex(canonicalize(draft)); validateReceiptDocument().valid;
 *        locator = receiptPath(workflowId, sequence, 'E', 'IntegrationResult').
 *   AC5: auditTrigger/ciJobs are honest inputs — both trigger shapes, empty
 *        AND non-empty ciJobs, round-trip into `subject` unchanged.
 *   AC6: load-bearing chain AC — a synthetic valid chain genesis(A)->B->C->D,
 *        the REAL emitIntegrationReceipt produces E, validateChain([...,E])
 *        is valid, and E inherits D's correlationId.
 *   AC7: negative guard — a forked Stage-E correlationId makes validateChain
 *        invalid with the AC5c divergence error.
 *
 * All fixtures write under a temp repoRoot (Windows/temp-dir safe); zero
 * reliance on real on-disk chains, network, secrets, or live git/gh.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { validateChain, validateReceiptDocument } from '../../receipts/src/index.js'
import { emitIntegrationReceipt, IntegrationError } from '../src/index.js'

const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-000000000009'
const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-000000000009'
const SESSION_ID = 'a1a1a1a1-0000-4000-8000-000000000009'
const RUN_ID = 'a2a2a2a2-0000-4000-8000-000000000009'
const HASH_A = '1'.repeat(64)
const HASH_B = '2'.repeat(64)
const HASH_C = '3'.repeat(64)
const HASH_D = '4'.repeat(64)

/** Build a fully schema-valid synthetic ReceiptDocument fixture. */
function makeReceipt(args: {
  stage: string
  sequence: number
  prevHash: string | null
  hash: string
  correlationId: string
  subjectKind: string
}): ReceiptDocument {
  return {
    schemaVersion: '1',
    kind: 'stage',
    stage: args.stage,
    claimRef: null,
    correlation: {
      correlationId: args.correlationId,
      sessionId: SESSION_ID,
      workflowId: WORKFLOW_ID,
      runId: RUN_ID,
    },
    sequence: args.sequence,
    prevHash: args.prevHash,
    timestamp: new Date().toISOString(),
    subjectKind: args.subjectKind,
    subject: {},
    signature: null,
    hash: args.hash,
  } as unknown as ReceiptDocument
}

function makeTempRepoRoot(): string {
  return mkdtempSync(join(tmpdir(), 'w4p1-integration-test-'))
}

const priorStageDReceipt = makeReceipt({
  stage: 'D',
  sequence: 3,
  prevHash: HASH_C,
  hash: HASH_D,
  correlationId: SHARED_CORRELATION_ID,
  subjectKind: 'VerificationVerdict',
})

// ─── AC2: signature + inheritance ────────────────────────────────────────────

test('AC2: emitted receipt inherits correlationId/workflowId; sessionId/runId freshly minted', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receipt = emitIntegrationReceipt({
      prRef: 'https://github.com/example/repo/pull/1',
      ciJobs: [{ job: 'typecheck', outcome: 'success' }],
      auditTrigger: { triggered: false },
      priorReceipt: priorStageDReceipt,
      repoRoot,
    })

    assert.equal(receipt.correlation.correlationId, priorStageDReceipt.correlation.correlationId)
    assert.equal(receipt.correlation.workflowId, priorStageDReceipt.correlation.workflowId)
    assert.notEqual(receipt.correlation.sessionId, priorStageDReceipt.correlation.sessionId)
    assert.notEqual(receipt.correlation.runId, priorStageDReceipt.correlation.runId)
    assert.notEqual(receipt.correlation.sessionId, receipt.correlation.runId)
    assert.notEqual(receipt.correlation.sessionId, receipt.correlation.correlationId)
    assert.notEqual(receipt.correlation.runId, receipt.correlation.correlationId)
    assert.equal(receipt.stage, 'E')
    assert.equal(receipt.kind, 'stage')
    assert.equal(receipt.subjectKind, 'IntegrationResult')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC3: fail-loud on a bad prior receipt ───────────────────────────────────

test('AC3: throws IntegrationError PRIOR_CORRELATION_MISSING on missing/empty/whitespace/non-string correlationId', () => {
  for (const correlationId of ['', '   ', undefined, 12345]) {
    const repoRoot = makeTempRepoRoot()
    try {
      const badPrior = {
        ...priorStageDReceipt,
        correlation: {
          ...priorStageDReceipt.correlation,
          ...(correlationId === undefined ? {} : { correlationId }),
        },
      } as unknown as ReceiptDocument
      if (correlationId === undefined) {
        // Simulate a missing correlationId key entirely.
        const clone = { ...badPrior.correlation } as Record<string, unknown>
        delete clone.correlationId
        ;(badPrior as unknown as { correlation: unknown }).correlation = clone
      }

      assert.throws(
        () =>
          emitIntegrationReceipt({
            prRef: 'https://github.com/example/repo/pull/2',
            ciJobs: [],
            auditTrigger: { triggered: false },
            priorReceipt: badPrior,
            repoRoot,
          }),
        (err: unknown) => {
          assert.ok(err instanceof IntegrationError)
          assert.equal(err.code, 'PRIOR_CORRELATION_MISSING')
          return true
        },
      )
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  }

  // No correlation object at all.
  const repoRoot = makeTempRepoRoot()
  try {
    const noCorrelationPrior = {
      ...priorStageDReceipt,
      correlation: undefined,
    } as unknown as ReceiptDocument
    assert.throws(
      () =>
        emitIntegrationReceipt({
          prRef: 'https://github.com/example/repo/pull/3',
          ciJobs: [],
          auditTrigger: { triggered: false },
          priorReceipt: noCorrelationPrior,
          repoRoot,
        }),
      (err: unknown) => {
        assert.ok(err instanceof IntegrationError)
        assert.equal(err.code, 'PRIOR_CORRELATION_MISSING')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC3: throws IntegrationError PRIOR_CORRELATION_MISSING on missing/empty/whitespace/non-string workflowId (valid correlationId)', () => {
  // RW2: correlationId is checked first, so a fixture with an always-valid
  // correlationId is required to exercise the workflowId guard branch — a
  // regression that silently weakened/removed the workflowId check would
  // otherwise slip past AC3's correlationId-only coverage.
  for (const workflowId of ['', '   ', undefined, 12345]) {
    const repoRoot = makeTempRepoRoot()
    try {
      const badPrior = {
        ...priorStageDReceipt,
        correlation: {
          ...priorStageDReceipt.correlation,
          ...(workflowId === undefined ? {} : { workflowId }),
        },
      } as unknown as ReceiptDocument
      if (workflowId === undefined) {
        // Simulate a missing workflowId key entirely.
        const clone = { ...badPrior.correlation } as Record<string, unknown>
        delete clone.workflowId
        ;(badPrior as unknown as { correlation: unknown }).correlation = clone
      }

      assert.throws(
        () =>
          emitIntegrationReceipt({
            prRef: 'https://github.com/example/repo/pull/8',
            ciJobs: [],
            auditTrigger: { triggered: false },
            priorReceipt: badPrior,
            repoRoot,
          }),
        (err: unknown) => {
          assert.ok(err instanceof IntegrationError)
          assert.equal(err.code, 'PRIOR_CORRELATION_MISSING')
          return true
        },
      )
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  }
})

// ─── AC4: sequence + prevHash chaining ───────────────────────────────────────

test('AC4: sequence = prior.sequence + 1; prevHash = prior.hash; hash valid; locator matches receiptPath', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receipt = emitIntegrationReceipt({
      prRef: 'https://github.com/example/repo/pull/4',
      ciJobs: [{ job: 'lint', outcome: 'success' }],
      auditTrigger: { triggered: false },
      priorReceipt: priorStageDReceipt,
      repoRoot,
    })

    assert.equal(receipt.sequence, priorStageDReceipt.sequence + 1)
    assert.equal(receipt.prevHash, priorStageDReceipt.hash)

    const validation = validateReceiptDocument(receipt)
    assert.equal(validation.valid, true, `errors: ${validation.errors.join('; ')}`)

    const expectedLocator = `docs/receipts/${WORKFLOW_ID}/000004-E-integration-result.json`
    const written = readFileSync(join(repoRoot, ...expectedLocator.split('/')), 'utf8')
    const parsed = JSON.parse(written) as ReceiptDocument
    assert.equal(parsed.hash, receipt.hash)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC5: honest auditTrigger + ciJobs inputs ────────────────────────────────

test('AC5: auditTrigger {triggered:true, reason} and ciJobs round-trip unchanged into subject', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const ciJobs = [
      { job: 'typecheck', outcome: 'success' as const },
      { job: 'lint', outcome: 'failure' as const },
    ]
    const auditTrigger = { triggered: true, reason: 'surfaces touched contracts/' }
    const receipt = emitIntegrationReceipt({
      prRef: 'https://github.com/example/repo/pull/5',
      ciJobs,
      auditTrigger,
      priorReceipt: priorStageDReceipt,
      repoRoot,
    })
    assert.deepEqual(receipt.subject, {
      prRef: 'https://github.com/example/repo/pull/5',
      ciJobs,
      auditTrigger,
    })
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC5: auditTrigger {triggered:false} and EMPTY ciJobs round-trip unchanged into subject', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receipt = emitIntegrationReceipt({
      prRef: 'https://github.com/example/repo/pull/6',
      ciJobs: [],
      auditTrigger: { triggered: false },
      priorReceipt: priorStageDReceipt,
      repoRoot,
    })
    assert.deepEqual(receipt.subject, {
      prRef: 'https://github.com/example/repo/pull/6',
      ciJobs: [],
      auditTrigger: { triggered: false },
    })
    const validation = validateReceiptDocument(receipt)
    assert.equal(validation.valid, true, `errors: ${validation.errors.join('; ')}`)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC6: load-bearing chain AC — chain validates through E ──────────────────

test('AC6: validateChain([genesis(A), B, C, D, E]) is valid; E inherits D correlationId', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receiptA = makeReceipt({
      stage: 'A',
      sequence: 0,
      prevHash: null,
      hash: HASH_A,
      correlationId: SHARED_CORRELATION_ID,
      subjectKind: 'IntakeResult',
    })
    const receiptB = makeReceipt({
      stage: 'B',
      sequence: 1,
      prevHash: HASH_A,
      hash: HASH_B,
      correlationId: SHARED_CORRELATION_ID,
      subjectKind: 'RegistrationResult',
    })
    const receiptC = makeReceipt({
      stage: 'C',
      sequence: 2,
      prevHash: HASH_B,
      hash: HASH_C,
      correlationId: SHARED_CORRELATION_ID,
      subjectKind: 'DispatchOrder',
    })
    const receiptD = makeReceipt({
      stage: 'D',
      sequence: 3,
      prevHash: HASH_C,
      hash: HASH_D,
      correlationId: SHARED_CORRELATION_ID,
      subjectKind: 'VerificationVerdict',
    })

    // Run the REAL emitIntegrationReceipt to produce Stage E on disk.
    const receiptE = emitIntegrationReceipt({
      prRef: 'https://github.com/example/repo/pull/7',
      ciJobs: [{ job: 'typecheck', outcome: 'success' }],
      auditTrigger: { triggered: false },
      priorReceipt: receiptD,
      repoRoot,
    })

    const result = validateChain([receiptA, receiptB, receiptC, receiptD, receiptE])
    assert.equal(result.valid, true, `chain must be valid; errors: ${result.errors.join('; ')}`)
    assert.equal(receiptE.correlation.correlationId, receiptD.correlation.correlationId)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC7: negative guard — forked E is invalid ───────────────────────────────

test('AC7: a forked Stage-E correlationId makes validateChain invalid (AC5c divergence)', () => {
  const receiptA = makeReceipt({
    stage: 'A',
    sequence: 0,
    prevHash: null,
    hash: HASH_A,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'IntakeResult',
  })
  const receiptB = makeReceipt({
    stage: 'B',
    sequence: 1,
    prevHash: HASH_A,
    hash: HASH_B,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'RegistrationResult',
  })
  const receiptC = makeReceipt({
    stage: 'C',
    sequence: 2,
    prevHash: HASH_B,
    hash: HASH_C,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'DispatchOrder',
  })
  const receiptD = makeReceipt({
    stage: 'D',
    sequence: 3,
    prevHash: HASH_C,
    hash: HASH_D,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'VerificationVerdict',
  })
  // Stage E with a FORKED (freshly-minted-style) correlationId — the exact defect.
  const forkedE = makeReceipt({
    stage: 'E',
    sequence: 4,
    prevHash: HASH_D,
    hash: '5'.repeat(64),
    correlationId: 'bbbbbbbb-0000-4000-8000-000000000099',
    subjectKind: 'IntegrationResult',
  })

  const result = validateChain([receiptA, receiptB, receiptC, receiptD, forkedE])
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) => e.includes('diverges')),
    `expected an AC5c divergence error; got: ${result.errors.join('; ')}`,
  )
})
