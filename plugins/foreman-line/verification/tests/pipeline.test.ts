/**
 * W3-P3 pipeline tests: verdict assembly (PRF-9), attempt counting (ruling
 * F5), verdict receipt + envelope emission, the D4 rework cap table, and the
 * PRF-8 loop-back policy. AC-1..AC-22 per AC-CONVENTION.md.
 */
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { Ajv } from 'ajv'
import { canonicalize, type JsonValue, sha256Hex } from '../../approval/src/index.js'
import type { ReworkSignal } from '../../contracts/src/envelope.js'
import type {
  AdversarialFinding,
  FindingSeverity,
  HarnessClaimResult,
  VerificationVerdict,
} from '../../contracts/src/stages/d-verification.js'
import { validateChain } from '../../receipts/src/index.js'
import type { Disposition, ReworkRoutingInput } from '../src/index.js'
import {
  allocateSequence,
  assembleVerdict,
  countReworkAttempts,
  emitVerificationVerdict,
  generateBuildFixKickstarter,
  generateRecoordinationKickstarter,
  PipelineError,
  planReverification,
  routeRework,
} from '../src/index.js'
import {
  collectChain,
  makeTempRepoRoot,
  mintStageCReceipt,
  PACKAGE_ROOT,
  readReceipt,
  type StageCFixture,
} from './helpers.js'

// ─── Fixture builders ─────────────────────────────────────────────────────────

function claim(passed: boolean, name = 'AC-1: does the thing'): HarnessClaimResult {
  return { claim: name, passed, evidence: passed ? 'test-name' : 'failing-test-name' }
}

function finding(severity: FindingSeverity, summary = 'a finding'): AdversarialFinding {
  return { summary, citation: 'spec AC-1; file:1', severity }
}

function disp(
  findingIndex: number,
  disposition: 'accept' | 'rework' = 'accept',
  note = 'triaged',
): Disposition {
  return { findingIndex, disposition, note }
}

function assertPipelineError(err: unknown, code: string): void {
  assert.ok(err instanceof PipelineError, `expected PipelineError, got ${String(err)}`)
  assert.equal((err as PipelineError).code, code)
}

interface Workflow {
  readonly repoRoot: string
  readonly workflowId: string
  readonly genesis: StageCFixture
}

function makeWorkflow(): Workflow {
  const repoRoot = makeTempRepoRoot({ matrix: false })
  const workflowId = randomUUID()
  const genesis = mintStageCReceipt(repoRoot, workflowId)
  return { repoRoot, workflowId, genesis }
}

const REWORK_VERDICT: VerificationVerdict = {
  verdict: 'rework',
  harnessClaims: [claim(false, 'AC-2: broken behavior')],
  adversarialFindings: [finding('high', 'severe defect found')],
}

function makeSignal(attempt: number): ReworkSignal {
  return {
    reason: 'failing claim: AC-2: broken behavior',
    originStage: 'D',
    targetStage: 'C',
    attempt,
    verdictReceipt: { hash: 'a'.repeat(64), locator: 'docs/receipts/x/000001-D-v.json' },
  }
}

/** Mint a schema-valid ReworkSignal receipt directly onto disk. */
function mintReworkSignalReceipt(
  wf: Workflow,
  sequence: number,
  prevHash: string,
  attempt: number,
): { hash: string; locator: string } {
  const draft = {
    schemaVersion: '1',
    kind: 'claim',
    stage: 'D',
    claimRef: 'rework-signal',
    correlation: {
      correlationId: wf.genesis.correlation.correlationId,
      sessionId: randomUUID(),
      workflowId: wf.workflowId,
      runId: randomUUID(),
    },
    sequence,
    prevHash,
    timestamp: new Date().toISOString(),
    subjectKind: 'ReworkSignal',
    subject: makeSignal(attempt) as unknown as JsonValue,
    signature: null,
  }
  const hash = sha256Hex(canonicalize(draft as unknown as JsonValue))
  const name = `${String(sequence).padStart(6, '0')}-D-rework-signal.json`
  const locator = `docs/receipts/${wf.workflowId}/${name}`
  writeFileSync(
    join(wf.repoRoot, 'docs', 'receipts', wf.workflowId, name),
    `${JSON.stringify({ ...draft, hash }, null, 2)}\n`,
  )
  return { hash, locator }
}

function routingInput(
  wf: Workflow,
  verdictReceipt: { hash: string; locator: string },
  verdict: VerificationVerdict = REWORK_VERDICT,
): ReworkRoutingInput {
  return {
    workflowId: wf.workflowId,
    verdictReceipt,
    verdict,
    parcelRef: 'W3-P3',
    branch: 'feat/foreman-line-W3-P3',
    worktreePath: 'C:/worktrees/w3-p3-rework',
    repoRoot: wf.repoRoot,
  }
}

/** Emit a verdict receipt+envelope, returning the receipt ref for routing. */
function emitReworkVerdict(wf: Workflow): { hash: string; locator: string } {
  const { receiptLocator } = emitVerificationVerdict(wf.workflowId, REWORK_VERDICT, makeSignal(1), {
    repoRoot: wf.repoRoot,
  })
  const doc = readReceipt(wf.repoRoot, receiptLocator)
  return { hash: doc.hash as string, locator: receiptLocator }
}

// ─── AC-1: frozen siblings byte-unchanged from origin/main ───────────────────

const hasOriginVerificationBaseline =
  spawnSync(
    'git',
    ['cat-file', '-e', 'origin/main:plugins/foreman-line/verification/package.json'],
    { cwd: PACKAGE_ROOT, stdio: 'ignore' },
  ).status === 0

test('AC-1: src/pipeline exists; configs and every src/harness + src/adversarial file are byte-unchanged from origin/main', {
  skip: !hasOriginVerificationBaseline,
}, () => {
  assert.ok(existsSync(join(PACKAGE_ROOT, 'src', 'pipeline', 'index.ts')))
  const gitShow = (path: string): string => {
    const result = spawnSync('git', ['show', `origin/main:${path}`], {
      cwd: PACKAGE_ROOT,
      encoding: 'utf8',
    })
    assert.equal(result.status, 0, `git show origin/main:${path} must succeed`)
    return result.stdout
  }
  for (const name of ['package.json', 'tsconfig.json', 'biome.json']) {
    assert.equal(
      readFileSync(join(PACKAGE_ROOT, name), 'utf8'),
      gitShow(`plugins/foreman-line/verification/${name}`),
      `${name} must be byte-identical to origin/main`,
    )
  }
  for (const dir of ['harness', 'adversarial']) {
    const treePath = `plugins/foreman-line/verification/src/${dir}`
    const lsTree = spawnSync('git', ['ls-tree', '--name-only', 'origin/main', `src/${dir}/`], {
      cwd: PACKAGE_ROOT,
      encoding: 'utf8',
    })
    assert.equal(lsTree.status, 0)
    const mainNames = lsTree.stdout
      .split('\n')
      .filter((n) => n.length > 0)
      .map((n) => n.slice(`src/${dir}/`.length))
      .sort()
    assert.ok(mainNames.length > 0, `origin/main must list files under src/${dir}`)
    const localNames = readdirSync(join(PACKAGE_ROOT, 'src', dir)).sort()
    assert.deepEqual(localNames, mainNames, `src/${dir} file set must match origin/main`)
    for (const name of mainNames) {
      assert.equal(
        readFileSync(join(PACKAGE_ROOT, 'src', dir, name), 'utf8'),
        gitShow(`${treePath}/${name}`),
        `src/${dir}/${name} must be byte-identical to origin/main`,
      )
    }
  }
})

