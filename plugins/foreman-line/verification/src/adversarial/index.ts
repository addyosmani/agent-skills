/**
 * Adversarial Reviewer dispatch-and-collect (W3-P2) — Stage D.2 mechanics
 * (charter D3 as re-ratified 2026-07-24; plan-review ruling F3).
 *
 * Three concerns, all in-process:
 *   DISPATCH — generateReviewKickstarter / dispatchReview: kickstarter
 *              generation (zero coordinator triage context), reviewer-worktree
 *              creation on the EXISTING parcel branch (git worktree add, no
 *              -b — ratified amendment, RA-1) with the `reviewer-readonly`
 *              settings projected via the frozen emitter's resolveProfile +
 *              projectEnvelope, and a review-dispatch Stage-D sub-receipt.
 *   LAUNCH   — buildReviewerLaunchCommand / launchReviewer / emitStopReport:
 *              the headless full-session CLI launch command (cwd = the emitted
 *              worktree, which is the mechanism binding the envelope at
 *              session start — proven by PROBE-HEADLESS.md), an injectable
 *              spawn seam, and the contingency-rung-2 stop-report emitter.
 *   COLLECT  — parseAdversarialFindings / collectAdversarialFindings: a typed
 *              parser validating reviewer output against the frozen
 *              AdversarialFinding shape, with malformed output quarantined and
 *              a named parse-failure receipt emitted — never a crash, never
 *              silent acceptance.
 *
 * The review judgment is produced entirely inside the independent reviewer
 * session (charter D4). This module never grades code, never triages
 * findings, and never assembles the VerificationVerdict (W3-P3).
 *
 * Lessons discipline:
 *   #18 — worktree creation + settings projection run FIRST in
 *         dispatchReview; no kickstarter or receipt write precedes them.
 *   #19 — every scan over reviewer output (untrusted, potentially huge) is
 *         linear-time: indexOf / startsWith / char-code loops, no regex.
 *   #22 — every external call is wrapped in a typed try-catch rethrowing
 *         AdversarialError; no foreign exception escapes the public API.
 *
 * Static guarantees inherited from W3-P1's scaffold tests (grep over src/):
 * this module imports no process-spawning primitive — launchReviewer starts
 * the reviewer ONLY through an injected spawn function (the caller supplies
 * the real spawner; the deterministic suite supplies a stub).
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Ajv } from 'ajv'
import type { JsonValue } from '../../../approval/src/index.js'
import type {
  CorrelationContext,
  CorrelationId,
  RunId,
  SessionId,
  StageId,
  WorkflowId,
} from '../../../contracts/src/index.js'
import { STAGE_IDS, UUID_PATTERN } from '../../../contracts/src/index.js'
import type {
  AdversarialFinding,
  FindingSeverity,
} from '../../../contracts/src/stages/d-verification.js'
import { verificationVerdictSchema } from '../../../contracts/src/stages/d-verification.js'
import {
  branchForParcel,
  projectEnvelope,
  resolveProfile,
  SHIPPED_REGISTRY_PATH,
} from '../../../permission-profiles/src/emitter.js'
import type { SkillInjectionMatrix } from '../../../skill-injection/src/index.js'
import {
  parseSkillInjectionMatrixYaml,
  validateSkillInjectionMatrix,
} from '../../../skill-injection/src/index.js'
import { AC_CONVENTION_PATH, VerificationError, writeClaimReceipt } from '../harness/index.js'

// ─── Error class (this sub-module's own; W3-P1's VerificationError untouched) ─

export type AdversarialErrorCode =
  | 'WORKFLOW_ID_INVALID'
  | 'INPUT_INVALID'
  | 'MATRIX_UNREADABLE'
  | 'MATRIX_INVALID'
  | 'SPEC_UNREADABLE'
  | 'BRANCH_MISSING'
  | 'WORKTREE_PATH_EXISTS'
  | 'WORKTREE_DISPATCH_FAILED'
  | 'PROFILE_RESOLVE_FAILED'
  | 'SETTINGS_EXISTS'
  | 'SETTINGS_WRITE_FAILED'
  | 'KICKSTARTER_WRITE_FAILED'
  | 'LAUNCH_FAILED'
  | 'PARSE_FAILED'
  | 'QUARANTINE_WRITE_FAILED'
  | 'RECEIPT_WRITE_FAILED'
  | 'RECEIPT_EXISTS'
  | 'SEQUENCE_READ_FAILED'

export class AdversarialError extends Error {
  readonly code: AdversarialErrorCode

  constructor(code: AdversarialErrorCode, message: string) {
    super(message)
    this.name = 'AdversarialError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

/**
 * Input to kickstarter generation and review dispatch. Deliberately has NO
 * field for harness results, coordinator triage, or prior findings — the
 * zero-coordinator-context invariant (charter D4; ruling F8) is enforced at
 * the type level: nothing triage-shaped is representable here.
 */
export interface ReviewDispatchInput {
  /** Receipt-dir UUID (matches UUID_PATTERN). */
  readonly workflowId: string
  /** The target parcel's ticket key / parcel ref. */
  readonly parcelRef: string
  /** Repo-relative path of the target parcel spec (active/). */
  readonly specPath: string
  /** Built surfaces the adversarial_reviewer matrix resolves against. */
  readonly surfaces: readonly string[]
  /** Filesystem path the reviewer worktree will be created at. */
  readonly worktreePath: string
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

/** Result of one git-seam invocation (child-process-shaped result). */
export interface GitResult {
  readonly status: number
  readonly stdout: string
  readonly stderr: string
}

/**
 * Injectable synchronous git seam. The package ships no
 * process-spawning import (W3-P1 static scaffold guarantee), so the caller
 * injects the real git runner and the deterministic suite injects a stub;
 * `args` never includes the leading 'git'.
 */
export type GitFn = (args: readonly string[], options: { readonly cwd: string }) => GitResult

export interface ReviewDispatchDeps {
  /** Injectable git seam; absence is a typed WORKTREE_DISPATCH_FAILED. */
  readonly gitFn?: GitFn
  /** Injectable kickstarter-write seam (deterministic suite forces failures). */
  readonly writeKickstarterFn?: (path: string, contents: string) => void
}

export interface ReviewDispatchResult {
  readonly worktreePath: string
  readonly branch: string
  readonly kickstarterPath: string
  readonly injectedSkills: readonly string[]
  readonly receiptLocator: string
}

export interface ReviewerLaunchCommand {
  readonly command: 'claude'
  readonly args: readonly string[]
  readonly cwd: string
  /**
   * Minimal hygienic environment (RA-7 / AC-28): only the documented
   * pass-through variables from LAUNCH_ENV_PASSTHROUGH — never wholesale
   * process.env inheritance.
   */
  readonly env: Readonly<Record<string, string>>
}

/**
 * Minimal handle the injected spawn function returns (fire-and-return). When
 * the handle exposes `on`, launchReviewer registers an 'error' listener so an
 * async launch failure emits the rung-2 stop-report (AC-24, never silent).
 */
export interface SpawnedProcess {
  readonly pid?: number | undefined
  readonly on?: (event: 'error', listener: (err: unknown) => void) => void
}

/**
 * The spawn seam. The implementation MUST direct the child's stdout to
 * `options.stdoutPath` (e.g. stdio to an opened file descriptor) — that file
 * is the rawText provenance for collectAdversarialFindings, and file-backed
 * stdio avoids pipe backpressure on a chatty reviewer. `options.env` is the
 * command's hygienic env, passed verbatim.
 */
export type SpawnFn = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string
    readonly env: Readonly<Record<string, string>>
    readonly stdoutPath: string
  },
) => SpawnedProcess

