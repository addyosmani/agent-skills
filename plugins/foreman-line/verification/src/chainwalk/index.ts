/**
 * Receipt-Chain Walker (SCAF-P3) — read-only genesis → tip walkability check
 * plus deterministic markdown chain-table rendering.
 *
 * `walkChain(workflowId, repoRoot?)` scans `docs/receipts/<workflowId>/` for
 * receipt files conforming to the shipped 6-digit-prefix naming convention
 * (`receipts/src/paths.ts`), ignores non-conforming names (exactly as
 * `allocateSequence` does), and verifies the chain is walkable genesis → tip:
 * contiguous sequences from 0, genesis `prevHash` null, every subsequent
 * `prevHash` string-equal to the prior receipt's stored `hash`, and every
 * document valid against the frozen `validateReceiptDocument`. On any defect
 * it throws a `ChainWalkError` with a distinct named `code` — it never
 * returns a partial `ok: true`.
 *
 * `renderChainTable(result)` renders a deterministic GitHub-markdown table —
 * a pure function of its input (no clock/env reads), so byte-identical across
 * repeated invocations on the same input.
 *
 * Lessons discipline:
 *   #19 — all filename/label/cell scanning is linear-time (char-code loops /
 *         indexOf / startsWith / endsWith); no backtracking regex anywhere.
 *   #22 — every filesystem read is wrapped in a typed try-catch throwing a
 *         `ChainWalkError` with a named code.
 *
 * Deliberately NOT re-exported from the package barrel (`src/index.ts`) —
 * precedent: `writeClaimReceipt` in `src/harness/index.ts` is un-barreled.
 * Consumers import it by direct path.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateReceiptDocument } from '../../../receipts/src/index.js'

// ─── Error class ──────────────────────────────────────────────────────────────

export type ChainWalkErrorCode =
  | 'WORKFLOW_ID_INVALID'
  | 'RECEIPT_DIR_MISSING'
  | 'RECEIPT_UNREADABLE'
  | 'RECEIPT_INVALID'
  | 'SEQUENCE_BROKEN'
  | 'PREV_HASH_MISMATCH'
  | 'GENESIS_PREV_HASH_NOT_NULL'

export class ChainWalkError extends Error {
  readonly code: ChainWalkErrorCode

  constructor(code: ChainWalkErrorCode, message: string) {
    super(message)
    this.name = 'ChainWalkError'
    this.code = code
  }
}

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ChainEntry {
  readonly sequence: number
  readonly stage: string
  readonly kind: string
  /** null when the receipt carries no claim (kind 'stage'). */
  readonly claimRef: string | null
  readonly subjectKind: string
  readonly hash: string
}

export interface ChainWalkResult {
  /** Always true on return — every defect throws `ChainWalkError` instead. */
  readonly ok: true
  readonly workflowId: string
  /** One entry per conforming receipt, in sequence order, genesis first. */
  readonly entries: readonly ChainEntry[]
}

/** Fixed truncation length for the rendered hash-prefix column. */
export const HASH_PREFIX_LENGTH = 12

// ─── Linear-time character helpers (lesson #19) ──────────────────────────────

function isDigitCode(code: number): boolean {
  return code >= 48 && code <= 57
}

function isHexCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 102) || (code >= 65 && code <= 70)
}

function isSlugCode(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45
}

// ─── UUID guard (RF-3 mirror; reimplemented locally — the harness's guard is
//     intentionally private to src/harness/) ──────────────────────────────────

/** Hyphenated 8-4-4-4-12 hex group lengths. */
const UUID_GROUP_LENGTHS = [8, 4, 4, 4, 12] as const

function matchesUuidShape(value: string): boolean {
  if (value.length !== 36) return false
  let i = 0
  for (let group = 0; group < UUID_GROUP_LENGTHS.length; group++) {
    if (group > 0) {
      if (value.charCodeAt(i) !== 45 /* '-' */) return false
      i += 1
    }
    const groupLength = UUID_GROUP_LENGTHS[group] as number
    for (let k = 0; k < groupLength; k++) {
      if (!isHexCode(value.charCodeAt(i))) return false
      i += 1
    }
  }
  return true
}

/**
 * `workflowId` is joined into `docs/receipts/<workflowId>/`, so it is
 * validated against the hyphenated 8-4-4-4-12 hex UUID shape *before any
 * filesystem access* — traversal input like '../../..' fails loud with a
 * typed error, never reaching readdir/read.
 */
