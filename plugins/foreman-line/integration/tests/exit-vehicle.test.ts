/**
 * CLOSE-P1 ACs 3-6 — mint-chain exit-vehicle runners (RW3, FUP-2) + the
 * Q1 `prRef` parse helper.
 *
 *   AC3: each runner loads the chain tip from a temp-dir ON-DISK chain and
 *        passes it as `priorReceipt` — sequence/prevHash derive from the true
 *        highest-sequence receipt even when lower-sequence receipts exist.
 *   AC4: `runStageF` routes through the REAL `emitClosureReceipt`:
 *        kind:'stage', stage:'F', subjectKind:'ClosureRecord', correlation
 *        inherited. (No second Stage-F draft path exists in exit-vehicle.ts —
 *        reviewer verifies by reading.)
 *   AC5: wrong-predecessor refusal — typed throw, NO receipt written
 *        (asserted via an injected recording writeFn).
 *   AC6: chain-walk — synthetic valid A→D on disk, real runStageE + runStageF
 *        (real default write into the temp repoRoot), then the exit-pass
 *        triple in miniature: validateChain valid, isSealed true, ordered
 *        stages exactly ['A','B','C','D','E','F'] — plus a mutation companion
 *        (lesson #32) breaking each dimension independently.
 *   Q1:  parsePrRef/formatPrRef pin `pr-<number>@<full-40-char-head-sha>`
 *        default-deny, one test per invalid shape (Builder #3/#5).
 *
 * Hermetic: temp repoRoot only; no network, gh, git, or real docs/receipts.
 */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ClosureRecord } from '../../contracts/src/index.js'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { isSealed, validateChain } from '../../receipts/src/index.js'
import type { WriteReceiptFn } from '../src/index.js'
import {
  ExitVehicleError,
  formatPrRef,
  loadChainTip,
  parsePrRef,
  runStageE,
  runStageF,
} from '../src/index.js'
import {
  HASH_D,
  makeReceipt,
  makeStageEChain,
  makeTempRepoRoot,
  SHARED_CORRELATION_ID,
  SPEC_MOVE,
  scanChainFromDisk,
  VALID_MERGE_SHA,
  WORKFLOW_ID,
  writeChainToDisk,
} from './closure-fixtures.js'

const HEAD_SHA = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
const VALID_PR_REF = `pr-104@${HEAD_SHA}`

const CLOSURE_RECORD: ClosureRecord = {
  mergeSha: VALID_MERGE_SHA,
  ticketTransition: { ticketKey: 'KONE-TBD', fromStatus: 'In Review', toStatus: 'Done' },
  specLifecycleMove: SPEC_MOVE,
}

/** The synthetic valid genesis(A)→D chain (makeStageEChain minus E). */
function makeStageDChain(): ReceiptDocument[] {
  return makeStageEChain().slice(0, 4)
}

interface RecordingWrite {
  readonly writeFn: WriteReceiptFn
  readonly writes: { document: ReceiptDocument; locator: string }[]
}

function makeRecordingWrite(): RecordingWrite {
  const writes: { document: ReceiptDocument; locator: string }[] = []
  return {
    writes,
    writeFn: (document, locator, _repoRoot) => {
      writes.push({ document, locator })
      return locator
    },
  }
}

function stageEArgs(repoRoot: string, writeFn?: WriteReceiptFn) {
  return {
    workflowId: WORKFLOW_ID,
    repoRoot,
    prRef: VALID_PR_REF,
    headSha: HEAD_SHA,
    ciJobs: [{ job: 'plugins', outcome: 'success' as const }],
    auditTrigger: { triggered: false },
    writeFn,
  }
}

function assertExitVehicleThrow(fn: () => unknown, code: ExitVehicleError['code']): void {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof ExitVehicleError)
    assert.equal(err.name, 'ExitVehicleError')
    assert.equal(err.code, code)
    return true
  })
}

// ─── Q1: prRef parse helper ──────────────────────────────────────────────────

test('Q1: parsePrRef accepts the ruled format and yields number + head SHA', () => {
  assert.deepEqual(parsePrRef(VALID_PR_REF), { prNumber: 104, headSha: HEAD_SHA })
})

test('Q1: formatPrRef round-trips through parsePrRef', () => {
  assert.equal(formatPrRef(104, HEAD_SHA), VALID_PR_REF)
  assert.deepEqual(parsePrRef(formatPrRef(1, 'f'.repeat(40))), {
    prNumber: 1,
    headSha: 'f'.repeat(40),
  })
})

test("Q1: parsePrRef rejects a missing 'pr-' prefix", () => {
  assertExitVehicleThrow(() => parsePrRef(`104@${HEAD_SHA}`), 'PR_REF_INVALID')
})