export interface LaunchDeps {
  /**
   * The process spawner. REQUIRED at runtime: this package ships no default
   * spawner (W3-P1's static scaffold guarantee bans process-spawning imports
   * across src/), so the coordinator injects the real one and the
   * deterministic suite injects a stub. Absence is a typed LAUNCH_FAILED.
   */
  readonly spawnFn?: SpawnFn
  /**
   * File the reviewer's stdout is directed to (rawText provenance for
   * collect). REQUIRED: absence is a typed LAUNCH_FAILED.
   */
  readonly stdoutPath?: string
  /**
   * Workflow the rung-2 stop-report chains into on async launch failure.
   * REQUIRED (and UUID-validated): absence is a typed LAUNCH_FAILED — an
   * async failure with nowhere to report would be a silent downgrade.
   */
  readonly workflowId?: string
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

export interface LaunchResult {
  readonly pid: number | null
  readonly command: ReviewerLaunchCommand
  /** Where the reviewer's stdout lands — the rawText source for collect. */
  readonly stdoutPath: string
}

export interface CollectDeps {
  readonly repoRoot?: string
  /**
   * Failure-injection seam wrapping every Stage-D receipt write in collect
   * (AC-26). Default: `(write) => write()`. On a parse-failure receipt-write
   * failure the paired quarantine file is cleaned up so a retry needs no
   * human deletion.
   */
  readonly writeReceiptFn?: (write: () => string) => string
}

export type CollectResult =
  | {
      readonly ok: true
      readonly findings: readonly AdversarialFinding[]
      readonly receiptLocator: string
    }
  | {
      readonly ok: false
      readonly reason: string
      readonly quarantinePath: string
      readonly receiptLocator: string
    }

// ─── Constants ────────────────────────────────────────────────────────────────

const MATRIX_REPO_PATH = 'plugins/foreman-line/skill-injection/skill-injection.yaml'
const REVIEWER_PROFILE = 'reviewer-readonly'
const KICKSTARTER_FILENAME = 'ADVERSARIAL-REVIEW-KICKSTARTER.md'
const FINDINGS_FENCE_OPEN = '```adversarial-findings'
const FENCE_CLOSE = '```'
const STOP_REPORT_FALLBACK = 'kickstarter+human-relay'

/**
 * Permission-bypass markers that must be unrepresentable in the launch
 * command (they void the envelope — permission-profiles README / PROBE.md).
 */
const BYPASS_MARKERS = ['--dangerously-skip-permissions', 'bypassPermissions'] as const

/**
 * Minimal tool grant for the headless reviewer (launch-command faithfulness,
 * AC-23 / PROBE-HEADLESS.md re-probe): a flagless headless CLI launch
 * session default-denies Bash/PowerShell, leaving the reviewer unable to run
 * its licensed probing (test suites, tsc, read-only git queries) —
 * functionally inert. `Bash,PowerShell` is the minimal grant that restores
 * the license; the reviewer-readonly envelope's deny rules still override it
 * (deny-over-allow proven in PROBE-HEADLESS.md). Write/Edit are deliberately
 * NOT granted.
 */
const ALLOWED_TOOLS = 'Bash,PowerShell'

/**
 * Hygienic env pass-through whitelist (RA-7 / AC-28) — each variable's
 * reason, on Windows and POSIX:
 *   PATH                      — resolve the `claude` binary and node/git.
 *   HOME, USERPROFILE         — Claude Code config + credential discovery
 *                               (~/.claude).
 *   APPDATA, LOCALAPPDATA     — Windows-side Claude Code/npm config caches.
 *   TEMP, TMP, TMPDIR         — temp-dir resolution for the child process.
 *   SYSTEMROOT, COMSPEC       — Windows process/shell bootstrap (cmd shims).
 * Everything else — coordinator session tokens, CI secrets, proxy overrides,
 * CLAUDE_* knobs of the parent — is deliberately NOT inherited.
 */
const LAUNCH_ENV_PASSTHROUGH = [
  'PATH',
  'HOME',
  'USERPROFILE',
  'APPDATA',
  'LOCALAPPDATA',
  'TEMP',
  'TMP',
  'TMPDIR',
  'SYSTEMROOT',
  'COMSPEC',
] as const

const FINDING_SEVERITIES: readonly FindingSeverity[] = ['info', 'low', 'medium', 'high', 'critical']

// The frozen element shape: the adversarialFindings.items sub-schema of
// contracts/schemas/verification-verdict.schema.json (via its typed source).
const verdictProperties = verificationVerdictSchema.properties as Record<
  string,
  { items: Record<string, unknown> }
>
const adversarialFindingItemsSchema = (
  verdictProperties.adversarialFindings as { items: Record<string, unknown> }
).items

const ajv = new Ajv()
const validateFindingItem = ajv.compile(adversarialFindingItemsSchema)

// ─── Linear-time character helpers (lesson #19) ──────────────────────────────

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
}

function isSlugCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45
}

function isHexCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 102) || (code >= 65 && code <= 70)
}

