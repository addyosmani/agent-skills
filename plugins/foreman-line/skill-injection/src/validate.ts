/**
 * `validateSkillInjectionMatrix`: the one exported validation entry point.
 * Runs the structural (ajv) pass against `skillInjectionMatrixSchema`. Every
 * AC3/AC4a-d invariant (closed top-level keys, glob-pattern-key syntax, the
 * role-map-empty-vs-glob-empty distinction, non-empty skill-name arrays,
 * skill-name well-formedness) is schema-enforced (see `schemas.ts`) — there
 * is deliberately no separate hand-written semantic-check layer here, since
 * every one of those rules is a static shape constraint JSON Schema can
 * express directly (the coordinator's preference: single source of truth).
 *
 * `parseSkillInjectionMatrixYaml` is the separate, earlier gate for AC4e
 * (duplicate-key rejection): a schema validates an already-parsed JS object,
 * by which point a duplicate key has already been silently collapsed by a
 * lenient parser. Rejecting duplicates must happen at parse time, before a
 * document ever reaches `validateSkillInjectionMatrix`.
 */
import { Ajv, type SchemaObject } from 'ajv'
import { parse } from 'yaml'
import { skillInjectionMatrixSchema } from './schemas.js'

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

const ajv = new Ajv({ allErrors: true })
const validateStructure = ajv.compile(skillInjectionMatrixSchema as SchemaObject)

export function validateSkillInjectionMatrix(doc: unknown): ValidationResult {
  const errors: string[] = []

  const structurallyValid = validateStructure(doc)
  if (!structurallyValid) {
    for (const err of validateStructure.errors ?? []) {
      const path = err.instancePath.length > 0 ? err.instancePath : '(root)'
      errors.push(`${path} ${err.message ?? 'is invalid'}`)
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Parses a skill-injection matrix YAML document with duplicate-key
 * rejection explicitly configured (AC4e). `yaml@2.9.0`'s `uniqueKeys`
 * option already defaults to `true` (verified directly: a duplicate top-
 * level or nested-map key throws `YAMLParseError`, not a silent last-wins
 * collapse) — `uniqueKeys: true` is passed explicitly anyway, so the strict
 * behavior is visible in source and does not depend on an implicit default
 * a future `yaml` upgrade could quietly change. Throws `YAMLParseError` (or
 * any other parse error `yaml` raises) on invalid input; callers (the CLI)
 * decide the exit code.
 */
export function parseSkillInjectionMatrixYaml(raw: string): unknown {
  return parse(raw, { uniqueKeys: true })
}
