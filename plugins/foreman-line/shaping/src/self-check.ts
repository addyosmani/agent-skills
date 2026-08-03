/**
 * Two-layer ADVISORY self-check for the drafts this package authors.
 *
 * Layer 1 (frontmatter) delegates to the FROZEN `spec-linter` surface
 * (`parseFrontmatter` + `validateSpecFrontmatter`) via a relative ESM specifier -
 * no re-implementation that could drift, and `spec-linter` is never modified.
 * Layer 2 (body sections) is a thin complementary check that lives HERE, not in
 * the frozen linter: SPEC-CONVENTION §4 required sections present + in order, and
 * a non-empty Out of Scope (§4.4).
 *
 * This module is a PURE function surface: it reads a draft's text and returns a
 * verdict. It never writes, moves, or flips a spec's `status`. The self-check is
 * ADVISORY - a fast local gate to cut round-trips. COORDINATOR LINT REMAINS THE
 * SOLE AUTHORITY; a passing self-check never authorizes a `status` flip to `active`.
 */
import {
  parseFrontmatter,
  type ValidationResult,
  validateSpecFrontmatter,
} from '../../spec-linter/src/index.js'

/** SPEC-CONVENTION §4 required body sections, in required order. */
export const REQUIRED_SECTIONS = [
  'Intent',
  'Constraints',
  'Acceptance Criteria',
  'Out of Scope',
  'Context & References',
] as const

export interface BodySectionResult {
  readonly valid: boolean
  readonly errors: readonly string[]
}

export interface SelfCheckResult {
  readonly valid: boolean
  readonly frontmatter: ValidationResult
  readonly body: BodySectionResult
  readonly errors: readonly string[]
}

const HASH = 35 // '#'

/** True if `line[i]` is a single whitespace character (matches the JS `\s` set). */
function charIsWhitespace(line: string, i: number): boolean {
  const ch = line[i]
  return ch !== undefined && ch.trim() === ''
}

/**
 * Linear predicate for the `##`-marker prefix (replaces `/^##(?!#)\s+/`): starts
 * with exactly two `#` (a third `#` disqualifies) followed by at least one
 * whitespace character. No backtracking - constant-time char-code checks.
 */
function startsWithH2(line: string): boolean {
  return (
    line.charCodeAt(0) === HASH &&
    line.charCodeAt(1) === HASH &&
    line.charCodeAt(2) !== HASH &&
    charIsWhitespace(line, 2)
  )
}

/**
 * Linear parse of a `##` heading title (replaces `/^##(?!#)\s+(.+?)\s*$/`):
 * returns the trimmed heading text, or `null` when the line is not a `##`
 * heading or has empty text. `slice(2).trim()` removes exactly the JS `\s` set,
 * so the trimmed result is byte-identical to the old capture-then-`.trim()`.
 */
function parseH2Heading(line: string): string | null {
  if (!startsWithH2(line)) return null
  const text = line.slice(2).trim()
  return text.length > 0 ? text : null
}

/** Extract `##`-level heading titles (exactly two hashes), in document order. */
function extractH2Headings(fileContent: string): string[] {
  const headings: string[] = []
  for (const line of fileContent.split(/\r?\n/)) {
    const heading = parseH2Heading(line)
    if (heading !== null) headings.push(heading)
  }
  return headings
}

/** Return the body text between the given `##` heading and the next `##` heading. */
function sectionBody(fileContent: string, heading: string): string {
  const lines = fileContent.split(/\r?\n/)
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (parseH2Heading(lines[i] ?? '') === heading) {
      start = i + 1
      break
    }
  }
  if (start === -1) return ''
  const collected: string[] = []
  for (let i = start; i < lines.length; i++) {
    if (startsWithH2(lines[i] ?? '')) break
    collected.push(lines[i] ?? '')
  }
  return collected.join('\n')
}

/**
 * True if the Out of Scope body has content: ANY non-blank line whose content is
 * not literally "None" counts - prose paragraphs and numbered lists, not just
 * `-`/`*`/`+` bullets. An optional leading list marker (bullet or ordered) is
 * stripped before comparison; the remaining text is what must be non-empty and
 * not "None".
 */
function outOfScopeNonEmpty(fileContent: string): boolean {
  const body = sectionBody(fileContent, 'Out of Scope')
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    // Strip an optional leading list marker: bullets (-, *, +) or ordered (1. / 1)).
    const content = trimmed.replace(/^(?:[-*+]|\d+[.)])\s+/, '')
    const normalized = content.trim().replace(/\.$/, '').toLowerCase()
    if (normalized.length > 0 && normalized !== 'none') return true
  }
  return false
}

/**
 * Layer 2: confirm the five §4 required sections are present and in the correct
 * RELATIVE order (optional sections between them are tolerated), and that Out of
 * Scope is non-empty.
 */
export function checkBodySections(fileContent: string): BodySectionResult {
  const errors: string[] = []
  const headings = extractH2Headings(fileContent)

  const indices: number[] = []
  for (const required of REQUIRED_SECTIONS) {
    const idx = headings.indexOf(required)
    if (idx === -1) {
      errors.push(`missing required section: '${required}'`)
    } else {
      indices.push(idx)
    }
  }

  // Relative order: only meaningful when all required sections are present.
  if (indices.length === REQUIRED_SECTIONS.length) {
    for (let i = 1; i < indices.length; i++) {
      if ((indices[i] ?? 0) < (indices[i - 1] ?? 0)) {
        errors.push(
          `required sections out of order: '${REQUIRED_SECTIONS[i]}' appears before '${REQUIRED_SECTIONS[i - 1]}'`,
        )
        break
      }
    }
  }

  if (headings.includes('Out of Scope') && !outOfScopeNonEmpty(fileContent)) {
    errors.push("Out of Scope is empty or only 'None' (SPEC-CONVENTION §4.4 requires it non-empty)")
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Layer 1: frontmatter validation, delegated to the frozen spec-linter. Returns
 * a violation result (never throws) when frontmatter is absent or unparseable.
 */
export function checkFrontmatter(fileContent: string): ValidationResult {
  const doc = parseFrontmatter(fileContent)
  if (doc === null) {
    return {
      valid: false,
      errors: ['no parseable YAML frontmatter found at the start of the draft'],
      warnings: [],
    }
  }
  return validateSpecFrontmatter(doc)
}

/**
 * Run both advisory layers over a draft's text. Pure: reads text, returns a
 * verdict; performs no filesystem mutation of any kind.
 */
export function selfCheckDraft(fileContent: string): SelfCheckResult {
  const frontmatter = checkFrontmatter(fileContent)
  const body = checkBodySections(fileContent)
  return {
    valid: frontmatter.valid && body.valid,
    frontmatter,
    body,
    errors: [...frontmatter.errors, ...body.errors],
  }
}
