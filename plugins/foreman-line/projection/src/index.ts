/**
 * Public surface of the Foreman Line Epic/Story projection package (W1-P2).
 * Library-only - no CLI (Q8; the CLI is W1-P3's surface). `ShapingResult`,
 * `EpicNode`, `StoryNode`, and `shapingResultSchema` are NOT re-exported here -
 * they are owned by the frozen `contracts` package and imported from there
 * directly by consumers, same precedent as `shaping`.
 */
export { type WriteProjectedResultOptions, writeProjectedResult } from './api.js'
export { discoverProjectableInputs, PROJECTED_SUFFIX } from './discover.js'
export { assertSemanticGuards } from './guards.js'
export { deriveEpicKey, slugFromInputPath, specFilenameStem } from './keys.js'
export { assertContainedPath, assertSafeSlug } from './path-guard.js'
export { DEFAULT_REPO_ROOT } from './paths.js'
export { type ProjectOptions, projectShapingResult } from './project.js'
export { readSpecTitle } from './title.js'
export {
  PROJECTED_ARTIFACT_SUFFIX,
  type WriteOptions,
  type WriteResult,
  writeProjectedArtifact,
} from './write.js'