const UUID_GROUP_LENGTHS = [8, 4, 4, 4, 12] as const

/** Linear-time equivalent of the frozen UUID_PATTERN (char-code loop). */
function matchesUuidPattern(value: string): boolean {
  if (value.length !== 36) return false
  let i = 0
  for (let group = 0; group < UUID_GROUP_LENGTHS.length; group++) {
    if (group > 0) {
      if (value.charCodeAt(i) !== 45 /* '-' */) return false
      i += 1
    }
    const groupLength = UUID_GROUP_LENGTHS[group] as number
    for (let k = 0; k < groupLength; k++) {
      if (!isHexCode(value.charCodeAt(i))) return false
      i += 1
    }
  }
  return true
}

/**
 * Guard: workflowId is joined into docs/receipts/<workflowId>/, so every
 * entry point validates it against the frozen UUID_PATTERN before any
 * filesystem access (same fail-loud rule as the harness).
 */
function assertValidWorkflowId(workflowId: string): void {
  if (!matchesUuidPattern(workflowId)) {
    throw new AdversarialError(
      'WORKFLOW_ID_INVALID',
      `workflowId must match UUID_PATTERN (${UUID_PATTERN}) before any filesystem access, got ${JSON.stringify(workflowId)}`,
    )
  }
}

// ─── Dispatch-input shape validation (RA-4 / AC-25; lesson #19 char loops) ───

function isUpperAlnumCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90)
}

/** parcelRef slug: [A-Z0-9]+(-[A-Z0-9]+)*, length 2..64 (e.g. W3-P2). */
function isParcelRefSlug(value: string): boolean {
  if (value.length < 2 || value.length > 64) return false
  let previousWasDash = true // a leading dash is invalid
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code === 45 /* '-' */) {
      if (previousWasDash) return false
      previousWasDash = true
    } else if (isUpperAlnumCode(code)) {
      previousWasDash = false
    } else {
      return false
    }
  }
  return !previousWasDash
}

/**
 * Repo-relative path token: '/'-separated segments of [A-Za-z0-9._-], no
 * empty segment, no '.'/'..' segment, no leading '/', length 1..512. Rejects
 * whitespace, backticks, and anything prose-shaped before it can be
 * interpolated into the kickstarter.
 */
function isRepoRelativePath(value: string): boolean {
  if (value.length === 0 || value.length > 512) return false
  let segmentStart = 0
  for (let i = 0; i <= value.length; i++) {
    const atEnd = i === value.length
    if (atEnd || value.charCodeAt(i) === 47 /* '/' */) {
      const segment = value.slice(segmentStart, i)
      if (segment.length === 0 || segment === '.' || segment === '..') return false
      segmentStart = i + 1
      continue
    }
    const code = value.charCodeAt(i)
    const ok =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 45 /* '-' */ ||
      code === 46 /* '.' */ ||
      code === 95 /* '_' */
    if (!ok) return false
  }
  return true
}

/**
 * Worktree path: absolute or relative filesystem path with no whitespace,
 * quotes, backticks, or control characters (prose cannot pass), no '..'
 * traversal segment, length 1..1024. Windows drive/backslash forms allowed.
 */
function isSaneWorktreePath(value: string): boolean {
  if (value.length === 0 || value.length > 1024) return false
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    const ok =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 45 /* '-' */ ||
      code === 46 /* '.' */ ||
      code === 95 /* '_' */ ||
      code === 47 /* '/' */ ||
      code === 92 /* '\\' */ ||
      code === 58 /* ':' */ ||
      code === 126 /* '~' */
    if (!ok) return false
  }
  // No '..' path segment in either separator convention.
  for (let i = 0; i + 1 < value.length; i++) {
    if (value.charCodeAt(i) === 46 && value.charCodeAt(i + 1) === 46) {
      const before = i === 0 ? 47 : value.charCodeAt(i - 1)
      const after = i + 2 >= value.length ? 47 : value.charCodeAt(i + 2)
      const beforeIsSep = before === 47 || before === 92
      const afterIsSep = after === 47 || after === 92
      if (beforeIsSep && afterIsSep) return false
    }
  }
  return true
}

function invalidInput(field: string, value: string, rule: string): AdversarialError {
  return new AdversarialError(
    'INPUT_INVALID',
    `ReviewDispatchInput.${field} fails its shape guard (${rule}) before any kickstarter interpolation: ${JSON.stringify(value)}`,
  )
}

/**
 * Shape-validates every field that gets interpolated into the generated
 * kickstarter (RA-4): triage prose smuggled through an input field is
 * rejected as INPUT_INVALID before it can reach the reviewer.
 */
function assertValidDispatchInput(input: ReviewDispatchInput): void {
  if (!isParcelRefSlug(input.parcelRef)) {
    throw invalidInput('parcelRef', input.parcelRef, 'slug [A-Z0-9]+(-[A-Z0-9]+)*')
  }
  if (!isRepoRelativePath(input.specPath)) {
    throw invalidInput('specPath', input.specPath, 'repo-relative path token')
  }
  for (const surface of input.surfaces) {
    if (!isRepoRelativePath(surface)) {
      throw invalidInput('surfaces[]', surface, 'repo-relative path token')
    }
  }
  if (!isSaneWorktreePath(input.worktreePath)) {
    throw invalidInput('worktreePath', input.worktreePath, 'filesystem path, no whitespace/prose')
  }
}

// ─── Chain-tip scan (correlation inheritance; validateChain AC5c) ────────────

function isConformingReceiptName(name: string): boolean {
  if (name.length < 15) return false
  for (let i = 0; i < 6; i++) {
    if (!isDigitCode(name.charCodeAt(i))) return false
  }
  if (name.charCodeAt(6) !== 45) return false
  const stage = name[7]
  if (stage === undefined || !STAGE_IDS.includes(stage as StageId)) return false
  if (name.charCodeAt(8) !== 45) return false
  if (!name.endsWith('.json')) return false
  const slugEnd = name.length - 5
  if (slugEnd <= 9) return false
  for (let i = 9; i < slugEnd; i++) {
    if (!isSlugCode(name.charCodeAt(i))) return false
  }
  return true
}

function parseSequencePrefix(name: string): number {
  let value = 0
  for (let i = 0; i < 6; i++) {
    value = value * 10 + (name.charCodeAt(i) - 48)
  }
  return value
}

