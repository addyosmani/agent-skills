import type { SchemaObject } from 'ajv'
import { stageInputSchema, stageOutputSchema } from '../envelope.js'

/** The ticket status transition recorded at closure. */
export interface TicketTransition {
  readonly ticketKey: string
  readonly fromStatus: string
  readonly toStatus: string
}

/** The spec's lifecycle move at closure, e.g. `specs/active/...` -> `specs/shipped/...`. */
export interface SpecLifecycleMove {
  readonly from: string
  readonly to: string
}

/**
 * Stage F (Closure) output: the merge SHA, the ticket transition, and the spec
 * lifecycle move that together mark the parcel as shipped.
 */
export interface ClosureRecord {
  readonly mergeSha: string
  readonly ticketTransition: TicketTransition
  readonly specLifecycleMove: SpecLifecycleMove
}

export const closureRecordSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['mergeSha', 'ticketTransition', 'specLifecycleMove'],
  properties: {
    mergeSha: { type: 'string', minLength: 1 },
    ticketTransition: {
      type: 'object',
      additionalProperties: false,
      required: ['ticketKey', 'fromStatus', 'toStatus'],
      properties: {
        ticketKey: { type: 'string', minLength: 1 },
        fromStatus: { type: 'string', minLength: 1 },
        toStatus: { type: 'string', minLength: 1 },
      },
    },
    specLifecycleMove: {
      type: 'object',
      additionalProperties: false,
      required: ['from', 'to'],
      properties: {
        from: { type: 'string', minLength: 1 },
        to: { type: 'string', minLength: 1 },
      },
    },
  },
}

export const closureRecordInputSchema: SchemaObject = stageInputSchema(closureRecordSchema)
export const closureRecordOutputSchema: SchemaObject = stageOutputSchema(closureRecordSchema)
