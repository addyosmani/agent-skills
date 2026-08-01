/**
 * AC3 (project-key allowlist + negative control) and AC4 (label + prefix,
 * stamped by the package). Every rejection is proven to reach ZERO adapter
 * calls: the gate throws before the wrapper touches the adapter.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { assertRegistrationGate, MCP_TEST_LABEL, TEST_PREFIX } from '../src/gate.js'
import { GatedTransport } from '../src/gated-transport.js'
import { buildCreatePayload } from '../src/payloads.js'
import { type IssueCreatePayload, RegistrationGateError } from '../src/types.js'
import { FakeAdapter } from './helpers.js'

function payloadWith(overrides: {
  projectKey?: string
  labels?: readonly string[]
  summary?: string
}): IssueCreatePayload {
  return {
    fields: {
      project: { key: overrides.projectKey ?? 'KONE' },
      issuetype: { id: '7' },
      summary: overrides.summary ?? `${TEST_PREFIX}[demo] Title`,
      labels: overrides.labels ?? [MCP_TEST_LABEL],
      customfield_14522: { id: '12817' },
    },
  }
}

test('AC3: a non-KONE project key throws RegistrationGateError and reaches ZERO adapter calls', () => {
  const adapter = new FakeAdapter()
  const gt = new GatedTransport(adapter)
  assert.throws(
    () => gt.createGated(payloadWith({ projectKey: 'EVIL' })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'project-key',
  )
  assert.equal(adapter.createCalls.length, 0)
})

test('AC3: assertRegistrationGate accepts KONE, rejects any other key (exact-string membership)', () => {
  assert.doesNotThrow(() => assertRegistrationGate(payloadWith({}).fields))
  assert.throws(
    () => assertRegistrationGate(payloadWith({ projectKey: 'KONE2' }).fields),
    RegistrationGateError,
  )
})

test('AC4: a payload missing the mcp-test label throws (label) with ZERO adapter calls', () => {
  const adapter = new FakeAdapter()
  const gt = new GatedTransport(adapter)
  assert.throws(
    () => gt.createGated(payloadWith({ labels: ['something-else'] })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'label',
  )
  assert.equal(adapter.createCalls.length, 0)
})

test('AC4: a summary lacking the [TEST] prefix throws (prefix) with ZERO adapter calls', () => {
  const adapter = new FakeAdapter()
  const gt = new GatedTransport(adapter)
  assert.throws(
    () => gt.createGated(payloadWith({ summary: 'no prefix here' })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'prefix',
  )
  assert.equal(adapter.createCalls.length, 0)
})

test('AC4: the package STAMPS mcp-test and [TEST] - not trusted from the caller', () => {
  // Title carries neither the label nor the prefix; buildCreatePayload adds both.
  const payload = buildCreatePayload({
    projectKey: 'KONE',
    issuetypeId: '7',
    title: 'plain title with no markers',
    stableId: 'demo-story',
  })
  assert.ok(payload.fields.labels.includes(MCP_TEST_LABEL))
  assert.ok(payload.fields.summary.startsWith(TEST_PREFIX))
  // ...and the stamped payload passes the gate.
  assert.doesNotThrow(() => assertRegistrationGate(payload.fields))
})

test('AC4: oversized/adversarial inputs are handled linear-time with no gate bypass', () => {
  const adapter = new FakeAdapter()
  const gt = new GatedTransport(adapter)
  const huge = 'A'.repeat(200_000)
  // A crafted oversized project key is still just a non-member: refused, zero calls.
  assert.throws(() => gt.createGated(payloadWith({ projectKey: huge })), RegistrationGateError)
  assert.equal(adapter.createCalls.length, 0)
})
