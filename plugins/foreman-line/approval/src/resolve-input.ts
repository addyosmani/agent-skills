/**
 * Projection invocation (coordinator ruling Q7, "load-if-exists, else
 * project-then-present"): for `show`/`approve`/`reject` the CLI resolves the
 * projected artifact `active/<slug>.projected.shaping-result.json`. If it
 * already exists, load and render it (the approval subject is the on-disk
 * projected artifact). If it does not exist, invoke the shipped `projection`
 * `writeProjectedResult(inputPath, epicTitle)` to produce it first (with
 * `--epic-title` used only on this project path), then render. Approval
 * always binds to the artifact actually presented - never one regenerated or
 * mutated after the render.
 *
 * Argument disambiguation (coordinator ruling F3, suffix-based): an argument
 * ending in `.projected.shaping-result.json` names a direct path to an
 * already-projected artifact; an argument ending in `.shaping-result.json`
 * (not the projected suffix) names the `inputPath` handed to
 * `writeProjectedResult` on the project-then-present path; anything else is
 * treated as a bare slug, deriving both candidate paths under `active/`.
 */
import { existsSync } from 'node:fs'
import { basename, isAbsolute, join } from 'node:path'
import type { ShapingResult } from '../../contracts/src/index.js'
import { writeProjectedResult } from '../../projection/src/index.js'
import { readShapingResult } from '../../shaping/src/index.js'
import { ACTIVE_SPECS_DIR, DEFAULT_REPO_ROOT } from './paths.js'
import { assertSafeSlug } from './slug-guard.js'

export const PROJECTED_SUFFIX = '.projected.shaping-result.json'
export const SHAPING_RESULT_SUFFIX = '.shaping-result.json'

export interface ResolveOptions {
  readonly repoRoot?: string
  /** Used ONLY on the project-then-present path (Q7). */
  readonly epicTitle?: string
}

export interface ResolvedArtifact {
  readonly slug: string
  readonly artifactPath: string
  readonly artifactRef: string
  readonly projectedResult: ShapingResult
  /** True iff this call invoked `writeProjectedResult` (project-then-present). */
  readonly wasProjected: boolean
}

function slugFromArg(arg: string): string {
  const base = basename(arg)
  if (base.endsWith(PROJECTED_SUFFIX)) {
    return base.slice(0, base.length - PROJECTED_SUFFIX.length)
  }
  if (base.endsWith(SHAPING_RESULT_SUFFIX)) {
    return base.slice(0, base.length - SHAPING_RESULT_SUFFIX.length)
  }
  return arg
}

/**
 * Builds the projected-artifact location for `slug`. `slug` is validated
 * (rework item 1, path-construction point) BEFORE any path is built from it
 * - a slug containing `../`, `/`, `\`, or uppercase is refused, naming the
 * offending slug. Same helper, same rejected character set, as the
 * argument-acceptance guard in the bare-slug branch below and as
 * `approvalRecordPath`/`rejectionRecordPath` - the dual-guard shape already
 * established by `projection` (W1-P2).
 */
function projectedArtifactLocation(
  slug: string,
  repoRoot: string,
): { readonly abs: string; readonly ref: string } {
  assertSafeSlug(slug)
  const activeDir = join(repoRoot, ...ACTIVE_SPECS_DIR.split('/'))
  const fileName = `${slug}${PROJECTED_SUFFIX}`
  return { abs: join(activeDir, fileName), ref: `${ACTIVE_SPECS_DIR}/${fileName}` }
}

function toAbs(arg: string, repoRoot: string): string {
  return isAbsolute(arg) ? arg : join(repoRoot, ...arg.split('/'))
}

function loadExisting(slug: string, repoRoot: string): ResolvedArtifact {
  const { abs, ref } = projectedArtifactLocation(slug, repoRoot)
  return {
    slug,
    artifactPath: abs,
    artifactRef: ref,
    projectedResult: readShapingResult(abs),
    wasProjected: false,
  }
}

function projectThenPresent(
  slug: string,
  inputAbs: string,
  epicTitle: string,
  repoRoot: string,
): ResolvedArtifact {
  const written = writeProjectedResult(inputAbs, epicTitle, { repoRoot })
  return {
    slug,
    artifactPath: written.artifactPath,
    artifactRef: written.artifactRef,
    projectedResult: written.payload,
    wasProjected: true,
  }
}

/**
 * Resolve `arg` (a projected-artifact path, a shaping-result input path, or
 * a bare slug) to the artifact actually presented to the human. Throws if no
 * projected artifact exists and no `epicTitle` was supplied to project one.
 */
export function resolveArtifact(arg: string, options: ResolveOptions = {}): ResolvedArtifact {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT

  if (arg.endsWith(PROJECTED_SUFFIX)) {
    const slug = slugFromArg(arg)
    const abs = toAbs(arg, repoRoot)
    if (!existsSync(abs)) {
      throw new Error(`resolveArtifact: projected artifact not found at ${abs}`)
    }
    const { ref } = projectedArtifactLocation(slug, repoRoot)
    return {
      slug,
      artifactPath: abs,
      artifactRef: ref,
      projectedResult: readShapingResult(abs),
      wasProjected: false,
    }
  }

  if (arg.endsWith(SHAPING_RESULT_SUFFIX)) {
    const slug = slugFromArg(arg)
    const { abs } = projectedArtifactLocation(slug, repoRoot)
    if (existsSync(abs)) return loadExisting(slug, repoRoot)
    if (options.epicTitle === undefined) {
      throw new Error(
        `resolveArtifact: no projected artifact exists for '${slug}' and no --epic-title was provided to project one`,
      )
    }
    return projectThenPresent(slug, toAbs(arg, repoRoot), options.epicTitle, repoRoot)
  }

  // Bare slug (rework item 1, argument-acceptance point): validated before
  // anything is derived from it, before the path-construction guard inside
  // `projectedArtifactLocation` is ever reached.
  const slug = arg
  assertSafeSlug(slug)
  const { abs } = projectedArtifactLocation(slug, repoRoot)
  if (existsSync(abs)) return loadExisting(slug, repoRoot)
  if (options.epicTitle === undefined) {
    throw new Error(
      `resolveArtifact: no projected artifact exists for '${slug}' and no --epic-title was provided to project one`,
    )
  }
  const activeDir = join(repoRoot, ...ACTIVE_SPECS_DIR.split('/'))
  const inputAbs = join(activeDir, `${slug}${SHAPING_RESULT_SUFFIX}`)
  return projectThenPresent(slug, inputAbs, options.epicTitle, repoRoot)
}
