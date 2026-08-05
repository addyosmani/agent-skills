/**
 * AC4: RunId uniqueness and WorkflowId stability across a rework loop (D -> C -> D).
 * A rework retry is a new execution attempt, so it gets a fresh runId, but the
 * workflowId (and the end-to-end correlationId/sessionId) stay stable.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv, type SchemaObject } from 'ajv'
import type { ReworkSignal, VerificationVerdict } from '../src/index.js'
import { dispatchOrderInputSchema, verificationVerdictInputSchema } from '../src/index.js'
import {
  makeCorrelation,
  makeEnvelope,
  sampleDispatchOrder,
  sampleReceipt,
} from '../src/testing.js'

const ajv = new Ajv({ allErrors: true })

const CORRELATION_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const SESSION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const WORKFLOW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const RUN_1 = '11111111-1111-4111-8111-111111111111'
const RUN_2 = '22222222-2222-4222-8222-222222222222'

// Same workflow, same end-to-end correlation; runId differs per attempt.
const run1 = makeCorrelation({
  correlationId: CORRELATION_ID,
  sessionId: SESSION_ID,
  workflowId: WORKFLOW_ID,
  runId: RUN_1,
})
const run2 = makeCorrelation({
  correlationId: CORRELATION_ID,
  sessionId: SESSION_ID,
  workflowId: WORKFLOW_ID,
  runId: RUN_2,
})

const reworkVerdict: VerificationVerdict = {
  verdict: 'rework',
  harnessClaims: [{ claim: 'AC5 strictness', passed: false, evidence: 'unknown field accepted' }],
  adversarialFindings: [],
}
const passVerdict: VerificationVerdict = {
  verdict: 'pass',
  harnessClaims: [],
  adversarialFindings: [],
}

const reworkSignal: ReworkSignal = {
  reason: 'AC5 strictness failed',
  originStage: 'D',
  targetStage: 'C',
  attempt: 1,
  verdictReceipt: sampleReceipt,
}

// D (run1) requests rework -> C (run2) re-dispatches -> D (run2) re-verifies.
const dRework = makeEnvelope(reworkVerdict, {
  correlation: run1,
  timestamp: '2026-07-13T12:00:00Z',
  reworkSignal,
})
const cRedispatch = makeEnvelope(sampleDispatchOrder, {
  correlation: run2,
  timestamp: '2026-07-13T12:00:01Z',
  reworkSignal,
})
const dReverify = makeEnvelope(passVerdict, {
  correlation: run2,
  timestamp: '2026-07-13T12:00:02Z',
  reworkSignal: null,
})

const loop = [dRework, cRedispatch, dReverify]

test('workflowId is stable across the D -> C -> D rework loop', () => {
  for (const hop of loop) {
    assert.equal(hop.correlation.workflowId, WORKFLOW_ID)
  }
})

test('end-to-end correlationId and sessionId are stable across the loop', () => {
  for (const hop of loop) {
    assert.equal(hop.correlation.correlationId, CORRELATION_ID)
    assert.equal(hop.correlation.sessionId, SESSION_ID)
  }
})

test('runId is unique per execution attempt (rework retry gets a fresh runId)', () => {
  assert.notEqual(run1.runId, run2.runId)
  const runIds = new Set(loop.map((h) => h.correlation.runId))
  assert.equal(runIds.size, 2)
})

test('the D verdict requesting rework targets Stage C from Stage D', () => {
  assert.equal(dRework.payload.verdict, 'rework')
  assert.equal(dRework.reworkSignal?.originStage, 'D')
  assert.equal(dRework.reworkSignal?.targetStage, 'C')
  assert.equal(dRework.reworkSignal?.attempt, 1)
})

test('rework-loop envelopes validate against their composed schemas', () => {
  const dValidate = ajv.compile(verificationVerdictInputSchema as SchemaObject)
  const cValidate = ajv.compile(dispatchOrderInputSchema as SchemaObject)
  assert.ok(dValidate(dRework), JSON.stringify(dValidate.errors))
  assert.ok(cValidate(cRedispatch), JSON.stringify(cValidate.errors))
  assert.ok(dValidate(dReverify), JSON.stringify(dValidate.errors))
})