function assertValidWorkflowId(workflowId: string): void {
  if (!matchesUuidShape(workflowId)) {
    throw new ChainWalkError(
      'WORKFLOW_ID_INVALID',
      `workflowId must be a hyphenated 8-4-4-4-12 hex UUID before any filesystem access, got ${JSON.stringify(workflowId)}`,
    )
  }
}

// ─── Receipt-name recognition (6-digit-prefix convention; char-code only) ─────

/** StageId letters, checked by char code (contracts STAGE_IDS is 'A'..'F'). */
function isStageCode(code: number): boolean {
  return code >= 65 /* 'A' */ && code <= 70 /* 'F' */
}

/**
 * A filename conforms to `^\d{6}-<stage>-<slug>.json` (receipts/src/paths.ts)
 * iff: six ASCII digits, '-', a StageId letter, '-', a non-empty [a-z0-9-]
 * slug, '.json'. Checked with char-code loops only (lesson #19).
 */
function isConformingReceiptName(name: string): boolean {
  // minimal: 6 digits + '-' + stage + '-' + 1 slug char + '.json' = 15 chars
  if (name.length < 15) return false
  for (let i = 0; i < 6; i++) {
    if (!isDigitCode(name.charCodeAt(i))) return false
  }
  if (name.charCodeAt(6) !== 45) return false
  if (!isStageCode(name.charCodeAt(7))) return false
  if (name.charCodeAt(8) !== 45) return false
  if (!name.endsWith('.json')) return false
  const slugEnd = name.length - 5
  if (slugEnd <= 9) return false
  for (let i = 9; i < slugEnd; i++) {
    if (!isSlugCode(name.charCodeAt(i))) return false
  }
  return true
}

/** Linear-time integer parse of the 6-char prefix (not a regex). */
function parseSequencePrefix(name: string): number {
  let value = 0
  for (let i = 0; i < 6; i++) {
    value = value * 10 + (name.charCodeAt(i) - 48)
  }
  return value
}

// ─── walkChain ────────────────────────────────────────────────────────────────

function readString(doc: Record<string, unknown>, key: string, name: string): string {
  const value = doc[key]
  if (typeof value !== 'string' || value.length === 0) {
    throw new ChainWalkError(
      'RECEIPT_INVALID',
      `Receipt '${name}' has no non-empty string '${key}' field`,
    )
  }
  return value
}

/**
 * Read-only walk of the receipt chain under `docs/receipts/<workflowId>/`
 * (relative to `repoRoot`, default `process.cwd()`): verifies genesis → tip
 * walkability and returns one `ChainEntry` per conforming receipt in
 * sequence order, or throws a `ChainWalkError` with a distinct named code
 * for the first defect found. Performs no writes; its only filesystem access
 * is `readdirSync`/`readFileSync` under the receipt directory.
 */
