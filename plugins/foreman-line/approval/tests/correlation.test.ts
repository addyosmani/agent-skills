/**
 * AC6: correlation generation + persistence (Q5) - all four generated fields
 * match `UUID_PATTERN`, and `workflowId` equals the `<workflowId>` segment
 * of the minted receipt locator (so W1-P4 can rejoin the chain).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { UUID_PATTERN } from '../../contracts/src/index.js'
import { generateCorrelationContext } from '../src/correlation.js'
import { mintGenesisReceipt } from '../src/receipt.js'

test('AC6: generated CorrelationContext fields all match UUID_PATTERN', () => {
  const correlation = generateCorrelationContext()
  const uuidRe = new RegExp(UUID_PATTERN)
  assert.match(correlation.correlationId, uuidRe)
  assert.match(correlation.sessionId, uuidRe)
  assert.match(correlation.workflowId, uuidRe)
  assert.match(correlation.runId, uuidRe)
})

test('AC6: two calls produce distinct correlation contexts (fresh per approval)', () => {
  const a = generateCorrelationContext()
  const b = generateCorrelationContext()
  assert.notEqual(a.workflowId, b.workflowId)
  assert.notEqual(a.correlationId, b.correlationId)
})

test('AC6: workflowId equals the <workflowId> segment of the minted receipt locator', () => {
  const correlation = generateCorrelationContext()
  const { ref } = mintGenesisReceipt(
    correlation,
    { approvedHash: '5'.repeat(64) },
    '2026-07-22T00:00:00.000Z',
  )
  const segments = ref.locator.split('/')
  assert.equal(segments[2], correlation.workflowId)
})
