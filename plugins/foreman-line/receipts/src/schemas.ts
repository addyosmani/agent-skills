/**
 * Hand-authored JSON Schema draft-07 literals, each typed as ajv's `SchemaObject`
 * (never `JSONSchemaType<T>` — banned as a schema authority in this repo, per
 * the W0-P1 rework standing rule).
 *
 * The single-document semantic invariants (AC4: claimRef <-> kind, prevHash <->
 * genesis) are intentionally NOT encoded here — cross-field rules live in
 * `validator.ts`, kept distinct from pure structural shape so a schema-valid-
 * but-semantically-wrong document is distinguishable from a structurally
 * invalid one (both classes of rejecting fixture are needed separately).
 */
import type { SchemaObject } from 'ajv'
import { correlationContextSchema, ISO_UTC_PATTERN, STAGE_IDS } from '../../contracts/src/index.js'

/** Bare lowercase 64-char hex, no algorithm prefix (AC3). */
export const HASH_PATTERN = '^[0-9a-f]{64}$'

export const signatureSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['alg', 'keyId', 'value'],
  properties: {
    alg: { type: 'string', minLength: 1 },
    keyId: { type: 'string', minLength: 1 },
    value: { type: 'string', minLength: 1 },
  },
}

export const receiptDocumentSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schemaVersion',
    'kind',
    'stage',
    'claimRef',
    'correlation',
    'sequence',
    'prevHash',
    'timestamp',
    'subjectKind',
    'subject',
    'signature',
    'hash',
  ],
  properties: {
    schemaVersion: { type: 'string', minLength: 1 },
    kind: { type: 'string', enum: ['stage', 'claim'] },
    stage: { type: 'string', enum: [...STAGE_IDS] },
    claimRef: { type: ['string', 'null'] },
    correlation: correlationContextSchema,
    sequence: { type: 'integer', minimum: 0 },
    prevHash: { type: ['string', 'null'], pattern: HASH_PATTERN },
    timestamp: { type: 'string', pattern: ISO_UTC_PATTERN },
    subjectKind: { type: 'string', minLength: 1 },
    // Not deep-validated against its originating stage's payload schema — that
    // conformance is already enforced at production time (Out of Scope).
    subject: {},
    signature: { ...signatureSchema, type: ['object', 'null'] },
    hash: { type: 'string', pattern: HASH_PATTERN },
  },
}
