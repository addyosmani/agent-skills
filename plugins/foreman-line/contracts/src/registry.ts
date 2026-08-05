/**
 * Central registry of every frozen contract: its stable schema name and the
 * typed JSON Schema (authored as an ajv `SchemaObject`). `generate.ts` serializes
 * the schemas to `schemas/*.json`; the parity test proves the committed files never
 * drift from these typed sources.
 */
import type { SchemaObject } from 'ajv'
import { correlationContextSchema } from './correlation.js'
import { receiptRefSchema, reworkSignalSchema } from './envelope.js'
import {
  shapingResultInputSchema,
  shapingResultOutputSchema,
  shapingResultSchema,
} from './stages/a-intake.js'
import {
  registrationResultInputSchema,
  registrationResultOutputSchema,
  registrationResultSchema,
} from './stages/b-registration.js'
import {
  buildResultInputSchema,
  buildResultOutputSchema,
  buildResultSchema,
  dispatchOrderInputSchema,
  dispatchOrderOutputSchema,
  dispatchOrderSchema,
} from './stages/c-dispatch.js'
import {
  verificationVerdictInputSchema,
  verificationVerdictOutputSchema,
  verificationVerdictSchema,
} from './stages/d-verification.js'
import {
  integrationResultInputSchema,
  integrationResultOutputSchema,
  integrationResultSchema,
} from './stages/e-integration.js'
import {
  closureRecordInputSchema,
  closureRecordOutputSchema,
  closureRecordSchema,
} from './stages/f-closure.js'

// --- Registry entries ---------------------------------------------------------

import type { SchemaFile } from '../../schema-scaffold/src/registry.js'

export type { SchemaFile }

/** Standalone contracts: one schema per exported contract type. */
export const standaloneContracts: readonly SchemaFile[] = [
  { name: 'correlation-context', schema: correlationContextSchema },
  { name: 'receipt-ref', schema: receiptRefSchema },
  { name: 'rework-signal', schema: reworkSignalSchema },
  { name: 'shaping-result', schema: shapingResultSchema },
  { name: 'registration-result', schema: registrationResultSchema },
  { name: 'dispatch-order', schema: dispatchOrderSchema },
  { name: 'build-result', schema: buildResultSchema },
  { name: 'verification-verdict', schema: verificationVerdictSchema },
  { name: 'integration-result', schema: integrationResultSchema },
  { name: 'closure-record', schema: closureRecordSchema },
]

export interface ComposedBoundary {
  readonly name: string
  /** `SchemaObject` — the committed composed schema. */
  readonly inputSchema: SchemaObject
  /** `SchemaObject` — structurally identical to `inputSchema`. */
  readonly outputSchema: SchemaObject
}

/**
 * Composed per-boundary schemas: one per stage-boundary payload, validating a
 * complete stage message strictly in one shot. `inputSchema` and `outputSchema`
 * are proven identical by the parity test (both directions share one file).
 */
export const composedBoundaries: readonly ComposedBoundary[] = [
  {
    name: 'stage-envelope.shaping-result',
    inputSchema: shapingResultInputSchema,
    outputSchema: shapingResultOutputSchema,
  },
  {
    name: 'stage-envelope.registration-result',
    inputSchema: registrationResultInputSchema,
    outputSchema: registrationResultOutputSchema,
  },
  {
    name: 'stage-envelope.dispatch-order',
    inputSchema: dispatchOrderInputSchema,
    outputSchema: dispatchOrderOutputSchema,
  },
  {
    name: 'stage-envelope.build-result',
    inputSchema: buildResultInputSchema,
    outputSchema: buildResultOutputSchema,
  },
  {
    name: 'stage-envelope.verification-verdict',
    inputSchema: verificationVerdictInputSchema,
    outputSchema: verificationVerdictOutputSchema,
  },
  {
    name: 'stage-envelope.integration-result',
    inputSchema: integrationResultInputSchema,
    outputSchema: integrationResultOutputSchema,
  },
  {
    name: 'stage-envelope.closure-record',
    inputSchema: closureRecordInputSchema,
    outputSchema: closureRecordOutputSchema,
  },
]

/** Every committed schema: standalone contracts plus one file per composed boundary. */
export const allSchemaFiles: readonly SchemaFile[] = [
  ...standaloneContracts,
  ...composedBoundaries.map((b) => ({ name: b.name, schema: b.inputSchema })),
]
