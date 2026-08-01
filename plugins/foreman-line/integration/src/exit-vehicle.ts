/**
 * CLOSE-P1 — mint-chain exit-vehicle stage runners (FUP-2, RW3).
 *
 * Thin, exported stage-runner functions the COORDINATOR invokes live during
 * the minted A→F run. Each runner:
 *   1. loads the true on-disk chain TIP for `workflowId` under
 *      `docs/receipts/` (a local conforming-name scan mirroring `closure.ts`'s
 *      private `defaultLoadReceiptChain` — typed try-catch at every fs
 *      boundary, lesson #22; linear-time name checks, lesson #19),
 *   2. REFUSES typed-closed, before ANY write (rework R1-R3): a dishonest or
 *      invalid chain (lying filenames, duplicate sequences, validateChain
 *      failure) is `CHAIN_INVALID`; a tip that is not a `kind:'stage'`
 *      receipt of the expected stage AND sequence (E expects a `D` at
 *      sequence 3; F expects an `E` at sequence 4 — Q2's exactly-six pin)
 *      is `WRONG_PREDECESSOR` — the RW3 defensive closure of the
 *      caller-passes-tip contract; no receipt is written on refusal,
 *   3. calls the REAL existing emitter (`emitIntegrationReceipt` /
 *      `emitClosureReceipt` — FUP-2: no bespoke Stage-F draft path here)
 *      with the loaded tip as `priorReceipt` and the real default
 *      `writeReceiptDocument` in live use (`writeFn` is injectable for
 *      hermetic tests only).
 *
 * Q1 ruling: `prRef` carries the exact format
 * `pr-<number>@<full-40-char-head-sha>`; `parsePrRef`/`formatPrRef` pin it
 * with linear-time character loops (no regex backtracking surface).
 *
 * This module emits nothing by itself in the hermetic suite — the live A→F
 * emission is a coordinator-side procedure (spec §Design, D2/D6).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type {
  AuditTriggerEvaluation,
  CiJobOutcome,
  ClosureRecord,
  StageId,
} from '../../contracts/src/index.js'
import { STAGE_IDS, UUID_PATTERN } from '../../contracts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { validateChain } from '../../receipts/src/index.js'
import { emitClosureReceipt } from './closure-receipt.js'
import type { WriteReceiptFn } from './receipt.js'
import { emitIntegrationReceipt } from './receipt.js'

/** Typed error class for the exit-vehicle runners (SCAF-P4 Q2 precedent: standalone, not an `IntegrationError` union edit). */
export class ExitVehicleError extends Error {
  readonly code: 'WRONG_PREDECESSOR' | 'CHAIN_SCAN_FAILED' | 'CHAIN_INVALID' | 'PR_REF_INVALID'

  constructor(code: ExitVehicleError['code'], message: string) {
    super(message)
    this.name = 'ExitVehicleError'
    this.code = code
  }
}

/** The two components the Q1 `prRef` format carries. */
export interface ParsedPrRef {
  readonly prNumber: number
  readonly headSha: string
}

const SHA_LENGTH = 40

function isDigit(code: number): boolean {
  return code >= 48 && code <= 57
}

function isLowerHex(code: number): boolean {
  return (code >= 48 && code <= 57) || (code >= 97 && code <= 102)
}

/**
 * Parses the Q1-ruled `prRef` format `pr-<number>@<full-40-char-head-sha>`
 * (e.g. `pr-104@<40 lowercase hex chars>`). Strict/default-deny: `pr-`
 * prefix, one-or-more digits with no leading zero, a single `@`, exactly 40
 * lowercase-hex characters, nothing else. Linear time (single char loop).
 */
