/**
 * Routing policy shapes (W0-P3): TypeScript types for `routing-policy.yaml`.
 * Each type has a matching hand-authored JSON Schema in `schemas.ts` — the two
 * representations are proven to agree by `tests/parity.test.ts`, never by
 * generating one from the other (ajv's `JSONSchemaType` is banned as a schema
 * authority in this repo).
 */

export type ClassName =
  | 'boilerplate'
  | 'standard-feature'
  | 'architecture/risk'
  | 'implementation/standard'

export const CLASS_NAMES: readonly ClassName[] = [
  'boilerplate',
  'standard-feature',
  'architecture/risk',
  'implementation/standard',
]

export type DataClassificationTier = 'public' | 'internal' | 'restricted'

export const DATA_CLASSIFICATION_TIERS: readonly DataClassificationTier[] = [
  'public',
  'internal',
  'restricted',
]

/**
 * One entry in `classes`. `allowlist` holds tier names (resolved elsewhere via
 * `model_tiers`), not concrete model ids. `security_flavored` is a self-declared
 * flag: when true, every tier in `allowlist` must equal `'frontier'` (the
 * security hard override), and any class whose key looks security/audit-flavored
 * by name must carry this flag (the derived guard) — both enforced as semantic
 * invariants, not by this schema.
 */
export interface ClassEntry {
  readonly allowlist: readonly string[]
  readonly ceiling_usd: number
  readonly security_flavored?: boolean
}

/**
 * One entry in `data_classification`. `eligible_models` must narrow monotonically
 * from `public` -> `internal` -> `restricted` (D6: classification gates eligibility
 * before cost optimization) — a semantic invariant, not expressible in this shape.
 */
export interface DataClassificationRule {
  readonly eligible_models: readonly string[]
}

/**
 * `coordinator`/`verifier` are pinned to `'frontier'` by D4; `builder` is
 * resolved per task class (`'per-class'`). The pinning is a semantic invariant,
 * not a schema `const`, so a schema-valid-but-wrong document (e.g. a non-frontier
 * coordinator) is distinguishable from a structurally invalid one.
 */
export interface RoleAssignment {
  readonly coordinator: 'frontier'
  readonly verifier: 'frontier'
  readonly builder: 'per-class'
}

/**
 * The full routing policy document. `model_tiers` resolves each tier name used
 * in `classes[*].allowlist` and `roles` to concrete July-2026 model ids; `'frontier'`
 * is the one tier name the validator's invariants depend on literally — every
 * other tier name is v0 policy content, revisable without touching the validator.
 */
export interface RoutingPolicy {
  readonly classes: Readonly<Record<ClassName, ClassEntry>>
  readonly data_classification: Readonly<Record<DataClassificationTier, DataClassificationRule>>
  readonly roles: RoleAssignment
  readonly model_tiers: Readonly<Record<string, readonly string[]>>
}
