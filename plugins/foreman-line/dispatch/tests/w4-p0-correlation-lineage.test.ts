/**
 * W4-P0 correlation-lineage-fix tests.
 *
 * The shipped Stage-C assembly minted a FRESH correlationId (randomUUID()),
 * which forks the chain's correlation at C and makes any chain past A->B
 * validateChain-invalid (receipts validator AC5c: every participant must share
 * one identical correlationId). This suite proves the fix: Stage C now INHERITS
 * the prior stage's correlationId while still minting fresh sessionId/runId.
 *
 * Coverage (spec ACs 3-6):
 *   AC3: prepareDispatch extracts correlation.correlationId into
 *        pkg.priorCorrelationId; fail-loud PRIOR_CORRELATION_MISSING on a
 *        missing/empty/non-string/absent correlation (never a silent mint).
 *   AC4: the written Stage-C receipt inherits correlationId and mints fresh
 *        sessionId/runId.
 *   AC5: regression — a fixture-isolated chain A(seq0 genesis)->B(seq1) sharing
 *        one correlationId, with the REAL fixed executeDispatch producing C
 *        (seq2), validates: validateChain([A, B, C]).valid === true AND
 *        C.correlation.correlationId === B.correlation.correlationId.
 *   AC6: negative guard — a forked-C chain is validateChain-invalid with the
 *        AC5c divergence error, locking the regression against a re-minted C.
 *
 * All fixtures write under a temp repoRoot (Windows/temp-dir safe); no reliance
 * on real on-disk chains. The only cross-package import is receipts'
 * validateChain / ReceiptDocument (sanctioned by AC5/AC6).
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { validateChain } from '../../receipts/src/index.js'
import type {
  CandidateRecord,
  DispatchWorktreeOutput,
  KompressCallResult,
  KompressFn,
} from '../src/index.js'
import { DispatchError, executeDispatch, prepareDispatch } from '../src/index.js'

// ─── Paths to real YAML fixtures ─────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_ROUTING_POLICY = join(HERE, '..', '..', 'routing-policy', 'routing-policy.yaml')
const REAL_SKILL_INJECTION = join(HERE, '..', '..', 'skill-injection', 'skill-injection.yaml')

const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-000000000001'
const SHARED_CORRELATION_ID = 'aaaaaaaa-0000-4000-8000-000000000001'
const SESSION_ID = 'a1a1a1a1-0000-4000-8000-000000000002'
const RUN_ID = 'a2a2a2a2-0000-4000-8000-000000000003'
const HASH_A = '1'.repeat(64)
const HASH_B = '2'.repeat(64)

const VALID_FRONTMATTER = {
  routing_class: 'architecture/risk',
  data_classification: 'public',
  surfaces: ['plugins/foreman-line/dispatch/'],
  permission_profile: 'builder-standard',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a tmpDir with routing-policy.yaml and skill-injection.yaml copied in. */
function makeTempRepoRoot(): string {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'w4p0-test-'))
  const routingDir = join(tmpRoot, 'plugins', 'foreman-line', 'routing-policy')
  mkdirSync(routingDir, { recursive: true })
  writeFileSync(join(routingDir, 'routing-policy.yaml'), readFileSync(REAL_ROUTING_POLICY, 'utf8'))
  const skillDir = join(tmpRoot, 'plugins', 'foreman-line', 'skill-injection')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'skill-injection.yaml'), readFileSync(REAL_SKILL_INJECTION, 'utf8'))
  return tmpRoot
}

/** Write a minimal spec file with YAML frontmatter and return the path. */
function writeSpecFile(repoRoot: string, frontmatter: Record<string, unknown>): string {
  const specDir = join(repoRoot, 'specs')
  mkdirSync(specDir, { recursive: true })
  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${(v as string[]).map((s) => `'${s}'`).join(', ')}]`
      return `${k}: ${String(v)}`
    })
    .join('\n')
  const content = `---\n${fmLines}\n---\n\n# Spec body\nSome content.`
  const specPath = join(specDir, 'test-spec.md')
  writeFileSync(specPath, content)
  return specPath
}

/** Make a mock KompressFn that returns the given result (or defaults). */
function makeMockCompressFn(overrides?: Partial<KompressCallResult>): KompressFn {
  return async (_content: string) => ({
    compressed: 'compressed-spec-text',
    hash: 'mock-artifact-id-xyz',
    originalTokens: 200,
    compressedTokens: 50,
    tokensSaved: 150,
    transforms: ['semantic-dedup'],
    ...overrides,
  })
}

/** Success mock for dispatchWorktreeFn. */
const successWorktreeFn = (): DispatchWorktreeOutput => ({
  code: 0,
  stdout: 'profile: builder-standard\nbranch: feat/test\n',
  stderr: '',
})

/** Build a minimal valid CandidateRecord. */
function makeCandidate(overrides?: Partial<CandidateRecord>): CandidateRecord {
  return {
    ticketKey: 'KONE-9999',
    summary: 'Test parcel',
    priority: 'Medium',
    status: 'To Do',
    workflowId: WORKFLOW_ID,
    priorReceiptLocator: null,
    ...overrides,
  }
}

