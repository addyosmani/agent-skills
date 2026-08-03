/**
 * Deterministic Verification Harness (W3-P1) — the first layer of Stage D
 * (FOREMAN-LINE-PLAN §2 Stage D.1).
 *
 * Three public functions:
 *   recordBuildResult — the Stage-C → Stage-D bridge sub-receipt (ruling F4)
 *   allocateSequence  — disk-scan sequence/prevHash allocator (ruling F6)
 *   runHarness        — AC extraction + named-test mapping + verifier-side
 *                       matrix checks + one Stage-D claim sub-receipt per check
 *
 * The harness produces evidence; it never assembles the pass/rework verdict
 * (that is W3-P3). It is read-only relative to the target parcel; its only
 * writes are Stage-D receipt files under docs/receipts/<workflowId>/.
 *
 * Lessons discipline:
 *   #19 — AC-label extraction and test-name matching are linear-time
 *         (char-code loops / indexOf / startsWith); no regex over spec-body
 *         or test-name text.
 *   #22 — every external call (spec read, dispatch-receipt read, receipt-dir
 *         scan, receipt write, matrix YAML parse, MatrixCheck invocation) is
 *         wrapped in a typed try-catch rethrowing VerificationError.
 *
 * Chain identity: Stage-D sub-receipts inherit correlation.workflowId and
 * correlation.correlationId from the receipt they chain from, minting fresh
 * sessionId/runId for the current verification session. Fresh correlation
 * generation is forbidden here — it breaks validateChain AC5c.
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Ajv } from 'ajv'
import type { JsonValue } from '../../../approval/src/index.js'
import {
  canonicalize,
  RECEIPT_SCHEMA_VERSION,
  sha256Hex,
  writeReceiptDocument,
} from '../../../approval/src/index.js'
import type {
  CorrelationContext,
  CorrelationId,
  RunId,
  SessionId,
  StageId,
  WorkflowId,
} from '../../../contracts/src/index.js'
import { STAGE_IDS, UUID_PATTERN } from '../../../contracts/src/index.js'
import type { BuildResult, DispatchOrder } from '../../../contracts/src/stages/c-dispatch.js'
import { buildResultSchema } from '../../../contracts/src/stages/c-dispatch.js'
import type { HarnessClaimResult } from '../../../contracts/src/stages/d-verification.js'
import type { ReceiptDocument } from '../../../receipts/src/index.js'
import { receiptPath, validateReceiptDocument } from '../../../receipts/src/index.js'
import type { SkillInjectionMatrix } from '../../../skill-injection/src/index.js'
import {
  parseSkillInjectionMatrixYaml,
  validateSkillInjectionMatrix,
} from '../../../skill-injection/src/index.js'

// ─── Error class ──────────────────────────────────────────────────────────────

export type VerificationErrorCode =
  | 'SPEC_UNREADABLE'
  | 'SPEC_INVALID'
  | 'DISPATCH_RECEIPT_UNREADABLE'
  | 'SEQUENCE_READ_FAILED'
  | 'MATRIX_UNREADABLE'
  | 'MATRIX_INVALID'
  | 'MATRIX_CHECK_MISSING'
  | 'MATRIX_CHECK_FAILED'
  | 'RECEIPT_WRITE_FAILED'
  | 'BUILD_RESULT_INVALID'
  | 'CHAIN_TIP_MISMATCH'
  | 'WORKFLOW_ID_INVALID'
  | 'RECEIPT_EXISTS'

export class VerificationError extends Error {
  readonly code: VerificationErrorCode

  constructor(code: VerificationErrorCode, message: string) {
    super(message)
    this.name = 'VerificationError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TestResults {
  readonly passed: readonly string[]
  readonly failed: readonly string[]
}

export interface MatrixCheckResult {
  readonly passed: boolean
  readonly evidence: string
}

export type MatrixCheck = (
  workflowId: string,
  surfaces: readonly string[],
) => Promise<MatrixCheckResult>

export interface MatrixCheckSet {
  readonly [checkName: string]: MatrixCheck
}

export interface HarnessInput {
  /** Receipt-dir UUID (matches UUID_PATTERN). */
  readonly workflowId: string
  /** Carries parcelRef (the ticket key). */
  readonly order: DispatchOrder
  /** branch, commitShas, touchedSurfaces from Stage C. */
  readonly buildResult: BuildResult
  /** Coordinator-resolved from parcelRef (active/). */
  readonly specPath: string
  readonly testResults: TestResults
  readonly matrixChecks: MatrixCheckSet
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

