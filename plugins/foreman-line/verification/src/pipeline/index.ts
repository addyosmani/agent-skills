/**
 * Stage-D Pipeline Runner + Rework Routing (W3-P3) — Stage D.3 mechanics
 * (charter W3-P3 row as amended; rulings F1, F5; PRF-8/PRF-9).
 *
 * Four concerns, all in-process:
 *   ASSEMBLE  — assembleVerdict: schema-validated intake (harness claims,
 *               adversarial findings, coordinator dispositions) under the
 *               mechanical PRF-9 rule. Severity >= high blocks, period; a
 *               disposition can never override it.
 *   EMIT      — emitVerificationVerdict: the verdict Stage-D sub-receipt
 *               (chained via the W3-P1 allocator scan) plus the frozen
 *               StageOutput<VerificationVerdict> envelope at
 *               docs/receipts/<workflowId>/verification-verdict.envelope.json.
 *   ROUTE     — countReworkAttempts / routeRework: the D4 cap table. Attempt
 *               state is derived from schema-valid ReworkSignal receipts ON
 *               DISK (ruling F5) — never session state; tampered receipts are
 *               typed halts, never silently lowered counts.
 *   LOOP-BACK — planReverification: the PRF-8 policy as data (harness re-runs
 *               always; adversarial re-review only if the rework touched code).
 *
 * Generate/launch boundary (F3-equivalent): this module GENERATES rework
 *   kickstarters and reports; it never spawns a process, never runs a skill,
 *   never performs a git operation, and never re-runs the harness or the
 *   reviewer. The coordinator launches rework sessions from the generated
 *   kickstarters. P3 owns the verdict; P4 consumes it. The coordinator never
 *   grades rework.
 *
 * Lessons discipline:
 *   #19 — every scan over claim/finding text (reason assembly, kickstarter
 *         interpolation, filename-slug matching) is linear-time: indexOf /
 *         startsWith / char-code loops, no regex over untrusted text.
 *   #22 — every external call is wrapped in a typed try-catch rethrowing
 *         PipelineError; no foreign exception escapes the public API.
 *
 * Chain identity: Stage-D sub-receipts inherit correlation.workflowId and
 * correlation.correlationId from the chain-tip receipt, minting fresh
 * sessionId/runId. Fresh correlation generation is forbidden here — it forks
 * the chain (validateChain AC5c hazard; W3-P1/P2/W2-P2 precedent).
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Ajv } from 'ajv'
import { canonicalize, type JsonValue, sha256Hex } from '../../../approval/src/index.js'
import type { ReworkSignal, StageOutput } from '../../../contracts/src/envelope.js'
import { reworkSignalSchema } from '../../../contracts/src/envelope.js'
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
  HarnessClaimResult,
  VerificationVerdict,
} from '../../../contracts/src/stages/d-verification.js'
import {
  verificationVerdictOutputSchema,
  verificationVerdictSchema,
} from '../../../contracts/src/stages/d-verification.js'
import { validateReceiptDocument } from '../../../receipts/src/index.js'
import { VerificationError, writeClaimReceipt } from '../harness/index.js'

// ─── Error class (this sub-module's own; shipped unions untouched) ────────────

export type PipelineErrorCode =
  | 'WORKFLOW_ID_INVALID'
  | 'INPUT_INVALID'
  | 'DISPOSITION_INVALID'
  | 'VERDICT_INVALID'
  | 'ENVELOPE_INVALID'
  | 'ENVELOPE_EXISTS'
  | 'ENVELOPE_WRITE_FAILED'
  | 'REWORK_RECEIPT_INVALID'
  | 'SEQUENCE_READ_FAILED'
  | 'RECEIPT_WRITE_FAILED'
  | 'RECEIPT_EXISTS'
  | 'KICKSTARTER_WRITE_FAILED'
  | 'REPORT_WRITE_FAILED'

export class PipelineError extends Error {
  readonly code: PipelineErrorCode

  constructor(code: PipelineErrorCode, message: string) {
    super(message)
    this.name = 'PipelineError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Coordinator triage entry for exactly one sub-high adversarial finding. */
export interface Disposition {
  readonly findingIndex: number
  readonly disposition: 'accept' | 'rework'
  readonly note: string
}

export interface VerdictInput {
  readonly harnessClaims: readonly HarnessClaimResult[]
  readonly adversarialFindings: readonly AdversarialFinding[]
  readonly dispositions: readonly Disposition[]
}

