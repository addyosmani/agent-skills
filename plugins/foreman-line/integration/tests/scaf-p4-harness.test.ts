import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { isSealed, validateChain } from '../../receipts/src/index.js'
import { evaluateAuditTrigger, toAuditTriggerEvaluation } from '../src/audit-trigger.js'
import {
  CoordinatorIdentityError,
  parseCoordinatorIdentity,
} from '../src/auth/coordinator-identity.js'

const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-00000000000f'
const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-00000000000f'
const FORKED_CORRELATION_ID = 'bbbbbbbb-0000-4000-8000-00000000000f'
const SESSION_ID = 'a1a1a1a1-0000-4000-8000-00000000000f'
const RUN_ID = 'a2a2a2a2-0000-4000-8000-00000000000f'
const HASH_A = '1'.repeat(64)
const HASH_B = '2'.repeat(64)
const HASH_C = '3'.repeat(64)
const HASH_D = '4'.repeat(64)
const HASH_E = '5'.repeat(64)
const HASH_F = '6'.repeat(64)

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

test('AC-H1: declaredRisk=elevated + auth surface → triggered=true drift=false', () => {
  const result = evaluateAuditTrigger({
    declaredRisk: 'elevated',
    changedPaths: ['plugins/foreman-line/integration/src/auth/coordinator-identity.ts'],
  })
  assert.equal(result.triggered, true)
  assert.equal(result.drift, false)
  assert.equal(result.derivedRisk, 'elevated')
  assert.equal(result.decision, 'elevated')
  const evaluation = toAuditTriggerEvaluation(result)
  assert.equal(evaluation.triggered, true)
  // AC-H1 requires the reason to attribute the elevation to the SECURITY domain.
  // A bare non-empty check would still pass if a future regression made an
  // unrelated rule (e.g. supply-chain) the only matching one.
  assert.ok(typeof evaluation.reason === 'string' && evaluation.reason.length > 0)
  assert.ok(
    evaluation.reason.includes('security'),
    `reason must attribute the security domain, got: ${evaluation.reason}`,
  )
})

test('AC-H2: declaredRisk=standard + auth surface → drift=true (drift-block harness)', () => {
  const result = evaluateAuditTrigger({
    declaredRisk: 'standard',
    changedPaths: ['plugins/foreman-line/integration/src/auth/coordinator-identity.ts'],
  })
  assert.equal(result.drift, true)
  assert.equal(result.triggered, true)
  assert.equal(result.derivedRisk, 'elevated')
  assert.equal(result.decision, 'elevated')
  const evaluation = toAuditTriggerEvaluation(result)
  assert.ok(typeof evaluation.reason === 'string' && evaluation.reason.includes('spec-drift'))
})

test('AC-H3: synthetic A→F chain passes validateChain', () => {
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
    subjectKind: 'DispatchResult',
  })
  const receiptD = makeReceipt({
    stage: 'D',
    sequence: 3,
    prevHash: HASH_C,
    hash: HASH_D,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'VerificationResult',
  })
  const receiptE = makeReceipt({
    stage: 'E',
    sequence: 4,
    prevHash: HASH_D,
    hash: HASH_E,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'IntegrationResult',
  })
  const receiptF = makeReceipt({
    stage: 'F',
    sequence: 5,
    prevHash: HASH_E,
    hash: HASH_F,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'ClosureRecord',
  })

  const chain = [receiptA, receiptB, receiptC, receiptD, receiptE, receiptF]
  const chainResult = validateChain(chain)
  assert.equal(
    chainResult.valid,
    true,
    `Expected valid chain but got: ${JSON.stringify(chainResult)}`,
  )

  // validateChain checks only sequence contiguity, prevHash adjacency and shared
  // correlation — it never inspects `stage` or `subjectKind`. Bind the A→F claim
  // and the Stage-F seal explicitly, or the labelling above is decorative.
  assert.deepEqual(
    chain.map((receipt) => receipt.stage),
    ['A', 'B', 'C', 'D', 'E', 'F'],
    'chain must cover stages A through F in order',
  )
  assert.equal(isSealed(chain), true, 'chain must be sealed (highest-sequence receipt is stage F)')
  assert.equal(
    receiptF.subjectKind,
    'ClosureRecord',
    'the Stage-F receipt must carry subjectKind ClosureRecord',
  )
})

