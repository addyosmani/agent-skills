/**
 * W3-P2 dispatch + launch tests: AC-5..AC-14.
 */
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { validateChain } from '../../receipts/src/index.js'
import type { ReviewDispatchInput } from '../src/adversarial/index.js'
import * as api from '../src/index.js'
import { collectChain, makeTempRepoRoot, mintStageCReceipt, readReceipt } from './helpers.js'

const SPEC_REL_PATH = 'plugins/foreman-line/docs/specs/active/TEST-P9-fixture.md'

interface Fixture {
  readonly repoRoot: string
  readonly workflowId: string
  readonly input: ReviewDispatchInput
}

function makeFixture(specBody = 'AC-1: fixture criterion\n'): Fixture {
  const repoRoot = makeTempRepoRoot()
  const workflowId = randomUUID()
  mintStageCReceipt(repoRoot, workflowId)
  const specAbs = join(repoRoot, ...SPEC_REL_PATH.split('/'))
  mkdirSync(join(specAbs, '..'), { recursive: true })
  writeFileSync(specAbs, specBody)
  const input: ReviewDispatchInput = {
    workflowId,
    parcelRef: 'TEST-P9',
    specPath: SPEC_REL_PATH,
    surfaces: ['plugins/foreman-line/verification'],
    worktreePath: join(repoRoot, 'reviewer-wt'),
    repoRoot,
  }
  return { repoRoot, workflowId, input }
}

/**
 * Success-stub git seam: rev-parse verifies, worktree add mimics the real
 * worktree-dir creation (amended mechanism: existing branch, no -b).
 */
function stubGitOk(calls?: { args: readonly string[]; cwd: string }[]): (
  args: readonly string[],
  options: { readonly cwd: string },
) => {
  status: number
  stdout: string
  stderr: string
} {
  return (args, options) => {
    calls?.push({ args, cwd: options.cwd })
    if (args[0] === 'worktree' && args[1] === 'add') {
      mkdirSync(args[2] as string, { recursive: true })
    }
    return { status: 0, stdout: '', stderr: '' }
  }
}

/** Standard launch deps for the seam tests (hermetic, no real spawn). */
function launchDeps(overrides: Partial<api.LaunchDeps> = {}): api.LaunchDeps {
  return {
    stdoutPath: 'C:/wt/reviewer-stdout.txt',
    workflowId: randomUUID(),
    ...overrides,
  }
}

function receiptFileCount(repoRoot: string, workflowId: string): number {
  return readdirSync(join(repoRoot, 'docs', 'receipts', workflowId)).filter((n) =>
    n.endsWith('.json'),
  ).length
}

// ─── AC-5: barrel exports ─────────────────────────────────────────────────────

test('AC-5: src/index.ts exports the seven adversarial functions, AdversarialError, and preserves every W3-P1 export', () => {
  // New W3-P2 exports.
  assert.equal(typeof api.generateReviewKickstarter, 'function')
  assert.equal(typeof api.dispatchReview, 'function')
  assert.equal(typeof api.buildReviewerLaunchCommand, 'function')
  assert.equal(typeof api.launchReviewer, 'function')
  assert.equal(typeof api.emitStopReport, 'function')
  assert.equal(typeof api.parseAdversarialFindings, 'function')
  assert.equal(typeof api.collectAdversarialFindings, 'function')
  assert.equal(typeof api.AdversarialError, 'function')
  // Public types are proven by compilation: annotations fail tsc if absent.
  const errCode: api.AdversarialErrorCode = 'PARSE_FAILED'
  const cmd: api.ReviewerLaunchCommand = {
    command: 'claude',
    args: ['-p', 'x'],
    cwd: 'C:/x',
    env: {},
  }
  const launch: api.LaunchResult = { pid: null, command: cmd, stdoutPath: 'C:/x/out.txt' }
  const collect: api.CollectResult = { ok: true, findings: [], receiptLocator: 'x' }
  const dispatchResult: api.ReviewDispatchResult = {
    worktreePath: 'x',
    branch: 'x',
    kickstarterPath: 'x',
    injectedSkills: [],
    receiptLocator: 'x',
  }
  assert.ok(errCode.length > 0 && cmd.cwd && launch.pid === null && collect.ok && dispatchResult)
  // Pre-existing W3-P1 exports remain unchanged.
  assert.equal(typeof api.recordBuildResult, 'function')
  assert.equal(typeof api.allocateSequence, 'function')
  assert.equal(typeof api.runHarness, 'function')
  assert.equal(typeof api.VerificationError, 'function')
  assert.equal(api.AC_CONVENTION_PATH, 'plugins/foreman-line/verification/AC-CONVENTION.md')
})

