/**
 * AC2 + AC6 support: proves type<->schema parity and no drift.
 *  - Every committed `schemas/*.json` is byte-identical to what the typed source
 *    serializes to (drift is impossible without a failing test).
 *  - Every canonical sample validates against its schema.
 *  - For each composed boundary, the `StageInput<T>` and `StageOutput<T>` typed
 *    literals serialize to the same committed file (Flag 3).
 */

import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Ajv, type SchemaObject } from 'ajv'
import { registerNoDriftTests } from '../../schema-scaffold/src/test-scaffold.js'
import { serialize } from '../src/generate.js'
import { allSchemaFiles, composedBoundaries } from '../src/registry.js'
import {
  dispatchOrderInputSchema,
  dispatchOrderOutputSchema,
  dispatchOrderSchema,
} from '../src/stages/c-dispatch.js'
import { allContractFixtures, makeEnvelope, sampleDispatchOrder } from '../src/testing.js'

const schemasDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas')
const ajv = new Ajv({ allErrors: true })

registerNoDriftTests(allSchemaFiles, schemasDir)

for (const fixture of allContractFixtures) {
  test(`canonical sample validates: ${fixture.name}`, () => {
    const validate = ajv.compile(fixture.schema as SchemaObject)
    assert.ok(validate(fixture.sample), JSON.stringify(validate.errors))
  })
}

for (const boundary of composedBoundaries) {
  test(`input/output typed literals agree: ${boundary.name}`, () => {
    assert.equal(serialize(boundary.inputSchema), serialize(boundary.outputSchema))
  })
}

test('every exported contract type has a committed schema file', () => {
  assert.equal(allSchemaFiles.length, 17)
})

// permission-profile-registry P2: DispatchOrder.permissionProfile field cases.
// These construct local literals over the read-only sampleDispatchOrder fixture;
// they do not run through the loops above and do not touch src/testing.ts.

const ajvForPermissionProfile = new Ajv({ allErrors: true })
const validateDispatchOrder = ajvForPermissionProfile.compile(dispatchOrderSchema as SchemaObject)

test('permissionProfile: positive — field present validates true', () => {
  const order = { ...sampleDispatchOrder, permissionProfile: 'reviewer-readonly' }
  assert.ok(validateDispatchOrder(order), JSON.stringify(validateDispatchOrder.errors))
})

test('permissionProfile: optional-absent — unmodified sampleDispatchOrder validates true', () => {
  assert.ok(
    validateDispatchOrder(sampleDispatchOrder),
    JSON.stringify(validateDispatchOrder.errors),
  )
})

test('permissionProfile: negative — wrong type validates false', () => {
  const order = { ...sampleDispatchOrder, permissionProfile: 42 }
  assert.equal(validateDispatchOrder(order), false)
})

test('permissionProfile: negative — empty string (minLength) validates false', () => {
  const order = { ...sampleDispatchOrder, permissionProfile: '' }
  assert.equal(validateDispatchOrder(order), false)
})

test('permissionProfile: propagates through the composed envelope boundary schema', () => {
  const order = { ...sampleDispatchOrder, permissionProfile: 'builder-standard' }
  const envelope = makeEnvelope(order)
  const validateInput = ajvForPermissionProfile.compile(dispatchOrderInputSchema as SchemaObject)
  const validateOutput = ajvForPermissionProfile.compile(dispatchOrderOutputSchema as SchemaObject)
  assert.ok(validateInput(envelope), JSON.stringify(validateInput.errors))
  assert.ok(validateOutput(envelope), JSON.stringify(validateOutput.errors))
})

test('permissionProfile: strictness regression guard — unknown extra field still rejected', () => {
  const order = { ...sampleDispatchOrder, permissionProfile: 'builder-standard', notAField: 'x' }
  assert.equal(validateDispatchOrder(order), false)
})