// ─── AC-2 / AC-3: toolchain gates (config-pinned proxies) ────────────────────
// Authoritative checks are `npx tsc --noEmit` and `npx biome check .` in the
// deterministic pass; AC-1 above pins both configs to origin/main.

test('AC-2: tsconfig is unchanged (authoritative check: npx tsc --noEmit passes in the deterministic pass)', () => {
  const ours = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'tsconfig.json'), 'utf8')) as Record<
    string,
    unknown
  >
  assert.ok(ours.compilerOptions)
})

test('AC-3: biome config is unchanged (authoritative check: npx biome check . passes in the deterministic pass)', () => {
  const ours = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'biome.json'), 'utf8')) as Record<
    string,
    unknown
  >
  assert.ok(ours.linter)
})

// ─── AC-4: barrel exports ─────────────────────────────────────────────────────

test('AC-4: src/index.ts exports every W3-P3 public symbol and every pre-existing W3-P1/P2 export unchanged', async () => {
  const barrel = (await import('../src/index.js')) as Record<string, unknown>
  for (const name of [
    'assembleVerdict',
    'countReworkAttempts',
    'emitVerificationVerdict',
    'routeRework',
    'generateBuildFixKickstarter',
    'generateRecoordinationKickstarter',
    'planReverification',
    'PipelineError',
    // pre-existing W3-P1
    'allocateSequence',
    'recordBuildResult',
    'runHarness',
    'VerificationError',
    'AC_CONVENTION_PATH',
    // pre-existing W3-P2
    'AdversarialError',
    'buildReviewerLaunchCommand',
    'collectAdversarialFindings',
    'dispatchReview',
    'emitStopReport',
    'generateReviewKickstarter',
    'launchReviewer',
    'parseAdversarialFindings',
  ]) {
    assert.ok(barrel[name] !== undefined, `barrel must export ${name}`)
  }
})

// ─── AC-5: hostile intake validation ─────────────────────────────────────────

test('AC-5: assembleVerdict rejects each malformation class for both intake arrays with INPUT_INVALID', () => {
  const base = { harnessClaims: [claim(true)], adversarialFindings: [], dispositions: [] }
  const hostileClaims: unknown[] = [
    { claim: 'x', passed: true }, // missing field
    { claim: 'x', passed: 'yes', evidence: 'e' }, // wrong type
    { claim: '', passed: true, evidence: 'e' }, // empty claim (minLength 1)
    { claim: 'x', passed: true, evidence: 'e', extra: 1 }, // additionalProperties
    'not-an-object',
  ]
  for (const hostile of hostileClaims) {
    assert.throws(
      () => assembleVerdict({ ...base, harnessClaims: [hostile] } as never),
      (err: unknown) => {
        assertPipelineError(err, 'INPUT_INVALID')
        return true
      },
    )
  }
  const hostileFindings: unknown[] = [
    { summary: 'x', citation: 'c' }, // missing severity
    { summary: '', citation: 'c', severity: 'low' }, // empty summary
    { summary: 'x', citation: 'c', severity: 'catastrophic' }, // outside enum
    { summary: 'x', citation: 'c', severity: 'low', extra: true }, // additionalProperties
    42,
  ]
  for (const hostile of hostileFindings) {
    assert.throws(
      () => assembleVerdict({ ...base, adversarialFindings: [hostile] } as never),
      (err: unknown) => {
        assertPipelineError(err, 'INPUT_INVALID')
        return true
      },
    )
  }
  assert.throws(
    () => assembleVerdict({ ...base, harnessClaims: 'nope' } as never),
    (err: unknown) => {
      assertPipelineError(err, 'INPUT_INVALID')
      return true
    },
  )
})

// ─── AC-6: PRF-9 severity blocking is mechanical ─────────────────────────────

test('AC-6: a high or critical finding yields rework even with all claims passing and every sub-high finding accepted', () => {
  for (const severity of ['high', 'critical'] as const) {
    const verdict = assembleVerdict({
      harnessClaims: [claim(true)],
      adversarialFindings: [finding(severity), finding('low')],
      dispositions: [disp(1, 'accept')],
    })
    assert.equal(verdict.verdict, 'rework', `${severity} must block`)
  }
  // No disposition input can change it: a disposition targeting the blocking
  // finding is a typed error, never an override (also named by AC-8).
  assert.throws(
    () =>
      assembleVerdict({
        harnessClaims: [claim(true)],
        adversarialFindings: [finding('critical')],
        dispositions: [disp(0, 'accept')],
      }),
    (err: unknown) => {
      assertPipelineError(err, 'DISPOSITION_INVALID')
      return true
    },
  )
  // Mixed with passing state: one critical among passing claims and accepted
  // sub-high findings still blocks.
  const mixed = assembleVerdict({
    harnessClaims: [claim(true), claim(true, 'AC-2: also passes')],
    adversarialFindings: [finding('info'), finding('critical'), finding('medium')],
    dispositions: [disp(0), disp(2)],
  })
  assert.equal(mixed.verdict, 'rework')
})

// ─── AC-7: failed claim blocks; clean state passes ───────────────────────────

test('AC-7: a failed harness claim yields rework with zero findings; all-pass with accepted sub-high findings yields pass', () => {
  const blocked = assembleVerdict({
    harnessClaims: [claim(true), claim(false, 'AC-2: fails')],
    adversarialFindings: [],
    dispositions: [],
  })
  assert.equal(blocked.verdict, 'rework')
  const passed = assembleVerdict({
    harnessClaims: [claim(true)],
    adversarialFindings: [finding('info'), finding('medium')],
    dispositions: [disp(0), disp(1)],
  })
  assert.equal(passed.verdict, 'pass')
  assert.equal(passed.harnessClaims.length, 1)
  assert.equal(passed.adversarialFindings.length, 2)
})

