/**
 * Hand-authored JSON Schema draft-07 literals, each typed as ajv's `SchemaObject`
 * (never `JSONSchemaType<T>` — banned as a schema authority in this repo).
 * `tests/parity.test.ts` proves each schema agrees with its `types.ts` counterpart
 * via a canonical sample, and that the committed `schemas/*.json` files never drift.
 *
 * Five of the six invariants (classification-gates-before-cost, coordinator/
 * verifier frontier pinning, the security override and derived name-guard,
 * frontier anchoring, and shadow-route containment) are intentionally NOT
 * encoded here — they are cross-field business rules
 * enforced by `validator.ts`, kept distinct from pure structural shape so a
 * schema-valid-but-semantically-wrong document is distinguishable from a
 * structurally invalid one (both classes of rejecting fixture are needed
 * separately per AC6).
 */
import type { SchemaObject } from 'ajv'

export const classEntrySchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['allowlist', 'ceiling_usd'],
  properties: {
    allowlist: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 1,
    },
    ceiling_usd: { type: 'number', exclusiveMinimum: 0 },
    security_flavored: { type: 'boolean' },
  },
}

export const dataClassificationRuleSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['eligible_models'],
  properties: {
    eligible_models: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 1,
    },
  },
}

export const roleAssignmentSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['coordinator', 'verifier', 'builder'],
  properties: {
    coordinator: { type: 'string', minLength: 1 },
    verifier: { type: 'string', minLength: 1 },
    builder: { type: 'string', minLength: 1 },
  },
}

export const shadowRouteSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'adapter_id',
    'data_classification',
    'allowed_task_types',
    'requires_live_discovery',
    'candidate_only',
    'authority',
    'tools_granted',
    'effect_capability',
    'prohibited_roles',
  ],
  properties: {
    adapter_id: { type: 'string', minLength: 1 },
    data_classification: { const: 'public' },
    allowed_task_types: {
      type: 'array',
      items: { enum: ['spec_lint', 'evidence_index', 'review_triage'] },
      minItems: 1,
      uniqueItems: true,
    },
    requires_live_discovery: { const: true },
    candidate_only: { const: true },
    authority: { const: 'none' },
    tools_granted: { type: 'array', maxItems: 0 },
    effect_capability: { const: 'none' },
    prohibited_roles: {
      type: 'array',
      items: { enum: ['coordinator', 'verifier'] },
      minItems: 2,
      maxItems: 2,
      uniqueItems: true,
    },
  },
}

export const routingPolicySchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['classes', 'data_classification', 'roles', 'model_tiers', 'shadow_routes'],
  properties: {
    classes: {
      type: 'object',
      required: ['boilerplate', 'standard-feature', 'architecture/risk', 'implementation/standard'],
      additionalProperties: classEntrySchema,
    },
    data_classification: {
      type: 'object',
      additionalProperties: false,
      required: ['public', 'internal', 'restricted'],
      properties: {
        public: dataClassificationRuleSchema,
        internal: dataClassificationRuleSchema,
        restricted: dataClassificationRuleSchema,
      },
    },
    roles: roleAssignmentSchema,
    model_tiers: {
      type: 'object',
      required: ['frontier'],
      additionalProperties: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        minItems: 1,
      },
      properties: {
        frontier: {
          type: 'array',
          items: { type: 'string', minLength: 1 },
          minItems: 1,
        },
      },
    },
    shadow_routes: {
      type: 'object',
      required: ['cerebras-shadow'],
      additionalProperties: shadowRouteSchema,
    },
  },
}
