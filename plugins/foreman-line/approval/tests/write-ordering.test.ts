/**
 * Rework item 2: write-ordering durability. `performApproval` writes the
 * approval record BEFORE the genesis receipt; if the receipt write then
 * fails, the just-written approval record is rolled back (deleted) so
 * neither file is ever left orphaned relative to the other.
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { approvalRecordPath } from '../src/approval-record.js'
import { performApproval } from '../src/approve-flow.js'
import { resolveArtifact } from '../src/resolve-input.js'
import { makeTempRepoRoot, writeProjectedFixture, writeSpecDraft } from './helpers.js'

function projectedFixtureRepo(): string {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  writeProjectedFixture(repoRoot, 'example', {
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/example.md'],
    epics: [
      {
        key: 'epic-example',
        title: 'Example Epic',
        stories: [{ key: 'example', title: 'Example' }],
      },
    ],
  })
  return repoRoot
}

test('performApproval succeeds and writes both the approval record and the receipt', () => {
  const repoRoot = projectedFixtureRepo()
  const resolved = resolveArtifact('example', { repoRoot })

  const { recordPath, receiptPath, record } = performApproval(resolved, 'clinton.morgan', repoRoot)

  assert.ok(existsSync(recordPath))
  assert.ok(existsSync(receiptPath))
  assert.equal(record.decision, 'approved')
  assert.equal(record.receipt.locator.includes('shaping-result'), true)
  assert.equal(recordPath, approvalRecordPath('example', repoRoot))
})

test('when the receipt write fails, the approval record is rolled back - no orphan of EITHER file', () => {
  const repoRoot = projectedFixtureRepo()
  const resolved = resolveArtifact('example', { repoRoot })

  // Force the receipt write to fail deterministically: pre-create
  // `docs/receipts` as a plain FILE (not a directory), so
  // `mkdirSync(dirname(absPath), { recursive: true })` inside
  // `writeReceiptDocument` throws when it tries to create the workflowId
  // subdirectory beneath it.
  const receiptsAsFile = join(repoRoot, 'docs', 'receipts')
  mkdirSync(join(repoRoot, 'docs'), { recursive: true })
  writeFileSync(receiptsAsFile, 'not a directory', 'utf8')

  const recordPath = approvalRecordPath('example', repoRoot)

  assert.throws(() => performApproval(resolved, 'clinton.morgan', repoRoot))

  // No orphaned approval record...
  assert.equal(
    existsSync(recordPath),
    false,
    'approval record must be rolled back on receipt-write failure',
  )
  // ...and the planted file is untouched (no receipt was ever durably
  // written at or beneath that path).
  assert.equal(existsSync(receiptsAsFile), true)
  assert.equal(readFileSync(receiptsAsFile, 'utf8'), 'not a directory')
})

test('a pre-existing approval record refuses before any mint/write, leaving the pre-existing record untouched', () => {
  const repoRoot = projectedFixtureRepo()
  const resolved = resolveArtifact('example', { repoRoot })
  const recordPath = approvalRecordPath('example', repoRoot)
  mkdirSync(dirname(recordPath), { recursive: true })
  writeFileSync(recordPath, '{"pre-existing":true}\n', 'utf8')

  assert.throws(() => performApproval(resolved, 'clinton.morgan', repoRoot))

  assert.equal(readFileSync(recordPath, 'utf8'), '{"pre-existing":true}\n')
  assert.equal(existsSync(join(repoRoot, 'docs', 'receipts')), false)
})
