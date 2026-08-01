/**
 * Semantic guards (a)-(d) (Q6): the frozen `shapingResultSchema` declares no
 * `minItems` anywhere, so these guards are enforced by this package, not the
 * schema. Each has a rejecting fixture in `tests/` proving it fires where raw
 * schema validation would accept the payload.
 */
import type { ShapingResult } from '../../contracts/src/index.js'
import { specFilenameStem } from './keys.js'

/** Linear-time string-array equality (no regex, index walk only). */
function sameStringArray(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

/**
 * Throws naming the violated guard - (a) `parcelSpecRefs` verbatim, (b) every
 * input ref represented by exactly one Story in order, (c) every Epic
 * non-empty, (d) `epics` non-empty.
 */
export function assertSemanticGuards(input: ShapingResult, output: ShapingResult): void {
  // (a) parcelSpecRefs preserved verbatim from the input.
  if (!sameStringArray(input.parcelSpecRefs, output.parcelSpecRefs)) {
    throw new Error(
      'semantic guard (a) violated: output.parcelSpecRefs is not verbatim-identical to the input',
    )
  }

  // (d) result.epics.length >= 1 - checked before iterating (b)/(c) below.
  if (output.epics.length === 0) {
    throw new Error('semantic guard (d) violated: epics is empty')
  }

  // (c) every Epic has stories.length >= 1.
  for (const epic of output.epics) {
    if (epic.stories.length === 0) {
      throw new Error(`semantic guard (c) violated: Epic '${epic.key}' has no Stories`)
    }
  }

  // (b) every input parcelSpecRef is represented by exactly one Story - no
  // dropped ref, no extra Story, same order.
  const storyKeys: string[] = []
  for (const epic of output.epics) {
    for (const story of epic.stories) storyKeys.push(story.key)
  }
  const expectedKeys = input.parcelSpecRefs.map((ref) => specFilenameStem(ref))
  if (!sameStringArray(storyKeys, expectedKeys)) {
    throw new Error(
      `semantic guard (b) violated: expected exactly one Story per parcelSpecRef in order (expected keys [${expectedKeys.join(', ')}], found [${storyKeys.join(', ')}])`,
    )
  }
}