export interface ReworkRoutingInput {
  readonly workflowId: string
  /** The verdict sub-receipt this routing chains evidence to. */
  readonly verdictReceipt: { readonly hash: string; readonly locator: string }
  /** Must carry verdict: 'rework'. */
  readonly verdict: VerificationVerdict
  readonly parcelRef: string
  readonly branch: string
  readonly worktreePath: string
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

/** One on-disk rework attempt, walked from its ReworkSignal receipt. */
export interface ReworkAttemptRecord {
  readonly attempt: number
  readonly reason: string
  readonly signalReceiptLocator: string
}

export interface ReworkKickstarterInput {
  readonly parcelRef: string
  readonly branch: string
  readonly worktreePath: string
  readonly attempt: number
  readonly failingClaims: readonly HarnessClaimResult[]
  readonly blockingFindings: readonly AdversarialFinding[]
  /** Receipt locators evidencing the failures (verdict + signal receipts). */
  readonly receiptLocators: readonly string[]
  /** Attempt history (required for the re-coordination kickstarter). */
  readonly priorAttempts?: readonly ReworkAttemptRecord[]
}

export type ReworkRoutingResult =
  | {
      readonly kind: 'build-fix'
      readonly attempt: 1
      readonly kickstarterPath: string
      readonly signalReceiptLocator: string
    }
  | {
      readonly kind: 'recoordination'
      readonly attempt: 2
      readonly kickstarterPath: string
      readonly signalReceiptLocator: string
    }
  | {
      readonly kind: 'stop-condition'
      readonly attempt: number
      readonly signalReceiptLocator: string
      readonly stopReceiptLocator: string
      readonly failureReportPath: string
    }

/** The PRF-8 loop-back policy as data. */
export interface ReverificationPlan {
  readonly rerunHarness: true
  readonly rerunAdversarial: boolean
}

export interface PipelineFsDeps {
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

export interface EmitVerdictDeps extends PipelineFsDeps {
  /** Failure-injection seam wrapping the verdict receipt write. */
  readonly writeReceiptFn?: (write: () => string) => string
  /** Failure-injection seam for the envelope write (absolute path, contents). */
  readonly writeEnvelopeFn?: (absPath: string, contents: string) => void
}

export interface RouteReworkDeps {
  /** Failure-injection seam wrapping each Stage-D receipt write. */
  readonly writeReceiptFn?: (write: () => string) => string
  /** Failure-injection seam for the kickstarter write (absolute path, contents). */
  readonly writeKickstarterFn?: (absPath: string, contents: string) => void
  /** Failure-injection seam for the failure-report write (absolute path, contents). */
  readonly writeReportFn?: (absPath: string, contents: string) => void
}

// ─── Constants / module-level setup ──────────────────────────────────────────

const ENVELOPE_FILENAME = 'verification-verdict.envelope.json'
/** Filename tail identifying a ReworkSignal receipt ('ReworkSignal' slugified). */
const REWORK_SIGNAL_NAME_TAIL = '-D-rework-signal.json'
const BLOCKING_SEVERITIES: readonly FindingSeverity[] = ['high', 'critical']
const SUB_HIGH_SEVERITIES: readonly FindingSeverity[] = ['info', 'low', 'medium']

const verdictProperties = verificationVerdictSchema.properties as Record<
  string,
  { items: Record<string, unknown> }
>
const harnessClaimItemsSchema = (verdictProperties.harnessClaims as { items: object }).items
const adversarialFindingItemsSchema = (verdictProperties.adversarialFindings as { items: object })
  .items

const ajv = new Ajv()
const validateClaimItem = ajv.compile(harnessClaimItemsSchema)
const validateFindingItem = ajv.compile(adversarialFindingItemsSchema)
const validateVerdict = ajv.compile(verificationVerdictSchema)
const validateReworkSignal = ajv.compile(reworkSignalSchema)
// The typed source of the frozen stage-envelope.verification-verdict.schema.json
// instantiation (contracts/src/stages/d-verification.ts) — same composed schema.
const validateVerdictEnvelope = ajv.compile(verificationVerdictOutputSchema)

// ─── Linear-time character helpers (lesson #19) ──────────────────────────────

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
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
 * filesystem access (the W3-P1/P2 fail-loud rule).
 */
function assertValidWorkflowId(workflowId: string): void {
  if (typeof workflowId !== 'string' || !matchesUuidPattern(workflowId)) {
    throw new PipelineError(
      'WORKFLOW_ID_INVALID',
      `workflowId must match UUID_PATTERN (${UUID_PATTERN}) before any filesystem access, got ${JSON.stringify(workflowId)}`,
    )
  }
}

/** parcelRef slug: [A-Z0-9]+(-[A-Z0-9]+)*, length 2..64 (e.g. W3-P3). */
function isParcelRefSlug(value: string): boolean {
  if (typeof value !== 'string' || value.length < 2 || value.length > 64) return false
  let previousWasDash = true // a leading dash is invalid
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    if (code === 45 /* '-' */) {
      if (previousWasDash) return false
      previousWasDash = true
    } else if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90)) {
      previousWasDash = false
    } else {
      return false
    }
  }
  return !previousWasDash
}

/** Branch token: '/'-separated [A-Za-z0-9._-] segments, no traversal, 1..256. */
function isBranchToken(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256) return false
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
 * Worktree path: filesystem path with no whitespace, quotes, backticks, or
 * control characters (prose cannot pass), no '..' traversal segment, 1..1024.
 */
function isSaneWorktreePath(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) return false
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

/**
 * Structurally contains untrusted multi-line text inside a kickstarter/report
 * bullet: every embedded newline is followed by four spaces of indentation, so
 * hostile finding text can never open a fence or heading at column 0. The
 * content itself is reproduced verbatim (lesson #16 — a floor, not a ceiling);
 * only line starts are indented. Linear indexOf walk, no regex.
 */
function indentUntrusted(text: string): string {
  let result = ''
  let lineStart = 0
  const length = text.length
  while (lineStart <= length) {
    let lineEnd = text.indexOf('\n', lineStart)
    if (lineEnd === -1) lineEnd = length
    if (lineStart > 0) result += '\n    '
    result += text.slice(lineStart, lineEnd)
    if (lineEnd === length) break
    lineStart = lineEnd + 1
  }
  return result
}

/**
 * RP-4: neutralizes untrusted text for interpolation into ONE markdown table
 * cell: '|' is escaped to '\|' so hostile text can never split a cell, and
 * CR/LF (CRLF collapses to one) is replaced by a single space so a row can
 * never be broken open into a column-0 heading/fence. Linear-time char loop,
 * no regex (lesson #19).
 */
function escapeTableCell(text: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 124 /* '|' */) {
      result += '\\|'
    } else if (code === 13 /* CR */) {
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 10 /* LF */) i += 1
      result += ' '
    } else if (code === 10 /* LF */) {
      result += ' '
    } else {
      result += text[i]
    }
  }
  return result
}

function padSequence(sequence: number): string {
  return String(sequence).padStart(6, '0')
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
    const code = name.charCodeAt(i)
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45)) return false
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
  /** Filename of the chain-tip receipt (for idempotent-retry pre-flights). */
  readonly tipName: string
}

function receiptsDir(workflowId: string, repoRoot: string): string {
  return join(repoRoot, 'docs', 'receipts', workflowId)
}

/**
 * Scans docs/receipts/<workflowId>/ for conforming receipt filenames (the
 * allocateSequence scan discipline): only conforming `*.json` names in the
 * workflow dir root count — the envelope file, quarantine/, and rework/ are
 * invisible. Stage-D sub-receipts must chain FROM something, so an empty
 * chain is a typed failure.
 */