test("Q1: parsePrRef rejects a missing '@' separator", () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-104${HEAD_SHA}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects an empty PR number', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-@${HEAD_SHA}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects a non-digit PR number', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-1x4@${HEAD_SHA}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects a leading-zero PR number', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-0104@${HEAD_SHA}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects a 39-char head SHA', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-104@${'a'.repeat(39)}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects a 41-char head SHA', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-104@${'a'.repeat(41)}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects uppercase hex in the head SHA', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-104@${'A'.repeat(40)}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef rejects non-hex characters in the head SHA', () => {
  assertExitVehicleThrow(() => parsePrRef(`pr-104@${'g'.repeat(40)}`), 'PR_REF_INVALID')
})

test('Q1: parsePrRef survives hostile long input in linear time', () => {
  const hostile = `pr-${'9'.repeat(100_000)}@${'a'.repeat(40)}`
  const started = Date.now()
  assertExitVehicleThrow(() => parsePrRef(hostile), 'PR_REF_INVALID')
  assert.ok(Date.now() - started < 1_000)
})

// ─── AC3: chain-tip scan (RW3) ───────────────────────────────────────────────

test('AC3: runStageE derives sequence/prevHash from the true highest-sequence on-disk receipt', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain())
  const recording = makeRecordingWrite()

  const receipt = runStageE(stageEArgs(repoRoot, recording.writeFn))

  // Lower-sequence receipts (A, B, C) exist on disk; the tip is D (seq 3).
  assert.equal(receipt.sequence, 4)
  assert.equal(receipt.prevHash, HASH_D)
  assert.equal(receipt.stage, 'E')
  assert.equal(recording.writes.length, 1)
  assert.equal(recording.writes[0]?.document, receipt)
})

test('AC3: loadChainTip returns the highest-sequence receipt, not an arbitrary ancestor', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain())
  const tip = loadChainTip(WORKFLOW_ID, repoRoot)
  assert.equal(tip.document.sequence, 3)
  assert.equal(tip.document.stage, 'D')
})

test('AC3: loadChainTip on an absent chain directory is a typed CHAIN_SCAN_FAILED', () => {
  assertExitVehicleThrow(() => loadChainTip(WORKFLOW_ID, makeTempRepoRoot()), 'CHAIN_SCAN_FAILED')
})

test('AC3: loadChainTip rejects a non-UUID workflowId (no path assembly from hostile input)', () => {
  assertExitVehicleThrow(() => loadChainTip('../escape', makeTempRepoRoot()), 'CHAIN_SCAN_FAILED')
})

// ─── AC4: runStageF routes through the real emitClosureReceipt (FUP-2) ──────

test('AC4: runStageF emits kind:stage, stage:F, subjectKind:ClosureRecord with inherited correlation', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageEChain())
  const recording = makeRecordingWrite()

  const receipt = runStageF({
    workflowId: WORKFLOW_ID,
    repoRoot,
    closureRecord: CLOSURE_RECORD,
    writeFn: recording.writeFn,
  })

  assert.equal(receipt.kind, 'stage')
  assert.equal(receipt.stage, 'F')
  assert.equal(receipt.subjectKind, 'ClosureRecord')
  assert.equal(receipt.claimRef, null)
  assert.equal(receipt.sequence, 5)
  assert.equal(receipt.correlation.correlationId, SHARED_CORRELATION_ID)
  assert.equal(receipt.correlation.workflowId, WORKFLOW_ID)
  assert.deepEqual(receipt.subject, CLOSURE_RECORD)
  assert.equal(recording.writes.length, 1)
})

// ─── AC5: wrong-predecessor refusal, no receipt written ─────────────────────

test("AC5: runStageE refuses when the tip is not stage 'D' — typed throw, zero writes", () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain().slice(0, 3)) // tip is C
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(
    () => runStageE(stageEArgs(repoRoot, recording.writeFn)),
    'WRONG_PREDECESSOR',
  )
  assert.equal(recording.writes.length, 0)
})

test("AC5: runStageF refuses when the tip is not stage 'E' — typed throw, zero writes", () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain()) // tip is D
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(
    () =>
      runStageF({
        workflowId: WORKFLOW_ID,
        repoRoot,
        closureRecord: CLOSURE_RECORD,
        writeFn: recording.writeFn,
      }),
    'WRONG_PREDECESSOR',
  )
  assert.equal(recording.writes.length, 0)
})

test('AC5: runStageE refuses a prRef whose SHA mismatches the supplied headSha — zero writes', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain())
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(
    () => runStageE({ ...stageEArgs(repoRoot, recording.writeFn), headSha: 'b'.repeat(40) }),
    'PR_REF_INVALID',
  )
  assert.equal(recording.writes.length, 0)
})

