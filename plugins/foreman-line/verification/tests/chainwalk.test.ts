/**
 * SCAF-P3 — receipt-chain walker tests.
 *
 * Fully offline: every test runs against fixture receipt directories in a
 * fresh tmp dir (no Jira, no network, no production receipts touched).
 * Fixture receipts are minted with real canonical hashes via the shipped
 * approval-package canonicalize/sha256Hex so validateReceiptDocument runs
 * against honest fixtures.
 *
 * Test names carry the AC-N tokens per AC-CONVENTION.md §3/§4 — the W3-P1
 * harness grades this parcel mechanically from these names.
 */
import { strict as assert } from 'node:assert'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  canonicalize,
  type JsonValue,
  RECEIPT_SCHEMA_VERSION,
  sha256Hex,
} from '../../approval/src/index.js'
import {
  ChainWalkError,
  type ChainWalkResult,
  HASH_PREFIX_LENGTH,
  renderChainTable,
  walkChain,
} from '../src/chainwalk/index.js'

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── Fixture helpers (local; helpers.ts is an existing file and stays untouched) ──

function makeTempRepoRoot(): string {
  return mkdtempSync(join(tmpdir(), 'scaf-p3-test-'))
}

interface MintOptions {
  readonly sequence: number
  readonly stage: string
  readonly kind: 'stage' | 'claim'
  readonly claimRef: string | null
  readonly subjectKind: string
  readonly prevHash: string | null
  readonly correlation: Record<string, string>
  readonly subject?: JsonValue
}

interface MintedReceipt {
  readonly document: Record<string, unknown>
  readonly hash: string
}

function mintReceipt(options: MintOptions): MintedReceipt {
  const draft = {
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    kind: options.kind,
    stage: options.stage,
    claimRef: options.claimRef,
    correlation: options.correlation,
    sequence: options.sequence,
    prevHash: options.prevHash,
    timestamp: '2026-07-24T00:00:00.000Z',
    subjectKind: options.subjectKind,
    subject: options.subject ?? { fixture: true },
    signature: null,
  }
  const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
  return { document: { ...draft, hash }, hash }
}

function makeCorrelation(workflowId: string): Record<string, string> {
  return {
    correlationId: randomUUID(),
    sessionId: randomUUID(),
    workflowId,
    runId: randomUUID(),
  }
}

function receiptDir(repoRoot: string, workflowId: string): string {
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  mkdirSync(dir, { recursive: true })
  return dir
}

function writeReceiptFile(dir: string, name: string, document: Record<string, unknown>): void {
  writeFileSync(join(dir, name), `${JSON.stringify(document, null, 2)}\n`)
}

/**
 * Writes a valid multi-stage chain: genesis C stage receipt, then two D claim
 * receipts, then an F stage receipt — contiguous sequences 0..3 with honest
 * prevHash linkage. Returns the minted receipts in sequence order.
 */
function writeValidChain(repoRoot: string, workflowId: string): MintedReceipt[] {
  const dir = receiptDir(repoRoot, workflowId)
  const correlation = makeCorrelation(workflowId)
  const genesis = mintReceipt({
    sequence: 0,
    stage: 'C',
    kind: 'stage',
    claimRef: null,
    subjectKind: 'DispatchOrder',
    prevHash: null,
    correlation,
  })
  const claimOne = mintReceipt({
    sequence: 1,
    stage: 'D',
    kind: 'claim',
    claimRef: 'AC-1: module shape',
    subjectKind: 'HarnessClaimResult',
    prevHash: genesis.hash,
    correlation,
  })
  const claimTwo = mintReceipt({
    sequence: 2,
    stage: 'D',
    kind: 'claim',
    claimRef: 'matrix:test-coverage.check',
    subjectKind: 'HarnessClaimResult',
    prevHash: claimOne.hash,
    correlation,
  })
  const closure = mintReceipt({
    sequence: 3,
    stage: 'F',
    kind: 'stage',
    claimRef: null,
    subjectKind: 'StageClosure',
    prevHash: claimTwo.hash,
    correlation,
  })
  writeReceiptFile(dir, '000000-C-dispatch-order.json', genesis.document)
  writeReceiptFile(dir, '000001-D-harness-claim-result.json', claimOne.document)
  writeReceiptFile(dir, '000002-D-harness-claim-result.json', claimTwo.document)
  writeReceiptFile(dir, '000003-F-stage-closure.json', closure.document)
  return [genesis, claimOne, claimTwo, closure]
}

