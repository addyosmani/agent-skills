/**
 * Stage-F (Closure) `ReceiptDocument` emitter (W4-P4, AC2-AC7).
 *
 * Mirrors the shipped Stage-E emitter (`integration/src/receipt.ts`'s
 * `emitIntegrationReceipt`) exactly one stage later: build the draft, hash via
 * `sha256Hex(canonicalize(draft))`, validate via `validateReceiptDocument`,
 * write via `writeReceiptDocument`, locator via
 * `receiptPath(workflowId, sequence, 'F', 'ClosureRecord')`.
 *
 * CROSS-PARCEL CORRELATION INVARIANT (spec Constraints, from W4-P0): the
 * emitted receipt INHERITS `correlationId`/`workflowId` from the caller-
 * supplied prior chain-TIP `ReceiptDocument` (the shipped Stage-E receipt at
 * first attempt; the half-closed receipt on a retry) and mints only fresh
 * `sessionId`/`runId`. A missing/empty/whitespace-only/non-string prior
 * `correlationId` or `workflowId` fails loud via
 * `IntegrationError('PRIOR_CORRELATION_MISSING', ...)` — this emitter never
 * mints a fresh `correlationId`.
 *
 * The `inheritCorrelation` helper below is a LOCAL copy of
 * `integration/src/receipt.ts:67-110` (OQ4 — keep the dual-reviewed W4-P1
 * `receipt.ts` byte-identical; the correlation invariant is independently
 * test-locked in each emitter; consolidation is recorded as follow-up
 * W4-FUP-CORRELATION-HELPER). It is NOT imported from `verification` (the
 * no-`integration -> verification` import rule) and is wrapped in a typed
 * try-catch per lesson #22.
 *
 * This module also owns the package-internal Stage-F draft builder shared by
 * the `kind:'stage'` seal (`emitClosureReceipt`) and the `kind:'claim'`
 * half-closed sub-receipt (`emitHalfClosedClosureReceipt`, consumed by
 * `closure.ts`). Keeping the single `randomUUID`/correlation-construction path
 * here — and none in `closure.ts`/`gate-assembly.ts` — makes the mint-guard
 * (AC17) mechanically checkable.
 */
import { randomUUID } from 'node:crypto'
import type { JsonValue } from '../../approval/src/index.js'
import { canonicalize, sha256Hex, writeReceiptDocument } from '../../approval/src/index.js'
import type { ClosureRecord, CorrelationContext } from '../../contracts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { receiptPath, validateReceiptDocument } from '../../receipts/src/index.js'
import { IntegrationError } from './errors.js'
import type { WriteReceiptFn } from './receipt.js'

/** The half-closed claim receipt's `claimRef` and `subjectKind` (spec Design). */
export const HALF_CLOSED_CLAIM_REF = 'stage-f-half-closed'
export const HALF_CLOSED_SUBJECT_KIND = 'HalfClosedClosure'

export interface EmitClosureReceiptArgs {
  readonly closureRecord: ClosureRecord
  /**
   * The CURRENT chain tip — the shipped Stage-E receipt at first attempt, the
   * half-closed receipt on a retry. The caller passes the tip; the emitter
   * derives `sequence`/`prevHash` from it directly (the W4-P1 caller-passes-tip
   * contract; the chain is not re-scanned inside the emitter).
   */
  readonly priorReceipt: ReceiptDocument
  readonly repoRoot: string
  /** Injected write seam; default = the real `writeReceiptDocument`. */
  readonly writeFn?: WriteReceiptFn
}

/** The half-closed claim receipt's subject (recorded when a post-merge Jira step fails). */
export interface HalfClosedSubject {
  readonly mergeSha: string
  readonly ticketKey: string
  readonly requestedStatus: string
  readonly currentStatus: string
  readonly failedStep: 'transition' | 'comment'
  readonly errorMessage: string
  readonly specLifecycleMove: { readonly from: string; readonly to: string }
  readonly stageETip: { readonly hash: string; readonly locator: string }
}

/** A written Stage-F receipt plus its repo-relative locator. */
export interface BuiltFReceipt {
  readonly document: ReceiptDocument
  readonly locator: string
}

