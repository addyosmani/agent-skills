/**
 * Hand-authored JSON Schema draft-07 literals, each typed as ajv's
 * `SchemaObject` (never `JSONSchemaType<T>` — banned as a schema authority
 * in this repo). `tests/parity.test.ts` proves each schema agrees with its
 * `types.ts` counterpart via a canonical sample, and that the committed
 * `schemas/*.json` files never drift.
 *
 * AC4e (duplicate-key rejection) is intentionally NOT encoded here — a
 * schema validates an already-parsed JS object, by which point a duplicate
 * key has already been collapsed by the YAML parser. Duplicate-key
 * rejection happens at parse time, in `parseSkillInjectionMatrixYaml`
 * (`validate.ts`), before a document ever reaches this schema.
 */
import type { SchemaObject } from 'ajv'

/**
 * A glob-pattern key is either exactly `'*'` or a non-empty, star-free
 * prefix followed by a literal `/*` (e.g. `'ui/*'`, `'tenancy/*'`). No
 * mid-string or suffix wildcards in v0. Anchored full-string match.
 */
export const GLOB_PATTERN_REGEX = '^(\\*|[^*]+/\\*)$'

/**
 * A skill name must contain at least one non-whitespace character —
 * rejects the empty string and whitespace-only strings (AC4d). This is a
 * well-formedness check only; skill-name existence is never validated
 * (see README.md).
 */
const NON_BLANK_STRING_PATTERN = '\\S'

const skillNameArraySchema: SchemaObject = {
  type: 'array',
  items: { type: 'string', pattern: NON_BLANK_STRING_PATTERN },
  // A present glob key (or coordinator.rework_first / integration.jira)
  // whose array is empty is a distinct, disallowed flavor of "no skills
  // injected" (AC4b/AC4c) — enforced here at the schema layer, per the
  // coordinator's preference for a single source of truth, rather than as
  // a hand-written semantic check in validate.ts.
  minItems: 1,
}

/**
 * `RoleSkillMap`: keys are glob patterns (validated by `propertyNames` and
 * redundantly by `patternProperties`, for a clearer ajv error message on
 * the value side); an empty object is accepted (AC4a, "no rule yet"); a
 * present key's array must be non-empty (AC4b).
 */
export const roleSkillMapSchema: SchemaObject = {
  type: 'object',
  propertyNames: { pattern: GLOB_PATTERN_REGEX },
  patternProperties: {
    [GLOB_PATTERN_REGEX]: skillNameArraySchema,
  },
  additionalProperties: false,
}

/**
 * `coordinator`: closed shape, single required key `rework_first`. No
 * empty-object variant — §5a shows no illustrative case where the
 * Coordinator has zero skills.
 */
export const coordinatorSkillsSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['rework_first'],
  properties: {
    rework_first: skillNameArraySchema,
  },
}

/**
 * `integration`: closed shape, single required key `jira`. No empty-object
 * variant — same reasoning as `coordinator`.
 */
export const integrationSkillsSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['jira'],
  properties: {
    jira: skillNameArraySchema,
  },
}

/**
 * `SkillInjectionMatrix`: the full document. All five top-level keys are
 * LOCKED CLOSED (`additionalProperties: false` + `required` on all five) —
 * a document missing any one, or carrying a sixth key, is rejected (AC3a,
 * AC3b). See README.md for why this deliberately does not mirror
 * `surfaces:`'s open, semi-controlled vocabulary.
 */
export const skillInjectionMatrixSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['builder', 'verifier_harness', 'adversarial_reviewer', 'coordinator', 'integration'],
  properties: {
    builder: roleSkillMapSchema,
    verifier_harness: roleSkillMapSchema,
    adversarial_reviewer: roleSkillMapSchema,
    coordinator: coordinatorSkillsSchema,
    integration: integrationSkillsSchema,
  },
}
