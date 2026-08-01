/**
 * Permission-profile registry shapes (permission-profile-registry goal, P1):
 * TypeScript types for `permission-profiles.yaml`. Each type has a matching
 * hand-authored JSON Schema in `schemas.ts` — the two representations are
 * proven to agree by `tests/parity.test.ts`, never by generating one from the
 * other (ajv's `JSONSchemaType` is banned as a schema authority in this repo).
 *
 * Field names deliberately mirror Claude Code's `settings.local.json`
 * `permissions` object 1:1 (`allow`/`deny`/`defaultMode`/`additionalDirectories`),
 * verified against this repo's own live `.claude/settings.local.json` — see
 * README.md "Schema shape" for the ground-truth citation.
 */

/**
 * A Claude Code permission rule: a bare tool name, or `ToolName(specifier)`.
 * Tool existence and specifier semantics are NOT validated here — opaque at
 * this layer, exactly as skill names are opaque in skill-injection (W0-P5).
 * Only well-formedness (the string shape) is schema-checked.
 */
export type PermissionRule = string

/**
 * Claude Code permission modes. `'bypassPermissions'` is DELIBERATELY
 * EXCLUDED: a profile that installs itself in bypass mode nullifies its own
 * deny rules (charter D9-amendment(a)), so the schema refuses to express it.
 */
export type PermissionMode = 'default' | 'acceptEdits' | 'plan'

/**
 * DOCUMENTATION-ONLY (charter D4/F-L). This goal ships no probe that a
 * network rule gates at the process boundary; this field records declared
 * intent and is NOT projected into an enforced setting by P3 in this goal.
 * Real network gating, if ever pursued, uses `WebFetch(domain:...)` rules in
 * `deny`/`ask` and needs its own probe. Modeled as a distinct field (not
 * folded into deny/ask/allow) precisely so its documentation-only status is
 * structurally visible, not hidden inside a rule string that would look
 * enforced.
 */
export interface NetworkIntent {
  readonly egress: 'denied' | 'allowlist' | 'allowed'
  readonly notes?: string
}

/**
 * `deny`/`ask` are the restriction mechanism (D9); `allow` is validated for
 * well-formedness only and carries no restrictive meaning anywhere in this
 * package.
 */
export interface PermissionEnvelope {
  readonly deny: readonly PermissionRule[]
  readonly ask: readonly PermissionRule[]
  readonly allow: readonly PermissionRule[]
  readonly defaultMode?: PermissionMode
  readonly additionalDirectories?: readonly string[]
  readonly network?: NetworkIntent
}

export interface PermissionProfile {
  readonly description: string
  readonly envelope: PermissionEnvelope
}

/**
 * The six v0 profile names (charter D4 — locked). This union, together with
 * `PROFILE_NAMES` below, is the single authoritative artifact P4's
 * spec-linter enum upgrade binds to by import (charter F-I) — P4 does not
 * re-parse `permission-profiles.yaml` and does not re-derive this list.
 */
export type ProfileName =
  | 'coordinator'
  | 'builder-standard'
  | 'builder-architecture'
  | 'reviewer-readonly'
  | 'shaping-agent'
  | 'builder-deps'

/**
 * The authoritative, ordered list of legal profile names. `permission-profiles.yaml`'s
 * top-level `profiles` map keys are validated to exactly equal this list
 * (semantic invariant 1) — the code is the authority, the document is
 * validated against it, never the reverse.
 */
export const PROFILE_NAMES: readonly ProfileName[] = [
  'coordinator',
  'builder-standard',
  'builder-architecture',
  'reviewer-readonly',
  'shaping-agent',
  'builder-deps',
]

export interface PermissionProfileRegistry {
  readonly profiles: Readonly<Record<ProfileName, PermissionProfile>>
}