/**
 * LOCAL copy of `integration/src/receipt.ts`'s `inheritCorrelation` (OQ4):
 * reads `correlationId`/`workflowId` off an external-shape (untrusted) prior
 * receipt, wrapped in a typed try-catch (lesson #22), and mints fresh
 * `sessionId`/`runId`. Never mints a fresh `correlationId`.
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
 * Package-internal Stage-F draft builder shared by the seal and the
 * half-closed sub-receipt. Mints only `sessionId`/`runId`, inherits
 * `correlationId`/`workflowId` from the tip, derives `sequence`/`prevHash`
 * from the tip, hashes via `sha256Hex(canonicalize(draft))`, validates before
 * write, and writes via the (injected or real) `writeReceiptDocument`. Every
 * fault surfaces as `IntegrationError` (`PRIOR_CORRELATION_MISSING` /
 * `RECEIPT_WRITE_FAILED`) — the W4-P1 `IntegrationError` union is unchanged.
 */
function buildAndWriteFReceipt(args: {
  readonly kind: 'stage' | 'claim'
  readonly claimRef: string | null
  readonly subjectKind: string
  readonly subject: JsonValue
  readonly priorReceipt: ReceiptDocument
  readonly repoRoot: string
  readonly writeFn?: WriteReceiptFn
}): BuiltFReceipt {
  const sessionId = randomUUID()
  const runId = randomUUID()
  const correlation = inheritCorrelation(args.priorReceipt, sessionId, runId)

  const priorSequenceRaw = (args.priorReceipt as unknown as { sequence?: unknown }).sequence
  const priorHashRaw = (args.priorReceipt as unknown as { hash?: unknown }).hash
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

  try {
    const locator = receiptPath(correlation.workflowId, sequence, 'F', args.subjectKind)

    const draft = {
      schemaVersion: '1',
      kind: args.kind,
      stage: 'F' as const,
      claimRef: args.claimRef,
      correlation,
      sequence,
      prevHash,
      timestamp: new Date().toISOString(),
      subjectKind: args.subjectKind,
      subject: args.subject,
      signature: null,
    }

    const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
    const document = { ...draft, hash } as unknown as ReceiptDocument

    const validation = validateReceiptDocument(document)
    if (!validation.valid) {
      throw new IntegrationError(
        'RECEIPT_WRITE_FAILED',
        `Stage-F ${args.kind} receipt failed schema validation: ${validation.errors.join('; ')}`,
      )
    }

    const write = args.writeFn ?? writeReceiptDocument
    write(document, locator, args.repoRoot)

    return { document, locator }
  } catch (err) {
    if (err instanceof IntegrationError) throw err
    throw new IntegrationError(
      'RECEIPT_WRITE_FAILED',
      `Stage-F ${args.kind} receipt write failed: ${String(err)}`,
    )
  }
}

/**
 * Emits the sealing Stage-F `ReceiptDocument` (`kind:'stage'`, `stage:'F'`,
 * `claimRef:null`, `subjectKind:'ClosureRecord'`, `subject: closureRecord`).
 * `sequence` is `priorReceipt.sequence + 1`; `prevHash` is `priorReceipt.hash`.
 * Correlation is inherited from the tip (fresh `sessionId`/`runId` only).
 */
export function emitClosureReceipt(args: EmitClosureReceiptArgs): ReceiptDocument {
  return buildAndWriteFReceipt({
    kind: 'stage',
    claimRef: null,
    subjectKind: 'ClosureRecord',
    subject: args.closureRecord as unknown as JsonValue,
    priorReceipt: args.priorReceipt,
    repoRoot: args.repoRoot,
    writeFn: args.writeFn,
  }).document
}

/**
 * Emits the named half-closed sub-receipt (`kind:'claim'`, `stage:'F'`,
 * `claimRef:'stage-f-half-closed'`, `subjectKind:'HalfClosedClosure'`) chained
 * off the current tip (correlation inherited). Package-internal — consumed by
 * `closure.ts`; not part of the public barrel.
 */
export function emitHalfClosedClosureReceipt(args: {
  readonly subject: HalfClosedSubject
  readonly priorReceipt: ReceiptDocument
  readonly repoRoot: string
  readonly writeFn?: WriteReceiptFn
}): BuiltFReceipt {
  return buildAndWriteFReceipt({
    kind: 'claim',
    claimRef: HALF_CLOSED_CLAIM_REF,
    subjectKind: HALF_CLOSED_SUBJECT_KIND,
    subject: args.subject as unknown as JsonValue,
    priorReceipt: args.priorReceipt,
    repoRoot: args.repoRoot,
    writeFn: args.writeFn,
  })
}
