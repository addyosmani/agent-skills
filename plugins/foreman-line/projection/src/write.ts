/**
 * Output mechanics (Q5): a new sibling artifact, never in-place. The pristine
 * `<slug>.shaping-result.json` is untouched - this writes a distinct
 * `<slug>.projected.shaping-result.json` file only.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ShapingResult } from '../../contracts/src/index.js'
// Read-only reference to the shipped emitter's directory constant - reused,
// never redefined, so both packages agree on where `active/` is.
import { ACTIVE_SPECS_DIR } from '../../shaping/src/index.js'
import { assertSafeSlug } from './path-guard.js'
import { DEFAULT_REPO_ROOT } from './paths.js'

export const PROJECTED_ARTIFACT_SUFFIX = '.projected.shaping-result.json'

export interface WriteOptions {
  readonly repoRoot?: string
}

export interface WriteResult {
  /** Absolute filesystem path the artifact was written to. */
  readonly artifactPath: string
  /** Repo-relative POSIX path of the artifact (`active/<slug>.projected.shaping-result.json`). */
  readonly artifactRef: string
  /** The filled payload that was written. */
  readonly payload: ShapingResult
}

/**
 * Write the filled `ShapingResult` to `active/<slug>.projected.shaping-result.json`.
 * Refuses to overwrite an existing projected artifact (throws naming the
 * colliding path) - mirrors W1-P1's collision policy. Never touches
 * `<slug>.shaping-result.json`.
 */
export function writeProjectedArtifact(
  slug: string,
  payload: ShapingResult,
  options: WriteOptions = {},
): WriteResult {
  assertSafeSlug(slug)
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT
  const activeDir = join(repoRoot, ...ACTIVE_SPECS_DIR.split('/'))
  const fileName = `${slug}${PROJECTED_ARTIFACT_SUFFIX}`
  const artifactPath = join(activeDir, fileName)
  const artifactRef = `${ACTIVE_SPECS_DIR}/${fileName}`

  if (existsSync(artifactPath)) {
    throw new Error(
      `writeProjectedArtifact: refusing to overwrite existing projected artifact at ${artifactPath}`,
    )
  }

  mkdirSync(activeDir, { recursive: true })
  // Two-space pretty JSON with trailing newline; a plain object, RFC 8785-canonicalizable.
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  return { artifactPath, artifactRef, payload }
}
