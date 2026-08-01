/**
 * AC7: `receiptPath` produces exactly the documented storage path format,
 * and (rework amendment) rejects invalid input with a `RangeError` naming
 * the offending argument. The format assertions for legitimate input are
 * byte-identical to before the guard.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { StageId } from '../../contracts/src/index.js'
import { receiptPath } from '../src/paths.js'

function assertRangeError(fn: () => string, argumentName: string): void {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof RangeError, `expected RangeError, got ${String(err)}`)
    assert.ok(
      err.message.includes(argumentName),
      `expected message to name '${argumentName}', got: ${err.message}`,
    )
    return true
  })
}

test('produces the documented storage path format', () => {
  const path = receiptPath('33333333-3333-3333-3333-333333333333', 0, 'A', 'ShapingResult')
  assert.equal(
    path,
    'docs/receipts/33333333-3333-3333-3333-333333333333/000000-A-shaping-result.json',
  )
})

test('zero-pads sequence to 6 digits and applies the slug transform on a multi-word subjectKind', () => {
  const path = receiptPath('33333333-3333-3333-3333-333333333333', 42, 'D', 'HarnessClaimResult')
  assert.equal(
    path,
    'docs/receipts/33333333-3333-3333-3333-333333333333/000042-D-harness-claim-result.json',
  )
})

// Rework amendment: runtime input guard, RangeError naming the offending argument.

const WF = '33333333-3333-3333-3333-333333333333'

test('rejects a path-traversal workflowId', () => {
  assertRangeError(() => receiptPath('../../../etc', 0, 'A', 'ShapingResult'), 'workflowId')
})

test('rejects a non-UUID workflowId', () => {
  assertRangeError(() => receiptPath('not-a-uuid', 0, 'A', 'ShapingResult'), 'workflowId')
})

test('rejects a negative sequence', () => {
  assertRangeError(() => receiptPath(WF, -1, 'A', 'ShapingResult'), 'sequence')
})

test('rejects a non-integer sequence', () => {
  assertRangeError(() => receiptPath(WF, 1.5, 'A', 'ShapingResult'), 'sequence')
})

test('rejects a sequence above the 6-digit ceiling (999999)', () => {
  assertRangeError(() => receiptPath(WF, 1000000, 'A', 'ShapingResult'), 'sequence')
})

test('accepts the 6-digit ceiling itself (999999)', () => {
  assert.equal(
    receiptPath(WF, 999999, 'F', 'ClosureRecord'),
    `docs/receipts/${WF}/999999-F-closure-record.json`,
  )
})

test('rejects an invalid stage', () => {
  assertRangeError(() => receiptPath(WF, 0, 'Z' as StageId, 'ShapingResult'), 'stage')
})

test('rejects a subjectKind containing a path separator (reject, not strip)', () => {
  assertRangeError(() => receiptPath(WF, 0, 'A', '../evil'), 'subjectKind')
})

test('rejects a subjectKind that slugifies to empty', () => {
  assertRangeError(() => receiptPath(WF, 0, 'A', ''), 'subjectKind')
})
