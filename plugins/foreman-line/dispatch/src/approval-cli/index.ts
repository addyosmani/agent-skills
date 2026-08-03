/**
 * Dispatch Approval CLI (W2-P2) — integrating CLI.
 *
 * Orchestrates W2-P3 (routing eval), W2-P5 (skill resolver), and W2-P4
 * (Kompress) into a complete dispatch package, assembles and validates a
 * schema-valid DispatchOrder, and — on coordinator approval — invokes the
 * permission-profile emitter to create the builder worktree, then writes the
 * Stage-C dispatch receipt.
 *
 * Two-phase API:
 *   Phase 1 — prepareDispatch: pure, no disk writes (except sub-module receipts).
 *   Phase 2 — executeDispatch: side-effectful; calls dispatchWorktree FIRST
 *              (lesson #18), then writes the Stage-C ReceiptDocument.
 *
 * External-call wrapping (lesson #22): every external call is wrapped in a
 * typed try-catch that rethrows as DispatchError.
 */

import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Ajv } from 'ajv'
import { parse } from 'yaml'
import type { JsonValue } from '../../../approval/src/index.js'
import { canonicalize, sha256Hex, writeReceiptDocument } from '../../../approval/src/index.js'
import type { CorrelationId, RunId, SessionId, WorkflowId } from '../../../contracts/src/index.js'
import type { DispatchOrder } from '../../../contracts/src/stages/c-dispatch.js'
import { dispatchOrderSchema } from '../../../contracts/src/stages/c-dispatch.js'
import { dispatchWorktree as realDispatchWorktree } from '../../../permission-profiles/src/emitter.js'
import type { ReceiptDocument } from '../../../receipts/src/index.js'
import { receiptPath, validateReceiptDocument } from '../../../receipts/src/index.js'
import type { KompressFn, KompressResult } from '../kompress-adapter/index.js'
import { kompressContext } from '../kompress-adapter/index.js'
import type { CandidateRecord } from '../query/index.js'
import type { RoutingResult } from '../routing-eval/index.js'
import { evaluateRouting } from '../routing-eval/index.js'
import type { SkillResolverResult } from '../skill-resolver/index.js'
import { resolveSkills } from '../skill-resolver/index.js'

// ─── Error class ──────────────────────────────────────────────────────────────

export class DispatchError extends Error {
  readonly code:
    | 'SPEC_UNREADABLE'
    | 'SPEC_INVALID_FRONTMATTER'
    | 'PRIOR_RECEIPT_UNREADABLE'
    | 'PRIOR_CORRELATION_MISSING'
    | 'ROUTING_FAILED'
    | 'SKILL_RESOLUTION_FAILED'
    | 'COMPRESS_FAILED'
    | 'ORDER_INVALID'
    | 'WORKTREE_FAILED'
    | 'RECEIPT_WRITE_FAILED'

