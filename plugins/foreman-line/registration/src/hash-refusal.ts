/**
 * F7 hash-refusal (charter F7; coordinator ruling Q4). Consumes `approval`'s
 * exported `computeApprovalSubject` (which itself uses `approval`'s
 * `canonicalize`/`sha256Hex`) READ-ONLY - the identical code path that produced
 * `approvedHash`, so there is zero parity-drift risk and no fourth vendored
 * canonical/hash copy. Re-derives the composite subject hash from CURRENT
 * on-disk content and refuses (typed `HashMismatchError`, exit code 1) if it
 * differs from the approval record's `approvedHash`.
 */
import type { ApprovalRecord } from '../../approval/src/index.js'
import { computeApprovalSubject } from '../../approval/src/index.js'
import { HashMismatchError } from './types.js'

/**
 * First-registration precondition: throw `HashMismatchError` unless current
 * content re-derives to the approved hash. Evaluated only while content is
 * still in its approved state (the prior-registration check gates this - see
 * `prior-registration.ts`).
 */
export function assertApprovedHashMatches(record: ApprovalRecord, repoRoot: string): void {
  const { approvedHash } = computeApprovalSubject(record.subject.projectedResult, repoRoot)
  if (approvedHash !== record.approvedHash) {
    throw new HashMismatchError(record.approvedHash, approvedHash)
  }
}
