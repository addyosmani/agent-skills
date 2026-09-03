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
  TransportRequirements,
} from './types.js'

export const sampleClassEntry: ClassEntry = {
  allowlist: ['economy'],
  ceiling_usd: 0.5,
}

/**
 * OpenRouter slugs, mirroring routing-policy.yaml v0.3. One list shared by all
 * three classifications: every model is a first-party-lab model with
 * ZDR-capable endpoints, so eligibility is uniform and only the transport
 * requirements differ between public and non-public.
 */
const sampleModels: readonly string[] = [
  'anthropic/claude-opus-5',
  'anthropic/claude-fable-5.1',
  'openai/gpt-5.6-sol',
  'google/gemini-3.1-pro-preview',
  'anthropic/claude-sonnet-5',
  'google/gemini-3.8-flash',
  'openai/gpt-5.6-terra',
  'openai/gpt-5.6-luna',
  'google/gemini-3.1-flash-lite',
  'anthropic/claude-haiku-4.5',
]

/** The strict values invariant (g) requires for internal and restricted. */
export const sampleStrictTransport: TransportRequirements = {
  data_collection: 'deny',
  zdr: true,
}

export const samplePublicTransport: TransportRequirements = {
  data_collection: 'allow',
  zdr: false,
}

export const sampleDataClassificationRule: DataClassificationRule = {
  eligible_models: [...sampleModels],
  transport_requirements: sampleStrictTransport,
}

export const sampleRoleAssignment: RoleAssignment = {
  coordinator: 'frontier',
  verifier: 'frontier',
  builder: 'per-class',
}

/**
 * A well-formed shadow route. The shipped policy declares none; this sample
 * proves the schema still accepts a populated `shadow_routes` map and the
 * validator still enforces containment on it. The id is deliberately
 * provider-neutral — no provider name is baked into schema or samples.
 */
export const sampleShadowRoute: ShadowRoute = {
  adapter_id: 'example-shadow',
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
    public: { eligible_models: [...sampleModels], transport_requirements: samplePublicTransport },
    internal: { eligible_models: [...sampleModels], transport_requirements: sampleStrictTransport },
    restricted: {
      eligible_models: [...sampleModels],
      transport_requirements: sampleStrictTransport,
    },
  },
  roles: {
    coordinator: 'frontier',
    verifier: 'frontier',
    builder: 'per-class',
  },
  model_tiers: {
    // Order is the dispatcher's selection rule (first eligible wins).
    frontier: [
      'anthropic/claude-opus-5',
      'openai/gpt-5.6-sol',
      'google/gemini-3.1-pro-preview',
      'anthropic/claude-fable-5.1',
    ],
    standard: ['anthropic/claude-sonnet-5', 'google/gemini-3.8-flash', 'openai/gpt-5.6-terra'],
    economy: ['openai/gpt-5.6-luna', 'google/gemini-3.1-flash-lite', 'anthropic/claude-haiku-4.5'],
  },
  shadow_routes: {
    'example-shadow': sampleShadowRoute,
  },
}