function expectChainWalkError(fn: () => unknown, code: string): ChainWalkError {
  try {
    fn()
  } catch (err) {
    assert.ok(err instanceof ChainWalkError, `expected ChainWalkError, got ${String(err)}`)
    assert.equal(err.name, 'ChainWalkError')
    assert.equal(err.code, code)
    return err
  }
  assert.fail(`expected ChainWalkError with code '${code}', but nothing was thrown`)
}

// ─── AC-1: module shape, no barrel export, no new dependency ─────────────────

test('AC-1: chainwalk module exports walkChain, renderChainTable, and a typed ChainWalkError', () => {
  assert.equal(typeof walkChain, 'function')
  assert.equal(typeof renderChainTable, 'function')
  const err = new ChainWalkError('RECEIPT_DIR_MISSING', 'fixture')
  assert.ok(err instanceof Error)
  assert.equal(err.name, 'ChainWalkError')
  assert.equal(err.code, 'RECEIPT_DIR_MISSING')
})

test('AC-1: chainwalk is not re-exported from the package barrel (writeClaimReceipt precedent)', () => {
  const barrel = readFileSync(join(PACKAGE_ROOT, 'src', 'index.ts'), 'utf8')
  assert.ok(!barrel.includes('chainwalk'), 'src/index.ts must not reference chainwalk')
})

test('AC-1: chainwalk adds no dependency — module imports only node: builtins and relative paths, and the package dependency key set is unchanged', () => {
  const source = readFileSync(join(PACKAGE_ROOT, 'src', 'chainwalk', 'index.ts'), 'utf8')
  for (const line of source.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('import ')) continue
    const from = trimmed.indexOf(" from '")
    const specStart = from !== -1 ? from + 7 : trimmed.indexOf("'") + 1
    const spec = trimmed.slice(specStart, trimmed.indexOf("'", specStart))
    assert.ok(
      spec.startsWith('node:') || spec.startsWith('./') || spec.startsWith('../'),
      `unexpected bare import specifier '${spec}' in chainwalk module`,
    )
  }
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ['ajv', 'yaml'])
})

// ─── AC-2: valid chain walks ok ──────────────────────────────────────────────

test('AC-2: walkChain returns ok with one ordered entry per receipt across a multi-stage chain, ignoring non-conforming filenames', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const minted = writeValidChain(repoRoot, workflowId)
  // Non-conforming names in the same directory must be ignored.
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  writeFileSync(join(dir, 'README.md'), 'not a receipt')
  writeFileSync(join(dir, 'notes.json'), '{}')
  writeFileSync(join(dir, '00000x-D-bad-prefix.json'), '{}')
  writeFileSync(join(dir, '000009-Z-bad-stage.json'), '{}')

  const result = walkChain(workflowId, repoRoot)
  assert.equal(result.ok, true)
  assert.equal(result.workflowId, workflowId)
  assert.equal(result.entries.length, 4)
  assert.deepEqual(
    result.entries.map((entry) => entry.sequence),
    [0, 1, 2, 3],
  )
  assert.deepEqual(
    result.entries.map((entry) => entry.stage),
    ['C', 'D', 'D', 'F'],
  )
  assert.deepEqual(
    result.entries.map((entry) => entry.kind),
    ['stage', 'claim', 'claim', 'stage'],
  )
  // claimRef is null when absent (stage receipts), the claim string otherwise.
  assert.equal(result.entries[0]?.claimRef, null)
  assert.equal(result.entries[1]?.claimRef, 'AC-1: module shape')
  assert.equal(result.entries[2]?.claimRef, 'matrix:test-coverage.check')
  assert.equal(result.entries[3]?.claimRef, null)
  assert.deepEqual(
    result.entries.map((entry) => entry.subjectKind),
    ['DispatchOrder', 'HarnessClaimResult', 'HarnessClaimResult', 'StageClosure'],
  )
  assert.deepEqual(
    result.entries.map((entry) => entry.hash),
    minted.map((receipt) => receipt.hash),
  )
})

// ─── AC-3: fail-loud typed errors, one distinct code per defect class ─────────

test('AC-3: missing receipt directory throws RECEIPT_DIR_MISSING', () => {
  const repoRoot = makeTempRepoRoot()
  expectChainWalkError(() => walkChain(randomUUID(), repoRoot), 'RECEIPT_DIR_MISSING')
})

test('AC-3: directory with no conforming receipts throws RECEIPT_DIR_MISSING', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  writeFileSync(join(dir, 'README.md'), 'not a receipt')
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'RECEIPT_DIR_MISSING')
})

