/**
 * AC5: schema validation rejects
 *  - missing correlation fields,
 *  - correlation values that are not UUID-format strings,
 *  - unknown envelope fields (strict mode / additionalProperties: false),
 *  - a ReceiptRef without both hash and locator,
 *  - agentId: null (optional-absent, not nullable),
 *  - agentId present but not a UUID-format string,
 *  - auditTrigger.reason: null (optional-absent, not nullable).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv, type SchemaObject, type ValidateFunction } from 'ajv'
import {
  integrationResultInputSchema,
  receiptRefSchema,
  shapingResultInputSchema,
} from '../src/index.js'
import { makeEnvelope, sampleIntegrationResult, sampleShapingResult } from '../src/testing.js'

const ajv = new Ajv({ allErrors: true })
const validateEnvelope: ValidateFunction = ajv.compile(shapingResultInputSchema as SchemaObject)
const validateReceipt: ValidateFunction = ajv.compile(receiptRefSchema as SchemaObject)
const validateIntegrationEnvelope: ValidateFunction = ajv.compile(
  integrationResultInputSchema as SchemaObject,
)

/** A structurally valid envelope, deep-cloned per test so mutations don't leak. */
function baseEnvelope(): Record<string, unknown> {
  return structuredClone(makeEnvelope(sampleShapingResult)) as unknown as Record<string, unknown>
}

function baseIntegrationEnvelope(): Record<string, unknown> {
  return structuredClone(makeEnvelope(sampleIntegrationResult)) as unknown as Record<
    string,
    unknown
  >
}

test('accepts a fully valid envelope (positive control)', () => {
  assert.ok(validateEnvelope(baseEnvelope()), JSON.stringify(validateEnvelope.errors))
})

for (const field of ['correlationId', 'sessionId', 'workflowId', 'runId']) {
  test(`rejects envelope with missing correlation.${field}`, () => {
    const env = baseEnvelope()
    delete (env.correlation as Record<string, unknown>)[field]
    assert.equal(validateEnvelope(env), false)
  })
}

test('rejects a correlation value that is not a UUID-format string', () => {
  const env = baseEnvelope()
  ;(env.correlation as Record<string, unknown>).correlationId = 'not-a-uuid'
  assert.equal(validateEnvelope(env), false)
})

test('rejects a UUID-shaped-but-wrong-length correlation value', () => {
  const env = baseEnvelope()
  ;(env.correlation as Record<string, unknown>).runId = '1234-5678'
  assert.equal(validateEnvelope(env), false)
})

test('rejects an unknown top-level envelope field (strict mode)', () => {
  const env = baseEnvelope()
  env.unexpected = 'nope'
  assert.equal(validateEnvelope(env), false)
})

test('rejects an unknown field nested inside correlation (strict mode)', () => {
  const env = baseEnvelope()
  ;(env.correlation as Record<string, unknown>).workloadId = 'excluded-until-adr-069-ratified'
  assert.equal(validateEnvelope(env), false)
})

test('rejects a ReceiptRef missing hash', () => {
  const env = baseEnvelope()
  env.receipt = { locator: 'receipts/x.json' }
  assert.equal(validateEnvelope(env), false)
  assert.equal(validateReceipt({ locator: 'receipts/x.json' }), false)
})

test('rejects a ReceiptRef missing locator', () => {
  const env = baseEnvelope()
  env.receipt = { hash: 'sha256:deadbeef' }
  assert.equal(validateEnvelope(env), false)
  assert.equal(validateReceipt({ hash: 'sha256:deadbeef' }), false)
})

test('accepts a ReceiptRef with both hash and locator', () => {
  assert.ok(validateReceipt({ hash: 'sha256:deadbeef', locator: 'receipts/x.json' }))
})

test('rejects agentId: null (agentId is optional-absent, not nullable)', () => {
  const env = baseEnvelope()
  ;(env.correlation as Record<string, unknown>).agentId = null
  assert.equal(validateEnvelope(env), false)
})

test('rejects an agentId present but not a UUID-format string', () => {
  const env = baseEnvelope()
  ;(env.correlation as Record<string, unknown>).agentId = 'not-a-uuid'
  assert.equal(validateEnvelope(env), false)
})

test('rejects auditTrigger.reason: null (reason is optional-absent, not nullable)', () => {
  const env = baseIntegrationEnvelope()
  const payload = env.payload as Record<string, unknown>
  const auditTrigger = payload.auditTrigger as Record<string, unknown>
  auditTrigger.reason = null
  assert.equal(validateIntegrationEnvelope(env), false)
})
