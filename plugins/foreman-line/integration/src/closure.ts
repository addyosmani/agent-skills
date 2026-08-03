/**
 * Stage-F closure orchestration (W4-P4, AC8-AC13, AC16) — the coordinator-
 * invoked two-phase library API that, once a human has merged the parcel PR,
 * seals the receipt chain and records the closure.
 *
 * Two-phase one-tap contract (the shipped W2-P2 / W3-P4 pattern):
 *   PHASE 1 — prepareClosure: validates the input shape, loads the receipt
 *             chain (injected seam; default = a local conforming-name scan of
 *             `docs/receipts/<workflowId>/`), runs the shipped `validateChain`,
 *             and asserts the chain tip is `stage:'E'`. Writes NO receipt — an
 *             unexecuted package leaves no chain residue.
 *   PHASE 2 — executeClosure: idempotency pre-check (an existing `stage:'F'`
 *             `ClosureRecord` seal is the terminal guard — OQ5), default-deny
 *             Jira gate, transition-by-NAME, receipt-chain-link comment, then
 *             on success the sealing `stage:'F'` receipt. A post-merge Jira
 *             failure emits a named half-closed claim sub-receipt and RETURNS
 *             `{kind:'half-closed'}` (PRF-12c / Q5) — it does not throw.
 *   RETRY   — retryHalfClosedClosure: idempotent, disk-derived; no re-merge,
 *             no re-approval, no attempt cap. Reconstructs from the half-closed
 *             sub-receipt's subject and re-runs the Jira+seal steps, respecting
 *             the already-satisfied-transition rule.
 *
 * The spec `active/ -> done/` move is RECORDED-ONLY (Q2): the orchestrator
 * records `specLifecycleMove` in the `ClosureRecord` and emits the receipt; it
 * performs no `git mv`, no filesystem move, no commit, no push.
 *
 * All Jira interaction is behind the injected `ClosureJiraTransport` seam; the
 * production adapter (`createClosureJiraAdapter`) reuses `registration/`'s
 * gateway primitives (`McpClientFactory`/`SITE_URL`, the `atlassian-remote`
 * stdio gateway) and the transition tool arg shapes stay VERIFY-AT-PROBE
 * (lessons #20/#21) — deterministic tests never instantiate its default client
 * factory. Every external boundary (chain scan, chain-tip read, receipt write,
 * each transport method) is a typed try-catch (lesson #22); every scan over an
 * identifier/path is a linear-time char loop (lesson #19).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ClosureRecord, StageId, TicketTransition } from '../../contracts/src/index.js'
import { STAGE_IDS, UUID_PATTERN } from '../../contracts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { receiptPath, validateChain } from '../../receipts/src/index.js'
import type { McpClientFactory, McpToolClient } from '../../registration/src/index.js'
import { ALLOWED_PROJECT_KEYS, SITE_URL } from '../../registration/src/index.js'
import {
  emitClosureReceipt,
  emitHalfClosedClosureReceipt,
  HALF_CLOSED_CLAIM_REF,
} from './closure-receipt.js'
import type { WriteReceiptFn } from './receipt.js'

// ─── Error class (this module's own; shipped unions untouched) ───────────────

export type ClosureErrorCode =
  | 'WORKFLOW_ID_INVALID'
  | 'CLOSURE_INPUT_INVALID'
  | 'MERGE_SHA_INVALID'
  | 'SPEC_MOVE_INVALID'
  | 'CHAIN_INVALID'
  | 'STAGE_E_TIP_INVALID'
  | 'RECEIPT_WRITE_FAILED'
  | 'JIRA_GATE_REFUSED'
  | 'JIRA_TRANSITION_UNAVAILABLE'
  | 'JIRA_CALL_FAILED'
  | 'CLOSURE_STATE_MISSING'

export class ClosureError extends Error {
  readonly code: ClosureErrorCode

  constructor(code: ClosureErrorCode, message: string) {
    super(message)
    this.name = 'ClosureError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ClosureInput {
  readonly workflowId: string
  readonly ticketKey: string
  /** Transition resolved by NAME against the live transitions list, never a raw id. */
  readonly targetStatus: string
  /** Coordinator-observed `fromStatus` at closure (OQ2). */
  readonly currentStatus: string
  readonly mergeSha: string
  /** active/ -> done/, recorded-only (Q2). */
  readonly specLifecycleMove: { readonly from: string; readonly to: string }
  /** Defaults to process.cwd(); tests pass a tmp dir. */
  readonly repoRoot?: string
}

export interface ClosurePackage {
  readonly workflowId: string
  readonly ticketKey: string
  readonly targetStatus: string
  readonly currentStatus: string
  readonly mergeSha: string
  readonly specLifecycleMove: { readonly from: string; readonly to: string }
  /** The validated chain tip (must be `stage:'E'`). */
  readonly stageETip: ReceiptDocument
  /**
   * The repoRoot Phase 1 validated against — carried so Phase 2 operates on the
   * exact same chain (never re-defaulted, no drift). Required for the
   * side-effectful disk operations of `executeClosure`.
   */
  readonly repoRoot: string
}