  constructor(code: DispatchError['code'], message: string) {
    super(message)
    this.name = 'DispatchError'
    this.code = code
  }
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface SpecFrontmatter {
  readonly routing_class: string
  readonly data_classification: string
  readonly surfaces: readonly string[]
  readonly permission_profile?: string
}

export interface DispatchInput {
  readonly candidate: CandidateRecord
  readonly specPath: string
  readonly compressFn: KompressFn
  readonly worktreePath: string
}

export interface DispatchPackage {
  readonly candidate: CandidateRecord
  readonly specFrontmatter: SpecFrontmatter
  readonly specText: string
  readonly routingResult: RoutingResult
  readonly skillResult: SkillResolverResult
  readonly kompressResult: KompressResult
  readonly order: DispatchOrder
  readonly prevHash: string
  readonly priorCorrelationId: CorrelationId
}

export interface ExecuteResult {
  readonly order: DispatchOrder
  readonly receiptLocator: string
  readonly worktreePath: string
}

export interface DispatchWorktreeInput {
  readonly parcel: string
  readonly profile: string
  readonly path: string
  readonly cwd?: string
}

export interface DispatchWorktreeOutput {
  readonly code: 0 | 1 | 2
  readonly stdout: string
  readonly stderr: string
}

export interface DispatchOptions {
  readonly repoRoot?: string
  readonly dispatchWorktreeFn?: (opts: DispatchWorktreeInput) => DispatchWorktreeOutput
}

// ─── AJV setup ────────────────────────────────────────────────────────────────

const ajv = new Ajv()
const validateDispatchOrder = ajv.compile(dispatchOrderSchema)

// ─── Frontmatter parsing ──────────────────────────────────────────────────────

function parseFrontmatter(text: string, specPath: string): SpecFrontmatter {
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `No YAML frontmatter block found in spec at '${specPath}'`,
    )
  }
  const fmBlock = fmMatch[1]
  if (fmBlock === undefined) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `No YAML frontmatter content found in spec at '${specPath}'`,
    )
  }
  let fm: Record<string, unknown>
  try {
    fm = parse(fmBlock) as Record<string, unknown>
  } catch (err) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `Cannot parse frontmatter YAML in spec at '${specPath}': ${String(err)}`,
    )
  }

  // Validate required fields
  if (typeof fm.routing_class !== 'string' || fm.routing_class.length === 0) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `Frontmatter missing required string field 'routing_class' in '${specPath}'`,
    )
  }
  if (typeof fm.data_classification !== 'string' || fm.data_classification.length === 0) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `Frontmatter missing required string field 'data_classification' in '${specPath}'`,
    )
  }
  if (!Array.isArray(fm.surfaces)) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `Frontmatter missing required array field 'surfaces' in '${specPath}'`,
    )
  }

  const surfacesArr = fm.surfaces as unknown[]
  for (const s of surfacesArr) {
    if (typeof s !== 'string') {
      throw new DispatchError(
        'SPEC_INVALID_FRONTMATTER',
        `Frontmatter 'surfaces' must be an array of strings in '${specPath}'`,
      )
    }
  }

  const permissionProfile =
    typeof fm.permission_profile === 'string' ? fm.permission_profile : undefined

  return {
    routing_class: fm.routing_class as string,
    data_classification: fm.data_classification as string,
    surfaces: surfacesArr as string[],
    ...(permissionProfile !== undefined ? { permission_profile: permissionProfile } : {}),
  }
}

// ─── Correlation inheritance (validateChain AC5c) ─────────────────────────────

/**
 * Extract the prior stage's `correlation.correlationId` from a parsed receipt
 * so Stage C can INHERIT it (never mint a fresh one). This is a deliberate
 * local replica of the harness helper `inheritCorrelation`
 * (verification/src/harness/index.ts:314-338), duplicated on purpose:
 * `verification` consumes `dispatch` output, so a `dispatch -> verification`
 * import would invert the dependency direction. The harness returns a full
 * CorrelationContext because it has sessionId/runId in hand; here only the
 * correlationId exists at prepareDispatch time (sessionId/runId are minted
 * later in executeDispatch), so this returns the bare validated CorrelationId.
 *
 * Fail-loud: a missing `correlation` object, or a missing/empty/non-string
 * `correlationId`, throws DispatchError('PRIOR_CORRELATION_MISSING'). Silent
 * fallback to randomUUID() is forbidden — that is the exact defect removed here.
 */
function extractPriorCorrelationId(
  source: Record<string, unknown>,
  sourceLabel: string,
): CorrelationId {
  const correlation = source.correlation
  if (typeof correlation !== 'object' || correlation === null || Array.isArray(correlation)) {
    throw new DispatchError(
      'PRIOR_CORRELATION_MISSING',
      `${sourceLabel} has no 'correlation' object`,
    )
  }
  const { correlationId } = correlation as Record<string, unknown>
  if (typeof correlationId !== 'string' || correlationId.trim().length === 0) {
    throw new DispatchError(
      'PRIOR_CORRELATION_MISSING',
      `${sourceLabel} correlation is missing a non-empty string correlationId`,
    )
  }
  return correlationId as CorrelationId
}

// ─── Phase 1: prepareDispatch ─────────────────────────────────────────────────

