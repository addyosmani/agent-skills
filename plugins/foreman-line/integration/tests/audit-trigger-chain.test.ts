/**
 * W4-P3 — Stage-E receipt integration (AC8). Proves the projected trigger value
 * flows through the REAL shipped `emitIntegrationReceipt` without minting a new
 * correlation, adding a stage, or changing the frozen contract.
 *
 * Builds a synthetic valid chain genesis(A)→B→C→D (shared correlationId, correct
 * prevHash/sequence), computes an `AuditTriggerDecision` via the engine, projects
 * it, passes it as `auditTrigger` to the real emitter to produce E, and asserts:
 *   - E.subject.auditTrigger deep-equals the projected value,
 *   - validateChain([A..D, E]).valid === true,
 *   - E.correlation.correlationId === D.correlation.correlationId (inherited).
 *
 * Hermetic: fixtures write under a temp repoRoot; no network/secrets/live git.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { validateChain } from '../../receipts/src/index.js'
import { toAuditTriggerEvaluation } from '../src/audit-trigger.js'
import { evaluateChangeSet } from '../src/governing-spec.js'
import { emitIntegrationReceipt } from '../src/index.js'

const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-00000000000e'
const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-00000000000e'
const SESSION_ID = 'a1a1a1a1-0000-4000-8000-00000000000e'
const RUN_ID = 'a2a2a2a2-0000-4000-8000-00000000000e'
const HASH_A = '1'.repeat(64)
const HASH_B = '2'.repeat(64)
const HASH_C = '3'.repeat(64)
const HASH_D = '4'.repeat(64)

function makeReceipt(args: {
  stage: string
  sequence: number
  prevHash: string | null
  hash: string
  subjectKind: string
}): ReceiptDocument {
  return {
    schemaVersion: '1',
    kind: 'stage',
    stage: args.stage,
    claimRef: null,
    correlation: {
      correlationId: SHARED_CORRELATION_ID,
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

test('AC8: projected trigger rides in the real Stage-E receipt; chain valid; correlation inherited', () => {
  const repoRoot = mkdtempSync(join(tmpdir(), 'w4p3-chain-'))
  try {
    const receiptA = makeReceipt({
      stage: 'A',
      sequence: 0,
      prevHash: null,
      hash: HASH_A,
      subjectKind: 'IntakeResult',
    })
    const receiptB = makeReceipt({
      stage: 'B',
      sequence: 1,
      prevHash: HASH_A,
      hash: HASH_B,
      subjectKind: 'RegistrationResult',
    })
    const receiptC = makeReceipt({
      stage: 'C',
      sequence: 2,
      prevHash: HASH_B,
      hash: HASH_C,
      subjectKind: 'DispatchOrder',
    })
    const receiptD = makeReceipt({
      stage: 'D',
      sequence: 3,
      prevHash: HASH_C,
      hash: HASH_D,
      subjectKind: 'VerificationVerdict',
    })

    // Engine: a security-domain diff under a governing spec that under-declares
    // → triggered + drift; project to the frozen { triggered, reason? }.
    const decision = evaluateChangeSet(
      ['services/auth/session.ts'],
      [
        {
          path: 'plugins/foreman-line/docs/specs/active/SOME.md',
          risk: 'low',
          surfaces: ['services/'],
          status: 'active',
        },
      ],
    )
    const projected = toAuditTriggerEvaluation(decision)
    assert.equal(projected.triggered, true)
    assert.ok(projected.reason?.includes('spec-drift'))

    // Real shipped emitter — no correlation minting here.
    const receiptE = emitIntegrationReceipt({
      prRef: 'https://github.com/example/repo/pull/43',
      ciJobs: [{ job: 'typecheck', outcome: 'success' }],
      auditTrigger: projected,
      priorReceipt: receiptD,
      repoRoot,
    })

    const subject = receiptE.subject as { auditTrigger: unknown }
    assert.deepEqual(subject.auditTrigger, projected)

    const result = validateChain([receiptA, receiptB, receiptC, receiptD, receiptE])
    assert.equal(result.valid, true, `chain must be valid; errors: ${result.errors.join('; ')}`)

    assert.equal(receiptE.correlation.correlationId, receiptD.correlation.correlationId)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