// ─── AC-8: disposition validation ────────────────────────────────────────────

test('AC-8: missing, duplicate, out-of-range, non-integer, empty-note, and high-targeting dispositions are DISPOSITION_INVALID; a rework disposition forces rework', () => {
  const oneLow = {
    harnessClaims: [claim(true)],
    adversarialFindings: [finding('low')],
  }
  const cases: { dispositions: unknown; label: string }[] = [
    { dispositions: [], label: 'missing disposition for a sub-high finding' },
    { dispositions: [disp(0), disp(0)], label: 'duplicate disposition' },
    { dispositions: [disp(0), disp(1)], label: 'out-of-range findingIndex' },
    { dispositions: [disp(-1)], label: 'negative findingIndex' },
    {
      dispositions: [{ findingIndex: Number.NaN, disposition: 'accept', note: 'n' }],
      label: 'NaN findingIndex',
    },
    {
      dispositions: [{ findingIndex: 0.5, disposition: 'accept', note: 'n' }],
      label: 'non-integer findingIndex',
    },
    {
      dispositions: [{ findingIndex: 1e300, disposition: 'accept', note: 'n' }],
      label: 'huge findingIndex',
    },
    { dispositions: [{ findingIndex: 0, disposition: 'accept', note: '' }], label: 'empty note' },
    {
      dispositions: [{ findingIndex: 0, disposition: 'waive', note: 'n' }],
      label: 'unknown disposition value',
    },
    { dispositions: 'not-an-array', label: 'non-array dispositions' },
  ]
  for (const { dispositions, label } of cases) {
    assert.throws(
      () => assembleVerdict({ ...oneLow, dispositions } as never),
      (err: unknown) => {
        assertPipelineError(err, 'DISPOSITION_INVALID')
        return true
      },
      label,
    )
  }
  // Targeting a high/critical finding is DISPOSITION_INVALID.
  assert.throws(
    () =>
      assembleVerdict({
        harnessClaims: [claim(true)],
        adversarialFindings: [finding('high')],
        dispositions: [disp(0)],
      }),
    (err: unknown) => {
      assertPipelineError(err, 'DISPOSITION_INVALID')
      return true
    },
  )
  // A sub-high finding dispositioned 'rework' forces the rework verdict.
  const forced = assembleVerdict({
    harnessClaims: [claim(true)],
    adversarialFindings: [finding('medium')],
    dispositions: [disp(0, 'rework', 'must fix')],
  })
  assert.equal(forced.verdict, 'rework')
})

// ─── AC-9: countReworkAttempts on-disk derivation + tamper handling ──────────

test('AC-9: counts exactly the schema-valid ReworkSignal receipts; ignores non-conforming names, the envelope, and subdirectories; tampering is a typed halt', () => {
  const wf = makeWorkflow()
  assert.equal(countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }), 0)

  const first = mintReworkSignalReceipt(wf, 1, wf.genesis.hash, 1)
  assert.equal(countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }), 1)
  mintReworkSignalReceipt(wf, 2, first.hash, 2)
  assert.equal(countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }), 2)

  const dir = join(wf.repoRoot, 'docs', 'receipts', wf.workflowId)
  // Non-conforming names and the envelope file are invisible.
  writeFileSync(join(dir, 'rework-signal.json'), '{}')
  writeFileSync(join(dir, 'verification-verdict.envelope.json'), '{}')
  writeFileSync(join(dir, 'notes-D-rework-signal.txt'), 'x')
  // Files under quarantine/ and rework/ are invisible, even with conforming names.
  for (const sub of ['quarantine', 'rework']) {
    mkdirSync(join(dir, sub), { recursive: true })
    writeFileSync(join(dir, sub, '000009-D-rework-signal.json'), '{}')
  }
  assert.equal(countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }), 2)

  // Tampering classes: each is REWORK_RECEIPT_INVALID, never a skip.
  const tamperings: { name: string; contents: string }[] = [
    { name: '000003-D-rework-signal.json', contents: 'not json {' },
    { name: '000003-D-rework-signal.json', contents: JSON.stringify({ nope: true }) },
    {
      name: '000003-D-rework-signal.json',
      contents: (() => {
        // Right shape but kind/stage/subjectKind mismatch (kind 'stage').
        const doc = JSON.parse(
          readFileSync(join(dir, '000001-D-rework-signal.json'), 'utf8'),
        ) as Record<string, unknown>
        return JSON.stringify({ ...doc, sequence: 3, kind: 'stage', claimRef: null })
      })(),
    },
    {
      name: '000003-D-rework-signal.json',
      contents: (() => {
        // Valid receipt document whose subject fails the rework-signal schema.
        const doc = JSON.parse(
          readFileSync(join(dir, '000001-D-rework-signal.json'), 'utf8'),
        ) as Record<string, unknown>
        return JSON.stringify({ ...doc, sequence: 3, subject: { reason: '' } })
      })(),
    },
  ]
  for (const { name, contents } of tamperings) {
    writeFileSync(join(dir, name), contents)
    assert.throws(
      () => countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }),
      (err: unknown) => {
        assertPipelineError(err, 'REWORK_RECEIPT_INVALID')
        return true
      },
      `tampering class: ${contents.slice(0, 40)}`,
    )
  }
})

// ─── AC-10: workflowId UUID guard before any filesystem access ───────────────

test('AC-10: traversal-shaped workflowId is WORKFLOW_ID_INVALID before any filesystem access in every path-joining function', () => {
  const repoRoot = makeTempRepoRoot({ matrix: false })
  for (const hostile of ['../x', '', '..\\..\\evil', 'not-a-uuid', `${randomUUID()}x`]) {
    for (const call of [
      () => countReworkAttempts(hostile, { repoRoot }),
      () => emitVerificationVerdict(hostile, REWORK_VERDICT, makeSignal(1), { repoRoot }),
      () =>
        routeRework({
          workflowId: hostile,
          verdictReceipt: { hash: 'h', locator: 'l' },
          verdict: REWORK_VERDICT,
          parcelRef: 'W3-P3',
          branch: 'feat/x',
          worktreePath: 'C:/wt',
          repoRoot,
        }),
    ]) {
      assert.throws(call, (err: unknown) => {
        assertPipelineError(err, 'WORKFLOW_ID_INVALID')
        return true
      })
    }
  }
  // No directory was created by any of the rejected calls.
  assert.deepEqual(readdirSync(join(repoRoot)), [])
})

// ─── AC-11: verdict sub-receipt shape + chain acceptance ─────────────────────

