import type { SchemaObject } from 'ajv'
import { stageInputSchema, stageOutputSchema } from '../envelope.js'

/**
 * Stage C (Dispatch & Build) first output: the order handed to a builder agent.
 * `routingDecisionRef`, `injectedSkills`, and `permissionProfile` are opaque here —
 * routing logic is W0-P3, the skill-injection matrix is W0-P5, and the permission
 * profile registry is resolved elsewhere (permission-profile-registry goal, P1/P3).
 */
export interface DispatchOrder {
  readonly parcelRef: string
  readonly stepZeroRestatement: string
  readonly routingDecisionRef: string
  readonly injectedSkills: readonly string[]
  readonly permissionProfile?: string
}

export const dispatchOrderSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['parcelRef', 'stepZeroRestatement', 'routingDecisionRef', 'injectedSkills'],
  properties: {
    parcelRef: { type: 'string', minLength: 1 },
    stepZeroRestatement: { type: 'string', minLength: 1 },
    routingDecisionRef: { type: 'string', minLength: 1 },
    injectedSkills: { type: 'array', items: { type: 'string', minLength: 1 } },
    permissionProfile: { type: 'string', minLength: 1 },
  },
}

/**
 * Stage C (Dispatch & Build) second output: the result of the build itself —
 * the branch, the commit SHAs produced, and the surfaces touched.
 */
export interface BuildResult {
  readonly branch: string
  readonly commitShas: readonly string[]
  readonly touchedSurfaces: readonly string[]
}

export const buildResultSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['branch', 'commitShas', 'touchedSurfaces'],
  properties: {
    branch: { type: 'string', minLength: 1 },
    commitShas: { type: 'array', items: { type: 'string', minLength: 1 } },
    touchedSurfaces: { type: 'array', items: { type: 'string', minLength: 1 } },
  },
}

export const dispatchOrderInputSchema: SchemaObject = stageInputSchema(dispatchOrderSchema)
export const dispatchOrderOutputSchema: SchemaObject = stageOutputSchema(dispatchOrderSchema)

export const buildResultInputSchema: SchemaObject = stageInputSchema(buildResultSchema)
export const buildResultOutputSchema: SchemaObject = stageOutputSchema(buildResultSchema)