// ─── AC-6: kickstarter content ────────────────────────────────────────────────

test('AC-6: generateReviewKickstarter output contains every mandated element', () => {
  const { input } = makeFixture()
  const text = api.generateReviewKickstarter(input)
  assert.ok(text.includes('TEST-P9'), 'parcelRef')
  assert.ok(text.includes(SPEC_REL_PATH), 'parcel spec path')
  assert.ok(text.includes(input.worktreePath), 'reviewer worktree path')
  assert.ok(text.includes('feat/foreman-line-TEST-P9'), 'reviewer branch')
  assert.ok(text.includes(api.AC_CONVENTION_PATH), 'AC convention reference')
  assert.ok(text.includes('code-review'), "adversarial_reviewer '*' matrix skill")
  assert.ok(text.includes('reviewer-readonly'), 'profile name')
  assert.ok(text.includes('never fix, never commit'), 'never-fix/never-commit charge')
  assert.ok(text.includes('lesson #12'), 'hostile-probing license')
  assert.ok(text.includes('Hostile probing'), 'hostile-probing license text')
  assert.ok(text.includes('PowerShell (lesson #10)'), 'PowerShell discipline')
  assert.ok(
    text.includes('in full before reading any exit code (lesson #11)'),
    'full-capture discipline',
  )
  assert.ok(text.includes('```adversarial-findings'), 'fenced output contract open fence')
  assert.ok(text.includes('JSON array'), 'output contract payload shape')
  assert.ok(text.includes('"severity"'), 'output contract severity field')
  assert.ok(text.includes('only the LAST one is collected'), 'last-fence-wins rule')
})

// ─── AC-7: zero coordinator context ───────────────────────────────────────────

test('AC-7: ReviewDispatchInput has no triage-shaped field and canaries in ambient inputs never reach the kickstarter', () => {
  // Type-level exclusion: these names must not be keys of ReviewDispatchInput.
  type Forbidden =
    | 'harnessResults'
    | 'harnessClaims'
    | 'testResults'
    | 'triageNotes'
    | 'priorFindings'
    | 'findings'
    | 'coordinatorNotes'
    | 'verdict'
  type NoLeak = Extract<keyof ReviewDispatchInput, Forbidden> extends never ? true : never
  const typeLevelExclusionHolds: NoLeak = true
  assert.equal(typeLevelExclusionHolds, true)

  const specCanary = `CANARY-SPEC-${randomUUID()}`
  const receiptCanary = `CANARY-TRIAGE-${randomUUID()}`
  const fixture = makeFixture(`AC-1: body with ${specCanary}\n`)
  // Seed a triage-shaped ambient file the coordinator could have left around.
  const triagePath = join(fixture.repoRoot, 'docs', 'receipts', fixture.workflowId, 'triage.md')
  writeFileSync(triagePath, `harness said everything failed: ${receiptCanary}\n`)

  const text = api.generateReviewKickstarter(fixture.input)
  assert.ok(!text.includes(specCanary), 'spec BODY is not inlined (path reference only)')
  assert.ok(!text.includes(receiptCanary), 'no receipt/triage content reaches the kickstarter')
})

// ─── AC-8: matrix read/validate boundary ──────────────────────────────────────