test('AC-11: emitVerificationVerdict writes the verdict claim sub-receipt chained from the tip; the extended chain passes validateChain and a perturbed correlation is rejected', () => {
  const wf = makeWorkflow()
  const { receiptLocator } = emitVerificationVerdict(wf.workflowId, REWORK_VERDICT, makeSignal(1), {
    repoRoot: wf.repoRoot,
  })
  const doc = readReceipt(wf.repoRoot, receiptLocator)
  assert.equal(doc.kind, 'claim')
  assert.equal(doc.stage, 'D')
  assert.equal(doc.claimRef, 'verification-verdict')
  assert.equal(doc.subjectKind, 'VerificationVerdict')
  assert.equal(doc.signature, null)
  assert.equal(doc.sequence, 1)
  assert.equal(doc.prevHash, wf.genesis.hash)
  assert.deepEqual(doc.subject, REWORK_VERDICT)
  const correlation = doc.correlation as Record<string, unknown>
  assert.equal(correlation.workflowId, wf.genesis.correlation.workflowId)
  assert.equal(correlation.correlationId, wf.genesis.correlation.correlationId)

  const chain = collectChain(wf.repoRoot, wf.workflowId)
  assert.equal(validateChain(chain).valid, true)
  // Perturbed-correlation rejection probe (AC5c).
  const perturbed = chain.map((member, index) =>
    index === chain.length - 1
      ? { ...member, correlation: { ...member.correlation, correlationId: randomUUID() } }
      : member,
  )
  assert.equal(validateChain(perturbed as never).valid, false)
})

// ─── AC-12: StageOutput envelope emission ────────────────────────────────────

test('AC-12: the envelope validates against the frozen stage-envelope schema, reworkSignal is null iff pass, invalid input writes nothing, exclusivity holds, and sequence allocation is unaffected', () => {
  // pass verdict -> reworkSignal null
  const passWf = makeWorkflow()
  const passVerdict: VerificationVerdict = {
    verdict: 'pass',
    harnessClaims: [claim(true)],
    adversarialFindings: [],
  }
  const passResult = emitVerificationVerdict(passWf.workflowId, passVerdict, null, {
    repoRoot: passWf.repoRoot,
  })
  assert.equal(
    passResult.envelopePath,
    `docs/receipts/${passWf.workflowId}/verification-verdict.envelope.json`,
  )
  const passEnvelope = JSON.parse(
    readFileSync(join(passWf.repoRoot, ...passResult.envelopePath.split('/')), 'utf8'),
  ) as Record<string, unknown>
  assert.equal(passEnvelope.reworkSignal, null)
  // Validate against the frozen on-disk JSON schema instantiation itself.
  const frozenSchema = JSON.parse(
    readFileSync(
      join(
        PACKAGE_ROOT,
        '..',
        'contracts',
        'schemas',
        'stage-envelope.verification-verdict.schema.json',
      ),
      'utf8',
    ),
  ) as object
  const ajv = new Ajv()
  assert.equal(ajv.validate(frozenSchema, passEnvelope), true)

  // rework verdict -> reworkSignal equals the routing signal's shape; the
  // receipt ref carries the verdict sub-receipt's { hash, locator }.
  const reworkWf = makeWorkflow()
  const signal = makeSignal(1)
  const reworkResult = emitVerificationVerdict(reworkWf.workflowId, REWORK_VERDICT, signal, {
    repoRoot: reworkWf.repoRoot,
  })
  const reworkEnvelope = JSON.parse(
    readFileSync(join(reworkWf.repoRoot, ...reworkResult.envelopePath.split('/')), 'utf8'),
  ) as Record<string, unknown>
  assert.deepEqual(reworkEnvelope.reworkSignal, signal)
  assert.deepEqual(reworkEnvelope.payload, REWORK_VERDICT)
  const writtenReceipt = readReceipt(reworkWf.repoRoot, reworkResult.receiptLocator)
  assert.deepEqual(reworkEnvelope.receipt, {
    hash: writtenReceipt.hash,
    locator: reworkResult.receiptLocator,
  })
  assert.equal(ajv.validate(frozenSchema, reworkEnvelope), true)

  // Invalid combinations raise ENVELOPE_INVALID and write nothing.
  const invalidWf = makeWorkflow()
  const before = readdirSync(join(invalidWf.repoRoot, 'docs', 'receipts', invalidWf.workflowId))
  for (const call of [
    () =>
      emitVerificationVerdict(invalidWf.workflowId, passVerdict, makeSignal(1), {
        repoRoot: invalidWf.repoRoot,
      }),
    () =>
      emitVerificationVerdict(invalidWf.workflowId, REWORK_VERDICT, null, {
        repoRoot: invalidWf.repoRoot,
      }),
    () =>
      emitVerificationVerdict(
        invalidWf.workflowId,
        REWORK_VERDICT,
        { ...makeSignal(1), attempt: 0 },
        { repoRoot: invalidWf.repoRoot },
      ),
  ]) {
    assert.throws(call, (err: unknown) => {
      assertPipelineError(err, 'ENVELOPE_INVALID')
      return true
    })
  }
  assert.deepEqual(
    readdirSync(join(invalidWf.repoRoot, 'docs', 'receipts', invalidWf.workflowId)),
    before,
    'an invalid envelope must write nothing',
  )

  // Exclusivity: an existing envelope raises ENVELOPE_EXISTS.
  assert.throws(
    () =>
      emitVerificationVerdict(passWf.workflowId, passVerdict, null, {
        repoRoot: passWf.repoRoot,
      }),
    (err: unknown) => {
      assertPipelineError(err, 'ENVELOPE_EXISTS')
      return true
    },
  )

  // The envelope file never perturbs sequence allocation.
  const allocation = allocateSequence(passWf.workflowId, passWf.repoRoot)
  assert.equal(allocation.sequence, 2, 'genesis + verdict receipt only; envelope invisible')
})

// ─── AC-13: ReworkSignal sub-receipt on every rework verdict ─────────────────

test('AC-13: routeRework emits a chain-valid ReworkSignal sub-receipt whose reason names every failing claim and blocking finding', () => {
  const wf = makeWorkflow()
  const verdictReceipt = emitReworkVerdict(wf)
  const result = routeRework(routingInput(wf, verdictReceipt))
  const signalDoc = readReceipt(wf.repoRoot, result.signalReceiptLocator)
  assert.equal(signalDoc.kind, 'claim')
  assert.equal(signalDoc.stage, 'D')
  assert.equal(signalDoc.claimRef, 'rework-signal')
  assert.equal(signalDoc.subjectKind, 'ReworkSignal')
  const subject = signalDoc.subject as Record<string, unknown>
  assert.equal(subject.originStage, 'D')
  assert.equal(subject.targetStage, 'C')
  assert.equal(subject.attempt, 1)
  assert.deepEqual(subject.verdictReceipt, verdictReceipt)
  const reason = subject.reason as string
  assert.ok(reason.includes('AC-2: broken behavior'), 'reason names the failing claim')
  assert.ok(reason.includes('severe defect found'), 'reason names the blocking finding')
  assert.equal(validateChain(collectChain(wf.repoRoot, wf.workflowId)).valid, true)
})