interface ChainTip {
  readonly sequence: number
  readonly prevHash: string
  readonly tipDocument: Record<string, unknown>
}

function receiptsDir(workflowId: string, repoRoot: string): string {
  return join(repoRoot, 'docs', 'receipts', workflowId)
}

/**
 * Scans docs/receipts/<workflowId>/ for the highest-sequence conforming
 * receipt. Only conforming `*.json` filenames in the workflow dir itself are
 * considered — files under quarantine/ never perturb sequence allocation.
 * Stage-D sub-receipts must chain FROM something, so an empty chain is a
 * typed failure here (the Stage-C dispatch receipt always precedes Stage D).
 */
function readChainTip(workflowId: string, repoRoot: string): ChainTip {
  const dir = receiptsDir(workflowId, repoRoot)
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch (err) {
    throw new AdversarialError(
      'SEQUENCE_READ_FAILED',
      `Cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }
  let highestName: string | null = null
  let highestSequence = -1
  for (const name of names) {
    if (!isConformingReceiptName(name)) continue
    const sequence = parseSequencePrefix(name)
    if (sequence > highestSequence) {
      highestSequence = sequence
      highestName = name
    }
  }
  if (highestName === null) {
    throw new AdversarialError(
      'SEQUENCE_READ_FAILED',
      `No prior receipt exists for workflow '${workflowId}'; Stage-D sub-receipts must chain from an existing receipt`,
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(join(dir, highestName), 'utf8'))
  } catch (err) {
    throw new AdversarialError(
      'SEQUENCE_READ_FAILED',
      `Cannot read highest-sequence receipt '${highestName}' in '${dir}': ${String(err)}`,
    )
  }
  const tipDocument = parsed as Record<string, unknown>
  const hash = tipDocument.hash
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new AdversarialError(
      'SEQUENCE_READ_FAILED',
      `Highest-sequence receipt '${highestName}' in '${dir}' has no string 'hash' field`,
    )
  }
  return { sequence: highestSequence + 1, prevHash: hash, tipDocument }
}

function inheritCorrelation(tip: ChainTip, workflowId: string): CorrelationContext {
  const correlation = tip.tipDocument.correlation
  if (typeof correlation !== 'object' || correlation === null || Array.isArray(correlation)) {
    throw new AdversarialError(
      'SEQUENCE_READ_FAILED',
      `Chain-tip receipt for workflow '${workflowId}' has no 'correlation' object`,
    )
  }
  const { workflowId: tipWorkflowId, correlationId } = correlation as Record<string, unknown>
  if (typeof tipWorkflowId !== 'string' || typeof correlationId !== 'string') {
    throw new AdversarialError(
      'SEQUENCE_READ_FAILED',
      `Chain-tip receipt for workflow '${workflowId}' correlation is missing string workflowId/correlationId`,
    )
  }
  // Inherited from the chain tip (fresh sessionId/runId only) — never
  // generateCorrelationContext, which would fork the chain (AC5c hazard).
  return {
    correlationId: correlationId as CorrelationId,
    sessionId: randomUUID() as SessionId,
    workflowId: tipWorkflowId as WorkflowId,
    runId: randomUUID() as RunId,
  }
}

/**
 * Composes the shipped allocation/receipt machinery (harness writeClaimReceipt
 * = allocateSequence-compatible exclusive write + validateReceiptDocument +
 * approval's canonicalize/sha256Hex/writeReceiptDocument) behind this
 * module's own typed error surface.
 */
function emitStageDReceipt(args: {
  readonly workflowId: string
  readonly repoRoot: string
  readonly claimRef: string
  readonly subjectKind: string
  readonly subject: JsonValue
  readonly tip: ChainTip
}): string {
  try {
    return writeClaimReceipt({
      workflowId: args.workflowId,
      repoRoot: args.repoRoot,
      claimRef: args.claimRef,
      subjectKind: args.subjectKind,
      subject: args.subject,
      sequence: args.tip.sequence,
      prevHash: args.tip.prevHash,
      correlation: inheritCorrelation(args.tip, args.workflowId),
    })
  } catch (err) {
    if (err instanceof AdversarialError) throw err
    if (err instanceof VerificationError && err.code === 'RECEIPT_EXISTS') {
      throw new AdversarialError('RECEIPT_EXISTS', err.message)
    }
    throw new AdversarialError('RECEIPT_WRITE_FAILED', `Receipt write failed: ${String(err)}`)
  }
}

// ─── Matrix resolution (adversarial_reviewer section; W2-P5 glob rule) ───────

function loadMatrix(repoRoot: string): SkillInjectionMatrix {
  let rawYaml: string
  try {
    rawYaml = readFileSync(join(repoRoot, ...MATRIX_REPO_PATH.split('/')), 'utf8')
  } catch (err) {
    throw new AdversarialError(
      'MATRIX_UNREADABLE',
      `Cannot read skill-injection matrix at ${MATRIX_REPO_PATH}: ${String(err)}`,
    )
  }
  let parsed: unknown
  try {
    parsed = parseSkillInjectionMatrixYaml(rawYaml)
  } catch (err) {
    throw new AdversarialError(
      'MATRIX_INVALID',
      `Cannot parse skill-injection matrix YAML at ${MATRIX_REPO_PATH}: ${String(err)}`,
    )
  }
  const validation = validateSkillInjectionMatrix(parsed)
  if (!validation.valid) {
    throw new AdversarialError(
      'MATRIX_INVALID',
      `Skill-injection matrix is invalid: ${validation.errors.join('; ')}`,
    )
  }
  return parsed as SkillInjectionMatrix
}

/**
 * Path-segment glob rule (identical to W2-P5 / W3-P1): '*' always fires;
 * 'prefix/*' fires iff a surface === prefix or startsWith(prefix + '/').
 */
function resolveReviewSkills(matrix: SkillInjectionMatrix, surfaces: readonly string[]): string[] {
  const resolved: string[] = []
  const seen = new Set<string>()
  for (const [glob, skills] of Object.entries(matrix.adversarial_reviewer)) {
    let fires = false
    if (glob === '*') {
      fires = true
    } else {
      const prefix = glob.slice(0, -2)
      for (const surface of surfaces) {
        if (surface === prefix || surface.startsWith(`${prefix}/`)) {
          fires = true
          break
        }
      }
    }
    if (!fires) continue
    for (const skill of skills) {
      if (!seen.has(skill)) {
        seen.add(skill)
        resolved.push(skill)
      }
    }
  }
  return resolved
}

// ─── generateReviewKickstarter ────────────────────────────────────────────────

/**
 * Renders the adversarial-review kickstarter (shape modeled on
 * docs/kickstarters/adversarial-review-SCAF-P1.md). Read-only with respect to
 * the filesystem: it reads the skill-injection matrix (AC-8) and verifies the
 * target spec is readable (its PATH is embedded; its BODY never is), and
 * writes nothing.
 *
 * Zero coordinator context (charter D4 stop condition): the output carries
 * only the parcel spec reference, repo canon references, and worktree/branch/
 * output-contract mechanics. ReviewDispatchInput has no field that could
 * carry harness claims, triage notes, or prior findings.
 */
export function generateReviewKickstarter(input: ReviewDispatchInput): string {
  assertValidDispatchInput(input)
  const repoRoot = input.repoRoot ?? process.cwd()
  const matrix = loadMatrix(repoRoot)
  const injectedSkills = resolveReviewSkills(matrix, input.surfaces)
  try {
    // Readability check only — the body is deliberately NOT inlined (AC-7).
    readFileSync(join(repoRoot, ...input.specPath.split('/')), 'utf8')
  } catch (err) {
    throw new AdversarialError(
      'SPEC_UNREADABLE',
      `Cannot read target parcel spec at '${input.specPath}': ${String(err)}`,
    )
  }
  const branch = branchForParcel(input.parcelRef)
  const skillList = injectedSkills.join(', ')

  return `You are the adversarial reviewer for parcel ${input.parcelRef}. Fresh eyes, zero builder context, zero coordinator context. You review; you never fix, never commit, never checkout — your worktree is dispatched under the ${REVIEWER_PROFILE} permission profile and its envelope is the mechanism, not a courtesy.

Workspace (read-only): the worktree at ${input.worktreePath} on branch ${branch}.
The parcel spec (your review contract) is at ${input.specPath}.
The named-test acceptance-criteria convention is at ${AC_CONVENTION_PATH}.
Injected review skills for the built surfaces: ${skillList}.

Discipline:
- All commands in PowerShell (lesson #10). Capture command output in full before reading any exit code (lesson #11).
- Hostile probing at the live process boundary is licensed (lesson #12): you MAY run small one-off read-only scripts, the package test suites, tsc, and git queries; mutation is not licensed. Attack input classes the shipped fixtures never exercised; finding that a contract is silent on a hostile input is a finding — rank it honestly, and fix nothing.
- You do not triage, you do not fix, and you do not decide severity dispositions.

Findings output contract (MANDATORY — machine-parsed):
End your session output with exactly one fenced code block opened by the line
${FINDINGS_FENCE_OPEN}
and closed by the line
${FENCE_CLOSE}
containing a JSON array of finding objects (use [] when you have no findings). The fence lines are matched byte-strictly: each fence line must appear exactly as shown above, at column 0 — no leading indentation, no trailing whitespace, and no extra backticks or info-string text on either fence line, or your findings will not be collected. Each element must have exactly these properties and no others:
- "summary": non-empty string — what is wrong, specifically.
- "citation": non-empty string — the named standard or spec clause the finding is cited against (e.g. a spec AC, a lesson number, a convention section), plus file:line evidence.
- "severity": one of "info", "low", "medium", "high", "critical".
If your output contains more than one such fenced block, only the LAST one is collected. Malformed output is quarantined, not partially accepted — emit valid JSON or your review is not collected.
`
}

// ─── dispatchReview ───────────────────────────────────────────────────────────

/** Runs one git-seam call behind the typed WORKTREE_DISPATCH_FAILED boundary. */
function runGit(gitFn: GitFn, args: readonly string[], cwd: string): GitResult {
  try {
    return gitFn(args, { cwd })
  } catch (err) {
    throw new AdversarialError(
      'WORKTREE_DISPATCH_FAILED',
      `git seam threw for 'git ${args.join(' ')}': ${String(err)}`,
    )
  }
}

/**
 * Side-effectful dispatch onto an EXISTING parcel branch (ratified amendment
 * 2026-07-24, coordinator ruling on RA-1), ordered worktree-first (lesson
 * #18 discipline):
 *   1. Shape-validate inputs (INPUT_INVALID) and verify the existing branch
 *      (BRANCH_MISSING).
 *   2. No-clobber pre-flight: the path must not exist (WORKTREE_PATH_EXISTS).
 *   3. `git worktree add <path> <existing-branch>` — no -b (the branch
 *      already exists; the wholesale dispatchWorktree verb is for NEW builder
 *      branches and is not invoked here).
 *   4. Project the reviewer-readonly settings by composing the frozen
 *      emitter's resolveProfile + projectEnvelope (SETTINGS_EXISTS guard —
 *      never overwrite; worktree left in place for explicit cleanup).
 *   5. Write the generated kickstarter into the worktree.
 *   6. Emit the review-dispatch Stage-D sub-receipt.
 * Any failure in 1-4 aborts before any kickstarter or receipt write.
 */
export function dispatchReview(
  input: ReviewDispatchInput,
  deps: ReviewDispatchDeps = {},
): ReviewDispatchResult {
  assertValidWorkflowId(input.workflowId)
  assertValidDispatchInput(input)
  const repoRoot = input.repoRoot ?? process.cwd()

  // Pure-generation phase (reads only; fail-fast before any git mutation).
  const matrix = loadMatrix(repoRoot)
  const injectedSkills = resolveReviewSkills(matrix, input.surfaces)
  const kickstarter = generateReviewKickstarter(input)
  const branch = branchForParcel(input.parcelRef)

  const gitFn = deps.gitFn
  if (gitFn === undefined) {
    throw new AdversarialError(
      'WORKTREE_DISPATCH_FAILED',
      'No gitFn injected: this package ships no process spawner (W3-P1 static scaffold guarantee); the caller must inject a git runner',
    )
  }

  // 1. The target parcel branch must already exist (read-only pre-flight).
  const verify = runGit(
    gitFn,
    ['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`],
    repoRoot,
  )
  if (verify.status !== 0) {
    throw new AdversarialError(
      'BRANCH_MISSING',
      `Target parcel branch '${branch}' does not exist; dispatchReview targets an EXISTING parcel branch (ratified amendment): ${verify.stderr.trim()}`,
    )
  }

  // 2. No-clobber pre-flight (same guard as the emitter's step 3).
  if (existsSync(input.worktreePath)) {
    throw new AdversarialError(
      'WORKTREE_PATH_EXISTS',
      `worktreePath '${input.worktreePath}' already exists; dispatchReview creates a new reviewer worktree and will not clobber an existing path`,
    )
  }

  // 3. The sole git mutation: worktree add on the existing branch (no -b).
  const added = runGit(gitFn, ['worktree', 'add', input.worktreePath, branch], repoRoot)
  if (added.status !== 0) {
    throw new AdversarialError(
      'WORKTREE_DISPATCH_FAILED',
      `'git worktree add ${input.worktreePath} ${branch}' exited ${added.status}: ${added.stderr.trim()}`,
    )
  }

  // 4. Project the reviewer-readonly settings (frozen emitter composition;
  //    never hand-rolled). Never overwrite an existing settings.local.json —
  //    same refusal as the emitter; the worktree stays for explicit cleanup.
  const settingsPath = join(input.worktreePath, '.claude', 'settings.local.json')
  if (existsSync(settingsPath)) {
    throw new AdversarialError(
      'SETTINGS_EXISTS',
      `'${settingsPath}' already exists; refusing to overwrite. The worktree at '${input.worktreePath}' was created and left in place for explicit cleanup.`,
    )
  }
  const resolved = resolveProfile(REVIEWER_PROFILE, SHIPPED_REGISTRY_PATH)
  if (resolved.profile === undefined) {
    throw new AdversarialError(
      'PROFILE_RESOLVE_FAILED',
      `resolveProfile('${REVIEWER_PROFILE}') failed against the shipped registry: ${resolved.errors.join('; ')}`,
    )
  }
  const settings = projectEnvelope(resolved.profile.envelope)
  try {
    mkdirSync(dirname(settingsPath), { recursive: true })
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8')
  } catch (err) {
    throw new AdversarialError(
      'SETTINGS_WRITE_FAILED',
      `Cannot write projected settings at '${settingsPath}': ${String(err)}. The worktree at '${input.worktreePath}' was created and left in place for explicit cleanup.`,
    )
  }

  // 5. Kickstarter into the worktree.
  const kickstarterPath = join(input.worktreePath, KICKSTARTER_FILENAME)
  const writeKickstarterFn =
    deps.writeKickstarterFn ??
    ((path: string, contents: string): void => {
      writeFileSync(path, contents, 'utf8')
    })
  try {
    writeKickstarterFn(kickstarterPath, kickstarter)
  } catch (err) {
    throw new AdversarialError(
      'KICKSTARTER_WRITE_FAILED',
      `Cannot write kickstarter at '${kickstarterPath}': ${String(err)}`,
    )
  }

  // 6. Review-dispatch Stage-D sub-receipt.
  const tip = readChainTip(input.workflowId, repoRoot)
  const receiptLocator = emitStageDReceipt({
    workflowId: input.workflowId,
    repoRoot,
    claimRef: 'review-dispatch',
    subjectKind: 'ReviewDispatch',
    subject: {
      parcelRef: input.parcelRef,
      worktreePath: input.worktreePath,
      branch,
      kickstarterPath,
      profile: REVIEWER_PROFILE,
      injectedSkills,
    },
    tip,
  })

  return {
    worktreePath: input.worktreePath,
    branch,
    kickstarterPath,
    injectedSkills,
    receiptLocator,
  }
}

// ─── Launch (rung 1 — headless full-session CLI; PROBE-HEADLESS.md) ──────────

function assertNoBypassMarker(value: string, where: string): void {
  for (const marker of BYPASS_MARKERS) {
    if (value.includes(marker)) {
      throw new AdversarialError(
        'LAUNCH_FAILED',
        `${where} contains the permission-bypass marker '${marker}', which voids the ${REVIEWER_PROFILE} envelope (PROBE.md: void under bypass mode)`,
      )
    }
  }
}

/**
 * Builds the minimal hygienic launch env (RA-7 / AC-28): only the documented
 * LAUNCH_ENV_PASSTHROUGH variables that are actually set — never wholesale
 * process.env inheritance.
 */
function buildLaunchEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const name of LAUNCH_ENV_PASSTHROUGH) {
    const value = process.env[name]
    if (value !== undefined) {
      env[name] = value
    }
  }
  return env
}

