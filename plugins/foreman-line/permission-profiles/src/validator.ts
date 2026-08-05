/**
 * `validateRegistry`: the one exported validation entry point. Runs the
 * structural (ajv) pass against `permissionProfileRegistrySchema` first, then
 * the five semantic invariants from the spec's Constraints section,
 * independent of whether the structural pass succeeded (so a single
 * invocation surfaces every violation, not just the first — the exit-code
 * contract's `1` case depends on this).
 */
import { Ajv, type SchemaObject } from 'ajv'
import { permissionProfileRegistrySchema } from './schemas.js'
import { PROFILE_NAMES } from './types.js'

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

const ajv = new Ajv({ allErrors: true })
const validateStructure = ajv.compile(permissionProfileRegistrySchema as SchemaObject)

/**
 * The five enumerable repo-mutation commands (charter D9-amendment(b)),
 * each required in BOTH `Bash(...)` and `PowerShell(...)` form on
 * `reviewer-readonly`.
 */
const REVIEWER_MUTATION_COMMANDS: readonly string[] = ['commit', 'push', 'apply', 'stash', 'merge']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function envelopeOf(profile: unknown): Record<string, unknown> | undefined {
  if (!isRecord(profile)) return undefined
  const envelope = profile.envelope
  return isRecord(envelope) ? envelope : undefined
}

function denyOf(profile: unknown): readonly string[] {
  const envelope = envelopeOf(profile)
  if (envelope === undefined) return []
  return toStringArray(envelope.deny)
}

/** Invariant 1: `profiles` map keys must exactly equal `PROFILE_NAMES` (F-I authority binding). */
function checkProfileSetCompleteness(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const profiles = doc.profiles
  if (!isRecord(profiles)) return errors

  const actualKeys = new Set(Object.keys(profiles))
  const expectedKeys = new Set<string>(PROFILE_NAMES)

  for (const expected of PROFILE_NAMES) {
    if (!actualKeys.has(expected)) {
      errors.push(
        `profiles is missing required profile '${expected}' — the profiles map must exactly equal PROFILE_NAMES`,
      )
    }
  }
  for (const actual of actualKeys) {
    if (!expectedKeys.has(actual)) {
      errors.push(
        `profiles contains unknown profile '${actual}', which is not in PROFILE_NAMES — the profiles map must exactly equal PROFILE_NAMES`,
      )
    }
  }
  return errors
}

/**
 * Invariant 2 (D9): every profile's `envelope.deny` must contain both an
 * `Edit(.claude/**)`-shaped rule and a `Write(.claude/**)`-shaped rule, or a
 * bare `Edit`/`Write` deny that necessarily covers them.
 */
function checkSelfModificationGuard(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const profiles = doc.profiles
  if (!isRecord(profiles)) return errors

  for (const [name, profile] of Object.entries(profiles)) {
    const deny = denyOf(profile)
    const hasEditGuard = deny.includes('Edit') || deny.includes('Edit(.claude/**)')
    const hasWriteGuard = deny.includes('Write') || deny.includes('Write(.claude/**)')
    if (!hasEditGuard) {
      errors.push(
        `profiles['${name}'].envelope.deny is missing an Edit(.claude/**)-shaped rule (or a bare 'Edit' deny) — every profile must carry the self-modification guard (D9)`,
      )
    }
    if (!hasWriteGuard) {
      errors.push(
        `profiles['${name}'].envelope.deny is missing a Write(.claude/**)-shaped rule (or a bare 'Write' deny) — every profile must carry the self-modification guard (D9)`,
      )
    }
  }
  return errors
}

/**
 * Invariant 3 (D9-amendment(a)): restates the schema-level `bypassPermissions`
 * exclusion with a clear, validator-level message (complements 5b's
 * schema-level rejection; a self-nullifying profile is rejected twice, not once).
 */