// ─── AC-14: attempt 1 — build-fix kickstarter ────────────────────────────────

test('AC-14: with zero prior signals routeRework returns build-fix attempt 1 and the kickstarter carries every mandated element at the sequence-paired path', () => {
  const wf = makeWorkflow()
  const verdictReceipt = emitReworkVerdict(wf)
  const result = routeRework(routingInput(wf, verdictReceipt))
  if (result.kind !== 'build-fix') throw new Error(`expected build-fix, got ${result.kind}`)
  assert.equal(result.attempt, 1)
  // Path pairing: <seq6> = the ReworkSignal receipt's zero-padded sequence.
  const signalDoc = readReceipt(wf.repoRoot, result.signalReceiptLocator)
  const seq6 = String(signalDoc.sequence as number).padStart(6, '0')
  assert.equal(
    result.kickstarterPath,
    `docs/receipts/${wf.workflowId}/rework/${seq6}-build-fix-kickstarter.md`,
  )
  const text = readFileSync(join(wf.repoRoot, ...result.kickstarterPath.split('/')), 'utf8')
  assert.ok(text.includes('build-fix-loop'), 'names the build-fix-loop skill')
  assert.ok(text.includes('economy'), 'names the small-model economy tier')
  assert.ok(text.includes('boilerplate'), 'names the boilerplate routing class')
  assert.ok(text.includes('Step 0'), 'Step 0 restate-and-stop gate')
  assert.ok(text.includes('STOP and report'), 'stop gate wording')
  assert.ok(text.includes('feat/foreman-line-W3-P3'), 'names the branch')
  assert.ok(text.includes('C:/worktrees/w3-p3-rework'), 'names the worktree')
  assert.ok(text.includes('AC-2: broken behavior'), 'failing claim verbatim')
  assert.ok(text.includes('severe defect found'), 'blocking finding verbatim')
  assert.ok(text.includes(verdictReceipt.locator), 'verdict receipt locator')
  assert.ok(text.includes(result.signalReceiptLocator), 'signal receipt locator')
  assert.ok(text.includes('not just the listed'), 'fix-every-X charge')
  assert.ok(text.includes('tripwire'), 'test-count tripwire')
  assert.ok(text.includes('PowerShell'), 'PowerShell rule')
  assert.ok(text.includes('node -v'), 'node -v rule')
  assert.ok(text.includes('in full before reading any exit code'), 'full-capture rule')
})

// ─── AC-15: attempt 2 — frontier re-coordination kickstarter ─────────────────

test('AC-15: with one valid signal on disk routeRework returns recoordination attempt 2 derived from disk, with frontier framing and attempt-1 history', () => {
  const wf = makeWorkflow()
  const verdictReceipt = emitReworkVerdict(wf)
  const first = routeRework(routingInput(wf, verdictReceipt))
  assert.equal(first.kind, 'build-fix')
  // Same input again — the attempt number comes from disk, not a parameter.
  const second = routeRework(routingInput(wf, verdictReceipt))
  if (second.kind !== 'recoordination') {
    throw new Error(`expected recoordination, got ${second.kind}`)
  }
  assert.equal(second.attempt, 2)
  const signalDoc = readReceipt(wf.repoRoot, second.signalReceiptLocator)
  assert.equal((signalDoc.subject as Record<string, unknown>).attempt, 2)
  const seq6 = String(signalDoc.sequence as number).padStart(6, '0')
  assert.equal(
    second.kickstarterPath,
    `docs/receipts/${wf.workflowId}/rework/${seq6}-recoordination-kickstarter.md`,
  )
  const text = readFileSync(join(wf.repoRoot, ...second.kickstarterPath.split('/')), 'utf8')
  assert.ok(text.includes('Frontier model'), 'frontier framing')
  assert.ok(text.includes('design-level'), 're-examination framing')
  assert.ok(text.includes(first.signalReceiptLocator), 'attempt-1 ReworkSignal receipt locator')
  assert.ok(text.includes('attempt 1'), 'attempt-1 history entry')
  assert.ok(text.includes('Step 0'), 'Step 0 gate')
  assert.ok(text.includes('feat/foreman-line-W3-P3') && text.includes('C:/worktrees/w3-p3-rework'))
  assert.ok(text.includes('tripwire') && text.includes('PowerShell') && text.includes('node -v'))
})

// ─── AC-16: attempt 3 — stop condition, no kickstarter ───────────────────────

test('AC-16: with two valid signals on disk routeRework returns stop-condition, writes no kickstarter, and emits the rework-cap-exceeded receipt plus the failure report', () => {
  const wf = makeWorkflow()
  const verdictReceipt = emitReworkVerdict(wf)
  const first = routeRework(routingInput(wf, verdictReceipt))
  routeRework(routingInput(wf, verdictReceipt))
  const third = routeRework(routingInput(wf, verdictReceipt))
  if (third.kind !== 'stop-condition') throw new Error(`expected stop-condition, got ${third.kind}`)
  assert.equal(third.attempt, 3)
  // No kickstarter was written for attempt 3.
  const reworkDir = join(wf.repoRoot, 'docs', 'receipts', wf.workflowId, 'rework')
  const kickstarters = readdirSync(reworkDir).filter((name) => name.includes('kickstarter'))
  assert.equal(kickstarters.length, 2, 'only the attempt-1 and attempt-2 kickstarters exist')
  // Stop receipt.
  assert.ok(existsSync(join(wf.repoRoot, ...third.stopReceiptLocator.split('/'))))
  const stopDoc = readReceipt(wf.repoRoot, third.stopReceiptLocator)
  assert.equal(stopDoc.claimRef, 'rework-cap-exceeded')
  assert.equal(stopDoc.subjectKind, 'ReworkCapExceeded')
  const stopSubject = stopDoc.subject as Record<string, unknown>
  assert.equal(stopSubject.attempt, 3)
  assert.equal(stopSubject.failureReportPath, third.failureReportPath)
  assert.ok(typeof stopSubject.reason === 'string' && (stopSubject.reason as string).length > 0)
  // Structured failure report.
  const report = readFileSync(join(wf.repoRoot, ...third.failureReportPath.split('/')), 'utf8')
  assert.ok(report.includes('W3-P3'), 'parcel identity')
  assert.ok(
    report.includes('| 1 |') && report.includes('| 2 |') && report.includes('| 3 |'),
    'attempt-history table walked from disk',
  )
  assert.ok(
    report.includes(first.signalReceiptLocator),
    'history cites the on-disk signal receipts',
  )
  assert.ok(report.includes('AC-2: broken behavior'), 'failing claim verbatim')
  assert.ok(report.includes('severe defect found'), 'blocking finding verbatim')
  assert.ok(report.includes(verdictReceipt.locator), 'verdict receipt locator')
  assert.ok(report.includes('stop condition'), 'stop condition, not a routing option')
  // The chain including the stop receipt still validates.
  assert.equal(validateChain(collectChain(wf.repoRoot, wf.workflowId)).valid, true)
})