function scanConformingNames(workflowId: string, repoRoot: string): string[] {
  const dir = receiptsDir(workflowId, repoRoot)
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch (err) {
    throw new PipelineError(
      'SEQUENCE_READ_FAILED',
      `Cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }
  const conforming: string[] = []
  for (const name of names) {
    if (isConformingReceiptName(name)) conforming.push(name)
  }
  return conforming
}

function readChainTip(workflowId: string, repoRoot: string): ChainTip {
  const dir = receiptsDir(workflowId, repoRoot)
  const names = scanConformingNames(workflowId, repoRoot)
  let highestName: string | null = null
  let highestSequence = -1
  for (const name of names) {
    const sequence = parseSequencePrefix(name)
    if (sequence > highestSequence) {
      highestSequence = sequence
      highestName = name
    }
  }
  if (highestName === null) {
    throw new PipelineError(
      'SEQUENCE_READ_FAILED',
      `No prior receipt exists for workflow '${workflowId}'; Stage-D sub-receipts must chain from an existing receipt`,
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(join(dir, highestName), 'utf8'))
  } catch (err) {
    throw new PipelineError(
      'SEQUENCE_READ_FAILED',
      `Cannot read highest-sequence receipt '${highestName}' in '${dir}': ${String(err)}`,
    )
  }
  const tipDocument = parsed as Record<string, unknown>
  const hash = tipDocument.hash
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new PipelineError(
      'SEQUENCE_READ_FAILED',
      `Highest-sequence receipt '${highestName}' in '${dir}' has no string 'hash' field`,
    )
  }
  return { sequence: highestSequence + 1, prevHash: hash, tipDocument, tipName: highestName }
}

function inheritCorrelation(tip: ChainTip, workflowId: string): CorrelationContext {
  const correlation = tip.tipDocument.correlation
  if (typeof correlation !== 'object' || correlation === null || Array.isArray(correlation)) {
    throw new PipelineError(
      'SEQUENCE_READ_FAILED',
      `Chain-tip receipt for workflow '${workflowId}' has no 'correlation' object`,
    )
  }
  const { workflowId: tipWorkflowId, correlationId } = correlation as Record<string, unknown>
  if (typeof tipWorkflowId !== 'string' || typeof correlationId !== 'string') {
    throw new PipelineError(
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
 * = allocateSequence-scan-compatible exclusive write + validateReceiptDocument
 * + approval's canonicalize/sha256Hex/writeReceiptDocument) behind this
 * module's own typed error surface (the W3-P2 composition pattern).
 */
function emitStageDReceipt(args: {
  readonly workflowId: string
  readonly repoRoot: string
  readonly claimRef: string
  readonly subjectKind: string
  readonly subject: JsonValue
  readonly tip: ChainTip
  readonly correlation: CorrelationContext
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
      correlation: args.correlation,
    })
  } catch (err) {
    if (err instanceof PipelineError) throw err
    if (err instanceof VerificationError && err.code === 'RECEIPT_EXISTS') {
      throw new PipelineError('RECEIPT_EXISTS', err.message)
    }
    throw new PipelineError('RECEIPT_WRITE_FAILED', `Receipt write failed: ${String(err)}`)
  }
}

// ─── assembleVerdict (PRF-9, mechanical) ──────────────────────────────────────

function invalidInput(where: string, detail: string): PipelineError {
  return new PipelineError('INPUT_INVALID', `${where}: ${detail}`)
}

function invalidDisposition(detail: string): PipelineError {
  return new PipelineError('DISPOSITION_INVALID', detail)
}

/**
 * Pure verdict assembly under the mechanical PRF-9 rule:
 *   - any adversarial finding with severity high/critical  -> 'rework'
 *   - any harnessClaims[].passed === false                 -> 'rework'
 *   - any sub-high finding dispositioned 'rework'          -> 'rework'
 *   - otherwise                                            -> 'pass'
 * Intake is schema-validated against the frozen verification-verdict item
 * sub-schemas; dispositions apply ONLY below high — a disposition targeting a
 * high/critical finding is a typed error, never an override. Every sub-high
 * finding requires exactly one disposition entry (the coordinator's triage is
 * chain evidence; silence never reads as acceptance).
 */
export function assembleVerdict(input: VerdictInput): VerificationVerdict {
  if (typeof input !== 'object' || input === null) {
    throw invalidInput('VerdictInput', 'input must be an object')
  }
  if (!Array.isArray(input.harnessClaims)) {
    throw invalidInput('VerdictInput.harnessClaims', 'must be an array')
  }
  if (!Array.isArray(input.adversarialFindings)) {
    throw invalidInput('VerdictInput.adversarialFindings', 'must be an array')
  }

  const claims: HarnessClaimResult[] = []
  for (let i = 0; i < input.harnessClaims.length; i++) {
    const element: unknown = input.harnessClaims[i]
    if (!validateClaimItem(element)) {
      throw invalidInput(
        `VerdictInput.harnessClaims[${i}]`,
        `fails the frozen HarnessClaimResult sub-schema: ${ajv.errorsText(validateClaimItem.errors)}`,
      )
    }
    const record = element as { claim: string; passed: boolean; evidence: string }
    claims.push({ claim: record.claim, passed: record.passed, evidence: record.evidence })
  }

  const findings: AdversarialFinding[] = []
  for (let i = 0; i < input.adversarialFindings.length; i++) {
    const element: unknown = input.adversarialFindings[i]
    if (!validateFindingItem(element)) {
      throw invalidInput(
        `VerdictInput.adversarialFindings[${i}]`,
        `fails the frozen AdversarialFinding sub-schema: ${ajv.errorsText(validateFindingItem.errors)}`,
      )
    }
    const record = element as { summary: string; citation: string; severity: FindingSeverity }
    findings.push({
      summary: record.summary,
      citation: record.citation,
      severity: record.severity,
    })
  }

  // Disposition validation (charter exit criterion; PRF-9 scope rule).
  if (!Array.isArray(input.dispositions)) {
    throw invalidDisposition('VerdictInput.dispositions must be an array')
  }
  const dispositionCounts = new Map<number, number>()
  let anyReworkDisposition = false
  for (let i = 0; i < input.dispositions.length; i++) {
    const entry: unknown = input.dispositions[i]
    if (typeof entry !== 'object' || entry === null) {
      throw invalidDisposition(`dispositions[${i}] must be an object`)
    }
    const { findingIndex, disposition, note } = entry as Record<string, unknown>
    if (
      typeof findingIndex !== 'number' ||
      !Number.isInteger(findingIndex) ||
      findingIndex < 0 ||
      findingIndex >= findings.length
    ) {
      throw invalidDisposition(
        `dispositions[${i}].findingIndex must be an integer in 0..${findings.length - 1}, got ${JSON.stringify(findingIndex)}`,
      )
    }
    if (disposition !== 'accept' && disposition !== 'rework') {
      throw invalidDisposition(
        `dispositions[${i}].disposition must be 'accept' or 'rework', got ${JSON.stringify(disposition)}`,
      )
    }
    if (typeof note !== 'string' || note.length === 0) {
      throw invalidDisposition(`dispositions[${i}].note must be a non-empty string`)
    }
    const target = findings[findingIndex] as AdversarialFinding
    if (BLOCKING_SEVERITIES.includes(target.severity)) {
      // PRF-9: coordinator disposition NEVER applies at or above high.
      throw invalidDisposition(
        `dispositions[${i}] targets a ${target.severity} finding (index ${findingIndex}); dispositions never apply at or above 'high' (PRF-9)`,
      )
    }
    const count = (dispositionCounts.get(findingIndex) ?? 0) + 1
    if (count > 1) {
      throw invalidDisposition(
        `finding index ${findingIndex} has ${count} disposition entries; exactly one is required`,
      )
    }
    dispositionCounts.set(findingIndex, count)
    if (disposition === 'rework') anyReworkDisposition = true
  }
  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i] as AdversarialFinding
    if (SUB_HIGH_SEVERITIES.includes(finding.severity) && !dispositionCounts.has(i)) {
      throw invalidDisposition(
        `finding index ${i} (severity ${finding.severity}) has no disposition entry; every sub-high finding requires exactly one (fail-loud, never implicit accept)`,
      )
    }
  }

  // The mechanical PRF-9 rule — no disposition can reach the first two arms.
  const anyBlockingFinding = findings.some((finding) =>
    BLOCKING_SEVERITIES.includes(finding.severity),
  )
  const anyFailedClaim = claims.some((claim) => !claim.passed)
  const verdict: VerificationVerdict = {
    verdict: anyBlockingFinding || anyFailedClaim || anyReworkDisposition ? 'rework' : 'pass',
    harnessClaims: claims,
    adversarialFindings: findings,
  }

  // Belt-and-suspenders: the returned shape must satisfy the frozen schema.
  if (!validateVerdict(verdict)) {
    throw new PipelineError(
      'VERDICT_INVALID',
      `Assembled verdict fails the frozen verificationVerdictSchema: ${ajv.errorsText(validateVerdict.errors)}`,
    )
  }
  return verdict
}

// ─── countReworkAttempts (ruling F5 — attempt state lives on disk only) ──────

interface ReworkSignalReceipt {
  readonly sequence: number
  readonly locator: string
  readonly subject: ReworkSignal
}

/**
 * Scans docs/receipts/<workflowId>/ for ReworkSignal receipts by filename tail
 * '-D-rework-signal.json' on a conforming 6-digit-prefixed name. Every
 * candidate must parse, satisfy receiptDocumentSchema, carry
 * kind 'claim' / stage 'D' / subjectKind 'ReworkSignal', and a subject valid
 * against the frozen rework-signal schema — any failure is a typed
 * REWORK_RECEIPT_INVALID halt, never a skip (tampering must never silently
 * lower the attempt count). Subdirectories (quarantine/, rework/) and
 * non-conforming names (the envelope file) are invisible.
 */
function scanReworkSignalReceipts(workflowId: string, repoRoot: string): ReworkSignalReceipt[] {
  const dir = receiptsDir(workflowId, repoRoot)
  let entries: { name: string; isFile: () => boolean }[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw new PipelineError(
      'SEQUENCE_READ_FAILED',
      `Cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }
  const receipts: ReworkSignalReceipt[] = []
  for (const entry of entries) {
    const name = entry.name
    if (!entry.isFile()) continue
    if (!isConformingReceiptName(name)) continue
    if (name.slice(6) !== REWORK_SIGNAL_NAME_TAIL) continue

    const locator = `docs/receipts/${workflowId}/${name}`
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    } catch (err) {
      throw new PipelineError(
        'REWORK_RECEIPT_INVALID',
        `ReworkSignal receipt '${locator}' cannot be read/parsed (typed halt, not a skip): ${String(err)}`,
      )
    }
    const validation = validateReceiptDocument(parsed)
    if (!validation.valid) {
      throw new PipelineError(
        'REWORK_RECEIPT_INVALID',
        `ReworkSignal receipt '${locator}' fails receiptDocumentSchema: ${validation.errors.join('; ')}`,
      )
    }
    const document = parsed as Record<string, unknown>
    if (
      document.kind !== 'claim' ||
      document.stage !== 'D' ||
      document.subjectKind !== 'ReworkSignal'
    ) {
      throw new PipelineError(
        'REWORK_RECEIPT_INVALID',
        `ReworkSignal receipt '${locator}' kind/stage/subjectKind mismatch: expected claim/D/ReworkSignal, got ${JSON.stringify(document.kind)}/${JSON.stringify(document.stage)}/${JSON.stringify(document.subjectKind)}`,
      )
    }
    if (!validateReworkSignal(document.subject)) {
      throw new PipelineError(
        'REWORK_RECEIPT_INVALID',
        `ReworkSignal receipt '${locator}' subject fails the frozen rework-signal schema: ${ajv.errorsText(validateReworkSignal.errors)}`,
      )
    }
    receipts.push({
      sequence: parseSequencePrefix(name),
      locator,
      subject: document.subject as unknown as ReworkSignal,
    })
  }
  receipts.sort((a, b) => a.sequence - b.sequence)
  return receipts
}

