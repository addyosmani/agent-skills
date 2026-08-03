/**
 * W4-P4 AC14-AC15 — GitHub gate assembly (pure composition + data-only diff).
 *
 * AC14: composeRequiredChecks promotes only the blocking candidates; report-only
 *       checks are NOT promoted; requirePullRequest + requireHumanReview:true +
 *       a non-empty rationale.
 * AC15: buildBranchProtectionDiff returns {applied:false, currentPosture,
 *       desiredRuleset, diff, humanChecklist}; currentPosture equals
 *       verifyBranchProtectionPosture(current, identity); a binding current
 *       yields a matching posture + a promotion diff/checklist. It applies
 *       nothing and calls no mutating GitHub API.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CandidateCheck, EffectiveRulesResponse } from '../src/index.js'
import {
  buildBranchProtectionDiff,
  composeRequiredChecks,
  verifyBranchProtectionPosture,
} from '../src/index.js'

const CANDIDATES: readonly CandidateCheck[] = [
  { name: 'plugins / test', owningWorkflow: 'plugins.yml', blocking: true },
  { name: 'foreman-line / report', owningWorkflow: 'foreman-line-ci.yml', blocking: false },
  { name: 'CodeQL / Analyze', owningWorkflow: 'codeql.yml', blocking: true },
]

const IDENTITY = 'coordinator-bot'

// ─── AC14: composeRequiredChecks — pure composition ──────────────────────────

test('AC14: composeRequiredChecks promotes only blocking checks; report-only is NOT promoted', () => {
  const composition = composeRequiredChecks(CANDIDATES)
  assert.deepEqual(composition.requiredChecks, ['plugins / test', 'CodeQL / Analyze'])
  assert.equal(composition.requiredChecks.includes('foreman-line / report'), false)
  assert.equal(composition.requirePullRequest, true)
  assert.equal(composition.requireHumanReview, true)
  assert.ok(composition.rationale.length > 0)
  assert.ok(composition.rationale.some((r) => r.includes('report-only')))
})

test('AC14: composeRequiredChecks with no blocking candidates yields an empty required set', () => {
  const composition = composeRequiredChecks([
    { name: 'foreman-line / report', owningWorkflow: 'foreman-line-ci.yml', blocking: false },
  ])
  assert.deepEqual(composition.requiredChecks, [])
  assert.equal(composition.requireHumanReview, true)
})

// ─── AC15: buildBranchProtectionDiff — data artifact, never applied ──────────

test('AC15: buildBranchProtectionDiff returns applied:false with a posture equal to verifyBranchProtectionPosture', () => {
  // A current posture with NO rules bound and a bypass actor: canMerge:true (a FAIL).
  const current: EffectiveRulesResponse = {
    rules: [],
    bypassActors: [{ actorId: IDENTITY, bypassMode: 'always' }],
  }
  const desired = composeRequiredChecks(CANDIDATES)
  const diff = buildBranchProtectionDiff(current, desired, IDENTITY)

  assert.equal(diff.applied, false)
  assert.deepEqual(diff.currentPosture, verifyBranchProtectionPosture(current, IDENTITY))
  assert.equal(diff.currentPosture.canMerge, true)
  assert.ok(diff.diff.some((d) => d.includes('pull_request')))
  assert.ok(diff.diff.some((d) => d.includes('required_status_checks')))
  assert.ok(diff.diff.some((d) => d.includes('bypass')))
  assert.ok(diff.humanChecklist.length >= 3)
  assert.ok(diff.humanChecklist.some((step) => step.toLowerCase().includes('human')))
})

test('AC15: a current that binds the identity yields canMerge:false and a promotion diff', () => {
  // A ruleset that binds the identity (require-PR + required-checks, no bypass).
  const current: EffectiveRulesResponse = {
    rules: [{ ruleType: 'pull_request' }, { ruleType: 'required_status_checks' }],
    bypassActors: [],
  }
  const desired = composeRequiredChecks(CANDIDATES)
  const diff = buildBranchProtectionDiff(current, desired, IDENTITY)

  assert.equal(diff.applied, false)
  assert.equal(diff.currentPosture.canMerge, false)
  // The rules exist but the report-only checks still need promotion.
  assert.ok(diff.diff.some((d) => d.includes('promote')))
  // The desiredRuleset is data, carrying the required checks.
  const ruleset = diff.desiredRuleset as {
    rules: { required_status_checks: { checks: string[] } }
  }
  assert.deepEqual(ruleset.rules.required_status_checks.checks, [
    'plugins / test',
    'CodeQL / Analyze',
  ])
})
