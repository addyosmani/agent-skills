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
  /** Also require every agent the router selects for the merge's diff to
   *  appear in the record, ran or skipped with a reason. Default false. */
  requireRoutedAgents?: boolean
  /** Also require a `Review-obligation:` line, addressed by the declared
   *  reviewer who ran, for every exemption obligation the merge incurs.
   *  The gate needs `requireReviewRecord(review, { obligationsFrom })`.
   *  Default false. */
  requireObligations?: boolean
}

/**
 * One routing rule: `agent` is warranted when any changed file matches
 * `paths`, OR some added line (in the files `lines` selects) matches
 * `added` and does not match `notAdded`, both tested on that same line.
 * Added lines are given without their leading `+`. Regex flags are
 * yours, so write `/…/i` for a case-insensitive route.
 */
export type ReviewRoute = {
  /** Persona to run, as launched (`code-reviewer`, `agent-skills:security-auditor`). */
  agent: string
  /** Short reason printed with the agent. */
  why: string
  /** Globs, relative to `root`, matched against changed files. */
  paths?: string[]
  added?: RegExp
  notAdded?: RegExp
  /** Which files' added lines `added` sees: 'prod' (default) is code
   *  files outside `testPaths`; 'code' adds test sources. Non-code and
   *  binary files are never grepped. */
  lines?: 'prod' | 'code'
}

export type ReviewConfig = {
  /** The branch reviews are measured against. Default 'main'. */
  mainBranch?: string
  /** Directory `paths` and `ignore` globs are relative to: absolute, or
   *  relative to the repository root. Default the repository root. */
  root?: string
  /** Test source paths, tested against repo-relative paths. */
  testPaths?: RegExp
  /** Files that are not code: never grepped, and they don't trigger
   *  the fallback. */
  nonCode?: RegExp
  /** Globs, relative to `root`, left out of routing entirely. */
  ignore?: string[]
  /** Count untracked, non-ignored files as fully added. Default true. */
  includeUntracked?: boolean
  routes?: ReviewRoute[]
  /** Agents warranted by every diff with changes. */
  always?: string[]
  /** Agents run when no route fired and a production code file changed.
   *  A docs- or config-only diff runs nothing. */
  fallback?: string[]
  record?: ReviewRecordOptions
}

export const DEFAULT_TEST_PATHS = /(^|\/)(test|tests|__tests__|spec)\/|\/src\/[A-Za-z]*[Tt]est\//
export const DEFAULT_NON_CODE =
  /\.(md|txt|ya?ml|json|toml|properties|lock|png|jpe?g|gif|webp|svg|ico|pdf)$/i

/** Typed identity helper, like Probity's `defineConfig`. */
export function reviewConfig(config: ReviewConfig): ReviewConfig {
  return config
}

export const DEFAULT_PROTECTED_BRANCHES = ['main', 'master']