/**
 * Derives the rework attempt state from disk (ruling F5): the count of
 * schema-valid ReworkSignal receipts in docs/receipts/<workflowId>/. The
 * original build is attempt 0, so the next attempt number is count + 1.
 * Tampered conforming-named receipts are typed REWORK_RECEIPT_INVALID errors.
 */
export function countReworkAttempts(workflowId: string, deps: PipelineFsDeps = {}): number {
  assertValidWorkflowId(workflowId)
  const repoRoot = deps.repoRoot ?? process.cwd()
  return scanReworkSignalReceipts(workflowId, repoRoot).length
}

// ─── emitVerificationVerdict (verdict sub-receipt + StageOutput envelope) ────

/**
 * Ordered, side-effectful emission:
 *   1. the verdict Stage-D sub-receipt (kind 'claim', claimRef
 *      'verification-verdict', subjectKind 'VerificationVerdict',
 *      signature null), sequence/prevHash from a fresh chain scan,
 *      correlation inherited from the chain tip, exclusive write;
 *   2. the StageOutput<VerificationVerdict> envelope at
 *      docs/receipts/<workflowId>/verification-verdict.envelope.json,
 *      schema-validated BEFORE write, exclusive write. The envelope filename
 *      deliberately does not match the 6-digit receipt convention, so it is
 *      invisible to sequence allocation (the skill-injection.json precedent).
 * reworkSignal must be null iff verdict is 'pass' (the frozen envelope schema
 * requires the key either way); the consistency check runs before ANY write.
 */
