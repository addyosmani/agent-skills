/**
 * PR → governing-spec resolution (W4-P3, PR4-6). Resolves the DECLARED risk
 * from the parcel's governing ACTIVE spec — the coordinator-linted contract at
 * dispatch time — never the archival `done/` corpus and never a `draft`
 * (non-dispatchable) spec. Only `status: 'active'` descriptors govern.
 *
 * Loading active specs is an INJECTED SEAM (default = real disk read, tests =
 * fixtures). The frontmatter reader is a LOCAL minimal parser (no `spec-linter`
 * import — no `integration → spec-linter` edge) wrapped in a typed try-catch
 * (lesson #22, external-shape reads). Nothing here mints a `correlationId`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  type AuditTriggerDecision,
  evaluateAuditTrigger,
  maxRisk,
  type RiskLevel,
} from './audit-trigger.js'
import { IntegrationError } from './errors.js'

/** A `status:'active'` spec descriptor as consumed by the resolver. */
export interface ActiveSpecDescriptor {
  readonly path: string
  readonly risk: RiskLevel
  readonly surfaces: readonly string[]
  /** Frontmatter `status:`; only `'active'` governs. Absent ⇒ treated active. */
  readonly status?: string
}

export interface GoverningSpecResolution {
  readonly declaredRisk: RiskLevel
  readonly governingSpec: string | null
  readonly reasons: readonly string[]
}

// ── Path matcher (local; no new runtime dependency) ─────────────────────────

/** Escape a string for literal use inside a RegExp (leaves `*` for the caller). */
function escapeRegExp(literal: string): string {
  return literal.replace(/[.+^${}()|[\]\\]/g, '\\$&')
}

/**
 * Match a single `surfaces:` entry against a changed path. Three modes:
 *   - glob:            entry contains `*` — `**` spans path separators, `*`
 *                      matches within a single segment.
 *   - directory-prefix: entry ends with `/` — matches any nested path under it.
 *   - exact:           otherwise — strict string equality.
 */
export function matchesSurface(surface: string, path: string): boolean {
  const s = surface.replace(/\\/g, '/')
  const p = path.replace(/\\/g, '/')

  if (s.includes('*')) {
    // `**` spans separators (`.*`); a lone `*` stays within a segment
    // (`[^/]*`). Single pass — no sentinel placeholder needed.
    const pattern = escapeRegExp(s).replace(/\*\*|\*/g, (m) => (m === '**' ? '.*' : '[^/]*'))
    return new RegExp(`^${pattern}$`).test(p)
  }
  if (s.endsWith('/')) {
    return p.startsWith(s)
  }
  return p === s
}

/** A spec matches iff any of its surfaces covers ≥1 changed path. */
function specMatches(spec: ActiveSpecDescriptor, changedPaths: readonly string[]): boolean {
  return spec.surfaces.some((surface) => changedPaths.some((p) => matchesSurface(surface, p)))
}

/**
 * Resolve the governing active spec (PR4-6), returning the declared risk, the
 * governing-spec path, and any resolution reasons. Only `status:'active'`
 * descriptors participate (a `draft`/`done` descriptor never governs):
 *
 *   - single match → `declaredRisk = spec.risk`, `governingSpec = spec.path`
 *   - no match     → `governingSpec = null`, `declaredRisk = 'low'` (floor),
 *                    reason `no-governing-spec` (a no-spec diff on an
 *                    elevated-derived surface therefore yields triggered+drift)
 *   - multi-match  → `declaredRisk = max(risk over matches)`, reason `multi-spec`
 */
export function resolveGoverningSpec(
  changedPaths: readonly string[],
  activeSpecs: readonly ActiveSpecDescriptor[],
): GoverningSpecResolution {
  const active = activeSpecs.filter((spec) => (spec.status ?? 'active') === 'active')
  const matches = active.filter((spec) => specMatches(spec, changedPaths))

  if (matches.length === 0) {
    return { declaredRisk: 'low', governingSpec: null, reasons: ['no-governing-spec'] }
  }
  if (matches.length === 1) {
    const only = matches[0] as ActiveSpecDescriptor
    return { declaredRisk: only.risk, governingSpec: only.path, reasons: [] }
  }
  const declaredRisk = matches.reduce<RiskLevel>((acc, spec) => maxRisk(acc, spec.risk), 'low')
  const paths = matches.map((spec) => spec.path).join(', ')
  // Report the spec that actually SUPPLIED the max risk (first such match), so
  // the named `governingSpec` agrees with `declaredRisk` (RA-2/RB-3).
  const governing = matches.find((spec) => spec.risk === declaredRisk) as ActiveSpecDescriptor
  return { declaredRisk, governingSpec: governing.path, reasons: [`multi-spec: ${paths}`] }
}

