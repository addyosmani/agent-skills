/**
 * Spec frontmatter shapes (W0-P2): TypeScript types for SPEC-CONVENTION §4 v0.2.
 * The SpecFrontmatter interface has a matching hand-authored JSON Schema in
 * `schemas/spec-frontmatter.schema.json` — the two representations are proven to
 * agree by `tests/parity.test.ts`, never by generating one from the other
 * (ajv's `JSONSchemaType` is banned as a schema authority in this repo).
 */

export const RISK_LEVELS = ['low', 'standard', 'elevated', 'critical'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const ROUTING_CLASSES = [
  'boilerplate',
  'standard-feature',
  'architecture/risk',
  'implementation/standard',
] as const
export type RoutingClass = (typeof ROUTING_CLASSES)[number]

export const SPEC_STATUSES = ['draft', 'active', 'done', 'superseded'] as const
export type SpecStatus = (typeof SPEC_STATUSES)[number]

/**
 * Shape of a spec's YAML frontmatter at SPEC-CONVENTION schema v0.2.
 * Required fields: ticket, title, status, owner, created, updated, risk,
 * surfaces, routing_class.
 * Optional fields: supersedes, superseded_by, permission_profile,
 * data_classification.
 *
 * Semantic invariant (not expressible in JSON Schema): status 'superseded'
 * requires a non-null superseded_by — enforced by validateSpecFrontmatter.
 */
export interface SpecFrontmatter {
  readonly ticket: string
  readonly title: string
  readonly status: SpecStatus
  readonly owner: string
  readonly created: string
  readonly updated: string
  readonly supersedes: string | null
  readonly superseded_by: string | null
  readonly risk: RiskLevel
  readonly surfaces: readonly string[]
  readonly routing_class: RoutingClass
  readonly permission_profile?: string
  /** CLOSE-P2 (W4-P5 ruling): optional sensitivity classification; no enum yet. */
  readonly data_classification?: string
}
