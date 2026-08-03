/**
 * Hand-authored JSON Schema draft-07 literals, each typed as ajv's `SchemaObject`
 * (never `JSONSchemaType<T>` — banned as a schema authority in this repo).
 * `tests/parity.test.ts` proves each schema agrees with its `types.ts`
 * counterpart via a canonical sample, and that the committed `schemas/*.json`
 * files never drift.
 *
 * The five semantic invariants (profile-set completeness, self-modification
 * guard, no-self-nullifying-mode, `reviewer-readonly` restriction
 * completeness, `reviewer-readonly` shell-access preservation) are
 * intentionally NOT fully encoded here — profile-set completeness and
 * no-bypass-mode ARE expressible structurally (`profiles` required keys;
 * `defaultMode` enum excluding `bypassPermissions`) and are enforced at this
 * schema layer; the remaining cross-field invariants are enforced by
 * `validator.ts`, kept distinct from pure structural shape so a
 * schema-valid-but-semantically-wrong document is distinguishable from a
 * structurally invalid one.
 */
import type { SchemaObject } from 'ajv'
import { PROFILE_NAMES } from './types.js'

/**
 * Rule well-formedness: a bare tool name, or a tool name followed by a
 * non-empty parenthesized specifier. Empty strings, whitespace-only strings,
 * and unparenthesized garbage are rejected. Tool existence and specifier
 * correctness are opaque at this layer (skill-name-well-formedness precedent,
 * W0-P5).
 */
const PERMISSION_RULE_PATTERN = '^[A-Za-z][A-Za-z0-9_-]*(\\(.+\\))?$'

export const permissionRuleSchema: SchemaObject = {
  type: 'string',
  pattern: PERMISSION_RULE_PATTERN,
}

export const networkIntentSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['egress'],
  properties: {
    egress: { type: 'string', enum: ['denied', 'allowlist', 'allowed'] },
    notes: { type: 'string' },
  },
}

export const permissionEnvelopeSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['deny', 'ask', 'allow'],
  properties: {
    deny: { type: 'array', items: permissionRuleSchema },
    ask: { type: 'array', items: permissionRuleSchema },
    allow: { type: 'array', items: permissionRuleSchema },
    // 'bypassPermissions' deliberately excluded — self-nullification guard
    // (D9-amendment(a); semantic invariant 3).
    defaultMode: { type: 'string', enum: ['default', 'acceptEdits', 'plan'] },
    additionalDirectories: {
      type: 'array',
      items: { type: 'string', minLength: 1 },
    },
    network: networkIntentSchema,
  },
}

export const permissionProfileSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['description', 'envelope'],
  properties: {
    description: { type: 'string', minLength: 1 },
    envelope: permissionEnvelopeSchema,
  },
}

export const permissionProfileRegistrySchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['profiles'],
  properties: {
    profiles: {
      type: 'object',
      additionalProperties: false,
      required: [...PROFILE_NAMES],
      properties: Object.fromEntries(PROFILE_NAMES.map((name) => [name, permissionProfileSchema])),
    },
  },
}
