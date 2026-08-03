/**
 * CLOSE-P2 grandfather allowlist: the enumerated, class-scoped waivers for the
 * historical `docs/specs/done/` corpus debt (specs shipped before parts of the
 * schema v0.2 contract were tightened).
 *
 * Semantics (enforced by `validateSpecFrontmatter`; tightened by the CLOSE-P2
 * rework, R1):
 *   - Matching is by EXACT basename, against this source-frozen list only,
 *     AND only when the validated file's parent directory is `done` (the CLI
 *     supplies that signal; unit-level validation never waives without it).
 *   - Each waiver is pinned to its historical literal value(s): a violation is
 *     waived only if the file's actual frontmatter value is one of the
 *     inventoried `allowedValues`. Any other value fails, even on a
 *     grandfathered file.
 *   - Each waiver suppresses ONLY its own field's violation class; any other
 *     violation on a grandfathered file still fails validation.
 *   - Files not listed here get full validation, including the PROFILE_NAMES
 *     enum for `permission_profile`.
 *   - Waived violations are surfaced as non-blocking `grandfathered:` advisory
 *     warnings so the debt stays visible in CI logs.
 *
 * Growing this list requires editing this file in a reviewed PR — that is the
 * boundary pin. The test suite asserts set equality on the membership and the
 * per-file field/value pins (invariant pins, never byte pins —
 * STANDING-CONSTRAINTS #12), so silent growth or re-scoping fails the suite.
 */

export const WAIVER_KINDS = ['permission-profile-legacy', 'routing-class-legacy'] as const
export type WaiverKind = (typeof WAIVER_KINDS)[number]

/** The only frontmatter fields a waiver may ever reach. */
export type WaivableField = 'permission_profile' | 'routing_class'

/**
 * One class-scoped, value-pinned waiver: violations on `field` are waived only
 * when the file's actual frontmatter value is in `allowedValues`.
 */
export interface GrandfatherWaiver {
  readonly kind: WaiverKind
  readonly field: WaivableField
  readonly allowedValues: readonly (string | null)[]
}

const PROFILE_NULL: GrandfatherWaiver = {
  kind: 'permission-profile-legacy',
  field: 'permission_profile',
  allowedValues: [null],
}

const PROFILE_BUILDER: GrandfatherWaiver = {
  kind: 'permission-profile-legacy',
  field: 'permission_profile',
  allowedValues: ['builder'],
}

const ROUTING_STANDARD: GrandfatherWaiver = {
  kind: 'routing-class-legacy',
  field: 'routing_class',
  allowedValues: ['standard'],
}

/**
 * The allowlist itself: exact done/ basenames -> value-pinned waiver(s), per
 * the CLOSE-P2 verified violation inventory.
 *
 * permission-profile-legacy: `permission_profile: null` (pre-registry contract
 * said null) or the pre-P4-enum literal `builder` — pinned per file.
 * routing-class-legacy: `routing_class: standard` (pre-dates the frozen
 * four-value enum; `standard-feature` is the modern spelling).
 */
export const GRANDFATHER_ALLOWLIST: Readonly<Record<string, readonly GrandfatherWaiver[]>> = {
  'P1-permission-profile-registry-schema.md': [PROFILE_NULL],
  'P2-dispatch-order-permission-profile-field.md': [PROFILE_NULL],
  'P3-dispatch-time-emitter.md': [PROFILE_NULL],
  'W0-P5-skill-injection-matrix-schema-validator.md': [PROFILE_NULL],
  'W4-P2-docspine-ci-hook.md': [PROFILE_BUILDER],
  'SCAF-P4-exit-vehicle.md': [PROFILE_BUILDER],
  'W1-P2-epic-story-projection.md': [ROUTING_STANDARD],
  'W1-P3-human-approval-flow.md': [ROUTING_STANDARD],
}

/** Returns the waivers for a basename, or an empty list if not grandfathered. */
export function waiversFor(basename: string): readonly GrandfatherWaiver[] {
  return GRANDFATHER_ALLOWLIST[basename] ?? []
}
