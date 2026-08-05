/**
 * Approval subject + `approvedHash` (coordinator ruling Q2). The **approval
 * subject** is a canonical composite object:
 *
 * ```
 * { projectedResult: <the filled ShapingResult payload>,
 *   specSet: [ { ref: <parcelSpecRef, verbatim>, contentHash: sha256Hex(<spec file bytes>) }, ... ] }
 * ```
 *
 * in `parcelSpecRefs` order. `approvedHash = sha256Hex(canonicalize(composite))`
 * - computed over the **canonicalized payload**, never the on-disk
 * pretty-printed bytes, so incidental whitespace/formatting differences can
 * never break a legitimate match, and two different spec-sets can never
 * collide (each spec's content hash and ordered ref sit inside the hashed
 * bytes). TOCTOU rationale: if only the projected artifact's bytes were
 * hashed, a human could edit a referenced `.md` spec after approval and
 * W1-P4 would register changed content against a still-matching hash - this
 * composite subject closes that time-of-check/time-of-use gap (F7).
 */
import { readFileSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import type { ShapingResult } from '../../contracts/src/index.js'
import { assertContainedPath } from '../../projection/src/index.js'
import { canonicalize, type JsonValue } from './canonical.js'
import { sha256Hex } from './hash.js'
import { DEFAULT_REPO_ROOT } from './paths.js'

export interface SpecSetEntry {
  readonly ref: string
  readonly contentHash: string
}

export interface ApprovalSubject {
  readonly projectedResult: ShapingResult
  readonly specSet: readonly SpecSetEntry[]
}

export interface ComputedSubject {
  readonly subject: ApprovalSubject
  readonly approvedHash: string
}

/**
 * Ordered per-ref content hash over each referenced spec file's raw bytes.
 * Path containment is enforced (rework-item class, W1-P2 precedent) before
 * any read: a `parcelSpecRef` whose resolved path escapes `repoRoot` is
 * refused, naming the ref.
 */
export function computeSpecSet(
  parcelSpecRefs: readonly string[],
  repoRoot: string = DEFAULT_REPO_ROOT,
): SpecSetEntry[] {
  return parcelSpecRefs.map((ref) => {
    const absPath = isAbsolute(ref) ? ref : join(repoRoot, ...ref.split('/'))
    assertContainedPath(repoRoot, absPath, ref)
    const bytes = readFileSync(absPath)
    return { ref, contentHash: sha256Hex(bytes) }
  })
}

/**
 * Compute the composite approval subject and its `approvedHash` for a filled
 * `ShapingResult`. `repoRoot` resolves each `parcelSpecRefs` entry.
 */
export function computeApprovalSubject(
  projectedResult: ShapingResult,
  repoRoot: string = DEFAULT_REPO_ROOT,
): ComputedSubject {
  const specSet = computeSpecSet(projectedResult.parcelSpecRefs, repoRoot)
  const subject: ApprovalSubject = { projectedResult, specSet }
  const approvedHash = sha256Hex(canonicalize(subject as unknown as JsonValue))
  return { subject, approvedHash }
}