export function parsePrRef(prRef: string): ParsedPrRef {
  const fail = (reason: string): never => {
    throw new ExitVehicleError(
      'PR_REF_INVALID',
      `prRef must match 'pr-<number>@<full-40-char-head-sha>': ${reason} (got ${JSON.stringify(prRef)})`,
    )
  }

  if (typeof prRef !== 'string') return fail('not a string')
  if (!prRef.startsWith('pr-')) return fail("missing 'pr-' prefix")

  const at = prRef.indexOf('@')
  if (at === -1) return fail("missing '@' separator")
  if (at === 3) return fail('empty PR number')

  const numberPart = prRef.slice(3, at)
  for (let i = 0; i < numberPart.length; i++) {
    if (!isDigit(numberPart.charCodeAt(i))) return fail('PR number must be digits only')
  }
  if (numberPart.length > 1 && numberPart.charCodeAt(0) === 48) {
    return fail('PR number must not have a leading zero')
  }

  const shaPart = prRef.slice(at + 1)
  if (shaPart.length !== SHA_LENGTH) {
    return fail(`head SHA must be exactly ${SHA_LENGTH} characters, got ${shaPart.length}`)
  }
  for (let i = 0; i < shaPart.length; i++) {
    if (!isLowerHex(shaPart.charCodeAt(i))) {
      return fail('head SHA must be lowercase hex only')
    }
  }

  const prNumber = Number(numberPart)
  if (!Number.isSafeInteger(prNumber) || prNumber < 1) {
    return fail('PR number must be a positive safe integer')
  }

  return { prNumber, headSha: shaPart }
}

/** Formats the Q1-ruled `prRef`; validates inputs by round-tripping through `parsePrRef`. */
export function formatPrRef(prNumber: number, headSha: string): string {
  if (!Number.isSafeInteger(prNumber) || prNumber < 1) {
    throw new ExitVehicleError(
      'PR_REF_INVALID',
      `prNumber must be a positive safe integer, got ${JSON.stringify(prNumber)}`,
    )
  }
  const prRef = `pr-${prNumber}@${headSha}`
  parsePrRef(prRef)
  return prRef
}

// ─── Local chain-tip scan (mirrors closure.ts's private defaultLoadReceiptChain) ───

/** The loaded chain tip: the highest-sequence conforming receipt on disk. */
export interface LoadedChainTip {
  readonly document: ReceiptDocument
  readonly locator: string
}