/**
 * Pure with respect to the filesystem. The cwd IS the mechanism by which the
 * emitted settings.local.json binds at session start (PROBE-HEADLESS.md).
 * Bypass flags are unrepresentable: args are built from constants plus a
 * prompt string, and every component is asserted free of bypass markers.
 *
 * Launch-command faithfulness (AC-23): the args emitted here —
 * `-p <prompt> --allowedTools Bash,PowerShell` — are exactly the flags the
 * PROBE-HEADLESS.md re-probe ran; changing them requires re-probing.
 */
export function buildReviewerLaunchCommand(
  worktreePath: string,
  kickstarterPath: string,
): ReviewerLaunchCommand {
  assertNoBypassMarker(worktreePath, 'worktreePath')
  assertNoBypassMarker(kickstarterPath, 'kickstarterPath')
  const args = [
    '-p',
    `Read the kickstarter at ${kickstarterPath} and perform the adversarial review it defines, ending your output with the fenced adversarial-findings JSON block it mandates.`,
    '--allowedTools',
    ALLOWED_TOOLS,
  ]
  for (const arg of args) {
    assertNoBypassMarker(arg, 'launch argument')
  }
  return { command: 'claude', args, cwd: worktreePath, env: buildLaunchEnv() }
}

/**
 * Runtime arg whitelist (RA-6/RB-5): only the exact flag shape the builder
 * emits is launchable — `-p <prompt> --allowedTools <ALLOWED_TOOLS>`. Any
 * unknown flag, reordered shape, or foreign tool grant is a typed
 * LAUNCH_FAILED before any spawn.
 */
