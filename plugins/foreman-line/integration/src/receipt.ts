/**
 * Stage-E (Integration) `ReceiptDocument` emitter (W4-P1, AC2-AC7).
 *
 * Mirrors the shipped Stage-C receipt assembly
 * (`dispatch/src/approval-cli/index.ts:434-478`): build the draft, hash via
 * `sha256Hex(canonicalize(draft))`, validate via `validateReceiptDocument`,
 * write via `writeReceiptDocument`, locator via
 * `receiptPath(workflowId, sequence, 'E', 'IntegrationResult')`.
 *
 * CROSS-PARCEL CORRELATION INVARIANT (spec Constraints, from W4-P0): the
 * emitted receipt INHERITS `correlationId`/`workflowId` from the caller-
 * supplied prior Stage-D `ReceiptDocument` (the chain-TIP receipt — the
 * caller's responsibility to pass the tip, not an arbitrary ancestor) and
 * mints only fresh `sessionId`/`runId`. A missing/empty/whitespace-only/
 * non-string prior `correlationId` or `workflowId` fails loud via
 * `IntegrationError('PRIOR_CORRELATION_MISSING', ...)` — this emitter never
 * mints a fresh `correlationId`.
 *
 * The `inheritCorrelation` helper below is a LOCAL copy adapted from
 * `verification/src/harness/index.ts:314-338` (`inheritCorrelation`) — not
 * imported, per the spec's no-`integration -> verification` import rule.
 * It is wrapped in a typed try-catch per lesson #22 (external-shape reads).
 */
import { randomUUID } from 'node:crypto'
import type { JsonValue } from '../../approval/src/index.js'
import { canonicalize, sha256Hex, writeReceiptDocument } from '../../approval/src/index.js'
import type {
  AuditTriggerEvaluation,
  CiJobOutcome,
  CorrelationContext,
  IntegrationResult,
} from '../../contracts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { receiptPath, validateReceiptDocument } from '../../receipts/src/index.js'
import { IntegrationError } from './errors.js'

/** Injected write seam — default is the real `writeReceiptDocument`. */
export type WriteReceiptFn = (
  document: ReceiptDocument,
  locator: string,
  repoRoot: string,
) => string

export interface EmitIntegrationReceiptArgs {
  readonly prRef: string
  readonly ciJobs: readonly CiJobOutcome[]
  readonly auditTrigger: AuditTriggerEvaluation
  /**
   * The prior Stage-D `ReceiptDocument` — MUST be the chain-TIP receipt
   * (the caller's precondition; this emitter derives `sequence`/`prevHash`
   * from it directly and does not re-scan the chain, per the spec's
   * no-`integration -> verification` import rule — `allocateSequence` is
   * not imported here).
   */
  readonly priorReceipt: ReceiptDocument
  readonly repoRoot: string
  readonly writeFn?: WriteReceiptFn
}

/**
 * Local, adapted copy of `verification/src/harness/index.ts:314-338`'s
 * `inheritCorrelation` — reads `correlationId`/`workflowId` off an
 * external-shape (untrusted) prior receipt, wrapped in a typed try-catch
 * (lesson #22), and mints fresh `sessionId`/`runId`. Never mints a fresh
 * `correlationId`.
 */
