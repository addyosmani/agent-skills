/**
 * W4-P3 — PR → governing-spec resolution (PR4-6) and the local path matcher.
 *
 * Coverage:
 *   AC5: resolveGoverningSpec — (a) single match, (b) no match (+ no-spec diff
 *        on an elevated-derived surface → triggered+drift via evaluateChangeSet),
 *        (c) multi-match (declaredRisk = max), and draft/done never govern.
 *   AC6: matchesSurface — exact, directory-prefix, glob (**), single-segment
 *        glob (*), plus non-matches; and no new runtime dependency.
 *
 * Hermetic: descriptors injected directly; the disk loader seam is never run.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  type ActiveSpecDescriptor,
  evaluateChangeSet,
  matchesSurface,
  resolveGoverningSpec,
} from '../src/governing-spec.js'

const INTEGRATION_SPEC: ActiveSpecDescriptor = {
  path: 'plugins/foreman-line/docs/specs/active/W4-P3-risk-driven-audit-triggers.md',
  risk: 'elevated',
  surfaces: ['plugins/foreman-line/integration/', '.github/workflows/foreman-line-ci.yml'],
  status: 'active',
}

// ── AC5: governing-spec resolution ───────────────────────────────────────────

test('AC5a: single match → declaredRisk = spec.risk, governingSpec = spec.path', () => {
  const r = resolveGoverningSpec(
    ['plugins/foreman-line/integration/src/report.ts'],
    [INTEGRATION_SPEC],
  )
  assert.equal(r.declaredRisk, 'elevated')
  assert.equal(r.governingSpec, INTEGRATION_SPEC.path)
  assert.deepEqual(r.reasons, [])
})

test('AC5b: no match → governingSpec null, declaredRisk low, no-governing-spec reason', () => {
  const r = resolveGoverningSpec(['some/unrelated/module.ts'], [INTEGRATION_SPEC])
  assert.equal(r.governingSpec, null)
  assert.equal(r.declaredRisk, 'low')
  assert.ok(r.reasons.includes('no-governing-spec'))
})

test('AC5b: no-spec diff on an elevated-derived surface → triggered:true + drift:true', () => {
  // A security-domain diff with NO governing spec: declared floors to low,
  // derived is elevated → the safe default (audit runs + drift surfaced).
  const d = evaluateChangeSet(['services/auth/login.ts'], [INTEGRATION_SPEC])
  assert.equal(d.governingSpec, null)
  assert.equal(d.declaredRisk, 'low')
  assert.equal(d.derivedRisk, 'elevated')
  assert.equal(d.triggered, true)
  assert.equal(d.drift, true)
  assert.ok(d.reasons.includes('no-governing-spec'))
})

test('AC5c: multi-match → declaredRisk = max(risk), multi-spec reason', () => {
  const specA: ActiveSpecDescriptor = {
    path: 'plugins/foreman-line/docs/specs/active/A.md',
    risk: 'standard',
    surfaces: ['plugins/foreman-line/integration/'],
    status: 'active',
  }
  const specB: ActiveSpecDescriptor = {
    path: 'plugins/foreman-line/docs/specs/active/B.md',
    risk: 'critical',
    surfaces: ['plugins/foreman-line/integration/src/'],
    status: 'active',
  }
  const r = resolveGoverningSpec(
    ['plugins/foreman-line/integration/src/audit-trigger.ts'],
    [specA, specB],
  )
  assert.equal(r.declaredRisk, 'critical')
  // RA-2/RB-3: governingSpec must be the spec that supplied the max risk
  // (specB), not the first match (specA) — the name agrees with declaredRisk.
  assert.equal(r.governingSpec, specB.path)
  const multi = r.reasons.find((reason) => reason.startsWith('multi-spec:'))
  assert.ok(multi !== undefined)
  assert.ok(multi.includes(specA.path) && multi.includes(specB.path), 'multi-spec lists both')
})

test('AC5: a draft and a done descriptor never govern', () => {
  const draft: ActiveSpecDescriptor = {
    path: 'plugins/foreman-line/docs/specs/active/DRAFT.md',
    risk: 'critical',
    surfaces: ['plugins/foreman-line/integration/'],
    status: 'draft',
  }
  const done: ActiveSpecDescriptor = {
    path: 'plugins/foreman-line/docs/specs/done/DONE.md',
    risk: 'critical',
    surfaces: ['plugins/foreman-line/integration/'],
    status: 'done',
  }
  const r = resolveGoverningSpec(['plugins/foreman-line/integration/src/report.ts'], [draft, done])
  assert.equal(r.governingSpec, null)
  assert.equal(r.declaredRisk, 'low')
  assert.ok(r.reasons.includes('no-governing-spec'))
})

// ── AC6: path-matcher semantics ──────────────────────────────────────────────

test('AC6: exact match and non-match', () => {
  assert.equal(
    matchesSurface(
      '.github/workflows/foreman-line-ci.yml',
      '.github/workflows/foreman-line-ci.yml',
    ),
    true,
  )
  assert.equal(
    matchesSurface('.github/workflows/foreman-line-ci.yml', '.github/workflows/other.yml'),
    false,
  )
  assert.equal(matchesSurface('src/index.ts', 'src/index.tsx'), false)
})

test('AC6: directory-prefix (surface ends with /) covers a nested file; non-match outside', () => {
  assert.equal(
    matchesSurface(
      'plugins/foreman-line/integration/',
      'plugins/foreman-line/integration/src/report.ts',
    ),
    true,
  )
  assert.equal(
    matchesSurface('plugins/foreman-line/integration/', 'plugins/foreman-line/contracts/src/x.ts'),
    false,
  )
})

test('AC6: glob ** covers a nested .ts; * stays within a single segment', () => {
  assert.equal(
    matchesSurface(
      'plugins/foreman-line/verification/**',
      'plugins/foreman-line/verification/src/harness/index.ts',
    ),
    true,
  )
  assert.equal(matchesSurface('src/*.ts', 'src/report.ts'), true)
  assert.equal(matchesSurface('src/*.ts', 'src/nested/report.ts'), false)
  assert.equal(
    matchesSurface('plugins/foreman-line/verification/**', 'plugins/foreman-line/contracts/x.ts'),
    false,
  )
})

test('AC6: no new runtime dependency is introduced (package.json has no dependencies)', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  assert.equal(pkg.dependencies === undefined || Object.keys(pkg.dependencies).length === 0, true)
})
