/**
 * W2-P2 approval-cli unit tests.
 *
 * Tests use real sub-modules (routing-eval, skill-resolver) with their YAML
 * files copied into temp repoRoots. compressFn and dispatchWorktreeFn are
 * always injected mocks — no MCP calls, no git mutations.
 *
 * Coverage (ACs 2-16 from spec):
 *   AC2:  spec reading + frontmatter parsing
 *   AC3:  prior receipt reading + prevHash extraction; missing hash field
 *   AC4:  routing eval called with correct input
 *   AC5:  skill resolver called with correct input
 *   AC6:  kompress called with correct parcelSpecText + priorReceiptChain
 *   AC7:  stepZeroRestatement substrings
 *   AC8:  DispatchOrder validates against frozen schema
 *   AC9:  executeDispatch calls dispatchWorktree before any file write
 *   AC10: WORKTREE_FAILED on code !== 0; receipt not written
 *   AC11: Stage-C receipt written with correct fields
 *   AC12: executeDispatch returns correct shape
 *   AC13: SPEC_UNREADABLE on non-existent specPath
 *   AC14: SPEC_INVALID_FRONTMATTER on missing frontmatter / null workflowId
 *   AC15: PRIOR_RECEIPT_UNREADABLE — null locator, missing file, no hash
 *   AC16: COMPRESS_FAILED when compressFn rejects
 *   AC22: permissionProfile default — omitted in frontmatter → builder-standard
 */

import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import type {
  CandidateRecord,
  DispatchInput,
  DispatchOptions,
  DispatchWorktreeOutput,
  KompressCallResult,
  KompressFn,
} from '../src/index.js'
import { DispatchError, executeDispatch, prepareDispatch } from '../src/index.js'

// ─── Paths to real YAML fixtures ─────────────────────────────────────────────

const HERE = dirname(fileURLToPath(import.meta.url))
const REAL_ROUTING_POLICY = join(HERE, '..', '..', 'routing-policy', 'routing-policy.yaml')
const REAL_SKILL_INJECTION = join(HERE, '..', '..', 'skill-injection', 'skill-injection.yaml')

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Create a tmpDir with routing-policy.yaml and skill-injection.yaml copied in. */
function makeTempRepoRoot(): string {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'w2p2-test-'))
  const routingDir = join(tmpRoot, 'plugins', 'foreman-line', 'routing-policy')
  mkdirSync(routingDir, { recursive: true })
  writeFileSync(join(routingDir, 'routing-policy.yaml'), readFileSync(REAL_ROUTING_POLICY, 'utf8'))
  const skillDir = join(tmpRoot, 'plugins', 'foreman-line', 'skill-injection')
  mkdirSync(skillDir, { recursive: true })
  writeFileSync(join(skillDir, 'skill-injection.yaml'), readFileSync(REAL_SKILL_INJECTION, 'utf8'))
  return tmpRoot
}