/**
 * End-to-end change-set evaluation used by the report entrypoint and AC8:
 * resolve the governing spec, then compose the audit-trigger decision
 * (derived risk is computed once, inside `evaluateAuditTrigger`).
 */
export function evaluateChangeSet(
  changedPaths: readonly string[],
  activeSpecs: readonly ActiveSpecDescriptor[],
): AuditTriggerDecision {
  const resolved = resolveGoverningSpec(changedPaths, activeSpecs)
  return evaluateAuditTrigger({
    declaredRisk: resolved.declaredRisk,
    changedPaths,
    governingSpec: resolved.governingSpec,
    extraReasons: resolved.reasons,
  })
}

// ── Injected active-spec loader seam (default = real disk read) ─────────────

/** Injected seam: load `status:'active'` spec descriptors from a repo root. */
export type LoadActiveSpecsFn = (repoRoot: string) => readonly ActiveSpecDescriptor[]

/** Repo-relative directory holding the live spec contracts (PR4-6). */
const ACTIVE_SPECS_DIR = join('plugins', 'foreman-line', 'docs', 'specs', 'active')

const VALID_RISKS: readonly RiskLevel[] = ['low', 'standard', 'elevated', 'critical']

function isRiskLevel(value: string): value is RiskLevel {
  return (VALID_RISKS as readonly string[]).includes(value)
}

/**
 * Local minimal frontmatter reader (no `spec-linter` import). Extracts
 * `status`, `risk`, and the inline `surfaces: [...]` array from the leading
 * `---` fenced block. Returns null when the file is not a shaped spec.
 */
function parseFrontmatter(
  raw: string,
): { status: string; risk: RiskLevel; surfaces: string[] } | null {
  const fence = /^---\s*\n([\s\S]*?)\n---\s*(\n|$)/.exec(raw)
  if (fence === null) return null
  const body = fence[1] as string

  let status: string | undefined
  let risk: string | undefined
  let surfaces: string[] | undefined

  for (const line of body.split('\n')) {
    const statusMatch = /^status:\s*(.+?)\s*$/.exec(line)
    if (statusMatch) status = (statusMatch[1] as string).replace(/^["']|["']$/g, '')

    const riskMatch = /^risk:\s*(.+?)\s*$/.exec(line)
    if (riskMatch) risk = (riskMatch[1] as string).replace(/^["']|["']$/g, '')

    const surfacesMatch = /^surfaces:\s*\[(.*)\]\s*$/.exec(line)
    if (surfacesMatch) {
      surfaces = (surfacesMatch[1] as string)
        .split(',')
        .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
        .filter((entry) => entry.length > 0)
    }
  }

  if (status === undefined || risk === undefined || surfaces === undefined) return null
  if (!isRiskLevel(risk)) return null
  return { status, risk, surfaces }
}

/**
 * Real loader (default): reads `active/*.md`, parses frontmatter with the local
 * reader, and returns only `status:'active'` descriptors. Never invoked by the
 * hermetic test suite (tests inject descriptors directly). Wrapped in a typed
 * try-catch per lesson #22.
 */
export const loadActiveSpecsLive: LoadActiveSpecsFn = (repoRoot) => {
  const dir = join(repoRoot, ACTIVE_SPECS_DIR)
  let files: string[]
  try {
    // Sort for a stable, deterministic descriptor order (RA-2/RB-3).
    files = readdirSync(dir)
      .filter((name) => name.endsWith('.md'))
      .sort()
  } catch (err) {
    throw new IntegrationError(
      'POSTURE_INVALID',
      `failed to list active specs dir '${dir}': ${String(err)}`,
    )
  }

  const descriptors: ActiveSpecDescriptor[] = []
  for (const name of files) {
    const specPath = join(ACTIVE_SPECS_DIR, name).replace(/\\/g, '/')
    let parsed: ReturnType<typeof parseFrontmatter>
    try {
      parsed = parseFrontmatter(readFileSync(join(dir, name), 'utf8'))
    } catch (err) {
      throw new IntegrationError(
        'POSTURE_INVALID',
        `failed to read/parse active spec '${specPath}': ${String(err)}`,
      )
    }
    if (parsed === null || parsed.status !== 'active') continue
    descriptors.push({
      path: specPath,
      risk: parsed.risk,
      surfaces: parsed.surfaces,
      status: parsed.status,
    })
  }
  return descriptors
}