test('AC-3: unparsable receipt file throws RECEIPT_UNREADABLE', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  writeFileSync(join(dir, '000000-C-dispatch-order.json'), '{ not json')
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'RECEIPT_UNREADABLE')
})

test('AC-3: receipt failing validateReceiptDocument throws RECEIPT_INVALID', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  writeValidChain(repoRoot, workflowId)
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  // Tamper: a claim receipt with claimRef null violates the AC4a invariant.
  const tampered = JSON.parse(
    readFileSync(join(dir, '000001-D-harness-claim-result.json'), 'utf8'),
  ) as Record<string, unknown>
  tampered.claimRef = null
  writeReceiptFile(dir, '000001-D-harness-claim-result.json', tampered)
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'RECEIPT_INVALID')
})

test('AC-3: sequence gap throws SEQUENCE_BROKEN', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  const correlation = makeCorrelation(workflowId)
  const genesis = mintReceipt({
    sequence: 0,
    stage: 'C',
    kind: 'stage',
    claimRef: null,
    subjectKind: 'DispatchOrder',
    prevHash: null,
    correlation,
  })
  const orphan = mintReceipt({
    sequence: 2,
    stage: 'D',
    kind: 'claim',
    claimRef: 'AC-1: gap fixture',
    subjectKind: 'HarnessClaimResult',
    prevHash: genesis.hash,
    correlation,
  })
  writeReceiptFile(dir, '000000-C-dispatch-order.json', genesis.document)
  writeReceiptFile(dir, '000002-D-harness-claim-result.json', orphan.document)
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'SEQUENCE_BROKEN')
})

test('AC-3: duplicate sequence throws SEQUENCE_BROKEN', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  writeValidChain(repoRoot, workflowId)
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  const duplicate = JSON.parse(
    readFileSync(join(dir, '000001-D-harness-claim-result.json'), 'utf8'),
  ) as Record<string, unknown>
  writeReceiptFile(dir, '000001-D-duplicate-claim.json', duplicate)
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'SEQUENCE_BROKEN')
})

test('AC-3: document sequence disagreeing with its chain position throws SEQUENCE_BROKEN', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  const correlation = makeCorrelation(workflowId)
  const genesis = mintReceipt({
    sequence: 0,
    stage: 'C',
    kind: 'stage',
    claimRef: null,
    subjectKind: 'DispatchOrder',
    prevHash: null,
    correlation,
  })
  const skewed = mintReceipt({
    sequence: 2,
    stage: 'D',
    kind: 'claim',
    claimRef: 'AC-1: skew fixture',
    subjectKind: 'HarnessClaimResult',
    prevHash: genesis.hash,
    correlation,
  })
  writeReceiptFile(dir, '000000-C-dispatch-order.json', genesis.document)
  // Filename says sequence 1, document says sequence 2.
  writeReceiptFile(dir, '000001-D-harness-claim-result.json', skewed.document)
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'SEQUENCE_BROKEN')
})

test('AC-3: prevHash not equal to the prior receipt hash throws PREV_HASH_MISMATCH', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  const correlation = makeCorrelation(workflowId)
  const genesis = mintReceipt({
    sequence: 0,
    stage: 'C',
    kind: 'stage',
    claimRef: null,
    subjectKind: 'DispatchOrder',
    prevHash: null,
    correlation,
  })
  const broken = mintReceipt({
    sequence: 1,
    stage: 'D',
    kind: 'claim',
    claimRef: 'AC-1: broken-link fixture',
    subjectKind: 'HarnessClaimResult',
    prevHash: 'a'.repeat(64),
    correlation,
  })
  writeReceiptFile(dir, '000000-C-dispatch-order.json', genesis.document)
  writeReceiptFile(dir, '000001-D-harness-claim-result.json', broken.document)
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'PREV_HASH_MISMATCH')
})

test('AC-3: genesis receipt with non-null prevHash throws GENESIS_PREV_HASH_NOT_NULL', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  const bogus = mintReceipt({
    sequence: 0,
    stage: 'C',
    kind: 'stage',
    claimRef: null,
    subjectKind: 'DispatchOrder',
    prevHash: 'b'.repeat(64),
    correlation: makeCorrelation(workflowId),
  })
  writeReceiptFile(dir, '000000-C-dispatch-order.json', bogus.document)
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'GENESIS_PREV_HASH_NOT_NULL')
})

