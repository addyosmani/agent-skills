/**
 * Provisional key + slug derivation (Q4). All derivation here is linear-time
 * (lesson #19): plain `basename`/`endsWith`/`slice`, no regex over untrusted
 * text.
 */
import { basename } from 'node:path'

const SPEC_MD_SUFFIX = '.md'
/** Mirrors the shipped `shaping` package's `ARTIFACT_SUFFIX` (read-only reference). */
const ARTIFACT_SUFFIX = '.shaping-result.json'

/**
 * Story key = the referenced spec's filename stem (basename minus `.md`).
 * Throws if `specRef` does not end with `.md` - this parcel never derives a
 * key from a non-spec path.
 */
export function specFilenameStem(specRef: string): string {
  const base = basename(specRef)
  if (!base.endsWith(SPEC_MD_SUFFIX)) {
    throw new Error(`specFilenameStem: '${specRef}' does not end with '.md'`)
  }
  return base.slice(0, base.length - SPEC_MD_SUFFIX.length)
}

/** Epic key = a provisional token derived from the input artifact slug (Q4, coordinator-ratified: `epic-<slug>` verbatim). */
export function deriveEpicKey(slug: string): string {
  return `epic-${slug}`
}

/**
 * Derive the input artifact slug from its path's basename minus
 * `.shaping-result.json` - the basis for the `writeProjectedResult`
 * convenience wrapper (AC2 amendment).
 */
export function slugFromInputPath(inputPath: string): string {
  const base = basename(inputPath)
  if (!base.endsWith(ARTIFACT_SUFFIX)) {
    throw new Error(`slugFromInputPath: '${inputPath}' does not end with '${ARTIFACT_SUFFIX}'`)
  }
  return base.slice(0, base.length - ARTIFACT_SUFFIX.length)
}
