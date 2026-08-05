/**
 * W4-P1 AC9 — PR-automation planner.
 *
 * Hermetic: no test shells out to real `git`/`gh`. Every test injects both
 * `gitPushFn` and `ghPrCreateFn` as mocks.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { GhPrCreateArgs, GhPrCreateResult, GitPushArgs, GitPushResult } from '../src/index.js'
import { buildPrAutomationPlan, IntegrationError, planPrAutomation } from '../src/index.js'

test('buildPrAutomationPlan assembles a pure plan from inputs (no side effects)', () => {
  const plan = buildPrAutomationPlan({
    branch: 'feat/foo',
    base: 'main',
    title: 'feat: foo',
    prBody: 'body text',
    repoRoot: '/repo',
  })
  assert.deepEqual(plan, {
    branch: 'feat/foo',
    base: 'main',
    title: 'feat: foo',
    prBody: 'body text',
    operations: [
      { op: 'git-push', description: "push 'feat/foo' to origin" },
      { op: 'gh-pr-create', description: "open a PR 'feat/foo' -> 'main'" },
    ],
  })
})

test('buildPrAutomationPlan throws IntegrationError PLAN_INVALID on empty branch/base/title', () => {
  for (const bad of [
    { branch: '', base: 'main', title: 't', prBody: '', repoRoot: '/repo' },
    { branch: 'b', base: '   ', title: 't', prBody: '', repoRoot: '/repo' },
    { branch: 'b', base: 'main', title: '', prBody: '', repoRoot: '/repo' },
  ]) {
    assert.throws(
      () => buildPrAutomationPlan(bad),
      (err: unknown) => {
        assert.ok(err instanceof IntegrationError)
        assert.equal(err.code, 'PLAN_INVALID')
        return true
      },
    )
  }
})

test('planPrAutomation assembles the plan and invokes the injected git/gh seams with expected args', () => {
  const gitCalls: GitPushArgs[] = []
  const ghCalls: GhPrCreateArgs[] = []

  const gitPushFn = (args: GitPushArgs): GitPushResult => {
    gitCalls.push(args)
    return { code: 0, stdout: 'pushed', stderr: '' }
  }
  const ghPrCreateFn = (args: GhPrCreateArgs): GhPrCreateResult => {
    ghCalls.push(args)
    return { code: 0, stdout: 'https://github.com/example/pr/1', stderr: '' }
  }

  const result = planPrAutomation(
    {
      branch: 'feat/bar',
      base: 'main',
      title: 'feat: bar',
      prBody: 'the body',
      repoRoot: '/repo/root',
    },
    { gitPushFn, ghPrCreateFn },
  )

  assert.equal(result.plan.branch, 'feat/bar')
  assert.equal(result.plan.operations.length, 2)
  assert.equal(result.gitPushResult.code, 0)
  assert.equal(result.ghPrCreateResult.code, 0)

  assert.deepEqual(gitCalls, [{ branch: 'feat/bar', repoRoot: '/repo/root' }])
  assert.deepEqual(ghCalls, [
    {
      branch: 'feat/bar',
      base: 'main',
      title: 'feat: bar',
      prBody: 'the body',
      repoRoot: '/repo/root',
    },
  ])
})

test('planPrAutomation never shells out when both seams are injected — no real git/gh dependency', () => {
  // If this test relied on real git/gh it would fail in a hermetic sandbox
  // with no network/git remote. Supplying both seams proves isolation.
  const result = planPrAutomation(
    { branch: 'feat/baz', base: 'develop', title: 't', prBody: 'b', repoRoot: '/nonexistent/repo' },
    {
      gitPushFn: () => ({ code: 0, stdout: '', stderr: '' }),
      ghPrCreateFn: () => ({ code: 0, stdout: '', stderr: '' }),
    },
  )
  assert.equal(result.plan.base, 'develop')
})