function isConformingReceiptName(name: string): boolean {
  if (name.length < 15) return false
  for (let i = 0; i < 6; i++) {
    if (!isDigit(name.charCodeAt(i))) return false
  }
  if (name.charCodeAt(6) !== 45) return false
  const stage = name[7]
  if (stage === undefined || !STAGE_IDS.includes(stage as StageId)) return false
  if (name.charCodeAt(8) !== 45) return false
  if (!name.endsWith('.json')) return false
  const slugEnd = name.length - 5
  if (slugEnd <= 9) return false
  for (let i = 9; i < slugEnd; i++) {
    const code = name.charCodeAt(i)
    if (!((code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45)) return false
  }
  return true
}

function parseSequencePrefix(name: string): number {
  let value = 0
  for (let i = 0; i < 6; i++) {
    value = value * 10 + (name.charCodeAt(i) - 48)
  }
  return value
}

/**
 * Loads the true on-disk chain tip (RW3), REFUSING dishonest chains before
 * any write (rework R2). The full `docs/receipts/<workflowId>/` chain is
 * scanned (conforming names only) and, in order:
 *   1. honesty — each file's name-derived sequence and stage must equal its
 *      document's `sequence`/`stage` (lying-name decoys → `CHAIN_INVALID`),
 *      and no two files may carry the same sequence (duplicate shadowing →
 *      `CHAIN_INVALID`; never a scan-order tie-break);
 *   2. `validateChain` over the ordered documents — gaps, broken prevHash
 *      pointers, forked correlation, schema violations → `CHAIN_INVALID`
 *      (mirrors shipped `prepareClosure`'s pre-write posture);
 *   3. the highest-sequence receipt is returned as the tip.
 * Scan/IO faults are `CHAIN_SCAN_FAILED`; an absent/empty chain is a typed
 * refusal (the runners have no predecessor to chain from). Typed try-catch
 * at every fs boundary (lesson #22); linear-time name checks (lesson #19).
 */
export function loadChainTip(workflowId: string, repoRoot: string): LoadedChainTip {
  if (!new RegExp(UUID_PATTERN).test(workflowId)) {
    throw new ExitVehicleError(
      'CHAIN_SCAN_FAILED',
      `workflowId must match UUID_PATTERN, got ${JSON.stringify(workflowId)}`,
    )
  }
  const dir = join(repoRoot, 'docs', 'receipts', workflowId)
  let entries: { name: string; isFile: () => boolean }[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    throw new ExitVehicleError(
      'CHAIN_SCAN_FAILED',
      `cannot scan receipt directory '${dir}': ${String(err)}`,
    )
  }

  const collected: { sequence: number; loaded: LoadedChainTip }[] = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!isConformingReceiptName(entry.name)) continue
    const nameSequence = parseSequencePrefix(entry.name)
    const nameStage = entry.name[7]
    const locator = `docs/receipts/${workflowId}/${entry.name}`

    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(join(dir, entry.name), 'utf8'))
    } catch (err) {
      throw new ExitVehicleError(
        'CHAIN_SCAN_FAILED',
        `cannot read/parse receipt '${locator}': ${String(err)}`,
      )
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new ExitVehicleError('CHAIN_SCAN_FAILED', `receipt '${locator}' is not a JSON object`)
    }

    // R2(b): the filename must tell the truth about its document.
    const doc = parsed as Record<string, unknown>
    if (doc.sequence !== nameSequence) {
      throw new ExitVehicleError(
        'CHAIN_INVALID',
        `receipt '${locator}' name declares sequence ${nameSequence} but document.sequence is ${JSON.stringify(doc.sequence)} — refusing a lying-name chain`,
      )
    }
    if (doc.stage !== nameStage) {
      throw new ExitVehicleError(
        'CHAIN_INVALID',
        `receipt '${locator}' name declares stage '${nameStage}' but document.stage is ${JSON.stringify(doc.stage)} — refusing a lying-name chain`,
      )
    }

    collected.push({
      sequence: nameSequence,
      loaded: { document: parsed as unknown as ReceiptDocument, locator },
    })
  }
  if (collected.length === 0) {
    throw new ExitVehicleError(
      'CHAIN_SCAN_FAILED',
      `no conforming receipts found in '${dir}' — cannot determine a chain tip`,
    )
  }

  // R2(c): duplicate sequences are ambiguity, never a scan-order tie-break.
  collected.sort((a, b) => a.sequence - b.sequence)
  for (let i = 1; i < collected.length; i++) {
    const current = collected[i]
    const previous = collected[i - 1]
    if (current !== undefined && previous !== undefined && current.sequence === previous.sequence) {
      throw new ExitVehicleError(
        'CHAIN_INVALID',
        `duplicate sequence ${current.sequence} in '${dir}' ('${previous.loaded.locator}' vs '${current.loaded.locator}') — refusing an ambiguous chain`,
      )
    }
  }

  // R2(a): the full chain must be valid before anything chains on top of it.
  const validation = validateChain(collected.map((entry) => entry.loaded.document))
  if (!validation.valid) {
    throw new ExitVehicleError(
      'CHAIN_INVALID',
      `receipt chain in '${dir}' fails validateChain: ${validation.errors.join('; ')}`,
    )
  }

  const tip = collected[collected.length - 1]
  if (tip === undefined) {
    throw new ExitVehicleError('CHAIN_SCAN_FAILED', `no chain tip resolvable in '${dir}'`)
  }
  return tip.loaded
}

/**
 * Refuse (typed, pre-write) unless the loaded tip is a `kind:'stage'` receipt
 * (R1 — a claim sub-receipt is never a stage predecessor) of the expected
 * stage AND the expected sequence (R3 — Q2 pins the minted chain at exactly
 * six stage receipts, sequences 0-5, so E chains only on a D at 3 and F only
 * on an E at 4; orphaned longer chains are structurally refused as substrate).
 */
