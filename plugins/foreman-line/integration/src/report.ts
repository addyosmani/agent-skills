/**
 * Report-only audit-trigger entrypoint (W4-P3, RW4). `npm run report` →
 * `tsx src/report.ts`. Resolves changed paths (injected seam; default = git
 * diff name-only vs. the PR base, base ref from `BASE_SHA` in CI), loads the
 * active specs (injected seam), computes the `AuditTriggerDecision`, and prints
 * GitHub annotations surfacing `decision` / `triggered` / `drift`.
 *
 * REPORT-ONLY / NON-BLOCKING (charter D2/D8, PR4-7): the core ALWAYS returns
 * `exitCode: 0` and the runner ALWAYS `process.exit(0)`. The drift-*block* is
 * proven at the decision/harness level (deterministic tests over the rich
 * decision — ACs 4–5), never via this exit code. Promotion to a required check
 * is a later human step (D8). Nothing here mints a `correlationId`.
 */
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import type { AuditTriggerDecision } from './audit-trigger.js'
import {
  type ActiveSpecDescriptor,
  evaluateChangeSet,
  loadActiveSpecsLive,
} from './governing-spec.js'

/** Injected seams — defaults touch real git/disk and are never used in tests. */
export interface ReportSeams {
  readonly getChangedPaths?: () => readonly string[]
  readonly loadActiveSpecs?: () => readonly ActiveSpecDescriptor[]
}

export interface ReportResult {
  /** Null when input resolution failed (live git/disk) — see annotations. */
  readonly decision: AuditTriggerDecision | null
  readonly annotations: readonly string[]
  /** Report-only: ALWAYS 0. */
  readonly exitCode: 0
}

/** Default changed-paths seam: `git diff --name-only <base>...HEAD`. */
function realGetChangedPaths(): readonly string[] {
  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim()
  const baseSha = process.env.BASE_SHA
  const range = baseSha !== undefined && baseSha.trim().length > 0 ? `${baseSha}...HEAD` : 'HEAD~1'
  const out = execFileSync('git', ['diff', '--name-only', range], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  return out
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** Default active-spec seam: real disk read from the git repo root. */
function realLoadActiveSpecs(): readonly ActiveSpecDescriptor[] {
  const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim()
  return loadActiveSpecsLive(repoRoot)
}

/**
 * Pure report core: computes the decision from the (injected or real) seams
 * and returns the annotation lines plus `exitCode: 0`. No process exit, no
 * printing — the runner does that. Fully testable with fixture seams.
 */
export function runReport(seams: ReportSeams = {}): ReportResult {
  const getChangedPaths = seams.getChangedPaths ?? realGetChangedPaths
  const loadActiveSpecs = seams.loadActiveSpecs ?? realLoadActiveSpecs

  // Typed try-catch (lesson #22): a live input failure — bad BASE_SHA, shallow
  // clone, single-commit branch, unreadable specs — must NOT break the
  // report-only / non-blocking contract. Surface a warning and still exit 0.
  try {
    const changedPaths = getChangedPaths()
    const activeSpecs = loadActiveSpecs()
    const decision = evaluateChangeSet(changedPaths, activeSpecs)

    const summaryLevel = decision.triggered || decision.drift ? '::warning::' : '::notice::'
    const annotations: string[] = [
      `${summaryLevel}audit-trigger: decision=${decision.decision} triggered=${decision.triggered} drift=${decision.drift} declared=${decision.declaredRisk} derived=${decision.derivedRisk}`,
      `::notice::audit-trigger: governingSpec=${decision.governingSpec ?? 'none'} changedPaths=${changedPaths.length}`,
    ]
    for (const reason of decision.reasons) {
      const level = reason.startsWith('spec-drift') ? '::warning::' : '::notice::'
      annotations.push(`${level}audit-trigger reason: ${reason}`)
    }

    return { decision, annotations, exitCode: 0 }
  } catch (err) {
    return {
      decision: null,
      annotations: [
        `::warning::audit-trigger: report skipped — input resolution failed (report-only, non-blocking): ${String(err)}`,
      ],
      exitCode: 0,
    }
  }
}

/** True when this module is executed directly (not imported by a test). */
function invokedDirectly(): boolean {
  const entry = process.argv[1]
  return entry !== undefined && import.meta.url === pathToFileURL(entry).href
}

if (invokedDirectly()) {
  const result = runReport()
  for (const annotation of result.annotations) {
    console.log(annotation)
  }
  process.exit(result.exitCode)
}
