import type { SchemaObject } from 'ajv'
import { stageInputSchema, stageOutputSchema } from '../envelope.js'

/** Direction of a registration link: ticket -> commit, or commit -> ticket. */
export type RegistrationDirection = 'ticket->commit' | 'commit->ticket'

/** A bidirectional link tying a ticket key to a commit SHA permalink. */
export interface RegistrationLink {
  readonly direction: RegistrationDirection
  readonly ticketKey: string
  readonly commitSha: string
  readonly permalink: string
}

/**
 * Stage B (Registration) output: the ticket keys created plus SHA permalinks
 * in both directions (ticket->commit and commit->ticket). Jira/MCP shapes are
 * out of scope here; these are opaque string refs (W1-P4 owns Jira types).
 */
export interface RegistrationResult {
  readonly ticketKeys: readonly string[]
  readonly links: readonly RegistrationLink[]
}

export const registrationResultSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['ticketKeys', 'links'],
  properties: {
    ticketKeys: { type: 'array', items: { type: 'string', minLength: 1 } },
    links: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['direction', 'ticketKey', 'commitSha', 'permalink'],
        properties: {
          direction: { type: 'string', enum: ['ticket->commit', 'commit->ticket'] },
          ticketKey: { type: 'string', minLength: 1 },
          commitSha: { type: 'string', minLength: 1 },
          permalink: { type: 'string', minLength: 1 },
        },
      },
    },
  },
}

export const registrationResultInputSchema: SchemaObject =
  stageInputSchema(registrationResultSchema)
export const registrationResultOutputSchema: SchemaObject =
  stageOutputSchema(registrationResultSchema)