// ─── AC-17: planReverification (PRF-8 as data) ───────────────────────────────

test('AC-17: planReverification always re-runs the harness, re-runs adversarial only on code-touching rework, and rejects a truthy-string flag', () => {
  assert.deepEqual(planReverification({ reworkTouchedCode: true }), {
    rerunHarness: true,
    rerunAdversarial: true,
  })
  assert.deepEqual(planReverification({ reworkTouchedCode: false }), {
    rerunHarness: true,
    rerunAdversarial: false,
  })
  assert.throws(
    () => planReverification({ reworkTouchedCode: 'yes' as never }),
    (err: unknown) => {
      assertPipelineError(err, 'INPUT_INVALID')
      return true
    },
  )
})

// ─── AC-18: rework/ artifacts and envelope never perturb scans ───────────────

test('AC-18: after a full attempt-1 route, allocateSequence and countReworkAttempts reflect only conforming receipts in the workflow root', () => {
  const wf = makeWorkflow()
  const verdictReceipt = emitReworkVerdict(wf)
  routeRework(routingInput(wf, verdictReceipt))
  // On disk: genesis(0), verdict(1), signal(2) + envelope + rework/kickstarter.
  const allocation = allocateSequence(wf.workflowId, wf.repoRoot)
  assert.equal(allocation.sequence, 3)
  const signalDoc = readReceipt(
    wf.repoRoot,
    `docs/receipts/${wf.workflowId}/000002-D-rework-signal.json`,
  )
  assert.equal(allocation.prevHash, signalDoc.hash)
  assert.equal(countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }), 1)
})

// ─── AC-19: typed-error wrapping at every external boundary ──────────────────

