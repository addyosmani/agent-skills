/**
 * `ReceiptDocument`: the frozen shape `ReceiptRef` (contracts/src/envelope.ts:17,
 * "Shape is owned by W0-P4") points to. One `kind` serves both per-stage (D8)
 * and per-claim (plan §2 Stage D.1) receipts; the granularity is a runtime
 * creation-time decision, not a contract split.
 *
 * `JsonValue` is structurally identical to
 * `skills/parcel-compiler/tool/src/receipts/canonical.ts`'s `JsonValue` by
 * design (a language-standard shape), but is NOT imported from there — that
 * package is cited by reference only (canonicalization-authority boundary).
 */
import type { CorrelationContext, StageId } from '../../contracts/src/index.js'

export type ReceiptKind = 'stage' | 'claim'

export interface Signature {
  readonly alg: string
  readonly keyId: string
  readonly value: string
}

export type JsonPrimitive = string | number | boolean | null
export interface JsonObject {
  readonly [key: string]: JsonValue
}
export type JsonArray = readonly JsonValue[]
export type JsonValue = JsonPrimitive | JsonObject | JsonArray

export interface ReceiptDocument {
  readonly schemaVersion: string
  readonly kind: ReceiptKind
  readonly stage: StageId
  /** non-null iff `kind === 'claim'` (AC4a). */
  readonly claimRef: string | null
  readonly correlation: CorrelationContext
  /** 0-based, contiguous per `workflowId` chain; 0 = genesis. */
  readonly sequence: number
  /** null iff `sequence === 0` (AC4b). */
  readonly prevHash: string | null
  readonly timestamp: string
  readonly subjectKind: string
  readonly subject: JsonValue
  /** reserved; MUST be null in this wave — no signing infrastructure exists yet. */
  readonly signature: Signature | null
  /** `sha256Hex(canonicalize(this document with the \`hash\` key excluded))`. */
  readonly hash: string
}