export type ClosureResult =
  | {
      readonly kind: 'closed'
      readonly closureReceiptLocator: string
      readonly ticketTransition: TicketTransition
    }
  | {
      readonly kind: 'half-closed'
      readonly halfClosedReceiptLocator: string
      readonly failedStep: 'transition' | 'comment'
    }

/** A loaded receipt plus its repo-relative locator (the chain-load seam's element). */
export interface LoadedReceipt {
  readonly document: ReceiptDocument
  readonly locator: string
}

/** Injected chain-load seam (OQ3); default = the local conforming-name scan. */
export type LoadReceiptChainFn = (workflowId: string, repoRoot: string) => readonly LoadedReceipt[]

/** The injected Jira boundary — the ONLY Jira surface in this module. */
export interface ClosureJiraTransport {
  getTransitions(
    issueKey: string,
  ): Promise<readonly { id: string; name: string; toStatus: string }[]>
  transitionIssue(issueKey: string, transitionId: string): Promise<void>
  addComment(issueKey: string, body: string): Promise<string>
}

export interface PrepareClosureDeps {
  readonly loadReceiptChainFn?: LoadReceiptChainFn
}

export interface ExecuteClosureDeps {
  readonly transport: ClosureJiraTransport
  readonly writeFn?: WriteReceiptFn
  readonly loadReceiptChainFn?: LoadReceiptChainFn
}

// ─── Linear-time character helpers (lesson #19) ──────────────────────────────

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
}

function isLowerHexCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 102)
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

// ─── Input validation (typed refusals, workflowId before any filesystem access)

function assertValidWorkflowId(workflowId: unknown): asserts workflowId is string {
  if (typeof workflowId !== 'string' || !matchesUuidPattern(workflowId)) {
    throw new ClosureError(
      'WORKFLOW_ID_INVALID',
      `workflowId must match UUID_PATTERN (${UUID_PATTERN}) before any filesystem access, got ${JSON.stringify(workflowId)}`,
    )
  }
}

/** OQ6: `mergeSha` is a 7-64 char lowercase hex string (linear-time scan). */
function assertValidMergeSha(mergeSha: unknown): asserts mergeSha is string {
  if (typeof mergeSha !== 'string' || mergeSha.length < 7 || mergeSha.length > 64) {
    throw new ClosureError(
      'MERGE_SHA_INVALID',
      `mergeSha must be a 7-64 char lowercase hex string, got ${JSON.stringify(mergeSha)}`,
    )
  }
  for (let i = 0; i < mergeSha.length; i++) {
    if (!isLowerHexCode(mergeSha.charCodeAt(i))) {
      throw new ClosureError(
        'MERGE_SHA_INVALID',
        `mergeSha must be lowercase hex; character code ${mergeSha.charCodeAt(i)} at index ${i} is not`,
      )
    }
  }
}

/**
 * Linear-time charset/shape guard for one spec-move path (the W3-P4 RH-1
 * guard, survives CodeQL polynomial-redos): forward-slash segments from a
 * fixed charset (a-z A-Z 0-9 '-' '.' '/' '_'), no leading '/', no backslash,
 * no ':', no control chars, no '.'/'..' segments; must start with `prefix`
 * and end with '.md'.
 */
function assertValidSpecMovePath(
  path: unknown,
  side: 'from' | 'to',
  prefix: string,
): asserts path is string {
  const refuse = (detail: string): never => {
    throw new ClosureError(
      'SPEC_MOVE_INVALID',
      `specLifecycleMove.${side} is not a valid repo-relative spec path (${detail})`,
    )
  }
  if (typeof path !== 'string' || path.length === 0) refuse('must be a non-empty string')
  const value = path as string
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    const allowed =
      (code >= 48 && code <= 57) || // 0-9
      (code >= 97 && code <= 122) || // a-z
      (code >= 65 && code <= 90) || // A-Z
      code === 45 || // '-'
      code === 46 || // '.'
      code === 47 || // '/'
      code === 95 // '_'
    if (!allowed) refuse(`character code ${code} at index ${i} is outside the spec-path charset`)
  }
  if (value.charCodeAt(0) === 47) refuse('absolute paths are refused')
  const segments = value.split('/')
  for (const segment of segments) {
    if (segment.length === 0) refuse('empty path segments are refused')
    if (segment === '.' || segment === '..') refuse('path traversal segments are refused')
  }
  if (!value.startsWith(prefix)) refuse(`must be under ${prefix}`)
  const last = segments[segments.length - 1] as string
  if (!last.endsWith('.md')) refuse("the spec filename must end with '.md'")
}

function assertValidSpecLifecycleMove(
  move: unknown,
): asserts move is { readonly from: string; readonly to: string } {
  if (typeof move !== 'object' || move === null || Array.isArray(move)) {
    throw new ClosureError('SPEC_MOVE_INVALID', 'specLifecycleMove must be an object')
  }
  const { from, to } = move as Record<string, unknown>
  assertValidSpecMovePath(from, 'from', 'docs/specs/active/')
  assertValidSpecMovePath(to, 'to', 'docs/specs/done/')
}

function assertNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ClosureError('CLOSURE_INPUT_INVALID', `${name} must be a non-empty string`)
  }
}

// ─── Default-deny Jira gate (standing authorization 6; the R4 pattern) ───────

/**
 * The mechanical default-deny gate: the issue key's project segment (the text
 * before the first '-', linear-time indexOf split) must be a member of the
 * committed ALLOWED_PROJECT_KEYS allowlist (exact string membership — case
 * tricks and prefix-similar projects fail). Anything else is a typed
 * JIRA_GATE_REFUSED before any client call.
 */
export function assertClosureJiraGate(issueKey: string): void {
  if (typeof issueKey !== 'string' || issueKey.length === 0) {
    throw new ClosureError(
      'JIRA_GATE_REFUSED',
      `issue key must be a non-empty string, got ${JSON.stringify(issueKey)}`,
    )
  }
  const dashIndex = issueKey.indexOf('-')
  if (dashIndex <= 0) {
    throw new ClosureError(
      'JIRA_GATE_REFUSED',
      `issue key ${JSON.stringify(issueKey)} has no '<PROJECT>-<number>' shape`,
    )
  }
  const projectKey = issueKey.slice(0, dashIndex)
  const suffix = issueKey.slice(dashIndex + 1)
  if (suffix.length === 0) {
    throw new ClosureError(
      'JIRA_GATE_REFUSED',
      `issue key ${JSON.stringify(issueKey)} has no numeric suffix after the project segment`,
    )
  }
  if (!ALLOWED_PROJECT_KEYS.has(projectKey)) {
    throw new ClosureError(
      'JIRA_GATE_REFUSED',
      `project key ${JSON.stringify(projectKey)} is not in the allowlist [${[...ALLOWED_PROJECT_KEYS].join(', ')}]`,
    )
  }
}

// ─── Transition resolution (by NAME, never a raw id — RH-7) ──────────────────

/**
 * Resolves the transition id by matching the coordinator-supplied target
 * status against the transition NAME only: the `toStatus` field is
 * informational and is never matched. A target status not offered is
 * JIRA_TRANSITION_UNAVAILABLE (never a raw-id write); two transitions to the
 * same name is likewise a typed refusal naming both ids.
 */
export function resolveTransitionId(
  transitions: readonly { id: string; name: string; toStatus: string }[],
  targetStatus: string,
): string {
  const matches = transitions.filter((transition) => transition.name === targetStatus)
  if (matches.length === 0) {
    throw new ClosureError(
      'JIRA_TRANSITION_UNAVAILABLE',
      `No transition to status ${JSON.stringify(targetStatus)} is offered by the ticket's current workflow state (offered: ${transitions.map((t) => t.name).join(', ') || '(none)'})`,
    )
  }
  if (matches.length > 1) {
    throw new ClosureError(
      'JIRA_TRANSITION_UNAVAILABLE',
      `Ambiguous transition to status ${JSON.stringify(targetStatus)}: ids [${matches.map((t) => t.id).join(', ')}] — ambiguity is a coordinator ruling, not an adapter guess`,
    )
  }
  return (matches[0] as { id: string }).id
}

// ─── Receipt-dir scan (the default LoadReceiptChainFn) ───────────────────────

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

/**
 * Default chain load: scans `docs/receipts/<workflowId>/` for conforming-named
 * receipts (ignoring `quarantine/`/`rework/`/`human-gate/` subdirectories and
 * non-receipt files — the allocateSequence filename convention), ordered by
 * sequence prefix. An absent directory yields an empty chain. Every fs
 * boundary is a typed try-catch (lesson #22).
 */