export function walkChain(workflowId: string, repoRoot: string = process.cwd()): ChainWalkResult {
  assertValidWorkflowId(workflowId)
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)

  let names: string[]
  try {
    names = readdirSync(dir)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ChainWalkError(
        'RECEIPT_DIR_MISSING',
        `Receipt directory '${dir}' does not exist for workflow '${workflowId}'`,
      )
    }
    throw new ChainWalkError(
      'RECEIPT_UNREADABLE',
      `Cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }

  // Conforming names only, ordered by 6-digit sequence prefix.
  const conforming: { name: string; prefix: number }[] = []
  for (const name of names) {
    if (isConformingReceiptName(name)) {
      conforming.push({ name, prefix: parseSequencePrefix(name) })
    }
  }
  if (conforming.length === 0) {
    throw new ChainWalkError(
      'RECEIPT_DIR_MISSING',
      `Receipt directory '${dir}' contains no conforming receipt files (6-digit-prefix convention)`,
    )
  }
  conforming.sort((a, b) => a.prefix - b.prefix)

  // Filename-level sequence contiguity: exactly 0..N-1, no gaps or duplicates.
  for (let i = 0; i < conforming.length; i++) {
    const entry = conforming[i] as { name: string; prefix: number }
    if (entry.prefix !== i) {
      const prior = i > 0 ? (conforming[i - 1] as { name: string; prefix: number }) : null
      const defect =
        prior !== null && prior.prefix === entry.prefix
          ? `duplicate sequence ${entry.prefix} ('${prior.name}', '${entry.name}')`
          : `expected sequence ${i} but found '${entry.name}' (sequence ${entry.prefix})`
      throw new ChainWalkError(
        'SEQUENCE_BROKEN',
        `Receipt chain for workflow '${workflowId}' is not contiguous from genesis: ${defect}`,
      )
    }
  }

  const entries: ChainEntry[] = []
  let priorHash: string | null = null
  for (let i = 0; i < conforming.length; i++) {
    const { name } = conforming[i] as { name: string; prefix: number }
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    } catch (err) {
      throw new ChainWalkError(
        'RECEIPT_UNREADABLE',
        `Cannot read/parse receipt '${name}' in '${dir}': ${String(err)}`,
      )
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ChainWalkError('RECEIPT_INVALID', `Receipt '${name}' is not a JSON object`)
    }
    const doc = parsed as Record<string, unknown>

    // Genesis check first: a distinct code for a non-null genesis prevHash,
    // ahead of the general document validation that would also flag it.
    if (i === 0 && doc.prevHash !== null) {
      throw new ChainWalkError(
        'GENESIS_PREV_HASH_NOT_NULL',
        `Genesis receipt '${name}' must have prevHash null, got ${JSON.stringify(doc.prevHash)}`,
      )
    }

    const validation = validateReceiptDocument(doc)
    if (!validation.valid) {
      throw new ChainWalkError(
        'RECEIPT_INVALID',
        `Receipt '${name}' failed validateReceiptDocument: ${validation.errors.join('; ')}`,
      )
    }

    // Document sequence must agree with the filename prefix / walk position.
    if (doc.sequence !== i) {
      throw new ChainWalkError(
        'SEQUENCE_BROKEN',
        `Receipt '${name}' carries sequence ${JSON.stringify(doc.sequence)} but occupies chain position ${i}`,
      )
    }

    // prevHash linkage against the prior receipt's stored hash (string
    // equality only — no recomputation, same bound as validateChain AC5b).
    if (i > 0 && doc.prevHash !== priorHash) {
      throw new ChainWalkError(
        'PREV_HASH_MISMATCH',
        `Receipt '${name}' prevHash (${JSON.stringify(doc.prevHash)}) does not equal the prior receipt's hash (${JSON.stringify(priorHash)})`,
      )
    }

    const hash = readString(doc, 'hash', name)
    entries.push({
      sequence: i,
      stage: readString(doc, 'stage', name),
      kind: readString(doc, 'kind', name),
      claimRef: typeof doc.claimRef === 'string' ? doc.claimRef : null,
      subjectKind: readString(doc, 'subjectKind', name),
      hash,
    })
    priorHash = hash
  }

  return { ok: true, workflowId, entries }
}

// ─── renderChainTable ────────────────────────────────────────────────────────

/**
 * Neutralizes untrusted text for interpolation into ONE markdown table cell
 * (mirrored locally from the shipped human-gate/pipeline precedent, which is
 * frozen and does not export it): '|' is escaped to '\|' so hostile text can
 * never split a cell, and CR/LF (CRLF collapses to one) is replaced by a
 * single space so a row can never be broken open into a column-0
 * heading/fence. Linear-time char loop, no regex (lesson #19).
 */
function escapeTableCell(text: string): string {
  let result = ''
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    if (code === 124 /* '|' */) {
      result += '\\|'
    } else if (code === 13 /* CR */) {
      if (i + 1 < text.length && text.charCodeAt(i + 1) === 10 /* LF */) i += 1
      result += ' '
    } else if (code === 10 /* LF */) {
      result += ' '
    } else {
      result += text[i]
    }
  }
  return result
}

/**
 * Renders the deterministic GitHub-markdown chain table: a header row and one
 * row per chain entry — sequence, stage, kind, claimRef/subjectKind, and a
 * fixed-length truncated hash prefix. Pure function of `result` (no
 * timestamps-of-now, no environment reads), so byte-identical across repeated
 * invocations on the same input. Suitable for embedding in the W3-P4
 * human-review summary and PR verification-chain tables.
 */
export function renderChainTable(result: ChainWalkResult): string {
  const lines: string[] = []
  lines.push('| Sequence | Stage | Kind | Claim / Subject | Hash |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const entry of result.entries) {
    const claim = entry.claimRef === null ? '(none)' : escapeTableCell(entry.claimRef)
    const subject = escapeTableCell(entry.subjectKind)
    const hashPrefix = escapeTableCell(entry.hash.slice(0, HASH_PREFIX_LENGTH))
    lines.push(
      `| ${entry.sequence} | ${escapeTableCell(entry.stage)} | ${escapeTableCell(entry.kind)} | ${claim} / ${subject} | ${hashPrefix} |`,
    )
  }
  return lines.join('\n')
}