export function emitVerificationVerdict(
  workflowId: string,
  verdict: VerificationVerdict,
  reworkSignal: ReworkSignal | null,
  deps: EmitVerdictDeps = {},
): { receiptLocator: string; envelopePath: string } {
  assertValidWorkflowId(workflowId)
  const repoRoot = deps.repoRoot ?? process.cwd()

  if (!validateVerdict(verdict)) {
    throw invalidInput(
      'emitVerificationVerdict verdict',
      `fails the frozen verificationVerdictSchema: ${ajv.errorsText(validateVerdict.errors)}`,
    )
  }
  // Consistency gate before any write: null iff 'pass'.
  if (verdict.verdict === 'pass' && reworkSignal !== null) {
    throw new PipelineError(
      'ENVELOPE_INVALID',
      "reworkSignal must be null when the verdict is 'pass'",
    )
  }
  if (verdict.verdict === 'rework') {
    if (reworkSignal === null) {
      throw new PipelineError(
        'ENVELOPE_INVALID',
        "reworkSignal must be non-null when the verdict is 'rework'",
      )
    }
    if (!validateReworkSignal(reworkSignal)) {
      throw new PipelineError(
        'ENVELOPE_INVALID',
        `reworkSignal fails the frozen rework-signal schema: ${ajv.errorsText(validateReworkSignal.errors)}`,
      )
    }
  }

  const envelopePath = `docs/receipts/${workflowId}/${ENVELOPE_FILENAME}`
  const envelopeAbs = join(repoRoot, 'docs', 'receipts', workflowId, ENVELOPE_FILENAME)
  // Exclusivity pre-flight BEFORE the receipt write: a pre-existing envelope
  // must not leave a half-emitted state behind.
  if (existsSync(envelopeAbs)) {
    throw new PipelineError(
      'ENVELOPE_EXISTS',
      `Refusing to overwrite existing envelope at '${envelopePath}'`,
    )
  }

  // 1. Verdict sub-receipt.
  const tip = readChainTip(workflowId, repoRoot)
  const correlation = inheritCorrelation(tip, workflowId)
  let receiptLocator: string
  if (
    tip.tipDocument.claimRef === 'verification-verdict' &&
    tip.tipDocument.subjectKind === 'VerificationVerdict'
  ) {
    // RP-3 idempotent-retry pre-flight: a verdict sub-receipt already sits at
    // this workflow's chain tip — a prior call wrote it and then failed on
    // the envelope write. REUSE it (the envelope references the existing
    // receipt) rather than emitting a duplicate; a differing verdict at the
    // tip is a typed refusal, never a second receipt or an orphan.
    const tipSubjectHash = sha256Hex(canonicalize(tip.tipDocument.subject as JsonValue))
    const verdictHash = sha256Hex(canonicalize(verdict as unknown as JsonValue))
    if (tipSubjectHash !== verdictHash) {
      throw new PipelineError(
        'RECEIPT_EXISTS',
        `A verdict sub-receipt already sits at the chain tip ('${tip.tipName}') carrying a different verdict; refusing to emit a duplicate`,
      )
    }
    receiptLocator = `docs/receipts/${workflowId}/${tip.tipName}`
  } else {
    const writeReceiptFn = deps.writeReceiptFn ?? ((write: () => string): string => write())
    try {
      receiptLocator = writeReceiptFn(() =>
        emitStageDReceipt({
          workflowId,
          repoRoot,
          claimRef: 'verification-verdict',
          subjectKind: 'VerificationVerdict',
          subject: verdict as unknown as JsonValue,
          tip,
          correlation,
        }),
      )
    } catch (err) {
      if (err instanceof PipelineError) throw err
      throw new PipelineError(
        'RECEIPT_WRITE_FAILED',
        `Verdict receipt write failed: ${String(err)}`,
      )
    }
  }

  // Read back the just-written receipt for its stored hash (the envelope's
  // receipt ref must carry the verdict sub-receipt's { hash, locator }).
  let receiptHash: string
  try {
    const written = JSON.parse(
      readFileSync(join(repoRoot, ...receiptLocator.split('/')), 'utf8'),
    ) as Record<string, unknown>
    if (typeof written.hash !== 'string' || written.hash.length === 0) {
      throw new Error(`written receipt at '${receiptLocator}' has no string 'hash' field`)
    }
    receiptHash = written.hash
  } catch (err) {
    if (err instanceof PipelineError) throw err
    throw new PipelineError(
      'RECEIPT_WRITE_FAILED',
      `Cannot read back the written verdict receipt: ${String(err)}`,
    )
  }

  // 2. StageOutput<VerificationVerdict> envelope — validated BEFORE write.
  const envelope: StageOutput<VerificationVerdict> = {
    correlation,
    receipt: { hash: receiptHash, locator: receiptLocator },
    timestamp: new Date().toISOString(),
    reworkSignal,
    payload: verdict,
  }
  if (!validateVerdictEnvelope(envelope)) {
    throw new PipelineError(
      'ENVELOPE_INVALID',
      `StageOutput envelope fails the frozen stage-envelope.verification-verdict schema: ${ajv.errorsText(validateVerdictEnvelope.errors)}`,
    )
  }
  const writeEnvelopeFn =
    deps.writeEnvelopeFn ??
    ((absPath: string, contents: string): void => {
      // flag wx: exclusive create — an envelope is emitted exactly once.
      writeFileSync(absPath, contents, { encoding: 'utf8', flag: 'wx' })
    })
  try {
    writeEnvelopeFn(envelopeAbs, `${JSON.stringify(envelope, null, 2)}\n`)
  } catch (err) {
    if (err instanceof PipelineError) throw err
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new PipelineError(
        'ENVELOPE_EXISTS',
        `Refusing to overwrite existing envelope at '${envelopePath}'`,
      )
    }
    // RP-2: a non-EEXIST envelope write failure occurs AFTER a successful
    // verdict-receipt write — retry logic must be able to distinguish it
    // from RECEIPT_WRITE_FAILED (the receipt itself is safely on disk).
    throw new PipelineError(
      'ENVELOPE_WRITE_FAILED',
      `Envelope write failed at '${envelopePath}': ${String(err)}`,
    )
  }

  return { receiptLocator, envelopePath }
}

// ─── Reason assembly (deterministic; linear-time joins) ──────────────────────

function buildReworkReason(verdict: VerificationVerdict): string {
  const parts: string[] = []
  for (const claim of verdict.harnessClaims) {
    if (!claim.passed) parts.push(`failing claim: ${claim.claim}`)
  }
  for (const finding of verdict.adversarialFindings) {
    if (BLOCKING_SEVERITIES.includes(finding.severity)) {
      parts.push(`blocking finding [${finding.severity}]: ${finding.summary} (${finding.citation})`)
    }
  }
  if (parts.length === 0) {
    return 'rework verdict carried by coordinator disposition of sub-high findings; no failing claim or blocking finding'
  }
  return parts.join('; ')
}

// ─── Kickstarter generators (pure; generate, never launch) ───────────────────