function assertTipStage(
  tip: LoadedChainTip,
  expected: StageId,
  expectedSequence: number,
  runner: string,
): void {
  const doc = tip.document as unknown as { kind?: unknown; stage?: unknown; sequence?: unknown }
  if (doc.kind !== 'stage') {
    throw new ExitVehicleError(
      'WRONG_PREDECESSOR',
      `${runner} requires the chain tip to be a kind:'stage' receipt, but tip '${tip.locator}' is kind ${JSON.stringify(doc.kind)} — no receipt written`,
    )
  }
  if (doc.stage !== expected) {
    throw new ExitVehicleError(
      'WRONG_PREDECESSOR',
      `${runner} requires the chain tip to be stage '${expected}', but tip '${tip.locator}' is stage ${JSON.stringify(doc.stage)} — no receipt written`,
    )
  }
  if (doc.sequence !== expectedSequence) {
    throw new ExitVehicleError(
      'WRONG_PREDECESSOR',
      `${runner} requires the chain tip at sequence ${expectedSequence} (Q2: exactly six stage receipts, 0-5), but tip '${tip.locator}' is at sequence ${JSON.stringify(doc.sequence)} — no receipt written`,
    )
  }
}

export interface RunStageEArgs {
  readonly workflowId: string
  readonly repoRoot: string
  /** Q1 format `pr-<number>@<full-40-char-head-sha>` — validated via `parsePrRef`. */
  readonly prRef: string
  /** The observed vehicle-PR head SHA; must equal the SHA carried inside `prRef`. */
  readonly headSha: string
  readonly ciJobs: readonly CiJobOutcome[]
  readonly auditTrigger: AuditTriggerEvaluation
  /** Injected write seam for hermetic tests; live use omits it (real `writeReceiptDocument`). */
  readonly writeFn?: WriteReceiptFn
}

/**
 * Live Stage-E runner: chain-tip scan → tip must be stage 'D' →
 * the REAL `emitIntegrationReceipt` with the tip as `priorReceipt`.
 */
export function runStageE(args: RunStageEArgs): ReceiptDocument {
  const parsed = parsePrRef(args.prRef)
  if (parsed.headSha !== args.headSha) {
    throw new ExitVehicleError(
      'PR_REF_INVALID',
      `prRef head SHA '${parsed.headSha}' does not match the supplied headSha '${args.headSha}'`,
    )
  }
  const tip = loadChainTip(args.workflowId, args.repoRoot)
  assertTipStage(tip, 'D', 3, 'runStageE')
  return emitIntegrationReceipt({
    prRef: args.prRef,
    ciJobs: args.ciJobs,
    auditTrigger: args.auditTrigger,
    priorReceipt: tip.document,
    repoRoot: args.repoRoot,
    writeFn: args.writeFn,
  })
}

export interface RunStageFArgs {
  readonly workflowId: string
  readonly repoRoot: string
  readonly closureRecord: ClosureRecord
  /** Injected write seam for hermetic tests; live use omits it (real `writeReceiptDocument`). */
  readonly writeFn?: WriteReceiptFn
}

/**
 * Live Stage-F runner (FUP-2): chain-tip scan → tip must be stage 'E' → the
 * REAL `emitClosureReceipt` with the tip as `priorReceipt`. Deliberately NOT
 * `executeClosure` (the Jira leg is deferred debt) and NOT a bespoke Stage-F
 * draft path — the only Stage-F construction lives in `closure-receipt.ts`.
 */
export function runStageF(args: RunStageFArgs): ReceiptDocument {
  const tip = loadChainTip(args.workflowId, args.repoRoot)
  assertTipStage(tip, 'E', 4, 'runStageF')
  return emitClosureReceipt({
    closureRecord: args.closureRecord,
    priorReceipt: tip.document,
    repoRoot: args.repoRoot,
    writeFn: args.writeFn,
  })
}