function assertWhitelistedLaunchArgs(args: readonly string[]): void {
  const shapeError = (detail: string): AdversarialError =>
    new AdversarialError(
      'LAUNCH_FAILED',
      `Launch args fail the whitelist (only the builder's flag shape is launchable): ${detail}`,
    )
  if (args.length !== 4) {
    throw shapeError(`expected 4 args, got ${args.length}`)
  }
  if (args[0] !== '-p') throw shapeError(`args[0] must be '-p', got ${JSON.stringify(args[0])}`)
  const prompt = args[1] as string
  if (prompt.length === 0 || prompt.startsWith('-')) {
    throw shapeError('args[1] must be a non-flag prompt string')
  }
  if (args[2] !== '--allowedTools') {
    throw shapeError(`args[2] must be '--allowedTools', got ${JSON.stringify(args[2])}`)
  }
  if (args[3] !== ALLOWED_TOOLS) {
    throw shapeError(
      `args[3] must be the minimal tool grant '${ALLOWED_TOOLS}', got ${JSON.stringify(args[3])}`,
    )
  }
  for (const arg of args) {
    assertNoBypassMarker(arg, 'launch argument')
  }
}

/**
 * Thin, side-effectful wrapper: starts the headless reviewer process ONLY
 * through the injected spawn function (fire-and-return; the coordinator owns
 * session lifecycle). Missing spawnFn/stdoutPath/workflowId are typed
 * failures, never an implicit in-package process spawn.
 *
 * Runtime guards (AC-27): the binary marker is asserted and args are
 * whitelisted. Async-error seam (AC-24): when the spawned handle exposes
 * `on`, an 'error' listener is registered that emits the rung-2
 * reviewer-launch-stop-report sub-receipt — an async launch failure is never
 * silent. Stdio (AC-24): the spawn seam receives stdoutPath and must direct
 * the reviewer's stdout there — that file is the rawText provenance for
 * collectAdversarialFindings.
 */
