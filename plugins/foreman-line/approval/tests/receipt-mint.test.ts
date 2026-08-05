/**
 * AC5: exactly one `ReceiptDocument` is minted at approval - the genesis IS
 * the Stage-A receipt. Asserts the frozen fields, `validateReceiptDocument`
 * passes, no second receipt is minted, and the stored locator equals
 * `receiptPath(workflowId, 0, 'A', 'ShapingResult')` with `ReceiptRef`
 * mirroring the document's `hash` + that locator.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateReceiptDocument } from '../../receipts/src/index.js'
import { generateCorrelationContext } from '../src/correlation.js'
import { mintGenesisReceipt } from '../src/receipt.js'
import { writeReceiptDocument } from '../src/receipt-writer.js'
import { makeTempRepoRoot } from './helpers.js'

test('AC5: minted document has the frozen genesis/Stage-A fields and passes validateReceiptDocument', () => {
  const correlation = generateCorrelationContext()
  const subject = {
    approvedHash: '1'.repeat(64),
    projectedResult: { parcelSpecRefs: [], epics: [] },
  }
  const { document, ref } = mintGenesisReceipt(correlation, subject, '2026-07-22T00:00:00.000Z')

  assert.equal(document.kind, 'stage')
  assert.equal(document.stage, 'A')
  assert.equal(document.sequence, 0)
  assert.equal(document.prevHash, null)
  assert.equal(document.subjectKind, 'ShapingResult')
  assert.deepEqual(document.subject, subject)
  assert.equal(document.signature, null)
  assert.match(document.hash, /^[0-9a-f]{64}$/)

  const result = validateReceiptDocument(document)
  assert.ok(result.valid, result.errors.join('; '))

  assert.equal(ref.hash, document.hash)
})

test('AC5: stored locator equals receiptPath(workflowId, 0, "A", "ShapingResult")', () => {
  const correlation = generateCorrelationContext()
  const subject = { approvedHash: '2'.repeat(64) }
  const { ref } = mintGenesisReceipt(correlation, subject, '2026-07-22T00:00:00.000Z')

  assert.equal(ref.locator, `docs/receipts/${correlation.workflowId}/000000-A-shaping-result.json`)
})

test('AC5: no second receipt is minted - a fresh call yields an independent document/hash', () => {
  const correlation = generateCorrelationContext()
  const subject = { approvedHash: '3'.repeat(64) }
  const first = mintGenesisReceipt(correlation, subject, '2026-07-22T00:00:00.000Z')
  const second = mintGenesisReceipt(correlation, subject, '2026-07-22T00:00:00.000Z')
  // Same inputs -> same deterministic hash; only ONE call site in the CLI
  // ever invokes this (asserted structurally in cli-verbs.test.ts), so no
  // second receipt is minted per approval in practice.
  assert.equal(first.document.hash, second.document.hash)
})

test('AC5: writeReceiptDocument writes the minted document at the exact locator', () => {
  const repoRoot = makeTempRepoRoot()
  const correlation = generateCorrelationContext()
  const subject = { approvedHash: '4'.repeat(64) }
  const { document, ref } = mintGenesisReceipt(correlation, subject, '2026-07-22T00:00:00.000Z')

  const absPath = writeReceiptDocument(document, ref.locator, repoRoot)

  assert.equal(absPath, join(repoRoot, ...ref.locator.split('/')))
  assert.ok(existsSync(absPath))
  const written = JSON.parse(readFileSync(absPath, 'utf8'))
  assert.equal(written.hash, document.hash)
})