test('AC-H4: forked correlationId at Stage F → validateChain invalid', () => {
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
    subjectKind: 'DispatchResult',
  })
  const receiptD = makeReceipt({
    stage: 'D',
    sequence: 3,
    prevHash: HASH_C,
    hash: HASH_D,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'VerificationResult',
  })
  const receiptE = makeReceipt({
    stage: 'E',
    sequence: 4,
    prevHash: HASH_D,
    hash: HASH_E,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'IntegrationResult',
  })
  const receiptF = makeReceipt({
    stage: 'F',
    sequence: 5,
    prevHash: HASH_E,
    hash: HASH_F,
    correlationId: FORKED_CORRELATION_ID,
    subjectKind: 'ClosureRecord',
  })

  const chainResult = validateChain([receiptA, receiptB, receiptC, receiptD, receiptE, receiptF])
  assert.equal(chainResult.valid, false, 'Expected invalid chain due to forked correlationId')
  // Bind to the actual failure mode (AC5c shared-correlationId invariant), not
  // merely to "something was invalid".
  const joined = chainResult.errors.join('\n')
  assert.match(
    joined,
    /correlationId/,
    `errors must reference the shared-correlationId invariant, got: ${joined}`,
  )
})

// ─── AC3 hardening: parseCoordinatorIdentity against hostile shapes ───────────
// AC6 (foreman-line-ci.yml byte-unchanged) is covered by tests/conformance.test.ts,
// which is the file permitted to shell out to git; the harness stays hermetic.

test('AC3g: a getter whose read yields a non-string → throws CoordinatorIdentityError', () => {
  let reads = 0
  const hostile = {
    get login(): unknown {
      reads += 1
      // First read (the only one) yields a non-string; a validate-then-reread
      // implementation would have validated the later string instead.
      return reads === 1 ? { toString: () => 'alice' } : 'alice'
    },
    node_id: 'U_x',
  }
  assert.throws(() => parseCoordinatorIdentity(hostile), CoordinatorIdentityError)
})

test('AC3h: an alternating getter cannot smuggle an unvalidated value into the result', () => {
  let reads = 0
  const hostile = {
    get login(): unknown {
      reads += 1
      return reads === 1 ? 'alice' : { smuggled: true }
    },
    node_id: 'U_x',
  }
  const result = parseCoordinatorIdentity(hostile)
  assert.equal(typeof result.login, 'string', 'returned login must be the validated string')
  assert.equal(result.login, 'alice')
  assert.equal(reads, 1, 'login must be read exactly once')
})

test('AC3i: a getter that throws → throws CoordinatorIdentityError, not TypeError', () => {
  const hostile = {
    get login(): string {
      throw new TypeError('boom')
    },
    node_id: 'U_x',
  }
  assert.throws(() => parseCoordinatorIdentity(hostile), CoordinatorIdentityError)
  assert.throws(
    () => parseCoordinatorIdentity(hostile),
    (err: unknown) => err instanceof CoordinatorIdentityError && !(err instanceof TypeError),
  )
})

test('AC3j: an array carrying login/node_id → throws CoordinatorIdentityError', () => {
  const hostile: unknown[] & { login?: string; node_id?: string } = []
  hostile.login = 'alice'
  hostile.node_id = 'U_x'
  assert.throws(() => parseCoordinatorIdentity(hostile), CoordinatorIdentityError)
})

test('AC3k: the returned identity is frozen (readonly is real at runtime)', () => {
  const result = parseCoordinatorIdentity({ login: 'alice', node_id: 'U_x' })
  assert.equal(Object.isFrozen(result), true)
  assert.throws(() => {
    ;(result as { login: string }).login = 'mutated'
  }, TypeError)
  assert.equal(result.login, 'alice')
})