function inheritCorrelation(
  priorReceipt: ReceiptDocument,
  sessionId: string,
  runId: string,
): CorrelationContext {
  let correlation: unknown
  try {
    correlation = (priorReceipt as unknown as { correlation?: unknown }).correlation
  } catch (err) {
    throw new IntegrationError(
      'PRIOR_CORRELATION_MISSING',
      `failed to read prior receipt's correlation: ${String(err)}`,
    )
  }

  if (typeof correlation !== 'object' || correlation === null || Array.isArray(correlation)) {
    throw new IntegrationError(
      'PRIOR_CORRELATION_MISSING',
      "prior receipt has no 'correlation' object",
    )
  }

  const { workflowId, correlationId } = correlation as Record<string, unknown>

  if (typeof workflowId !== 'string' || workflowId.trim().length === 0) {
    throw new IntegrationError(
      'PRIOR_CORRELATION_MISSING',
      `prior receipt correlation.workflowId is missing/empty/whitespace/non-string, got ${JSON.stringify(workflowId)}`,
    )
  }
  if (typeof correlationId !== 'string' || correlationId.trim().length === 0) {
    throw new IntegrationError(
      'PRIOR_CORRELATION_MISSING',
      `prior receipt correlation.correlationId is missing/empty/whitespace/non-string, got ${JSON.stringify(correlationId)}`,
    )
  }

  return {
    correlationId: correlationId as CorrelationContext['correlationId'],
    sessionId: sessionId as CorrelationContext['sessionId'],
    workflowId: workflowId as CorrelationContext['workflowId'],
    runId: runId as CorrelationContext['runId'],
  }
}

/**
 * Emits the Stage-E `ReceiptDocument` (`kind:'stage'`, `stage:'E'`,
 * `subjectKind:'IntegrationResult'`, `subject: {prRef, ciJobs, auditTrigger}`).
 * `sequence` is `priorReceipt.sequence + 1`; `prevHash` is `priorReceipt.hash`.
 * `auditTrigger`/`ciJobs`/`prRef` are honest caller inputs (coordinator ruling
 * Q2) — this function never bakes a placeholder trigger.
 */
export function emitIntegrationReceipt(args: EmitIntegrationReceiptArgs): ReceiptDocument {
  const { prRef, ciJobs, auditTrigger, priorReceipt, repoRoot } = args

  const sessionId = randomUUID()
  const runId = randomUUID()
  const correlation = inheritCorrelation(priorReceipt, sessionId, runId)

  const priorSequenceRaw = (priorReceipt as unknown as { sequence?: unknown }).sequence
  const priorHashRaw = (priorReceipt as unknown as { hash?: unknown }).hash
  if (typeof priorSequenceRaw !== 'number' || !Number.isInteger(priorSequenceRaw)) {
    throw new IntegrationError(
      'RECEIPT_WRITE_FAILED',
      `prior receipt has no integer 'sequence' field, got ${JSON.stringify(priorSequenceRaw)}`,
    )
  }
  if (typeof priorHashRaw !== 'string' || priorHashRaw.length === 0) {
    throw new IntegrationError(
      'RECEIPT_WRITE_FAILED',
      `prior receipt has no non-empty string 'hash' field, got ${JSON.stringify(priorHashRaw)}`,
    )
  }
  const sequence = priorSequenceRaw + 1
  const prevHash = priorHashRaw

  const subject: IntegrationResult = {
    prRef,
    ciJobs: [...ciJobs],
    auditTrigger,
  }

  try {
    const locator = receiptPath(correlation.workflowId, sequence, 'E', 'IntegrationResult')

    const draft = {
      schemaVersion: '1',
      kind: 'stage' as const,
      stage: 'E' as const,
      claimRef: null,
      correlation,
      sequence,
      prevHash,
      timestamp: new Date().toISOString(),
      subjectKind: 'IntegrationResult',
      subject,
      signature: null,
    }

    const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
    const document = { ...draft, hash } as unknown as ReceiptDocument

    const validation = validateReceiptDocument(document)
    if (!validation.valid) {
      throw new IntegrationError(
        'RECEIPT_WRITE_FAILED',
        `Stage-E receipt failed schema validation: ${validation.errors.join('; ')}`,
      )
    }

    const write = args.writeFn ?? writeReceiptDocument
    write(document, locator, repoRoot)

    return document
  } catch (err) {
    if (err instanceof IntegrationError) throw err
    throw new IntegrationError(
      'RECEIPT_WRITE_FAILED',
      `Stage-E receipt write failed: ${String(err)}`,
    )
  }
}