export function launchReviewer(cmd: ReviewerLaunchCommand, deps: LaunchDeps = {}): LaunchResult {
  if ((cmd.command as string) !== 'claude') {
    throw new AdversarialError(
      'LAUNCH_FAILED',
      `Command binary marker must be 'claude', got ${JSON.stringify(cmd.command)}`,
    )
  }
  assertNoBypassMarker(cmd.cwd, 'cwd')
  assertWhitelistedLaunchArgs(cmd.args)
  const spawnFn = deps.spawnFn
  if (spawnFn === undefined) {
    throw new AdversarialError(
      'LAUNCH_FAILED',
      'No spawnFn injected: this package ships no process spawner (W3-P1 static scaffold guarantee); the caller must inject one',
    )
  }
  const stdoutPath = deps.stdoutPath
  if (stdoutPath === undefined || stdoutPath.length === 0) {
    throw new AdversarialError(
      'LAUNCH_FAILED',
      'No stdoutPath provided: reviewer stdout must be directed to a file (the rawText provenance for collect)',
    )
  }
  const workflowId = deps.workflowId
  if (workflowId === undefined) {
    throw new AdversarialError(
      'LAUNCH_FAILED',
      'No workflowId provided: an async launch failure must be able to emit the rung-2 stop-report (never silent)',
    )
  }
  assertValidWorkflowId(workflowId)
  const repoRoot = deps.repoRoot ?? process.cwd()
  let child: SpawnedProcess
  try {
    child = spawnFn(cmd.command, cmd.args, { cwd: cmd.cwd, env: cmd.env, stdoutPath })
  } catch (err) {
    throw new AdversarialError(
      'LAUNCH_FAILED',
      `Reviewer launch failed (command '${cmd.command}', cwd '${cmd.cwd}'): ${String(err)}`,
    )
  }
  if (typeof child.on === 'function') {
    child.on('error', (err: unknown) => {
      // Rung-2 never-silent invariant (lessons #20/#21): the async failure is
      // recorded as a stop-report; if even that write fails, scream to stderr
      // rather than swallow it (an event listener cannot usefully throw).
      try {
        emitStopReport(workflowId, `async reviewer launch failure: ${String(err)}`, repoRoot)
      } catch (reportErr) {
        process.stderr.write(
          `reviewer-launch-stop-report emission failed after async launch error: ${String(reportErr)} (original: ${String(err)})\n`,
        )
      }
    })
  }
  return { pid: child.pid ?? null, command: cmd, stdoutPath }
}

/**
 * Contingency rung 2's never-silent half (lessons #20/#21): records that
 * headless launch is not viable and the kickstarter + human-relay fallback is
 * in effect, as a Stage-D sub-receipt. Returns the receipt locator.
 */
export function emitStopReport(
  workflowId: string,
  reason: string,
  repoRoot: string = process.cwd(),
): string {
  assertValidWorkflowId(workflowId)
  const tip = readChainTip(workflowId, repoRoot)
  return emitStageDReceipt({
    workflowId,
    repoRoot,
    claimRef: 'reviewer-launch-stop-report',
    subjectKind: 'ReviewerLaunchStopReport',
    subject: { reason, fallback: STOP_REPORT_FALLBACK },
    tip,
  })
}

// ─── parseAdversarialFindings (linear-time fence extraction, lesson #19) ─────

/**
 * Strips a single trailing '\r' (CRLF tolerance) without regex.
 */
function lineContent(text: string, start: number, end: number): string {
  let effectiveEnd = end
  if (effectiveEnd > start && text.charCodeAt(effectiveEnd - 1) === 13 /* '\r' */) {
    effectiveEnd -= 1
  }
  return text.slice(start, effectiveEnd)
}

/**
 * Scans the untrusted reviewer text line-by-line (indexOf walk — no regex)
 * for fenced adversarial-findings blocks. Last complete fence pair wins; an
 * open fence with no close after the last complete pair is an unterminated
 * fence and fails the parse.
 */
function extractLastFencePayload(rawText: string): string {
  const length = rawText.length
  let lineStart = 0
  let openPayloadStart: number | null = null
  let lastPayload: string | null = null
  while (lineStart <= length) {
    let lineEnd = rawText.indexOf('\n', lineStart)
    if (lineEnd === -1) lineEnd = length
    const line = lineContent(rawText, lineStart, lineEnd)
    if (openPayloadStart === null) {
      if (line === FINDINGS_FENCE_OPEN) {
        openPayloadStart = lineEnd + 1
      }
    } else if (line === FENCE_CLOSE) {
      lastPayload = rawText.slice(openPayloadStart, lineStart)
      openPayloadStart = null
    }
    if (lineEnd === length) break
    lineStart = lineEnd + 1
  }
  if (openPayloadStart !== null) {
    throw new AdversarialError(
      'PARSE_FAILED',
      `Reviewer output contains an unterminated ${FINDINGS_FENCE_OPEN} fence`,
    )
  }
  if (lastPayload === null) {
    throw new AdversarialError(
      'PARSE_FAILED',
      `Reviewer output contains no ${FINDINGS_FENCE_OPEN} fenced block`,
    )
  }
  return lastPayload
}

