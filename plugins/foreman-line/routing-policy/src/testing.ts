/**
 * Canonical sample values, typed against `types.ts`, used by the parity test to
 * prove each schema actually accepts values of the shape its type describes.
 */
import type {
  ClassEntry,
  DataClassificationRule,
  RoleAssignment,
  RoutingPolicy,
  ShadowRoute,
} from './types.js'

export const sampleClassEntry: ClassEntry = {
  allowlist: ['economy'],
  ceiling_usd: 0.5,
}

export const sampleDataClassificationRule: DataClassificationRule = {
  eligible_models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'],
}

export const sampleRoleAssignment: RoleAssignment = {
  coordinator: 'frontier',
  verifier: 'frontier',
  builder: 'per-class',
}

export const sampleShadowRoute: ShadowRoute = {
  adapter_id: 'cerebras-shadow',
  data_classification: 'public',
  allowed_task_types: ['spec_lint', 'evidence_index', 'review_triage'],
  requires_live_discovery: true,
  candidate_only: true,
  authority: 'none',
  tools_granted: [],
  effect_capability: 'none',
  prohibited_roles: ['coordinator', 'verifier'],
}

export const sampleRoutingPolicy: RoutingPolicy = {
  classes: {
    boilerplate: { allowlist: ['economy'], ceiling_usd: 0.5 },
    'standard-feature': { allowlist: ['standard'], ceiling_usd: 5.0 },
    'architecture/risk': { allowlist: ['frontier'], ceiling_usd: 25.0 },
    'implementation/standard': { allowlist: ['standard'], ceiling_usd: 5.0 },
  },
  data_classification: {
    public: { eligible_models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'] },
    internal: { eligible_models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'] },
    restricted: { eligible_models: ['claude-haiku-4-5', 'claude-sonnet-5', 'claude-opus-4-8'] },
  },
  roles: {
    coordinator: 'frontier',
    verifier: 'frontier',
    builder: 'per-class',
  },
  model_tiers: {
    frontier: ['claude-opus-4-8'],
    standard: ['claude-sonnet-5'],
    economy: ['claude-haiku-4-5'],
  },
  shadow_routes: {
    'cerebras-shadow': sampleShadowRoute,
  },
}