function assertValidKickstarterInput(input: ReworkKickstarterInput): void {
  if (typeof input !== 'object' || input === null) {
    throw invalidInput('ReworkKickstarterInput', 'input must be an object')
  }
  if (!isParcelRefSlug(input.parcelRef)) {
    throw invalidInput('ReworkKickstarterInput.parcelRef', 'must be a slug [A-Z0-9]+(-[A-Z0-9]+)*')
  }
  if (!isBranchToken(input.branch)) {
    throw invalidInput('ReworkKickstarterInput.branch', 'must be a branch token, no prose')
  }
  if (!isSaneWorktreePath(input.worktreePath)) {
    throw invalidInput(
      'ReworkKickstarterInput.worktreePath',
      'must be a filesystem path, no whitespace/prose',
    )
  }
  if (!Number.isInteger(input.attempt) || input.attempt < 1) {
    throw invalidInput('ReworkKickstarterInput.attempt', 'must be an integer >= 1')
  }
  if (!Array.isArray(input.failingClaims) || !Array.isArray(input.blockingFindings)) {
    throw invalidInput(
      'ReworkKickstarterInput',
      'failingClaims and blockingFindings must be arrays',
    )
  }
  for (let i = 0; i < input.failingClaims.length; i++) {
    if (!validateClaimItem(input.failingClaims[i])) {
      throw invalidInput(
        `ReworkKickstarterInput.failingClaims[${i}]`,
        `fails the frozen HarnessClaimResult sub-schema: ${ajv.errorsText(validateClaimItem.errors)}`,
      )
    }
  }
  for (let i = 0; i < input.blockingFindings.length; i++) {
    if (!validateFindingItem(input.blockingFindings[i])) {
      throw invalidInput(
        `ReworkKickstarterInput.blockingFindings[${i}]`,
        `fails the frozen AdversarialFinding sub-schema: ${ajv.errorsText(validateFindingItem.errors)}`,
      )
    }
  }
  if (!Array.isArray(input.receiptLocators)) {
    throw invalidInput('ReworkKickstarterInput.receiptLocators', 'must be an array')
  }
  for (const locator of input.receiptLocators) {
    if (typeof locator !== 'string' || locator.length === 0) {
      throw invalidInput('ReworkKickstarterInput.receiptLocators[]', 'must be non-empty strings')
    }
  }
  if (input.priorAttempts !== undefined) {
    if (!Array.isArray(input.priorAttempts)) {
      throw invalidInput('ReworkKickstarterInput.priorAttempts', 'must be an array when present')
    }
    for (const prior of input.priorAttempts) {
      if (
        typeof prior !== 'object' ||
        prior === null ||
        !Number.isInteger(prior.attempt) ||
        typeof prior.reason !== 'string' ||
        typeof prior.signalReceiptLocator !== 'string'
      ) {
        throw invalidInput(
          'ReworkKickstarterInput.priorAttempts[]',
          'each entry needs integer attempt, string reason, string signalReceiptLocator',
        )
      }
    }
  }
}

/** The failure payload both rework kickstarters carry (a floor, not a ceiling). */
function renderFailureEvidence(input: ReworkKickstarterInput): string {
  const lines: string[] = []
  lines.push('Failing harness claims (verbatim):')
  if (input.failingClaims.length === 0) {
    lines.push('  - (none — the rework verdict is carried by findings/dispositions)')
  }
  for (const claim of input.failingClaims) {
    lines.push(`  - claim: ${indentUntrusted(claim.claim)}`)
    lines.push(`    evidence: ${indentUntrusted(claim.evidence)}`)
  }
  lines.push('')
  lines.push('Blocking adversarial findings (verbatim):')
  if (input.blockingFindings.length === 0) {
    lines.push('  - (none — the rework verdict is carried by failing claims/dispositions)')
  }
  for (const finding of input.blockingFindings) {
    lines.push(`  - [${finding.severity}] ${indentUntrusted(finding.summary)}`)
    lines.push(`    citation: ${indentUntrusted(finding.citation)}`)
  }
  lines.push('')
  lines.push('Receipt locators (the evidence trail):')
  for (const locator of input.receiptLocators) {
    lines.push(`  - ${locator}`)
  }
  return lines.join('\n')
}

/** The environment/discipline charges shared by both rework kickstarters. */
function renderSharedCharges(): string {
  return `Discipline:
- All commands in PowerShell (lesson #10); run node -v first (>= 24.11.1). Capture command output in full before reading any exit code (lesson #11).
- Test-count tripwire (lessons #7/#8): record the passing test count before you start; it must not decrease, and every fix that adds behavior adds a named test.
- Fix every instance of each failure class, not just the listed instances (lesson #16): the findings below are a floor, not a ceiling.
- You never merge, never push to main, and never grade your own rework — re-verification is the harness plus (conditionally) the adversarial review, dispatched by the coordinator.`
}

/**
 * Pure attempt-1 rework kickstarter generator (D4 cap table, row 1). Names the
 * build-fix-loop skill (a marketplace skill invocable by name — not repo-local
 * machinery) as the mechanical fix vehicle and states the small-model routing
 * tier; the coordinator's dispatch applies it. States what failed; never
 * pre-judges what the rework outcome will be deemed (the coordinator never
 * grades rework).
 */
export function generateBuildFixKickstarter(input: ReworkKickstarterInput): string {
  assertValidKickstarterInput(input)
  return `You are the attempt-${input.attempt} rework builder for parcel ${input.parcelRef}.

Step 0 (mandatory restate-and-stop gate, lesson #8): restate this kickstarter's failure list, the branch, the worktree, and the fix vehicle in your own words BEFORE touching anything. If anything is contradictory, unimplementable, or the build-fix-loop skill is unavailable in your session, STOP and report — do not improvise.

Workspace: branch ${input.branch}, worktree ${input.worktreePath} (lesson #9 — work only there; never push, PR, or merge).

Fix vehicle: invoke the build-fix-loop skill by name (a marketplace skill) as the mechanical fix loop for the failures below.
Routing tier: small model — the routing policy's boilerplate class (economy tier); the coordinator's dispatch applies this tier.

${renderFailureEvidence(input)}

${renderSharedCharges()}
`
}

/**
 * Pure attempt-2 re-coordination kickstarter generator (D4 cap table, row 2):
 * frontier-model, design-level re-examination — not mechanical fixing. Carries
 * the full attempt-1 history (its ReworkSignal receipt locator and reason) so
 * the frontier session sees what the attempt-1 session was charged with vs.
 * what re-verification found.
 */
export function generateRecoordinationKickstarter(input: ReworkKickstarterInput): string {
  assertValidKickstarterInput(input)
  const history: string[] = []
  for (const prior of input.priorAttempts ?? []) {
    history.push(
      `  - attempt ${prior.attempt}: ReworkSignal receipt ${prior.signalReceiptLocator}\n    charged with: ${indentUntrusted(prior.reason)}`,
    )
  }
  if (history.length === 0) {
    history.push('  - (no prior attempt history was supplied)')
  }
  return `You are the attempt-${input.attempt} re-coordination session for parcel ${input.parcelRef}. Frontier model: this is a design-level re-examination of the parcel — the mechanical fix attempt did not clear verification, so re-examine the approach, not just the symptoms.

Step 0 (mandatory restate-and-stop gate, lesson #8): restate the attempt history, the failure list, the branch, and the worktree in your own words BEFORE touching anything. If anything is contradictory or unimplementable, STOP and report — do not improvise.

Workspace: branch ${input.branch}, worktree ${input.worktreePath} (lesson #9 — work only there; never push, PR, or merge).

Attempt history (walked from the on-disk ReworkSignal receipts):
${history.join('\n')}
What re-verification found after the prior attempt is the failure list below.

${renderFailureEvidence(input)}

${renderSharedCharges()}
`
}