export interface HarnessResult {
  /** AC claims followed by matrix-check claims. */
  readonly claims: readonly HarnessClaimResult[]
  /** Aligned one-to-one with `claims`. */
  readonly receiptLocators: readonly string[]
  /** true iff any claim.passed === false. */
  readonly blocked: boolean
}

/** Repo-relative path of the named-test convention doc this parcel delivers. */
export const AC_CONVENTION_PATH = 'plugins/foreman-line/verification/AC-CONVENTION.md'

// ─── Constants / module-level setup ──────────────────────────────────────────

const MATRIX_REPO_PATH = 'plugins/foreman-line/skill-injection/skill-injection.yaml'

const ajv = new Ajv()
const validateBuildResultSubject = ajv.compile(buildResultSchema)

// ─── Linear-time character helpers (lesson #19) ──────────────────────────────

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
}

function isAlphaNumCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
}

function isSlugCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45
}

// ─── allocateSequence (ruling F6) ─────────────────────────────────────────────

/**
 * A filename conforms to the 6-digit-prefix receipt convention
 * (`^\d{6}-<stage>-<slug>.json`, per receipts/src/paths.ts) iff: six ASCII
 * digits, '-', a StageId letter, '-', a non-empty [a-z0-9-] slug, '.json'.
 * Checked with char-code loops only.
 */
function isConformingReceiptName(name: string): boolean {
  // minimal: 6 digits + '-' + stage + '-' + 1 slug char + '.json' = 15 chars
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

/** Linear-time integer parse of the 6-char prefix (not a backtracking regex). */
function parseSequencePrefix(name: string): number {
  let value = 0
  for (let i = 0; i < 6; i++) {
    value = value * 10 + (name.charCodeAt(i) - 48)
  }
  return value
}

function isHexCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 102) || (code >= 65 && code <= 70)
}

/** Hyphenated 8-4-4-4-12 hex group lengths of `UUID_PATTERN`. */
const UUID_GROUP_LENGTHS = [8, 4, 4, 4, 12] as const

/**
 * Linear-time (char-code loop, lesson #19) equivalent of `UUID_PATTERN`
 * (`contracts/src/correlation.ts`): hyphenated 8-4-4-4-12 hex, any casing,
 * no version/variant nibble pinned.
 */
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
 * Guard (RF-3): `workflowId` is joined into `docs/receipts/<workflowId>/`, so
 * every entry point validates it against the frozen `UUID_PATTERN` before any
 * filesystem access — traversal input like '../../..' fails loud with a typed
 * error, never reaching readdir/read/write.
 */
function assertValidWorkflowId(workflowId: string): void {
  if (!matchesUuidPattern(workflowId)) {
    throw new VerificationError(
      'WORKFLOW_ID_INVALID',
      `workflowId must match UUID_PATTERN (${UUID_PATTERN}) before any filesystem access, got ${JSON.stringify(workflowId)}`,
    )
  }
}

interface ChainTip {
  readonly sequence: number
  readonly prevHash: string | null
  /** Parsed highest-sequence receipt document, or null for an empty chain. */
  readonly tipDocument: Record<string, unknown> | null
}

function receiptsDir(workflowId: string, repoRoot: string): string {
  return join(repoRoot, 'docs', 'receipts', workflowId)
}

function scanChainTip(workflowId: string, repoRoot: string): ChainTip {
  const dir = receiptsDir(workflowId, repoRoot)
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { sequence: 0, prevHash: null, tipDocument: null }
    }
    throw new VerificationError(
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
    return { sequence: 0, prevHash: null, tipDocument: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(join(dir, highestName), 'utf8'))
  } catch (err) {
    throw new VerificationError(
      'SEQUENCE_READ_FAILED',
      `Cannot read highest-sequence receipt '${highestName}' in '${dir}': ${String(err)}`,
    )
  }
  const tipDocument = parsed as Record<string, unknown>
  const hash = tipDocument.hash
  if (typeof hash !== 'string' || hash.length === 0) {
    throw new VerificationError(
      'SEQUENCE_READ_FAILED',
      `Highest-sequence receipt '${highestName}' in '${dir}' has no string 'hash' field`,
    )
  }
  return { sequence: highestSequence + 1, prevHash: hash, tipDocument }
}

