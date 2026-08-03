/**
 * W2-P4 kompress-adapter unit tests.
 *
 * All tests use a fresh tmpDir as repoRoot so no production receipts are
 * touched. A mock CompressFn factory avoids any MCP calls.
 *
 * Coverage:
 *   - AC2: empty priorReceiptChain → compressFn called with exactly parcelSpecText
 *   - AC3: two receipts in chain → compressFn called with exact joined string
 *   - AC4: result shape — all 7 fields present with correct values
 *   - AC5: receipt written — all 8 fields, sessionScoped === true, timestamp ISO 8601
 *   - AC6: overwrite — second call same workflowId overwrites receipt cleanly
 *   - AC7: COMPRESS_FAILED when compressFn throws
 *   - AC8: COMPRESS_FAILED when compressFn returns result with missing/empty hash
 *   - AC9: RECEIPT_WRITE_FAILED when receipt path is unwritable
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import type { KompressCallResult, KompressFn } from '../src/index.js'
import { KompressError, kompressContext } from '../src/index.js'

// ─── Mock factory ─────────────────────────────────────────────────────────────

function makeMockFn(overrides?: Partial<KompressCallResult>): KompressFn {
  return async (_content: string) => ({
    compressed: 'mock-compressed-text',
    hash: 'mock-hash-abc123',
    originalTokens: 100,
    compressedTokens: 30,
    tokensSaved: 70,
    transforms: ['mock-transform'],
    ...overrides,
  })
}

// ─── AC2: empty priorReceiptChain — exact parcelSpecText passed ────────────────

test('AC2: empty priorReceiptChain calls compressFn with exactly parcelSpecText', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac2-'))
  try {
    let capturedContent = ''
    const capturesFn: KompressFn = async (content: string) => {
      capturedContent = content
      return makeMockFn()(content)
    }
    await kompressContext(
      { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'ac2-test' },
      capturesFn,
      { repoRoot: tmpDir },
    )
    assert.equal(capturedContent, 'SPEC')
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC3: two receipts in chain — exact joined string passed ──────────────────

test('AC3: priorReceiptChain [R1, R2] calls compressFn with correct joined string', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac3-'))
  try {
    let capturedContent = ''
    const capturesFn: KompressFn = async (content: string) => {
      capturedContent = content
      return makeMockFn()(content)
    }
    await kompressContext(
      { parcelSpecText: 'SPEC', priorReceiptChain: ['R1', 'R2'], workflowId: 'ac3-test' },
      capturesFn,
      { repoRoot: tmpDir },
    )
    assert.equal(capturedContent, 'SPEC\n\n---\n\nR1\n\n---\n\nR2')
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC4: result shape — all 7 fields present with correct values ─────────────

test('AC4: kompressContext resolves with correct result shape', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac4-'))
  try {
    const result = await kompressContext(
      { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'ac4-test' },
      makeMockFn(),
      { repoRoot: tmpDir },
    )
    assert.equal(result.artifactId, 'mock-hash-abc123')
    assert.equal(result.compressedText, 'mock-compressed-text')
    assert.equal(result.originalTokens, 100)
    assert.equal(result.compressedTokens, 30)
    assert.equal(result.tokensSaved, 70)
    assert.deepEqual([...result.transforms], ['mock-transform'])
    assert.equal(result.kompressReceiptRef, 'docs/receipts/ac4-test/kompress.json')
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC5: receipt written — all 8 fields, sessionScoped === true ──────────────

test('AC5: receipt JSON contains all 8 required fields with correct values', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac5-'))
  const workflowId = 'ac5-receipt-test'
  try {
    await kompressContext(
      { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId },
      makeMockFn(),
      { repoRoot: tmpDir },
    )

    const receiptPath = join(tmpDir, 'docs', 'receipts', workflowId, 'kompress.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>

    // All 8 fields must be present
    assert.equal(receipt.workflowId, workflowId)
    assert.equal(receipt.artifactId, 'mock-hash-abc123')
    assert.equal(receipt.compressedTokens, 30)
    assert.equal(receipt.originalTokens, 100)
    assert.equal(receipt.tokensSaved, 70)
    assert.deepEqual(receipt.transforms, ['mock-transform'])
    assert.equal(receipt.sessionScoped, true, 'sessionScoped must be true')
    assert.ok(typeof receipt.timestamp === 'string', 'timestamp must be a string')
    assert.ok(
      !Number.isNaN(Date.parse(receipt.timestamp as string)),
      'timestamp must parse as a valid ISO 8601 date',
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC6: overwrite — second call same workflowId, receipt reflects second call ─

test('AC6: second call with same workflowId overwrites receipt without error', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac6-'))
  const workflowId = 'ac6-overwrite-test'
  try {
    // First call
    await kompressContext(
      { parcelSpecText: 'FIRST', priorReceiptChain: [], workflowId },
      makeMockFn({ hash: 'first-hash', compressed: 'first-compressed', tokensSaved: 40 }),
      { repoRoot: tmpDir },
    )

    // Second call — different result
    const result = await kompressContext(
      { parcelSpecText: 'SECOND', priorReceiptChain: [], workflowId },
      makeMockFn({ hash: 'second-hash', compressed: 'second-compressed', tokensSaved: 60 }),
      { repoRoot: tmpDir },
    )

    // Result reflects second call
    assert.equal(result.artifactId, 'second-hash')
    assert.equal(result.compressedText, 'second-compressed')
    assert.equal(result.tokensSaved, 60)

    // Receipt reflects second call
    const receiptPath = join(tmpDir, 'docs', 'receipts', workflowId, 'kompress.json')
    const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as Record<string, unknown>
    assert.equal(receipt.artifactId, 'second-hash')
    assert.equal(receipt.tokensSaved, 60)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC7: COMPRESS_FAILED when compressFn throws ─────────────────────────────

test('AC7: COMPRESS_FAILED when compressFn rejects with an error', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac7-'))
  try {
    const throwingFn: KompressFn = async (_content: string) => {
      throw new Error('headroom unavailable')
    }
    await assert.rejects(
      () =>
        kompressContext(
          { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'ac7-test' },
          throwingFn,
          { repoRoot: tmpDir },
        ),
      (err: unknown) => {
        assert.ok(err instanceof KompressError, 'must be a KompressError')
        assert.equal(err.code, 'COMPRESS_FAILED')
        return true
      },
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC8: COMPRESS_FAILED when compressFn returns result with missing hash ────

test('AC8: COMPRESS_FAILED when compressFn resolves with missing/empty hash', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac8-'))
  try {
    // hash is empty string — falsy
    const emptyHashFn = makeMockFn({ hash: '' })
    await assert.rejects(
      () =>
        kompressContext(
          { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'ac8-test' },
          emptyHashFn,
          { repoRoot: tmpDir },
        ),
      (err: unknown) => {
        assert.ok(err instanceof KompressError, 'must be a KompressError')
        assert.equal(err.code, 'COMPRESS_FAILED')
        assert.ok(
          (err as KompressError).message.includes('hash'),
          'message must mention missing hash field',
        )
        return true
      },
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── AC9: RECEIPT_WRITE_FAILED when receipt path is unwritable ────────────────

test('AC9: RECEIPT_WRITE_FAILED when kompress.json path is a directory (not writable as file)', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'w2p4-ac9-'))
  const workflowId = 'ac9-write-fail'
  try {
    // Create kompress.json as a directory so writeFileSync fails with EISDIR
    const receiptFileAsDir = join(tmpDir, 'docs', 'receipts', workflowId, 'kompress.json')
    mkdirSync(receiptFileAsDir, { recursive: true })

    await assert.rejects(
      () =>
        kompressContext(
          { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId },
          makeMockFn(),
          { repoRoot: tmpDir },
        ),
      (err: unknown) => {
        assert.ok(err instanceof KompressError, 'must be a KompressError')
        assert.equal(err.code, 'RECEIPT_WRITE_FAILED')
        return true
      },
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── SF1: COMPRESS_FAILED when compressFn returns result without transforms ───

test('SF1: COMPRESS_FAILED when compressFn returns result without transforms', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'ktest-'))
  try {
    const malformedFn = async (_: string) => ({
      compressed: 'x',
      hash: 'abc123',
      originalTokens: 10,
      compressedTokens: 5,
      tokensSaved: 5,
      transforms: undefined as unknown as readonly string[],
    })
    await assert.rejects(
      () =>
        kompressContext(
          { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'sf1-test' },
          malformedFn,
          { repoRoot: tmpDir },
        ),
      (err: unknown) => {
        assert.ok(err instanceof KompressError)
        assert.equal(err.code, 'COMPRESS_FAILED')
        return true
      },
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ─── SF2: COMPRESS_FAILED when compressFn returns result with undefined numeric fields ──

test('SF2: COMPRESS_FAILED when compressFn returns result with undefined numeric fields', async () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'ktest-'))
  try {
    const malformedFn = async (_: string) => ({
      compressed: 'x',
      hash: 'abc123',
      originalTokens: undefined as unknown as number,
      compressedTokens: 5,
      tokensSaved: 5,
      transforms: [] as readonly string[],
    })
    await assert.rejects(
      () =>
        kompressContext(
          { parcelSpecText: 'SPEC', priorReceiptChain: [], workflowId: 'sf2-test' },
          malformedFn,
          { repoRoot: tmpDir },
        ),
      (err: unknown) => {
        assert.ok(err instanceof KompressError)
        assert.equal(err.code, 'COMPRESS_FAILED')
        return true
      },
    )
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})