// ─── Rework R1-R3: dishonest/invalid chains refused pre-write ────────────────

/** Write a raw receipt file at an EXPLICIT name (to build lying-name decoys). */
function writeRawReceipt(repoRoot: string, name: string, document: ReceiptDocument): void {
  const dir = join(repoRoot, 'docs', 'receipts', WORKFLOW_ID)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, name), JSON.stringify(document, null, 2), 'utf8')
}

test("R1: a kind:'claim' stage-D tip is refused as an E predecessor — zero writes", () => {
  const repoRoot = makeTempRepoRoot()
  const chain = makeStageDChain().slice(0, 3) // A, B, C (seq 0-2)
  chain.push(
    makeReceipt({
      kind: 'claim',
      claimRef: 'stage-d-claim',
      stage: 'D',
      sequence: 3,
      prevHash: '3'.repeat(64),
      hash: HASH_D,
      subjectKind: 'VerificationVerdict',
    }),
  )
  writeChainToDisk(repoRoot, chain)
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(
    () => runStageE(stageEArgs(repoRoot, recording.writeFn)),
    'WRONG_PREDECESSOR',
  )
  assert.equal(recording.writes.length, 0)
})

test("R1: a kind:'claim' stage-E tip is refused as an F predecessor — zero writes", () => {
  const repoRoot = makeTempRepoRoot()
  const chain = makeStageDChain()
  chain.push(
    makeReceipt({
      kind: 'claim',
      claimRef: 'stage-e-claim',
      stage: 'E',
      sequence: 4,
      prevHash: HASH_D,
      hash: '5'.repeat(64),
      subjectKind: 'IntegrationResult',
    }),
  )
  writeChainToDisk(repoRoot, chain)
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(
    () =>
      runStageF({
        workflowId: WORKFLOW_ID,
        repoRoot,
        closureRecord: CLOSURE_RECORD,
        writeFn: recording.writeFn,
      }),
    'WRONG_PREDECESSOR',
  )
  assert.equal(recording.writes.length, 0)
})

test('R2: a gapped chain (A,B,C then D at sequence 4) is refused CHAIN_INVALID — zero writes', () => {
  const repoRoot = makeTempRepoRoot()
  const chain = makeStageDChain().slice(0, 3)
  chain.push(
    makeReceipt({
      stage: 'D',
      sequence: 4, // gap: no sequence 3
      prevHash: '3'.repeat(64),
      hash: HASH_D,
      subjectKind: 'VerificationVerdict',
    }),
  )
  writeChainToDisk(repoRoot, chain)
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(() => runStageE(stageEArgs(repoRoot, recording.writeFn)), 'CHAIN_INVALID')
  assert.equal(recording.writes.length, 0)
})

test('R2: a duplicate top sequence is refused CHAIN_INVALID (no scan-order tie-break) — zero writes', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain())
  // A second, conforming-named receipt also claiming sequence 3.
  writeRawReceipt(
    repoRoot,
    '000003-D-decoy-verdict.json',
    makeReceipt({
      stage: 'D',
      sequence: 3,
      prevHash: '3'.repeat(64),
      hash: 'e'.repeat(64),
      subjectKind: 'DecoyVerdict',
    }),
  )
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(() => runStageE(stageEArgs(repoRoot, recording.writeFn)), 'CHAIN_INVALID')
  assert.equal(recording.writes.length, 0)
})

test('R2: a filename lying about document.sequence is refused CHAIN_INVALID — zero writes', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain().slice(0, 3)) // A, B, C
  // Name says sequence 3; document says sequence 2.
  writeRawReceipt(
    repoRoot,
    '000003-D-verification-verdict.json',
    makeReceipt({
      stage: 'D',
      sequence: 2,
      prevHash: '2'.repeat(64),
      hash: HASH_D,
      subjectKind: 'VerificationVerdict',
    }),
  )
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(() => runStageE(stageEArgs(repoRoot, recording.writeFn)), 'CHAIN_INVALID')
  assert.equal(recording.writes.length, 0)
})

test('R2: a filename lying about document.stage is refused CHAIN_INVALID — zero writes', () => {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain().slice(0, 3)) // A, B, C
  // Name says stage D; document says stage C.
  writeRawReceipt(
    repoRoot,
    '000003-D-verification-verdict.json',
    makeReceipt({
      stage: 'C',
      sequence: 3,
      prevHash: '3'.repeat(64),
      hash: HASH_D,
      subjectKind: 'VerificationVerdict',
    }),
  )
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(() => runStageE(stageEArgs(repoRoot, recording.writeFn)), 'CHAIN_INVALID')
  assert.equal(recording.writes.length, 0)
})