// ─── routeRework (D4 cap table) ───────────────────────────────────────────────

function writeReworkArtifact(
  absPath: string,
  contents: string,
  writeFn: ((absPath: string, contents: string) => void) | undefined,
  failCode: 'KICKSTARTER_WRITE_FAILED' | 'REPORT_WRITE_FAILED',
  label: string,
): void {
  const write =
    writeFn ??
    ((path: string, text: string): void => {
      mkdirSync(dirname(path), { recursive: true })
      // flag wx: exclusive create — rework artifacts are evidence, never clobbered.
      writeFileSync(path, text, { encoding: 'utf8', flag: 'wx' })
    })
  try {
    write(absPath, contents)
  } catch (err) {
    if (err instanceof PipelineError) throw err
    throw new PipelineError(failCode, `Cannot write ${label} at '${absPath}': ${String(err)}`)
  }
}

function renderFailureReport(args: {
  readonly input: ReworkRoutingInput
  readonly attempt: number
  readonly reason: string
  readonly history: readonly ReworkSignalReceipt[]
  readonly signalReceiptLocator: string
}): string {
  const { input, attempt, reason, history, signalReceiptLocator } = args
  const lines: string[] = []
  lines.push(`# Rework cap exceeded — structured failure report`)
  lines.push('')
  lines.push(`Parcel: ${input.parcelRef}`)
  lines.push(`Branch: ${input.branch}`)
  lines.push(`Worktree: ${input.worktreePath}`)
  lines.push(`Workflow: ${input.workflowId}`)
  lines.push(
    `Attempt: ${attempt} (cap is 2 rework attempts; this is a stop condition, not a routing option — charter D4)`,
  )
  lines.push('')
  lines.push('## Attempt history (walked from the on-disk ReworkSignal receipts)')
  lines.push('')
  lines.push('| attempt | ReworkSignal receipt | reason |')
  lines.push('| --- | --- | --- |')
  for (const record of history) {
    lines.push(
      `| ${record.subject.attempt} | ${escapeTableCell(record.locator)} | ${escapeTableCell(record.subject.reason)} |`,
    )
  }
  lines.push(
    `| ${attempt} | ${escapeTableCell(signalReceiptLocator)} | ${escapeTableCell(reason)} |`,
  )
  lines.push('')
  lines.push('## Failing claims and blocking findings (verbatim)')
  lines.push('')
  const failingClaims = input.verdict.harnessClaims.filter((claim) => !claim.passed)
  const blockingFindings = input.verdict.adversarialFindings.filter((finding) =>
    BLOCKING_SEVERITIES.includes(finding.severity),
  )
  lines.push(
    renderFailureEvidence({
      parcelRef: input.parcelRef,
      branch: input.branch,
      worktreePath: input.worktreePath,
      attempt,
      failingClaims,
      blockingFindings,
      receiptLocators: [input.verdictReceipt.locator, signalReceiptLocator],
    }),
  )
  lines.push('')
  return lines.join('\n')
}

/**
 * The D4 cap table. Called only on a 'rework' verdict; derives the attempt
 * number from disk (never an input parameter), emits the ReworkSignal Stage-D
 * sub-receipt on EVERY rework verdict (attempt 3 included), then:
 *   attempt 1  -> build-fix-loop kickstarter at rework/<seq6>-build-fix-kickstarter.md
 *   attempt 2  -> frontier re-coordination kickstarter at rework/<seq6>-recoordination-kickstarter.md
 *   attempt 3+ -> NO kickstarter; stop-condition sub-receipt + structured
 *                 failure report (the coordinator loop-stops; a third rework is
 *                 never authorized here).
 * <seq6> is the emitting receipt's zero-padded sequence (the W3-P2
 * quarantine-pairing pattern); the rework/ subdirectory is invisible to
 * sequence allocation and attempt counting.
 */
