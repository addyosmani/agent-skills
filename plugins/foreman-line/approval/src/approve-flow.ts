/**
 * The approval write orchestration (rework item 2): durability ordering.
 * The approval record is written BEFORE the genesis receipt, so the record
 * is durable before-or-atomically-with the receipt it references. If the
 * receipt write then fails, the just-written approval record is rolled back
 * (deleted) before rethrowing, so neither file is ever left orphaned
 * relative to the other.
 *
 * This is the ONLY function in the package that mints a receipt and writes
 * an approval record - `src/cli.ts`'s `runApprove` calls it exactly once,
 * only after BOTH human-gate checks (interactive TTY + typed confirmation)
 * have passed (see `human-gate-integrity.test.ts`).
 */
import { existsSync, rmSync } from 'node:fs'
import { type ApprovalRecord, approvalRecordPath, writeApprovalRecord } from './approval-record.js'
import { generateCorrelationContext } from './correlation.js'
import { mintGenesisReceipt } from './receipt.js'
import { writeReceiptDocument } from './receipt-writer.js'
import type { ResolvedArtifact } from './resolve-input.js'
import { computeApprovalSubject } from './subject.js'

export interface PerformApprovalResult {
  readonly record: ApprovalRecord
  readonly recordPath: string
  readonly receiptPath: string
}

/**
 * Refuses (throws, naming the path) if `<slug>.approval.json` already
 * exists - checked before any mint/write is attempted.
 */
export function performApproval(
  resolved: ResolvedArtifact,
  approver: string,
  repoRoot?: string,
): PerformApprovalResult {
  const recordPath = approvalRecordPath(resolved.slug, repoRoot)
  if (existsSync(recordPath)) {
    throw new Error(
      `performApproval: refusing to overwrite existing approval record at ${recordPath}`,
    )
  }

  const { subject, approvedHash } = computeApprovalSubject(resolved.projectedResult, repoRoot)
  const correlation = generateCorrelationContext()
  const timestamp = new Date().toISOString()
  const { document, ref } = mintGenesisReceipt(correlation, { ...subject, approvedHash }, timestamp)

  const record: ApprovalRecord = {
    approvedHash,
    artifactRef: resolved.artifactRef,
    subject,
    decision: 'approved',
    timestamp,
    approver,
    correlation,
    receipt: ref,
  }

  // Durability ordering (rework item 2): record first, receipt second.
  const writtenRecordPath = writeApprovalRecord(resolved.slug, record, repoRoot)
  try {
    const writtenReceiptPath = writeReceiptDocument(document, ref.locator, repoRoot)
    return { record, recordPath: writtenRecordPath, receiptPath: writtenReceiptPath }
  } catch (err) {
    // Roll back the just-written approval record so it never outlives (or
    // points at) a receipt that was never actually written.
    rmSync(writtenRecordPath, { force: true })
    throw err
  }
}
