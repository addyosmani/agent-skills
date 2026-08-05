/**
 * Human Review Gate + Jira Ticket Update (W3-P4) — Stage D.4 mechanics
 * (charter W3-P4 row, D8, PRF-12c).
 *
 * Two-phase one-tap contract (the shipped W2-P2 pattern, lesson #25 — no
 * readline, no stdin, no exit code):
 *   PHASE 1 — prepareHumanGate: validates the pass-verdict precondition from
 *             disk (typed refusals, never trust), walks the receipt chain via
 *             the shipped validator, and pre-drafts the review summary. Writes
 *             ONLY the summary — an untapped package leaves no chain residue.
 *   PHASE 2 — executeHumanGate: takes the recorded HumanGateDecision as a
 *             validated function argument (the coordinator-session tap IS the
 *             one tap). Decline emits a declined sub-receipt and touches no
 *             Jira surface. Approve lands the approval sub-receipt on disk
 *             BEFORE the first Jira call (PRF-12c), transitions the ticket
 *             behind the default-deny gate, posts the receipt-chain-link
 *             comment, and emits the Stage-D closure sub-receipt.
 *   RETRY   — retryHalfClosed: the PRF-12c coordinator retry, derived from
 *             disk only; requires the approval receipt, no-ops once the
 *             closure receipt exists, and never re-fires a completed
 *             transition.
 *
 * The frozen Stage-F closure envelope contract is Stage F output (mergeSha
 * does not exist at Stage D) and is deliberately NOT emitted anywhere here —
 * the Stage-D closure is the 'stage-d-closure' ReceiptDocument sub-receipt
 * (D7).
 *
 * All Jira interaction is behind the injected HumanGateJiraTransport seam;
 * the production adapter lives in ./adapter.ts (tool names VERIFY-AT-PROBE).
 * Deterministic tests inject fixture transports only.
 *
 * Lessons discipline:
 *   #19 — every scan over untrusted text (summary cell escaping, issue-key
 *         project split, UUID/filename matching) is linear-time: indexOf /
 *         startsWith / char-code loops, no regex over untrusted text.
 *   #22 — every external boundary (envelope read, receipt-dir scan, receipt
 *         read/write, summary write, every transport method) is wrapped in a
 *         typed try-catch rethrowing — or, post-approval, recording —
 *         HumanGateError; no foreign exception escapes the public API.
 *
 * Chain identity: Stage-D sub-receipts inherit correlation.workflowId and
 * correlation.correlationId from the chain-tip receipt, minting fresh
 * sessionId/runId. Fresh correlation generation is forbidden here — it forks
 * the chain (validateChain AC5c hazard; W3-P1/P2/P3 precedent).
 */

import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { Ajv } from 'ajv'
import type { JsonValue } from '../../../approval/src/index.js'
import type { StageOutput } from '../../../contracts/src/envelope.js'
import type {
  CorrelationContext,
  CorrelationId,
  RunId,
  SessionId,
  StageId,
  WorkflowId,
} from '../../../contracts/src/index.js'
import { STAGE_IDS, UUID_PATTERN } from '../../../contracts/src/index.js'
import type { VerificationVerdict } from '../../../contracts/src/stages/d-verification.js'
import { verificationVerdictOutputSchema } from '../../../contracts/src/stages/d-verification.js'
import type { ReceiptDocument } from '../../../receipts/src/index.js'
import { validateChain } from '../../../receipts/src/index.js'
import { ALLOWED_PROJECT_KEYS } from '../../../registration/src/index.js'
import { VerificationError, writeClaimReceipt } from '../harness/index.js'
import type { Disposition } from '../pipeline/index.js'

// ─── Error class (this sub-module's own; shipped unions untouched) ────────────

export type HumanGateErrorCode =
  | 'WORKFLOW_ID_INVALID'
  | 'VERDICT_MISSING'
  | 'VERDICT_INVALID'
  | 'VERDICT_NOT_PASS'
  | 'RECEIPT_LOCATOR_INVALID'
  | 'VERDICT_RECEIPT_MISMATCH'
  | 'CHAIN_INVALID'
  | 'INPUT_INVALID'
  | 'SUMMARY_EXISTS'
  | 'SUMMARY_WRITE_FAILED'
  | 'SEQUENCE_READ_FAILED'
  | 'RECEIPT_WRITE_FAILED'
  | 'RECEIPT_EXISTS'
  | 'JIRA_GATE_REFUSED'
  | 'JIRA_TRANSITION_UNAVAILABLE'
  | 'JIRA_CALL_FAILED'
  | 'APPROVAL_MISSING'

export class HumanGateError extends Error {
  readonly code: HumanGateErrorCode

