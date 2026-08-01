/**
 * Approval record sidecar (coordinator ruling Q3): written to
 * `plugins/foreman-line/docs/specs/active/<slug>.approval.json` - a non-`.md`
 * sibling never trips the spec-linter (same rationale as the projected
 * artifact). Refuses to overwrite an existing `<slug>.approval.json` (throws
 * naming the colliding path), mirroring W1-P1/W1-P2 collision policy.
 *
 * Contents (Q3 + coordinator ruling F4): `approvedHash`; `artifactRef` (the
 * repo-relative path to the projected artifact actually presented) AND the
 * full subject manifest verbatim (`projectedResult` payload + ordered
 * `specSet` with per-ref `contentHash`) - storage granularity does not change
 * the hashed subject, which remains exactly Q2's composite; `decision:
 * "approved"`; an ISO-8601 UTC `timestamp`; the approver identity (Q6/F1: the
 * required `--approver` CLI flag, never OS-inferred); the freshly-minted
 * `CorrelationContext` (Q5); and the minted `ReceiptRef`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CorrelationContext, ReceiptRef } from '../../contracts/src/index.js'
import { ACTIVE_SPECS_DIR, DEFAULT_REPO_ROOT } from './paths.js'
import { assertSafeSlug } from './slug-guard.js'
import type { ApprovalSubject } from './subject.js'

export const APPROVAL_RECORD_SUFFIX = '.approval.json'

export interface ApprovalRecord {
  readonly approvedHash: string
  readonly artifactRef: string
  readonly subject: ApprovalSubject
  readonly decision: 'approved'
  readonly timestamp: string
  readonly approver: string
  readonly correlation: CorrelationContext
  readonly receipt: ReceiptRef
}

/**
 * Builds the approval-record path for `slug`. `slug` is validated (rework
 * item 1) BEFORE any path is constructed from it - a slug containing `../`,
 * `/`, `\`, or uppercase is refused, naming the offending slug.
 */
export function approvalRecordPath(slug: string, repoRoot: string = DEFAULT_REPO_ROOT): string {
  assertSafeSlug(slug)
  const activeDir = join(repoRoot, ...ACTIVE_SPECS_DIR.split('/'))
  return join(activeDir, `${slug}${APPROVAL_RECORD_SUFFIX}`)
}

/**
 * Write the approval record for `slug`. Refuses to overwrite an existing
 * record - a re-approval after amendment is a deliberate, human-driven act
 * (a fresh CLI invocation after removing the stale sidecar), never a silent
 * clobber.
 */
export function writeApprovalRecord(
  slug: string,
  record: ApprovalRecord,
  repoRoot: string = DEFAULT_REPO_ROOT,
): string {
  const filePath = approvalRecordPath(slug, repoRoot)
  if (existsSync(filePath)) {
    throw new Error(
      `writeApprovalRecord: refusing to overwrite existing approval record at ${filePath}`,
    )
  }
  mkdirSync(join(repoRoot, ...ACTIVE_SPECS_DIR.split('/')), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
  return filePath
}
