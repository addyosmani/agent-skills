/**
 * Skill injection matrix shapes (W0-P5): TypeScript types for
 * `skill-injection.yaml` — the policy-as-code artifact governing which
 * skills are injected at which pipeline role (plan §5a). Each type has a
 * matching hand-authored JSON Schema in `schemas.ts` — the two
 * representations are proven to agree by `tests/parity.test.ts`, never by
 * generating one from the other (ajv's `JSONSchemaType` is banned as a
 * schema authority in this repo).
 *
 * This module defines shape only. It does not implement the Surface-Glob
 * Resolution Semantics (see README.md) — that evaluation is W2-P5's job.
 */

/**
 * A glob-pattern key in a `RoleSkillMap`: either exactly `'*'` or a
 * non-empty, star-free prefix followed by a literal `/*` (e.g. `'ui/*'`).
 * No mid-string or suffix wildcards are supported in v0.
 */
export type GlobPattern = string

/**
 * An opaque skill identifier (e.g. `'test-coverage'`, `'kds-figma'`).
 * Existence against any skills directory is deliberately NOT validated —
 * see README.md, "Skill-name existence is out of scope."
 */
export type SkillName = string

/**
 * Maps glob-pattern keys to the skill names injected when a parcel's
 * `surfaces:` entry matches. A present key's array must be non-empty — see
 * README.md, "Role-map presence vs. glob-key emptiness."
 */
export interface RoleSkillMap {
  readonly [glob: GlobPattern]: readonly SkillName[]
}

/** Skills injected for the Coordinator role. No empty-object variant. */
export interface CoordinatorSkills {
  readonly rework_first: readonly SkillName[]
}

/** Skills injected at integration points. No empty-object variant. */
export interface IntegrationSkills {
  readonly jira: readonly SkillName[]
}

/**
 * The full skill-injection matrix document. All five top-level keys are
 * LOCKED CLOSED (coordinator-ratified) — a sixth role appearing is a Line
 * architecture change requiring a spec amendment, not a vocabulary
 * extension. See README.md for the contrast with `surfaces:`'s open
 * vocabulary.
 */
export interface SkillInjectionMatrix {
  readonly builder: RoleSkillMap
  readonly verifier_harness: RoleSkillMap
  readonly adversarial_reviewer: RoleSkillMap
  readonly coordinator: CoordinatorSkills
  readonly integration: IntegrationSkills
}
