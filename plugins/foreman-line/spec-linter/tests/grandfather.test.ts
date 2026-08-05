/**
 * CLOSE-P2: grandfather allowlist boundary tests.
 *
 * - Membership is pinned by SET EQUALITY on basenames and by the exact
 *   per-file field/value waiver pins (invariant pins, never byte pins —
 *   STANDING-CONSTRAINTS #12): silently adding, removing, or re-scoping an
 *   entry fails this suite.
 * - Waivers apply ONLY under the `done/` parent-directory signal (rework R1a)
 *   and ONLY for the pinned historical literal values (rework R1b).
 * - Waivers are class-scoped: a grandfathered file with any NON-waived
 *   violation still fails; a non-listed file gets full validation including
 *   the PROFILE_NAMES enum.
 * - data_classification (schematized here, W4-P5 ruling): optional; non-empty,
 *   non-whitespace-only string; empty/null rejected for every spec.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GRANDFATHER_ALLOWLIST, WAIVER_KINDS, waiversFor } from '../src/grandfather.js'
import { sampleSpecFrontmatter } from '../src/testing.js'
import { validateSpecFrontmatter } from '../src/validate.js'

// --- allowlist membership + value-pin invariants ------------------------------

const EXPECTED_MEMBERSHIP: Readonly<
  Record<string, readonly { kind: string; field: string; allowedValues: readonly unknown[] }[]>
> = {
  'P1-permission-profile-registry-schema.md': [
    { kind: 'permission-profile-legacy', field: 'permission_profile', allowedValues: [null] },
  ],
  'P2-dispatch-order-permission-profile-field.md': [
    { kind: 'permission-profile-legacy', field: 'permission_profile', allowedValues: [null] },
  ],
  'P3-dispatch-time-emitter.md': [
    { kind: 'permission-profile-legacy', field: 'permission_profile', allowedValues: [null] },
  ],
  'W0-P5-skill-injection-matrix-schema-validator.md': [
    { kind: 'permission-profile-legacy', field: 'permission_profile', allowedValues: [null] },
  ],
  'W4-P2-docspine-ci-hook.md': [
    { kind: 'permission-profile-legacy', field: 'permission_profile', allowedValues: ['builder'] },
  ],
  'SCAF-P4-exit-vehicle.md': [
    { kind: 'permission-profile-legacy', field: 'permission_profile', allowedValues: ['builder'] },
  ],
  'W1-P2-epic-story-projection.md': [
    { kind: 'routing-class-legacy', field: 'routing_class', allowedValues: ['standard'] },
  ],
  'W1-P3-human-approval-flow.md': [
    { kind: 'routing-class-legacy', field: 'routing_class', allowedValues: ['standard'] },
  ],
}

test('allowlist contains exactly the 8 expected basenames (set equality)', () => {
  const actual = new Set(Object.keys(GRANDFATHER_ALLOWLIST))
  const expected = new Set(Object.keys(EXPECTED_MEMBERSHIP))
  assert.deepEqual(actual, expected)
})

test('each grandfathered basename maps to exactly its inventoried, value-pinned waiver(s)', () => {
  for (const [name, expected] of Object.entries(EXPECTED_MEMBERSHIP)) {
    const actual = waiversFor(name).map((w) => ({
      kind: w.kind,
      field: w.field,
      allowedValues: [...w.allowedValues],
    }))
    assert.deepEqual(actual, expected, name)
  }
})

test('exactly two waiver kinds exist', () => {
  assert.deepEqual([...WAIVER_KINDS].sort(), ['permission-profile-legacy', 'routing-class-legacy'])
})

test('a basename not on the allowlist has no waivers', () => {
  assert.deepEqual([...waiversFor('CLOSE-P99-not-a-real-spec.md')], [])
})

// --- helpers -------------------------------------------------------------------

function doc(overrides: Record<string, unknown>): Record<string, unknown> {
  const base: Record<string, unknown> = { ...sampleSpecFrontmatter }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete base[key]
    } else {
      base[key] = value
    }
  }
  return base
}

const IN_DONE = { parentDirName: 'done' } as const

// --- non-grandfathered files: full validation ------------------------------------

test("NEW (non-allowlisted) filename with permission_profile: 'builder' is invalid", () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), {
    basename: 'CLOSE-P99-new-spec.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

test('NEW (non-allowlisted) filename with permission_profile: null is invalid', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: null }), {
    basename: 'CLOSE-P99-new-spec.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

test('no basename supplied -> full validation (waivers require an explicit basename)', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), IN_DONE)
  assert.equal(result.valid, false)
})

// --- R1a: done/ parent-directory scoping (reviewer probe 1) ----------------------

test('R1a regression: grandfathered basename OUTSIDE done/ (scratch dir) gets no waiver', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), {
    basename: 'P1-permission-profile-registry-schema.md',
    parentDirName: 'scratch',
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

test('R1a regression: grandfathered basename in active/ gets no waiver', () => {
  const result = validateSpecFrontmatter(doc({ routing_class: 'standard' }), {
    basename: 'W1-P2-epic-story-projection.md',
    parentDirName: 'active',
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/routing_class')))
})

test('R1a: no parentDirName supplied -> no waiver (unit-level calls never waive without the signal)', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), {
    basename: 'SCAF-P4-exit-vehicle.md',
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

// --- R1b: value pinning (reviewer probe 2) ---------------------------------------

test('R1b regression: grandfathered file with a NON-historical value is invalid', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'totally-made-up-profile' }), {
    basename: 'SCAF-P4-exit-vehicle.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

test("R1b: null-pinned file (P1) does NOT get the 'builder' value waived", () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), {
    basename: 'P1-permission-profile-registry-schema.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

test('R1b: builder-pinned file (SCAF-P4) does NOT get the null value waived', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: null }), {
    basename: 'SCAF-P4-exit-vehicle.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

test("R1b: routing-class waiver covers exactly 'standard', not other invalid values", () => {
  const result = validateSpecFrontmatter(doc({ routing_class: 'totally-made-up-class' }), {
    basename: 'W1-P2-epic-story-projection.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/routing_class')))
})

// --- waiver happy paths (done/ + historical value) --------------------------------

test('grandfathered basename in done/: pinned null profile -> valid, grandfathered warning', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: null }), {
    basename: 'P1-permission-profile-registry-schema.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, true, JSON.stringify(result.errors))
  assert.ok(result.warnings.some((w) => w.startsWith('grandfathered (permission-profile-legacy):')))
})

test("grandfathered basename in done/: pinned 'builder' profile -> valid, grandfathered warning", () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), {
    basename: 'SCAF-P4-exit-vehicle.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, true, JSON.stringify(result.errors))
  assert.ok(result.warnings.some((w) => w.startsWith('grandfathered (permission-profile-legacy):')))
})

test("grandfathered basename in done/: pinned routing_class 'standard' -> valid, grandfathered warning", () => {
  const result = validateSpecFrontmatter(doc({ routing_class: 'standard' }), {
    basename: 'W1-P2-epic-story-projection.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, true, JSON.stringify(result.errors))
  assert.ok(result.warnings.some((w) => w.startsWith('grandfathered (routing-class-legacy):')))
})

// --- class scoping ----------------------------------------------------------------

test('grandfathered basename with a NON-waived violation (missing risk) still fails', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder', risk: undefined }), {
    basename: 'SCAF-P4-exit-vehicle.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('risk')))
})

test('waiver kinds do not cross: permission-profile-legacy file gets no routing_class waiver', () => {
  const result = validateSpecFrontmatter(doc({ routing_class: 'standard' }), {
    basename: 'SCAF-P4-exit-vehicle.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/routing_class')))
})

test('routing-class-legacy file gets no permission_profile waiver', () => {
  const result = validateSpecFrontmatter(doc({ permission_profile: 'builder' }), {
    basename: 'W1-P2-epic-story-projection.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/permission_profile')))
})

// --- data_classification (AC5) ------------------------------------------------------

test("data_classification: 'internal' is accepted", () => {
  const result = validateSpecFrontmatter(doc({ data_classification: 'internal' }))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('data_classification absent validates trivially', () => {
  const result = validateSpecFrontmatter(doc({ data_classification: undefined }))
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test("data_classification: '' is rejected", () => {
  const result = validateSpecFrontmatter(doc({ data_classification: '' }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/data_classification')))
})

test('data_classification: null is rejected', () => {
  const result = validateSpecFrontmatter(doc({ data_classification: null }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/data_classification')))
})

test('data_classification: whitespace-only is rejected', () => {
  const result = validateSpecFrontmatter(doc({ data_classification: '   ' }))
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/data_classification')))
})

test('data_classification rejection is NOT grandfatherable (no waiver kind reaches it)', () => {
  const result = validateSpecFrontmatter(doc({ data_classification: '' }), {
    basename: 'SCAF-P4-exit-vehicle.md',
    ...IN_DONE,
  })
  assert.equal(result.valid, false)
})
