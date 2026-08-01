import type { SchemaObject } from 'ajv'
import { type CorrelationContext, correlationContextSchema } from './correlation.js'

/** The six Foreman Line stages: A Intake -> F Closure. */
export type StageId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

export const STAGE_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const satisfies readonly StageId[]

/**
 * ISO-8601 UTC instant, e.g. `2026-07-13T12:00:00Z` or `...:00.123Z`.
 * Restricted to a trailing `Z` (UTC) per the single-timestamp envelope contract.
 */
// Structural only — no semantic calendar validation (excluded by the one-dep constraint).
export const ISO_UTC_PATTERN = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$'

/** Opaque pointer to a receipt: content hash + a locator. Shape is owned by W0-P4. */
export interface ReceiptRef {
  readonly hash: string
  readonly locator: string
}

export const receiptRefSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['hash', 'locator'],
  properties: {
    hash: { type: 'string', minLength: 1 },
    locator: { type: 'string', minLength: 1 },
  },
}

/** Emitted when a stage must send work back upstream (e.g. Stage D -> Stage C). */
export interface ReworkSignal {
  readonly reason: string
  readonly originStage: StageId
  readonly targetStage: StageId
  /** Rework attempt counter, starting at 1 for the first re-dispatch. */
  readonly attempt: number
  readonly verdictReceipt?: ReceiptRef
}

export const reworkSignalSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['reason', 'originStage', 'targetStage', 'attempt'],
  properties: {
    reason: { type: 'string', minLength: 1 },
    originStage: { type: 'string', enum: [...STAGE_IDS] },
    targetStage: { type: 'string', enum: [...STAGE_IDS] },
    attempt: { type: 'integer', minimum: 1 },
    verdictReceipt: { ...receiptRefSchema },
  },
}

/**
 * Stage-invariant input envelope. The payload `T` plugs in per stage boundary;
 * the envelope structure never changes. `timestamp` is when the input was received.
 */
export interface StageInput<T> {
  readonly correlation: CorrelationContext
  readonly receipt: ReceiptRef
  readonly timestamp: string
  readonly reworkSignal: ReworkSignal | null
  readonly payload: T
}

/**
 * Stage-invariant output envelope. Structurally identical to `StageInput<T>`;
 * `timestamp` is when the output was produced.
 */
export interface StageOutput<T> {
  readonly correlation: CorrelationContext
  readonly receipt: ReceiptRef
  readonly timestamp: string
  readonly reworkSignal: ReworkSignal | null
  readonly payload: T
}

function envelopeSchema(payloadSchema: SchemaObject): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['correlation', 'receipt', 'timestamp', 'reworkSignal', 'payload'],
    properties: {
      correlation: correlationContextSchema,
      receipt: receiptRefSchema,
      timestamp: { type: 'string', pattern: ISO_UTC_PATTERN },
      reworkSignal: { ...reworkSignalSchema, type: ['object', 'null'] },
      payload: payloadSchema,
    },
  }
}

/**
 * Compose a strict, complete schema for a `StageInput<T>` at one boundary.
 * A runtime agent validates an entire stage message in one shot against this.
 */
export function stageInputSchema(payloadSchema: SchemaObject): SchemaObject {
  return envelopeSchema(payloadSchema) as SchemaObject
}

/** Compose a strict, complete schema for a `StageOutput<T>` at one boundary. */
export function stageOutputSchema(payloadSchema: SchemaObject): SchemaObject {
  return envelopeSchema(payloadSchema) as SchemaObject
}
