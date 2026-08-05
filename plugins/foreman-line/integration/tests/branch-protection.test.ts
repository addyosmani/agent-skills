/**
 * W4-P1 AC8 — branch-protection posture verifier.
 *
 * Read-only assertion over an injected effective-rules payload (coordinator
 * ruling Q3). No test performs a network call or touches the live
 * `fetchEffectiveRulesLive` seam.
 *
 * Posture semantics: `canMerge: false` (empty reasons) is the DESIRED/OK
 * posture — the identity is correctly blocked from merging. `canMerge: true`
 * is a posture FAIL.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { EffectiveRulesResponse } from '../src/index.js'
import { verifyBranchProtectionPosture } from '../src/index.js'

const IDENTITY = 'foreman-line-coordinator'

test('AC8a: a binding ruleset (require-PR + required-checks, no bypass) -> cannot merge (posture OK)', () => {
  const effectiveRules: EffectiveRulesResponse = {
    rules: [{ ruleType: 'pull_request' }, { ruleType: 'required_status_checks' }],
    bypassActors: [],
  }
  const verdict = verifyBranchProtectionPosture(effectiveRules, IDENTITY)
  assert.equal(verdict.canMerge, false)
  assert.deepEqual(verdict.reasons, [])
})

test('AC8b: a bypass actor for the identity -> can merge (posture FAIL)', () => {
  const effectiveRules: EffectiveRulesResponse = {
    rules: [{ ruleType: 'pull_request' }, { ruleType: 'required_status_checks' }],
    bypassActors: [{ actorId: IDENTITY, bypassMode: 'always' }],
  }
  const verdict = verifyBranchProtectionPosture(effectiveRules, IDENTITY)
  assert.equal(verdict.canMerge, true)
  assert.ok(verdict.reasons.some((r) => r.includes('bypass actor')))
})

test('AC8b: missing require-PR rule -> can merge (posture FAIL)', () => {
  const effectiveRules: EffectiveRulesResponse = {
    rules: [{ ruleType: 'required_status_checks' }],
    bypassActors: [],
  }
  const verdict = verifyBranchProtectionPosture(effectiveRules, IDENTITY)
  assert.equal(verdict.canMerge, true)
  assert.ok(verdict.reasons.some((r) => r.includes('pull_request')))
})

test('a bypass actor for a DIFFERENT identity does not affect this identity posture', () => {
  const effectiveRules: EffectiveRulesResponse = {
    rules: [{ ruleType: 'pull_request' }, { ruleType: 'required_status_checks' }],
    bypassActors: [{ actorId: 'someone-else', bypassMode: 'always' }],
  }
  const verdict = verifyBranchProtectionPosture(effectiveRules, IDENTITY)
  assert.equal(verdict.canMerge, false)
})

test('a bypassMode of "none" for the identity does not count as a bypass', () => {
  const effectiveRules: EffectiveRulesResponse = {
    rules: [{ ruleType: 'pull_request' }, { ruleType: 'required_status_checks' }],
    bypassActors: [{ actorId: IDENTITY, bypassMode: 'none' }],
  }
  const verdict = verifyBranchProtectionPosture(effectiveRules, IDENTITY)
  assert.equal(verdict.canMerge, false)
})