/**
 * Typed parser (exact signature per charter D3). Extracts the last fenced
 * adversarial-findings block, JSON-parses it, and validates EVERY element
 * against the frozen AdversarialFinding shape (the adversarialFindings.items
 * sub-schema: additionalProperties false; required summary/citation/severity;
 * severity in the frozen enum; summary/citation minLength 1). Any deviation
 * throws PARSE_FAILED — never a partial array, never silent acceptance.
 */
export function parseAdversarialFindings(rawText: string): AdversarialFinding[] {
  if (typeof rawText !== 'string') {
    throw new AdversarialError(
      'PARSE_FAILED',
      `parseAdversarialFindings requires a string; received ${typeof rawText}`,
    )
  }
  const payload = extractLastFencePayload(rawText)
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch (err) {
    throw new AdversarialError(
      'PARSE_FAILED',
      `Fenced adversarial-findings payload is not valid JSON: ${String(err)}`,
    )
  }
  if (!Array.isArray(parsed)) {
    throw new AdversarialError(
      'PARSE_FAILED',
      'Fenced adversarial-findings payload must be a JSON array',
    )
  }
  const findings: AdversarialFinding[] = []
  for (let i = 0; i < parsed.length; i++) {
    const element: unknown = parsed[i]
    if (!validateFindingItem(element)) {
      throw new AdversarialError(
        'PARSE_FAILED',
        `Finding at index ${i} fails the frozen AdversarialFinding shape: ${ajv.errorsText(validateFindingItem.errors)}`,
      )
    }
    const record = element as { summary: string; citation: string; severity: string }
    if (!FINDING_SEVERITIES.includes(record.severity as FindingSeverity)) {
      throw new AdversarialError(
        'PARSE_FAILED',
        `Finding at index ${i} has severity outside the frozen enum: ${JSON.stringify(record.severity)}`,
      )
    }
    // Rebuilt fresh (own properties only) so nothing beyond the frozen shape
    // — including hostile keys the schema rejected anyway — flows onward.
    findings.push({
      summary: record.summary,
      citation: record.citation,
      severity: record.severity as FindingSeverity,
    })
  }
  return findings
}

// ─── collectAdversarialFindings ───────────────────────────────────────────────

function padSequence(sequence: number): string {
  return String(sequence).padStart(6, '0')
}

/**
 * Collection orchestrator. On parse success: emits the adversarial-findings
 * Stage-D sub-receipt (subject = the findings array) and returns them. On
 * parse failure: quarantines the raw text at
 * docs/receipts/<workflowId>/quarantine/<seq6>-adversarial-raw.txt (exclusive
 * write; <seq6> = the paired parse-failure receipt's sequence) and emits the
 * named parse-failure sub-receipt — never a crash, never silent acceptance,
 * never a retry (the coordinator decides what happens next).
 */
export function collectAdversarialFindings(
  workflowId: string,
  rawText: string,
  deps: CollectDeps = {},
): CollectResult {
  assertValidWorkflowId(workflowId)
  const repoRoot = deps.repoRoot ?? process.cwd()
  const writeReceiptFn = deps.writeReceiptFn ?? ((write: () => string): string => write())

  let findings: AdversarialFinding[]
  try {
    findings = parseAdversarialFindings(rawText)
  } catch (err) {
    if (!(err instanceof AdversarialError) || err.code !== 'PARSE_FAILED') {
      throw err
    }
    const reason = err.message
    const tip = readChainTip(workflowId, repoRoot)
    const quarantineName = `${padSequence(tip.sequence)}-adversarial-raw.txt`
    const quarantinePath = `docs/receipts/${workflowId}/quarantine/${quarantineName}`
    const quarantineAbs = join(repoRoot, ...quarantinePath.split('/'))
    try {
      mkdirSync(dirname(quarantineAbs), { recursive: true })
      // flag wx: exclusive create — quarantined evidence is never overwritten.
      writeFileSync(quarantineAbs, rawText, { encoding: 'utf8', flag: 'wx' })
    } catch (writeErr) {
      throw new AdversarialError(
        'QUARANTINE_WRITE_FAILED',
        `Cannot quarantine malformed reviewer output at '${quarantinePath}': ${String(writeErr)}`,
      )
    }
    let receiptLocator: string
    try {
      receiptLocator = writeReceiptFn(() =>
        emitStageDReceipt({
          workflowId,
          repoRoot,
          claimRef: 'adversarial-parse-failure',
          subjectKind: 'AdversarialParseFailure',
          subject: { quarantinePath, reason },
          tip,
        }),
      )
    } catch (receiptErr) {
      // RB-1 / AC-26 retryability: the quarantine/receipt pair is atomic-ish —
      // a failed receipt write removes the just-written quarantine file so a
      // retry does not trip the exclusive-write guard and need human deletion.
      try {
        rmSync(quarantineAbs)
      } catch {
        // Best-effort cleanup; the typed receipt failure below still surfaces.
      }
      if (receiptErr instanceof AdversarialError) throw receiptErr
      throw new AdversarialError(
        'RECEIPT_WRITE_FAILED',
        `Parse-failure receipt write failed (quarantine file removed for retry): ${String(receiptErr)}`,
      )
    }
    return { ok: false, reason, quarantinePath, receiptLocator }
  }

  const tip = readChainTip(workflowId, repoRoot)
  let receiptLocator: string
  try {
    receiptLocator = writeReceiptFn(() =>
      emitStageDReceipt({
        workflowId,
        repoRoot,
        claimRef: 'adversarial-findings',
        subjectKind: 'AdversarialFindings',
        subject: { findings: findings as unknown as JsonValue },
        tip,
      }),
    )
  } catch (receiptErr) {
    if (receiptErr instanceof AdversarialError) throw receiptErr
    throw new AdversarialError(
      'RECEIPT_WRITE_FAILED',
      `Findings receipt write failed: ${String(receiptErr)}`,
    )
  }
  return { ok: true, findings, receiptLocator }
}
