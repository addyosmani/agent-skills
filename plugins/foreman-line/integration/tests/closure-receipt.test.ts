/**
 * W4-P4 AC2-AC7 — Stage-F `ReceiptDocument` closure emitter.
 *
 * Coverage:
 *   AC2: signature + subject — stage:'F', kind:'stage', subjectKind:'ClosureRecord',
 *        subject deep-equals the supplied frozen ClosureRecord.
 *   AC3: correlation inheritance — correlationId/workflowId inherited from the
 *        prior (Stage-E) tip; sessionId/runId freshly minted and distinct.
 *   AC4: fail-loud on a bad prior correlation — missing/empty/whitespace/
 *        non-string correlationId AND a valid correlationId with a bad
 *        workflowId both throw IntegrationError PRIOR_CORRELATION_MISSING;
 *        never mints a fresh correlationId.
 *   AC5: sequence = prior.sequence + 1; prevHash = prior.hash; hash =
 *        sha256Hex(canonicalize(draft)); validateReceiptDocument().valid;
 *        locator = receiptPath(workflowId, sequence, 'F', 'ClosureRecord').
 *   AC6: load-bearing chain AC — a synthetic valid chain A..E, the REAL
 *        emitClosureReceipt produces F on disk, validateChain([...A..E,F]) is
 *        valid, and F inherits E's correlationId.
 *   AC7: negative guard — a forked Stage-F correlationId makes validateChain
 *        invalid with the AC5c divergence error.
 *
 * All fixtures write under a temp repoRoot; zero network, secrets, or live git/gh.
 */
import assert from 'node:assert/strict'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ClosureRecord } from '../../contracts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { receiptPath, validateChain, validateReceiptDocument } from '../../receipts/src/index.js'
import { emitClosureReceipt, IntegrationError } from '../src/index.js'
import {
  HASH_E,
  makeReceipt,
  makeStageEChain,
  makeTempRepoRoot,
  SHARED_CORRELATION_ID,
  SPEC_MOVE,
  VALID_MERGE_SHA,
  WORKFLOW_ID,
} from './closure-fixtures.js'

const CLOSURE_RECORD: ClosureRecord = {
  mergeSha: VALID_MERGE_SHA,
  ticketTransition: { ticketKey: 'KONE-23210', fromStatus: 'In Review', toStatus: 'Done' },
  specLifecycleMove: SPEC_MOVE,
}

const priorStageEReceipt = makeReceipt({
  stage: 'E',
  sequence: 4,
  prevHash: '4'.repeat(64),
  hash: HASH_E,
  subjectKind: 'IntegrationResult',
})

// ─── AC2: signature + subject ────────────────────────────────────────────────