/**
 * Scans `docs/receipts/<workflowId>/`, considering only files whose names
 * match the 6-digit-prefix receipt convention; returns `sequence = highest + 1`
 * and `prevHash = the hash field of the highest-sequence receipt` — both from
 * disk, never session state. An empty (or absent) directory yields
 * `{ sequence: 0, prevHash: null }`.
 */
export function allocateSequence(
  workflowId: string,
  repoRoot: string = process.cwd(),
): { sequence: number; prevHash: string | null } {
  assertValidWorkflowId(workflowId)
  const tip = scanChainTip(workflowId, repoRoot)
  return { sequence: tip.sequence, prevHash: tip.prevHash }
}

// ─── Correlation inheritance (validateChain AC5c) ─────────────────────────────

function inheritCorrelation(
  source: Record<string, unknown>,
  sessionId: string,
  runId: string,
  failCode: VerificationErrorCode,
  sourceLabel: string,
): CorrelationContext {
  const correlation = source.correlation
  if (typeof correlation !== 'object' || correlation === null || Array.isArray(correlation)) {
    throw new VerificationError(failCode, `${sourceLabel} has no 'correlation' object`)
  }
  const { workflowId, correlationId } = correlation as Record<string, unknown>
  if (typeof workflowId !== 'string' || typeof correlationId !== 'string') {
    throw new VerificationError(
      failCode,
      `${sourceLabel} correlation is missing string workflowId/correlationId`,
    )
  }
  return {
    correlationId: correlationId as CorrelationId,
    sessionId: sessionId as SessionId,
    workflowId: workflowId as WorkflowId,
    runId: runId as RunId,
  }
}

// ─── Stage-D claim sub-receipt writer ─────────────────────────────────────────

/**
 * Exported for direct testing of the RF-4 exclusive-write guard (the guard
 * defends the allocate→write window, which fixture planting cannot reach
 * through the public API without first tripping the chain-tip scan).
 * Not part of the package barrel (AC-4).
 */
export function writeClaimReceipt(args: {
  readonly workflowId: string
  readonly repoRoot: string
  readonly claimRef: string
  readonly subjectKind: string
  readonly subject: JsonValue
  readonly sequence: number
  readonly prevHash: string | null
  readonly correlation: CorrelationContext
}): string {
  try {
    const locator = receiptPath(args.workflowId, args.sequence, 'D', args.subjectKind)
    const draft = {
      schemaVersion: RECEIPT_SCHEMA_VERSION,
      kind: 'claim' as const,
      stage: 'D' as const,
      claimRef: args.claimRef,
      correlation: args.correlation,
      sequence: args.sequence,
      prevHash: args.prevHash,
      timestamp: new Date().toISOString(),
      subjectKind: args.subjectKind,
      subject: args.subject,
      signature: null,
    }
    const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
    const document = { ...draft, hash } as unknown as ReceiptDocument

    const validation = validateReceiptDocument(document)
    if (!validation.valid) {
      throw new VerificationError(
        'RECEIPT_WRITE_FAILED',
        `Stage-D claim receipt failed validateReceiptDocument: ${validation.errors.join('; ')}`,
      )
    }

    // RF-4: exclusive-write guard — the frozen writeReceiptDocument
    // overwrites unconditionally, so the harness refuses first. A receipt is
    // append-only evidence; an existing file at the allocated path is a
    // sequence collision or tampering, never something to overwrite.
    const targetAbsPath = join(args.repoRoot, ...locator.split('/'))
    if (existsSync(targetAbsPath)) {
      throw new VerificationError(
        'RECEIPT_EXISTS',
        `Refusing to overwrite existing receipt at '${locator}' (resolved '${targetAbsPath}')`,
      )
    }
    writeReceiptDocument(document, locator, args.repoRoot)
    return locator
  } catch (err) {
    if (err instanceof VerificationError) throw err
    throw new VerificationError('RECEIPT_WRITE_FAILED', `Receipt write failed: ${String(err)}`)
  }
}

// ─── recordBuildResult (ruling F4) ────────────────────────────────────────────

/**
 * The Stage-C → Stage-D bridge. Reads the Stage-C dispatch receipt at
 * `dispatchReceiptLocator` for its `hash` (used as `prevHash` — the
 * authoritative source per ruling F4) and its `correlation` (chain identity),
 * validates `{ branch, commitShas, touchedSurfaces }` against the frozen
 * `buildResultSchema`, writes the `BuildResult` claim sub-receipt, and
 * returns its locator.
 */
