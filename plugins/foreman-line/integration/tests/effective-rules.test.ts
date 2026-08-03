/**
 * CLOSE-P1 ACs 1-2 — typed-closed effective-rules normalization.
 *
 *   AC1 (positive): `normalizeEffectiveRules` consumes the checked-in REAL
 *       captured branch-rules response (fixture with provenance header) and,
 *       composed with `normalizeRulesetBypass` over the REAL captured ruleset
 *       response, yields an `EffectiveRulesResponse` accepted by
 *       `verifyBranchProtectionPosture` WITHOUT a cast.
 *   AC2 (negatives, one test per invalid shape): each throws
 *       `EffectiveRulesNormalizationError`; none returns a defaulted/partial
 *       response.
 *
 * Hermetic: the fixture is a checked-in capture; no network/gh calls here.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  composeEffectiveRules,
  EffectiveRulesNormalizationError,
  normalizeEffectiveRules,
  normalizeRulesetBypass,
  verifyBranchProtectionPosture,
} from '../src/index.js'

const FIXTURE_PATH = join(import.meta.dirname, 'fixtures', 'effective-rules-live-capture.json')

interface LiveCaptureFixture {
  readonly provenance: { readonly capturedBy: string; readonly capturedAt: string }
  readonly branchRules: { readonly command: string; readonly capture: unknown }
  readonly rulesetBypass: { readonly command: string; readonly capture: unknown }
}

function loadFixture(): LiveCaptureFixture {
  return JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as LiveCaptureFixture
}

function assertNormalizationThrow(fn: () => unknown): void {
  assert.throws(fn, (err: unknown) => {
    assert.ok(err instanceof EffectiveRulesNormalizationError)
    assert.equal((err as Error).name, 'EffectiveRulesNormalizationError')
    return true
  })
}

// ─── AC1: positive over the REAL capture ────────────────────────────────────

test('AC1: fixture carries its provenance header (capture command + date + captor)', () => {
  const fixture = loadFixture()
  assert.equal(fixture.provenance.capturedBy, 'coordinator')
  assert.ok(fixture.provenance.capturedAt.startsWith('2026-07-28'))
  assert.ok(fixture.branchRules.command.includes('gh api'))
  assert.ok(fixture.branchRules.command.includes('/rules/branches/'))
  assert.ok(fixture.rulesetBypass.command.includes('/rulesets/'))
})

test('AC1: normalizeEffectiveRules over the real branch-rules capture maps every entry type -> ruleType', () => {
  const rules = normalizeEffectiveRules(loadFixture().branchRules.capture)
  assert.equal(rules.length, 8)
  const types = rules.map((rule) => rule.ruleType)
  assert.ok(types.includes('pull_request'))
  assert.ok(types.includes('non_fast_forward'))
  assert.ok(types.includes('deletion'))
  assert.ok(types.includes('code_scanning'))
})

test('AC1: normalizeRulesetBypass over the real ruleset capture yields the (empty) bypass list', () => {
  const bypassActors = normalizeRulesetBypass(loadFixture().rulesetBypass.capture)
  assert.deepEqual(bypassActors, [])
})

test('AC1: composed EffectiveRulesResponse is accepted by verifyBranchProtectionPosture without a cast', () => {
  const fixture = loadFixture()
  const response = composeEffectiveRules(
    normalizeEffectiveRules(fixture.branchRules.capture),
    normalizeRulesetBypass(fixture.rulesetBypass.capture),
  )
  // No cast anywhere on this path: composeEffectiveRules returns the domain
  // type and verifyBranchProtectionPosture consumes it directly.
  const verdict = verifyBranchProtectionPosture(response, 'some-identity')
  assert.equal(typeof verdict.canMerge, 'boolean')
  // The real capture carries a 'pull_request' rule, so that reason is absent.
  assert.ok(!verdict.reasons.some((reason) => reason.includes("'pull_request'")))
})

// ─── AC2: typed-closed negatives, one test per invalid shape ─────────────────

test('AC2: branch-rules — null input throws', () => {
  assertNormalizationThrow(() => normalizeEffectiveRules(null))
})

test('AC2: branch-rules — string input throws', () => {
  assertNormalizationThrow(() => normalizeEffectiveRules('[{"type":"deletion"}]'))
})

test('AC2: branch-rules — non-array object root throws', () => {
  assertNormalizationThrow(() => normalizeEffectiveRules({ rules: [] }))
})

test('AC2: branch-rules — non-object entry throws', () => {
  assertNormalizationThrow(() => normalizeEffectiveRules(['deletion']))
})

test('AC2: branch-rules — entry missing type throws (mutated real capture)', () => {
  const capture = loadFixture().branchRules.capture as Record<string, unknown>[]
  const mutated = capture.map((entry, index) => {
    if (index !== 0) return entry
    const { type: _dropped, ...rest } = entry
    return rest
  })
  assertNormalizationThrow(() => normalizeEffectiveRules(mutated))
})

test('AC2: branch-rules — entry with wrong-typed (non-string) type throws (mutated real capture)', () => {
  const capture = loadFixture().branchRules.capture as Record<string, unknown>[]
  const mutated = capture.map((entry, index) => (index === 0 ? { ...entry, type: 42 } : entry))
  assertNormalizationThrow(() => normalizeEffectiveRules(mutated))
})

test('AC2: branch-rules — entry with empty-string type throws', () => {
  assertNormalizationThrow(() => normalizeEffectiveRules([{ type: '' }]))
})

test('AC2: ruleset — array root throws', () => {
  assertNormalizationThrow(() => normalizeRulesetBypass([]))
})

test('AC2: ruleset — null input throws', () => {
  assertNormalizationThrow(() => normalizeRulesetBypass(null))
})

test('AC2: ruleset — missing bypass_actors throws (mutated real capture)', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  const { bypass_actors: _dropped, ...mutated } = capture
  assertNormalizationThrow(() => normalizeRulesetBypass(mutated))
})

test('AC2: ruleset — wrong-typed (non-array) bypass_actors throws (mutated real capture)', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() => normalizeRulesetBypass({ ...capture, bypass_actors: 'none' }))
})

test('AC2: ruleset — bypass entry that is not an object throws', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() => normalizeRulesetBypass({ ...capture, bypass_actors: [7] }))
})

test('AC2: ruleset — bypass entry with non-integer actor_id throws (fail-closed, incl. null)', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() =>
    normalizeRulesetBypass({
      ...capture,
      bypass_actors: [{ actor_id: null, actor_type: 'DeployKey', bypass_mode: 'always' }],
    }),
  )
})

test('AC2: ruleset — bypass entry with an unrecognized bypass_mode throws (never defaulted)', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() =>
    normalizeRulesetBypass({
      ...capture,
      bypass_actors: [{ actor_id: 5, actor_type: 'Team', bypass_mode: 'sometimes' }],
    }),
  )
})

test("AC2/R4: ruleset — bypass entry with actor_id 1e21 throws (would stringify as '1e+21', not decimal)", () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() =>
    normalizeRulesetBypass({
      ...capture,
      bypass_actors: [{ actor_id: 1e21, actor_type: 'Team', bypass_mode: 'always' }],
    }),
  )
})

test('AC2/R4: ruleset — bypass entry with negative actor_id throws', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() =>
    normalizeRulesetBypass({
      ...capture,
      bypass_actors: [{ actor_id: -5, actor_type: 'Team', bypass_mode: 'always' }],
    }),
  )
})

test('AC2/R4: ruleset — bypass entry with zero actor_id throws', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  assertNormalizationThrow(() =>
    normalizeRulesetBypass({
      ...capture,
      bypass_actors: [{ actor_id: 0, actor_type: 'Team', bypass_mode: 'always' }],
    }),
  )
})

test('AC2: ruleset — a valid bypass entry maps actor_id/bypass_mode to the domain shape', () => {
  const capture = loadFixture().rulesetBypass.capture as Record<string, unknown>
  const bypassActors = normalizeRulesetBypass({
    ...capture,
    bypass_actors: [{ actor_id: 5, actor_type: 'Team', bypass_mode: 'pull_request' }],
  })
  assert.deepEqual(bypassActors, [{ actorId: '5', bypassMode: 'pull_request' }])
})
