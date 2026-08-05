/**
 * Shared hermetic fixtures for the W4-P4 closure tests. No network, no secrets,
 * no live gh/git/docker, no external-repo path — every chain is a synthetic
 * `ReceiptDocument` fixture written under a temp `repoRoot`, and every transport
 * is an in-memory recording stub. This file is test support (not a `*.test.ts`),
 * so it is typechecked/linted but not executed as a suite.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { receiptPath } from '../../receipts/src/index.js'
import type { ClosureJiraTransport, LoadedReceipt } from '../src/index.js'

export const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-00000000000f'
export const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-00000000000f'
export const SESSION_ID = 'a1a1a1a1-0000-4000-8000-00000000000f'
export const RUN_ID = 'a2a2a2a2-0000-4000-8000-00000000000f'

export const HASH_A = '1'.repeat(64)
export const HASH_B = '2'.repeat(64)
export const HASH_C = '3'.repeat(64)
export const HASH_D = '4'.repeat(64)
export const HASH_E = '5'.repeat(64)

export const VALID_MERGE_SHA = 'abc1234'
export const SPEC_MOVE = {
  from: 'docs/specs/active/W4-P4-github-gate-stage-f-closure.md',
  to: 'docs/specs/done/W4-P4-github-gate-stage-f-closure.md',
} as const

export function makeTempRepoRoot(): string {
  return mkdtempSync(join(tmpdir(), 'w4p4-closure-test-'))
}

/** Build a fully schema-valid synthetic ReceiptDocument fixture. */
export function makeReceipt(args: {
  kind?: 'stage' | 'claim'
  claimRef?: string | null
  stage: string
  sequence: number
  prevHash: string | null
  hash: string
  correlationId?: string
  subjectKind: string
  subject?: unknown
}): ReceiptDocument {
  const kind = args.kind ?? 'stage'
  return {
    schemaVersion: '1',
    kind,
    stage: args.stage,
    claimRef: args.claimRef ?? (kind === 'claim' ? 'some-claim' : null),
    correlation: {
      correlationId: args.correlationId ?? SHARED_CORRELATION_ID,
      sessionId: SESSION_ID,
      workflowId: WORKFLOW_ID,
      runId: RUN_ID,
    },
    sequence: args.sequence,
    prevHash: args.prevHash,
    timestamp: new Date().toISOString(),
    subjectKind: args.subjectKind,
    subject: args.subject ?? {},
    signature: null,
    hash: args.hash,
  } as unknown as ReceiptDocument
}

/** The synthetic genesis(A) -> B -> C -> D -> E chain, correct linkage + contiguous. */
export function makeStageEChain(): ReceiptDocument[] {
  return [
    makeReceipt({
      stage: 'A',
      sequence: 0,
      prevHash: null,
      hash: HASH_A,
      subjectKind: 'IntakeResult',
    }),
    makeReceipt({
      stage: 'B',
      sequence: 1,
      prevHash: HASH_A,
      hash: HASH_B,
      subjectKind: 'RegistrationResult',
    }),
    makeReceipt({
      stage: 'C',
      sequence: 2,
      prevHash: HASH_B,
      hash: HASH_C,
      subjectKind: 'DispatchOrder',
    }),
    makeReceipt({
      stage: 'D',
      sequence: 3,
      prevHash: HASH_C,
      hash: HASH_D,
      subjectKind: 'VerificationVerdict',
    }),
    makeReceipt({
      stage: 'E',
      sequence: 4,
      prevHash: HASH_D,
      hash: HASH_E,
      subjectKind: 'IntegrationResult',
    }),
  ]
}

/** Pair each document with the locator the receipts convention assigns it. */
export function toLoaded(documents: readonly ReceiptDocument[]): LoadedReceipt[] {
  return documents.map((document) => ({
    document,
    locator: receiptPath(WORKFLOW_ID, document.sequence, document.stage, document.subjectKind),
  }))
}

/** Write each fixture receipt to disk under `repoRoot` at its convention locator. */
export function writeChainToDisk(repoRoot: string, documents: readonly ReceiptDocument[]): void {
  for (const document of documents) {
    const locator = receiptPath(
      WORKFLOW_ID,
      document.sequence,
      document.stage,
      document.subjectKind,
    )
    const abs = join(repoRoot, ...locator.split('/'))
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, JSON.stringify(document, null, 2), 'utf8')
  }
}

/** Re-scan the on-disk chain, ordered by sequence prefix, as ReceiptDocument[]. */
export function scanChainFromDisk(repoRoot: string): ReceiptDocument[] {
  const dir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
  const names = readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
  return names.map((name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as ReceiptDocument)
}

export interface TransportCallLog {
  getTransitions: string[]
  transitionIssue: { issueKey: string; transitionId: string }[]
  addComment: { issueKey: string; body: string }[]
}

export interface RecordingTransport extends ClosureJiraTransport {
  readonly calls: TransportCallLog
}

/**
 * An in-memory recording ClosureJiraTransport. `transitions` seeds the
 * getTransitions response; `failOn` forces a specific method to reject (the
 * half-closed interleavings); `throwOnAnyCall` asserts zero-call paths.
 */
export function makeRecordingTransport(
  options: {
    transitions?: readonly { id: string; name: string; toStatus: string }[]
    failOn?: 'getTransitions' | 'transitionIssue' | 'addComment'
    throwOnAnyCall?: boolean
  } = {},
): RecordingTransport {
  const calls: TransportCallLog = { getTransitions: [], transitionIssue: [], addComment: [] }
  const transitions = options.transitions ?? [
    { id: '31', name: 'Done', toStatus: 'Done' },
    { id: '11', name: 'In Progress', toStatus: 'In Progress' },
  ]
  const guard = (): void => {
    if (options.throwOnAnyCall) throw new Error('transport must not be called on this path')
  }
  return {
    calls,
    async getTransitions(issueKey) {
      guard()
      calls.getTransitions.push(issueKey)
      if (options.failOn === 'getTransitions') throw new Error('getTransitions boom')
      return transitions
    },
    async transitionIssue(issueKey, transitionId) {
      guard()
      calls.transitionIssue.push({ issueKey, transitionId })
      if (options.failOn === 'transitionIssue') throw new Error('transitionIssue boom')
    },
    async addComment(issueKey, body) {
      guard()
      calls.addComment.push({ issueKey, body })
      if (options.failOn === 'addComment') throw new Error('addComment boom')
      return 'comment-ref-1'
    },
  }
}
