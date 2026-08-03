/**
 * Hand-authored JSON Schema draft-07 literals, each typed as ajv's `SchemaObject`
 * (never `JSONSchemaType<T>` — banned as a schema authority in this repo).
 * `tests/parity.test.ts` proves each schema agrees with its `types.ts` counterpart
 * via a canonical sample, and that the committed `schemas/*.json` files never drift.
 *
 * The four semantic invariants (classification-gates-before-cost, coordinator/
 * verifier frontier pinning, the security override, and its derived name-guard)
 * are intentionally NOT encoded here — they are cross-field business rules
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

export const routingPolicySchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['classes', 'data_classification', 'roles', 'model_tiers'],
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
  },
}
