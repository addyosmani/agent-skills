/**
 * W4-P4 AC8-AC13, AC16 — two-phase closure orchestration, default-deny gate,
 * transition-by-name, half-closed state, idempotent retry, recorded-only spec
 * move, and typed-error boundaries.
 *
 * Fully hermetic: every external effect is an injected seam (chain load, Jira
 * transport, receipt write) or a temp `repoRoot` fixture. No network, secrets,
 * live gh/git/docker, or external-repo path.
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import type { ReceiptDocument } from '../../receipts/src/index.js'
import { receiptPath, validateChain } from '../../receipts/src/index.js'
import {
  assertClosureJiraGate,
  ClosureError,
  type ClosureJiraTransport,
  type ClosurePackage,
  createClosureJiraAdapter,
  executeClosure,
  IntegrationError,
  prepareClosure,
  retryHalfClosedClosure,
  type WriteReceiptFn,
} from '../src/index.js'
import {
  HASH_E,
  makeReceipt,
  makeRecordingTransport,
  makeStageEChain,
  makeTempRepoRoot,
  SPEC_MOVE,
  scanChainFromDisk,
  toLoaded,
  VALID_MERGE_SHA,
  WORKFLOW_ID,
  writeChainToDisk,
} from './closure-fixtures.js'

const TICKET = 'KONE-23210'
const STAGE_E_LOCATOR = receiptPath(WORKFLOW_ID, 4, 'E', 'IntegrationResult')

function makePackage(over: Partial<ClosurePackage> = {}): ClosurePackage {
  const chain = makeStageEChain()
  return {
    workflowId: WORKFLOW_ID,
    ticketKey: TICKET,
    targetStatus: 'Done',
    currentStatus: 'In Review',
    mergeSha: VALID_MERGE_SHA,
    specLifecycleMove: SPEC_MOVE,
    stageETip: chain[chain.length - 1] as ReceiptDocument,
    repoRoot: 'virtual-repo-root',
    ...over,
  }
}

function captureWriteFn(): { fn: WriteReceiptFn; written: ReceiptDocument[] } {
  const written: ReceiptDocument[] = []
  const fn: WriteReceiptFn = (document, locator) => {
    written.push(document)
    return locator
  }
  return { fn, written }
}

function makeHalfClosed(failedStep: 'transition' | 'comment', sequence = 5): ReceiptDocument {
  return makeReceipt({
    kind: 'claim',
    claimRef: 'stage-f-half-closed',
    stage: 'F',
    sequence,
    prevHash: HASH_E,
    hash: '6'.repeat(64),
    subjectKind: 'HalfClosedClosure',
    subject: {
      mergeSha: VALID_MERGE_SHA,
      ticketKey: TICKET,
      requestedStatus: 'Done',
      currentStatus: 'In Review',
      failedStep,
      errorMessage: 'prior boom',
      specLifecycleMove: SPEC_MOVE,
      stageETip: { hash: HASH_E, locator: STAGE_E_LOCATOR },
    },
  })
}

function makeSeal(sequence = 5): ReceiptDocument {
  return makeReceipt({
    kind: 'stage',
    stage: 'F',
    sequence,
    prevHash: HASH_E,
    hash: '7'.repeat(64),
    subjectKind: 'ClosureRecord',
    subject: {
      mergeSha: VALID_MERGE_SHA,
      ticketTransition: { ticketKey: TICKET, fromStatus: 'In Review', toStatus: 'Done' },
      specLifecycleMove: SPEC_MOVE,
    },
  })
}

// ─── AC8: prepareClosure — validation + no residue ───────────────────────────

test('AC8: prepareClosure over a valid Stage-E-tipped chain yields a package carrying the validated tip', async () => {
  const pkg = await prepareClosure(
    {
      workflowId: WORKFLOW_ID,
      ticketKey: TICKET,
      targetStatus: 'Done',
      currentStatus: 'In Review',
      mergeSha: VALID_MERGE_SHA,
      specLifecycleMove: SPEC_MOVE,
      repoRoot: 'virtual-repo-root',
    },
    { loadReceiptChainFn: () => toLoaded(makeStageEChain()) },
  )
  assert.equal(pkg.stageETip.stage, 'E')
  assert.equal(pkg.stageETip.sequence, 4)
  assert.equal(pkg.workflowId, WORKFLOW_ID)
})

test('AC8: prepareClosure raises CHAIN_INVALID on a correlation-perturbed chain', async () => {
  const chain = makeStageEChain()
  const forked = makeReceipt({
    stage: 'E',
    sequence: 4,
    prevHash: '4'.repeat(64),
    hash: HASH_E,
    correlationId: 'cccccccc-0000-4000-8000-0000000000f9',
    subjectKind: 'IntegrationResult',
  })
  const perturbed = [...chain.slice(0, 4), forked]
  await assert.rejects(
    () =>
      prepareClosure(
        {
          workflowId: WORKFLOW_ID,
          ticketKey: TICKET,
          targetStatus: 'Done',
          currentStatus: 'In Review',
          mergeSha: VALID_MERGE_SHA,
          specLifecycleMove: SPEC_MOVE,
        },
        { loadReceiptChainFn: () => toLoaded(perturbed) },
      ),
    (err: unknown) => err instanceof ClosureError && err.code === 'CHAIN_INVALID',
  )
})

test('AC8: prepareClosure raises STAGE_E_TIP_INVALID when the tip is not stage E', async () => {
  const chain = makeStageEChain().slice(0, 4) // tips at D
  await assert.rejects(
    () =>
      prepareClosure(
        {
          workflowId: WORKFLOW_ID,
          ticketKey: TICKET,
          targetStatus: 'Done',
          currentStatus: 'In Review',
          mergeSha: VALID_MERGE_SHA,
          specLifecycleMove: SPEC_MOVE,
        },
        { loadReceiptChainFn: () => toLoaded(chain) },
      ),
    (err: unknown) => err instanceof ClosureError && err.code === 'STAGE_E_TIP_INVALID',
  )
})

test('AC8: prepareClosure raises WORKFLOW_ID_INVALID before any chain read', async () => {
  let loaded = false
  await assert.rejects(
    () =>
      prepareClosure(
        {
          workflowId: 'not-a-uuid',
          ticketKey: TICKET,
          targetStatus: 'Done',
          currentStatus: 'In Review',
          mergeSha: VALID_MERGE_SHA,
          specLifecycleMove: SPEC_MOVE,
        },
        {
          loadReceiptChainFn: () => {
            loaded = true
            return []
          },
        },
      ),
    (err: unknown) => err instanceof ClosureError && err.code === 'WORKFLOW_ID_INVALID',
  )
  assert.equal(loaded, false, 'chain must not be read on a bad workflowId')
})

test('AC8: prepareClosure raises MERGE_SHA_INVALID / SPEC_MOVE_INVALID on bad inputs', async () => {
  const base = {
    workflowId: WORKFLOW_ID,
    ticketKey: TICKET,
    targetStatus: 'Done',
    currentStatus: 'In Review',
  }
  const deps = { loadReceiptChainFn: () => toLoaded(makeStageEChain()) }
  await assert.rejects(
    () => prepareClosure({ ...base, mergeSha: 'NOTHEX!!', specLifecycleMove: SPEC_MOVE }, deps),
    (err: unknown) => err instanceof ClosureError && err.code === 'MERGE_SHA_INVALID',
  )
  await assert.rejects(
    () =>
      prepareClosure(
        {
          ...base,
          mergeSha: VALID_MERGE_SHA,
          specLifecycleMove: { from: 'docs/specs/active/x.md', to: 'docs/specs/shipped/x.md' },
        },
        deps,
      ),
    (err: unknown) => err instanceof ClosureError && err.code === 'SPEC_MOVE_INVALID',
  )
  await assert.rejects(
    () =>
      prepareClosure(
        {
          ...base,
          mergeSha: VALID_MERGE_SHA,
          specLifecycleMove: {
            from: 'docs/specs/active/../../etc/passwd.md',
            to: 'docs/specs/done/x.md',
          },
        },
        deps,
      ),
    (err: unknown) => err instanceof ClosureError && err.code === 'SPEC_MOVE_INVALID',
  )
})

test('AC8: prepareClosure writes NO residue — the on-disk chain is byte-identical after Phase 1', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    const chain = makeStageEChain()
    writeChainToDisk(repoRoot, chain)
    const before = scanChainFromDisk(repoRoot).map((d) => JSON.stringify(d))
    await prepareClosure({
      workflowId: WORKFLOW_ID,
      ticketKey: TICKET,
      targetStatus: 'Done',
      currentStatus: 'In Review',
      mergeSha: VALID_MERGE_SHA,
      specLifecycleMove: SPEC_MOVE,
      repoRoot,
    })
    const after = scanChainFromDisk(repoRoot).map((d) => JSON.stringify(d))
    assert.deepEqual(after, before)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC8: prepareClosure raises WORKFLOW_ID_INVALID on a workflowId containing path-injection chars (../)', async () => {
  const loadCalled = { value: false }
  await assert.rejects(
    () =>
      prepareClosure(
        {
          workflowId: '../etc/passwd-000000000000000',
          ticketKey: TICKET,
          targetStatus: 'Done',
          currentStatus: 'In Progress',
          mergeSha: 'a'.repeat(40),
          specLifecycleMove: {
            from: 'docs/specs/active/test.md',
            to: 'docs/specs/done/test.md',
          },
        },
        {
          loadReceiptChainFn: () => {
            loadCalled.value = true
            return []
          },
        },
      ),
    (err: unknown) => err instanceof ClosureError && err.code === 'WORKFLOW_ID_INVALID',
  )
  assert.equal(loadCalled.value, false, 'chain load must not be reached on invalid workflowId')
})

// ─── AC9: executeClosure — closed path (real disk end-to-end) ────────────────

test('AC9: executeClosure seals the chain (real loader + real writeReceiptDocument); chain validates through F', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    writeChainToDisk(repoRoot, makeStageEChain())
    const transport = makeRecordingTransport()
    const pkg = await prepareClosure({
      workflowId: WORKFLOW_ID,
      ticketKey: TICKET,
      targetStatus: 'Done',
      currentStatus: 'In Review',
      mergeSha: VALID_MERGE_SHA,
      specLifecycleMove: SPEC_MOVE,
      repoRoot,
    })
    const result = await executeClosure(pkg, { transport })

    assert.equal(result.kind, 'closed')
    if (result.kind !== 'closed') throw new Error('unreachable')
    assert.deepEqual(result.ticketTransition, {
      ticketKey: TICKET,
      fromStatus: 'In Review',
      toStatus: 'Done',
    })
    // transition resolved by NAME and fired; comment posted.
    assert.deepEqual(transport.calls.transitionIssue, [{ issueKey: TICKET, transitionId: '31' }])
    assert.equal(transport.calls.addComment.length, 1)
    const body = transport.calls.addComment[0]?.body ?? ''
    assert.ok(body.includes(WORKFLOW_ID))
    assert.ok(body.includes(HASH_E))
    assert.ok(body.includes(STAGE_E_LOCATOR))
    assert.ok(body.includes(VALID_MERGE_SHA))

    const finalChain = scanChainFromDisk(repoRoot)
    const validation = validateChain(finalChain)
    assert.equal(validation.valid, true, `errors: ${validation.errors.join('; ')}`)
    const seal = finalChain[finalChain.length - 1] as ReceiptDocument
    assert.equal(seal.stage, 'F')
    assert.equal(seal.subjectKind, 'ClosureRecord')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC9: executeClosure skips the transition when currentStatus === targetStatus (crash-after-transition re-run)', async () => {
  const transport = makeRecordingTransport()
  const { fn, written } = captureWriteFn()
  const pkg = makePackage({ currentStatus: 'Done', targetStatus: 'Done' })
  const result = await executeClosure(pkg, {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(makeStageEChain()),
  })
  assert.equal(result.kind, 'closed')
  assert.equal(transport.calls.getTransitions.length, 0)
  assert.equal(transport.calls.transitionIssue.length, 0)
  assert.equal(transport.calls.addComment.length, 1)
  assert.equal(written.length, 1)
  assert.equal((written[0] as ReceiptDocument).subjectKind, 'ClosureRecord')
})

// ─── AC10: default-deny gate + transition-by-name integrity ──────────────────

test('AC10: assertClosureJiraGate refuses non-KONE and hostile keys (JIRA_GATE_REFUSED)', () => {
  for (const key of ['EVIL-1', 'KONEX-1', 'kone-1', '', 'nodash', '-5', 'KONE', 'KONE-']) {
    assert.throws(
      () => assertClosureJiraGate(key),
      (err: unknown) => err instanceof ClosureError && err.code === 'JIRA_GATE_REFUSED',
      `expected refusal for ${JSON.stringify(key)}`,
    )
  }
  // Sanity: a well-formed KONE key passes.
  assert.doesNotThrow(() => assertClosureJiraGate('KONE-1'))
})

test('AC10: the adapter asserts the gate INSIDE transitionIssue/addComment before any client call', async () => {
  let factoryCalls = 0
  const adapter = createClosureJiraAdapter(() => {
    factoryCalls++
    return {
      async callTool() {
        throw new Error('client must not be reached on a gate refusal')
      },
      async close() {},
    }
  })
  await assert.rejects(
    () => adapter.transitionIssue('EVIL-1', '31'),
    (err: unknown) => err instanceof ClosureError && err.code === 'JIRA_GATE_REFUSED',
  )
  await assert.rejects(
    () => adapter.addComment('EVIL-1', 'body'),
    (err: unknown) => err instanceof ClosureError && err.code === 'JIRA_GATE_REFUSED',
  )
  await assert.rejects(
    () => adapter.getTransitions('EVIL-1'),
    (err: unknown) => err instanceof ClosureError && err.code === 'JIRA_GATE_REFUSED',
  )
  assert.equal(factoryCalls, 0, 'the client factory must never be instantiated on a refusal')
})

test('AC10: a targetStatus absent from the live transitions raises JIRA_TRANSITION_UNAVAILABLE with no transition call', async () => {
  const transport = makeRecordingTransport({
    transitions: [{ id: '9', name: 'Reopen', toStatus: 'Reopened' }],
  })
  const { fn, written } = captureWriteFn()
  await assert.rejects(
    () =>
      executeClosure(makePackage(), {
        transport,
        writeFn: fn,
        loadReceiptChainFn: () => toLoaded(makeStageEChain()),
      }),
    (err: unknown) => err instanceof ClosureError && err.code === 'JIRA_TRANSITION_UNAVAILABLE',
  )
  assert.equal(transport.calls.transitionIssue.length, 0)
  assert.equal(written.length, 0, 'no receipt is written on an unavailable transition')
})

// ─── AC11: merge-then-Jira-fail is the named half-closed state ───────────────

test('AC11: a transitionIssue rejection returns half-closed (not thrown); chain still validates', async () => {
  const transport = makeRecordingTransport({ failOn: 'transitionIssue' })
  const { fn, written } = captureWriteFn()
  const result = await executeClosure(makePackage(), {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(makeStageEChain()),
  })
  assert.equal(result.kind, 'half-closed')
  if (result.kind !== 'half-closed') throw new Error('unreachable')
  assert.equal(result.failedStep, 'transition')

  const hc = written[0] as ReceiptDocument
  assert.equal(hc.kind, 'claim')
  assert.equal(hc.stage, 'F')
  assert.equal(hc.claimRef, 'stage-f-half-closed')
  assert.equal(hc.subjectKind, 'HalfClosedClosure')
  const subject = hc.subject as Record<string, unknown>
  assert.equal(subject.mergeSha, VALID_MERGE_SHA)
  assert.equal(subject.ticketKey, TICKET)
  assert.equal(subject.requestedStatus, 'Done')
  assert.equal(subject.currentStatus, 'In Review')
  assert.equal(subject.failedStep, 'transition')
  assert.equal(typeof subject.errorMessage, 'string')
  assert.deepEqual(subject.specLifecycleMove, SPEC_MOVE)
  assert.deepEqual(subject.stageETip, { hash: HASH_E, locator: STAGE_E_LOCATOR })
  // correlation inherited → the extended chain still validates.
  const validation = validateChain([...makeStageEChain(), hc])
  assert.equal(validation.valid, true, `errors: ${validation.errors.join('; ')}`)
})

test('AC11: an addComment rejection returns half-closed with failedStep=comment (transition already fired)', async () => {
  const transport = makeRecordingTransport({ failOn: 'addComment' })
  const { fn, written } = captureWriteFn()
  const result = await executeClosure(makePackage(), {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(makeStageEChain()),
  })
  assert.equal(result.kind, 'half-closed')
  if (result.kind !== 'half-closed') throw new Error('unreachable')
  assert.equal(result.failedStep, 'comment')
  assert.equal(transport.calls.transitionIssue.length, 1)
  assert.equal(
    (written[0] as ReceiptDocument).subject &&
      ((written[0] as ReceiptDocument).subject as Record<string, unknown>).failedStep,
    'comment',
  )
})

// ─── AC12: retryHalfClosedClosure — idempotent + approval/merge-preserving ───

test('AC12a: retry from a half-closed state seals without re-merging', async () => {
  const transport = makeRecordingTransport()
  const { fn, written } = captureWriteFn()
  const chain = [...makeStageEChain(), makeHalfClosed('transition')]
  const result = await retryHalfClosedClosure(WORKFLOW_ID, {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(chain),
    repoRoot: 'virtual-repo-root',
  })
  assert.equal(result.kind, 'closed')
  const seal = written[0] as ReceiptDocument
  assert.equal(seal.subjectKind, 'ClosureRecord')
  // Sealing receipt chains off the current tip (the half-closed at seq 5).
  assert.equal(seal.sequence, 6)
  assert.equal(seal.prevHash, '6'.repeat(64))
})

test('AC12b: retry with failedStep=comment does NOT re-fire the transition', async () => {
  const transport = makeRecordingTransport()
  const { fn } = captureWriteFn()
  const chain = [...makeStageEChain(), makeHalfClosed('comment')]
  const result = await retryHalfClosedClosure(WORKFLOW_ID, {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(chain),
  })
  assert.equal(result.kind, 'closed')
  assert.equal(transport.calls.transitionIssue.length, 0)
  assert.equal(transport.calls.getTransitions.length, 0)
  assert.equal(transport.calls.addComment.length, 1)
})

test('AC12c: retry after a seal exists returns closed with zero transport calls and zero writes', async () => {
  const transport = makeRecordingTransport({ throwOnAnyCall: true })
  const { fn, written } = captureWriteFn()
  const chain = [...makeStageEChain(), makeSeal()]
  const result = await retryHalfClosedClosure(WORKFLOW_ID, {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(chain),
  })
  assert.equal(result.kind, 'closed')
  if (result.kind !== 'closed') throw new Error('unreachable')
  assert.deepEqual(result.ticketTransition, {
    ticketKey: TICKET,
    fromStatus: 'In Review',
    toStatus: 'Done',
  })
  assert.equal(written.length, 0)
  assert.equal(transport.calls.getTransitions.length, 0)
  assert.equal(transport.calls.transitionIssue.length, 0)
  assert.equal(transport.calls.addComment.length, 0)
})

test('AC12d: retry with no half-closed and no seal raises CLOSURE_STATE_MISSING', async () => {
  const transport = makeRecordingTransport({ throwOnAnyCall: true })
  await assert.rejects(
    () =>
      retryHalfClosedClosure(WORKFLOW_ID, {
        transport,
        loadReceiptChainFn: () => toLoaded(makeStageEChain()),
      }),
    (err: unknown) => err instanceof ClosureError && err.code === 'CLOSURE_STATE_MISSING',
  )
})

test('AC12e: a retry that fails again emits a further half-closed receipt and returns half-closed', async () => {
  const transport = makeRecordingTransport({ failOn: 'transitionIssue' })
  const { fn, written } = captureWriteFn()
  const chain = [...makeStageEChain(), makeHalfClosed('transition')]
  const result = await retryHalfClosedClosure(WORKFLOW_ID, {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(chain),
  })
  assert.equal(result.kind, 'half-closed')
  const further = written[0] as ReceiptDocument
  assert.equal(further.claimRef, 'stage-f-half-closed')
  assert.equal(further.sequence, 6)
})

// ─── AC13: spec move is recorded-only ────────────────────────────────────────

test('AC13: the recorded specLifecycleMove uses docs/specs/done/ (never shipped/) and no file is moved', async () => {
  const repoRoot = makeTempRepoRoot()
  try {
    writeChainToDisk(repoRoot, makeStageEChain())
    // Plant the active spec + assert executeClosure never touches the filesystem spec.
    const activeAbs = join(repoRoot, ...SPEC_MOVE.from.split('/'))
    mkdirSync(dirname(activeAbs), { recursive: true })
    writeFileSync(activeAbs, '# active spec\n', 'utf8')

    const transport = makeRecordingTransport()
    const pkg = await prepareClosure({
      workflowId: WORKFLOW_ID,
      ticketKey: TICKET,
      targetStatus: 'Done',
      currentStatus: 'In Review',
      mergeSha: VALID_MERGE_SHA,
      specLifecycleMove: SPEC_MOVE,
      repoRoot,
    })
    const result = await executeClosure(pkg, { transport })
    assert.equal(result.kind, 'closed')

    // The active spec is untouched; the done/ path was NOT created by closure.
    assert.ok(existsSync(activeAbs), 'active spec must remain (recorded-only move)')
    assert.equal(existsSync(join(repoRoot, ...SPEC_MOVE.to.split('/'))), false)
    assert.ok(readFileSync(activeAbs, 'utf8').includes('# active spec'))

    // The seal records the done/ move.
    const seal = scanChainFromDisk(repoRoot).find((d) => d.subjectKind === 'ClosureRecord')
    assert.ok(seal !== undefined, 'a sealing ClosureRecord receipt must exist')
    const move = (seal.subject as Record<string, unknown>).specLifecycleMove as {
      from: string
      to: string
    }
    assert.ok(move.to.startsWith('docs/specs/done/'))
    assert.equal(move.to.includes('shipped/'), false)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC16: typed try-catch on every external boundary ────────────────────────

test('AC16: a throwing chain-load seam surfaces as ClosureError (no foreign exception escapes)', async () => {
  await assert.rejects(
    () =>
      executeClosure(makePackage(), {
        transport: makeRecordingTransport(),
        loadReceiptChainFn: () => {
          throw new Error('fs boom')
        },
      }),
    (err: unknown) => err instanceof ClosureError && err.code === 'CHAIN_INVALID',
  )
})

test('AC16: a throwing writeFn surfaces as IntegrationError RECEIPT_WRITE_FAILED (no foreign exception escapes)', async () => {
  const throwingWrite: WriteReceiptFn = () => {
    throw new Error('disk full')
  }
  await assert.rejects(
    () =>
      executeClosure(makePackage(), {
        transport: makeRecordingTransport(),
        writeFn: throwingWrite,
        loadReceiptChainFn: () => toLoaded(makeStageEChain()),
      }),
    (err: unknown) => err instanceof IntegrationError && err.code === 'RECEIPT_WRITE_FAILED',
  )
})

test('AC16: a throwing transport getTransitions is recorded as half-closed, never thrown', async () => {
  const transport = makeRecordingTransport({ failOn: 'getTransitions' })
  const { fn } = captureWriteFn()
  const result = await executeClosure(makePackage(), {
    transport,
    writeFn: fn,
    loadReceiptChainFn: () => toLoaded(makeStageEChain()),
  })
  assert.equal(result.kind, 'half-closed')
  if (result.kind !== 'half-closed') throw new Error('unreachable')
  assert.equal(result.failedStep, 'transition')
})

test('AC16: executeClosure raises CLOSURE_INPUT_INVALID when transport is missing', async () => {
  const pkg = makePackage()
  await assert.rejects(
    () => executeClosure(pkg, { transport: undefined as unknown as ClosureJiraTransport }),
    (err: unknown) => err instanceof ClosureError && err.code === 'CLOSURE_INPUT_INVALID',
  )
})