test('AC2: emitClosureReceipt produces stage:F/kind:stage/subjectKind:ClosureRecord; subject deep-equals the ClosureRecord', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receipt = emitClosureReceipt({
      closureRecord: CLOSURE_RECORD,
      priorReceipt: priorStageEReceipt,
      repoRoot,
    })
    assert.equal(receipt.stage, 'F')
    assert.equal(receipt.kind, 'stage')
    assert.equal(receipt.claimRef, null)
    assert.equal(receipt.subjectKind, 'ClosureRecord')
    assert.deepEqual(receipt.subject, CLOSURE_RECORD)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC3: correlation inheritance ────────────────────────────────────────────

test('AC3: emitted Stage-F receipt inherits correlationId/workflowId; sessionId/runId freshly minted', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receipt = emitClosureReceipt({
      closureRecord: CLOSURE_RECORD,
      priorReceipt: priorStageEReceipt,
      repoRoot,
    })
    assert.equal(receipt.correlation.correlationId, priorStageEReceipt.correlation.correlationId)
    assert.equal(receipt.correlation.workflowId, priorStageEReceipt.correlation.workflowId)
    assert.notEqual(receipt.correlation.sessionId, priorStageEReceipt.correlation.sessionId)
    assert.notEqual(receipt.correlation.runId, priorStageEReceipt.correlation.runId)
    assert.notEqual(receipt.correlation.sessionId, receipt.correlation.runId)
    assert.notEqual(receipt.correlation.sessionId, receipt.correlation.correlationId)
    assert.notEqual(receipt.correlation.runId, receipt.correlation.correlationId)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC4: fail-loud on a bad prior correlation ───────────────────────────────

test('AC4: throws IntegrationError PRIOR_CORRELATION_MISSING on missing/empty/whitespace/non-string correlationId', () => {
  for (const correlationId of ['', '   ', undefined, 12345]) {
    const repoRoot = makeTempRepoRoot()
    try {
      const badPrior = {
        ...priorStageEReceipt,
        correlation: {
          ...priorStageEReceipt.correlation,
          ...(correlationId === undefined ? {} : { correlationId }),
        },
      } as unknown as ReceiptDocument
      if (correlationId === undefined) {
        const clone = { ...badPrior.correlation } as Record<string, unknown>
        delete clone.correlationId
        ;(badPrior as unknown as { correlation: unknown }).correlation = clone
      }
      assert.throws(
        () =>
          emitClosureReceipt({ closureRecord: CLOSURE_RECORD, priorReceipt: badPrior, repoRoot }),
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
    const noCorrelation = {
      ...priorStageEReceipt,
      correlation: undefined,
    } as unknown as ReceiptDocument
    assert.throws(
      () =>
        emitClosureReceipt({
          closureRecord: CLOSURE_RECORD,
          priorReceipt: noCorrelation,
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

test('AC4: throws PRIOR_CORRELATION_MISSING on bad workflowId with a VALID correlationId (locks the workflowId branch)', () => {
  for (const workflowId of ['', '   ', undefined, 12345]) {
    const repoRoot = makeTempRepoRoot()
    try {
      const badPrior = {
        ...priorStageEReceipt,
        correlation: {
          ...priorStageEReceipt.correlation,
          ...(workflowId === undefined ? {} : { workflowId }),
        },
      } as unknown as ReceiptDocument
      if (workflowId === undefined) {
        const clone = { ...badPrior.correlation } as Record<string, unknown>
        delete clone.workflowId
        ;(badPrior as unknown as { correlation: unknown }).correlation = clone
      }
      assert.throws(
        () =>
          emitClosureReceipt({ closureRecord: CLOSURE_RECORD, priorReceipt: badPrior, repoRoot }),
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

// ─── AC5: sequence + prevHash + validation + locator ─────────────────────────

test('AC5: sequence = prior + 1; prevHash = prior.hash; hash valid; locator = receiptPath(...F, ClosureRecord)', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receipt = emitClosureReceipt({
      closureRecord: CLOSURE_RECORD,
      priorReceipt: priorStageEReceipt,
      repoRoot,
    })
    assert.equal(receipt.sequence, priorStageEReceipt.sequence + 1)
    assert.equal(receipt.prevHash, priorStageEReceipt.hash)

    const validation = validateReceiptDocument(receipt)
    assert.equal(validation.valid, true, `errors: ${validation.errors.join('; ')}`)

    const expectedLocator = receiptPath(WORKFLOW_ID, receipt.sequence, 'F', 'ClosureRecord')
    assert.equal(expectedLocator, `docs/receipts/${WORKFLOW_ID}/000005-F-closure-record.json`)
    const written = readFileSync(join(repoRoot, ...expectedLocator.split('/')), 'utf8')
    const parsed = JSON.parse(written) as ReceiptDocument
    assert.equal(parsed.hash, receipt.hash)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC6: load-bearing chain AC — chain validates through F ───────────────────

test('AC6: validateChain([A..E, F]) is valid with the REAL emitClosureReceipt; F inherits E correlationId', () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const chain = makeStageEChain()
    const receiptE = chain[chain.length - 1] as ReceiptDocument

    const receiptF = emitClosureReceipt({
      closureRecord: CLOSURE_RECORD,
      priorReceipt: receiptE,
      repoRoot,
    })

    const result = validateChain([...chain, receiptF])
    assert.equal(result.valid, true, `chain must be valid; errors: ${result.errors.join('; ')}`)
    assert.equal(receiptF.correlation.correlationId, receiptE.correlation.correlationId)
    assert.equal(receiptF.stage, 'F')
    assert.equal(receiptF.sequence, 5)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC7: negative guard — forked F is invalid ────────────────────────────────

test('AC7: a forked Stage-F correlationId makes validateChain invalid (AC5c divergence)', () => {
  const chain = makeStageEChain()
  const forkedF = makeReceipt({
    stage: 'F',
    sequence: 5,
    prevHash: HASH_E,
    hash: '6'.repeat(64),
    correlationId: 'bbbbbbbb-0000-4000-8000-0000000000f9',
    subjectKind: 'ClosureRecord',
  })
  const result = validateChain([...chain, forkedF])
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) => e.includes('diverges')),
    `expected an AC5c divergence error; got: ${result.errors.join('; ')}`,
  )
  // Sanity: the shared-correlation fixtures differ only in F's correlationId.
  assert.notEqual(forkedF.correlation.correlationId, SHARED_CORRELATION_ID)
})
