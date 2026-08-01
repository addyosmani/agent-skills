/**
 * W3-P1 runHarness tests: AC-8..AC-13 (harness-side boundaries) and the
 * AC-14 hostile-input linearity probe.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateChain } from '../../receipts/src/index.js'
import type { HarnessInput, MatrixCheckSet, TestResults } from '../src/index.js'
import { recordBuildResult, runHarness, VerificationError } from '../src/index.js'
import {
  collectChain,
  makeOrder,
  makeTempRepoRoot,
  mintStageCReceipt,
  passCheck,
  readReceipt,
  writeSpec,
} from './helpers.js'

const TWO_AC_SPEC = ['# Parcel spec', '', 'AC-1: first criterion', 'AC-2: second criterion'].join(
  '\n',
)

interface FixtureOptions {
  readonly spec?: string
  readonly surfaces?: readonly string[]
  readonly testResults?: TestResults
  readonly matrixChecks?: MatrixCheckSet
}

/** Full happy-path fixture: matrix + Stage-C receipt + BuildResult bridge. */
function makeFixture(options: FixtureOptions = {}): {
  readonly repoRoot: string
  readonly workflowId: string
  readonly input: HarnessInput
} {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  const stageC = mintStageCReceipt(repoRoot, workflowId)
  const surfaces = options.surfaces ?? ['plugins/foreman-line/verification/src/index.ts']
  recordBuildResult(workflowId, stageC.locator, 'feat/test', ['abc1234'], surfaces, repoRoot)
  const specPath = writeSpec(repoRoot, options.spec ?? TWO_AC_SPEC)
  const input: HarnessInput = {
    workflowId,
    order: makeOrder(),
    buildResult: { branch: 'feat/test', commitShas: ['abc1234'], touchedSurfaces: surfaces },
    specPath,
    testResults: options.testResults ?? {
      passed: ['AC-1: covered', 'AC-2: covered'],
      failed: [],
    },
    matrixChecks: options.matrixChecks ?? { 'test-coverage.check': passCheck },
    repoRoot,
  }
  return { repoRoot, workflowId, input }
}

// ─── AC-8: spec read + AC extraction ─────────────────────────────────────────