export function recordBuildResult(
  workflowId: string,
  dispatchReceiptLocator: string,
  branch: string,
  commitShas: readonly string[],
  touchedSurfaces: readonly string[],
  repoRoot: string = process.cwd(),
): string {
  assertValidWorkflowId(workflowId)
  const absPath = join(repoRoot, ...dispatchReceiptLocator.split('/'))
  let dispatchReceipt: Record<string, unknown>
  try {
    dispatchReceipt = JSON.parse(readFileSync(absPath, 'utf8')) as Record<string, unknown>
  } catch (err) {
    throw new VerificationError(
      'DISPATCH_RECEIPT_UNREADABLE',
      `Cannot read Stage-C dispatch receipt at '${absPath}': ${String(err)}`,
    )
  }
  const dispatchHash = dispatchReceipt.hash
  if (typeof dispatchHash !== 'string' || dispatchHash.length === 0) {
    throw new VerificationError(
      'DISPATCH_RECEIPT_UNREADABLE',
      `Stage-C dispatch receipt at '${absPath}' is missing a string 'hash' field`,
    )
  }

  const subject = {
    branch,
    commitShas: [...commitShas],
    touchedSurfaces: [...touchedSurfaces],
  }
  if (!validateBuildResultSubject(subject)) {
    // RF-1: a pre-write schema failure means the builder emitted an invalid
    // BuildResult (routes to rework) — distinct from RECEIPT_WRITE_FAILED
    // (disk/infra failure at the write boundary; routes to retry).
    throw new VerificationError(
      'BUILD_RESULT_INVALID',
      `BuildResult subject failed frozen buildResultSchema validation: ${ajv.errorsText(
        validateBuildResultSubject.errors,
      )}`,
    )
  }

  // RF-2: chain-source consistency guard — the on-disk chain tip must be the
  // dispatch receipt the caller named, or the write would fork the chain.
  const { sequence, prevHash: tipHash } = allocateSequence(workflowId, repoRoot)
  if (tipHash !== dispatchHash) {
    throw new VerificationError(
      'CHAIN_TIP_MISMATCH',
      `Chain tip hash ${JSON.stringify(tipHash)} for workflow '${workflowId}' does not equal the hash of the dispatch receipt at '${dispatchReceiptLocator}' (${JSON.stringify(dispatchHash)}); a stale or adversarial locator would fork the chain`,
    )
  }
  const correlation = inheritCorrelation(
    dispatchReceipt,
    randomUUID(),
    randomUUID(),
    'DISPATCH_RECEIPT_UNREADABLE',
    `Stage-C dispatch receipt at '${absPath}'`,
  )

  return writeClaimReceipt({
    workflowId,
    repoRoot,
    claimRef: 'build-result',
    subjectKind: 'BuildResult',
    subject,
    sequence,
    prevHash: dispatchHash,
    correlation,
  })
}

// ─── AC-label extraction (AC-CONVENTION §3; linear-time, lesson #19) ─────────

interface AcEntry {
  readonly label: string
  readonly number: number
  readonly text: string
}

function extractAcs(specText: string): AcEntry[] {
  const entries: AcEntry[] = []
  const seen = new Set<number>()
  const length = specText.length
  let lineStart = 0
  while (lineStart <= length) {
    let lineEnd = specText.indexOf('\n', lineStart)
    if (lineEnd === -1) lineEnd = length
    if (specText.startsWith('AC-', lineStart)) {
      let i = lineStart + 3
      let value = 0
      let digits = 0
      while (i < lineEnd && isDigitCode(specText.charCodeAt(i))) {
        value = value * 10 + (specText.charCodeAt(i) - 48)
        i += 1
        digits += 1
      }
      if (digits > 0 && i < lineEnd && specText.charCodeAt(i) === 58 /* ':' */) {
        // RF-6: duplicate AC-N labels are a spec defect (AC-CONVENTION §2:
        // one criterion per ID) — fail loud, never silently dedupe.
        if (seen.has(value)) {
          throw new VerificationError(
            'SPEC_INVALID',
            `Duplicate acceptance-criterion label 'AC-${value}' (AC-CONVENTION §2: one criterion per sequential ID)`,
          )
        }
        seen.add(value)
        entries.push({
          label: `AC-${value}`,
          number: value,
          text: specText.slice(i + 1, lineEnd).trim(),
        })
      }
    }
    lineStart = lineEnd + 1
  }
  // RF-6: IDs must be sequential from AC-1 with no gaps (AC-CONVENTION §2).
  for (let k = 0; k < entries.length; k++) {
    const entry = entries[k] as AcEntry
    if (entry.number !== k + 1) {
      throw new VerificationError(
        'SPEC_INVALID',
        `Acceptance-criterion labels must be sequential from AC-1 with no gaps (AC-CONVENTION §2); expected 'AC-${k + 1}' but found '${entry.label}'`,
      )
    }
  }
  return entries
}

