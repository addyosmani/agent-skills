/**
 * AC3: constructs a full A->F envelope chain (7 hops across 6 stages — Stage C
 * emits both DispatchOrder and BuildResult) sharing a single CorrelationContext,
 * and asserts the identity propagates unmutated through every envelope.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv, type SchemaObject } from 'ajv'
import type { CorrelationContext, StageOutput } from '../src/index.js'
import {
  buildResultOutputSchema,
  closureRecordOutputSchema,
  dispatchOrderOutputSchema,
  integrationResultOutputSchema,
  registrationResultOutputSchema,
  shapingResultOutputSchema,
  verificationVerdictOutputSchema,
} from '../src/index.js'
import {
  makeCorrelation,
  makeEnvelope,
  sampleBuildResult,
  sampleClosureRecord,
  sampleDispatchOrder,
  sampleIntegrationResult,
  sampleRegistrationResult,
  sampleShapingResult,
  sampleVerificationVerdict,
} from '../src/testing.js'

const ajv = new Ajv({ allErrors: true })

// One correlation identity, threaded through the entire pipeline.
const correlation: CorrelationContext = makeCorrelation({
  correlationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  sessionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  workflowId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  runId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
})

interface Hop {
  readonly stage: string
  readonly schema: object
  readonly envelope: StageOutput<unknown>
}

let t = 0
const at = () => `2026-07-13T12:00:${String(t++).padStart(2, '0')}Z`

const chain: readonly Hop[] = [
  {
    stage: 'A',
    schema: shapingResultOutputSchema,
    envelope: makeEnvelope(sampleShapingResult, { correlation, timestamp: at() }),
  },
  {
    stage: 'B',
    schema: registrationResultOutputSchema,
    envelope: makeEnvelope(sampleRegistrationResult, { correlation, timestamp: at() }),
  },
  {
    stage: 'C.dispatch',
    schema: dispatchOrderOutputSchema,
    envelope: makeEnvelope(sampleDispatchOrder, { correlation, timestamp: at() }),
  },
  {
    stage: 'C.build',
    schema: buildResultOutputSchema,
    envelope: makeEnvelope(sampleBuildResult, { correlation, timestamp: at() }),
  },
  {
    stage: 'D',
    schema: verificationVerdictOutputSchema,
    envelope: makeEnvelope(sampleVerificationVerdict, { correlation, timestamp: at() }),
  },
  {
    stage: 'E',
    schema: integrationResultOutputSchema,
    envelope: makeEnvelope(sampleIntegrationResult, { correlation, timestamp: at() }),
  },
  {
    stage: 'F',
    schema: closureRecordOutputSchema,
    envelope: makeEnvelope(sampleClosureRecord, { correlation, timestamp: at() }),
  },
]

test('chain is 7 hops across 6 stages (C emits two)', () => {
  assert.equal(chain.length, 7)
  assert.deepEqual(
    chain.map((h) => h.stage),
    ['A', 'B', 'C.dispatch', 'C.build', 'D', 'E', 'F'],
  )
})

test('correlation identity is reference-identical through every hop', () => {
  for (const hop of chain) {
    assert.equal(hop.envelope.correlation, correlation, `hop ${hop.stage} lost reference identity`)
  }
})

test('correlation identity is deep-equal and unmutated through every hop', () => {
  const snapshot = structuredClone(correlation)
  for (const hop of chain) {
    assert.deepEqual(hop.envelope.correlation, snapshot, `hop ${hop.stage} mutated correlation`)
  }
})

test('every hop validates against its composed boundary schema', () => {
  for (const hop of chain) {
    const validate = ajv.compile(hop.schema as SchemaObject)
    assert.ok(validate(hop.envelope), `hop ${hop.stage}: ${JSON.stringify(validate.errors)}`)
  }
})