function defaultLoadReceiptChain(workflowId: string, repoRoot: string): readonly LoadedReceipt[] {
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  let entries: { name: string; isFile: () => boolean }[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw new ClosureError(
      'CHAIN_INVALID',
      `cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }
  const collected: { sequence: number; loaded: LoadedReceipt }[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!isConformingReceiptName(entry.name)) continue
    const locator = `docs/receipts/${workflowId}/${entry.name}`
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(join(dir, entry.name), 'utf8'))
    } catch (err) {
      throw new ClosureError(
        'CHAIN_INVALID',
        `cannot read/parse receipt '${locator}': ${String(err)}`,
      )
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ClosureError('CHAIN_INVALID', `receipt '${locator}' is not a JSON object`)
    }
    collected.push({
      sequence: parseSequencePrefix(entry.name),
      loaded: { document: parsed as unknown as ReceiptDocument, locator },
    })
  }
  collected.sort((a, b) => a.sequence - b.sequence)
  return collected.map((entry) => entry.loaded)
}

/** Invoke the (injected or default) chain-load seam; wrap foreign throws as CHAIN_INVALID. */
function loadChain(
  loadFn: LoadReceiptChainFn,
  workflowId: string,
  repoRoot: string,
): LoadedReceipt[] {
  try {
    return [...loadFn(workflowId, repoRoot)]
  } catch (err) {
    if (err instanceof ClosureError) throw err
    throw new ClosureError('CHAIN_INVALID', `receipt chain load failed: ${String(err)}`)
  }
}

function highestSequenceTip(chain: readonly LoadedReceipt[]): LoadedReceipt | undefined {
  let tip: LoadedReceipt | undefined
  for (const receipt of chain) {
    if (tip === undefined || receipt.document.sequence > tip.document.sequence) tip = receipt
  }
  return tip
}

/** The sealing receipt: `stage:'F'`, `kind:'stage'`, `subjectKind:'ClosureRecord'`. */
function findSeal(chain: readonly LoadedReceipt[]): LoadedReceipt | undefined {
  let found: LoadedReceipt | undefined
  for (const receipt of chain) {
    const doc = receipt.document
    if (doc.kind === 'stage' && doc.stage === 'F' && doc.subjectKind === 'ClosureRecord') {
      found = receipt // highest sequence wins
    }
  }
  return found
}

/** The half-closed sub-receipt: `stage:'F'`, `kind:'claim'`, the named claimRef. */
function findHalfClosed(chain: readonly LoadedReceipt[]): LoadedReceipt | undefined {
  let found: LoadedReceipt | undefined
  for (const receipt of chain) {
    const doc = receipt.document
    if (doc.kind === 'claim' && doc.stage === 'F' && doc.claimRef === HALF_CLOSED_CLAIM_REF) {
      found = receipt
    }
  }
  return found
}

function subjectRecord(receipt: LoadedReceipt): Record<string, unknown> {
  const subject = receipt.document.subject
  if (typeof subject !== 'object' || subject === null || Array.isArray(subject)) {
    throw new ClosureError('CHAIN_INVALID', `receipt '${receipt.locator}' has no object 'subject'`)
  }
  return subject as Record<string, unknown>
}

function requireString(record: Record<string, unknown>, key: string, locator: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new ClosureError(
      'CHAIN_INVALID',
      `receipt '${locator}' subject is missing a non-empty string '${key}'`,
    )
  }
  return value
}

function requireHashString(value: unknown, locator: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ClosureError('CHAIN_INVALID', `receipt '${locator}' has no non-empty string 'hash'`)
  }
  return value
}

// ─── Comment body (untrusted-text discipline: controlled/validated values only)

function buildCommentBody(args: {
  readonly workflowId: string
  readonly mergeSha: string
  readonly stageETip: { readonly hash: string; readonly locator: string }
}): string {
  return [
    `Foreman Line Stage-F closure sealed for workflow ${args.workflowId}.`,
    `Merge SHA: ${args.mergeSha}`,
    `Stage-E receipt: ${args.stageETip.locator}`,
    `Stage-E receipt hash: ${args.stageETip.hash}`,
  ].join('\n')
}

function describeError(err: unknown): string {
  if (err instanceof ClosureError) return `${err.code}: ${err.message}`
  return String(err)
}

// ─── Jira step (shared by executeClosure and retryHalfClosedClosure) ─────────

interface JiraStepSuccess {
  readonly ok: true
  readonly commentRef: string
}

interface JiraStepFailure {
  readonly ok: false
  readonly failedStep: 'transition' | 'comment'
  readonly errorMessage: string
}

/**
 * Transition (unless already satisfied) then comment. Transport rejections are
 * RETURNED as the half-closed state (PRF-12c) — a Jira failure after merge is
 * never thrown. A `targetStatus` not offered by the live transitions list
 * (`resolveTransitionId`) throws JIRA_TRANSITION_UNAVAILABLE (a coordinator-
 * input error, no transition call) and propagates out of this function.
 */
async function performJiraStep(args: {
  readonly transport: ClosureJiraTransport
  readonly ticketKey: string
  readonly targetStatus: string
  readonly skipTransition: boolean
  readonly commentBody: string
}): Promise<JiraStepSuccess | JiraStepFailure> {
  const { transport, ticketKey, targetStatus, skipTransition, commentBody } = args

  if (!skipTransition) {
    let transitions: readonly { id: string; name: string; toStatus: string }[]
    try {
      transitions = await transport.getTransitions(ticketKey)
    } catch (err) {
      return { ok: false, failedStep: 'transition', errorMessage: describeError(err) }
    }
    // Not offered / ambiguous → JIRA_TRANSITION_UNAVAILABLE (throws, no transition call).
    const transitionId = resolveTransitionId(transitions, targetStatus)
    try {
      await transport.transitionIssue(ticketKey, transitionId)
    } catch (err) {
      return { ok: false, failedStep: 'transition', errorMessage: describeError(err) }
    }
  }

  try {
    const commentRef = await transport.addComment(ticketKey, commentBody)
    return { ok: true, commentRef }
  } catch (err) {
    return { ok: false, failedStep: 'comment', errorMessage: describeError(err) }
  }
}

// ─── Phase-2 core (shared by executeClosure and retryHalfClosedClosure) ──────

async function runClosurePhase2(args: {
  readonly workflowId: string
  readonly repoRoot: string
  readonly ticketKey: string
  readonly targetStatus: string
  readonly currentStatus: string
  readonly mergeSha: string
  readonly specLifecycleMove: { readonly from: string; readonly to: string }
  readonly stageETip: { readonly hash: string; readonly locator: string }
  readonly tipReceipt: ReceiptDocument
  readonly skipTransition: boolean
  readonly transport: ClosureJiraTransport
  readonly writeFn?: WriteReceiptFn
}): Promise<ClosureResult> {
  const outcome = await performJiraStep({
    transport: args.transport,
    ticketKey: args.ticketKey,
    targetStatus: args.targetStatus,
    skipTransition: args.skipTransition,
    commentBody: buildCommentBody({
      workflowId: args.workflowId,
      mergeSha: args.mergeSha,
      stageETip: args.stageETip,
    }),
  })

  // Any post-merge Jira failure is the named half-closed state — RETURNED,
  // never thrown (PRF-12c). The claim sub-receipt chains off the current tip.
  if (!outcome.ok) {
    const { locator } = emitHalfClosedClosureReceipt({
      subject: {
        mergeSha: args.mergeSha,
        ticketKey: args.ticketKey,
        requestedStatus: args.targetStatus,
        currentStatus: args.currentStatus,
        failedStep: outcome.failedStep,
        errorMessage: outcome.errorMessage,
        specLifecycleMove: args.specLifecycleMove,
        stageETip: args.stageETip,
      },
      priorReceipt: args.tipReceipt,
      repoRoot: args.repoRoot,
      writeFn: args.writeFn,
    })
    return {
      kind: 'half-closed',
      halfClosedReceiptLocator: locator,
      failedStep: outcome.failedStep,
    }
  }

  // On success, seal the chain. The receipt carries `toStatus`, so it can only
  // seal post-transition (Q5). Chains off the current tip (inherits correlation).
  const closureRecord: ClosureRecord = {
    mergeSha: args.mergeSha,
    ticketTransition: {
      ticketKey: args.ticketKey,
      fromStatus: args.currentStatus,
      toStatus: args.targetStatus,
    },
    specLifecycleMove: args.specLifecycleMove,
  }
  const sealDoc = emitClosureReceipt({
    closureRecord,
    priorReceipt: args.tipReceipt,
    repoRoot: args.repoRoot,
    writeFn: args.writeFn,
  })
  const closureReceiptLocator = receiptPath(args.workflowId, sealDoc.sequence, 'F', 'ClosureRecord')
  return { kind: 'closed', closureReceiptLocator, ticketTransition: closureRecord.ticketTransition }
}

/** Build the idempotent `{kind:'closed'}` no-op from an EXISTING seal (zero writes/calls). */
function closedResultFromSeal(seal: LoadedReceipt): ClosureResult {
  const subject = seal.document.subject
  let ticketTransition: TicketTransition = {
    ticketKey: 'unknown',
    fromStatus: 'unknown',
    toStatus: 'unknown',
  }
  if (typeof subject === 'object' && subject !== null && !Array.isArray(subject)) {
    const transition = (subject as Record<string, unknown>).ticketTransition
    if (typeof transition === 'object' && transition !== null && !Array.isArray(transition)) {
      const record = transition as Record<string, unknown>
      ticketTransition = {
        ticketKey: String(record.ticketKey),
        fromStatus: String(record.fromStatus),
        toStatus: String(record.toStatus),
      }
    }
  }
  return { kind: 'closed', closureReceiptLocator: seal.locator, ticketTransition }
}

// ─── prepareClosure (Phase 1 — validates everything, writes NO receipt) ──────

export async function prepareClosure(
  input: ClosureInput,
  deps: PrepareClosureDeps = {},
): Promise<ClosurePackage> {
  if (typeof input !== 'object' || input === null) {
    throw new ClosureError('CLOSURE_INPUT_INVALID', 'ClosureInput must be an object')
  }
  // 1. workflowId before any filesystem access.
  assertValidWorkflowId(input.workflowId)
  const repoRoot = input.repoRoot ?? process.cwd()
  // 2. Input shape guards.
  assertNonEmptyString(input.ticketKey, 'ClosureInput.ticketKey')
  assertNonEmptyString(input.targetStatus, 'ClosureInput.targetStatus')
  assertNonEmptyString(input.currentStatus, 'ClosureInput.currentStatus')
  assertValidMergeSha(input.mergeSha)
  assertValidSpecLifecycleMove(input.specLifecycleMove)

  // 3. Load + validate the chain (closure never seals on top of a broken chain).
  const loadFn = deps.loadReceiptChainFn ?? defaultLoadReceiptChain
  const chain = loadChain(loadFn, input.workflowId, repoRoot)
  const validation = validateChain(chain.map((receipt) => receipt.document))
  if (!validation.valid) {
    throw new ClosureError(
      'CHAIN_INVALID',
      `receipt chain for workflow '${input.workflowId}' fails validateChain: ${validation.errors.join('; ')}`,
    )
  }

  // 4. The tip must be Stage E (Stage F chains off Stage E).
  const tip = highestSequenceTip(chain)
  if (tip === undefined) {
    throw new ClosureError('CHAIN_INVALID', `no receipts found for workflow '${input.workflowId}'`)
  }
  if (tip.document.stage !== 'E') {
    throw new ClosureError(
      'STAGE_E_TIP_INVALID',
      `chain tip is stage ${JSON.stringify(tip.document.stage)}, expected 'E'`,
    )
  }

  // No receipt is written — an unexecuted package leaves no chain residue.
  return {
    workflowId: input.workflowId,
    ticketKey: input.ticketKey,
    targetStatus: input.targetStatus,
    currentStatus: input.currentStatus,
    mergeSha: input.mergeSha,
    specLifecycleMove: input.specLifecycleMove,
    stageETip: tip.document,
    repoRoot,
  }
}

// ─── executeClosure (Phase 2 — side-effectful, ordered) ──────────────────────

function assertValidPackage(pkg: ClosurePackage): void {
  if (typeof pkg !== 'object' || pkg === null) {
    throw new ClosureError('CLOSURE_INPUT_INVALID', 'ClosurePackage must be an object')
  }
  assertValidWorkflowId(pkg.workflowId)
  assertNonEmptyString(pkg.ticketKey, 'ClosurePackage.ticketKey')
  assertNonEmptyString(pkg.targetStatus, 'ClosurePackage.targetStatus')
  assertNonEmptyString(pkg.currentStatus, 'ClosurePackage.currentStatus')
  assertValidMergeSha(pkg.mergeSha)
  assertValidSpecLifecycleMove(pkg.specLifecycleMove)
  assertNonEmptyString(pkg.repoRoot, 'ClosurePackage.repoRoot')
}

export async function executeClosure(
  pkg: ClosurePackage,
  deps: ExecuteClosureDeps,
): Promise<ClosureResult> {
  assertValidPackage(pkg)
  if (typeof deps !== 'object' || deps === null || deps.transport === undefined) {
    throw new ClosureError(
      'CLOSURE_INPUT_INVALID',
      'ExecuteClosureDeps.transport (a ClosureJiraTransport) is required',
    )
  }
  const { workflowId, repoRoot } = pkg
  const loadFn = deps.loadReceiptChainFn ?? defaultLoadReceiptChain
  const chain = loadChain(loadFn, workflowId, repoRoot)

  // 1. Idempotency pre-check: an existing seal is the terminal guard (OQ5).
  const existingSeal = findSeal(chain)
  if (existingSeal !== undefined) return closedResultFromSeal(existingSeal)

  // 2. Default-deny Jira gate — before any transport call (throws pre-Jira).
  assertClosureJiraGate(pkg.ticketKey)

  // Stage-E reference (hash + locator) from the loaded chain.
  const stageE = chain.find((receipt) => receipt.document.stage === 'E')
  if (stageE === undefined) {
    throw new ClosureError(
      'STAGE_E_TIP_INVALID',
      `no Stage-E receipt on the chain for workflow '${workflowId}'`,
    )
  }
  const stageETip = {
    hash: requireHashString(stageE.document.hash, stageE.locator),
    locator: stageE.locator,
  }

  // Chain the new receipt off the CURRENT tip (Stage E at first attempt; a
  // prior half-closed on a re-run). Non-empty since a Stage-E receipt exists.
  const tip = highestSequenceTip(chain) as LoadedReceipt

  return runClosurePhase2({
    workflowId,
    repoRoot,
    ticketKey: pkg.ticketKey,
    targetStatus: pkg.targetStatus,
    currentStatus: pkg.currentStatus,
    mergeSha: pkg.mergeSha,
    specLifecycleMove: pkg.specLifecycleMove,
    stageETip,
    tipReceipt: tip.document,
    // Idempotent transition: an already-satisfied status is not re-fired
    // (handles crash-after-transition-before-any-receipt on a fresh re-run).
    skipTransition: pkg.currentStatus === pkg.targetStatus,
    transport: deps.transport,
    writeFn: deps.writeFn,
  })
}

// ─── retryHalfClosedClosure (idempotent, disk-derived; no re-merge/approval) ─

export async function retryHalfClosedClosure(
  workflowId: string,
  deps: ExecuteClosureDeps & { readonly repoRoot?: string },
): Promise<ClosureResult> {
  assertValidWorkflowId(workflowId)
  if (typeof deps !== 'object' || deps === null || deps.transport === undefined) {
    throw new ClosureError(
      'CLOSURE_INPUT_INVALID',
      'ExecuteClosureDeps.transport (a ClosureJiraTransport) is required for the retry',
    )
  }
  const repoRoot = deps.repoRoot ?? process.cwd()
  const loadFn = deps.loadReceiptChainFn ?? defaultLoadReceiptChain
  const chain = loadChain(loadFn, workflowId, repoRoot)

  // 1. Seal already exists → idempotent no-op (zero transport calls, zero writes).
  const seal = findSeal(chain)
  if (seal !== undefined) return closedResultFromSeal(seal)

  // 2. Require an in-progress half-closed sub-receipt (nothing to retry otherwise).
  const halfClosed = findHalfClosed(chain)
  if (halfClosed === undefined) {
    throw new ClosureError(
      'CLOSURE_STATE_MISSING',
      `no 'stage-f-half-closed' sub-receipt and no seal on the chain for workflow '${workflowId}'; nothing in-progress to retry (run prepareClosure/executeClosure afresh)`,
    )
  }

  // 3. Reconstruct from the half-closed subject.
  const subject = subjectRecord(halfClosed)
  const mergeSha = requireString(subject, 'mergeSha', halfClosed.locator)
  const ticketKey = requireString(subject, 'ticketKey', halfClosed.locator)
  const requestedStatus = requireString(subject, 'requestedStatus', halfClosed.locator)
  const currentStatus = requireString(subject, 'currentStatus', halfClosed.locator)
  const failedStep = subject.failedStep === 'comment' ? 'comment' : 'transition'
  const specLifecycleMove = subject.specLifecycleMove
  if (
    typeof specLifecycleMove !== 'object' ||
    specLifecycleMove === null ||
    Array.isArray(specLifecycleMove)
  ) {
    throw new ClosureError(
      'CHAIN_INVALID',
      `half-closed receipt '${halfClosed.locator}' subject is missing 'specLifecycleMove'`,
    )
  }
  const moveRecord = specLifecycleMove as Record<string, unknown>
  const move = {
    from: requireString(moveRecord, 'from', halfClosed.locator),
    to: requireString(moveRecord, 'to', halfClosed.locator),
  }
  const stageETipRaw = subject.stageETip
  if (typeof stageETipRaw !== 'object' || stageETipRaw === null || Array.isArray(stageETipRaw)) {
    throw new ClosureError(
      'CHAIN_INVALID',
      `half-closed receipt '${halfClosed.locator}' subject is missing 'stageETip'`,
    )
  }
  const stageETipRecord = stageETipRaw as Record<string, unknown>
  const stageETip = {
    hash: requireString(stageETipRecord, 'hash', halfClosed.locator),
    locator: requireString(stageETipRecord, 'locator', halfClosed.locator),
  }

  assertClosureJiraGate(ticketKey)

  const tip = highestSequenceTip(chain) as LoadedReceipt

  return runClosurePhase2({
    workflowId,
    repoRoot,
    ticketKey,
    targetStatus: requestedStatus,
    currentStatus,
    mergeSha,
    specLifecycleMove: move,
    stageETip,
    tipReceipt: tip.document,
    // A recorded 'comment' failure proves the transition already succeeded; it
    // is not re-fired. An already-satisfied status is likewise not re-fired.
    skipTransition: currentStatus === requestedStatus || failedStep === 'comment',
    transport: deps.transport,
    writeFn: deps.writeFn,
  })
}

// ─── Production ClosureJiraTransport adapter (VERIFY-AT-PROBE) ────────────────

/** VERIFY-AT-PROBE: spec-named gateway tools (coordinator probe pending). */
export const TOOL_GET_TRANSITIONS = 'getTransitionsForJiraIssue'
export const TOOL_TRANSITION = 'transitionJiraIssue'
export const TOOL_COMMENT = 'addCommentToJiraIssue'
export const TOOL_RESOURCES = 'getAccessibleAtlassianResources'

const GATEWAY_SERVER = 'atlassian-remote'

/**
 * Copy an environment map, dropping undefined values (the W1-P4 rule: the SDK's
 * minimal default env strips Windows variables and panics the docker CLI, so
 * the FULL parent environment is passed). Linear-time.
 */
function buildEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Default factory: the real MCP SDK stdio client against the persistent
 * gateway, resolved DYNAMICALLY at first tool call (the SDK is not a dependency
 * of this frozen-scaffold package; deterministic tests never reach this code —
 * lesson #21).
 */
function defaultClientFactory(): McpToolClient {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic SDK module, untyped by design (no compile-time dependency).
  let client: any
  const ensure = async (): Promise<unknown> => {
    if (client !== undefined) return client
    const clientSpecifier = '@modelcontextprotocol/sdk/client/index.js'
    const stdioSpecifier = '@modelcontextprotocol/sdk/client/stdio.js'
    let clientModule: { Client: new (info: Record<string, unknown>) => unknown }
    let stdioModule: { StdioClientTransport: new (params: Record<string, unknown>) => unknown }
    try {
      clientModule = (await import(clientSpecifier)) as typeof clientModule
      stdioModule = (await import(stdioSpecifier)) as typeof stdioModule
    } catch (err) {
      throw new ClosureError(
        'JIRA_CALL_FAILED',
        `The MCP SDK is not resolvable from the integration package; inject a McpClientFactory or run the probe with the SDK available: ${String(err)}`,
      )
    }
    const transport = new stdioModule.StdioClientTransport({
      command: 'docker',
      args: ['mcp', 'gateway', 'run', '--servers', GATEWAY_SERVER],
      env: buildEnv(),
    })
    const c = new clientModule.Client({ name: 'foreman-line-closure', version: '0.0.0' })
    // biome-ignore lint/suspicious/noExplicitAny: dynamic SDK module, untyped by design.
    await (c as any).connect(transport)
    client = c
    return c
  }
  return {
    async callTool(name, args) {
      const c = (await ensure()) as {
        callTool(input: { name: string; arguments: Record<string, unknown> }): Promise<{
          isError?: boolean
          content?: Array<{ type?: string; text?: string }>
        }>
      }
      const result = await c.callTool({ name, arguments: args })
      const text = (result.content ?? []).find(
        (block) => block.type === 'text' && typeof block.text === 'string',
      )?.text
      if (result.isError === true) {
        throw new Error(`closureAdapter: tool ${name} reported an error: ${text ?? '(no text)'}`)
      }
      return text ?? ''
    },
    async close() {
      if (client !== undefined) {
        await client.close()
        client = undefined
      }
    },
  }
}

function parseToolJson<T>(tool: string, raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new ClosureError(
      'JIRA_CALL_FAILED',
      `closureAdapter: tool ${tool} returned non-JSON content`,
    )
  }
}

interface RawTransition {
  readonly id?: unknown
  readonly name?: unknown
  readonly to?: { readonly name?: unknown }
}

/**
 * Map the getTransitionsForJiraIssue response defensively (shape is
 * VERIFY-AT-PROBE): accept either a bare array or `{ transitions: [...] }`;
 * each entry needs a string id and name; `to.name` (when present) is the
 * destination status, else the transition name stands in.
 */
function mapTransitions(
  parsed: unknown,
): readonly { id: string; name: string; toStatus: string }[] {
  const list: unknown = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null
      ? (parsed as { transitions?: unknown }).transitions
      : undefined
  if (!Array.isArray(list)) {
    throw new ClosureError(
      'JIRA_CALL_FAILED',
      `closureAdapter: ${TOOL_GET_TRANSITIONS} response carries no transitions array (shape is VERIFY-AT-PROBE)`,
    )
  }
  const out: { id: string; name: string; toStatus: string }[] = []
  for (const entry of list as readonly RawTransition[]) {
    const id = typeof entry.id === 'string' ? entry.id : String(entry.id ?? '')
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (id.length === 0 || name.length === 0) continue
    const toName = entry.to?.name
    out.push({ id, name, toStatus: typeof toName === 'string' ? toName : name })
  }
  return out
}

/**
 * Build the production adapter. Never instantiated by a deterministic test with
 * the default factory (tests inject a recording stub — the W1-P4 pattern). The
 * gate runs inside every method as defense-in-depth (R4).
 */
export function createClosureJiraAdapter(
  clientFactory: McpClientFactory = defaultClientFactory,
): ClosureJiraTransport & { dispose(): Promise<void> } {
  let client: McpToolClient | undefined
  let cachedCloudId: string | undefined

  const getClient = (): McpToolClient => {
    if (client === undefined) client = clientFactory()
    return client
  }

  const callRaw = async (tool: string, args: Record<string, unknown>): Promise<string> => {
    try {
      return await getClient().callTool(tool, args)
    } catch (err) {
      if (err instanceof ClosureError) throw err
      throw new ClosureError(
        'JIRA_CALL_FAILED',
        `closureAdapter: tool ${tool} failed: ${String(err)}`,
      )
    }
  }

  const resolveCloudId = async (): Promise<string> => {
    if (cachedCloudId !== undefined) return cachedCloudId
    const resources = parseToolJson<Array<{ id?: string; url?: string }>>(
      TOOL_RESOURCES,
      await callRaw(TOOL_RESOURCES, {}),
    )
    const site = Array.isArray(resources) ? resources.find((r) => r.url === SITE_URL) : undefined
    if (site === undefined || typeof site.id !== 'string' || site.id.length === 0) {
      throw new ClosureError(
        'JIRA_CALL_FAILED',
        `closureAdapter: no accessible Atlassian site matching ${SITE_URL} in ${TOOL_RESOURCES} response`,
      )
    }
    cachedCloudId = site.id
    return cachedCloudId
  }

  return {
    async getTransitions(issueKey) {
      assertClosureJiraGate(issueKey) // before any client call
      const cloudId = await resolveCloudId()
      const raw = await callRaw(TOOL_GET_TRANSITIONS, { cloudId, issueIdOrKey: issueKey })
      return mapTransitions(parseToolJson<unknown>(TOOL_GET_TRANSITIONS, raw))
    },
    async transitionIssue(issueKey, transitionId) {
      assertClosureJiraGate(issueKey) // defense-in-depth, before any client call
      const cloudId = await resolveCloudId()
      await callRaw(TOOL_TRANSITION, {
        cloudId,
        issueIdOrKey: issueKey,
        transition: { id: transitionId },
      })
    },
    async addComment(issueKey, body) {
      assertClosureJiraGate(issueKey) // defense-in-depth, before any client call
      const cloudId = await resolveCloudId()
      return callRaw(TOOL_COMMENT, { cloudId, issueIdOrKey: issueKey, commentBody: body })
    },
    async dispose() {
      if (client !== undefined) {
        await client.close()
        client = undefined
      }
    },
  }
}
