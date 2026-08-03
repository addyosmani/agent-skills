/**
 * ShapingResult emitter (Stage A / W1-P1).
 *
 * Emits the **bare** `ShapingResult` payload (`{ parcelSpecRefs, epics }`) - NOT
 * a `StageOutput<ShapingResult>` envelope. The envelope requires a `ReceiptRef`
 * and receipt minting is W1-P3's job; emitting an envelope here would preempt P3.
 *
 * The payload is validated against the FROZEN `shapingResultSchema` imported from
 * `contracts` (no local re-declaration of the schema or the type). `epics` is
 * always `[]` at Stage A - W1-P2 fills it. A semantic guard refuses to emit when
 * `parcelSpecRefs` is empty, even though `parcelSpecRefs: []` is schema-valid.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Ajv } from 'ajv'
// Frozen emission authority - imported from the contracts public surface, never
// re-declared here. Relative ESM specifier (W0-P4 precedent); the bare scoped
// specifier does not resolve across plugins/foreman-line/* and is banned (see README).
import { type ShapingResult, shapingResultSchema } from '../../contracts/src/index.js'

/** Repo root, resolved from this module's location: src -> shaping -> foreman-line -> plugins -> root. */
export const DEFAULT_REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
)

/** Repo-relative POSIX directory the artifact is written beneath. */
export const ACTIVE_SPECS_DIR = 'plugins/foreman-line/docs/specs/active'

const ajv = new Ajv({ allErrors: true })
const validateShapingResult = ajv.compile(shapingResultSchema)

/**
 * Derive a filesystem-safe session slug from a raw string (coordinator-ratified
 * amendment): lowercase, trim, collapse each run of non-alphanumeric characters
 * to a single `-`, strip leading/trailing `-`. Throws on an empty result.
 */
export function deriveSessionSlug(raw: string): string {
  const collapsed = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
  const slug = stripDashes(collapsed)
  if (slug.length === 0) {
    throw new Error(
      `deriveSessionSlug: input '${raw}' produced an empty slug (no alphanumeric characters)`,
    )
  }
  return slug
}

const DASH = 45 // '-'

/**
 * Strip leading and trailing `-` in linear time (replaces `/^-+|-+$/g`). Two
 * inward-walking indices over `charCodeAt`; internal dashes are untouched. No
 * backtracking - byte-identical to the anchored-alternation regex it replaces.
 */
function stripDashes(s: string): string {
  let start = 0
  let end = s.length
  while (start < end && s.charCodeAt(start) === DASH) start++
  while (end > start && s.charCodeAt(end - 1) === DASH) end--
  return s.slice(start, end)
}

/** Normalize a path to repo-relative POSIX form (backslashes -> forward slashes). */
export function toPosixRelative(p: string): string {
  return p.replace(/\\/g, '/')
}

export interface EmitOptions {
  /** Explicit session slug chosen by the caller (already-derived or raw-safe). */
  readonly sessionSlug: string
  /** Repo-relative paths to the emitted draft `.md` spec files. Normalized to POSIX. */
  readonly parcelSpecRefs: readonly string[]
  /** Repo root to write beneath. Defaults to the real repo root. */
  readonly repoRoot?: string
}

export interface EmitResult {
  /** Absolute filesystem path the artifact was written to. */
  readonly artifactPath: string
  /** Repo-relative POSIX path of the artifact (`active/<slug>.shaping-result.json`). */
  readonly artifactRef: string
  /** The bare payload that was written and validated. */
  readonly payload: ShapingResult
}

/**
 * Build, validate, and write exactly one `ShapingResult` artifact for a shaping
 * session. Refuses to emit when `parcelSpecRefs` is empty (semantic guard) and
 * refuses to overwrite an existing artifact (collision policy).
 */
export function emitShapingResult(options: EmitOptions): EmitResult {
  const { sessionSlug, parcelSpecRefs, repoRoot = DEFAULT_REPO_ROOT } = options

  // Semantic guard: schema-valid != semantically complete. `parcelSpecRefs: []`
  // passes the frozen schema (no minItems) but is meaningless for Stage A.
  if (parcelSpecRefs.length === 0) {
    throw new Error(
      'emitShapingResult: parcelSpecRefs is empty; Stage A must reference at least one draft spec (semantic guard). ' +
        'The payload would be schema-valid but semantically incomplete.',
    )
  }

  // Sanitization guard: the slug drives a filesystem path, so it MUST already be
  // canonical. Reject anything deriveSessionSlug would change or refuse (uppercase,
  // separators, `../` traversal, non-alphanumeric-only) with one uniform error,
  // before any path is constructed. Callers derive the slug via deriveSessionSlug.
  let canonical: string | null = null
  try {
    canonical = deriveSessionSlug(sessionSlug)
  } catch {
    canonical = null
  }
  if (canonical !== sessionSlug) {
    throw new Error(
      `emitShapingResult: sessionSlug '${sessionSlug}' is not canonical; derive it via deriveSessionSlug before calling emit`,
    )
  }

  const payload: ShapingResult = {
    parcelSpecRefs: parcelSpecRefs.map(toPosixRelative),
    epics: [],
  }

  if (!validateShapingResult(payload)) {
    const detail = (validateShapingResult.errors ?? [])
      .map((e) => `${e.instancePath || '(root)'} ${e.message ?? 'is invalid'}`)
      .join('; ')
    throw new Error(`emitShapingResult: payload failed shapingResultSchema validation: ${detail}`)
  }

  const artifactRef = `${ACTIVE_SPECS_DIR}/${sessionSlug}.shaping-result.json`
  const activeDir = join(repoRoot, ...ACTIVE_SPECS_DIR.split('/'))
  const artifactPath = join(activeDir, `${sessionSlug}.shaping-result.json`)

  // Collision policy: never silently overwrite; the caller picks a distinct slug.
  if (existsSync(artifactPath)) {
    throw new Error(
      `emitShapingResult: refusing to overwrite existing artifact at ${artifactPath}; choose a distinct sessionSlug`,
    )
  }

  mkdirSync(activeDir, { recursive: true })
  // Two-space pretty JSON with trailing newline; a plain object, RFC 8785-canonicalizable.
  writeFileSync(artifactPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  return { artifactPath, artifactRef, payload }
}
