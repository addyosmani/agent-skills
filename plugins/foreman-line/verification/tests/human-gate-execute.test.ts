/**
 * W3-P4 human-gate suite, part 2: approve path + closure (AC-13), default-deny
 * gate (AC-14), half-closed state (AC-15), idempotent retry (AC-16), scope and
 * hermeticity greps (AC-17..AC-21), and the rework-amendment ACs: post-closure
 * idempotency (AC-23/RH-3), crash recovery (AC-24/RH-8), name-only transition
 * resolution (AC-25/RH-7). Hermetic: fixture transports only.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { validateChain } from '../../receipts/src/index.js'
import type { McpToolClient } from '../../registration/src/index.js'
import { createHumanGateJiraAdapter } from '../src/human-gate/adapter.js'
import {
  assertHumanGateJiraGate,
  executeHumanGate,
  HumanGateError,
  prepareHumanGate,
  resolveTransitionId,
  retryHalfClosed,
} from '../src/human-gate/index.js'
import { PACKAGE_ROOT } from './helpers.js'
import {
  defaultInput,
  findReceiptsByClaimRef,
  type GateFixture,
  listConforming,
  makeGateFixture,
  makeTransport,
  readReceiptFile,
} from './human-gate-helpers.js'

const APPROVE = { decision: 'approve', decidedBy: 'clint', note: 'ship it' } as const

function assertValidExtendedChain(fixture: GateFixture): void {
  const chain = listConforming(fixture).map(
    (name) => readReceiptFile(fixture, name) as unknown as ReceiptDocument,
  )
  assert.equal(validateChain(chain).valid, true, validateChain(chain).errors.join('; '))
}

// ─── AC-13: approve path ──────────────────────────────────────────────────────

test('AC-13: approve lands the approval receipt BEFORE the first transport call, resolves the transition by name, comments the chain link, and emits the closure sub-receipt', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  let approvalOnDiskAtIntercept = false
  const { transport, calls } = makeTransport({
    onGetTransitions: () => {
      approvalOnDiskAtIntercept =
        findReceiptsByClaimRef(fixture, 'human-gate-approved').length === 1
    },
  })
  const result = await executeHumanGate(pkg, APPROVE, { transport })
  assert.equal(result.kind, 'closed')
  assert.ok(approvalOnDiskAtIntercept, 'the approval receipt precedes the first Jira call')

  // Transition resolved by NAME against the live list, never a hardcoded id.
  assert.deepEqual(
    calls.map((call) => call.method),
    ['getTransitions', 'transitionIssue', 'addComment'],
  )
  assert.deepEqual(calls[1]?.args, ['KONE-123', '31'])

  // Comment body carries workflowId, verdict receipt locator, chain-tip hash.
  const commentBody = calls[2]?.args[1] as string
  assert.ok(commentBody.includes(fixture.workflowId))
  assert.ok(commentBody.includes(pkg.envelope.receipt.locator))
  assert.ok(commentBody.includes(pkg.chainTip.hash))

  // Closure sub-receipt subject.
  const closures = findReceiptsByClaimRef(fixture, 'stage-d-closure')
  assert.equal(closures.length, 1)
  const closure = closures[0] as Record<string, unknown>
  assert.equal(closure.kind, 'claim')
  assert.equal(closure.stage, 'D')
  assert.equal(closure.subjectKind, 'StageDClosure')
  const subject = closure.subject as Record<string, unknown>
  assert.equal(subject.ticketKey, 'KONE-123')
  assert.deepEqual(subject.ticketTransition, { fromStatus: 'unknown', toStatus: 'Done' })
  assert.equal(subject.jiraCommentRef, 'comment-ref-1')
  assert.equal(subject.summaryPath, pkg.summaryPath)
  assert.equal(typeof subject.approvalReceiptLocator, 'string')
  assert.deepEqual(subject.verdictReceipt, {
    hash: pkg.envelope.receipt.hash,
    locator: pkg.envelope.receipt.locator,
  })
  if (result.kind === 'closed') {
    assert.deepEqual(result.ticketTransition, { fromStatus: 'unknown', toStatus: 'Done' })
  }
  assertValidExtendedChain(fixture)
})

// ─── AC-23 (RH-3): executeHumanGate is idempotent after closure ──────────────

test('AC-23: a second executeHumanGate after a successful close is a typed no-op — zero transport calls, zero writes, no second approval receipt', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const first = await executeHumanGate(pkg, APPROVE, { transport: makeTransport().transport })
  assert.equal(first.kind, 'closed')
  const namesBefore = listConforming(fixture)

  // Second approve: closure pre-check short-circuits before any write or call.
  const { transport, calls } = makeTransport()
  const second = await executeHumanGate(pkg, APPROVE, { transport })
  assert.equal(second.kind, 'closed')
  if (first.kind === 'closed' && second.kind === 'closed') {
    assert.equal(second.closureReceiptLocator, first.closureReceiptLocator)
  }
  assert.equal(calls.length, 0, 'zero transport calls on the second executeHumanGate')
  assert.deepEqual(listConforming(fixture), namesBefore, 'zero receipt writes on the second call')
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1)
  assert.equal(findReceiptsByClaimRef(fixture, 'stage-d-closure').length, 1)

  // A post-closure decline is likewise the closed no-op — never a decline
  // receipt on an already-closed workflow.
  const declined = await executeHumanGate(
    pkg,
    { decision: 'decline', decidedBy: 'clint', note: 'too late' },
    { transport },
  )
  assert.equal(declined.kind, 'closed')
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-declined').length, 0)
  assert.equal(calls.length, 0)
})

// ─── AC-14: default-deny gate + transition-by-name refusals ──────────────────

test('AC-14: assertHumanGateJiraGate refuses every non-allowlisted or hostile key shape', () => {
  for (const hostile of ['EVIL-1', 'KONEX-1', 'kone-1', '', 'KONE', '-1', 'KO NE-1']) {
    assert.throws(
      () => assertHumanGateJiraGate(hostile),
      (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_GATE_REFUSED',
      `expected refusal for ${JSON.stringify(hostile)}`,
    )
  }
  assert.doesNotThrow(() => assertHumanGateJiraGate('KONE-42'))
})

test('AC-14: the adapter asserts the gate inside transitionIssue and addComment before any client call', async () => {
  const toolCalls: string[] = []
  const stubClient: McpToolClient = {
    async callTool(name) {
      toolCalls.push(name)
      return '[]'
    },
    async close() {},
  }
  const adapter = createHumanGateJiraAdapter(() => stubClient)
  await assert.rejects(
    adapter.transitionIssue('EVIL-1', '31'),
    (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_GATE_REFUSED',
  )
  await assert.rejects(
    adapter.addComment('EVIL-1', 'body'),
    (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_GATE_REFUSED',
  )
  await assert.rejects(
    adapter.getTransitions('EVIL-1'),
    (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_GATE_REFUSED',
  )
  assert.equal(toolCalls.length, 0, 'zero client calls on refusal')
  await adapter.dispose()
})

test('AC-14: a targetStatus absent from the live transitions list raises JIRA_TRANSITION_UNAVAILABLE with no transition call, and ambiguity is refused with both ids', async () => {
  // Direct resolution refusals.
  assert.throws(
    () => resolveTransitionId([{ id: '21', name: 'In Review', toStatus: 'In Review' }], 'Done'),
    (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_TRANSITION_UNAVAILABLE',
  )
  assert.throws(
    () =>
      resolveTransitionId(
        [
          { id: '31', name: 'Done', toStatus: 'Done' },
          { id: '41', name: 'Done', toStatus: 'Done' },
        ],
        'Done',
      ),
    (err: unknown) =>
      err instanceof HumanGateError &&
      err.code === 'JIRA_TRANSITION_UNAVAILABLE' &&
      err.message.includes('31') &&
      err.message.includes('41'),
  )
  // Through the approve path: post-approval it is the recorded half-closed
  // state (PRF-12c), with zero transitionIssue calls.
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const { transport, calls } = makeTransport({
    transitions: [{ id: '21', name: 'In Review', toStatus: 'In Review' }],
  })
  const result = await executeHumanGate(pkg, APPROVE, { transport })
  assert.equal(result.kind, 'half-closed')
  assert.ok(!calls.some((call) => call.method === 'transitionIssue'), 'no transition call')
  const halfClosed = findReceiptsByClaimRef(fixture, 'half-closed')[0] as Record<string, unknown>
  const subject = halfClosed.subject as Record<string, unknown>
  assert.ok(String(subject.errorMessage).includes('JIRA_TRANSITION_UNAVAILABLE'))
})

// ─── AC-15: approve-then-Jira-fail is the named half-closed state ────────────

test('AC-15: a rejecting transitionIssue yields a returned half-closed state naming failedStep transition; the approval receipt survives; the chain validates', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const { transport } = makeTransport({ failTransition: true })
  const result = await executeHumanGate(pkg, APPROVE, { transport })
  assert.equal(result.kind, 'half-closed')
  const halfClosed = findReceiptsByClaimRef(fixture, 'half-closed')
  assert.equal(halfClosed.length, 1)
  const doc = halfClosed[0] as Record<string, unknown>
  assert.equal(doc.subjectKind, 'HalfClosedState')
  const subject = doc.subject as Record<string, unknown>
  assert.equal(subject.ticketKey, 'KONE-123')
  assert.equal(subject.requestedStatus, 'Done')
  assert.equal(subject.failedStep, 'transition')
  assert.ok(String(subject.errorMessage).includes('transition rejected'))
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1)
  assert.equal(
    subject.approvalReceiptLocator,
    `docs/receipts/${fixture.workflowId}/000002-D-human-gate-decision.json`,
  )
  assertValidExtendedChain(fixture)
})

test('AC-15: a rejecting addComment yields the half-closed state naming failedStep comment (returned, not thrown)', async () => {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const { transport, calls } = makeTransport({ failComment: true })
  const result = await executeHumanGate(pkg, APPROVE, { transport })
  assert.equal(result.kind, 'half-closed')
  assert.ok(calls.some((call) => call.method === 'transitionIssue'))
  const subject = (findReceiptsByClaimRef(fixture, 'half-closed')[0] as Record<string, unknown>)
    .subject as Record<string, unknown>
  assert.equal(subject.failedStep, 'comment')
  assert.equal(findReceiptsByClaimRef(fixture, 'stage-d-closure').length, 0)
  assertValidExtendedChain(fixture)
})

// ─── AC-16: retryHalfClosed — idempotent, approval-preserving ────────────────

async function makeHalfClosedFixture(
  failure: 'transition' | 'comment',
): Promise<{ fixture: GateFixture; summaryPath: string }> {
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  const { transport } = makeTransport(
    failure === 'transition' ? { failTransition: true } : { failComment: true },
  )
  const result = await executeHumanGate(pkg, APPROVE, { transport })
  assert.equal(result.kind, 'half-closed')
  return { fixture, summaryPath: pkg.summaryPath }
}

test('AC-16: (a) a retry with a working transport closes without any new approval receipt or human input', async () => {
  const { fixture, summaryPath } = await makeHalfClosedFixture('transition')
  const { transport, calls } = makeTransport()
  const result = await retryHalfClosed(fixture.workflowId, {
    transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(result.kind, 'closed')
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1)
  assert.equal(findReceiptsByClaimRef(fixture, 'stage-d-closure').length, 1)
  assert.deepEqual(
    calls.map((call) => call.method),
    ['getTransitions', 'transitionIssue', 'addComment'],
  )
  const subject = (findReceiptsByClaimRef(fixture, 'stage-d-closure')[0] as Record<string, unknown>)
    .subject as Record<string, unknown>
  assert.equal(subject.summaryPath, summaryPath)
  assertValidExtendedChain(fixture)
})

test('AC-16: (b) when failedStep is comment, an already-transitioned ticket is treated as satisfied — the transition is never re-fired', async () => {
  const { fixture } = await makeHalfClosedFixture('comment')
  // The ticket already transitioned: 'Done' is no longer offered.
  const { transport, calls } = makeTransport({
    transitions: [{ id: '51', name: 'Reopen', toStatus: 'To Do' }],
  })
  const result = await retryHalfClosed(fixture.workflowId, {
    transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(result.kind, 'closed')
  assert.ok(!calls.some((call) => call.method === 'transitionIssue'), 'transition not re-fired')
  assert.ok(calls.some((call) => call.method === 'addComment'))
  assertValidExtendedChain(fixture)
})

test('AC-16: (c) a retry after closure exists is a no-op referencing the existing closure receipt — zero transport calls, zero writes', async () => {
  const { fixture } = await makeHalfClosedFixture('transition')
  const first = await retryHalfClosed(fixture.workflowId, {
    transport: makeTransport().transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(first.kind, 'closed')
  const namesBefore = listConforming(fixture)
  const { transport, calls } = makeTransport()
  const second = await retryHalfClosed(fixture.workflowId, {
    transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(second.kind, 'closed')
  if (first.kind === 'closed' && second.kind === 'closed') {
    assert.equal(second.closureReceiptLocator, first.closureReceiptLocator)
  }
  assert.equal(calls.length, 0, 'zero transport calls after closure')
  assert.deepEqual(listConforming(fixture), namesBefore, 'zero writes after closure')
  assert.equal(findReceiptsByClaimRef(fixture, 'stage-d-closure').length, 1)
})

test('AC-16: (d) a retry with no approval receipt raises APPROVAL_MISSING', async () => {
  // Fresh fixture: verdict envelope but no approval.
  const fresh = makeGateFixture()
  await assert.rejects(
    retryHalfClosed(fresh.workflowId, {
      transport: makeTransport().transport,
      repoRoot: fresh.repoRoot,
    }),
    (err: unknown) => err instanceof HumanGateError && err.code === 'APPROVAL_MISSING',
  )
})

// ─── AC-24 (RH-8): crash-between-approval-and-Jira is recoverable ────────────

/**
 * Mints the RH-8 crash state on disk: the approval sub-receipt exists but
 * neither a half-closed nor a closure receipt does (the process died after
 * step 1 of the approve path). Built by removing the half-closed receipt
 * from a half-closed fixture — the resulting directory is byte-identical to
 * the crash state.
 */