export async function prepareDispatch(
  input: DispatchInput,
  options: DispatchOptions = {},
): Promise<DispatchPackage> {
  const repoRoot = options.repoRoot ?? process.cwd()
  const { candidate, specPath, compressFn } = input

  // Guard: workflowId must be non-null (null means no receipt chain exists)
  if (candidate.workflowId === null) {
    throw new DispatchError(
      'SPEC_INVALID_FRONTMATTER',
      `candidate.workflowId is null for '${candidate.ticketKey}'; no receipt chain possible`,
    )
  }
  const workflowId = candidate.workflowId

  // 1. Read spec file
  let specText: string
  try {
    specText = readFileSync(specPath, 'utf8')
  } catch (err) {
    throw new DispatchError('SPEC_UNREADABLE', `Cannot read spec at '${specPath}': ${String(err)}`)
  }

  // 2. Parse frontmatter
  const specFrontmatter = parseFrontmatter(specText, specPath)

  // 3. Read prior (Stage-B) receipt
  if (candidate.priorReceiptLocator === null) {
    throw new DispatchError(
      'PRIOR_RECEIPT_UNREADABLE',
      `candidate.priorReceiptLocator is null for '${candidate.ticketKey}'`,
    )
  }
  const priorReceiptAbsPath = join(repoRoot, ...candidate.priorReceiptLocator.split('/'))
  if (!existsSync(priorReceiptAbsPath)) {
    throw new DispatchError(
      'PRIOR_RECEIPT_UNREADABLE',
      `Stage-B receipt not found at '${priorReceiptAbsPath}'`,
    )
  }
  let stageBReceiptText: string
  try {
    stageBReceiptText = readFileSync(priorReceiptAbsPath, 'utf8')
  } catch (err) {
    throw new DispatchError(
      'PRIOR_RECEIPT_UNREADABLE',
      `Cannot read Stage-B receipt at '${priorReceiptAbsPath}': ${String(err)}`,
    )
  }

  // 4. Extract prevHash from Stage-B receipt
  let stageBParsed: unknown
  try {
    stageBParsed = JSON.parse(stageBReceiptText)
  } catch (err) {
    throw new DispatchError(
      'PRIOR_RECEIPT_UNREADABLE',
      `Stage-B receipt at '${priorReceiptAbsPath}' is not valid JSON: ${String(err)}`,
    )
  }
  const prevHash = (stageBParsed as Record<string, unknown>).hash
  if (typeof prevHash !== 'string' || prevHash.length === 0) {
    throw new DispatchError(
      'PRIOR_RECEIPT_UNREADABLE',
      `Stage-B receipt at '${priorReceiptAbsPath}' is missing or has empty 'hash' field`,
    )
  }

  // 4b. Extract the prior correlationId so Stage C inherits it (never mints).
  //     Lesson #22: this is an external-shape read — wrap in a typed try-catch
  //     that rethrows as DispatchError.
  let priorCorrelationId: CorrelationId
  try {
    priorCorrelationId = extractPriorCorrelationId(
      stageBParsed as Record<string, unknown>,
      `Stage-B receipt at '${priorReceiptAbsPath}'`,
    )
  } catch (err) {
    if (err instanceof DispatchError) throw err
    throw new DispatchError(
      'PRIOR_CORRELATION_MISSING',
      `Cannot extract prior correlationId from Stage-B receipt at '${priorReceiptAbsPath}': ${String(err)}`,
    )
  }

  // 5. Routing eval (W2-P3)
  let routingResult: RoutingResult
  try {
    routingResult = evaluateRouting(
      {
        routing_class: specFrontmatter.routing_class,
        data_classification: specFrontmatter.data_classification,
        workflowId,
      },
      { repoRoot },
    )
  } catch (err) {
    throw new DispatchError('ROUTING_FAILED', `Routing evaluation failed: ${String(err)}`)
  }

  // 6. Skill resolver (W2-P5)
  let skillResult: SkillResolverResult
  try {
    skillResult = resolveSkills({ surfaces: specFrontmatter.surfaces, workflowId }, { repoRoot })
  } catch (err) {
    throw new DispatchError('SKILL_RESOLUTION_FAILED', `Skill resolution failed: ${String(err)}`)
  }

  // 7. Kompress (W2-P4) — priorReceiptChain = [stageBReceiptText]
  let kompressResult: KompressResult
  try {
    kompressResult = await kompressContext(
      {
        parcelSpecText: specText,
        priorReceiptChain: [stageBReceiptText],
        workflowId,
      },
      compressFn,
      { repoRoot },
    )
  } catch (err) {
    // KompressError bubbles up as COMPRESS_FAILED
    throw new DispatchError('COMPRESS_FAILED', `Kompress failed: ${String(err)}`)
  }

  // 8. Assemble Step 0 restatement
  const injectedSkillsList = [...skillResult.injectedSkills].join(', ')
  const stepZeroRestatement = [
    `Parcel: ${candidate.ticketKey}`,
    `Workflow ID: ${workflowId}`,
    `Resolved model: ${routingResult.resolvedModelId}`,
    `Injected skills: ${injectedSkillsList}`,
    `Kompress artifact ID: ${kompressResult.artifactId}`,
  ].join('\n')

  // 9. Assemble DispatchOrder
  const orderBase = {
    parcelRef: candidate.ticketKey,
    stepZeroRestatement,
    routingDecisionRef: routingResult.routingDecisionRef,
    injectedSkills: [...skillResult.injectedSkills],
    ...(specFrontmatter.permission_profile !== undefined
      ? { permissionProfile: specFrontmatter.permission_profile }
      : {}),
  }

  // 10. Validate against frozen schema
  if (!validateDispatchOrder(orderBase)) {
    throw new DispatchError(
      'ORDER_INVALID',
      `DispatchOrder failed schema validation: ${ajv.errorsText(validateDispatchOrder.errors)}`,
    )
  }

  const order = orderBase as unknown as DispatchOrder

  return {
    candidate,
    specFrontmatter,
    specText,
    routingResult,
    skillResult,
    kompressResult,
    order,
    prevHash,
    priorCorrelationId,
  }
}