/**
 * Token-boundary AC reference check (AC-CONVENTION §4): a test name
 * references AC-N iff it contains 'AC-' at a non-alphanumeric left boundary
 * followed by exactly the digits of N right-bounded by a non-digit — so
 * 'AC-1' never matches a test named for 'AC-10'. indexOf/charCode only.
 */
function referencesAc(testName: string, acNumber: number): boolean {
  let from = 0
  const length = testName.length
  while (from < length) {
    const idx = testName.indexOf('AC-', from)
    if (idx === -1) return false
    from = idx + 3
    if (idx > 0 && isAlphaNumCode(testName.charCodeAt(idx - 1))) continue
    let i = idx + 3
    let value = 0
    let digits = 0
    while (i < length && isDigitCode(testName.charCodeAt(i))) {
      value = value * 10 + (testName.charCodeAt(i) - 48)
      i += 1
      digits += 1
    }
    if (digits === 0) continue
    // The greedy integer parse implicitly enforces the right boundary: parsing 'AC-10'
    // yields value=10, never value=1, so AC-1 cannot match AC-10. No explicit
    // right-boundary char check is needed — the integer comparison is the guard.
    if (value === acNumber) return true
    from = i
  }
  return false
}

// ─── Named-test mapping (AC-CONVENTION §5) ────────────────────────────────────

function mapAcClaim(ac: AcEntry, testResults: TestResults): HarnessClaimResult {
  const claim = ac.text.length > 0 ? `${ac.label}: ${ac.text}` : ac.label
  const coveringPassed: string[] = []
  const coveringFailed: string[] = []
  for (const name of testResults.passed) {
    if (referencesAc(name, ac.number)) coveringPassed.push(name)
  }
  for (const name of testResults.failed) {
    if (referencesAc(name, ac.number)) coveringFailed.push(name)
  }
  if (coveringPassed.length === 0 && coveringFailed.length === 0) {
    return { claim, passed: false, evidence: `no test references ${ac.label}` }
  }
  if (coveringFailed.length > 0) {
    // AC-CONVENTION §5: any covering test failing fails the claim; evidence
    // cites the failing covering test name(s), comma-joined.
    return { claim, passed: false, evidence: coveringFailed.join(', ') }
  }
  // AC-CONVENTION §5: all covering tests passed; evidence is never empty here.
  return { claim, passed: true, evidence: coveringPassed.join(', ') }
}

// ─── Verifier-side matrix resolution (frozen path-segment glob rule) ──────────

function loadMatrix(repoRoot: string): SkillInjectionMatrix {
  let rawYaml: string
  try {
    rawYaml = readFileSync(join(repoRoot, ...MATRIX_REPO_PATH.split('/')), 'utf8')
  } catch (err) {
    throw new VerificationError(
      'MATRIX_UNREADABLE',
      `Cannot read skill-injection matrix at ${MATRIX_REPO_PATH}: ${String(err)}`,
    )
  }
  let parsed: unknown
  try {
    parsed = parseSkillInjectionMatrixYaml(rawYaml)
  } catch (err) {
    throw new VerificationError(
      'MATRIX_INVALID',
      `Cannot parse skill-injection matrix YAML at ${MATRIX_REPO_PATH}: ${String(err)}`,
    )
  }
  let validation: { valid: boolean; errors: readonly string[] }
  try {
    validation = validateSkillInjectionMatrix(parsed)
  } catch (err) {
    throw new VerificationError(
      'MATRIX_INVALID',
      `Unexpected error validating skill-injection matrix: ${String(err)}`,
    )
  }
  if (!validation.valid) {
    throw new VerificationError(
      'MATRIX_INVALID',
      `Skill-injection matrix is invalid: ${validation.errors.join('; ')}`,
    )
  }
  return parsed as SkillInjectionMatrix
}

/**
 * Path-segment glob rule (identical to W2-P5): '*' always fires;
 * 'prefix/*' fires iff a surface === prefix or startsWith(prefix + '/').
 */
