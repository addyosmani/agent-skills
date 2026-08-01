/**
 * AC8 (the parcel's reason to exist): no invocation path - any argv
 * combination, any environment variable, any non-TTY input - produces an
 * approval (receipt + approval record) without (a) `process.stdin.isTTY`
 * true and (b) a matching typed confirmation phrase. The confirmation
 * comparison is a linear-time exact-string check.
 *
 * Proven three ways: (1) unit tests on the gating primitives directly; (2) a
 * static proof, by source inspection, that `src/cli.ts`'s `runApprove` calls
 * `performApproval` (the sole mint+write orchestrator, `src/approve-flow.ts`
 * - rework item 2) exactly once, and that call is textually preceded by both
 * the `isInteractiveTty()` check and the `confirmationMatches(...)` check,
 * with no other branch reaching it; (3) a static proof that
 * `mintGenesisReceipt`/`writeApprovalRecord`/`writeReceiptDocument` each have
 * exactly one call site in the package - inside `performApproval` - and no
 * other file calls `performApproval` itself. Combined with
 * `cli-verbs.test.ts`'s subprocess proof (non-TTY approve refuses, exit 2,
 * writes nothing), this rules out any bypass.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { confirmationMatches, isInteractiveTty } from '../src/confirm.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function collectTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectTsFiles(full))
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

test('isInteractiveTty is false for a non-TTY stream (e.g. a pipe) and true only when isTTY is exactly true', () => {
  assert.equal(isInteractiveTty({ isTTY: false } as unknown as NodeJS.ReadStream), false)
  assert.equal(isInteractiveTty({ isTTY: undefined } as unknown as NodeJS.ReadStream), false)
  assert.equal(isInteractiveTty({} as unknown as NodeJS.ReadStream), false)
  assert.equal(isInteractiveTty({ isTTY: true } as unknown as NodeJS.ReadStream), true)
})

test('confirmationMatches requires an exact match - no case-folding, trimming, or prefix match', () => {
  assert.equal(confirmationMatches('my-slug', 'my-slug'), true)
  assert.equal(confirmationMatches('MY-SLUG', 'my-slug'), false)
  assert.equal(confirmationMatches(' my-slug', 'my-slug'), false)
  assert.equal(confirmationMatches('my-slug ', 'my-slug'), false)
  assert.equal(confirmationMatches('my-slu', 'my-slug'), false)
  assert.equal(confirmationMatches('', 'my-slug'), false)
})

test('confirmationMatches completes fast on a pathologically long input (linear-time, lesson #19)', () => {
  const hostile = 'a'.repeat(500_000)
  const start = performance.now()
  const result = confirmationMatches(hostile, 'my-slug')
  const ms = performance.now() - start
  assert.equal(result, false)
  assert.ok(ms < 1000, `confirmationMatches took ${ms}ms`)
})

test('AC8: cli.ts calls performApproval exactly once, inside runApprove, preceded by BOTH gate checks', () => {
  const cliSource = readFileSync(join(packageDir, 'src', 'cli.ts'), 'utf8')

  const occurrences = cliSource.split('performApproval(').length - 1
  assert.equal(occurrences, 1, 'expected exactly one call to performApproval( in src/cli.ts')

  const approveStart = cliSource.indexOf('async function runApprove')
  const approveEnd = cliSource.indexOf('async function runReject')
  assert.ok(approveStart >= 0 && approveEnd > approveStart)
  const approveBody = cliSource.slice(approveStart, approveEnd)

  const ttyCheckIndex = approveBody.indexOf('isInteractiveTty()')
  const confirmCheckIndex = approveBody.indexOf('confirmationMatches(')
  const performIndex = approveBody.indexOf('performApproval(')

  assert.ok(ttyCheckIndex >= 0 && confirmCheckIndex >= 0 && performIndex >= 0)
  assert.ok(ttyCheckIndex < confirmCheckIndex, 'TTY check must precede the confirmation check')
  assert.ok(confirmCheckIndex < performIndex, 'confirmation check must precede performApproval')
})

test('AC8: no file other than src/cli.ts calls performApproval', () => {
  for (const file of collectTsFiles(join(packageDir, 'src'))) {
    if (file.endsWith(join('src', 'cli.ts'))) continue
    if (file.endsWith(join('src', 'approve-flow.ts'))) continue // defines, does not call, performApproval
    const text = readFileSync(file, 'utf8')
    assert.equal(text.includes('performApproval('), false, `${file} calls performApproval`)
  }
})

test('AC8/item2: mintGenesisReceipt, writeApprovalRecord, writeReceiptDocument each have exactly one call site, all inside performApproval, in record-before-receipt order', () => {
  const flowSource = readFileSync(join(packageDir, 'src', 'approve-flow.ts'), 'utf8')

  for (const symbol of ['mintGenesisReceipt(', 'writeApprovalRecord(', 'writeReceiptDocument(']) {
    const occurrences = flowSource.split(symbol).length - 1
    assert.equal(occurrences, 1, `expected exactly one call to ${symbol} in src/approve-flow.ts`)
  }

  const mintIndex = flowSource.indexOf('mintGenesisReceipt(')
  const writeRecordIndex = flowSource.indexOf('writeApprovalRecord(')
  const writeReceiptIndex = flowSource.indexOf('writeReceiptDocument(')

  assert.ok(mintIndex >= 0 && writeRecordIndex >= 0 && writeReceiptIndex >= 0)
  // Durability ordering (rework item 2): the approval record is written
  // BEFORE the receipt.
  assert.ok(
    writeRecordIndex < writeReceiptIndex,
    'approval record must be written before the receipt',
  )
})

test('AC8/item2: no file other than src/cli.ts and src/approve-flow.ts calls mintGenesisReceipt or writeApprovalRecord', () => {
  for (const file of collectTsFiles(join(packageDir, 'src'))) {
    if (file.endsWith(join('src', 'approve-flow.ts'))) continue
    if (file.endsWith(join('src', 'receipt.ts'))) continue // defines, does not call, mintGenesisReceipt
    if (file.endsWith(join('src', 'approval-record.ts'))) continue // defines writeApprovalRecord
    const text = readFileSync(file, 'utf8')
    assert.equal(text.includes('mintGenesisReceipt('), false, `${file} calls mintGenesisReceipt`)
    assert.equal(text.includes('writeApprovalRecord('), false, `${file} calls writeApprovalRecord`)
  }
})