test('AC-8: unreadable matrix raises MATRIX_UNREADABLE; invalid matrix raises MATRIX_INVALID', () => {
  const fixture = makeFixture()
  const bare = makeTempRepoRoot({ matrix: false })
  assert.throws(
    () => api.generateReviewKickstarter({ ...fixture.input, repoRoot: bare }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'MATRIX_UNREADABLE',
  )

  const invalidRoot = makeTempRepoRoot({ matrix: false })
  const matrixDir = join(invalidRoot, 'plugins', 'foreman-line', 'skill-injection')
  mkdirSync(matrixDir, { recursive: true })
  writeFileSync(join(matrixDir, 'skill-injection.yaml'), 'builder: 5\n')
  assert.throws(
    () => api.generateReviewKickstarter({ ...fixture.input, repoRoot: invalidRoot }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'MATRIX_INVALID',
  )
})

// ─── AC-9 (as amended): worktree-first on an existing branch, no -b ──────────

test('AC-9: dispatchReview verifies the existing branch, runs worktree add with no -b before any write, projects settings, and aborts typed on git failure', () => {
  const { input } = makeFixture()
  const order: string[] = []
  const gitCalls: { args: readonly string[]; cwd: string }[] = []
  api.dispatchReview(input, {
    gitFn: (args, options) => {
      order.push(`git:${args[0]}`)
      return stubGitOk(gitCalls)(args, options)
    },
    writeKickstarterFn: (path, contents) => {
      order.push('kickstarter-write')
      writeFileSync(path, contents, 'utf8')
    },
  })
  assert.deepEqual(
    order,
    ['git:rev-parse', 'git:worktree', 'kickstarter-write'],
    'branch verify + worktree add precede every write',
  )
  assert.deepEqual(gitCalls[0]?.args, [
    'rev-parse',
    '--verify',
    '--quiet',
    'refs/heads/feat/foreman-line-TEST-P9',
  ])
  assert.deepEqual(gitCalls[1]?.args, [
    'worktree',
    'add',
    input.worktreePath,
    'feat/foreman-line-TEST-P9',
  ])
  assert.ok(!gitCalls[1]?.args.includes('-b'), 'no -b: the branch already exists')
  // Settings projected via the frozen emitter composition (AC-22 asserts
  // byte-equality against projectEnvelope(resolveProfile(...)) on real git).
  const settingsPath = join(input.worktreePath, '.claude', 'settings.local.json')
  assert.ok(existsSync(settingsPath), 'projected reviewer-readonly settings written')
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
    permissions: { deny: string[] }
  }
  assert.ok(settings.permissions.deny.length > 0, 'deny rules projected')

  // Missing branch: rev-parse fails → typed BRANCH_MISSING, nothing created.
  const missing = makeFixture()
  assert.throws(
    () =>
      api.dispatchReview(missing.input, {
        gitFn: (args) =>
          args[0] === 'rev-parse'
            ? { status: 1, stdout: '', stderr: 'unknown revision\n' }
            : { status: 0, stdout: '', stderr: '' },
      }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'BRANCH_MISSING',
  )
  assert.ok(!existsSync(missing.input.worktreePath), 'no worktree created')

  // Pre-existing path: typed WORKTREE_PATH_EXISTS before any git mutation.
  const clobber = makeFixture()
  mkdirSync(clobber.input.worktreePath, { recursive: true })
  assert.throws(
    () => api.dispatchReview(clobber.input, { gitFn: stubGitOk() }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'WORKTREE_PATH_EXISTS',
  )

  // Pre-existing settings (e.g. tracked on the branch): typed SETTINGS_EXISTS.
  const tracked = makeFixture()
  assert.throws(
    () =>
      api.dispatchReview(tracked.input, {
        gitFn: (args) => {
          if (args[0] === 'worktree') {
            const settingsDir = join(args[2] as string, '.claude')
            mkdirSync(settingsDir, { recursive: true })
            writeFileSync(join(settingsDir, 'settings.local.json'), '{}\n')
          }
          return { status: 0, stdout: '', stderr: '' }
        },
      }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'SETTINGS_EXISTS',
  )

  // Failing worktree add: typed failure carrying stderr, nothing written.
  const failing = makeFixture()
  const before = receiptFileCount(failing.repoRoot, failing.workflowId)
  assert.throws(
    () =>
      api.dispatchReview(failing.input, {
        gitFn: (args) =>
          args[0] === 'worktree'
            ? { status: 128, stdout: '', stderr: 'git exploded\n' }
            : { status: 0, stdout: '', stderr: '' },
      }),
    (err: unknown) =>
      err instanceof api.AdversarialError &&
      err.code === 'WORKTREE_DISPATCH_FAILED' &&
      err.message.includes('exited 128') &&
      err.message.includes('git exploded'),
  )
  assert.ok(!existsSync(failing.input.worktreePath), 'no kickstarter written')
  assert.equal(receiptFileCount(failing.repoRoot, failing.workflowId), before, 'no receipt written')

  // Missing gitFn: typed, never an implicit in-package spawn.
  const bare = makeFixture()
  assert.throws(
    () => api.dispatchReview(bare.input),
    (err: unknown) =>
      err instanceof api.AdversarialError && err.code === 'WORKTREE_DISPATCH_FAILED',
  )
})

// ─── AC-10: kickstarter written into the worktree ────────────────────────────

test('AC-10: on worktree-creation success the kickstarter is written inside the worktree; a forced write failure raises KICKSTARTER_WRITE_FAILED', () => {
  const { input } = makeFixture()
  const result = api.dispatchReview(input, { gitFn: stubGitOk() })
  assert.ok(result.kickstarterPath.startsWith(input.worktreePath), 'path is inside the worktree')
  assert.ok(existsSync(result.kickstarterPath))
  const written = readFileSync(result.kickstarterPath, 'utf8')
  assert.equal(written, api.generateReviewKickstarter(input))

  const failing = makeFixture()
  assert.throws(
    () =>
      api.dispatchReview(failing.input, {
        gitFn: stubGitOk(),
        writeKickstarterFn: () => {
          throw new Error('disk full')
        },
      }),
    (err: unknown) =>
      err instanceof api.AdversarialError &&
      err.code === 'KICKSTARTER_WRITE_FAILED' &&
      err.message.includes('disk full'),
  )
})

// ─── AC-11: review-dispatch sub-receipt ──────────────────────────────────────

test('AC-11: dispatchReview emits the review-dispatch Stage-D sub-receipt with the mandated shape and the chain passes validateChain', () => {
  const { repoRoot, workflowId, input } = makeFixture()
  const result = api.dispatchReview(input, { gitFn: stubGitOk() })
  const receipt = readReceipt(repoRoot, result.receiptLocator)
  assert.equal(receipt.kind, 'claim')
  assert.equal(receipt.stage, 'D')
  assert.equal(receipt.claimRef, 'review-dispatch')
  assert.equal(receipt.subjectKind, 'ReviewDispatch')
  assert.equal(receipt.signature, null)
  assert.equal(receipt.sequence, 1)
  assert.deepEqual(receipt.subject, {
    parcelRef: 'TEST-P9',
    worktreePath: input.worktreePath,
    branch: 'feat/foreman-line-TEST-P9',
    kickstarterPath: result.kickstarterPath,
    profile: 'reviewer-readonly',
    injectedSkills: ['code-review'],
  })
  const correlation = receipt.correlation as Record<string, unknown>
  assert.equal(correlation.workflowId, workflowId, 'correlation inherited from chain tip')
  const chain = collectChain(repoRoot, workflowId)
  const validation = validateChain(chain)
  assert.ok(validation.valid, `chain must validate: ${validation.errors.join('; ')}`)
})

// ─── AC-12: launch-command builder ───────────────────────────────────────────

test('AC-12: buildReviewerLaunchCommand returns claude/-p/cwd/env and bypass flags are unrepresentable', () => {
  const cmd = api.buildReviewerLaunchCommand('C:/wt/reviewer', 'C:/wt/reviewer/KICK.md')
  assert.equal(cmd.command, 'claude')
  assert.equal(cmd.cwd, 'C:/wt/reviewer')
  assert.equal(cmd.args[0], '-p')
  assert.ok((cmd.args[1] as string).includes('C:/wt/reviewer/KICK.md'), 'kickstarter reference')
  assert.ok(typeof cmd.env === 'object' && cmd.env !== null, 'explicit env carried (AC-28 details)')
  for (const arg of cmd.args) {
    assert.ok(!arg.includes('--dangerously-skip-permissions'))
    assert.ok(!arg.includes('bypassPermissions'))
  }
  // Hostile inputs cannot smuggle a bypass marker into the command.
  for (const hostile of [
    'C:/wt --dangerously-skip-permissions',
    'C:/wt/--permission-mode=bypassPermissions',
  ]) {
    assert.throws(
      () => api.buildReviewerLaunchCommand(hostile, 'C:/k.md'),
      (err: unknown) => err instanceof api.AdversarialError && err.code === 'LAUNCH_FAILED',
    )
    assert.throws(
      () => api.buildReviewerLaunchCommand('C:/wt', hostile),
      (err: unknown) => err instanceof api.AdversarialError && err.code === 'LAUNCH_FAILED',
    )
  }
})

// ─── AC-13: launchReviewer only via the injected seam ────────────────────────

test('AC-13: launchReviewer starts the process only through the injected spawnFn; a throwing or missing spawnFn is a typed LAUNCH_FAILED', () => {
  const cmd = api.buildReviewerLaunchCommand('C:/wt/reviewer', 'C:/wt/reviewer/KICK.md')
  const seen: unknown[] = []
  const deps = launchDeps({
    spawnFn: (command, args, options) => {
      seen.push([command, args, options])
      return { pid: 4242 }
    },
  })
  const result = api.launchReviewer(cmd, deps)
  assert.equal(result.pid, 4242)
  assert.deepEqual(seen[0], [
    'claude',
    cmd.args,
    { cwd: 'C:/wt/reviewer', env: cmd.env, stdoutPath: deps.stdoutPath },
  ])

  assert.throws(
    () =>
      api.launchReviewer(
        cmd,
        launchDeps({
          spawnFn: () => {
            throw new Error('ENOENT')
          },
        }),
      ),
    (err: unknown) =>
      err instanceof api.AdversarialError &&
      err.code === 'LAUNCH_FAILED' &&
      err.message.includes('ENOENT'),
  )
  // No implicit in-package spawner exists: absence is typed, not a real spawn.
  assert.throws(
    () => api.launchReviewer(cmd, launchDeps()),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'LAUNCH_FAILED',
  )
  // Missing stdoutPath / workflowId are typed too (AC-24 preconditions).
  const spawnFn: api.SpawnFn = () => ({ pid: 1 })
  assert.throws(
    () => api.launchReviewer(cmd, { spawnFn, workflowId: randomUUID() }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'LAUNCH_FAILED',
  )
  assert.throws(
    () => api.launchReviewer(cmd, { spawnFn, stdoutPath: 'C:/wt/out.txt' }),
    (err: unknown) => err instanceof api.AdversarialError && err.code === 'LAUNCH_FAILED',
  )
})

// ─── AC-14: stop-report emitter (contingency rung 2, never-silent) ───────────

test('AC-14: emitStopReport writes the reviewer-launch-stop-report sub-receipt and returns its locator', () => {
  const { repoRoot, workflowId } = makeFixture()
  const locator = api.emitStopReport(
    workflowId,
    'headless launch not viable on this host',
    repoRoot,
  )
  const receipt = readReceipt(repoRoot, locator)
  assert.equal(receipt.kind, 'claim')
  assert.equal(receipt.stage, 'D')
  assert.equal(receipt.claimRef, 'reviewer-launch-stop-report')
  assert.equal(receipt.subjectKind, 'ReviewerLaunchStopReport')
  assert.deepEqual(receipt.subject, {
    reason: 'headless launch not viable on this host',
    fallback: 'kickstarter+human-relay',
  })
  const chain = collectChain(repoRoot, workflowId)
  assert.ok(validateChain(chain).valid, 'stop-report chains via allocateSequence')
})