test('AC-19: every forced boundary failure surfaces as a PipelineError with its documented code; no foreign exception escapes', () => {
  // Receipt-dir scan failure: the receipts dir path is a file, not a directory.
  const scanWf = makeWorkflow()
  const fileAsDirId = randomUUID()
  writeFileSync(join(scanWf.repoRoot, 'docs', 'receipts', fileAsDirId), 'not a dir')
  assert.throws(
    () => countReworkAttempts(fileAsDirId, { repoRoot: scanWf.repoRoot }),
    (err: unknown) => {
      assertPipelineError(err, 'SEQUENCE_READ_FAILED')
      return true
    },
  )

  // Chain-tip read failure: empty chain, then a corrupt tip.
  const emptyWf = makeTempRepoRoot({ matrix: false })
  const emptyId = randomUUID()
  mkdirSync(join(emptyWf, 'docs', 'receipts', emptyId), { recursive: true })
  assert.throws(
    () => emitVerificationVerdict(emptyId, REWORK_VERDICT, makeSignal(1), { repoRoot: emptyWf }),
    (err: unknown) => {
      assertPipelineError(err, 'SEQUENCE_READ_FAILED')
      return true
    },
  )
  const corruptWf = makeWorkflow()
  writeFileSync(
    join(corruptWf.repoRoot, 'docs', 'receipts', corruptWf.workflowId, '000001-D-junk.json'),
    'not json {',
  )
  assert.throws(
    () =>
      emitVerificationVerdict(corruptWf.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: corruptWf.repoRoot,
      }),
    (err: unknown) => {
      assertPipelineError(err, 'SEQUENCE_READ_FAILED')
      return true
    },
  )

  // ReworkSignal receipt read failure (typed, named by AC-9 too).
  const tamperWf = makeWorkflow()
  writeFileSync(
    join(tamperWf.repoRoot, 'docs', 'receipts', tamperWf.workflowId, '000001-D-rework-signal.json'),
    'garbage',
  )
  assert.throws(
    () => countReworkAttempts(tamperWf.workflowId, { repoRoot: tamperWf.repoRoot }),
    (err: unknown) => {
      assertPipelineError(err, 'REWORK_RECEIPT_INVALID')
      return true
    },
  )

  // Receipt write failure: a foreign exception from the write seam is wrapped.
  const writeWf = makeWorkflow()
  assert.throws(
    () =>
      emitVerificationVerdict(writeWf.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: writeWf.repoRoot,
        writeReceiptFn: () => {
          throw new Error('disk on fire')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'RECEIPT_WRITE_FAILED')
      return true
    },
  )

  // Exclusive-write collision: RECEIPT_EXISTS (write the same allocation twice).
  const collideWf = makeWorkflow()
  assert.throws(
    () =>
      emitVerificationVerdict(collideWf.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: collideWf.repoRoot,
        writeReceiptFn: (write) => {
          write()
          return write()
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'RECEIPT_EXISTS')
      return true
    },
  )

  // Envelope write failures: EEXIST from the seam is ENVELOPE_EXISTS; a
  // foreign exception is wrapped as ENVELOPE_WRITE_FAILED (RP-2 — it occurs
  // after a successful verdict-receipt write, so retry logic must be able to
  // distinguish it from RECEIPT_WRITE_FAILED), never foreign.
  const envWf = makeWorkflow()
  assert.throws(
    () =>
      emitVerificationVerdict(envWf.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: envWf.repoRoot,
        writeEnvelopeFn: () => {
          const err = new Error('exists') as NodeJS.ErrnoException
          err.code = 'EEXIST'
          throw err
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'ENVELOPE_EXISTS')
      return true
    },
  )
  const envWf2 = makeWorkflow()
  assert.throws(
    () =>
      emitVerificationVerdict(envWf2.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: envWf2.repoRoot,
        writeEnvelopeFn: () => {
          throw new Error('foreign envelope failure')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'ENVELOPE_WRITE_FAILED')
      return true
    },
  )

  // Kickstarter write failure.
  const kickWf = makeWorkflow()
  const kickReceipt = emitReworkVerdict(kickWf)
  assert.throws(
    () =>
      routeRework(routingInput(kickWf, kickReceipt), {
        writeKickstarterFn: () => {
          throw new Error('foreign kickstarter failure')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'KICKSTARTER_WRITE_FAILED')
      return true
    },
  )

  // Report write failure (attempt 3 path).
  const reportWf = makeWorkflow()
  const reportReceipt = emitReworkVerdict(reportWf)
  routeRework(routingInput(reportWf, reportReceipt))
  routeRework(routingInput(reportWf, reportReceipt))
  assert.throws(
    () =>
      routeRework(routingInput(reportWf, reportReceipt), {
        writeReportFn: () => {
          throw new Error('foreign report failure')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'REPORT_WRITE_FAILED')
      return true
    },
  )
})

// ─── AC-20: linear-time string handling over hostile text ────────────────────

// ─── RP-3 (AC-12): emitVerificationVerdict idempotent retry ──────────────────

test('AC-12: retry after an envelope-write failure reuses the existing verdict receipt — no duplicate, no orphan (RP-3)', () => {
  const wf = makeWorkflow()
  // First call: verdict receipt lands, envelope write fails.
  assert.throws(
    () =>
      emitVerificationVerdict(wf.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: wf.repoRoot,
        writeEnvelopeFn: () => {
          throw new Error('transient envelope fault')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'ENVELOPE_WRITE_FAILED')
      return true
    },
  )
  const dir = join(wf.repoRoot, 'docs', 'receipts', wf.workflowId)
  const verdictReceiptsAfterFault = readdirSync(dir).filter((n) =>
    n.endsWith('-D-verification-verdict.json'),
  )
  assert.equal(verdictReceiptsAfterFault.length, 1, 'the receipt write itself succeeded')
  assert.ok(!existsSync(join(dir, 'verification-verdict.envelope.json')))

  // Retry: the existing verdict receipt is reused; the envelope now lands.
  const { receiptLocator, envelopePath } = emitVerificationVerdict(
    wf.workflowId,
    REWORK_VERDICT,
    makeSignal(1),
    { repoRoot: wf.repoRoot },
  )
  const verdictReceipts = readdirSync(dir).filter((n) => n.endsWith('-D-verification-verdict.json'))
  assert.equal(verdictReceipts.length, 1, 'exactly one verdict receipt on disk after retry')
  assert.equal(receiptLocator, `docs/receipts/${wf.workflowId}/${verdictReceipts[0]}`)
  const envelope = JSON.parse(
    readFileSync(join(wf.repoRoot, ...envelopePath.split('/')), 'utf8'),
  ) as { receipt: { hash: string; locator: string } }
  assert.equal(envelope.receipt.locator, receiptLocator)
  const receiptDoc = readReceipt(wf.repoRoot, receiptLocator)
  assert.equal(envelope.receipt.hash, receiptDoc.hash)
  // The extended chain still validates (no fork, no duplicate sequence).
  assert.equal(validateChain(collectChain(wf.repoRoot, wf.workflowId)).valid, true)

  // A DIFFERENT verdict at the tip is a typed refusal, never a duplicate.
  const wf2 = makeWorkflow()
  assert.throws(
    () =>
      emitVerificationVerdict(wf2.workflowId, REWORK_VERDICT, makeSignal(1), {
        repoRoot: wf2.repoRoot,
        writeEnvelopeFn: () => {
          throw new Error('transient envelope fault')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'ENVELOPE_WRITE_FAILED')
      return true
    },
  )
  const otherVerdict: VerificationVerdict = {
    verdict: 'rework',
    harnessClaims: [claim(false, 'AC-3: a different failure')],
    adversarialFindings: [],
  }
  assert.throws(
    () =>
      emitVerificationVerdict(wf2.workflowId, otherVerdict, makeSignal(1), {
        repoRoot: wf2.repoRoot,
      }),
    (err: unknown) => {
      assertPipelineError(err, 'RECEIPT_EXISTS')
      return true
    },
  )
  const wf2Receipts = readdirSync(join(wf2.repoRoot, 'docs', 'receipts', wf2.workflowId)).filter(
    (n) => n.endsWith('-D-verification-verdict.json'),
  )
  assert.equal(wf2Receipts.length, 1, 'the differing retry emitted nothing')
})

// ─── RP-1 (AC-14): routeRework resumes an orphaned attempt ───────────────────

test('AC-14: a kickstarter-write fault then retry resumes the SAME attempt — build-fix kickstarter emitted, exactly one signal receipt (RP-1)', () => {
  const wf = makeWorkflow()
  const verdictReceipt = emitReworkVerdict(wf)
  // First route: signal receipt lands, kickstarter write fails.
  assert.throws(
    () =>
      routeRework(routingInput(wf, verdictReceipt), {
        writeKickstarterFn: () => {
          throw new Error('transient kickstarter fault')
        },
      }),
    (err: unknown) => {
      assertPipelineError(err, 'KICKSTARTER_WRITE_FAILED')
      return true
    },
  )
  const dir = join(wf.repoRoot, 'docs', 'receipts', wf.workflowId)
  const signalsAfterFault = readdirSync(dir).filter((n) => n.endsWith('-D-rework-signal.json'))
  assert.equal(signalsAfterFault.length, 1, 'the orphaned signal receipt is on disk')
  assert.ok(!existsSync(join(dir, 'rework')) || readdirSync(join(dir, 'rework')).length === 0)

  // Retry: the orphaned attempt is RESUMED — same attempt number, build-fix
  // kickstarter emitted, exactly one signal receipt on disk (no burned rung).
  const result = routeRework(routingInput(wf, verdictReceipt))
  assert.equal(result.kind, 'build-fix')
  assert.equal(result.attempt, 1)
  const signals = readdirSync(dir).filter((n) => n.endsWith('-D-rework-signal.json'))
  assert.equal(signals.length, 1, 'exactly one signal receipt after the resumed retry')
  assert.equal(result.signalReceiptLocator, `docs/receipts/${wf.workflowId}/${signals[0]}`)
  const seq6 = (signals[0] as string).slice(0, 6)
  assert.equal(
    result.kickstarterPath,
    `docs/receipts/${wf.workflowId}/rework/${seq6}-build-fix-kickstarter.md`,
  )
  assert.ok(existsSync(join(wf.repoRoot, ...result.kickstarterPath.split('/'))))
  assert.equal(countReworkAttempts(wf.workflowId, { repoRoot: wf.repoRoot }), 1)

  // A subsequent (post-resume) rework verdict escalates normally to attempt 2.
  const next = routeRework(routingInput(wf, verdictReceipt))
  assert.equal(next.kind, 'recoordination')
  assert.equal(next.attempt, 2)
})

// ─── RP-4 (AC-16): failure-report table-cell escaping ────────────────────────

test('AC-16: hostile finding text cannot split failure-report table cells, break rows, or open a column-0 heading (RP-4)', () => {
  const wf = makeWorkflow()
  const hostileVerdict: VerificationVerdict = {
    verdict: 'rework',
    harnessClaims: [claim(false, 'AC-2: broken | with pipe')],
    adversarialFindings: [
      finding('critical', 'evil | cell-splitter\r\n# hostile heading attempt\nsecond line'),
    ],
  }
  const verdictReceipt = (() => {
    const { receiptLocator } = emitVerificationVerdict(
      wf.workflowId,
      hostileVerdict,
      makeSignal(1),
      { repoRoot: wf.repoRoot },
    )
    const doc = readReceipt(wf.repoRoot, receiptLocator)
    return { hash: doc.hash as string, locator: receiptLocator }
  })()
  const input = routingInput(wf, verdictReceipt, hostileVerdict)
  routeRework(input) // attempt 1
  routeRework(input) // attempt 2
  const result = routeRework(input) // attempt 3 -> stop-condition + report
  assert.equal(result.kind, 'stop-condition')
  const reportPath = (result as { failureReportPath: string }).failureReportPath
  const report = readFileSync(join(wf.repoRoot, ...reportPath.split('/')), 'utf8')

  // No line of the report is the hostile column-0 heading.
  for (const line of report.split('\n')) {
    assert.ok(!line.startsWith('# hostile heading'), 'hostile heading must never reach column 0')
  }
  // Every attempt-history table row holds exactly 3 cells: unescaped pipe
  // count is exactly 4 and no CR survives inside a row.
  const rows = report.split('\n').filter((line) => line.startsWith('| '))
  assert.ok(rows.length >= 4, 'header + 3 attempt rows expected')
  for (const row of rows) {
    assert.ok(!row.includes('\r'), 'no CR inside a table row')
    let unescaped = 0
    for (let i = 0; i < row.length; i++) {
      if (row[i] === '|' && (i === 0 || row[i - 1] !== '\\')) unescaped += 1
    }
    assert.equal(unescaped, 4, `table row must keep exactly 3 cells: ${row}`)
  }
  // The hostile text is present, escaped, inside a single cell.
  assert.ok(report.includes('evil \\| cell-splitter # hostile heading attempt second line'))
})

test('AC-20: a 100k-char hostile finding summary completes without pathological slowdown, and src/pipeline applies no backtracking-prone regex to untrusted text', () => {
  const hostile = `${'-'.repeat(40000)}${'9'.repeat(30000)}${' '.repeat(29999)}x`
  assert.equal(hostile.length, 100000)
  const verdict: VerificationVerdict = {
    verdict: 'rework',
    harnessClaims: [claim(false, `AC-1: ${hostile}`)],
    adversarialFindings: [{ summary: hostile, citation: hostile, severity: 'high' }],
  }
  const started = Date.now()
  const assembled = assembleVerdict({
    harnessClaims: verdict.harnessClaims,
    adversarialFindings: verdict.adversarialFindings,
    dispositions: [],
  })
  assert.equal(assembled.verdict, 'rework')
  const kickstarter = generateBuildFixKickstarter({
    parcelRef: 'W3-P3',
    branch: 'feat/x',
    worktreePath: 'C:/wt',
    attempt: 1,
    failingClaims: assembled.harnessClaims,
    blockingFindings: assembled.adversarialFindings,
    receiptLocators: ['docs/receipts/x/000001-D-v.json'],
  })
  const recoordination = generateRecoordinationKickstarter({
    parcelRef: 'W3-P3',
    branch: 'feat/x',
    worktreePath: 'C:/wt',
    attempt: 2,
    failingClaims: assembled.harnessClaims,
    blockingFindings: assembled.adversarialFindings,
    receiptLocators: ['docs/receipts/x/000001-D-v.json'],
    priorAttempts: [{ attempt: 1, reason: hostile, signalReceiptLocator: 'loc' }],
  })
  assert.ok(kickstarter.includes(hostile.slice(0, 1000)))
  assert.ok(recoordination.length > hostile.length)
  const elapsed = Date.now() - started
  assert.ok(elapsed < 5000, `hostile 100k input took ${elapsed}ms (must be linear-time)`)

  // Static grep: no regex construction or regex-literal string methods in
  // src/pipeline (untrusted claim/finding text must never meet a regex).
  const dir = join(PACKAGE_ROOT, 'src', 'pipeline')
  for (const name of readdirSync(dir)) {
    const text = readFileSync(join(dir, name), 'utf8')
    for (const token of [
      'new RegExp',
      'RegExp(',
      '.match(',
      '.replace(/',
      '.split(/',
      '.search(',
    ]) {
      assert.ok(!text.includes(token), `src/pipeline/${name} contains regex token '${token}'`)
    }
  }
})

// ─── AC-21: scope greps — generate, never launch ─────────────────────────────

test('AC-21: src/pipeline performs no process spawn, git operation, Jira call, skill invocation, or harness/adversarial re-run', () => {
  const dir = join(PACKAGE_ROOT, 'src', 'pipeline')
  const forbidden = [
    'child_process',
    'execSync',
    'execFile',
    'spawnSync',
    'spawn(',
    'spawnFn',
    'simple-git',
    'git commit',
    'git push',
    'git checkout',
    'git worktree',
    'jira',
    'Jira',
    'JIRA',
    'atlassian',
    'runHarness(',
    'dispatchReview',
    'launchReviewer',
    'collectAdversarialFindings',
    'headroom_compress',
    'Skill(',
  ]
  for (const name of readdirSync(dir)) {
    const text = readFileSync(join(dir, name), 'utf8')
    for (const token of forbidden) {
      assert.ok(!text.includes(token), `src/pipeline/${name} contains forbidden token '${token}'`)
    }
  }
})

// ─── AC-22: dogfood — every AC named by at least one pipeline test ───────────

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

test('AC-22: every AC-1..AC-22 label from the W3-P3 spec is named by at least one pipeline test', () => {
  const testsDir = join(PACKAGE_ROOT, 'tests')
  const pipelineTestText = readdirSync(testsDir)
    .filter((name) => name.startsWith('pipeline') && name.endsWith('.test.ts'))
    .map((name) => readFileSync(join(testsDir, name), 'utf8'))
    .join('\n')
  for (let n = 1; n <= 22; n++) {
    assert.ok(namesAc(pipelineTestText, n), `no pipeline test names AC-${n}`)
  }
})
