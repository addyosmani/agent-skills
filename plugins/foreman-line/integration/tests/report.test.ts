/**
 * W4-P3 — report-only entrypoint (RW4, PR4-7).
 *
 * Coverage (AC9): the report core, driven by injected changed-paths and
 * active-spec seams (fixtures), prints annotations reflecting decision /
 * triggered / drift and returns exitCode 0 — even when triggered and/or drift
 * are true. No network, no real git, no secrets.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ActiveSpecDescriptor } from '../src/governing-spec.js'
import { runReport } from '../src/report.js'

const GOVERNING: ActiveSpecDescriptor = {
  path: 'plugins/foreman-line/docs/specs/active/W4-P3-risk-driven-audit-triggers.md',
  risk: 'standard',
  surfaces: ['plugins/foreman-line/integration/'],
  status: 'active',
}

test('AC9: triggered + drift case — annotations reflect state, exit code 0', () => {
  const result = runReport({
    getChangedPaths: () => ['services/auth/login.ts'], // security → derived elevated
    loadActiveSpecs: () => [], // no governing spec → declared low
  })

  assert.equal(result.exitCode, 0)
  assert.ok(result.decision)
  assert.equal(result.decision.triggered, true)
  assert.equal(result.decision.drift, true)

  const summary = result.annotations[0] as string
  assert.ok(summary.startsWith('::warning::'), `expected a warning summary; got ${summary}`)
  assert.ok(summary.includes('decision=elevated'))
  assert.ok(summary.includes('triggered=true'))
  assert.ok(summary.includes('drift=true'))
  assert.ok(result.annotations.some((a) => a.includes('spec-drift')))
  assert.ok(result.annotations.some((a) => a.includes('no-governing-spec')))
})

test('AC9: benign case — not triggered, no drift, exit code 0, notice summary', () => {
  const result = runReport({
    getChangedPaths: () => ['docs/notes.md'],
    loadActiveSpecs: () => [GOVERNING],
  })

  assert.equal(result.exitCode, 0)
  assert.ok(result.decision)
  assert.equal(result.decision.triggered, false)
  assert.equal(result.decision.drift, false)

  const summary = result.annotations[0] as string
  assert.ok(summary.startsWith('::notice::'), `expected a notice summary; got ${summary}`)
  assert.ok(summary.includes('triggered=false'))
  assert.ok(summary.includes('drift=false'))
  assert.ok(result.annotations.some((a) => a.includes('governingSpec=')))
})

test('AC9: triggered without drift (declared already high) still exits 0', () => {
  const highSpec: ActiveSpecDescriptor = { ...GOVERNING, risk: 'critical' }
  const result = runReport({
    getChangedPaths: () => ['plugins/foreman-line/integration/src/report.ts'], // benign → derived low
    loadActiveSpecs: () => [highSpec],
  })

  assert.equal(result.exitCode, 0)
  assert.ok(result.decision)
  assert.equal(result.decision.triggered, true)
  assert.equal(result.decision.drift, false)
  assert.ok((result.annotations[0] as string).includes('decision=critical'))
})

test('AC9 (RA-3): a throwing changed-paths seam → warning + exit 0 (non-blocking)', () => {
  const result = runReport({
    getChangedPaths: () => {
      throw new Error('fatal: bad object BASE_SHA (shallow clone)')
    },
    loadActiveSpecs: () => [GOVERNING],
  })

  assert.equal(result.exitCode, 0)
  assert.equal(result.decision, null)
  const summary = result.annotations[0] as string
  assert.ok(summary.startsWith('::warning::'), `expected a warning; got ${summary}`)
  assert.ok(summary.includes('report skipped'))
  assert.ok(summary.includes('BASE_SHA'))
})
