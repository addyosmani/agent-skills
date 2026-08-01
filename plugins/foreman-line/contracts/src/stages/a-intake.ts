import type { SchemaObject } from 'ajv'
import { stageInputSchema, stageOutputSchema } from '../envelope.js'

/** A provisional Story node in the proposed work-breakdown tree. */
export interface StoryNode {
  readonly key: string
  readonly title: string
}

/** A provisional Epic node grouping Stories. */
export interface EpicNode {
  readonly key: string
  readonly title: string
  readonly stories: readonly StoryNode[]
}

/**
 * Stage A (Intake) output: the parcel spec references it shaped plus the
 * proposed Epic/Story tree handed to Stage B for registration.
 */
export interface ShapingResult {
  readonly parcelSpecRefs: readonly string[]
  readonly epics: readonly EpicNode[]
}

export const shapingResultSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['parcelSpecRefs', 'epics'],
  properties: {
    parcelSpecRefs: { type: 'array', items: { type: 'string', minLength: 1 } },
    epics: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'title', 'stories'],
        properties: {
          key: { type: 'string', minLength: 1 },
          title: { type: 'string', minLength: 1 },
          stories: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['key', 'title'],
              properties: {
                key: { type: 'string', minLength: 1 },
                title: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
    },
  },
}

export const shapingResultInputSchema: SchemaObject = stageInputSchema(shapingResultSchema)
export const shapingResultOutputSchema: SchemaObject = stageOutputSchema(shapingResultSchema)