async function makeCrashStateFixture(): Promise<GateFixture> {
  const { fixture } = await makeHalfClosedFixture('transition')
  const halfClosedName = listConforming(fixture).find(
    (name) => (readReceiptFile(fixture, name) as { claimRef?: unknown }).claimRef === 'half-closed',
  ) as string
  const { rmSync } = await import('node:fs')
  rmSync(join(fixture.receiptsDirAbs, halfClosedName))
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1)
  assert.equal(findReceiptsByClaimRef(fixture, 'half-closed').length, 0)
  assert.equal(findReceiptsByClaimRef(fixture, 'stage-d-closure').length, 0)
  return fixture
}

test('AC-24: retryHalfClosed recovers the approval-only crash state — ticketKey/requestedStatus read from the approval subject, the transition fires exactly once, the comment posts, the closure lands, no new approval and no human input', async () => {
  const fixture = await makeCrashStateFixture()
  const { transport, calls } = makeTransport()
  const result = await retryHalfClosed(fixture.workflowId, {
    transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(result.kind, 'closed')
  // The Jira steps resumed from the approval receipt's subject alone.
  assert.deepEqual(
    calls.map((call) => call.method),
    ['getTransitions', 'transitionIssue', 'addComment'],
  )
  assert.deepEqual(calls[1]?.args, ['KONE-123', '31'], 'transition fired exactly once, by name')
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1, 'no new approval')
  assert.equal(findReceiptsByClaimRef(fixture, 'stage-d-closure').length, 1)
  assertValidExtendedChain(fixture)
})

test('AC-24: crash recovery verifies the transition against the live list — an already-transitioned ticket is treated as satisfied, never re-fired blindly', async () => {
  const fixture = await makeCrashStateFixture()
  // The transition fired before the crash: 'Done' is no longer offered.
  const { transport, calls } = makeTransport({
    transitions: [{ id: '51', name: 'Reopen', toStatus: 'To Do' }],
  })
  const result = await retryHalfClosed(fixture.workflowId, {
    transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(result.kind, 'closed')
  assert.ok(!calls.some((call) => call.method === 'transitionIssue'), 'transition not re-fired')
  assert.ok(calls.some((call) => call.method === 'addComment'))
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1)
  assertValidExtendedChain(fixture)
})

// ─── AC-25 (RH-7): transition resolution matches NAME only ───────────────────

test('AC-25: resolveTransitionId matches the transition NAME only — a toStatus-only route is JIRA_TRANSITION_UNAVAILABLE, a name match resolves even when toStatus differs, ambiguity/absence unchanged', () => {
  // The only route to the target status carries a different name: refused —
  // matching toStatus would let a differently-named transition fire.
  assert.throws(
    () => resolveTransitionId([{ id: '71', name: 'Complete', toStatus: 'Done' }], 'Done'),
    (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_TRANSITION_UNAVAILABLE',
  )
  // A name match resolves even when toStatus differs from the name.
  assert.equal(resolveTransitionId([{ id: '81', name: 'Done', toStatus: 'Closed' }], 'Done'), '81')
  // Absence and ambiguity behavior unchanged.
  assert.throws(
    () => resolveTransitionId([], 'Done'),
    (err: unknown) => err instanceof HumanGateError && err.code === 'JIRA_TRANSITION_UNAVAILABLE',
  )
  assert.throws(
    () =>
      resolveTransitionId(
        [
          { id: '31', name: 'Done', toStatus: 'Done' },
          { id: '41', name: 'Done', toStatus: 'Closed' },
        ],
        'Done',
      ),
    (err: unknown) =>
      err instanceof HumanGateError &&
      err.code === 'JIRA_TRANSITION_UNAVAILABLE' &&
      err.message.includes('31') &&
      err.message.includes('41'),
  )
})

test('AC-16: (e2) a retry that fails again emits a further half-closed sub-receipt and returns half-closed', async () => {
  const { fixture } = await makeHalfClosedFixture('transition')
  const { transport } = makeTransport({ failTransition: true })
  const result = await retryHalfClosed(fixture.workflowId, {
    transport,
    repoRoot: fixture.repoRoot,
  })
  assert.equal(result.kind, 'half-closed')
  assert.equal(findReceiptsByClaimRef(fixture, 'half-closed').length, 2)
  assert.equal(findReceiptsByClaimRef(fixture, 'human-gate-approved').length, 1)
  assertValidExtendedChain(fixture)
})

// ─── AC-17: no Stage-F closure envelope anywhere in this sub-module ──────────

test('AC-17: src/human-gate never references the Stage-F closure contract, and no closure-envelope file is written by the approve flow', async () => {
  const dir = join(PACKAGE_ROOT, 'src', 'human-gate')
  for (const name of readdirSync(dir)) {
    const text = readFileSync(join(dir, name), 'utf8')
    assert.ok(
      !text.includes('Closure'.concat('Record')),
      `src/human-gate/${name} must not reference the Stage-F type`,
    )
    assert.ok(
      !text.includes('closure'.concat('-record')),
      `src/human-gate/${name} must not reference the Stage-F schemas`,
    )
  }
  // No *closure*envelope* file lands in any scenario.
  const fixture = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(fixture))
  await executeHumanGate(pkg, APPROVE, { transport: makeTransport().transport })
  for (const name of readdirSync(fixture.receiptsDirAbs)) {
    assert.ok(
      !(name.includes('closure') && name.includes('envelope')),
      `no closure envelope file may be written, found ${name}`,
    )
  }
})

// ─── AC-18: typed try-catch at every external boundary ───────────────────────

test('AC-18: forced boundary failures surface only HumanGateError with documented codes (no foreign exception escapes)', async () => {
  // Summary write boundary.
  const summaryFail = makeGateFixture()
  try {
    prepareHumanGate(defaultInput(summaryFail), {
      writeSummaryFn: () => {
        throw new Error('disk on fire')
      },
    })
    assert.fail('expected a throw')
  } catch (err) {
    assert.ok(err instanceof HumanGateError)
    assert.equal(err.code, 'SUMMARY_WRITE_FAILED')
  }

  // Receipt write boundary (decline path, foreign error injected).
  const receiptFail = makeGateFixture()
  const pkg = prepareHumanGate(defaultInput(receiptFail))
  await assert.rejects(
    executeHumanGate(
      pkg,
      { decision: 'decline', decidedBy: 'clint', note: 'n' },
      {
        writeReceiptFn: () => {
          throw new TypeError('foreign failure')
        },
      },
    ),
    (err: unknown) => err instanceof HumanGateError && err.code === 'RECEIPT_WRITE_FAILED',
  )

  // Receipt-dir scan boundary: a conforming-named receipt with garbage bytes.
  const corrupt = makeGateFixture()
  const { writeFileSync } = await import('node:fs')
  writeFileSync(join(corrupt.receiptsDirAbs, '000002-D-garbage-claim.json'), '{nope')
  try {
    prepareHumanGate(defaultInput(corrupt))
    assert.fail('expected a throw')
  } catch (err) {
    assert.ok(err instanceof HumanGateError, `foreign exception escaped: ${String(err)}`)
    assert.equal(err.code, 'SEQUENCE_READ_FAILED')
  }

  // Transport boundaries reject with foreign errors: recorded post-approval
  // (AC-15), never rethrown raw — asserted here end-to-end.
  const transportFail = makeGateFixture()
  const pkg2 = prepareHumanGate(defaultInput(transportFail))
  const result = await executeHumanGate(pkg2, APPROVE, {
    transport: makeTransport({ failGetTransitions: true }).transport,
  })
  assert.equal(result.kind, 'half-closed')
})

// ─── AC-19: hermetic suite ────────────────────────────────────────────────────

test('AC-19: the human-gate suite is hermetic — no gateway CLI, no stdio client transport, no child-process import, no prompt', () => {
  const testsDir = join(PACKAGE_ROOT, 'tests')
  const suiteFiles = readdirSync(testsDir).filter((name) => name.startsWith('human-gate'))
  assert.ok(suiteFiles.length >= 3, 'the human-gate suite files exist')
  // Tokens assembled by concatenation so this file cannot match itself.
  const forbidden = [
    'doc'.concat('ker'),
    'Stdio'.concat('ClientTransport'),
    'child'.concat('_process'),
    'spawn'.concat('Sync'),
    'read'.concat('line'),
  ]
  for (const name of suiteFiles) {
    const text = readFileSync(join(testsDir, name), 'utf8')
    for (const token of forbidden) {
      assert.ok(!text.includes(token), `tests/${name} contains forbidden token '${token}'`)
    }
  }
})

// ─── AC-20: scope greps over src/human-gate ──────────────────────────────────

test('AC-20: src/human-gate performs no process launch, git operation, harness/adversarial/pipeline invocation, or verdict assembly', () => {
  const dir = join(PACKAGE_ROOT, 'src', 'human-gate')
  const forbidden = [
    'child'.concat('_process'),
    'exec'.concat('Sync'),
    'exec'.concat('File'),
    'spawn',
    'simple-git',
    'git commit',
    'git push',
    'git checkout',
    'runHarness',
    'dispatchReview',
    'launchReviewer',
    'collectAdversarialFindings',
    'assembleVerdict',
    'routeRework',
    'emitVerificationVerdict',
  ]
  for (const name of readdirSync(dir)) {
    const text = readFileSync(join(dir, name), 'utf8')
    for (const token of forbidden) {
      assert.ok(!text.includes(token), `src/human-gate/${name} contains forbidden token '${token}'`)
    }
  }
})

// ─── AC-21: dogfood — every AC-1..AC-21 named by at least one test ───────────

/** Token-boundary check mirroring AC-CONVENTION §4 (linear scan, no regex). */
function namesAc(text: string, acNumber: number): boolean {
  let from = 0
  while (from < text.length) {
    const idx = text.indexOf('AC-', from)
    if (idx === -1) return false
    from = idx + 3
    let i = idx + 3
    let value = 0
    let digits = 0
    while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) {
      value = value * 10 + (text.charCodeAt(i) - 48)
      i += 1
      digits += 1
    }
    if (digits > 0 && value === acNumber) return true
    from = i
  }
  return false
}

test('AC-21: every AC-1..AC-25 of the W3-P4 spec (incl. the RH-1/RH-3/RH-7/RH-8 amendment ACs) is named by at least one test in the human-gate suite', () => {
  const testsDir = join(PACKAGE_ROOT, 'tests')
  const combined = readdirSync(testsDir)
    .filter((name) => name.startsWith('human-gate') && name.endsWith('.test.ts'))
    .map((name) => readFileSync(join(testsDir, name), 'utf8'))
    .join('\n')
  for (let n = 1; n <= 25; n++) {
    assert.ok(namesAc(combined, n), `no test names AC-${n}`)
  }
})
