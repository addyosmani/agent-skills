/**
 * AC4: the approval record sidecar - path/naming, valid parseable JSON, and
 * refuse-to-overwrite (throws naming the colliding path).
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  type ApprovalRecord,
  approvalRecordPath,
  writeApprovalRecord,
} from '../src/approval-record.js'
import { generateCorrelationContext } from '../src/correlation.js'
import { computeApprovalSubject } from '../src/subject.js'
import { makeTempRepoRoot, sampleShapingResult, writeSpecDraft } from './helpers.js'

function makeRecord(repoRoot: string): ApprovalRecord {
  const payload = sampleShapingResult()
  const { subject, approvedHash } = computeApprovalSubject(payload, repoRoot)
  return {
    approvedHash,
    artifactRef: 'plugins/foreman-line/docs/specs/active/example.projected.shaping-result.json',
    subject,
    decision: 'approved',
    timestamp: '2026-07-22T00:00:00.000Z',
    approver: 'clinton.morgan',
    correlation: generateCorrelationContext(),
    receipt: { hash: '0'.repeat(64), locator: 'docs/receipts/x/000000-A-shaping-result.json' },
  }
}

test('AC4: writes active/<slug>.approval.json at the expected path, valid parseable JSON', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const record = makeRecord(repoRoot)

  const written = writeApprovalRecord('example', record, repoRoot)

  const expected = join(
    repoRoot,
    'plugins',
    'foreman-line',
    'docs',
    'specs',
    'active',
    'example.approval.json',
  )
  assert.equal(written, expected)
  assert.equal(approvalRecordPath('example', repoRoot), expected)
  assert.ok(existsSync(written))

  const parsed = JSON.parse(readFileSync(written, 'utf8'))
  assert.equal(parsed.approvedHash, record.approvedHash)
  assert.equal(parsed.decision, 'approved')
})

test('AC4: refuses to overwrite an existing approval record, throwing naming the path', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const record = makeRecord(repoRoot)
  const path = writeApprovalRecord('example', record, repoRoot)

  assert.throws(
    () => writeApprovalRecord('example', record, repoRoot),
    (err: unknown) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes(path), err.message)
      return true
    },
  )
})

test('AC4: the sidecar is a non-.md file the spec-linter never collects', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const record = makeRecord(repoRoot)
  const path = writeApprovalRecord('example', record, repoRoot)
  assert.ok(path.endsWith('.approval.json'))
  assert.ok(!path.endsWith('.md'))
})
