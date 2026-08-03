/**
 * W3-P4 human-gate suite, part 1: scaffold/exports (AC-1..AC-4), precondition
 * intake (AC-5..AC-7), summary pre-draft (AC-8..AC-11), decline path (AC-12).
 * Hermetic: tmpDir repoRoots, fixture transports, decision as a function
 * argument — no process, no network, no prompt (AC-19 by construction).
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { validateChain } from '../../receipts/src/index.js'
import { allocateSequence } from '../src/harness/index.js'
import { executeHumanGate, HumanGateError, prepareHumanGate } from '../src/human-gate/index.js'
import * as barrel from '../src/index.js'
import { countReworkAttempts } from '../src/pipeline/index.js'
import { PACKAGE_ROOT } from './helpers.js'
import {
  defaultInput,
  findReceiptsByClaimRef,
  listConforming,
  makeGateFixture,
  makeTransport,
  passVerdict,
  readEnvelope,
  readReceiptFile,
  writeEnvelope,
} from './human-gate-helpers.js'

const APPROVE_DECISION = { decision: 'approve', decidedBy: 'clint', note: 'ship it' } as const

function expectCode(fn: () => unknown, code: string): void {
  try {
    fn()
  } catch (err) {
    assert.ok(err instanceof HumanGateError, `expected HumanGateError, got ${String(err)}`)
    assert.equal(err.code, code)
    return
  }
  assert.fail(`expected HumanGateError('${code}') to be thrown`)
}

// ─── AC-1: sub-module exists; frozen surfaces untouched ──────────────────────
// The authoritative byte-diff against origin/main runs in the deterministic
// pass (git diff origin/main -- <frozen paths>); this proxy pins existence
// and that no frozen sibling source gained human-gate references.

test('AC-1: src/human-gate exists inside the package and frozen sibling sources carry no human-gate reference', () => {
  assert.ok(existsSync(join(PACKAGE_ROOT, 'src', 'human-gate', 'index.ts')))
  assert.ok(existsSync(join(PACKAGE_ROOT, 'src', 'human-gate', 'adapter.ts')))
  for (const frozen of ['harness', 'adversarial', 'pipeline']) {
    const text = readFileSync(join(PACKAGE_ROOT, 'src', frozen, 'index.ts'), 'utf8')
    assert.ok(
      !text.includes('human-gate'),
      `frozen src/${frozen}/index.ts must not reference human-gate`,
    )
  }
})

// ─── AC-2 / AC-3: toolchain gates (config-pinned proxies) ────────────────────
// Authoritative checks are `npx tsc --noEmit` and `npx biome check .` in the
// deterministic pass (the W3-P2 proxy precedent).

test('AC-2: tsconfig is intact (authoritative check: npx tsc --noEmit in the deterministic pass)', () => {
  const ours = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'tsconfig.json'), 'utf8')) as Record<
    string,
    unknown
  >
  assert.ok(ours.compilerOptions, 'tsconfig still declares compilerOptions')
})

test('AC-3: biome config is intact (authoritative check: npx biome check . in the deterministic pass)', () => {
  const ours = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'biome.json'), 'utf8')) as Record<
    string,
    unknown
  >
  assert.ok(ours.linter, 'biome.json still declares the linter block')
})

// ─── AC-4: barrel exports ─────────────────────────────────────────────────────

test('AC-4: src/index.ts exports the human-gate surface while every pre-existing W3-P1/P2/P3 export remains', () => {
  // New W3-P4 exports.
  for (const name of [
    'prepareHumanGate',
    'executeHumanGate',
    'retryHalfClosed',
    'createHumanGateJiraAdapter',
    'assertHumanGateJiraGate',
    'HumanGateError',
  ]) {
    assert.equal(typeof (barrel as Record<string, unknown>)[name], 'function', `missing ${name}`)
  }
  // Pre-existing exports unchanged.
  for (const name of [
    'allocateSequence',
    'recordBuildResult',
    'runHarness',
    'VerificationError',
    'AdversarialError',
    'buildReviewerLaunchCommand',
    'collectAdversarialFindings',
    'dispatchReview',
    'emitStopReport',
    'generateReviewKickstarter',
    'launchReviewer',
    'parseAdversarialFindings',
    'assembleVerdict',
    'countReworkAttempts',
    'emitVerificationVerdict',
    'generateBuildFixKickstarter',
    'generateRecoordinationKickstarter',
    'PipelineError',
    'planReverification',
    'routeRework',
  ]) {
    assert.ok(name in barrel, `pre-existing export ${name} must remain`)
  }
})

// ─── AC-5: precondition intake refuses typed ─────────────────────────────────

test('AC-5: a missing envelope file raises VERDICT_MISSING and produces no summary', () => {
  const fixture = makeGateFixture()
  const input = defaultInput(fixture)
  rmSync(fixture.envelopeAbs)
  expectCode(() => prepareHumanGate(input), 'VERDICT_MISSING')
  assert.ok(
    !existsSync(join(fixture.receiptsDirAbs, 'human-gate', 'review-summary.md')),
    'no summary results from a refusal',
  )
})

test('AC-5: an envelope failing the frozen stage-envelope schema raises VERDICT_INVALID (extra property, missing reworkSignal, malformed correlation)', () => {
  // Extra property (additionalProperties: false).
  const extra = makeGateFixture()
  const extraEnvelope = readEnvelope(extra)
  extraEnvelope.smuggled = true
  writeEnvelope(extra, extraEnvelope)
  expectCode(() => prepareHumanGate(defaultInput(extra)), 'VERDICT_INVALID')

  // Missing reworkSignal key (required either way).
  const missingKey = makeGateFixture()
  const missingEnvelope = readEnvelope(missingKey)
  delete missingEnvelope.reworkSignal
  writeEnvelope(missingKey, missingEnvelope)
  expectCode(() => prepareHumanGate(defaultInput(missingKey)), 'VERDICT_INVALID')

  // Malformed correlation.
  const badCorrelation = makeGateFixture()
  const badEnvelope = readEnvelope(badCorrelation)
  ;(badEnvelope.correlation as Record<string, unknown>).workflowId = 'not-a-uuid'
  writeEnvelope(badCorrelation, badEnvelope)
  expectCode(() => prepareHumanGate(defaultInput(badCorrelation)), 'VERDICT_INVALID')

  // Unparseable JSON.
  const garbage = makeGateFixture()
  writeFileSync(garbage.envelopeAbs, '{not json')
  expectCode(() => prepareHumanGate(defaultInput(garbage)), 'VERDICT_INVALID')
})

test('AC-5: a schema-valid rework envelope raises VERDICT_NOT_PASS', () => {
  const rework = makeGateFixture({
    ...passVerdict(),
    verdict: 'rework',
    harnessClaims: [{ claim: 'AC-1: alpha behavior holds', passed: false, evidence: 'boom' }],
  })
  expectCode(() => prepareHumanGate(defaultInput(rework)), 'VERDICT_NOT_PASS')
})

test('AC-5: a forged envelope raises VERDICT_RECEIPT_MISMATCH (missing locator target, differing hash)', () => {
  // Locator pointing nowhere.
  const dangling = makeGateFixture()
  const danglingEnvelope = readEnvelope(dangling)
  ;(danglingEnvelope.receipt as Record<string, unknown>).locator =
    `docs/receipts/${dangling.workflowId}/999999-D-nonexistent.json`
  writeEnvelope(dangling, danglingEnvelope)
  expectCode(() => prepareHumanGate(defaultInput(dangling)), 'VERDICT_RECEIPT_MISMATCH')

  // Hash differing from the on-disk receipt's stored hash.
  const forged = makeGateFixture()
  const forgedEnvelope = readEnvelope(forged)
  ;(forgedEnvelope.receipt as Record<string, unknown>).hash = 'deadbeef'
  writeEnvelope(forged, forgedEnvelope)
  expectCode(() => prepareHumanGate(defaultInput(forged)), 'VERDICT_RECEIPT_MISMATCH')
  assert.ok(!existsSync(join(forged.receiptsDirAbs, 'human-gate')), 'no summary from a refusal')
})

// ─── AC-22 (RH-1): receipt.locator shape guard at intake ─────────────────────

test('AC-22: hostile envelope receipt.locator shapes are RECEIPT_LOCATOR_INVALID before any path join', () => {
  const hostileLocators = [
    // Traversal out of the receipts tree.
    '../secrets/receipt.json',
    'docs/receipts/../../secrets/receipt.json',
    // Newline-bearing (comment-body injection shape) and control chars.
    'docs/receipts/x/evil\n.json',
    'docs/receipts/x/evil\r\n.json',
    // Absolute paths — POSIX and drive-letter.
    '/etc/passwd.json',
    'C:/evil/receipt.json',
    // Backslash separators.
    'docs\\receipts\\x\\receipt.json',
    // Wrong root / too shallow / wrong extension / empty segment.
    'elsewhere/receipts/x/receipt.json',
    'docs/receipts/receipt.json',
    'docs/receipts/x/receipt.txt',
    'docs/receipts//receipt.json',
    // Space (outside the receipts-path charset). The empty string is already
    // refused upstream by the frozen schema's minLength (VERDICT_INVALID).
    'docs/receipts/x/evil receipt.json',
  ]
  for (const locator of hostileLocators) {
    const fixture = makeGateFixture()
    const envelope = readEnvelope(fixture)
    ;(envelope.receipt as Record<string, unknown>).locator = locator
    writeEnvelope(fixture, envelope)
    expectCode(() => prepareHumanGate(defaultInput(fixture)), 'RECEIPT_LOCATOR_INVALID')
    assert.ok(
      !existsSync(join(fixture.receiptsDirAbs, 'human-gate')),
      `no summary results from the hostile locator ${JSON.stringify(locator)}`,
    )
  }
})

test('AC-22: the Jira comment body interpolates only the validated locator (approve path end-to-end)', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const { transport, calls } = makeTransport()
  const result = await executeHumanGate(pkg, APPROVE_DECISION, { transport })
  assert.equal(result.kind, 'closed')
  const commentBody = calls.find((call) => call.method === 'addComment')?.args[1] as string
  // The locator in the body is exactly the intake-validated envelope locator.
  assert.ok(commentBody.includes(pkg.envelope.receipt.locator))
  assert.ok(!commentBody.includes('..'), 'no traversal text reaches the comment body')
  assert.ok(!commentBody.includes('\\'), 'no backslash path reaches the comment body')
})

// ─── AC-6: workflowId validated before any filesystem access ─────────────────

test('AC-6: traversal-shaped workflowId is WORKFLOW_ID_INVALID at every entry point', async () => {
  const fixture = makeGateFixture()
  for (const hostile of ['../x', '', '..\\..\\evil', 'not-a-uuid', '../../../../etc']) {
    expectCode(
      () => prepareHumanGate({ ...defaultInput(fixture), workflowId: hostile }),
      'WORKFLOW_ID_INVALID',
    )
    await assert.rejects(
      barrel.retryHalfClosed(hostile, {
        transport: makeTransport().transport,
        repoRoot: fixture.repoRoot,
      }),
      (err: unknown) => err instanceof HumanGateError && err.code === 'WORKFLOW_ID_INVALID',
    )
  }
  const pkg = prepareHumanGate(defaultInput(fixture))
  await assert.rejects(
    executeHumanGate(
      { ...pkg, workflowId: '../x' },
      { decision: 'decline', decidedBy: 'clint', note: 'no' },
    ),
    (err: unknown) => err instanceof HumanGateError && err.code === 'WORKFLOW_ID_INVALID',
  )
})

// ─── AC-7: chain walk via the shipped validator ──────────────────────────────

test('AC-7: a broken or correlation-perturbed chain raises CHAIN_INVALID', () => {
  // prevHash tamper.
  const broken = makeGateFixture()
  const names = listConforming(broken)
  const tipName = names[names.length - 1] as string
  const tip = readReceiptFile(broken, tipName)
  tip.prevHash = 'f'.repeat(64)
  writeFileSync(join(broken.receiptsDirAbs, tipName), `${JSON.stringify(tip, null, 2)}\n`)
  // Keep the envelope cross-check honest: point the envelope's hash at the
  // stored (tampered) receipt's hash so the failure isolates to the chain.
  const brokenEnvelope = readEnvelope(broken)
  ;(brokenEnvelope.receipt as Record<string, unknown>).hash = tip.hash
  writeEnvelope(broken, brokenEnvelope)
  expectCode(() => prepareHumanGate(defaultInput(broken)), 'CHAIN_INVALID')

  // Correlation perturbation (the validateChain AC5c probe).
  const perturbed = makeGateFixture()
  const pNames = listConforming(perturbed)
  const pTipName = pNames[pNames.length - 1] as string
  const pTip = readReceiptFile(perturbed, pTipName)
  ;(pTip.correlation as Record<string, unknown>).correlationId =
    '11111111-2222-3333-4444-555555555555'
  writeFileSync(join(perturbed.receiptsDirAbs, pTipName), `${JSON.stringify(pTip, null, 2)}\n`)
  expectCode(() => prepareHumanGate(defaultInput(perturbed)), 'CHAIN_INVALID')
})

test('AC-7: quarantine/, rework/, human-gate/ contents and the envelope file are invisible to the chain walk', () => {
  const fixture = makeGateFixture()
  for (const sub of ['quarantine', 'rework']) {
    const dir = join(fixture.receiptsDirAbs, sub)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '000099-D-garbage.json'), '{not even json')
  }
  const humanGateDir = join(fixture.receiptsDirAbs, 'human-gate')
  mkdirSync(humanGateDir, { recursive: true })
  writeFileSync(join(humanGateDir, 'notes.md'), 'stray file, not the summary')
  const pkg = prepareHumanGate(defaultInput(fixture))
  assert.equal(pkg.verdict.verdict, 'pass')
})

// ─── AC-8: summary content ───────────────────────────────────────────────────

test('AC-8: the summary carries the n/m pass count, per-claim table, disposition table, and receipt chain table in sequence order', () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const text = pkg.summaryText
  assert.ok(text.includes('## Harness claims (2/2 passed)'))
  assert.ok(text.includes('| AC-1: alpha behavior holds | true | test-alpha |'))
  assert.ok(text.includes('| AC-2: beta behavior holds | true | test-beta |'))
  assert.ok(
    text.includes('| 0 | low | minor naming nit | spec section 1 | accept | accepted as a nit |'),
  )
  // Chain table: one row per chain receipt, sequence order.
  const chainHeader = text.indexOf(
    '| sequence | stage | kind | claimRef | subjectKind | hash | locator |',
  )
  assert.ok(chainHeader !== -1)
  const seq0 = text.indexOf('| 0 | C | stage |', chainHeader)
  const seq1 = text.indexOf('| 1 | D | claim |', chainHeader)
  assert.ok(seq0 !== -1 && seq1 !== -1 && seq0 < seq1, 'chain rows present in sequence order')
  assert.ok(text.includes('000000-C-dispatch-order.json'))
  // On-disk copy matches the returned text.
  const onDisk = readFileSync(
    join(fixture.receiptsDirAbs, 'human-gate', 'review-summary.md'),
    'utf8',
  )
  assert.equal(onDisk, text)
})

// ─── AC-9: RP-4 cell escaping ────────────────────────────────────────────────

test('AC-9: hostile finding text cannot split a cell, add a row, or open a fence/heading; escaping is linear-time', () => {
  const hostile = 'evil | injected |\n# smuggled heading\r\n```\nfence body\n```\n| fake | row |'
  const fixture = makeGateFixture({
    ...passVerdict(),
    adversarialFindings: [{ summary: hostile, citation: 'cite | x\nline', severity: 'low' }],
  })
  const pkg = prepareHumanGate(defaultInput(fixture))
  const lines = pkg.summaryText.split('\n')
  for (const line of lines) {
    assert.ok(!line.startsWith('```'), 'no fence can open at column 0')
    if (line.startsWith('#')) {
      assert.ok(
        line.startsWith('# Human review summary') || line.startsWith('## '),
        `only the module's own headings may exist, got: ${line}`,
      )
    }
  }
  // The hostile pipes arrive escaped; the raw injected cell divider does not survive.
  assert.ok(pkg.summaryText.includes('evil \\| injected'))
  assert.ok(!pkg.summaryText.includes('| fake | row |'))
  // The disposition table row count is exactly one data row (no smuggled rows).
  const tableStart = lines.indexOf('| # | severity | summary | citation | disposition | note |')
  assert.ok(tableStart !== -1)
  const dataRows: string[] = []
  for (let i = tableStart + 2; i < lines.length && (lines[i] as string).startsWith('|'); i++) {
    dataRows.push(lines[i] as string)
  }
  assert.equal(dataRows.length, 1, 'hostile text must not add table rows')

  // Linear-time: a 100k-char hostile input completes without pathological slowdown.
  const big = '|x\r\n'.repeat(25_000)
  const bigFixture = makeGateFixture({
    ...passVerdict(),
    adversarialFindings: [{ summary: big, citation: 'c', severity: 'low' }],
  })
  const start = process.hrtime.bigint()
  prepareHumanGate(defaultInput(bigFixture))
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1_000_000
  assert.ok(elapsedMs < 5_000, `100k-char hostile input took ${elapsedMs}ms`)
})

// ─── AC-10: exclusive summary write + scan invisibility ──────────────────────

test('AC-10: the summary write is exclusive (SUMMARY_EXISTS on re-run) and human-gate/ never perturbs allocateSequence or countReworkAttempts', () => {
  const fixture = makeGateFixture()
  const before = allocateSequence(fixture.workflowId, fixture.repoRoot)
  prepareHumanGate(defaultInput(fixture))
  expectCode(() => prepareHumanGate(defaultInput(fixture)), 'SUMMARY_EXISTS')
  const after = allocateSequence(fixture.workflowId, fixture.repoRoot)
  assert.deepEqual(after, before, 'allocateSequence unaffected by human-gate/ contents')
  assert.equal(countReworkAttempts(fixture.workflowId, { repoRoot: fixture.repoRoot }), 0)
})

// ─── AC-11: Phase 1 writes no receipt ────────────────────────────────────────

test('AC-11: prepareHumanGate leaves the conforming-named receipt contents byte-identical (no chain residue)', () => {
  const fixture = makeGateFixture()
  const namesBefore = listConforming(fixture)
  const bytesBefore = namesBefore.map((name) =>
    readFileSync(join(fixture.receiptsDirAbs, name), 'utf8'),
  )
  prepareHumanGate(defaultInput(fixture))
  const namesAfter = listConforming(fixture)
  assert.deepEqual(namesAfter, namesBefore)
  namesAfter.forEach((name, i) => {
    assert.equal(readFileSync(join(fixture.receiptsDirAbs, name), 'utf8'), bytesBefore[i])
  })
})

// ─── AC-12: decline path ──────────────────────────────────────────────────────

test('AC-12: decline emits exactly one declined Stage-D sub-receipt, chained and validateChain-accepted, with zero transport calls', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const { transport, calls } = makeTransport()
  const before = listConforming(fixture)
  const result = await executeHumanGate(
    pkg,
    { decision: 'decline', decidedBy: 'clint', note: 'not convinced by the evidence' },
    { transport },
  )
  assert.equal(result.kind, 'declined')
  const after = listConforming(fixture)
  assert.equal(after.length, before.length + 1, 'exactly one new receipt')
  const declined = findReceiptsByClaimRef(fixture, 'human-gate-declined')
  assert.equal(declined.length, 1)
  const doc = declined[0] as Record<string, unknown>
  assert.equal(doc.kind, 'claim')
  assert.equal(doc.stage, 'D')
  assert.equal(doc.subjectKind, 'HumanGateDecision')
  assert.equal(doc.signature, null)
  const subject = doc.subject as Record<string, unknown>
  assert.equal(subject.decision, 'declined')
  assert.equal(subject.decidedBy, 'clint')
  assert.equal(subject.note, 'not convinced by the evidence')
  assert.equal(subject.summaryPath, pkg.summaryPath)
  assert.deepEqual(subject.verdictReceipt, {
    hash: pkg.envelope.receipt.hash,
    locator: pkg.envelope.receipt.locator,
  })
  // Correlation inherited from the chain tip.
  const genesis = readReceiptFile(fixture, '000000-C-dispatch-order.json')
  assert.equal(
    (doc.correlation as Record<string, unknown>).correlationId,
    (genesis.correlation as Record<string, unknown>).correlationId,
  )
  // The extended chain validates.
  const chain = listConforming(fixture).map(
    (name) => readReceiptFile(fixture, name) as unknown as ReceiptDocument,
  )
  assert.equal(validateChain(chain).valid, true)
  // ZERO Jira calls of any kind on decline.
  assert.equal(calls.length, 0)
})

test('AC-12: an empty note or malformed decision raises INPUT_INVALID before any write', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const before = listConforming(fixture)
  for (const decision of [
    { decision: 'decline', decidedBy: 'clint', note: '' },
    { decision: 'maybe', decidedBy: 'clint', note: 'x' },
    { decision: 'decline', decidedBy: '', note: 'x' },
    null,
  ]) {
    await assert.rejects(
      // biome-ignore lint/suspicious/noExplicitAny: hostile-shape probe
      executeHumanGate(pkg, decision as any),
      (err: unknown) => err instanceof HumanGateError && err.code === 'INPUT_INVALID',
    )
  }
  assert.deepEqual(listConforming(fixture), before, 'no write results from INPUT_INVALID')
})
