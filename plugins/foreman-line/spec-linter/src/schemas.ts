/**
 * Hand-authored JSON Schema draft-07 literal for spec frontmatter, typed as
 * ajv's `SchemaObject` (never `JSONSchemaType<T>` — banned as a schema authority
 * in this repo).
 *
 * `tests/parity.test.ts` proves this schema agrees with its `types.ts` counterpart
 * via a canonical sample, and that the committed `schemas/spec-frontmatter.schema.json`
 * never drifts from what `generate.ts` would produce.
 *
 * The semantic invariant `status: superseded` requires non-null `superseded_by` is
 * intentionally NOT encoded here — it is a cross-field business rule enforced by
 * `validate.ts`, kept distinct from pure structural shape.
 */
import type { SchemaObject } from 'ajv'
import { PROFILE_NAMES } from '../../permission-profiles/src/index.js'

export const specFrontmatterSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'ticket',
    'title',
    'status',
    'owner',
    'created',
    'updated',
    'risk',
    'surfaces',
    'routing_class',
  ],
  properties: {
    ticket: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    status: { type: 'string', enum: ['draft', 'active', 'done', 'superseded'] },
    owner: { type: 'string', minLength: 1 },
    created: { type: 'string', minLength: 1 },
    updated: { type: 'string', minLength: 1 },
    supersedes: { type: ['string', 'null'] },
    superseded_by: { type: ['string', 'null'] },
    risk: { type: 'string', enum: ['low', 'standard', 'elevated', 'critical'] },
    surfaces: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
      minItems: 1,
    },
    routing_class: {
      type: 'string',
      enum: ['boilerplate', 'standard-feature', 'architecture/risk', 'implementation/standard'],
    },
    permission_profile: { type: 'string', pattern: '\\S', enum: [...PROFILE_NAMES] },
    // CLOSE-P2 (W4-P5 ruling): optional, non-empty, non-whitespace-only string.
    // Deliberately no enum — no controlled vocabulary is ratified yet; adding
    // one later is a non-breaking additive change (permission_profile pattern).
    data_classification: { type: 'string', pattern: '\\S' },
  },
}