/** Build a fully schema-valid synthetic ReceiptDocument. */
function makeReceipt(args: {
  stage: string
  sequence: number
  prevHash: string | null
  hash: string
  correlationId: string
  subjectKind: string
}): ReceiptDocument {
  return {
    schemaVersion: '1',
    kind: 'stage',
    stage: args.stage,
    claimRef: null,
    correlation: {
      correlationId: args.correlationId,
      sessionId: SESSION_ID,
      workflowId: WORKFLOW_ID,
      runId: RUN_ID,
    },
    sequence: args.sequence,
    prevHash: args.prevHash,
    timestamp: new Date().toISOString(),
    subjectKind: args.subjectKind,
    subject: {},
    signature: null,
    hash: args.hash,
  } as unknown as ReceiptDocument
}

/**
 * Write a synthetic Stage-B receipt to disk (so prepareDispatch reads it as the
 * prior receipt) and return { locator, doc } — doc is the same content for
 * in-memory chain assertions.
 */
function plantStageBReceipt(repoRoot: string): { locator: string; doc: ReceiptDocument } {
  const doc = makeReceipt({
    stage: 'B',
    sequence: 1,
    prevHash: HASH_A,
    hash: HASH_B,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'RegistrationResult',
  })
  const receiptDir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
  mkdirSync(receiptDir, { recursive: true })
  const receiptFile = '000001-B-registration-result.json'
  writeFileSync(join(receiptDir, receiptFile), JSON.stringify(doc, null, 2))
  return { locator: `docs/receipts/${WORKFLOW_ID}/${receiptFile}`, doc }
}

// ─── AC3: extraction + fail-loud ─────────────────────────────────────────────

test('AC3a: pkg.priorCorrelationId equals the Stage-B receipt correlation.correlationId', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const { locator } = plantStageBReceipt(repoRoot)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator: locator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    assert.equal(pkg.priorCorrelationId, SHARED_CORRELATION_ID)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC3b: PRIOR_CORRELATION_MISSING when Stage-B receipt has no correlation object', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receiptDir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
    mkdirSync(receiptDir, { recursive: true })
    const receiptFile = '000001-B-registration-result.json'
    // Valid hash (so the prevHash guard passes) but NO correlation object.
    writeFileSync(
      join(receiptDir, receiptFile),
      JSON.stringify({ schemaVersion: '1', kind: 'stage', stage: 'B', hash: HASH_B }),
    )
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({
      priorReceiptLocator: `docs/receipts/${WORKFLOW_ID}/${receiptFile}`,
    })
    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'PRIOR_CORRELATION_MISSING')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC3c: PRIOR_CORRELATION_MISSING when correlationId is empty / missing / non-string', async () => {
  const cases: unknown[] = [
    { correlationId: '' }, // empty
    {}, // missing correlationId
    { correlationId: 12345 }, // non-string
  ]
  for (const correlation of cases) {
    const repoRoot = makeTempRepoRoot()
    try {
      const receiptDir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
      mkdirSync(receiptDir, { recursive: true })
      const receiptFile = '000001-B-registration-result.json'
      writeFileSync(
        join(receiptDir, receiptFile),
        JSON.stringify({
          schemaVersion: '1',
          kind: 'stage',
          stage: 'B',
          hash: HASH_B,
          correlation,
        }),
      )
      const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
      const candidate = makeCandidate({
        priorReceiptLocator: `docs/receipts/${WORKFLOW_ID}/${receiptFile}`,
      })
      await assert.rejects(
        () =>
          prepareDispatch(
            { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
            { repoRoot },
          ),
        (err: unknown) => {
          assert.ok(err instanceof DispatchError)
          assert.equal(err.code, 'PRIOR_CORRELATION_MISSING')
          return true
        },
      )
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  }
})

