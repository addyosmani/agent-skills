/**
 * Shared fixtures for the W3-P4 human-gate suite. Hermetic by construction:
 * fresh tmpDir repoRoots, real Stage-C + verdict receipts minted via the
 * shipped machinery (mintStageCReceipt + emitVerificationVerdict), and
 * recording fixture transports — no real Jira, no gateway, no network,
 * no prompt anywhere (lesson #21).
 */
import { randomUUID } from 'node:crypto'
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { VerificationVerdict } from '../../contracts/src/stages/d-verification.js'
import type { HumanGateInput, HumanGateJiraTransport } from '../src/human-gate/index.js'
import { emitVerificationVerdict } from '../src/pipeline/index.js'
import { mintStageCReceipt } from './helpers.js'

export interface GateFixture {
  readonly repoRoot: string
  readonly workflowId: string
  readonly envelopeAbs: string
  readonly receiptsDirAbs: string
}

export function passVerdict(): VerificationVerdict {
  return {
    verdict: 'pass',
    harnessClaims: [
      { claim: 'AC-1: alpha behavior holds', passed: true, evidence: 'test-alpha' },
      { claim: 'AC-2: beta behavior holds', passed: true, evidence: 'test-beta' },
    ],
    adversarialFindings: [
      { summary: 'minor naming nit', citation: 'spec section 1', severity: 'low' },
    ],
  }
}

/** Fresh tmp repoRoot with a Stage-C genesis receipt, a verdict sub-receipt, and the pass envelope. */
export function makeGateFixture(verdict: VerificationVerdict = passVerdict()): GateFixture {
  const repoRoot = mkdtempSync(join(tmpdir(), 'w3p4-test-'))
  const workflowId = randomUUID()
  mintStageCReceipt(repoRoot, workflowId)
  emitVerificationVerdict(
    workflowId,
    verdict,
    verdict.verdict === 'pass'
      ? null
      : { reason: 'fixture rework', originStage: 'D', targetStage: 'C', attempt: 1 },
    { repoRoot },
  )
  const receiptsDirAbs = join(repoRoot, 'docs', 'receipts', workflowId)
  return {
    repoRoot,
    workflowId,
    envelopeAbs: join(receiptsDirAbs, 'verification-verdict.envelope.json'),
    receiptsDirAbs,
  }
}

export function defaultInput(fixture: GateFixture): HumanGateInput {
  return {
    workflowId: fixture.workflowId,
    ticketKey: 'KONE-123',
    targetStatus: 'Done',
    dispositions: [{ findingIndex: 0, disposition: 'accept', note: 'accepted as a nit' }],
    repoRoot: fixture.repoRoot,
  }
}

export function readEnvelope(fixture: GateFixture): Record<string, unknown> {
  return JSON.parse(readFileSync(fixture.envelopeAbs, 'utf8')) as Record<string, unknown>
}

export function writeEnvelope(fixture: GateFixture, envelope: Record<string, unknown>): void {
  writeFileSync(fixture.envelopeAbs, `${JSON.stringify(envelope, null, 2)}\n`)
}

/** Conforming-named receipt filenames in the workflow dir root, sorted. */
export function listConforming(fixture: GateFixture): string[] {
  return readdirSync(fixture.receiptsDirAbs)
    .filter((name) => {
      if (name.length < 15 || !name.endsWith('.json')) return false
      for (let i = 0; i < 6; i++) {
        const code = name.charCodeAt(i)
        if (code < 48 || code > 57) return false
      }
      return name.charCodeAt(6) === 45
    })
    .sort()
}

export function readReceiptFile(fixture: GateFixture, name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(fixture.receiptsDirAbs, name), 'utf8')) as Record<
    string,
    unknown
  >
}

export function findReceiptsByClaimRef(
  fixture: GateFixture,
  claimRef: string,
): Record<string, unknown>[] {
  return listConforming(fixture)
    .map((name) => readReceiptFile(fixture, name))
    .filter((doc) => doc.claimRef === claimRef)
}

export interface RecordedCall {
  readonly method: 'getTransitions' | 'transitionIssue' | 'addComment'
  readonly args: readonly string[]
}

export interface TransportOptions {
  readonly transitions?: readonly { id: string; name: string; toStatus: string }[]
  readonly failGetTransitions?: boolean
  readonly failTransition?: boolean
  readonly failComment?: boolean
  /** Invoked at getTransitions-intercept time (call-order assertions). */
  readonly onGetTransitions?: () => void
}

export interface FixtureTransport {
  readonly transport: HumanGateJiraTransport
  readonly calls: RecordedCall[]
}

/** Recording fixture transport — the only Jira surface any test touches. */
export function makeTransport(options: TransportOptions = {}): FixtureTransport {
  const calls: RecordedCall[] = []
  const transitions = options.transitions ?? [
    { id: '31', name: 'Done', toStatus: 'Done' },
    { id: '21', name: 'In Review', toStatus: 'In Review' },
  ]
  const transport: HumanGateJiraTransport = {
    async getTransitions(issueKey) {
      calls.push({ method: 'getTransitions', args: [issueKey] })
      options.onGetTransitions?.()
      if (options.failGetTransitions === true) throw new Error('fixture: getTransitions down')
      return transitions
    },
    async transitionIssue(issueKey, transitionId) {
      calls.push({ method: 'transitionIssue', args: [issueKey, transitionId] })
      if (options.failTransition === true) throw new Error('fixture: transition rejected')
    },
    async addComment(issueKey, body) {
      calls.push({ method: 'addComment', args: [issueKey, body] })
      if (options.failComment === true) throw new Error('fixture: comment rejected')
      return 'comment-ref-1'
    },
  }
  return { transport, calls }
}
