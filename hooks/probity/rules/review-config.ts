/**
 * The project's review configuration: one named export in
 * probity.config.ts, read by the merge gate (`requireReviewRecord`), the
 * CI checker (`probity-review-record`) and, later, the review router.
 *
 * It sits next to the default export, not inside it, because Probity's
 * `Config` is a closed `{ rules, ai }` type:
 *
 *   export const review = reviewConfig({
 *     mainBranch: 'main',
 *     record: { enforceForPaths: /^(src|ui)\//, protectedBranches: ['main'] },
 *   })
 *
 *   export default probityConfig({
 *     rules: [...kotlinRuleEntries(ROOT), requireReviewRecord(review)],
 *   })
 */
export type ReviewRecordOptions = {
  /** Only demand a record when the merge changes a file whose
   *  repo-relative path matches. Omitted: every merge into a protected
   *  branch needs one. */
  enforceForPaths?: RegExp
  /** Branches a merge into which needs a record. Default ['main', 'master']. */
  protectedBranches?: string[]
}

export type ReviewConfig = {
  /** The branch reviews are measured against. Default 'main'. */
  mainBranch?: string
  record?: ReviewRecordOptions
}

/** Typed identity helper, like Probity's `defineConfig`. */
export function reviewConfig(config: ReviewConfig): ReviewConfig {
  return config
}

export const DEFAULT_PROTECTED_BRANCHES = ['main', 'master']
