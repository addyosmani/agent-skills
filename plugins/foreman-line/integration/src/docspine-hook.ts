/**
 * DocSpine CI hook (W4-P2). Pure function: accepts a `DocSpineRunVerifyFn`
 * seam, calls it with the repo root and an opaque registry, processes the
 * resulting `DocSpineAuditReport`, and returns GitHub annotation strings plus
 * `exitCode: 0`. Report-only / non-blocking invariant: the hook NEVER throws
 * and ALWAYS returns exitCode 0, even when DocSpine reports broken claims.
 *
 * All types are local mirrors of DocSpine's output contracts — no direct
 * import from DocSpine. The live seam is wired in `docspine-report.ts`.
 */
import { execFileSync } from 'node:child_process'

// ─── Annotation field sanitizer ───────────────────────────────────────────────

function sanitize(s: string): string {
  return s.replace(/\r?\n/g, ' ')
}

// ─── Local-mirror types (structural mirrors of DocSpine's output contracts) ──

export interface DocSpineClaimFinding {
  claim: { docId: string; line: number; kind: string; value: string }
  status: 'ok' | 'broken' | 'moved' | 'unverifiable'
  detail?: string
  movedTo?: string
}

export interface DocSpineDocFinding {
  docId: string
  claimFindings: DocSpineClaimFinding[]
}

export interface DocSpineAuditReport {
  generatedAtSha: string
  toolVersion: string
  analysisDepth: string
  docFindings: DocSpineDocFinding[]
  gaps: Array<{ target: string }>
  contradictions: Array<{ docIds: [string, string] }>
}

export type DocSpineRunVerifyFn = (
  repoRoot: string,
  registry: unknown,
) => Promise<DocSpineAuditReport>

export interface DocSpineHookSeams {
  readonly runVerifyFn: DocSpineRunVerifyFn
  readonly getRepoRoot?: () => string
}

export interface DocSpineHookResult {
  readonly annotations: readonly string[]
  readonly exitCode: 0
}

// ─── Default repo-root seam ───────────────────────────────────────────────────

function realGetRepoRoot(): string {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    encoding: 'utf8',
  }).trim()
}

// ─── Annotation builders ──────────────────────────────────────────────────────

function buildSummaryAnnotation(
  report: DocSpineAuditReport,
  brokenDocs: number,
  brokenClaims: number,
  unverifiableClaims: number,
): string {
  const totalDocs = report.docFindings.length
  const totalGaps = report.gaps.length
  const totalContradictions = report.contradictions.length
  const analysisDepth = sanitize(report.analysisDepth)
  const generatedAtSha = sanitize(report.generatedAtSha)
  return (
    `::notice::docspine-hook: totalDocs=${totalDocs} brokenDocs=${brokenDocs}` +
    ` brokenClaims=${brokenClaims} unverifiableClaims=${unverifiableClaims}` +
    ` totalGaps=${totalGaps} totalContradictions=${totalContradictions}` +
    ` analysisDepth=${analysisDepth} sha=${generatedAtSha}`
  )
}

function buildClaimAnnotation(docId: string, finding: DocSpineClaimFinding): string {
  const { line, kind, value } = finding.claim
  const { status, detail } = finding
  const level = status === 'unverifiable' ? '::notice::' : '::warning::'
  const detailPart = detail !== undefined ? ` detail=${sanitize(detail)}` : ''
  return (
    `${level}docspine-hook [${sanitize(docId)}:${line}]` +
    ` kind=${sanitize(kind)} value=${sanitize(value)} status=${sanitize(status)}${detailPart}`
  )
}

// ─── Main hook ────────────────────────────────────────────────────────────────

/**
 * Run the DocSpine CI hook via the injected `runVerifyFn` seam.
 *
 * Returns annotation strings (GitHub Actions format) and `exitCode: 0`.
 * Never throws. Always exits 0 — report-only / non-blocking invariant.
 */
export async function runDocSpineHook(seams: DocSpineHookSeams): Promise<DocSpineHookResult> {
  const getRepoRoot = seams.getRepoRoot ?? realGetRepoRoot

  try {
    const repoRoot = getRepoRoot()
    const report = await seams.runVerifyFn(repoRoot, undefined)

    let brokenDocs = 0
    let brokenClaims = 0
    let unverifiableClaims = 0
    const claimAnnotations: string[] = []

    for (const docFinding of report.docFindings) {
      let docHasBroken = false
      for (const claimFinding of docFinding.claimFindings) {
        if (claimFinding.status === 'broken' || claimFinding.status === 'moved') {
          brokenClaims++
          docHasBroken = true
          claimAnnotations.push(buildClaimAnnotation(docFinding.docId, claimFinding))
        } else if (claimFinding.status === 'unverifiable') {
          unverifiableClaims++
          claimAnnotations.push(buildClaimAnnotation(docFinding.docId, claimFinding))
        }
        // 'ok' status → silent (AC5)
      }
      if (docHasBroken) brokenDocs++
    }

    const summary = buildSummaryAnnotation(report, brokenDocs, brokenClaims, unverifiableClaims)
    const annotations: string[] = [summary, ...claimAnnotations]

    // Gaps annotation (only when gaps.length > 0) — AC10
    if (report.gaps.length > 0) {
      annotations.push(
        `::notice::docspine-hook: ${report.gaps.length} coverage gaps found (details in report artifact)`,
      )
    }

    // Contradictions annotation (only when contradictions.length > 0) — AC11
    if (report.contradictions.length > 0) {
      annotations.push(
        `::notice::docspine-hook: ${report.contradictions.length} contradiction candidates found (advisory — human review)`,
      )
    }

    return { annotations, exitCode: 0 }
  } catch (err) {
    return {
      annotations: [`::warning::docspine-hook: skipped — runVerify threw: ${String(err)}`],
      exitCode: 0,
    }
  }
}