function checkNoSelfNullifyingMode(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const profiles = doc.profiles
  if (!isRecord(profiles)) return errors

  for (const [name, profile] of Object.entries(profiles)) {
    const envelope = envelopeOf(profile)
    if (envelope === undefined) continue
    if (envelope.defaultMode === 'bypassPermissions') {
      errors.push(
        `profiles['${name}'].envelope.defaultMode is 'bypassPermissions', which nullifies the profile's own deny rules (D9-amendment(a)) — bypass mode is never a legal defaultMode for a named profile`,
      )
    }
  }
  return errors
}

/**
 * Invariant 4 (D9-amendment(b)): `reviewer-readonly` MUST deny the `Edit` and
 * `Write` tools (bare), AND MUST deny each of the five enumerated
 * repo-mutation commands in both `Bash(...)` and `PowerShell(...)` form.
 */
function checkReviewerReadonlyRestrictionCompleteness(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const profiles = doc.profiles
  if (!isRecord(profiles)) return errors
  const reviewer = profiles['reviewer-readonly']
  if (reviewer === undefined) return errors

  const deny = denyOf(reviewer)

  if (!deny.includes('Edit')) {
    errors.push(
      "profiles['reviewer-readonly'].envelope.deny is missing a bare 'Edit' deny — reviewer-readonly restriction completeness requires denying the Edit tool outright (D9-amendment(b))",
    )
  }
  if (!deny.includes('Write')) {
    errors.push(
      "profiles['reviewer-readonly'].envelope.deny is missing a bare 'Write' deny — reviewer-readonly restriction completeness requires denying the Write tool outright (D9-amendment(b))",
    )
  }

  for (const command of REVIEWER_MUTATION_COMMANDS) {
    for (const shell of ['Bash', 'PowerShell'] as const) {
      const rule = `${shell}(git ${command}*)`
      if (!deny.includes(rule)) {
        errors.push(
          `profiles['reviewer-readonly'].envelope.deny is missing '${rule}' — reviewer-readonly must deny each of the five enumerable repo-mutation commands (git commit, git push, git apply, git stash, git merge) in both Bash and PowerShell form (D9-amendment(b))`,
        )
      }
    }
  }
  return errors
}

/**
 * Invariant 5 (D9-amendment(c)): `reviewer-readonly` MUST NOT deny bare
 * `Bash` or bare `PowerShell` — a derived guard against "enumerate all the
 * denials" collapsing into "deny the shell," which would remove the
 * deliberately-retained hostile-input-probing capability (lesson #12).
 */
function checkReviewerReadonlyShellAccessPreservation(doc: Record<string, unknown>): string[] {
  const errors: string[] = []
  const profiles = doc.profiles
  if (!isRecord(profiles)) return errors
  const reviewer = profiles['reviewer-readonly']
  if (reviewer === undefined) return errors

  const deny = denyOf(reviewer)
  if (deny.includes('Bash')) {
    errors.push(
      "profiles['reviewer-readonly'].envelope.deny contains a bare 'Bash' deny — reviewer-readonly must retain shell access for hostile-input probing (lesson #12; D9-amendment(c)); denying bare Bash wholesale is a defect, not a stronger restriction",
    )
  }
  if (deny.includes('PowerShell')) {
    errors.push(
      "profiles['reviewer-readonly'].envelope.deny contains a bare 'PowerShell' deny — reviewer-readonly must retain shell access for hostile-input probing (lesson #12; D9-amendment(c)); denying bare PowerShell wholesale is a defect, not a stronger restriction",
    )
  }
  return errors
}

export function validateRegistry(doc: unknown): ValidationResult {
  const errors: string[] = []

  const structurallyValid = validateStructure(doc)
  if (!structurallyValid) {
    for (const err of validateStructure.errors ?? []) {
      const path = err.instancePath.length > 0 ? err.instancePath : '(root)'
      errors.push(`${path} ${err.message ?? 'is invalid'}`)
    }
  }

  if (isRecord(doc)) {
    errors.push(...checkProfileSetCompleteness(doc))
    errors.push(...checkSelfModificationGuard(doc))
    errors.push(...checkNoSelfNullifyingMode(doc))
    errors.push(...checkReviewerReadonlyRestrictionCompleteness(doc))
    errors.push(...checkReviewerReadonlyShellAccessPreservation(doc))
  }

  return { valid: errors.length === 0, errors }
}
