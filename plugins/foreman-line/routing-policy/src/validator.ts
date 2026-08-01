/**
 * `validatePolicy`: the one exported validation entry point. Runs the
 * structural (ajv) pass against `routingPolicySchema` first, then the five
 * semantic invariants from the spec's Constraints section, independent of
 * whether the structural pass succeeded (so a single invocation surfaces every
 * violation, not just the first — the exit-code contract's `1` case depends
 * on this).
 *
 * Ceiling presence (invariant d) is enforced entirely by the schema itself
 * (`ceiling_usd` required + `exclusiveMinimum: 0`) — a static bound is
 * directly expressible in JSON Schema, unlike the cross-field rules below,
 * so no separate function exists for it here.
 */
import { Ajv, type SchemaObject } from 'ajv'
import { routingPolicySchema } from './schemas.js'

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

const ajv = new Ajv({ allErrors: true })
const validateStructure = ajv.compile(routingPolicySchema as SchemaObject)

const SECURITY_NAME_PATTERN = /security|audit/i

/**
 * Frontier-tier anchoring registry (rework Finding 1): the set of model ids
 * `model_tiers.frontier` is allowed to contain. Deliberately hardcoded here,
 * not read from the policy document — a self-describing document cannot
 * anchor its own security override. The policy file is mutable data under
 * validation; this registry is reviewed, tested code. Redefining "frontier"
 * therefore costs a code change with tests (the quarterly model revisit),
 * never a policy-file edit.
 */
export const KNOWN_FRONTIER_MODELS: readonly string[] = ['claude-opus-4-8']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function eligibleModelsOf(
  dataClassification: Record<string, unknown>,
  tier: 'public' | 'internal' | 'restricted',
): ReadonlySet<string> {
  const rule = dataClassification[tier]
  if (!isRecord(rule)) return new Set()
  return new Set(toStringArray(rule.eligible_models))
}

/** D6: data classification gates eligibility before cost optimization runs. */
function checkClassificationGatesBeforeCost(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const dataClassification = doc.data_classification
  if (!isRecord(dataClassification)) return errors

  const publicModels = eligibleModelsOf(dataClassification, 'public')
  const internalModels = eligibleModelsOf(dataClassification, 'internal')
  const restrictedModels = eligibleModelsOf(dataClassification, 'restricted')

  for (const model of restrictedModels) {
    if (!internalModels.has(model)) {
      errors.push(
        `data_classification.restricted.eligible_models contains '${model}', which is not eligible under data_classification.internal — classification gating must narrow public -> internal -> restricted (D6)`,
      )
    }
  }
  for (const model of internalModels) {
    if (!publicModels.has(model)) {
      errors.push(
        `data_classification.internal.eligible_models contains '${model}', which is not eligible under data_classification.public — classification gating must narrow public -> internal -> restricted (D6)`,
      )
    }
  }
  return errors
}

/** D4: coordinator and verifier are structurally pinned to the frontier tier. */
function checkRolePinning(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const roles = doc.roles
  if (!isRecord(roles)) return errors

  if (roles.coordinator !== 'frontier') {
    errors.push(
      `roles.coordinator must be 'frontier', got '${String(roles.coordinator)}' (D4: coordinator is always frontier tier)`,
    )
  }
  if (roles.verifier !== 'frontier') {
    errors.push(
      `roles.verifier must be 'frontier', got '${String(roles.verifier)}' (D4: verifier is always frontier tier)`,
    )
  }
  return errors
}

/**
 * Security override + its derived guard: a class self-declares
 * `security_flavored: true`, and every tier in its allowlist must then equal
 * `'frontier'` (not merely contain it — closes a mixed-allowlist loophole).
 * Any class whose key looks security/audit-flavored by name but omits the flag
 * is rejected outright — declared + derived, never "somehow" (plan §6).
 */
function checkSecurityOverride(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const classes = doc.classes
  if (!isRecord(classes)) return errors

  for (const [className, rawEntry] of Object.entries(classes)) {
    if (!isRecord(rawEntry)) continue
    const flagged = rawEntry.security_flavored === true

    if (SECURITY_NAME_PATTERN.test(className) && !flagged) {
      errors.push(
        `classes['${className}'] looks security/audit-flavored by name but does not declare 'security_flavored: true' (declared + derived, never "somehow")`,
      )
    }

    if (flagged) {
      for (const tier of toStringArray(rawEntry.allowlist)) {
        if (tier !== 'frontier') {
          errors.push(
            `classes['${className}'] is security_flavored but allowlist contains non-frontier tier '${tier}' — security override requires every allowlisted tier to equal 'frontier'`,
          )
        }
      }
    }
  }
  return errors
}

/** Invariant (e): every model id in `model_tiers.frontier` must be a known frontier model. */
function checkFrontierTierAnchoring(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const modelTiers = doc.model_tiers
  if (!isRecord(modelTiers)) return errors

  for (const modelId of toStringArray(modelTiers.frontier)) {
    if (!KNOWN_FRONTIER_MODELS.includes(modelId)) {
      errors.push(
        `model_tiers.frontier contains '${modelId}', which is not in the KNOWN_FRONTIER_MODELS registry (${KNOWN_FRONTIER_MODELS.join(', ')}) — redefining frontier requires a reviewed, tested code change, never a policy-file edit`,
      )
    }
  }
  return errors
}

export function validatePolicy(doc: unknown): ValidationResult {
  const errors: string[] = []

  const structurallyValid = validateStructure(doc)
  if (!structurallyValid) {
    for (const err of validateStructure.errors ?? []) {
      const path = err.instancePath.length > 0 ? err.instancePath : '(root)'
      errors.push(`${path} ${err.message ?? 'is invalid'}`)
    }
  }

  if (isRecord(doc)) {
    errors.push(...checkClassificationGatesBeforeCost(doc))
    errors.push(...checkRolePinning(doc))
    errors.push(...checkSecurityOverride(doc))
    errors.push(...checkFrontierTierAnchoring(doc))
  }

  return { valid: errors.length === 0, errors }
}
