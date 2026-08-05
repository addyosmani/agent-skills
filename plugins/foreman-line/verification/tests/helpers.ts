/**
 * Shared test fixtures for @foreman-line/verification.
 *
 * All tests use a fresh tmpDir as repoRoot so no production receipts are
 * touched. The real skill-injection.yaml is copied from the live repo path
 * into each tmpDir fixture; Stage-C receipts are minted with real hashes via
 * the shipped approval-package canonicalize/sha256Hex so validateChain runs
 * against honest fixtures.
 */
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { canonicalize, type JsonValue, sha256Hex } from '../../approval/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'

const REAL_MATRIX_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'skill-injection',
  'skill-injection.yaml',
)

export const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Fresh tmpDir with the real skill-injection.yaml copied in. */
export function makeTempRepoRoot(options: { matrix?: boolean } = {}): string {
  const tempRoot = mkdtempSync(join(tmpdir(), 'w3p1-test-'))
  if (options.matrix !== false) {
    const matrixDir = join(tempRoot, 'plugins', 'foreman-line', 'skill-injection')
    mkdirSync(matrixDir, { recursive: true })
    writeFileSync(join(matrixDir, 'skill-injection.yaml'), readFileSync(REAL_MATRIX_PATH, 'utf8'))
  }
  return tempRoot
}

export interface StageCFixture {
  readonly locator: string
  readonly hash: string
  readonly correlation: {
    readonly correlationId: string
    readonly sessionId: string
    readonly workflowId: string
    readonly runId: string
  }
}

/**
 * Mint and write a genesis Stage-C dispatch receipt (sequence 0) with a real
 * canonical hash, so downstream Stage-D sub-receipts form a validateChain-
 * acceptable chain in tests.
 */
export function mintStageCReceipt(repoRoot: string, workflowId: string): StageCFixture {
  const correlation = {
    correlationId: randomUUID(),
    sessionId: randomUUID(),
    workflowId,
    runId: randomUUID(),
  }
  const draft = {
    schemaVersion: '1',
    kind: 'stage',
    stage: 'C',
    claimRef: null,
    correlation,
    sequence: 0,
    prevHash: null,
    timestamp: new Date().toISOString(),
    subjectKind: 'DispatchOrder',
    subject: { parcelRef: 'KONE-TEST' },
    signature: null,
  }
  const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
  const document = { ...draft, hash }
  const locator = `docs/receipts/${workflowId}/000000-C-dispatch-order.json`
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '000000-C-dispatch-order.json'), `${JSON.stringify(document, null, 2)}\n`)
  return { locator, hash, correlation }
}

export function readReceipt(repoRoot: string, locator: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(repoRoot, ...locator.split('/')), 'utf8')) as Record<
    string,
    unknown
  >
}

/** Read every conforming receipt in the workflow dir, ordered by sequence prefix. */
export function collectChain(repoRoot: string, workflowId: string): ReceiptDocument[] {
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  const names = readdirSync(dir)
    .filter((name) => name.length >= 15 && name.endsWith('.json') && isSixDigits(name))
    .sort()
  return names.map(
    (name) => JSON.parse(readFileSync(join(dir, name), 'utf8')) as unknown as ReceiptDocument,
  )
}

function isSixDigits(name: string): boolean {
  for (let i = 0; i < 6; i++) {
    const code = name.charCodeAt(i)
    if (code < 48 || code > 57) return false
  }
  return name.charCodeAt(6) === 45
}

export function makeOrder(): {
  readonly parcelRef: string
  readonly stepZeroRestatement: string
  readonly routingDecisionRef: string
  readonly injectedSkills: readonly string[]
} {
  return {
    parcelRef: 'KONE-TEST',
    stepZeroRestatement: 'restatement',
    routingDecisionRef: 'docs/receipts/test/routing.json',
    injectedSkills: ['test-coverage'],
  }
}

export function writeSpec(repoRoot: string, contents: string): string {
  const specDir = join(repoRoot, 'specs')
  mkdirSync(specDir, { recursive: true })
  const specPath = join(specDir, 'parcel-spec.md')
  writeFileSync(specPath, contents)
  return specPath
}

export async function passCheck(): Promise<{ passed: boolean; evidence: string }> {
  return { passed: true, evidence: 'stub check passed' }
}
