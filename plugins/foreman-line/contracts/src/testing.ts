import type { SchemaObject } from 'ajv'
import type {
  AgentId,
  CorrelationContext,
  CorrelationId,
  RunId,
  SessionId,
  WorkflowId,
} from './correlation.js'
import type { ReceiptRef, ReworkSignal, StageInput } from './envelope.js'
import { allSchemaFiles } from './registry.js'
import type { ShapingResult } from './stages/a-intake.js'
import type { RegistrationResult } from './stages/b-registration.js'
import type { BuildResult, DispatchOrder } from './stages/c-dispatch.js'
import type { VerificationVerdict } from './stages/d-verification.js'
import type { IntegrationResult } from './stages/e-integration.js'
import type { ClosureRecord } from './stages/f-closure.js'

export function makeCorrelation(
  ids: {
    correlationId?: string
    sessionId?: string
    workflowId?: string
    runId?: string
    agentId?: string
  } = {},
): CorrelationContext {
  const base: CorrelationContext = {
    correlationId: (ids.correlationId ?? '00000000-0000-4000-8000-000000000001') as CorrelationId,
    sessionId: (ids.sessionId ?? '00000000-0000-4000-8000-000000000002') as SessionId,
    workflowId: (ids.workflowId ?? '00000000-0000-4000-8000-000000000003') as WorkflowId,
    runId: (ids.runId ?? '00000000-0000-4000-8000-000000000004') as RunId,
  }
  return ids.agentId ? { ...base, agentId: ids.agentId as AgentId } : base
}

export const sampleCorrelation: CorrelationContext = makeCorrelation({
  agentId: '00000000-0000-4000-8000-000000000005',
})

export const sampleReceipt: ReceiptRef = {
  hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
  locator: 'receipts/w0-p1/sample.json',
}

export const sampleReworkSignal: ReworkSignal = {
  reason: 'verification failed AC5',
  originStage: 'D',
  targetStage: 'C',
  attempt: 1,
  verdictReceipt: sampleReceipt,
}

export const sampleShapingResult: ShapingResult = {
  parcelSpecRefs: ['docs/specs/active/W0-P1-pipeline-stage-contracts.md'],
  epics: [{ key: 'EPIC-1', title: 'Contracts', stories: [{ key: 'STORY-1', title: 'Envelopes' }] }],
}

export const sampleRegistrationResult: RegistrationResult = {
  ticketKeys: ['KONE-1001'],
  links: [
    {
      direction: 'ticket->commit',
      ticketKey: 'KONE-1001',
      commitSha: 'abcdef1234567890abcdef1234567890abcdef12',
      permalink: 'https://example/commit/abcdef1234567890abcdef1234567890abcdef12',
    },
  ],
}

export const sampleDispatchOrder: DispatchOrder = {
  parcelRef: 'W0-P1',
  stepZeroRestatement: 'Freeze the typed stage contracts; types + schemas + tests only.',
  routingDecisionRef: 'docs/transcripts/build-W0-P1-model-routing.md',
  injectedSkills: ['review-code', 'security-review'],
}

export const sampleBuildResult: BuildResult = {
  branch: 'feat/foreman-line-w0-p1',
  commitShas: ['1111111111111111111111111111111111111111'],
  touchedSurfaces: ['plugins/foreman-line/contracts'],
}

export const sampleVerificationVerdict: VerificationVerdict = {
  verdict: 'pass',
  harnessClaims: [{ claim: 'AC1 tsc --noEmit', passed: true, evidence: 'No errors found' }],
  adversarialFindings: [
    {
      summary: 'Envelope generality holds for rework',
      citation: 'W0-P1 Verification Plan',
      severity: 'info',
    },
  ],
}

export const sampleIntegrationResult: IntegrationResult = {
  prRef: 'https://example/pull/42',
  ciJobs: [{ job: 'typecheck', outcome: 'success' }],
  auditTrigger: { triggered: false },
}

export const sampleClosureRecord: ClosureRecord = {
  mergeSha: '2222222222222222222222222222222222222222',
  ticketTransition: { ticketKey: 'KONE-1001', fromStatus: 'In Review', toStatus: 'Done' },
  specLifecycleMove: { from: 'docs/specs/active/W0-P1...', to: 'docs/specs/shipped/W0-P1...' },
}

export function makeEnvelope<T>(
  payload: T,
  opts: {
    correlation?: CorrelationContext
    receipt?: ReceiptRef
    timestamp?: string
    reworkSignal?: ReworkSignal | null
  } = {},
): StageInput<T> {
  return {
    correlation: opts.correlation ?? sampleCorrelation,
    receipt: opts.receipt ?? sampleReceipt,
    timestamp: opts.timestamp ?? '2026-07-13T12:00:00Z',
    reworkSignal: opts.reworkSignal ?? null,
    payload,
  }
}

/** Pairs a registry contract with its canonical sample for round-trip testing. */
export interface ContractFixture {
  readonly name: string
  readonly schema: SchemaObject
  readonly sample: unknown
}

/**
 * Canonical samples keyed by committed schema name. Fixtures are derived from
 * the registry itself, so the pairing can never drift out of index alignment,
 * and any registry entry without a registered sample fails loudly at import.
 */
const samplesByName: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ['correlation-context', sampleCorrelation],
  ['receipt-ref', sampleReceipt],
  ['rework-signal', sampleReworkSignal],
  ['shaping-result', sampleShapingResult],
  ['registration-result', sampleRegistrationResult],
  ['dispatch-order', sampleDispatchOrder],
  ['build-result', sampleBuildResult],
  ['verification-verdict', sampleVerificationVerdict],
  ['integration-result', sampleIntegrationResult],
  ['closure-record', sampleClosureRecord],
  ['stage-envelope.shaping-result', makeEnvelope(sampleShapingResult)],
  ['stage-envelope.registration-result', makeEnvelope(sampleRegistrationResult)],
  ['stage-envelope.dispatch-order', makeEnvelope(sampleDispatchOrder)],
  ['stage-envelope.build-result', makeEnvelope(sampleBuildResult)],
  ['stage-envelope.verification-verdict', makeEnvelope(sampleVerificationVerdict)],
  ['stage-envelope.integration-result', makeEnvelope(sampleIntegrationResult)],
  ['stage-envelope.closure-record', makeEnvelope(sampleClosureRecord)],
])

export const allContractFixtures: readonly ContractFixture[] = allSchemaFiles.map(
  ({ name, schema }) => {
    const sample = samplesByName.get(name)
    if (sample === undefined) {
      throw new Error(`no canonical sample registered for contract '${name}'`)
    }
    return { name, schema, sample }
  },
)