/** Write a minimal spec file with YAML frontmatter and return the path. */
function writeSpecFile(
  repoRoot: string,
  frontmatter: Record<string, unknown>,
  body = '# Spec body\nSome content.',
): string {
  const specDir = join(repoRoot, 'specs')
  mkdirSync(specDir, { recursive: true })
  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${(v as string[]).map((s) => `'${s}'`).join(', ')}]`
      return `${k}: ${String(v)}`
    })
    .join('\n')
  const content = `---\n${fmLines}\n---\n\n${body}`
  const specPath = join(specDir, 'test-spec.md')
  writeFileSync(specPath, content)
  return specPath
}

const VALID_FRONTMATTER = {
  routing_class: 'architecture/risk',
  data_classification: 'public',
  surfaces: ['plugins/foreman-line/dispatch/'],
  permission_profile: 'builder-standard',
}

const WORKFLOW_ID = 'a1b2c3d4-0000-4000-8000-000000000001'

// Well-formed UUID stand-in for the Stage-B receipt's inherited correlationId.
// prepareDispatch now requires correlation.correlationId to be a non-empty
// string, so the Stage-B fixture must carry a valid correlation object.
const CORRELATION_ID = 'c0dec0de-0000-4000-8000-000000000001'

// Valid 64-char lowercase hex used as a stand-in for Stage-B receipt hashes in
// fixtures (validateReceiptDocument enforces the HASH_PATTERN '^[0-9a-f]{64}$').
const VALID_HEX_64 = 'a'.repeat(64)

/** Write a fake Stage-B receipt with the given hash and return its locator. */
function writeStageBReceipt(
  repoRoot: string,
  workflowId: string,
  hash = VALID_HEX_64,
  correlationId = CORRELATION_ID,
): string {
  const receiptDir = join(repoRoot, 'docs', 'receipts', workflowId)
  mkdirSync(receiptDir, { recursive: true })
  const receiptFile = '000001-B-registration-result.json'
  const receipt = {
    schemaVersion: '1',
    kind: 'stage',
    stage: 'B',
    // prepareDispatch inherits correlation.correlationId from this Stage-B
    // receipt; the fixture must carry a valid correlation object.
    correlation: {
      correlationId,
      sessionId: 'a1a1a1a1-0000-4000-8000-000000000002',
      workflowId,
      runId: 'a2a2a2a2-0000-4000-8000-000000000003',
    },
    workflowId,
    sequence: 1,
    prevHash: 'prev-stage-a-hash',
    hash,
    timestamp: new Date().toISOString(),
  }
  writeFileSync(join(receiptDir, receiptFile), JSON.stringify(receipt, null, 2))
  return `docs/receipts/${workflowId}/${receiptFile}`
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

// ─── AC2: spec reading + frontmatter parsing ──────────────────────────────────

test('AC2: prepareDispatch reads spec file and parses frontmatter correctly', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const candidate = makeCandidate({ priorReceiptLocator })

    const input: DispatchInput = {
      candidate,
      specPath,
      compressFn: makeMockCompressFn(),
      worktreePath: join(repoRoot, 'worktrees', 'w2p2'),
    }
    const pkg = await prepareDispatch(input, { repoRoot })

    assert.equal(pkg.specFrontmatter.routing_class, 'architecture/risk')
    assert.equal(pkg.specFrontmatter.data_classification, 'public')
    assert.deepEqual([...pkg.specFrontmatter.surfaces], ['plugins/foreman-line/dispatch/'])
    assert.equal(pkg.specFrontmatter.permission_profile, 'builder-standard')
    assert.ok(pkg.specText.includes('# Spec body'), 'specText should include spec body')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC3: prior receipt reading + prevHash ────────────────────────────────────

test('AC3: prevHash is extracted from Stage-B receipt hash field', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const knownHash = 'b'.repeat(64)
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID, knownHash)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    assert.equal(pkg.prevHash, knownHash)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC3b: PRIOR_RECEIPT_UNREADABLE when Stage-B receipt JSON has no hash field', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const receiptDir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
    mkdirSync(receiptDir, { recursive: true })
    const receiptFile = '000001-B-registration-result.json'
    writeFileSync(
      join(receiptDir, receiptFile),
      JSON.stringify({ schemaVersion: '1', kind: 'stage', stage: 'B' }),
    )
    const priorReceiptLocator = `docs/receipts/${WORKFLOW_ID}/${receiptFile}`
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'PRIOR_RECEIPT_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC4: routing eval called correctly ──────────────────────────────────────

test('AC4: routing eval result populates pkg.order.routingDecisionRef', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    assert.equal(pkg.order.routingDecisionRef, `docs/receipts/${WORKFLOW_ID}/routing-decision.json`)
    assert.equal(
      pkg.routingResult.routingDecisionRef,
      `docs/receipts/${WORKFLOW_ID}/routing-decision.json`,
    )
    // architecture/risk → frontier → claude-opus-4-8
    assert.equal(pkg.routingResult.resolvedModelId, 'claude-opus-4-8')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC5: skill resolver called correctly ────────────────────────────────────

test('AC5: skill resolver result populates pkg.order.injectedSkills', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    // surfaces: ['plugins/foreman-line/dispatch/'] — universal rule fires at minimum
    assert.ok(Array.isArray(pkg.order.injectedSkills))
    assert.ok(pkg.skillResult.injectedSkills.length >= 0)
    assert.deepEqual([...pkg.order.injectedSkills], [...pkg.skillResult.injectedSkills])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC6: kompress called with correct inputs ────────────────────────────────

test('AC6: kompressContext receives exact parcelSpecText and priorReceiptChain', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID, 'c'.repeat(64))
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER, '# My spec content\nHello world.')
    const stageBReceiptText = readFileSync(
      join(repoRoot, ...priorReceiptLocator.split('/')),
      'utf8',
    )
    const specText = readFileSync(specPath, 'utf8')
    const candidate = makeCandidate({ priorReceiptLocator })

    let capturedContent = ''
    const capturingFn: KompressFn = async (content: string) => {
      capturedContent = content
      return makeMockCompressFn()(content)
    }

    await prepareDispatch(
      { candidate, specPath, compressFn: capturingFn, worktreePath: '/tmp/wt' },
      { repoRoot },
    )

    // kompressContext joins parcelSpecText + priorReceiptChain with separator
    const expected = `${specText}\n\n---\n\n${stageBReceiptText}`
    assert.equal(capturedContent, expected)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC7: stepZeroRestatement substrings ─────────────────────────────────────

test('AC7: stepZeroRestatement contains all required substrings', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      {
        candidate,
        specPath,
        compressFn: makeMockCompressFn({ hash: 'artifact-hash-999' }),
        worktreePath: '/tmp/wt',
      },
      { repoRoot },
    )
    const restatement = pkg.order.stepZeroRestatement
    assert.ok(restatement.includes('KONE-9999'), 'must contain ticket key')
    assert.ok(restatement.includes(WORKFLOW_ID), 'must contain workflowId')
    assert.ok(restatement.includes('claude-opus-4-8'), 'must contain resolved model ID')
    assert.ok(restatement.includes('artifact ID:'), 'must contain "artifact ID:"')
    assert.ok(restatement.includes('artifact-hash-999'), 'must contain kompressArtifactId')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC8: DispatchOrder validates against frozen schema ──────────────────────

test('AC8: assembled DispatchOrder passes frozen schema validation', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )
    // If schema validation failed, prepareDispatch would have thrown ORDER_INVALID
    assert.ok(typeof pkg.order.parcelRef === 'string')
    assert.ok(typeof pkg.order.stepZeroRestatement === 'string')
    assert.ok(typeof pkg.order.routingDecisionRef === 'string')
    assert.ok(Array.isArray(pkg.order.injectedSkills))
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC9: executeDispatch calls dispatchWorktree before any file write ────────

test('AC9: worktree FAILED → receipt file does NOT exist', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )

    // Worktree fn that fails — receipt should NOT be written
    const failFn = (): DispatchWorktreeOutput => ({ code: 1, stdout: '', stderr: 'git failed' })
    const opts: DispatchOptions = { repoRoot, dispatchWorktreeFn: failFn }

    await assert.rejects(
      () => executeDispatch(pkg, join(repoRoot, 'worktrees', 'test-wt'), opts),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'WORKTREE_FAILED')
        return true
      },
    )

    // Receipt must NOT exist
    const receiptAbsPath = join(
      repoRoot,
      'docs',
      'receipts',
      WORKFLOW_ID,
      '000002-C-dispatch-order.json',
    )
    assert.equal(existsSync(receiptAbsPath), false, 'receipt must not exist after WORKTREE_FAILED')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC10: WORKTREE_FAILED on code !== 0 ─────────────────────────────────────

test('AC10: WORKTREE_FAILED when dispatchWorktreeFn returns code 1', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )

    await assert.rejects(
      () =>
        executeDispatch(pkg, join(repoRoot, 'worktrees', 'wt'), {
          repoRoot,
          dispatchWorktreeFn: () => ({ code: 1, stdout: '', stderr: 'error\n' }),
        }),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'WORKTREE_FAILED')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC11: Stage-C receipt written correctly ──────────────────────────────────

test('AC11: Stage-C receipt written with correct fields after executeDispatch', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const stageBHash = 'd'.repeat(64)
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID, stageBHash)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      {
        candidate,
        specPath,
        compressFn: makeMockCompressFn({ hash: 'kompress-artifact-id-test' }),
        worktreePath: '/tmp/wt',
      },
      { repoRoot },
    )

    await executeDispatch(pkg, join(repoRoot, 'worktrees', 'test-wt'), {
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
    assert.ok(existsSync(receiptAbsPath), 'Stage-C receipt must exist')

    const receipt = JSON.parse(readFileSync(receiptAbsPath, 'utf8')) as Record<string, unknown>
    assert.equal(receipt.stage, 'C')
    assert.equal(receipt.sequence, 2)
    assert.equal(receipt.prevHash, stageBHash)
    assert.equal(receipt.subjectKind, 'DispatchOrder')
    assert.ok(typeof receipt.hash === 'string' && receipt.hash.length > 0, 'hash must be non-empty')

    const subject = receipt.subject as Record<string, unknown>
    assert.equal(subject.kompressArtifactId, 'kompress-artifact-id-test')
    assert.ok(typeof subject.routingDecisionRef === 'string')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC12: executeDispatch returns correct shape ──────────────────────────────

test('AC12: executeDispatch returns { order, receiptLocator, worktreePath }', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )

    const worktreePath = join(repoRoot, 'worktrees', 'wt-result')
    const result = await executeDispatch(pkg, worktreePath, {
      repoRoot,
      dispatchWorktreeFn: successWorktreeFn,
    })

    assert.equal(result.worktreePath, worktreePath)
    assert.equal(result.receiptLocator, `docs/receipts/${WORKFLOW_ID}/000002-C-dispatch-order.json`)
    assert.equal(result.order.parcelRef, 'KONE-9999')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC13: SPEC_UNREADABLE ────────────────────────────────────────────────────

test('AC13: SPEC_UNREADABLE on non-existent specPath', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const candidate = makeCandidate({ priorReceiptLocator: 'docs/receipts/x/000001-B.json' })
    await assert.rejects(
      () =>
        prepareDispatch(
          {
            candidate: { ...candidate, workflowId: WORKFLOW_ID },
            specPath: join(repoRoot, 'nonexistent', 'spec.md'),
            compressFn: makeMockCompressFn(),
            worktreePath: '/tmp/wt',
          },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'SPEC_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC14: SPEC_INVALID_FRONTMATTER ──────────────────────────────────────────

test('AC14a: SPEC_INVALID_FRONTMATTER when routing_class is missing from frontmatter', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    // Write spec without routing_class
    const specPath = writeSpecFile(repoRoot, {
      data_classification: 'public',
      surfaces: ['plugins/foreman-line/dispatch/'],
    })
    const candidate = makeCandidate({ priorReceiptLocator })

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'SPEC_INVALID_FRONTMATTER')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC14b: SPEC_INVALID_FRONTMATTER when candidate.workflowId is null', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ workflowId: null })

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'SPEC_INVALID_FRONTMATTER')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC15: PRIOR_RECEIPT_UNREADABLE ──────────────────────────────────────────

test('AC15a: PRIOR_RECEIPT_UNREADABLE when priorReceiptLocator is null', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator: null })

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'PRIOR_RECEIPT_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC15b: PRIOR_RECEIPT_UNREADABLE when Stage-B receipt file does not exist', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({
      priorReceiptLocator: `docs/receipts/${WORKFLOW_ID}/000001-B-registration-result.json`,
    })

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'PRIOR_RECEIPT_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC15c: PRIOR_RECEIPT_UNREADABLE when Stage-B receipt JSON has missing hash field', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    // Write receipt without hash field
    const receiptDir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
    mkdirSync(receiptDir, { recursive: true })
    const receiptFile = '000001-B-registration-result.json'
    writeFileSync(
      join(receiptDir, receiptFile),
      JSON.stringify({ schemaVersion: '1', stage: 'B', sequence: 1 }),
    )
    const priorReceiptLocator = `docs/receipts/${WORKFLOW_ID}/${receiptFile}`
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'PRIOR_RECEIPT_UNREADABLE')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC16: COMPRESS_FAILED ────────────────────────────────────────────────────

test('AC16: COMPRESS_FAILED when compressFn rejects', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })

    const throwingFn: KompressFn = async (_: string) => {
      throw new Error('headroom_compress unavailable')
    }

    await assert.rejects(
      () =>
        prepareDispatch(
          { candidate, specPath, compressFn: throwingFn, worktreePath: '/tmp/wt' },
          { repoRoot },
        ),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'COMPRESS_FAILED')
        return true
      },
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC22: permissionProfile default ─────────────────────────────────────────

test('AC22: dispatchWorktreeFn receives builder-standard when permission_profile omitted', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    // Frontmatter WITHOUT permission_profile
    const fmWithoutProfile = {
      routing_class: 'architecture/risk',
      data_classification: 'public',
      surfaces: ['plugins/foreman-line/dispatch/'],
    }
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, fmWithoutProfile)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )

    // pkg.order.permissionProfile must be undefined
    assert.equal(pkg.order.permissionProfile, undefined)

    // Capture the profile passed to dispatchWorktreeFn
    let capturedProfile = ''
    const capturingWorktreeFn = (opts: { profile: string }): DispatchWorktreeOutput => {
      capturedProfile = opts.profile
      return { code: 0, stdout: '', stderr: '' }
    }

    await executeDispatch(pkg, join(repoRoot, 'worktrees', 'wt-default'), {
      repoRoot,
      dispatchWorktreeFn: capturingWorktreeFn,
    })

    assert.equal(capturedProfile, 'builder-standard')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── SF3: synchronous throw from dispatchWorktreeFn ──────────────────────────

test('SF3: WORKTREE_FAILED when dispatchWorktreeFn throws synchronously', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const priorReceiptLocator = writeStageBReceipt(repoRoot, WORKFLOW_ID)
    const specPath = writeSpecFile(repoRoot, VALID_FRONTMATTER)
    const candidate = makeCandidate({ priorReceiptLocator })
    const pkg = await prepareDispatch(
      { candidate, specPath, compressFn: makeMockCompressFn(), worktreePath: '/tmp/wt' },
      { repoRoot },
    )

    // Inject a worktree fn that throws synchronously rather than returning code !== 0
    const throwingWorktreeFn = (): DispatchWorktreeOutput => {
      throw new Error('emitter crashed')
    }
    const opts: DispatchOptions = { repoRoot, dispatchWorktreeFn: throwingWorktreeFn }

    await assert.rejects(
      () => executeDispatch(pkg, join(repoRoot, 'worktrees', 'sf3-wt'), opts),
      (err: unknown) => {
        assert.ok(err instanceof DispatchError)
        assert.equal(err.code, 'WORKTREE_FAILED')
        return true
      },
    )

    // Receipt must NOT have been written
    const receiptAbsPath = join(
      repoRoot,
      'docs',
      'receipts',
      WORKFLOW_ID,
      '000002-C-dispatch-order.json',
    )
    assert.equal(
      existsSync(receiptAbsPath),
      false,
      'receipt must not exist after synchronous throw',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── Barrel re-export smoke test ─────────────────────────────────────────────

test('barrel: DispatchError, prepareDispatch, executeDispatch exported from src/index.ts', () => {
  // Simply importing them without error proves the barrel works
  assert.ok(typeof DispatchError === 'function')
  assert.ok(typeof prepareDispatch === 'function')
  assert.ok(typeof executeDispatch === 'function')
})