test('AC-8: runHarness extracts sequential AC-N labels from the spec acceptance criteria', async () => {
  const { repoRoot, input } = makeFixture()
  try {
    const result = await runHarness(input)
    const acClaims = result.claims.filter((c) => c.claim.startsWith('AC-'))
    assert.deepEqual(
      acClaims.map((c) => c.claim),
      ['AC-1: first criterion', 'AC-2: second criterion'],
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-8: a spec with no AC-N label raises SPEC_INVALID', async () => {
  const { repoRoot, input } = makeFixture({ spec: '# Spec\n\nNo criteria here.\n' })
  try {
    await assert.rejects(
      runHarness(input),
      (err: unknown) => err instanceof VerificationError && err.code === 'SPEC_INVALID',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-8: an unreadable specPath raises SPEC_UNREADABLE', async () => {
  const { repoRoot, input } = makeFixture()
  try {
    await assert.rejects(
      runHarness({ ...input, specPath: join(input.repoRoot ?? '', 'missing-spec.md') }),
      (err: unknown) => err instanceof VerificationError && err.code === 'SPEC_UNREADABLE',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-9: named-test mapping, all four situations + AC-1/AC-10 boundary ─────

test('AC-9: named-test mapping covers all-pass, any-fail, no-coverage, and the AC-1 vs AC-10 boundary', async () => {
  // RF-6: AC IDs must be sequential with no gaps, so AC-4..AC-9 are present
  // as uncovered filler; the AC-1 vs AC-10 boundary assertions are unchanged.
  const spec = [
    'AC-1: only named by an AC-10 test, so uncovered',
    'AC-2: covered by two passing tests',
    'AC-3: covered but one covering test fails',
    'AC-4: uncovered filler',
    'AC-5: uncovered filler',
    'AC-6: uncovered filler',
    'AC-7: uncovered filler',
    'AC-8: uncovered filler',
    'AC-9: uncovered filler',
    'AC-10: covered by the boundary test',
  ].join('\n')
  const { repoRoot, input } = makeFixture({
    spec,
    testResults: {
      passed: ['AC-10 boundary test passes', 'AC-2 first proof', 'AC-2 second proof (also AC-3)'],
      failed: ['AC-3 failing proof'],
    },
  })
  try {
    const result = await runHarness(input)
    const byLabel = new Map(result.claims.map((c) => [c.claim.split(':')[0], c]))

    const ac1 = byLabel.get('AC-1')
    assert.ok(ac1)
    assert.equal(ac1.passed, false, 'AC-1 must not match the AC-10 test name')
    assert.equal(ac1.evidence, 'no test references AC-1')

    const ac2 = byLabel.get('AC-2')
    assert.ok(ac2)
    assert.equal(ac2.passed, true)
    assert.ok(ac2.evidence.length > 0, 'passed: true never has empty evidence')
    assert.ok(ac2.evidence.includes('AC-2 first proof'))
    assert.ok(ac2.evidence.includes('AC-2 second proof (also AC-3)'))

    const ac3 = byLabel.get('AC-3')
    assert.ok(ac3)
    assert.equal(ac3.passed, false, 'any covering test failing fails the claim')
    assert.equal(ac3.evidence, 'AC-3 failing proof')

    const ac10 = byLabel.get('AC-10')
    assert.ok(ac10)
    assert.equal(ac10.passed, true)
    assert.equal(ac10.evidence, 'AC-10 boundary test passes')
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-10: one chained Stage-D claim sub-receipt per AC claim ───────────────

test('AC-10: emitted claim sub-receipts chain by prevHash with inherited correlation and pass validateChain', async () => {
  const { repoRoot, workflowId, input } = makeFixture()
  try {
    const result = await runHarness(input)
    assert.equal(result.receiptLocators.length, result.claims.length)

    for (const [index, locator] of result.receiptLocators.entries()) {
      const doc = readReceipt(repoRoot, locator)
      assert.equal(doc.kind, 'claim')
      assert.equal(doc.stage, 'D')
      assert.equal(doc.subjectKind, 'HarnessClaimResult')
      assert.equal(doc.claimRef, result.claims[index]?.claim)
    }

    const chain = collectChain(repoRoot, workflowId)
    // Stage-C + BuildResult bridge + one sub-receipt per claim
    assert.equal(chain.length, 2 + result.claims.length)
    const validation = validateChain(chain)
    assert.ok(validation.valid, `validateChain accepts: ${validation.errors.join('; ')}`)

    // Perturbing one sub-receipt's correlationId breaks AC5c
    const perturbed = chain.map((doc, index) =>
      index === chain.length - 1
        ? ({
            ...doc,
            correlation: { ...doc.correlation, correlationId: randomUUID() },
          } as typeof doc)
        : doc,
    )
    assert.equal(validateChain(perturbed).valid, false)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-11: verifier-side matrix resolution + injected check invocation ──────

test('AC-11: ui/* surface requires test-coverage.check and kds-sweep as matrix claims', async () => {
  const { repoRoot, input } = makeFixture({
    surfaces: ['ui/components/Button.ts'],
    matrixChecks: { 'test-coverage.check': passCheck, 'kds-sweep': passCheck },
  })
  try {
    const result = await runHarness(input)
    const matrixClaims = result.claims
      .filter((c) => c.claim.startsWith('matrix:'))
      .map((c) => c.claim)
    assert.deepEqual(matrixClaims, ['matrix:test-coverage.check', 'matrix:kds-sweep'])
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-11: tenancy/* surface requires tenant-isolation; plain surfaces require only test-coverage.check', async () => {
  const tenancy = makeFixture({
    surfaces: ['tenancy/isolation/db.ts'],
    matrixChecks: { 'test-coverage.check': passCheck, 'tenant-isolation': passCheck },
  })
  try {
    const result = await runHarness(tenancy.input)
    const matrixClaims = result.claims
      .filter((c) => c.claim.startsWith('matrix:'))
      .map((c) => c.claim)
    assert.deepEqual(matrixClaims, ['matrix:test-coverage.check', 'matrix:tenant-isolation'])
  } finally {
    rmSync(tenancy.repoRoot, { recursive: true, force: true })
  }

  const plain = makeFixture()
  try {
    const result = await runHarness(plain.input)
    const matrixClaims = result.claims
      .filter((c) => c.claim.startsWith('matrix:'))
      .map((c) => c.claim)
    assert.deepEqual(matrixClaims, ['matrix:test-coverage.check'])
  } finally {
    rmSync(plain.repoRoot, { recursive: true, force: true })
  }
})

test('AC-11: a required check absent from matrixChecks raises MATRIX_CHECK_MISSING (AC-13 boundary)', async () => {
  const { repoRoot, input } = makeFixture({
    surfaces: ['ui/components/Button.ts'],
    matrixChecks: { 'test-coverage.check': passCheck }, // kds-sweep missing
  })
  try {
    await assert.rejects(
      runHarness(input),
      (err: unknown) => err instanceof VerificationError && err.code === 'MATRIX_CHECK_MISSING',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-11: a MatrixCheck that throws raises MATRIX_CHECK_FAILED (AC-13 boundary)', async () => {
  const { repoRoot, input } = makeFixture({
    matrixChecks: {
      'test-coverage.check': async () => {
        throw new Error('tool crashed')
      },
    },
  })
  try {
    await assert.rejects(
      runHarness(input),
      (err: unknown) => err instanceof VerificationError && err.code === 'MATRIX_CHECK_FAILED',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-12: HarnessResult shape and blocked flag ──────────────────────────────

test('AC-12: claims are AC-then-matrix, locators align one-to-one, and blocked is false when all pass', async () => {
  const { repoRoot, input } = makeFixture()
  try {
    const result = await runHarness(input)
    assert.deepEqual(
      result.claims.map((c) => c.claim),
      ['AC-1: first criterion', 'AC-2: second criterion', 'matrix:test-coverage.check'],
    )
    assert.equal(result.receiptLocators.length, result.claims.length)
    assert.equal(result.blocked, false)
    assert.ok(result.claims.every((c) => c.passed))
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-12: blocked flips to true with a single failing claim', async () => {
  const { repoRoot, input } = makeFixture({
    testResults: { passed: ['AC-1: covered'], failed: ['AC-2: broken'] },
  })
  try {
    const result = await runHarness(input)
    assert.equal(result.blocked, true)
    assert.equal(result.claims.filter((c) => !c.passed).length, 1)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-13: matrix read/parse boundaries ─────────────────────────────────────

test('AC-13: a repoRoot with no skill-injection.yaml raises MATRIX_UNREADABLE', async () => {
  const { repoRoot, input } = makeFixture()
  rmSync(join(repoRoot, 'plugins'), { recursive: true, force: true })
  try {
    await assert.rejects(
      runHarness(input),
      (err: unknown) => err instanceof VerificationError && err.code === 'MATRIX_UNREADABLE',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

test('AC-13: a malformed or schema-invalid matrix raises MATRIX_INVALID', async () => {
  const malformed = makeFixture()
  const matrixPath = join(
    malformed.repoRoot,
    'plugins',
    'foreman-line',
    'skill-injection',
    'skill-injection.yaml',
  )
  writeFileSync(matrixPath, 'builder: [unclosed\n  bad: - :\n')
  try {
    await assert.rejects(
      runHarness(malformed.input),
      (err: unknown) => err instanceof VerificationError && err.code === 'MATRIX_INVALID',
    )
  } finally {
    rmSync(malformed.repoRoot, { recursive: true, force: true })
  }

  const schemaInvalid = makeFixture()
  const invalidPath = join(
    schemaInvalid.repoRoot,
    'plugins',
    'foreman-line',
    'skill-injection',
    'skill-injection.yaml',
  )
  writeFileSync(invalidPath, "builder:\n  '*': [test-coverage]\n")
  try {
    await assert.rejects(
      runHarness(schemaInvalid.input),
      (err: unknown) => err instanceof VerificationError && err.code === 'MATRIX_INVALID',
    )
  } finally {
    rmSync(schemaInvalid.repoRoot, { recursive: true, force: true })
  }
})

test('AC-13: a broken chain tip during sub-receipt emission raises SEQUENCE_READ_FAILED', async () => {
  const { repoRoot, workflowId, input } = makeFixture()
  try {
    // Corrupt the chain tip after the bridge receipt exists
    const dir = join(repoRoot, 'docs', 'receipts', workflowId)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, '000002-D-harness-claim-result.json'), '{broken')
    await assert.rejects(
      runHarness(input),
      (err: unknown) => err instanceof VerificationError && err.code === 'SEQUENCE_READ_FAILED',
    )
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})

// ─── AC-14: hostile-input linearity probe (lesson #19) ───────────────────────

test('AC-14: AC extraction and test-name matching survive 100k chars of hostile input at linear cost', async () => {
  const hostileRun = `${'AC-'.repeat(20000)}${'9'.repeat(20000)}${'-'.repeat(20000)}`
  const spec = `AC-1: real criterion\n${hostileRun}\n${' '.repeat(20000)}AC-\n`
  const hostileTestName = `AC-1 proof ${hostileRun}`
  const { repoRoot, input } = makeFixture({
    spec,
    testResults: { passed: [hostileTestName], failed: [] },
  })
  try {
    const started = Date.now()
    const result = await runHarness(input)
    const elapsed = Date.now() - started
    const ac1 = result.claims.find((c) => c.claim.startsWith('AC-1'))
    assert.ok(ac1)
    assert.equal(ac1.passed, true)
    assert.ok(elapsed < 5000, `linear-time scan finished in ${elapsed}ms`)
  } finally {
    rmSync(repoRoot, { recursive: true, force: true })
  }
})
