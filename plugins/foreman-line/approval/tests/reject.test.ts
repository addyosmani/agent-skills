/**
 * AC10: `reject` produces a rejection record (`decision: "rejected"`, reason,
 * ISO-UTC timestamp, reference subject hash), mints no receipt file, and
 * writes no `<slug>.approval.json`.
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { approvalRecordPath } from '../src/approval-record.js'
import { rejectionRecordPath, writeRejectionRecord } from '../src/rejection-record.js'
import { computeApprovalSubject } from '../src/subject.js'
import {
  ACTIVE_SPECS_REL,
  makeTempRepoRoot,
  sampleShapingResult,
  writeSpecDraft,
} from './helpers.js'

test('AC10: writeRejectionRecord writes decision "rejected", reason, ISO-UTC timestamp, referenceHash', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const payload = sampleShapingResult()
  const { approvedHash } = computeApprovalSubject(payload, repoRoot)

  const path = writeRejectionRecord(
    'example',
    {
      decision: 'rejected',
      reason: 'not ready',
      timestamp: '2026-07-22T00:00:00.000Z',
      referenceHash: approvedHash,
    },
    repoRoot,
  )

  assert.equal(path, rejectionRecordPath('example', repoRoot))
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(parsed.decision, 'rejected')
  assert.equal(parsed.reason, 'not ready')
  assert.match(parsed.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
  assert.equal(parsed.referenceHash, approvedHash)
})

test('AC10: reject mints no receipt file and writes no <slug>.approval.json', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const payload = sampleShapingResult()
  const { approvedHash } = computeApprovalSubject(payload, repoRoot)

  writeRejectionRecord(
    'example',
    {
      decision: 'rejected',
      reason: null,
      timestamp: '2026-07-22T00:00:00.000Z',
      referenceHash: approvedHash,
    },
    repoRoot,
  )

  assert.equal(existsSync(approvalRecordPath('example', repoRoot)), false)
  const receiptsDir = join(repoRoot, 'docs', 'receipts')
  assert.equal(existsSync(receiptsDir), false)
})

test('AC10: reason defaults to null when omitted, distinct from the approval sidecar suffix', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const path = writeRejectionRecord(
    'example',
    {
      decision: 'rejected',
      reason: null,
      timestamp: '2026-07-22T00:00:00.000Z',
      referenceHash: '0'.repeat(64),
    },
    repoRoot,
  )
  const parsed = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(parsed.reason, null)
  assert.ok(path.endsWith('.rejection.json'))
  assert.ok(!path.endsWith('.approval.json'))
  assert.ok(
    readdirSync(join(repoRoot, ...ACTIVE_SPECS_REL.split('/'))).every(
      (n) => !n.endsWith('.approval.json'),
    ),
  )
})
