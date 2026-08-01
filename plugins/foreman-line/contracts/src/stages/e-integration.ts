import type { SchemaObject } from 'ajv'
import { stageInputSchema, stageOutputSchema } from '../envelope.js'

export type CiOutcome = 'success' | 'failure' | 'skipped' | 'cancelled'

/** The outcome of a single CI job in the integration run. */
export interface CiJobOutcome {
  readonly job: string
  readonly outcome: CiOutcome
}

/** Whether the merge triggered a downstream audit, and why (present only when relevant). */
export interface AuditTriggerEvaluation {
  readonly triggered: boolean
  readonly reason?: string
}

/**
 * Stage E (Integration) output: the PR reference, the CI job outcomes, and the
 * audit-trigger evaluation that decides whether Stage F escalates to an audit.
 */
export interface IntegrationResult {
  readonly prRef: string
  readonly ciJobs: readonly CiJobOutcome[]
  readonly auditTrigger: AuditTriggerEvaluation
}

export const integrationResultSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['prRef', 'ciJobs', 'auditTrigger'],
  properties: {
    prRef: { type: 'string', minLength: 1 },
    ciJobs: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['job', 'outcome'],
        properties: {
          job: { type: 'string', minLength: 1 },
          outcome: { type: 'string', enum: ['success', 'failure', 'skipped', 'cancelled'] },
        },
      },
    },
    auditTrigger: {
      type: 'object',
      additionalProperties: false,
      required: ['triggered'],
      properties: {
        triggered: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
  },
}

export const integrationResultInputSchema: SchemaObject = stageInputSchema(integrationResultSchema)
export const integrationResultOutputSchema: SchemaObject =
  stageOutputSchema(integrationResultSchema)
