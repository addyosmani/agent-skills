/**
 * Convenience wrapper (AC2 amendment): most callers pass an explicit input
 * path and an `epicTitle` and never touch slug math directly.
 */
import { readShapingResult } from '../../shaping/src/index.js'
import { slugFromInputPath } from './keys.js'
import { projectShapingResult } from './project.js'
import { type WriteResult, writeProjectedArtifact } from './write.js'

export interface WriteProjectedResultOptions {
  readonly repoRoot?: string
}

/**
 * Read `inputPath` via the shipped `readShapingResult`, derive its slug from
 * the basename, project, and write the new sibling artifact. Throws on any
 * failure of the read, the projection, or the write (refuse-to-overwrite
 * included).
 */
export function writeProjectedResult(
  inputPath: string,
  epicTitle: string,
  options: WriteProjectedResultOptions = {},
): WriteResult {
  const slug = slugFromInputPath(inputPath)
  const input = readShapingResult(inputPath)
  const payload = projectShapingResult(input, epicTitle, slug, { repoRoot: options.repoRoot })
  return writeProjectedArtifact(slug, payload, { repoRoot: options.repoRoot })
}
