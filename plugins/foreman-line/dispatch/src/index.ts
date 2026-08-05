/**
 * Public API for @foreman-line/dispatch.
 *
 * Current sub-modules:
 *   src/query/        — Jira JQL search + next-candidate ranking (W2-P1)
 *   src/routing-eval/ — Model routing evaluation engine (W2-P3)
 *
 * To be extended by subsequent W2 parcels:
 *   src/skill-resolver/ — W2-P5
 *   src/kompress-adapter/ — W2-P4
 *   src/approval-cli/  — W2-P2
 */

// Re-export routing-policy vocabulary so callers need not import directly from that package
export type { ClassName, DataClassificationTier } from '../../routing-policy/src/index.js'
// W2-P5: skill-injection vocabulary
export type { SkillName } from '../../skill-injection/src/index.js'
// W2-P2: approval-cli
export type {
  DispatchInput,
  DispatchOptions,
  DispatchPackage,
  DispatchWorktreeInput,
  DispatchWorktreeOutput,
  ExecuteResult,
  SpecFrontmatter,
} from './approval-cli/index.js'
export { DispatchError, executeDispatch, prepareDispatch } from './approval-cli/index.js'
// W2-P4: kompress-adapter
export type {
  KompressCallResult,
  KompressFn,
  KompressInput,
  KompressOptions,
  KompressResult,
} from './kompress-adapter/index.js'
export { KompressError, kompressContext } from './kompress-adapter/index.js'
export type {
  CandidateRecord,
  McpClientFactory,
  McpToolClient,
  QueryOptions,
  RankedCandidateList,
} from './query/index.js'
export { buildCandidateJql, queryAndRankCandidates, SITE_URL } from './query/index.js'
// W2-P3: routing-eval
export type {
  RoutingInput,
  RoutingOptions,
  RoutingResult,
} from './routing-eval/index.js'
export { evaluateRouting, RoutingError } from './routing-eval/index.js'
// W2-P5: skill-resolver
export type {
  SkillResolverInput,
  SkillResolverOptions,
  SkillResolverResult,
} from './skill-resolver/index.js'
export { resolveSkills, SkillResolverError } from './skill-resolver/index.js'
