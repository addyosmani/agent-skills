/**
 * Slug containment guard (rework item 1 - the third occurrence of this
 * defect class in this goal: W1-P1's `sessionSlug`, W1-P2's `slug`/
 * `specRef`, now this parcel's record/artifact-path construction). A single
 * shared helper used at every slug-accepting site in this package so the
 * accepted character set can never drift between call sites (same rationale
 * as `projection`'s `assertSafeSlug`).
 *
 * `^[a-z0-9-]+$` is a bounded character class with no nested quantifiers -
 * linear-time, no polynomial-backtracking risk (lesson #19).
 */
const SLUG_PATTERN = /^[a-z0-9-]+$/

/**
 * Throws a uniform error naming the offending slug when `slug` does not
 * match `^[a-z0-9-]+$` - called BEFORE any path is constructed from it, at
 * both the argument-acceptance point (`resolveArtifact`'s bare-slug branch)
 * and every path-construction point (`approvalRecordPath`,
 * `rejectionRecordPath`).
 */
export function assertSafeSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `assertSafeSlug: slug must match ^[a-z0-9-]+$ (lowercase alphanumeric and hyphen only), got ${JSON.stringify(slug)}`,
    )
  }
}
