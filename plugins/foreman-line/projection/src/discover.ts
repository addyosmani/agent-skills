/**
 * Discovery fallback wrapper (Q7/AC3). The shipped `discoverShapingResults`
 * lists every `*.shaping-result.json` under `active/`, which also matches this
 * package's own `*.projected.shaping-result.json` output (the suffix ends with
 * `.shaping-result.json` too). This parcel's own discovery helper filters the
 * projected artifacts back out - `shaping/` itself is never changed (ruling on
 * Flag 1).
 */
import { discoverShapingResults } from '../../shaping/src/index.js'

/** Suffix of this package's own output artifact - never re-selectable as an input. */
export const PROJECTED_SUFFIX = '.projected.shaping-result.json'

/**
 * Documented discovery fallback: every `active/*.shaping-result.json` artifact
 * that is NOT this package's own projected output. Not the primary interface -
 * callers should prefer an explicit input path.
 */
export function discoverProjectableInputs(repoRoot?: string): string[] {
  const all = repoRoot === undefined ? discoverShapingResults() : discoverShapingResults(repoRoot)
  return all.filter((p) => !p.endsWith(PROJECTED_SUFFIX))
}
