/**
 * Storage convention (spec Constraints): in-repo, git-committed JSON, one
 * file per receipt, at
 * `docs/receipts/<workflowId>/<sequence, 6-digit zero-padded>-<stage>-<subjectKind-slug>.json`.
 * `ReceiptRef.locator` is exactly this path, POSIX-separator, relative to the
 * repo root.
 *
 * Input guard (rework amendment, coordinator-ratified): this parcel freezes
 * the locator convention W3 will write git-committed files against, so
 * `receiptPath` rejects invalid input at runtime rather than interpolating
 * it — `workflowId` must match `UUID_PATTERN`, `sequence` must be an integer
 * in 0..999999 (the 6-digit zero-padding ceiling), `stage` must be one of
 * `STAGE_IDS`, and the slugified `subjectKind` must be non-empty and match
 * `^[a-z0-9-]+$` (reject, don't strip — silent stripping would change
 * locators). Any violation throws a `RangeError` naming the offending
 * argument. The produced format is unchanged for all legitimate input.
 */
import { STAGE_IDS, type StageId, UUID_PATTERN } from '../../contracts/src/index.js'

const UUID_RE = new RegExp(UUID_PATTERN)
const SLUG_RE = /^[a-z0-9-]+$/
const MAX_SEQUENCE = 999999

function slugify(subjectKind: string): string {
  return subjectKind.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function receiptPath(
  workflowId: string,
  sequence: number,
  stage: StageId,
  subjectKind: string,
): string {
  if (!UUID_RE.test(workflowId)) {
    throw new RangeError(`workflowId must match UUID_PATTERN, got ${JSON.stringify(workflowId)}`)
  }
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > MAX_SEQUENCE) {
    throw new RangeError(
      `sequence must be an integer in 0..${MAX_SEQUENCE}, got ${JSON.stringify(sequence)}`,
    )
  }
  if (!STAGE_IDS.includes(stage)) {
    throw new RangeError(
      `stage must be one of ${STAGE_IDS.join(', ')}, got ${JSON.stringify(stage)}`,
    )
  }
  const slug = slugify(subjectKind)
  if (slug.length === 0 || !SLUG_RE.test(slug)) {
    throw new RangeError(
      `subjectKind must slugify to a non-empty string matching ^[a-z0-9-]+$, got ${JSON.stringify(subjectKind)}`,
    )
  }
  const paddedSequence = String(sequence).padStart(6, '0')
  return `docs/receipts/${workflowId}/${paddedSequence}-${stage}-${slug}.json`
}
