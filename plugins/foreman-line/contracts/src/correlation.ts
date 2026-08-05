import type { SchemaObject } from 'ajv'

/**
 * Version-agnostic UUID format. The platform does not mandate UUID versions
 * (W0-P1 spec, AC5), so this pattern accepts any hyphenated 8-4-4-4-12 hex
 * string rather than pinning a version/variant nibble.
 */
export const UUID_PATTERN =
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

/**
 * Branded string primitives give compile-time nominal safety (a `RunId` cannot
 * be passed where a `WorkflowId` is expected) while remaining plain UUID-format
 * strings on the wire. The brand is a phantom type only: it is erased at runtime
 * and does not change serialization.
 */
declare const brand: unique symbol
type Branded<TBrand extends string> = string & { readonly [brand]: TBrand }

/** End-to-end key; matches `EventHubMessage<T>.CorrelationId` in `kaseya-one-ai@dev`. */
export type CorrelationId = Branded<'CorrelationId'>
/** Groups related interactions within a correlation. */
export type SessionId = Branded<'SessionId'>
/** Stable across re-runs of the same workflow definition. */
export type WorkflowId = Branded<'WorkflowId'>
/** Unique per execution attempt, including rework retries. */
export type RunId = Branded<'RunId'>
/** Line-scoped extension consumed by dispatch semantics (not a platform claim). */
export type AgentId = Branded<'AgentId'>

/**
 * Correlation identity propagated unmutated through every stage envelope.
 * Grounded in observed `kaseya-one-ai@dev` conventions, NOT the unratified
 * ADR-069 draft: `WorkloadId` and `ContextId` are deliberately excluded until
 * that ADR is ratified.
 */
export interface CorrelationContext {
  readonly correlationId: CorrelationId
  readonly sessionId: SessionId
  readonly workflowId: WorkflowId
  readonly runId: RunId
  readonly agentId?: AgentId
}

export const correlationContextSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['correlationId', 'sessionId', 'workflowId', 'runId'],
  properties: {
    correlationId: { type: 'string', pattern: UUID_PATTERN },
    sessionId: { type: 'string', pattern: UUID_PATTERN },
    workflowId: { type: 'string', pattern: UUID_PATTERN },
    runId: { type: 'string', pattern: UUID_PATTERN },
    agentId: { type: 'string', pattern: UUID_PATTERN },
  },
}