export function routeRework(
  input: ReworkRoutingInput,
  deps: RouteReworkDeps = {},
): ReworkRoutingResult {
  assertValidWorkflowId(input.workflowId)
  const repoRoot = input.repoRoot ?? process.cwd()

  if (!isParcelRefSlug(input.parcelRef)) {
    throw invalidInput('ReworkRoutingInput.parcelRef', 'must be a slug [A-Z0-9]+(-[A-Z0-9]+)*')
  }
  if (!isBranchToken(input.branch)) {
    throw invalidInput('ReworkRoutingInput.branch', 'must be a branch token, no prose')
  }
  if (!isSaneWorktreePath(input.worktreePath)) {
    throw invalidInput(
      'ReworkRoutingInput.worktreePath',
      'must be a filesystem path, no whitespace/prose',
    )
  }
  if (
    typeof input.verdictReceipt !== 'object' ||
    input.verdictReceipt === null ||
    typeof input.verdictReceipt.hash !== 'string' ||
    input.verdictReceipt.hash.length === 0 ||
    typeof input.verdictReceipt.locator !== 'string' ||
    input.verdictReceipt.locator.length === 0
  ) {
    throw invalidInput(
      'ReworkRoutingInput.verdictReceipt',
      'must carry non-empty string hash and locator',
    )
  }
  if (!validateVerdict(input.verdict)) {
    throw invalidInput(
      'ReworkRoutingInput.verdict',
      `fails the frozen verificationVerdictSchema: ${ajv.errorsText(validateVerdict.errors)}`,
    )
  }
  if (input.verdict.verdict !== 'rework') {
    throw invalidInput(
      'ReworkRoutingInput.verdict',
      "routeRework is called only on a 'rework' verdict",
    )
  }

  // 1. Attempt number from disk (ruling F5) — never from session state.
  //    RP-1 idempotent-resume pre-flight: if the newest on-disk ReworkSignal
  //    receipt is a kickstarter-bearing attempt (1 or 2) whose paired
  //    kickstarter is MISSING, a prior route emitted the signal receipt and
  //    then failed on the kickstarter write. RESUME that attempt — regenerate
  //    the kickstarter for THAT attempt number — instead of counting the
  //    orphan as a completed attempt and escalating. A transient
  //    kickstarter-write fault must never burn a rework rung.
  const fullHistory = scanReworkSignalReceipts(input.workflowId, repoRoot)
  const reworkDirRelPreflight = `docs/receipts/${input.workflowId}/rework`
  let resume: ReworkSignalReceipt | null = null
  const newest = fullHistory[fullHistory.length - 1]
  if (newest !== undefined && (newest.subject.attempt === 1 || newest.subject.attempt === 2)) {
    const pairedName =
      newest.subject.attempt === 1 ? 'build-fix-kickstarter.md' : 'recoordination-kickstarter.md'
    const pairedRel = `${reworkDirRelPreflight}/${padSequence(newest.sequence)}-${pairedName}`
    if (!existsSync(join(repoRoot, ...pairedRel.split('/')))) {
      resume = newest
    }
  }
  const history = resume === null ? fullHistory : fullHistory.slice(0, -1)
  const attempt = resume === null ? fullHistory.length + 1 : resume.subject.attempt

  // 2. The frozen ReworkSignal, validated before emission.
  const reason = buildReworkReason(input.verdict)
  const signal: ReworkSignal = {
    reason,
    originStage: 'D',
    targetStage: 'C',
    attempt,
    verdictReceipt: { hash: input.verdictReceipt.hash, locator: input.verdictReceipt.locator },
  }
  if (!validateReworkSignal(signal)) {
    throw invalidInput(
      'ReworkSignal',
      `constructed signal fails the frozen rework-signal schema: ${ajv.errorsText(validateReworkSignal.errors)}`,
    )
  }

  // 3. ReworkSignal Stage-D sub-receipt — emitted on EVERY rework verdict.
  //    On an RP-1 resume the orphaned attempt's signal receipt already exists
  //    on disk and is REUSED (same attempt number, exactly one receipt);
  //    only the missing kickstarter is regenerated.
  const writeReceiptFn = deps.writeReceiptFn ?? ((write: () => string): string => write())
  let signalSeq6: string
  let signalReceiptLocator: string
  if (resume !== null) {
    signalSeq6 = padSequence(resume.sequence)
    signalReceiptLocator = resume.locator
  } else {
    const signalTip = readChainTip(input.workflowId, repoRoot)
    signalSeq6 = padSequence(signalTip.sequence)
    try {
      signalReceiptLocator = writeReceiptFn(() =>
        emitStageDReceipt({
          workflowId: input.workflowId,
          repoRoot,
          claimRef: 'rework-signal',
          subjectKind: 'ReworkSignal',
          subject: signal as unknown as JsonValue,
          tip: signalTip,
          correlation: inheritCorrelation(signalTip, input.workflowId),
        }),
      )
    } catch (err) {
      if (err instanceof PipelineError) throw err
      throw new PipelineError(
        'RECEIPT_WRITE_FAILED',
        `ReworkSignal receipt write failed: ${String(err)}`,
      )
    }
  }

  const reworkDirRel = `docs/receipts/${input.workflowId}/rework`
  const failingClaims = input.verdict.harnessClaims.filter((claim) => !claim.passed)
  const blockingFindings = input.verdict.adversarialFindings.filter((finding) =>
    BLOCKING_SEVERITIES.includes(finding.severity),
  )
  const receiptLocators = [input.verdictReceipt.locator, signalReceiptLocator]

  // 4. Cap table.
  if (attempt === 1) {
    const kickstarter = generateBuildFixKickstarter({
      parcelRef: input.parcelRef,
      branch: input.branch,
      worktreePath: input.worktreePath,
      attempt,
      failingClaims,
      blockingFindings,
      receiptLocators,
    })
    const kickstarterPath = `${reworkDirRel}/${signalSeq6}-build-fix-kickstarter.md`
    writeReworkArtifact(
      join(repoRoot, ...kickstarterPath.split('/')),
      kickstarter,
      deps.writeKickstarterFn,
      'KICKSTARTER_WRITE_FAILED',
      'build-fix kickstarter',
    )
    return { kind: 'build-fix', attempt: 1, kickstarterPath, signalReceiptLocator }
  }

  if (attempt === 2) {
    const kickstarter = generateRecoordinationKickstarter({
      parcelRef: input.parcelRef,
      branch: input.branch,
      worktreePath: input.worktreePath,
      attempt,
      failingClaims,
      blockingFindings,
      receiptLocators,
      priorAttempts: history.map((record) => ({
        attempt: record.subject.attempt,
        reason: record.subject.reason,
        signalReceiptLocator: record.locator,
      })),
    })
    const kickstarterPath = `${reworkDirRel}/${signalSeq6}-recoordination-kickstarter.md`
    writeReworkArtifact(
      join(repoRoot, ...kickstarterPath.split('/')),
      kickstarter,
      deps.writeKickstarterFn,
      'KICKSTARTER_WRITE_FAILED',
      're-coordination kickstarter',
    )
    return { kind: 'recoordination', attempt: 2, kickstarterPath, signalReceiptLocator }
  }

  // attempt >= 3: stop condition — NO kickstarter. Stop-condition receipt +
  // structured failure report, sequence-paired to the stop receipt.
  const stopTip = readChainTip(input.workflowId, repoRoot)
  const failureReportPath = `${reworkDirRel}/${padSequence(stopTip.sequence)}-failure-report.md`
  let stopReceiptLocator: string
  try {
    stopReceiptLocator = writeReceiptFn(() =>
      emitStageDReceipt({
        workflowId: input.workflowId,
        repoRoot,
        claimRef: 'rework-cap-exceeded',
        subjectKind: 'ReworkCapExceeded',
        subject: { attempt, reason, failureReportPath },
        tip: stopTip,
        correlation: inheritCorrelation(stopTip, input.workflowId),
      }),
    )
  } catch (err) {
    if (err instanceof PipelineError) throw err
    throw new PipelineError(
      'RECEIPT_WRITE_FAILED',
      `Stop-condition receipt write failed: ${String(err)}`,
    )
  }
  const report = renderFailureReport({
    input,
    attempt,
    reason,
    history,
    signalReceiptLocator,
  })
  writeReworkArtifact(
    join(repoRoot, ...failureReportPath.split('/')),
    report,
    deps.writeReportFn,
    'REPORT_WRITE_FAILED',
    'failure report',
  )
  return {
    kind: 'stop-condition',
    attempt,
    signalReceiptLocator,
    stopReceiptLocator,
    failureReportPath,
  }
}

// ─── planReverification (ruling PRF-8 — the loop-back policy as data) ────────

/**
 * Pure. The harness re-runs after EVERY rework attempt; the adversarial
 * review re-runs only if the rework touched code. The flag must be exactly a
 * boolean — a truthy string is not a validated flag. The coordinator consumes
 * the plan; P3 performs neither re-run.
 */
export function planReverification(input: {
  readonly reworkTouchedCode: boolean
}): ReverificationPlan {
  if (typeof input !== 'object' || input === null) {
    throw invalidInput('planReverification', 'input must be an object')
  }
  if (typeof input.reworkTouchedCode !== 'boolean') {
    throw invalidInput(
      'planReverification.reworkTouchedCode',
      `must be exactly a boolean, got ${JSON.stringify(input.reworkTouchedCode)}`,
    )
  }
  return { rerunHarness: true, rerunAdversarial: input.reworkTouchedCode }
}