test('R3: an orphan-shaped 14-receipt D-tip chain is refused as substrate — zero writes', () => {
  // Shaped like the pre-existing 1912af36-… chain: stage receipts plus claim
  // sub-receipts, contiguous 0-13, valid under validateChain, tip a
  // kind:'stage' stage-D receipt — at sequence 13, not 3 (Q2's six-receipt pin).
  const repoRoot = makeTempRepoRoot()
  const hashes = Array.from({ length: 14 }, (_, i) => i.toString().padStart(2, '0').repeat(32))
  const chain: ReceiptDocument[] = []
  const stageAt = (i: number): string => {
    if (i === 0) return 'A'
    if (i === 1) return 'B'
    if (i === 2) return 'C'
    return 'D'
  }
  for (let i = 0; i < 14; i++) {
    chain.push(
      makeReceipt({
        kind: i > 3 && i < 13 ? 'claim' : 'stage',
        claimRef: i > 3 && i < 13 ? `claim-${i}` : null,
        stage: stageAt(i),
        sequence: i,
        prevHash: i === 0 ? null : (hashes[i - 1] as string),
        hash: hashes[i] as string,
        subjectKind: i > 3 && i < 13 ? 'ClaimNote' : 'VerificationVerdict',
      }),
    )
  }
  writeChainToDisk(repoRoot, chain)
  const recording = makeRecordingWrite()
  assertExitVehicleThrow(
    () => runStageE(stageEArgs(repoRoot, recording.writeFn)),
    'WRONG_PREDECESSOR',
  )
  assert.equal(recording.writes.length, 0)
})

// ─── AC6: chain-walk — the exit-pass triple in miniature + mutations ─────────

function mintFullChain(): { repoRoot: string; chain: ReceiptDocument[] } {
  const repoRoot = makeTempRepoRoot()
  writeChainToDisk(repoRoot, makeStageDChain())
  // REAL default write into the temp repoRoot (no injected writeFn).
  runStageE(stageEArgs(repoRoot))
  runStageF({ workflowId: WORKFLOW_ID, repoRoot, closureRecord: CLOSURE_RECORD })
  return { repoRoot, chain: scanChainFromDisk(repoRoot) }
}

function orderedStages(chain: readonly ReceiptDocument[]): string[] {
  return [...chain].sort((a, b) => a.sequence - b.sequence).map((doc) => doc.stage)
}

test('AC6: real runStageE then runStageF over a synthetic A→D chain satisfies the exit-pass triple', () => {
  const { chain } = mintFullChain()
  assert.equal(chain.length, 6)
  assert.equal(validateChain(chain).valid, true)
  assert.equal(isSealed(chain), true)
  assert.deepEqual(orderedStages(chain), ['A', 'B', 'C', 'D', 'E', 'F'])
})

test('AC6 mutation (lesson #32): forked correlationId turns validateChain red', () => {
  const { chain } = mintFullChain()
  const mutated = chain.map((doc, index) =>
    index === 2
      ? ({
          ...doc,
          correlation: {
            ...doc.correlation,
            correlationId: 'bbbbbbbb-0000-4000-8000-00000000000f',
          },
        } as ReceiptDocument)
      : doc,
  )
  assert.equal(validateChain(mutated).valid, false)
})

test('AC6 mutation (lesson #32): dropping the F receipt turns isSealed red', () => {
  const { chain } = mintFullChain()
  const mutated = chain.filter((doc) => doc.stage !== 'F')
  assert.equal(isSealed(mutated), false)
})

test('AC6 mutation (lesson #32): reordered stages turn the stage-sequence assertion red', () => {
  const { chain } = mintFullChain()
  // Swap the stage labels of the last two receipts: sequence stays contiguous.
  const mutated = chain.map((doc, index) => {
    if (index === 4) return { ...doc, stage: 'F' } as ReceiptDocument
    if (index === 5) return { ...doc, stage: 'E' } as ReceiptDocument
    return doc
  })
  assert.notDeepEqual(orderedStages(mutated), ['A', 'B', 'C', 'D', 'E', 'F'])
})

test('AC6 binding: a chain [A, F] passes isSealed but fails the stage-sequence assertion (B1)', () => {
  // isSealed reads only the tip — the explicit stage-sequence assertion is a
  // separate invariant and must bind on its own (spec reviewer question 2).
  const a = makeReceipt({
    stage: 'A',
    sequence: 0,
    prevHash: null,
    hash: '1'.repeat(64),
    subjectKind: 'IntakeResult',
  })
  const f = makeReceipt({
    stage: 'F',
    sequence: 1,
    prevHash: '1'.repeat(64),
    hash: '2'.repeat(64),
    subjectKind: 'ClosureRecord',
  })
  assert.equal(isSealed([a, f]), true)
  assert.notDeepEqual(orderedStages([a, f]), ['A', 'B', 'C', 'D', 'E', 'F'])
})
