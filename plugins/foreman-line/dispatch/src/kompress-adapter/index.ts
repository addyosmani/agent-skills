/**
 * Kompress Adapter (W2-P4).
 *
 * Assembles dispatch context (parcel spec text + prior receipt chain),
 * compresses it via an injected CompressFn, writes a compression receipt,
 * and returns the compressed text plus artifact ID and receipt reference.
 *
 * Architecture: kompressContext does NOT call headroom_compress directly.
 * The injected CompressFn is provided by the coordinator (W2-P2), which runs
 * in the same Claude Code session where headroom_compress is available as a
 * plugin. Session-local hashes mean the builder kickstarter must carry the
 * compressed TEXT, not just the hash. See W2-P4 spec Architecture section.
 *
 * External-call wrapping (lesson #22):
 *   - await compressFn(content) is wrapped → KompressError('COMPRESS_FAILED')
 *   - mkdirSync/writeFileSync pair is wrapped → KompressError('RECEIPT_WRITE_FAILED')
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KompressCallResult {
  readonly compressed: string
  readonly hash: string
  readonly originalTokens: number
  readonly compressedTokens: number
  readonly tokensSaved: number
  readonly transforms: readonly string[]
}

export type KompressFn = (content: string) => Promise<KompressCallResult>

export interface KompressInput {
  readonly parcelSpecText: string
  readonly priorReceiptChain: readonly string[]
  readonly workflowId: string
}

export interface KompressResult {
  readonly artifactId: string
  readonly compressedText: string
  readonly originalTokens: number
  readonly compressedTokens: number
  readonly tokensSaved: number
  readonly transforms: readonly string[]
  readonly kompressReceiptRef: string
}

export interface KompressOptions {
  /**
   * Absolute path to the repository root. Receipt is written under
   * <repoRoot>/docs/receipts/<workflowId>/kompress.json.
   * Defaults to process.cwd(). Tests pass a tmpDir.
   */
  readonly repoRoot?: string
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class KompressError extends Error {
  readonly code: 'COMPRESS_FAILED' | 'RECEIPT_WRITE_FAILED'

  constructor(code: KompressError['code'], message: string) {
    super(message)
    this.name = 'KompressError'
    this.code = code
  }
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function kompressContext(
  input: KompressInput,
  compressFn: KompressFn,
  options: KompressOptions = {},
): Promise<KompressResult> {
  const repoRoot = options.repoRoot ?? process.cwd()

  // 1. Assemble content — empty chain: parcelSpecText only; with chain: join with separator
  const assembled =
    input.priorReceiptChain.length === 0
      ? input.parcelSpecText
      : [input.parcelSpecText, ...input.priorReceiptChain].join('\n\n---\n\n')

  // 2. Call compressFn — wrap in try-catch → COMPRESS_FAILED
  let result: KompressCallResult
  try {
    result = await compressFn(assembled)
  } catch (err) {
    throw new KompressError('COMPRESS_FAILED', `compressFn rejected: ${String(err)}`)
  }

  // 3. Validate result — missing/empty hash → COMPRESS_FAILED
  if (!result.hash) {
    throw new KompressError('COMPRESS_FAILED', 'compressFn returned result missing hash field')
  }
  if (!Array.isArray(result.transforms)) {
    throw new KompressError(
      'COMPRESS_FAILED',
      'compressFn returned result missing transforms field',
    )
  }
  if (
    typeof result.originalTokens !== 'number' ||
    typeof result.compressedTokens !== 'number' ||
    typeof result.tokensSaved !== 'number'
  ) {
    throw new KompressError(
      'COMPRESS_FAILED',
      'compressFn returned result with missing numeric fields',
    )
  }

  // 4. Assemble receipt object
  const receipt = {
    workflowId: input.workflowId,
    artifactId: result.hash,
    compressedTokens: result.compressedTokens,
    originalTokens: result.originalTokens,
    tokensSaved: result.tokensSaved,
    transforms: [...result.transforms],
    sessionScoped: true,
    timestamp: new Date().toISOString(),
  }

  // 5. Write receipt — mkdirSync + writeFileSync wrapped in single try-catch → RECEIPT_WRITE_FAILED
  const receiptDir = join(repoRoot, 'docs', 'receipts', input.workflowId)
  const receiptPath = join(receiptDir, 'kompress.json')
  try {
    mkdirSync(receiptDir, { recursive: true })
    writeFileSync(receiptPath, JSON.stringify(receipt, null, 2))
  } catch (err) {
    throw new KompressError(
      'RECEIPT_WRITE_FAILED',
      `Cannot write kompress receipt to ${receiptPath}: ${String(err)}`,
    )
  }

  // 6. Return result
  return {
    artifactId: result.hash,
    compressedText: result.compressed,
    originalTokens: result.originalTokens,
    compressedTokens: result.compressedTokens,
    tokensSaved: result.tokensSaved,
    transforms: [...result.transforms],
    kompressReceiptRef: `docs/receipts/${input.workflowId}/kompress.json`,
  }
}