function resolveRequiredChecks(
  matrix: SkillInjectionMatrix,
  surfaces: readonly string[],
): string[] {
  const required: string[] = []
  const seen = new Set<string>()
  for (const [glob, checks] of Object.entries(matrix.verifier_harness)) {
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
    for (const check of checks) {
      if (!seen.has(check)) {
        seen.add(check)
        required.push(check)
      }
    }
  }
  return required
}

// ─── runHarness ───────────────────────────────────────────────────────────────

/**
 * Orchestrates the deterministic verification pass: reads the spec, extracts
 * `AC-N` labels, applies the named-test convention against
 * `input.testResults`, resolves the `verifier_harness` matrix against
 * `input.buildResult.touchedSurfaces`, invokes the injected `MatrixCheck`
 * functions, and emits one Stage-D claim sub-receipt per claim — each chained
 * by `prevHash` via `allocateSequence` and inheriting chain identity from the
 * receipt it chains from.
 */
export async function runHarness(input: HarnessInput): Promise<HarnessResult> {
  assertValidWorkflowId(input.workflowId)
  const repoRoot = input.repoRoot ?? process.cwd()

  // 1. Spec read + AC extraction
  let specText: string
  try {
    specText = readFileSync(input.specPath, 'utf8')
  } catch (err) {
    throw new VerificationError(
      'SPEC_UNREADABLE',
      `Cannot read spec at '${input.specPath}': ${String(err)}`,
    )
  }
  const acs = extractAcs(specText)
  if (acs.length === 0) {
    throw new VerificationError(
      'SPEC_INVALID',
      `Spec at '${input.specPath}' contains no 'AC-N:' acceptance-criterion labels`,
    )
  }

  // 2. Named-test mapping — one claim per AC
  const claims: HarnessClaimResult[] = acs.map((ac) => mapAcClaim(ac, input.testResults))

  // 3. Verifier-side matrix resolution + injected check invocation
  const matrix = loadMatrix(repoRoot)
  const requiredChecks = resolveRequiredChecks(matrix, input.buildResult.touchedSurfaces)
  for (const checkName of requiredChecks) {
    if (input.matrixChecks[checkName] === undefined) {
      throw new VerificationError(
        'MATRIX_CHECK_MISSING',
        `Required matrix check '${checkName}' has no injected implementation`,
      )
    }
  }
  for (const checkName of requiredChecks) {
    const check = input.matrixChecks[checkName] as MatrixCheck
    let result: MatrixCheckResult
    try {
      result = await check(input.workflowId, input.buildResult.touchedSurfaces)
    } catch (err) {
      throw new VerificationError(
        'MATRIX_CHECK_FAILED',
        `Matrix check '${checkName}' threw: ${String(err)}`,
      )
    }
    claims.push({
      claim: `matrix:${checkName}`,
      passed: result.passed,
      evidence: result.evidence,
    })
  }

  // 4. One Stage-D claim sub-receipt per claim, chained via allocateSequence.
  // Fresh sessionId/runId are minted once for this verification session;
  // workflowId/correlationId are inherited from the receipt chained from.
  const sessionId = randomUUID()
  const runId = randomUUID()
  const receiptLocators: string[] = []
  for (const claimResult of claims) {
    const tip = scanChainTip(input.workflowId, repoRoot)
    if (tip.tipDocument === null) {
      throw new VerificationError(
        'SEQUENCE_READ_FAILED',
        `No prior receipt exists for workflow '${input.workflowId}'; Stage-D sub-receipts must chain from the Stage-C receipt`,
      )
    }
    const correlation = inheritCorrelation(
      tip.tipDocument,
      sessionId,
      runId,
      'SEQUENCE_READ_FAILED',
      `Chain-tip receipt for workflow '${input.workflowId}'`,
    )
    const locator = writeClaimReceipt({
      workflowId: input.workflowId,
      repoRoot,
      claimRef: claimResult.claim,
      subjectKind: 'HarnessClaimResult',
      subject: {
        claim: claimResult.claim,
        passed: claimResult.passed,
        evidence: claimResult.evidence,
      },
      sequence: tip.sequence,
      prevHash: tip.prevHash,
      correlation,
    })
    receiptLocators.push(locator)
  }

  return {
    claims,
    receiptLocators,
    blocked: claims.some((claimResult) => !claimResult.passed),
  }
}