test('AC-3: workflowId failing the UUID guard throws WORKFLOW_ID_INVALID before any filesystem access', () => {
  // repoRoot points at a path that does not exist: if the guard ran after any
  // filesystem access, the error would be a dir-scan failure, not the guard's.
  const missingRoot = join(makeTempRepoRoot(), 'does', 'not', 'exist')
  for (const hostile of [
    '../../..',
    '..\\..\\..',
    'not-a-uuid',
    '',
    `${randomUUID()}/`,
    'zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz',
  ]) {
    expectChainWalkError(() => walkChain(hostile, missingRoot), 'WORKFLOW_ID_INVALID')
  }
  assert.ok(!existsSync(missingRoot), 'guard must fire before any filesystem access')
})

test('AC-3: walkChain never returns a partial ok result — a defect mid-chain throws instead', () => {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  writeValidChain(repoRoot, workflowId)
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  // Break the tail of an otherwise-valid chain.
  writeFileSync(join(dir, '000003-F-stage-closure.json'), '{ truncated')
  const thrown = expectChainWalkError(() => walkChain(workflowId, repoRoot), 'RECEIPT_UNREADABLE')
  assert.ok(thrown instanceof ChainWalkError)
})

// ─── AC-4: deterministic markdown chain table ─────────────────────────────────

function fixtureResult(): ChainWalkResult {
  return {
    ok: true,
    workflowId: '2e9aee3f-77cf-4446-9ff0-35909762c589',
    entries: [
      {
        sequence: 0,
        stage: 'C',
        kind: 'stage',
        claimRef: null,
        subjectKind: 'DispatchOrder',
        hash: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      },
      {
        sequence: 1,
        stage: 'D',
        kind: 'claim',
        claimRef: 'AC-1: pipe | and\nnewline hostile',
        subjectKind: 'HarnessClaimResult',
        hash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210',
      },
    ],
  }
}

test('AC-4: renderChainTable renders the snapshot markdown table with header, per-entry rows, escaped cells, and fixed-length hash prefixes', () => {
  const expected = [
    '| Sequence | Stage | Kind | Claim / Subject | Hash |',
    '| --- | --- | --- | --- | --- |',
    '| 0 | C | stage | (none) / DispatchOrder | 0123456789ab |',
    '| 1 | D | claim | AC-1: pipe \\| and newline hostile / HarnessClaimResult | fedcba987654 |',
  ].join('\n')
  assert.equal(renderChainTable(fixtureResult()), expected)
  // Fixed-length truncation is the exported constant.
  assert.equal('0123456789ab'.length, HASH_PREFIX_LENGTH)
})

test('AC-4: renderChainTable is byte-identical across repeated invocations on the same input', () => {
  const input = fixtureResult()
  const first = renderChainTable(input)
  for (let i = 0; i < 5; i++) {
    assert.equal(renderChainTable(input), first)
  }
  // And a walked chain renders identically twice, end to end.
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  writeValidChain(repoRoot, workflowId)
  const walked = walkChain(workflowId, repoRoot)
  assert.equal(renderChainTable(walked), renderChainTable(walked))
})

// ─── AC-5: gates + lessons discipline (linear-time scans, typed fs errors) ────

test('AC-5: hostile long inputs are rejected quickly (linear-time scans) and every fs failure surfaces as a typed ChainWalkError', () => {
  // Linear-time smoke: pathological inputs that would hang a backtracking
  // regex are decided immediately by the char-code guards.
  const start = process.hrtime.bigint()
  const repoRoot = makeTempRepoRoot()
  expectChainWalkError(() => walkChain(`${'a-'.repeat(50000)}!`, repoRoot), 'WORKFLOW_ID_INVALID')
  const workflowId = randomUUID()
  const dir = receiptDir(repoRoot, workflowId)
  // Long non-conforming name (bounded by the Windows 255-char filename limit).
  writeFileSync(join(dir, `${'9'.repeat(6)}${'-x'.repeat(100)}.json`), '{}')
  expectChainWalkError(() => walkChain(workflowId, repoRoot), 'RECEIPT_DIR_MISSING')
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6
  assert.ok(elapsedMs < 2000, `linear-time guards took ${elapsedMs}ms`)

  // Typed-error discipline (lesson #22): a filesystem read failure surfaces
  // as ChainWalkError, never a raw ENOENT/SyntaxError escaping the module.
  writeFileSync(join(dir, '000000-C-dispatch-order.json'), 'not json at all')
  try {
    walkChain(workflowId, repoRoot)
    assert.fail('expected a throw')
  } catch (err) {
    assert.ok(err instanceof ChainWalkError)
    assert.equal(err.name, 'ChainWalkError')
    assert.equal(typeof err.code, 'string')
  }
})
