/**
 * AC10: Stage-B receipt + chain (F8/Q8). The minted receipt has kind:'stage',
 * stage:'B', sequence:1, prevHash = the genesis hash, correlation = the
 * approval record's (same workflowId), subjectKind:'RegistrationResult',
 * subject = the RegistrationResult, signature:null, hash =
 * sha256Hex(canonicalize(doc-minus-hash)); it passes validateReceiptDocument;
 * its locator equals receiptPath(workflowId,1,'B','RegistrationResult'); and
 * validateChain([genesis, stageB]) passes.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { canonicalize, type JsonValue, sha256Hex } from '../../approval/src/index.js'
import type { RegistrationResult } from '../../contracts/src/index.js'
import {
  type ReceiptDocument,
  receiptPath,
  validateChain,
  validateReceiptDocument,
} from '../../receipts/src/index.js'
import { mintStageBReceipt } from '../src/receipt.js'
import { register } from '../src/register.js'
import { FakeAdapter, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

const SAMPLE_RESULT: RegistrationResult = {
  ticketKeys: ['KONE-1001', 'KONE-1002'],
  links: [
    {
      direction: 'commit->ticket',
      ticketKey: 'KONE-1002',
      commitSha: 'abc123',
      permalink: 'https://github.com/acme/widgets/blob/abc123/spec.md',
    },
  ],
}

test('AC10: mintStageBReceipt produces the ratified fields and a valid document', () => {
  const fx = singleStoryFixture()
  const minted = mintStageBReceipt(fx.correlation, fx.record.receipt.hash, SAMPLE_RESULT, TS)
  const doc = minted.document
  assert.equal(doc.kind, 'stage')
  assert.equal(doc.stage, 'B')
  assert.equal(doc.sequence, 1)
  assert.equal(doc.claimRef, null)
  assert.equal(doc.prevHash, fx.record.receipt.hash)
  assert.deepEqual(doc.correlation, fx.correlation)
  assert.equal(doc.subjectKind, 'RegistrationResult')
  assert.deepEqual(doc.subject, SAMPLE_RESULT)
  assert.equal(doc.signature, null)

  // hash = sha256Hex(canonicalize(doc minus the hash key))
  const { hash: _omit, ...rest } = doc
  assert.equal(doc.hash, sha256Hex(canonicalize(rest as unknown as JsonValue)))

  assert.equal(validateReceiptDocument(doc).valid, true)
  assert.equal(minted.locator, receiptPath(fx.correlation.workflowId, 1, 'B', 'RegistrationResult'))
})

test('AC10: validateChain([genesis, stageB]) passes', () => {
  const fx = singleStoryFixture()
  const genesisAbs = join(fx.repoRoot, ...fx.record.receipt.locator.split('/'))
  const genesis = JSON.parse(readFileSync(genesisAbs, 'utf8')) as ReceiptDocument
  const minted = mintStageBReceipt(fx.correlation, fx.record.receipt.hash, SAMPLE_RESULT, TS)
  assert.equal(validateChain([genesis, minted.document]).valid, true)
})

test('AC10: the receipt written by a full register() validates and chains from the genesis', async () => {
  const fx = singleStoryFixture()
  const outcome = await register({
    slug: fx.slug,
    repoRoot: fx.repoRoot,
    adapter: new FakeAdapter(),
    timestamp: TS,
  })
  const receiptAbs = join(fx.repoRoot, ...(outcome.receiptLocator as string).split('/'))
  const stageB = JSON.parse(readFileSync(receiptAbs, 'utf8')) as ReceiptDocument
  const genesisAbs = join(fx.repoRoot, ...fx.record.receipt.locator.split('/'))
  const genesis = JSON.parse(readFileSync(genesisAbs, 'utf8')) as ReceiptDocument

  assert.equal(validateReceiptDocument(stageB).valid, true)
  assert.equal(stageB.subjectKind, 'RegistrationResult')
  assert.deepEqual(stageB.subject, outcome.result)
  assert.equal(validateChain([genesis, stageB]).valid, true)
})
