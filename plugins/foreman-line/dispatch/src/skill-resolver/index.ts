/**
 * Skill Injection Engine (W2-P5).
 *
 * Loads and validates the frozen skill-injection.yaml matrix, resolves which
 * skills are injected for the `builder` role given a parcel's `surfaces:`,
 * writes an injection receipt, and returns { injectedSkills, injectionReceiptRef }.
 *
 * Surface-Glob Resolution Semantics (path-segment boundary rule):
 *   - glob `'*'`        → universal rule; always fires
 *   - glob `'prefix/*'` → fires iff any surface === prefix OR surface.startsWith(prefix + '/')
 *
 * Linear-time string ops only (lesson #19): no regex over runtime-variable strings.
 * Matching uses === and String.prototype.startsWith only.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SkillInjectionMatrix, SkillName } from '../../../skill-injection/src/index.js'
import {
  parseSkillInjectionMatrixYaml,
  validateSkillInjectionMatrix,
} from '../../../skill-injection/src/index.js'

// ─── Error class ──────────────────────────────────────────────────────────────

export class SkillResolverError extends Error {
  readonly code: 'MATRIX_UNREADABLE' | 'MATRIX_INVALID' | 'RECEIPT_WRITE_FAILED'

  constructor(code: SkillResolverError['code'], message: string) {
    super(message)
    this.name = 'SkillResolverError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SkillResolverInput {
  /** Parcel surface paths (e.g. ['ui/components/Button.ts']). May be empty. */
  readonly surfaces: readonly string[]
  /** Unique identifier for this workflow; used as the receipt directory name. */
  readonly workflowId: string
}

export interface SkillResolverResult {
  /** Deduplicated list of skill names resolved for the builder role. */
  readonly injectedSkills: readonly SkillName[]
  /** Repo-relative path to the written injection receipt JSON. */
  readonly injectionReceiptRef: string
}

export interface SkillResolverOptions {
  /**
   * Absolute path to the repository root. All file operations (matrix read,
   * receipt write) resolve relative to this path.
   * Defaults to process.cwd(). Tests pass a tmp directory.
   */
  readonly repoRoot?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MATRIX_REPO_PATH = 'plugins/foreman-line/skill-injection/skill-injection.yaml'

// ─── Resolution ───────────────────────────────────────────────────────────────

export function resolveSkills(
  input: SkillResolverInput,
  options: SkillResolverOptions = {},
): SkillResolverResult {
  const repoRoot = options.repoRoot ?? process.cwd()

  // 1. Load the matrix YAML
  let rawYaml: string
  try {
    rawYaml = readFileSync(join(repoRoot, MATRIX_REPO_PATH), 'utf8')
  } catch (err) {
    throw new SkillResolverError(
      'MATRIX_UNREADABLE',
      `Cannot read skill-injection matrix at ${MATRIX_REPO_PATH}: ${String(err)}`,
    )
  }

  // 2. Parse the YAML — parseSkillInjectionMatrixYaml throws YAMLParseError on malformed input
  let parsed: unknown
  try {
    parsed = parseSkillInjectionMatrixYaml(rawYaml)
  } catch (err) {
    throw new SkillResolverError(
      'MATRIX_INVALID',
      `Cannot parse skill-injection matrix YAML at ${MATRIX_REPO_PATH}: ${String(err)}`,
    )
  }

  // 3. Structural validation via ajv
  const validation = validateSkillInjectionMatrix(parsed)
  if (!validation.valid) {
    throw new SkillResolverError(
      'MATRIX_INVALID',
      `Skill-injection matrix is invalid: ${validation.errors.join('; ')}`,
    )
  }

  // 4. Cast to typed matrix; extract builder map
  const matrix = parsed as SkillInjectionMatrix
  const builderMap = matrix.builder

  // 5. Resolve skills — Surface-Glob Resolution Semantics
  const resolved = new Set<SkillName>()

  for (const [glob, skills] of Object.entries(builderMap)) {
    if (glob === '*') {
      // Universal rule: always fires regardless of surfaces
      for (const skill of skills) {
        resolved.add(skill)
      }
    } else {
      // Prefix/* rule: prefix = glob without trailing '/*'
      const prefix = glob.slice(0, -2)
      // Fire if any surface exactly equals the prefix or is a child path (segment boundary)
      let matched = false
      for (const surface of input.surfaces) {
        if (surface === prefix || surface.startsWith(`${prefix}/`)) {
          matched = true
          break
        }
      }
      if (matched) {
        for (const skill of skills) {
          resolved.add(skill)
        }
      }
    }
  }

  // 6. Write injection receipt
  const receiptDir = join(repoRoot, 'docs', 'receipts', input.workflowId)
  const injectedSkills = Array.from(resolved)
  const receipt = {
    workflowId: input.workflowId,
    role: 'builder',
    surfaces: Array.from(input.surfaces),
    injectedSkills,
    matrixRef: MATRIX_REPO_PATH,
    timestamp: new Date().toISOString(),
  }
  try {
    mkdirSync(receiptDir, { recursive: true })
    writeFileSync(join(receiptDir, 'skill-injection.json'), JSON.stringify(receipt, null, 2))
  } catch (err) {
    throw new SkillResolverError(
      'RECEIPT_WRITE_FAILED',
      `Cannot write injection receipt to ${receiptDir}: ${String(err)}`,
    )
  }

  return {
    injectedSkills,
    injectionReceiptRef: `docs/receipts/${input.workflowId}/skill-injection.json`,
  }
}
