/**
 * `validateSpecFrontmatter`: the exported validation entry point. Runs the
 * structural (ajv) pass against `specFrontmatterSchema` first, then the semantic
 * invariants, independent of whether the structural pass succeeded (so a single
 * invocation surfaces every violation, not just the first).
 *
 * Advisory warnings are non-blocking: they appear in the `warnings` array and
 * are emitted to stderr by the CLI, but they do not change the `valid` flag or
 * exit code.
 *
 * `parseFrontmatter` extracts and parses YAML frontmatter from a spec .md file.
 */
import { Ajv, type SchemaObject } from 'ajv'
import { parse } from 'yaml'
import { waiversFor } from './grandfather.js'
import { specFrontmatterSchema } from './schemas.js'

export interface ValidationResult {
  readonly valid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
}

export interface ValidateOptions {
  readonly noPermissionProfileWarning?: boolean
  /**
   * The spec file's basename (e.g. `P3-dispatch-time-emitter.md`). When it
   * appears on the CLOSE-P2 grandfather allowlist AND `parentDirName` is
   * `done`, violations of ONLY the waived class(es) with ONLY the pinned
   * historical value(s) are downgraded to `grandfathered:` advisory warnings.
   * Absent or unlisted basenames get full validation.
   */
  readonly basename?: string
  /**
   * The name of the validated file's parent directory (the CLI supplies
   * `basename(dirname(filePath))`). Grandfather waivers apply ONLY when this
   * is exactly `done` — a grandfathered basename anywhere else (active/, a
   * scratch dir, unit-level calls without this signal) gets full validation
   * (CLOSE-P2 rework R1a).
   */
  readonly parentDirName?: string
}

/**
 * Canonical vocabulary of known surface prefixes (SPEC-CONVENTION §4).
 * A `surfaces:` entry that does not begin with any prefix here triggers a
 * non-blocking advisory warning. New prefixes are added to SPEC-CONVENTION §4
 * via PR — that is the extension point; do not add them here alone.
 */
export const KNOWN_SURFACE_PREFIXES: readonly string[] = [
  'docs/',
  'plugins/',
  'skills/',
  'apps/',
  'config/',
]

const ajv = new Ajv({ allErrors: true })
const validateStructure = ajv.compile(specFrontmatterSchema as SchemaObject)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Semantic invariant: status 'superseded' requires non-null superseded_by. */
function checkSupersededInvariant(doc: Record<string, unknown>): string[] {
  if (doc.status === 'superseded' && doc.superseded_by === null) {
    return [
      "status is 'superseded' but superseded_by is null — a superseded spec must name its replacement in superseded_by",
    ]
  }
  return []
}

export function validateSpecFrontmatter(doc: unknown, options?: ValidateOptions): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Grandfather waivers require BOTH signals: an allowlisted basename AND the
  // parent directory being exactly `done` (CLOSE-P2 rework R1a).
  const waivers =
    options?.basename !== undefined && options?.parentDirName === 'done'
      ? waiversFor(options.basename)
      : []

  const structurallyValid = validateStructure(doc)
  if (!structurallyValid) {
    for (const err of validateStructure.errors ?? []) {
      const path = err.instancePath.length > 0 ? err.instancePath : '(root)'
      const message = `${path} ${err.message ?? 'is invalid'}`
      // A waiver applies only when the error is on its own field AND the
      // file's actual value is one of the pinned historical values (R1b).
      const waiver = waivers.find(
        (w) =>
          err.instancePath === `/${w.field}` &&
          isRecord(doc) &&
          w.allowedValues.includes(doc[w.field] as string | null),
      )
      if (waiver !== undefined) {
        // Class-scoped, value-pinned grandfather waiver: non-blocking, but
        // visibly recorded.
        warnings.push(`grandfathered (${waiver.kind}): ${message}`)
      } else {
        errors.push(message)
      }
    }
  }

  if (isRecord(doc)) {
    errors.push(...checkSupersededInvariant(doc))

    // Advisory: permission_profile absent
    if (!options?.noPermissionProfileWarning && !('permission_profile' in doc)) {
      warnings.push(
        'advisory: permission_profile is absent; set it to a registry profile name when the registry ships',
      )
    }

    // Advisory: surfaces entry with unknown vocabulary prefix
    const surfaces = Array.isArray(doc.surfaces) ? (doc.surfaces as unknown[]) : []
    for (const entry of surfaces) {
      if (typeof entry === 'string') {
        const hasKnownPrefix = KNOWN_SURFACE_PREFIXES.some((p) => entry.startsWith(p))
        if (!hasKnownPrefix) {
          warnings.push(
            `advisory: surfaces entry '${entry}' does not begin with a known vocabulary prefix (${KNOWN_SURFACE_PREFIXES.join(', ')}) — see SPEC-CONVENTION §4`,
          )
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

/**
 * Extracts and parses the YAML frontmatter block from a Markdown spec file.
 * Frontmatter must begin at the very start of the file (line 1 is `---`).
 * Returns the parsed object on success, null if no valid frontmatter is found
 * or if the YAML cannot be parsed.
 */
export function parseFrontmatter(fileContent: string): unknown | null {
  if (!fileContent.startsWith('---')) return null
  const firstNewline = fileContent.indexOf('\n')
  if (firstNewline === -1) return null
  const afterFirst = fileContent.slice(firstNewline + 1)
  // Find closing --- on its own line
  const endMatch = /^---\s*(?:\r?\n|$)/m.exec(afterFirst)
  if (endMatch === null || endMatch.index === undefined) return null
  const yamlContent = afterFirst.slice(0, endMatch.index)
  try {
    return parse(yamlContent) as unknown
  } catch {
    return null
  }
}