  constructor(code: HumanGateErrorCode, message: string) {
    super(message)
    this.name = 'HumanGateError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface HumanGateInput {
  readonly workflowId: string
  readonly ticketKey: string
  /** Transition resolved by NAME against the live transitions list, never a raw id. */
  readonly targetStatus: string
  /** Coordinator triage entries for the summary's disposition table. */
  readonly dispositions: readonly Disposition[]
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

export interface HumanGateDecision {
  readonly decision: 'approve' | 'decline'
  readonly decidedBy: string
  /** Non-empty: the tap is chain evidence — silence never reads as approval. */
  readonly note: string
}

export interface HumanGatePackage {
  readonly workflowId: string
  readonly ticketKey: string
  readonly targetStatus: string
  readonly verdict: VerificationVerdict
  readonly envelope: StageOutput<VerificationVerdict>
  readonly summaryText: string
  readonly summaryPath: string
  readonly chainTip: { readonly hash: string; readonly locator: string }
  readonly repoRoot: string
}

export type HumanGateResult =
  | { kind: 'declined'; declineReceiptLocator: string }
  | {
      kind: 'closed'
      closureReceiptLocator: string
      ticketTransition: { fromStatus: string; toStatus: string }
    }
  | { kind: 'half-closed'; approvalReceiptLocator: string; halfClosedReceiptLocator: string }

/** The injected Jira boundary — the ONLY Jira surface in this sub-module. */
export interface HumanGateJiraTransport {
  getTransitions(
    issueKey: string,
  ): Promise<readonly { id: string; name: string; toStatus: string }[]>
  transitionIssue(issueKey: string, transitionId: string): Promise<void>
  addComment(issueKey: string, body: string): Promise<string>
}

export interface PrepareHumanGateDeps {
  /** Failure-injection seam for the summary write (absolute path, contents). */
  readonly writeSummaryFn?: (absPath: string, contents: string) => void
}

export interface ExecuteHumanGateDeps {
  /** The injected Jira transport; required on the approve path only. */
  readonly transport?: HumanGateJiraTransport
  /** Failure-injection seam wrapping each Stage-D receipt write. */
  readonly writeReceiptFn?: (write: () => string) => string
}

export interface RetryHalfClosedDeps {
  readonly transport: HumanGateJiraTransport
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
  /** Failure-injection seam wrapping each Stage-D receipt write. */
  readonly writeReceiptFn?: (write: () => string) => string
}

// ─── Constants / module-level setup ──────────────────────────────────────────

const ENVELOPE_FILENAME = 'verification-verdict.envelope.json'
const SUMMARY_RELATIVE = 'human-gate/review-summary.md'
const CLAIM_APPROVED = 'human-gate-approved'
const CLAIM_DECLINED = 'human-gate-declined'
const CLAIM_HALF_CLOSED = 'half-closed'
const CLAIM_CLOSURE = 'stage-d-closure'

const ajv = new Ajv()
// The typed source of the frozen stage-envelope.verification-verdict.schema.json
// instantiation — same composed schema (the W3-P3 precedent).
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
 * filesystem access (the W3-P1/P2/P3 rule).
 */
function assertValidWorkflowId(workflowId: string): void {
  if (typeof workflowId !== 'string' || !matchesUuidPattern(workflowId)) {
    throw new HumanGateError(
      'WORKFLOW_ID_INVALID',
      `workflowId must match UUID_PATTERN (${UUID_PATTERN}) before any filesystem access, got ${JSON.stringify(workflowId)}`,
    )
  }
}

/**
 * RH-1 amendment: shape guard for the envelope's receipt.locator, applied at
 * intake BEFORE any path join. The locator must be a repoRoot-relative path
 * matching the receipts convention (docs/receipts/<segment>/<name>.json):
 * forward-slash segments from a fixed charset (a-z A-Z 0-9 '-' '_' '.'),
 * no '.'/'..' segments, no leading '/', no backslash, no ':' (refuses
 * drive-letter absolutes), no control characters or CR/LF. Linear-time
 * char-code loop, no regex over untrusted text (lesson #19). Only a locator
 * that passes this guard is ever joined onto repoRoot or interpolated into
 * a Jira comment body.
 */
function assertValidReceiptLocator(locator: unknown): asserts locator is string {
  const refuse = (detail: string): HumanGateError =>
    new HumanGateError(
      'RECEIPT_LOCATOR_INVALID',
      `The envelope's receipt.locator is not a valid repoRoot-relative receipts path (${detail})`,
    )
  if (typeof locator !== 'string' || locator.length === 0) {
    throw refuse('must be a non-empty string')
  }
  // Charset scan: anything outside [a-zA-Z0-9._/-] — including control
  // characters, CR/LF, backslash, ':', and spaces — is refused outright.
  for (let i = 0; i < locator.length; i++) {
    const code = locator.charCodeAt(i)
    const allowed =
      (code >= 48 && code <= 57) || // 0-9
      (code >= 97 && code <= 122) || // a-z
      (code >= 65 && code <= 90) || // A-Z
      code === 45 || // '-'
      code === 46 || // '.'
      code === 47 || // '/'
      code === 95 // '_'
    if (!allowed) {
      throw refuse(`character code ${code} at index ${i} is outside the receipts-path charset`)
    }
  }
  if (locator.charCodeAt(0) === 47) throw refuse('absolute paths are refused')
  const segments = locator.split('/')
  for (const segment of segments) {
    if (segment.length === 0) throw refuse('empty path segments are refused')
    if (segment === '.' || segment === '..') throw refuse('path traversal segments are refused')
  }
  if (segments.length < 4 || segments[0] !== 'docs' || segments[1] !== 'receipts') {
    throw refuse("must have the shape 'docs/receipts/<workflow>/<receipt>.json'")
  }
  const last = segments[segments.length - 1] as string
  if (!last.endsWith('.json')) throw refuse("the receipt filename must end with '.json'")
}

/**
 * RP-4 (mirrored locally from the W3-P3 pipeline precedent — the shipped
 * pipeline source is frozen and does not export it): neutralizes untrusted
 * text for interpolation into ONE markdown table cell. '|' is escaped to
 * '\|' so hostile text can never split a cell, and CR/LF (CRLF collapses to
 * one) is replaced by a single space so a row can never be broken open into
 * a column-0 heading/fence. Linear-time char loop, no regex (lesson #19).
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

// ─── Default-deny Jira gate (standing authorization 5; the R4 pattern) ───────

/**
 * The mechanical default-deny gate: the issue key's project segment (the text
 * before the first '-', linear-time indexOf split) must be a member of the
 * committed ALLOWED_PROJECT_KEYS allowlist (exact string membership — case
 * tricks and prefix-similar projects fail). Anything else is a typed
 * JIRA_GATE_REFUSED before any client call.
 */
export function assertHumanGateJiraGate(issueKey: string): void {
  if (typeof issueKey !== 'string' || issueKey.length === 0) {
    throw new HumanGateError(
      'JIRA_GATE_REFUSED',
      `issue key must be a non-empty string, got ${JSON.stringify(issueKey)}`,
    )
  }
  const dashIndex = issueKey.indexOf('-')
  if (dashIndex <= 0) {
    throw new HumanGateError(
      'JIRA_GATE_REFUSED',
      `issue key ${JSON.stringify(issueKey)} has no '<PROJECT>-<number>' shape`,
    )
  }
  const projectKey = issueKey.slice(0, dashIndex)
  if (!ALLOWED_PROJECT_KEYS.has(projectKey)) {
    throw new HumanGateError(
      'JIRA_GATE_REFUSED',
      `project key ${JSON.stringify(projectKey)} is not in the allowlist [${[...ALLOWED_PROJECT_KEYS].join(', ')}]`,
    )
  }
}

// ─── Receipt-dir scan (allocateSequence discipline; W3-P3 mirror) ────────────

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

function receiptsDir(workflowId: string, repoRoot: string): string {
  return join(repoRoot, 'docs', 'receipts', workflowId)
}

interface ScannedReceipt {
  readonly name: string
  readonly sequence: number
  readonly locator: string
  readonly document: Record<string, unknown>
}

/**
 * Loads every conforming-named receipt in docs/receipts/<workflowId>/,
 * ordered by sequence prefix. quarantine/, rework/, human-gate/ contents and
 * the envelope file are invisible (non-conforming names / subdirectories are
 * skipped by the same filename-convention scan as allocateSequence).
 */
function loadConformingReceipts(workflowId: string, repoRoot: string): ScannedReceipt[] {
  const dir = receiptsDir(workflowId, repoRoot)
  let entries: { name: string; isFile: () => boolean }[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    throw new HumanGateError(
      'SEQUENCE_READ_FAILED',
      `Cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }
  const receipts: ScannedReceipt[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!isConformingReceiptName(entry.name)) continue
    const locator = `docs/receipts/${workflowId}/${entry.name}`
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(join(dir, entry.name), 'utf8'))
    } catch (err) {
      throw new HumanGateError(
        'SEQUENCE_READ_FAILED',
        `Cannot read/parse receipt '${locator}': ${String(err)}`,
      )
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new HumanGateError('SEQUENCE_READ_FAILED', `Receipt '${locator}' is not a JSON object`)
    }
    receipts.push({
      name: entry.name,
      sequence: parseSequencePrefix(entry.name),
      locator,
      document: parsed as Record<string, unknown>,
    })
  }
  receipts.sort((a, b) => a.sequence - b.sequence)
  return receipts
}

interface ChainTip {
  readonly sequence: number
  readonly prevHash: string
  readonly tipDocument: Record<string, unknown>
  readonly tipLocator: string
}

function chainTipOf(receipts: readonly ScannedReceipt[], workflowId: string): ChainTip {
  const tip = receipts[receipts.length - 1]
  if (tip === undefined) {
    throw new HumanGateError(
      'SEQUENCE_READ_FAILED',
      `No prior receipt exists for workflow '${workflowId}'; Stage-D sub-receipts must chain from an existing receipt`,
    )
  }
  const hash = tip.document.hash
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new HumanGateError(
      'SEQUENCE_READ_FAILED',
      `Chain-tip receipt '${tip.locator}' has no string 'hash' field`,
    )
  }
  return {
    sequence: tip.sequence + 1,
    prevHash: hash,
    tipDocument: tip.document,
    tipLocator: tip.locator,
  }
}

function inheritCorrelation(tip: ChainTip, workflowId: string): CorrelationContext {
  const correlation = tip.tipDocument.correlation
  if (typeof correlation !== 'object' || correlation === null || Array.isArray(correlation)) {
    throw new HumanGateError(
      'SEQUENCE_READ_FAILED',
      `Chain-tip receipt for workflow '${workflowId}' has no 'correlation' object`,
    )
  }
  const { workflowId: tipWorkflowId, correlationId } = correlation as Record<string, unknown>
  if (typeof tipWorkflowId !== 'string' || typeof correlationId !== 'string') {
    throw new HumanGateError(
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
 * Composes the shipped allocation/receipt machinery behind this module's own
 * typed error surface (the W3-P2/P3 composition pattern): fresh chain scan
 * per write, exclusive write, receiptDocumentSchema validation inside
 * writeClaimReceipt.
 */
function emitStageDReceipt(args: {
  readonly workflowId: string
  readonly repoRoot: string
  readonly claimRef: string
  readonly subjectKind: string
  readonly subject: JsonValue
  readonly writeReceiptFn?: (write: () => string) => string
}): string {
  const receipts = loadConformingReceipts(args.workflowId, args.repoRoot)
  const tip = chainTipOf(receipts, args.workflowId)
  const correlation = inheritCorrelation(tip, args.workflowId)
  const writeReceiptFn = args.writeReceiptFn ?? ((write: () => string): string => write())
  try {
    return writeReceiptFn(() =>
      writeClaimReceipt({
        workflowId: args.workflowId,
        repoRoot: args.repoRoot,
        claimRef: args.claimRef,
        subjectKind: args.subjectKind,
        subject: args.subject,
        sequence: tip.sequence,
        prevHash: tip.prevHash,
        correlation,
      }),
    )
  } catch (err) {
    if (err instanceof HumanGateError) throw err
    if (err instanceof VerificationError && err.code === 'RECEIPT_EXISTS') {
      throw new HumanGateError('RECEIPT_EXISTS', err.message)
    }
    throw new HumanGateError('RECEIPT_WRITE_FAILED', `Receipt write failed: ${String(err)}`)
  }
}

// ─── Precondition intake (typed refusals, never trust) ───────────────────────

function invalidInput(where: string, detail: string): HumanGateError {
  return new HumanGateError('INPUT_INVALID', `${where}: ${detail}`)
}

/**
 * Reads and validates the frozen W3-P3 pass-verdict envelope from disk:
 * missing → VERDICT_MISSING; unparseable or failing the frozen
 * stage-envelope.verification-verdict schema → VERDICT_INVALID; a rework
 * envelope → VERDICT_NOT_PASS; a receipt cross-check failure (locator missing
 * on disk, or on-disk hash differing from receipt.hash) →
 * VERDICT_RECEIPT_MISMATCH. P4 never proceeds on any of them.
 */
function intakePassEnvelope(
  workflowId: string,
  repoRoot: string,
): StageOutput<VerificationVerdict> {
  const envelopeAbs = join(repoRoot, 'docs', 'receipts', workflowId, ENVELOPE_FILENAME)
  let raw: string
  try {
    raw = readFileSync(envelopeAbs, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new HumanGateError(
        'VERDICT_MISSING',
        `No verification-verdict envelope exists at 'docs/receipts/${workflowId}/${ENVELOPE_FILENAME}'`,
      )
    }
    throw new HumanGateError(
      'VERDICT_INVALID',
      `Cannot read the verification-verdict envelope: ${String(err)}`,
    )
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new HumanGateError(
      'VERDICT_INVALID',
      `Verification-verdict envelope is not valid JSON: ${String(err)}`,
    )
  }
  if (!validateVerdictEnvelope(parsed)) {
    throw new HumanGateError(
      'VERDICT_INVALID',
      `Verification-verdict envelope fails the frozen stage-envelope.verification-verdict schema: ${ajv.errorsText(validateVerdictEnvelope.errors)}`,
    )
  }
  const envelope = parsed as StageOutput<VerificationVerdict>
  if (envelope.payload.verdict !== 'pass') {
    throw new HumanGateError(
      'VERDICT_NOT_PASS',
      `The verification verdict is '${envelope.payload.verdict}', not 'pass'; the human gate refuses rework envelopes`,
    )
  }
  // RH-1: shape-validate the locator BEFORE any path join — traversal,
  // absolute, backslash, and control-character locators are typed refusals
  // and never reach the filesystem.
  assertValidReceiptLocator(envelope.receipt.locator)
  // Cross-check: the envelope's receipt ref must resolve to an on-disk
  // receipt whose stored hash equals receipt.hash — a forged envelope must
  // not pass intake.
  const receiptAbs = join(repoRoot, ...envelope.receipt.locator.split('/'))
  let receiptParsed: Record<string, unknown>
  try {
    receiptParsed = JSON.parse(readFileSync(receiptAbs, 'utf8')) as Record<string, unknown>
  } catch (err) {
    throw new HumanGateError(
      'VERDICT_RECEIPT_MISMATCH',
      `The envelope's receipt.locator '${envelope.receipt.locator}' does not resolve to a readable on-disk receipt: ${String(err)}`,
    )
  }
  if (receiptParsed.hash !== envelope.receipt.hash) {
    throw new HumanGateError(
      'VERDICT_RECEIPT_MISMATCH',
      `The on-disk receipt at '${envelope.receipt.locator}' has hash ${JSON.stringify(receiptParsed.hash)} but the envelope claims ${JSON.stringify(envelope.receipt.hash)}`,
    )
  }
  return envelope
}

/** Chain walk via the shipped validator — the human never approves on top of a broken chain. */
function walkValidatedChain(workflowId: string, repoRoot: string): ScannedReceipt[] {
  const receipts = loadConformingReceipts(workflowId, repoRoot)
  const chain = receipts.map((entry) => entry.document as unknown as ReceiptDocument)
  const validation = validateChain(chain)
  if (!validation.valid) {
    throw new HumanGateError(
      'CHAIN_INVALID',
      `Receipt chain for workflow '${workflowId}' fails validateChain: ${validation.errors.join('; ')}`,
    )
  }
  return receipts
}

// ─── Input validation ─────────────────────────────────────────────────────────

function assertValidDecision(decision: HumanGateDecision): void {
  if (typeof decision !== 'object' || decision === null) {
    throw invalidInput('HumanGateDecision', 'must be an object')
  }
  if (decision.decision !== 'approve' && decision.decision !== 'decline') {
    throw invalidInput(
      'HumanGateDecision.decision',
      `must be 'approve' or 'decline', got ${JSON.stringify(decision.decision)}`,
    )
  }
  if (typeof decision.decidedBy !== 'string' || decision.decidedBy.length === 0) {
    throw invalidInput('HumanGateDecision.decidedBy', 'must be a non-empty string')
  }
  if (typeof decision.note !== 'string' || decision.note.length === 0) {
    throw invalidInput(
      'HumanGateDecision.note',
      'must be a non-empty string — the tap is chain evidence; silence never reads as approval',
    )
  }
}

function assertValidDispositions(dispositions: readonly Disposition[], findingCount: number): void {
  if (!Array.isArray(dispositions)) {
    throw invalidInput('HumanGateInput.dispositions', 'must be an array')
  }
  const seen = new Set<number>()
  for (let i = 0; i < dispositions.length; i++) {
    const entry: unknown = dispositions[i]
    if (typeof entry !== 'object' || entry === null) {
      throw invalidInput(`dispositions[${i}]`, 'must be an object')
    }
    const { findingIndex, disposition, note } = entry as Record<string, unknown>
    if (
      typeof findingIndex !== 'number' ||
      !Number.isInteger(findingIndex) ||
      findingIndex < 0 ||
      findingIndex >= findingCount
    ) {
      throw invalidInput(
        `dispositions[${i}].findingIndex`,
        `must be an integer in 0..${findingCount - 1}, got ${JSON.stringify(findingIndex)}`,
      )
    }
    if (disposition !== 'accept' && disposition !== 'rework') {
      throw invalidInput(
        `dispositions[${i}].disposition`,
        `must be 'accept' or 'rework', got ${JSON.stringify(disposition)}`,
      )
    }
    if (typeof note !== 'string' || note.length === 0) {
      throw invalidInput(`dispositions[${i}].note`, 'must be a non-empty string')
    }
    if (seen.has(findingIndex)) {
      throw invalidInput(
        `dispositions[${i}]`,
        `finding index ${findingIndex} has more than one disposition entry`,
      )
    }
    seen.add(findingIndex)
  }
}

function assertValidPackage(pkg: HumanGatePackage): void {
  if (typeof pkg !== 'object' || pkg === null) {
    throw invalidInput('HumanGatePackage', 'must be an object')
  }
  assertValidWorkflowId(pkg.workflowId)
  if (typeof pkg.ticketKey !== 'string' || pkg.ticketKey.length === 0) {
    throw invalidInput('HumanGatePackage.ticketKey', 'must be a non-empty string')
  }
  if (typeof pkg.targetStatus !== 'string' || pkg.targetStatus.length === 0) {
    throw invalidInput('HumanGatePackage.targetStatus', 'must be a non-empty string')
  }
  if (typeof pkg.summaryPath !== 'string' || pkg.summaryPath.length === 0) {
    throw invalidInput('HumanGatePackage.summaryPath', 'must be a non-empty string')
  }
  if (typeof pkg.repoRoot !== 'string' || pkg.repoRoot.length === 0) {
    throw invalidInput('HumanGatePackage.repoRoot', 'must be a non-empty string')
  }
}

// ─── Summary pre-draft ────────────────────────────────────────────────────────

function renderSummary(args: {
  readonly workflowId: string
  readonly ticketKey: string
  readonly targetStatus: string
  readonly envelope: StageOutput<VerificationVerdict>
  readonly dispositions: readonly Disposition[]
  readonly chain: readonly ScannedReceipt[]
}): string {
  const { workflowId, ticketKey, targetStatus, envelope, dispositions, chain } = args
  const claims = envelope.payload.harnessClaims
  const findings = envelope.payload.adversarialFindings
  const passCount = claims.filter((claim) => claim.passed).length

  const dispositionByIndex = new Map<number, Disposition>()
  for (const entry of dispositions) {
    dispositionByIndex.set(entry.findingIndex, entry)
  }

  const lines: string[] = []
  lines.push(`# Human review summary — workflow ${workflowId}`)
  lines.push('')
  lines.push(`Ticket: ${escapeTableCell(ticketKey)}`)
  lines.push(`Requested transition: ${escapeTableCell(targetStatus)}`)
  lines.push(`Verdict: ${envelope.payload.verdict}`)
  lines.push(`Verdict receipt: ${escapeTableCell(envelope.receipt.locator)}`)
  lines.push('')
  lines.push(`## Harness claims (${passCount}/${claims.length} passed)`)
  lines.push('')
  lines.push('| claim | passed | evidence |')
  lines.push('| --- | --- | --- |')
  for (const claim of claims) {
    lines.push(
      `| ${escapeTableCell(claim.claim)} | ${claim.passed} | ${escapeTableCell(claim.evidence)} |`,
    )
  }
  lines.push('')
  lines.push('## Adversarial findings disposition')
  lines.push('')
  lines.push('| # | severity | summary | citation | disposition | note |')
  lines.push('| --- | --- | --- | --- | --- | --- |')
  for (let i = 0; i < findings.length; i++) {
    const finding = findings[i] as (typeof findings)[number]
    const entry = dispositionByIndex.get(i)
    lines.push(
      `| ${i} | ${finding.severity} | ${escapeTableCell(finding.summary)} | ${escapeTableCell(finding.citation)} | ${entry === undefined ? '(none)' : entry.disposition} | ${entry === undefined ? '(none)' : escapeTableCell(entry.note)} |`,
    )
  }
  if (findings.length === 0) {
    lines.push('| — | — | (no adversarial findings) | — | — | — |')
  }
  lines.push('')
  lines.push('## Receipt chain (validated by validateChain)')
  lines.push('')
  lines.push('| sequence | stage | kind | claimRef | subjectKind | hash | locator |')
  lines.push('| --- | --- | --- | --- | --- | --- | --- |')
  for (const receipt of chain) {
    const doc = receipt.document
    lines.push(
      `| ${receipt.sequence} | ${escapeTableCell(String(doc.stage))} | ${escapeTableCell(String(doc.kind))} | ${escapeTableCell(String(doc.claimRef))} | ${escapeTableCell(String(doc.subjectKind))} | ${escapeTableCell(String(doc.hash))} | ${escapeTableCell(receipt.locator)} |`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

// ─── prepareHumanGate (Phase 1 — validates everything, writes only the summary)

export function prepareHumanGate(
  input: HumanGateInput,
  deps: PrepareHumanGateDeps = {},
): HumanGatePackage {
  if (typeof input !== 'object' || input === null) {
    throw invalidInput('HumanGateInput', 'must be an object')
  }
  // 1. workflowId before any filesystem access (AC-6).
  assertValidWorkflowId(input.workflowId)
  const repoRoot = input.repoRoot ?? process.cwd()
  if (typeof input.ticketKey !== 'string' || input.ticketKey.length === 0) {
    throw invalidInput('HumanGateInput.ticketKey', 'must be a non-empty string')
  }
  if (typeof input.targetStatus !== 'string' || input.targetStatus.length === 0) {
    throw invalidInput('HumanGateInput.targetStatus', 'must be a non-empty string')
  }
  // Default-deny: refuse to even assemble a package for a non-allowlisted key.
  assertHumanGateJiraGate(input.ticketKey)

  // 2. Precondition intake (typed refusals).
  const envelope = intakePassEnvelope(input.workflowId, repoRoot)

  // 3. Chain walk via the shipped validator.
  const chain = walkValidatedChain(input.workflowId, repoRoot)
  const tip = chain[chain.length - 1] as ScannedReceipt

  // 4. Disposition shape validation against the envelope's findings.
  assertValidDispositions(input.dispositions, envelope.payload.adversarialFindings.length)

  // 5. Summary pre-draft.
  const summaryText = renderSummary({
    workflowId: input.workflowId,
    ticketKey: input.ticketKey,
    targetStatus: input.targetStatus,
    envelope,
    dispositions: input.dispositions,
    chain,
  })

  // 6. Exclusive summary write — human-gate/ is invisible to every sibling scan.
  const summaryPath = `docs/receipts/${input.workflowId}/${SUMMARY_RELATIVE}`
  const summaryAbs = join(repoRoot, ...summaryPath.split('/'))
  if (existsSync(summaryAbs)) {
    throw new HumanGateError(
      'SUMMARY_EXISTS',
      `Refusing to overwrite the existing review summary at '${summaryPath}'`,
    )
  }
  const writeSummaryFn =
    deps.writeSummaryFn ??
    ((absPath: string, contents: string): void => {
      mkdirSync(dirname(absPath), { recursive: true })
      // flag wx: exclusive create — the summary is evidence, never clobbered.
      writeFileSync(absPath, contents, { encoding: 'utf8', flag: 'wx' })
    })
  try {
    writeSummaryFn(summaryAbs, summaryText)
  } catch (err) {
    if (err instanceof HumanGateError) throw err
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new HumanGateError(
        'SUMMARY_EXISTS',
        `Refusing to overwrite the existing review summary at '${summaryPath}'`,
      )
    }
    throw new HumanGateError(
      'SUMMARY_WRITE_FAILED',
      `Cannot write the review summary at '${summaryPath}': ${String(err)}`,
    )
  }

  const tipHash = tip.document.hash as string
  return {
    workflowId: input.workflowId,
    ticketKey: input.ticketKey,
    targetStatus: input.targetStatus,
    verdict: envelope.payload,
    envelope,
    summaryText,
    summaryPath,
    chainTip: { hash: tipHash, locator: tip.locator },
    repoRoot,
  }
}

// ─── Transition resolution (by NAME, never a raw id) ─────────────────────────

/**
 * Resolves the transition id by matching the coordinator-supplied target
 * status against the transition NAME only (RH-7): the `toStatus` field is
 * informational and is never matched — matching it would let a
 * differently-named transition fire on a status-name collision. A target
 * status not offered is JIRA_TRANSITION_UNAVAILABLE (never a raw-id write);
 * two transitions to the same name is likewise a typed refusal naming both
 * ids — ambiguity is a coordinator ruling, not an adapter guess.
 */
export function resolveTransitionId(
  transitions: readonly { id: string; name: string; toStatus: string }[],
  targetStatus: string,
): string {
  const matches = transitions.filter((transition) => transition.name === targetStatus)
  if (matches.length === 0) {
    throw new HumanGateError(
      'JIRA_TRANSITION_UNAVAILABLE',
      `No transition to status ${JSON.stringify(targetStatus)} is offered by the ticket's current workflow state (offered: ${transitions.map((t) => t.name).join(', ') || '(none)'})`,
    )
  }
  if (matches.length > 1) {
    throw new HumanGateError(
      'JIRA_TRANSITION_UNAVAILABLE',
      `Ambiguous transition to status ${JSON.stringify(targetStatus)}: ids [${matches.map((t) => t.id).join(', ')}] — ambiguity is a coordinator ruling, not an adapter guess`,
    )
  }
  return (matches[0] as { id: string }).id
}

// ─── Jira step (shared by executeHumanGate approve path and retryHalfClosed) ─

interface JiraStepSuccess {
  readonly ok: true
  readonly fromStatus: string
  readonly jiraCommentRef: string
}

interface JiraStepFailure {
  readonly ok: false
  readonly failedStep: 'transition' | 'comment'
  readonly errorMessage: string
}

/**
 * Step 2 of the approve path: gate assert, resolve transition id by target
 * status name, transition, then post the receipt-chain-link comment. Every
 * transport boundary is a typed try-catch; failures are RETURNED (the caller
 * records them as the half-closed state — PRF-12c), never thrown.
 *
 * skipTransitionIfUnavailable: the retry-after-comment-failure branch — an
 * already-transitioned ticket no longer offers the transition, which is
 * treated as satisfied, not an error (the transition is never re-fired
 * blindly).
 */
/** Failure text for the half-closed subject: typed codes stay visible. */
function describeError(err: unknown): string {
  if (err instanceof HumanGateError) return `${err.code}: ${err.message}`
  return String(err)
}

async function performJiraStep(args: {
  readonly transport: HumanGateJiraTransport
  readonly ticketKey: string
  readonly targetStatus: string
  readonly commentBody: string
  readonly skipTransitionIfUnavailable: boolean
}): Promise<JiraStepSuccess | JiraStepFailure> {
  const { transport, ticketKey, targetStatus, commentBody } = args

  // The live current status is not exposed by the transitions list; recorded
  // as 'unknown' pending the coordinator's VERIFY-AT-PROBE evidence.
  const fromStatus = 'unknown'

  try {
    assertHumanGateJiraGate(ticketKey)
    let transitions: readonly { id: string; name: string; toStatus: string }[]
    try {
      transitions = await transport.getTransitions(ticketKey)
    } catch (err) {
      return { ok: false, failedStep: 'transition', errorMessage: describeError(err) }
    }
    let transitionId: string | null = null
    try {
      transitionId = resolveTransitionId(transitions, targetStatus)
    } catch (err) {
      if (
        args.skipTransitionIfUnavailable &&
        err instanceof HumanGateError &&
        err.code === 'JIRA_TRANSITION_UNAVAILABLE'
      ) {
        // Already transitioned (the target is no longer offered): satisfied.
        transitionId = null
      } else {
        return { ok: false, failedStep: 'transition', errorMessage: describeError(err) }
      }
    }
    if (transitionId !== null) {
      try {
        await transport.transitionIssue(ticketKey, transitionId)
      } catch (err) {
        return { ok: false, failedStep: 'transition', errorMessage: describeError(err) }
      }
    }
    let jiraCommentRef: string
    try {
      jiraCommentRef = await transport.addComment(ticketKey, commentBody)
    } catch (err) {
      return { ok: false, failedStep: 'comment', errorMessage: describeError(err) }
    }
    return { ok: true, fromStatus, jiraCommentRef }
  } catch (err) {
    // Defensive: no foreign exception escapes (lesson #22); an unexpected
    // synchronous throw is still a recorded transition-step failure.
    return { ok: false, failedStep: 'transition', errorMessage: describeError(err) }
  }
}

function buildCommentBody(args: {
  readonly workflowId: string
  readonly verdictReceiptLocator: string
  readonly chainTipHash: string
  readonly summaryPath: string
}): string {
  // Minimal by design: no finding text is posted to Jira (untrusted reviewer
  // text stays out of ticket comments).
  return [
    `Foreman Line Stage-D human gate approved for workflow ${args.workflowId}.`,
    `Verdict receipt: ${args.verdictReceiptLocator}`,
    `Receipt chain tip hash: ${args.chainTipHash}`,
    `Review summary: ${args.summaryPath}`,
  ].join('\n')
}

// ─── executeHumanGate (Phase 2 — side-effectful, ordered) ────────────────────

/**
 * Builds the { kind: 'closed' } result referencing an EXISTING closure
 * sub-receipt — the idempotent no-op shared by the executeHumanGate RH-3
 * pre-check and retryHalfClosed step 1 (zero writes, zero transport calls).
 */
function closedResultFromClosure(closure: ScannedReceipt): HumanGateResult {
  const subject = subjectRecord(closure)
  const transition = subject.ticketTransition
  const ticketTransition =
    typeof transition === 'object' && transition !== null && !Array.isArray(transition)
      ? {
          fromStatus: String((transition as Record<string, unknown>).fromStatus),
          toStatus: String((transition as Record<string, unknown>).toStatus),
        }
      : { fromStatus: 'unknown', toStatus: 'unknown' }
  return { kind: 'closed', closureReceiptLocator: closure.locator, ticketTransition }
}

export async function executeHumanGate(
  pkg: HumanGatePackage,
  decision: HumanGateDecision,
  deps: ExecuteHumanGateDeps = {},
): Promise<HumanGateResult> {
  assertValidPackage(pkg)
  assertValidDecision(decision)
  const { workflowId, repoRoot } = pkg

  // RH-3 idempotency pre-check — BEFORE any write or Jira call, for both
  // decisions: if the Stage-D closure sub-receipt already exists on disk the
  // gate has already closed, and this call is a typed no-op returning the
  // existing closure (never a second approval receipt, never a second Jira
  // call — the W3-P3 RP-1/RP-3 precedent).
  const existingClosure = findByClaimRef(
    loadConformingReceipts(workflowId, repoRoot),
    CLAIM_CLOSURE,
  )
  if (existingClosure !== undefined) {
    return closedResultFromClosure(existingClosure)
  }

  // The precondition is mechanical for DIRECT invocation too: re-run the
  // envelope intake and chain walk from disk — no code path reaches a Jira
  // write or a receipt without a schema-valid pass envelope whose receipt
  // cross-check passes and whose chain validates.
  const envelope = intakePassEnvelope(workflowId, repoRoot)
  walkValidatedChain(workflowId, repoRoot)
  const verdictReceipt: JsonValue = {
    hash: envelope.receipt.hash,
    locator: envelope.receipt.locator,
  }

  if (decision.decision === 'decline') {
    // Decline: exactly one declined sub-receipt; NO Jira call of any kind.
    const declineReceiptLocator = emitStageDReceipt({
      workflowId,
      repoRoot,
      claimRef: CLAIM_DECLINED,
      subjectKind: 'HumanGateDecision',
      subject: {
        decision: 'declined',
        decidedBy: decision.decidedBy,
        note: decision.note,
        summaryPath: pkg.summaryPath,
        verdictReceipt,
      },
      writeReceiptFn: deps.writeReceiptFn,
    })
    return { kind: 'declined', declineReceiptLocator }
  }

  // Approve path. The transport must exist BEFORE the approval receipt lands
  // (an approval that could never reach Jira should not be recorded here).
  const transport = deps.transport
  if (transport === undefined) {
    throw invalidInput(
      'ExecuteHumanGateDeps.transport',
      'a HumanGateJiraTransport is required on the approve path',
    )
  }
  // Gate assert before any write or client call (default-deny).
  assertHumanGateJiraGate(pkg.ticketKey)

  // 1. Approval sub-receipt — on disk BEFORE the first Jira call (PRF-12c).
  const approvalReceiptLocator = emitStageDReceipt({
    workflowId,
    repoRoot,
    claimRef: CLAIM_APPROVED,
    subjectKind: 'HumanGateDecision',
    subject: {
      decision: 'approved',
      decidedBy: decision.decidedBy,
      note: decision.note,
      summaryPath: pkg.summaryPath,
      // ticketKey/requestedStatus are carried so the RH-8 crash-recovery
      // path (approval landed, process died before any Jira receipt) is
      // fully disk-derivable.
      ticketKey: pkg.ticketKey,
      requestedStatus: pkg.targetStatus,
      verdictReceipt,
    },
    writeReceiptFn: deps.writeReceiptFn,
  })

  // 2. Jira transition + receipt-chain-link comment.
  const outcome = await performJiraStep({
    transport,
    ticketKey: pkg.ticketKey,
    targetStatus: pkg.targetStatus,
    commentBody: buildCommentBody({
      workflowId,
      verdictReceiptLocator: envelope.receipt.locator,
      chainTipHash: pkg.chainTip.hash,
      summaryPath: pkg.summaryPath,
    }),
    skipTransitionIfUnavailable: false,
  })

  // 3. Any Jira failure after approval is the named half-closed state —
  //    a returned discriminant, never a thrown error (PRF-12c).
  if (!outcome.ok) {
    const halfClosedReceiptLocator = emitStageDReceipt({
      workflowId,
      repoRoot,
      claimRef: CLAIM_HALF_CLOSED,
      subjectKind: 'HalfClosedState',
      subject: {
        ticketKey: pkg.ticketKey,
        requestedStatus: pkg.targetStatus,
        failedStep: outcome.failedStep,
        errorMessage: outcome.errorMessage,
        approvalReceiptLocator,
      },
      writeReceiptFn: deps.writeReceiptFn,
    })
    return { kind: 'half-closed', approvalReceiptLocator, halfClosedReceiptLocator }
  }

  // 4. Stage-D closure sub-receipt (never the frozen Stage-F envelope).
  const ticketTransition = { fromStatus: outcome.fromStatus, toStatus: pkg.targetStatus }
  const closureReceiptLocator = emitStageDReceipt({
    workflowId,
    repoRoot,
    claimRef: CLAIM_CLOSURE,
    subjectKind: 'StageDClosure',
    subject: {
      ticketKey: pkg.ticketKey,
      ticketTransition,
      approvalReceiptLocator,
      jiraCommentRef: outcome.jiraCommentRef,
      summaryPath: pkg.summaryPath,
      verdictReceipt,
    },
    writeReceiptFn: deps.writeReceiptFn,
  })
  return { kind: 'closed', closureReceiptLocator, ticketTransition }
}

// ─── retryHalfClosed (PRF-12c coordinator retry — idempotent, disk-derived) ──

function findByClaimRef(
  receipts: readonly ScannedReceipt[],
  claimRef: string,
): ScannedReceipt | undefined {
  let found: ScannedReceipt | undefined
  for (const receipt of receipts) {
    if (receipt.document.claimRef === claimRef) found = receipt // highest sequence wins
  }
  return found
}

function subjectRecord(receipt: ScannedReceipt): Record<string, unknown> {
  const subject = receipt.document.subject
  if (typeof subject !== 'object' || subject === null || Array.isArray(subject)) {
    throw new HumanGateError(
      'SEQUENCE_READ_FAILED',
      `Receipt '${receipt.locator}' has no object 'subject'`,
    )
  }
  return subject as Record<string, unknown>
}

function requireString(record: Record<string, unknown>, key: string, locator: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new HumanGateError(
      'SEQUENCE_READ_FAILED',
      `Receipt '${locator}' subject is missing a non-empty string '${key}'`,
    )
  }
  return value
}

export async function retryHalfClosed(
  workflowId: string,
  deps: RetryHalfClosedDeps,
): Promise<HumanGateResult> {
  // Pre-flight from disk, never from session state.
  assertValidWorkflowId(workflowId)
  if (typeof deps !== 'object' || deps === null || deps.transport === undefined) {
    throw invalidInput(
      'RetryHalfClosedDeps.transport',
      'a HumanGateJiraTransport is required for the retry',
    )
  }
  const repoRoot = deps.repoRoot ?? process.cwd()
  const receipts = loadConformingReceipts(workflowId, repoRoot)

  // 1. Closure already exists: a repeat retry after success is a no-op —
  //    zero transport calls, zero writes, no duplicate closure receipt, no
  //    second Jira transition.
  const closure = findByClaimRef(receipts, CLAIM_CLOSURE)
  if (closure !== undefined) {
    return closedResultFromClosure(closure)
  }

  // 2. Retry never substitutes for approval.
  const approval = findByClaimRef(receipts, CLAIM_APPROVED)
  if (approval === undefined) {
    throw new HumanGateError(
      'APPROVAL_MISSING',
      `No 'human-gate-approved' sub-receipt exists on the chain for workflow '${workflowId}'; retry never substitutes for approval`,
    )
  }
  // RH-8 crash recovery: an approval with NO half-closed sub-receipt and no
  // closure is the documented crash-between-approval-and-Jira state (the
  // process died after the approval landed but before either the half-closed
  // receipt or the closure). It is recovered, not refused: ticketKey and
  // requestedStatus are read from the approval receipt's subject, and the
  // Jira steps resume with already-transitioned-is-satisfied behavior (the
  // transition may or may not have fired before the crash, so it is verified
  // against the live transitions list, never re-fired blindly). The approval
  // is never re-asked.
  const halfClosed = findByClaimRef(receipts, CLAIM_HALF_CLOSED)

  // Mechanical precondition holds for the retry too.
  const envelope = intakePassEnvelope(workflowId, repoRoot)
  walkValidatedChain(workflowId, repoRoot)

  const approvalSubject = subjectRecord(approval)
  const stateReceipt = halfClosed ?? approval
  const stateSubject = halfClosed === undefined ? approvalSubject : subjectRecord(halfClosed)
  const ticketKey = requireString(stateSubject, 'ticketKey', stateReceipt.locator)
  const requestedStatus = requireString(stateSubject, 'requestedStatus', stateReceipt.locator)
  // Crash recovery cannot know whether the transition fired; a recorded
  // 'comment' failure proves it did. Either way the transition is verified
  // against the live list and an already-done transition is satisfied.
  const transitionMayHaveFired =
    halfClosed === undefined || subjectRecord(halfClosed).failedStep === 'comment'
  const summaryPath = requireString(approvalSubject, 'summaryPath', approval.locator)
  const verdictReceipt: JsonValue = {
    hash: envelope.receipt.hash,
    locator: envelope.receipt.locator,
  }

  const tipHash = (receipts[receipts.length - 1] as ScannedReceipt).document.hash

  // 3. Re-run step 2 of the approve path. If the recorded failedStep is
  //    'comment', the transition already succeeded once — it is verified via
  //    the live transitions list and skipped when no longer offered, never
  //    re-fired blindly.
  const outcome = await performJiraStep({
    transport: deps.transport,
    ticketKey,
    targetStatus: requestedStatus,
    commentBody: buildCommentBody({
      workflowId,
      verdictReceiptLocator: envelope.receipt.locator,
      chainTipHash: typeof tipHash === 'string' ? tipHash : '(unknown)',
      summaryPath,
    }),
    skipTransitionIfUnavailable: transitionMayHaveFired,
  })

  if (!outcome.ok) {
    // Each attempt is chain evidence: a further half-closed sub-receipt.
    const halfClosedReceiptLocator = emitStageDReceipt({
      workflowId,
      repoRoot,
      claimRef: CLAIM_HALF_CLOSED,
      subjectKind: 'HalfClosedState',
      subject: {
        ticketKey,
        requestedStatus,
        failedStep: outcome.failedStep,
        errorMessage: outcome.errorMessage,
        approvalReceiptLocator: approval.locator,
      },
      writeReceiptFn: deps.writeReceiptFn,
    })
    return {
      kind: 'half-closed',
      approvalReceiptLocator: approval.locator,
      halfClosedReceiptLocator,
    }
  }

  const ticketTransition = { fromStatus: outcome.fromStatus, toStatus: requestedStatus }
  const closureReceiptLocator = emitStageDReceipt({
    workflowId,
    repoRoot,
    claimRef: CLAIM_CLOSURE,
    subjectKind: 'StageDClosure',
    subject: {
      ticketKey,
      ticketTransition,
      approvalReceiptLocator: approval.locator,
      jiraCommentRef: outcome.jiraCommentRef,
      summaryPath,
      verdictReceipt,
    },
    writeReceiptFn: deps.writeReceiptFn,
  })
  return { kind: 'closed', closureReceiptLocator, ticketTransition }
}

export { createHumanGateJiraAdapter } from './adapter.js'
