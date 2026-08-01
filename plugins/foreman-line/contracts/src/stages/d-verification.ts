import type { SchemaObject } from 'ajv'
import { stageInputSchema, stageOutputSchema } from '../envelope.js'

/** Result of checking one harness claim (e.g. an acceptance-criterion assertion). */
export interface HarnessClaimResult {
  readonly claim: string
  readonly passed: boolean
  readonly evidence: string
}

export type FindingSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

/** An adversarial-review finding, cited against a named standard or spec clause. */
export interface AdversarialFinding {
  readonly summary: string
  readonly citation: string
  readonly severity: FindingSeverity
}

/** Overall verdict: the work passes, or it must be sent back for rework. */
export type Verdict = 'pass' | 'rework'

/**
 * Stage D (Verification) output: the harness claim results, adversarial findings
 * with standard citations, and the pass/rework verdict that gates Stage E.
 */
export interface VerificationVerdict {
  readonly verdict: Verdict
  readonly harnessClaims: readonly HarnessClaimResult[]
  readonly adversarialFindings: readonly AdversarialFinding[]
}

export const verificationVerdictSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'harnessClaims', 'adversarialFindings'],
  properties: {
    verdict: { type: 'string', enum: ['pass', 'rework'] },
    harnessClaims: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['claim', 'passed', 'evidence'],
        properties: {
          claim: { type: 'string', minLength: 1 },
          passed: { type: 'boolean' },
          evidence: { type: 'string' },
        },
      },
    },
    adversarialFindings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['summary', 'citation', 'severity'],
        properties: {
          summary: { type: 'string', minLength: 1 },
          citation: { type: 'string', minLength: 1 },
          severity: { type: 'string', enum: ['info', 'low', 'medium', 'high', 'critical'] },
        },
      },
    },
  },
}

export const verificationVerdictInputSchema: SchemaObject =
  stageInputSchema(verificationVerdictSchema)
export const verificationVerdictOutputSchema: SchemaObject =
  stageOutputSchema(verificationVerdictSchema)