// ─── Phase 2: executeDispatch ─────────────────────────────────────────────────

export async function executeDispatch(
  pkg: DispatchPackage,
  worktreePath: string,
  options: DispatchOptions = {},
): Promise<ExecuteResult> {
  const repoRoot = options.repoRoot ?? process.cwd()
  const workflowId = pkg.candidate.workflowId as string

  // Resolve profile — default to 'builder-standard' if not in frontmatter
  const profile = pkg.specFrontmatter.permission_profile ?? 'builder-standard'

  // Lesson #18: call dispatchWorktree FIRST — before any file writes
  const fn = options.dispatchWorktreeFn ?? realDispatchWorktree
  let worktreeResult: DispatchWorktreeOutput
  try {
    worktreeResult = fn({
      parcel: pkg.candidate.ticketKey,
      profile,
      path: worktreePath,
      cwd: repoRoot,
    })
  } catch (err) {
    throw new DispatchError('WORKTREE_FAILED', `dispatchWorktree threw: ${String(err)}`)
  }
  if (worktreeResult.code !== 0) {
    throw new DispatchError(
      'WORKTREE_FAILED',
      `dispatchWorktree failed (code ${worktreeResult.code}): ${worktreeResult.stderr}`,
    )
  }

  // Stage-C receipt assembly — wrapped so receiptPath / canonicalize / sha256Hex
  // RangeError throws surface as RECEIPT_WRITE_FAILED (Lesson #22).
  let receiptLocator: string
  try {
    const locator = receiptPath(workflowId, 2, 'C', 'DispatchOrder')

    const draft = {
      schemaVersion: '1',
      kind: 'stage' as const,
      stage: 'C' as const,
      claimRef: null,
      correlation: {
        // Stage C INHERITS the prior stage's correlationId (validateChain AC5c):
        // the whole chain must share one identical correlationId. sessionId and
        // runId remain freshly minted per-execution.
        correlationId: pkg.priorCorrelationId,
        sessionId: randomUUID() as SessionId,
        workflowId: workflowId as WorkflowId,
        runId: randomUUID() as RunId,
      },
      sequence: 2,
      prevHash: pkg.prevHash,
      timestamp: new Date().toISOString(),
      subjectKind: 'DispatchOrder',
      subject: {
        kompressArtifactId: pkg.kompressResult.artifactId,
        kompressReceiptRef: pkg.kompressResult.kompressReceiptRef,
        compressedText: pkg.kompressResult.compressedText,
        routingDecisionRef: pkg.routingResult.routingDecisionRef,
        injectedSkills: [...pkg.skillResult.injectedSkills],
        ...(pkg.order.permissionProfile !== undefined
          ? { permissionProfile: pkg.order.permissionProfile }
          : {}),
      },
      signature: null,
    }

    const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
    const document = { ...draft, hash } as unknown as ReceiptDocument

    const validation = validateReceiptDocument(document)
    if (!validation.valid) {
      throw new DispatchError(
        'RECEIPT_WRITE_FAILED',
        `Stage-C receipt failed schema validation: ${validation.errors.join('; ')}`,
      )
    }

    writeReceiptDocument(document, locator, repoRoot)
    receiptLocator = locator
  } catch (err) {
    if (err instanceof DispatchError) throw err
    throw new DispatchError('RECEIPT_WRITE_FAILED', `Receipt write failed: ${String(err)}`)
  }

  return {
    order: pkg.order,
    receiptLocator,
    worktreePath,
  }
}
