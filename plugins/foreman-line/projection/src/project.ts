/**
 * The core projection function (AC2, amended by the ratified spec amendment
 * 2026-07-22): takes an input `ShapingResult`, a required `epicTitle`, and the
 * input artifact `slug`, and returns a filled `ShapingResult` whose single
 * Epic contains one Story per `parcelSpecRef` in order (Q2 topology).
 *
 * Re-validates the output against the frozen `shapingResultSchema` imported
 * from `contracts` (never re-declared here) plus the four semantic guards
 * (Q6) - schema-valid is not the same as semantically complete.
 */
import { Ajv } from 'ajv'
import {
  type EpicNode,
  type ShapingResult,
  type StoryNode,
  shapingResultSchema,
} from '../../contracts/src/index.js'
import { assertSemanticGuards } from './guards.js'
import { deriveEpicKey, specFilenameStem } from './keys.js'
import { assertSafeSlug } from './path-guard.js'
import { DEFAULT_REPO_ROOT } from './paths.js'
import { readSpecTitle } from './title.js'

const ajv = new Ajv({ allErrors: true })
const validateShapingResult = ajv.compile(shapingResultSchema)

export interface ProjectOptions {
  /** Repo root each `parcelSpecRef` is resolved against. Defaults to the real repo root. */
  readonly repoRoot?: string
}

/**
 * Build and validate the filled `ShapingResult`. Throws (refuses) when:
 * `epicTitle` is absent/empty/whitespace-only (Q3, no slug-derived fallback);
 * a referenced spec is missing, unparseable, or title-less (Q3); two
 * `parcelSpecRefs` share a filename stem, or a Story key collides with the
 * Epic key (Q4 uniqueness guard, Flag 2 ruling); or any of the four semantic
 * guards (Q6) or the frozen schema itself rejects the result.
 */
export function projectShapingResult(
  input: ShapingResult,
  epicTitle: string,
  slug: string,
  options: ProjectOptions = {},
): ShapingResult {
  const repoRoot = options.repoRoot ?? DEFAULT_REPO_ROOT

  if (typeof epicTitle !== 'string' || epicTitle.trim().length === 0) {
    throw new Error(
      'projectShapingResult: epicTitle is required and must be non-empty/non-whitespace-only - there is no slug-derived fallback (Q3)',
    )
  }

  assertSafeSlug(slug)
  const epicKey = deriveEpicKey(slug)
  const seenKeys = new Set<string>([epicKey])
  const stories: StoryNode[] = []

  for (const specRef of input.parcelSpecRefs) {
    const key = specFilenameStem(specRef)
    if (seenKeys.has(key)) {
      throw new Error(
        `projectShapingResult: duplicate Story key '${key}' derived from parcelSpecRef '${specRef}' - either two parcelSpecRefs share a filename stem, or it collides with the Epic key '${epicKey}'`,
      )
    }
    seenKeys.add(key)
    const title = readSpecTitle(repoRoot, specRef)
    stories.push({ key, title })
  }

  const epic: EpicNode = { key: epicKey, title: epicTitle, stories }
  const output: ShapingResult = {
    parcelSpecRefs: input.parcelSpecRefs,
    epics: [epic],
  }

  assertSemanticGuards(input, output)

  if (!validateShapingResult(output)) {
    const detail = (validateShapingResult.errors ?? [])
      .map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`)
      .join('; ')
    throw new Error(`projectShapingResult: output failed shapingResultSchema validation: ${detail}`)
  }

  return output
}