test('AC3d: PRIOR_CORRELATION_MISSING when prior correlationId is whitespace-only', async () => {
  // RB4-2/RA4-2: a blank/whitespace-only prior correlationId must fail loud at
  // prepareDispatch (guard trims), not slip through to a downstream schema check.
  const repoRoot = makeTempRepoRoot()
  try {
    const receiptDir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
    mkdirSync(receiptDir, { recursive: true })
    const receiptFile = '000001-B-registration-result.json'
    writeFileSync(
      join(receiptDir, receiptFile),
      JSON.stringify({
        schemaVersion: '1',
        kind: 'stage',
        stage: 'B',
        hash: HASH_B,
        correlation: { correlationId: '   ' },
      }),
    )
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({
      priorReceiptLocator: `docs/receipts/${WORKFLOW_ID}/${receiptFile}`,
    })
    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'PRIOR_CORRELATION_MISSING')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC4: Stage-C inherits, does not mint ────────────────────────────────────

test('AC4: Stage-C receipt inherits correlationId; sessionId/runId freshly minted', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const { locator } = plantStageBReceipt(repoRoot)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator: locator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    await executeDispatch(pkg, join(repoRoot, 'worktrees', 'wt'), {
      repoRoot,
      dispatchWorktreeFn: successWorktreeFn,
    })
    const receiptAbsPath = join(
      repoRoot,
      'docs',
      'receipts',
      WORKFLOW_ID,
      '000002-C-dispatch-order.json',
    )
    const receipt = JSON.parse(readFileSync(receiptAbsPath, 'utf8')) as Record<string, unknown>
    const correlation = receipt.correlation as Record<string, unknown>
    assert.equal(correlation.correlationId, pkg.priorCorrelationId)
    assert.equal(correlation.correlationId, SHARED_CORRELATION_ID)
    assert.equal(correlation.workflowId, WORKFLOW_ID)
    // sessionId / runId are freshly minted — must differ from the inherited id
    assert.notEqual(correlation.sessionId, pkg.priorCorrelationId)
    assert.notEqual(correlation.runId, pkg.priorCorrelationId)
    assert.notEqual(correlation.sessionId, correlation.runId)
    // RB4-1: session/run must NOT be inherited from Stage B either — Stage C
    // mints fresh ones, so they must differ from B's OWN session/run values.
    assert.notEqual(correlation.sessionId, SESSION_ID)
    assert.notEqual(correlation.runId, RUN_ID)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('RB4-1: Stage-C sessionId/runId are NOT inherited from Stage B (freshly minted)', async () => {
  // Locks the "session/run must NOT inherit" invariant independently: a future
  // regression that made Stage C copy B's sessionId/runId must fail here.
  const repoRoot = makeTempRepoRoot()
  try {
    const { doc: receiptB, locator } = plantStageBReceipt(repoRoot)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator: locator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    await executeDispatch(pkg, join(repoRoot, 'worktrees', 'wt'), {
      repoRoot,
      dispatchWorktreeFn: successWorktreeFn,
    })
    const receiptAbsPath = join(
      repoRoot,
      'docs',
      'receipts',
      WORKFLOW_ID,
      '000002-C-dispatch-order.json',
    )
    const receiptC = JSON.parse(readFileSync(receiptAbsPath, 'utf8')) as ReceiptDocument
    // C inherits B's correlationId but mints fresh session/run.
    assert.equal(receiptC.correlation.correlationId, receiptB.correlation.correlationId)
    assert.notEqual(receiptC.correlation.sessionId, receiptB.correlation.sessionId)
    assert.notEqual(receiptC.correlation.runId, receiptB.correlation.runId)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC5: regression — chain validates past C (load-bearing) ─────────────────

test('AC5: validateChain([A, B, C]) is valid and C inherits B correlationId', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    // Synthetic genesis A (seq 0) + Stage-B (seq 1) sharing one correlationId.
    const receiptA = makeReceipt({
      stage: 'A',
      sequence: 0,
      prevHash: null,
      hash: HASH_A,
      correlationId: SHARED_CORRELATION_ID,
      subjectKind: 'IntakeResult',
    })
    const { locator, doc: receiptB } = plantStageBReceipt(repoRoot)

    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator: locator })

    // Run the REAL fixed executeDispatch to produce Stage C on disk.
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    await executeDispatch(pkg, join(repoRoot, 'worktrees', 'wt'), {
      repoRoot,
      dispatchWorktreeFn: successWorktreeFn,
    })

    const receiptAbsPath = join(
      repoRoot,
      'docs',
      'receipts',
      WORKFLOW_ID,
      '000002-C-dispatch-order.json',
    )
    const receiptC = JSON.parse(readFileSync(receiptAbsPath, 'utf8')) as ReceiptDocument

    const result = validateChain([receiptA, receiptB, receiptC])
    assert.equal(result.valid, true, `chain must be valid; errors: ${result.errors.join('; ')}`)
    assert.equal(receiptC.correlation.correlationId, receiptB.correlation.correlationId)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC6: negative guard — forked C is invalid ───────────────────────────────

test('AC6: a forked Stage-C correlationId makes validateChain invalid (AC5c divergence)', () => {
  const receiptA = makeReceipt({
    stage: 'A',
    sequence: 0,
    prevHash: null,
    hash: HASH_A,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'IntakeResult',
  })
  const receiptB = makeReceipt({
    stage: 'B',
    sequence: 1,
    prevHash: HASH_A,
    hash: HASH_B,
    correlationId: SHARED_CORRELATION_ID,
    subjectKind: 'RegistrationResult',
  })
  // Stage C with a FORKED (freshly-minted-style) correlationId — the exact defect.
  const forkedC = makeReceipt({
    stage: 'C',
    sequence: 2,
    prevHash: HASH_B,
    hash: '3'.repeat(64),
    correlationId: 'bbbbbbbb-0000-4000-8000-000000000009',
    subjectKind: 'DispatchOrder',
  })

  const result = validateChain([receiptA, receiptB, forkedC])
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) => e.includes('diverges')),
    `expected an AC5c divergence error; got: ${result.errors.join('; ')}`,
  )
})
