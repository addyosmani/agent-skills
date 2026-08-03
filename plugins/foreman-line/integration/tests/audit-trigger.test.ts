/**
 * W4-P3 — risk-driven audit-trigger engine (pure functions).
 *
 * Coverage:
 *   AC2:  deriveRisk — §6 categories (a)security (b)infra+supply-chain
 *         (c)supply-chain (d)egress heuristic, plus benign→'low'.
 *   AC3:  evaluateAuditTrigger — decision = max(declared,derived); triggered =
 *         decision >= 'elevated'. declared>derived, declared<derived, equal.
 *   AC4:  drift = declared < derived, INDEPENDENT of triggered.
 *   AC7:  toAuditTriggerEvaluation projects EXACTLY { triggered, reason? };
 *         triggered never true merely from drift; frozen-contract key guard.
 *   AC11: engine mints no correlationId (source scan + projection shape).
 *
 * Fully hermetic: pure functions over literal fixtures; no I/O, git, or network.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import {
  type AuditTriggerDecision,
  deriveRisk,
  evaluateAuditTrigger,
  toAuditTriggerEvaluation,
} from '../src/audit-trigger.js'

// ── AC2: derived-risk mapping (§6) ───────────────────────────────────────────

test('AC2a: auth/authz/secrets/tenancy/session/crypto paths → security / elevated', () => {
  for (const p of [
    'plugins/foreman-line/contracts/src/auth/index.ts',
    'src/authz/policy.ts',
    'app/secrets/vault.ts',
    'services/tenancy/isolation.ts',
    'web/session/store.ts',
    'lib/crypto/aes.ts',
  ]) {
    const { derivedRisk, reasons } = deriveRisk([p])
    assert.equal(derivedRisk, 'elevated', `expected elevated for ${p}`)
    assert.ok(
      reasons.some((r) => r.includes('security')),
      `expected a security reason for ${p}; got ${reasons.join(' | ')}`,
    )
  }
})

test('AC2b: IaC / Dockerfiles / CI-workflow files → infra+supply-chain / elevated', () => {
  for (const p of [
    'infra/main.tf',
    'infra/prod.tfvars',
    'Pulumi.yaml',
    'Dockerfile',
    'ops/api.dockerfile',
    '.github/workflows/ci.yml',
  ]) {
    const { derivedRisk, reasons } = deriveRisk([p])
    assert.equal(derivedRisk, 'elevated', `expected elevated for ${p}`)
    assert.ok(
      reasons.some((r) => r.includes('infra+supply-chain')),
      `expected an infra reason for ${p}; got ${reasons.join(' | ')}`,
    )
  }
})

test('AC2c: lockfile / dependency-manifest changes → supply-chain / elevated', () => {
  for (const p of [
    'package-lock.json',
    'pnpm-lock.yaml',
    'Cargo.toml',
    'go.sum',
    'requirements.txt',
  ]) {
    const { derivedRisk, reasons } = deriveRisk([p])
    assert.equal(derivedRisk, 'elevated', `expected elevated for ${p}`)
    assert.ok(
      reasons.some((r) => r.includes('supply-chain')),
      `expected a supply-chain reason for ${p}; got ${reasons.join(' | ')}`,
    )
  }
})

test('AC2d: new-endpoint / egress heuristic → security+compliance / elevated, with stated limitation', () => {
  for (const p of ['src/webhooks/github.ts', 'services/egress/proxy.ts', 'lib/http-client.ts']) {
    const { derivedRisk, reasons } = deriveRisk([p])
    assert.equal(derivedRisk, 'elevated', `expected elevated for ${p}`)
    const egress = reasons.find((r) => r.includes('security+compliance'))
    assert.ok(
      egress !== undefined,
      `expected an egress reason for ${p}; got ${reasons.join(' | ')}`,
    )
    assert.ok(
      egress.includes('heuristic') && egress.includes('W4-FUP-AUDIT'),
      `egress reason must state the path-heuristic limitation + deferral; got ${egress}`,
    )
  }
})

test('AC2a (RA-1/RB-1): camelCase / concatenated security names → security / elevated', () => {
  // The dangerous false-negative direction: keyword-as-substring-within-segment,
  // not delimiter-anchored. These all read as `low` before the fix.
  for (const p of [
    'src/AuthService.ts',
    'src/authMiddleware.ts',
    'lib/sessionManager.ts',
    'util/cryptoHelper.ts',
    'api/tokenStore.ts',
    'src/oauth/callback.ts',
    'api/jwt/verify.ts',
    'config/password-policy.ts',
    'src/apikey/rotate.ts',
    'lib/keystore.ts',
  ]) {
    const { derivedRisk, reasons } = deriveRisk([p])
    assert.equal(derivedRisk, 'elevated', `expected elevated for ${p}`)
    assert.ok(
      reasons.some((r) => r.includes('security')),
      `expected a security reason for ${p}; got ${reasons.join(' | ')}`,
    )
  }
})

test('AC2a (RA-1/RB-1): bare `key` does NOT over-match monkey/keyboard', () => {
  for (const p of ['src/monkey.ts', 'ui/keyboard.ts', 'lib/whiskey.ts']) {
    assert.equal(deriveRisk([p]).derivedRisk, 'low', `expected low for ${p}`)
  }
  // Delimiter-bounded / segment `key` forms DO match.
  for (const p of ['config/signing-key.ts', 'src/key/rotate.ts', 'lib/api_key.ts']) {
    assert.equal(deriveRisk([p]).derivedRisk, 'elevated', `expected elevated for ${p}`)
  }
})

test('AC2b (RA-1/RB-1): Dockerfile variant forms → infra+supply-chain / elevated', () => {
  for (const p of [
    'Dockerfile.prod',
    'ops/Dockerfile.dev',
    'api.dockerfile',
    'build/web.dockerfile',
  ]) {
    const { derivedRisk, reasons } = deriveRisk([p])
    assert.equal(derivedRisk, 'elevated', `expected elevated for ${p}`)
    assert.ok(
      reasons.some((r) => r.includes('infra+supply-chain')),
      `infra reason expected for ${p}`,
    )
  }
})

test('AC2: a benign path set → low with no reasons', () => {
  const { derivedRisk, reasons } = deriveRisk(['docs/notes.md', 'src/format-date.ts', 'README.md'])
  assert.equal(derivedRisk, 'low')
  assert.equal(reasons.length, 0)
})

// ── AC3: max(declared,derived) + triggered ───────────────────────────────────

const BENIGN = ['docs/notes.md'] // derived = low
const SECURITY = ['src/auth/login.ts'] // derived = elevated

test('AC3: declared > derived — max is declared, triggered by decision', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'critical', changedPaths: BENIGN })
  assert.equal(d.derivedRisk, 'low')
  assert.equal(d.decision, 'critical')
  assert.equal(d.triggered, true)
})

test('AC3: declared < derived — max is derived', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'low', changedPaths: SECURITY })
  assert.equal(d.derivedRisk, 'elevated')
  assert.equal(d.decision, 'elevated')
  assert.equal(d.triggered, true)
})

test('AC3: declared === derived (both elevated) — decision elevated, triggered', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'elevated', changedPaths: SECURITY })
  assert.equal(d.decision, 'elevated')
  assert.equal(d.triggered, true)
})

test('AC3: decision below elevated → not triggered', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'standard', changedPaths: BENIGN })
  assert.equal(d.decision, 'standard')
  assert.equal(d.triggered, false)
})

// ── AC4: drift is independent of triggered ───────────────────────────────────

test('AC4: declared low + derived elevated → drift:true, triggered:true', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'low', changedPaths: SECURITY })
  assert.equal(d.drift, true)
  assert.equal(d.triggered, true)
})

test('AC4: declared critical + derived low → drift:false, triggered:true', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'critical', changedPaths: BENIGN })
  assert.equal(d.drift, false)
  assert.equal(d.triggered, true)
})

test('AC4: declared standard + derived low → drift:false, triggered:false', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'standard', changedPaths: BENIGN })
  assert.equal(d.drift, false)
  assert.equal(d.triggered, false)
})

// ── AC7: projection to the frozen contract ───────────────────────────────────

test('AC7(i): drift + decision>=elevated → {triggered:true, reason contains spec-drift}', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'low', changedPaths: SECURITY })
  const projected = toAuditTriggerEvaluation(d)
  assert.equal(projected.triggered, true)
  assert.ok(projected.reason?.includes('spec-drift'))
  assert.ok(projected.reason?.includes('security'))
})

test('AC7(ii): decision<elevated, no drift → {triggered:false}, no drift wording, no reason key', () => {
  const d = evaluateAuditTrigger({ declaredRisk: 'standard', changedPaths: BENIGN })
  const projected = toAuditTriggerEvaluation(d)
  assert.equal(projected.triggered, false)
  assert.equal('reason' in projected, false)
  assert.equal(JSON.stringify(projected).includes('spec-drift'), false)
})

test('AC7(iii): projected object has NO key beyond triggered/reason (frozen-contract guard)', () => {
  const triggeredOnly = toAuditTriggerEvaluation(
    evaluateAuditTrigger({ declaredRisk: 'standard', changedPaths: BENIGN }),
  )
  assert.deepEqual(Object.keys(triggeredOnly), ['triggered'])

  const withReason = toAuditTriggerEvaluation(
    evaluateAuditTrigger({ declaredRisk: 'low', changedPaths: SECURITY }),
  )
  const allowed = new Set(['triggered', 'reason'])
  assert.ok(Object.keys(withReason).every((k) => allowed.has(k)))
  // No engine-internal key ever leaks onto the receipt.
  for (const forbidden of ['drift', 'decision', 'declaredRisk', 'derivedRisk', 'governingSpec']) {
    assert.equal(forbidden in withReason, false, `forbidden key '${forbidden}' leaked`)
  }
})

// ── AC11: engine mints no correlationId ──────────────────────────────────────

test('AC11: engine/report sources never mint a correlationId (source scan + projection shape)', () => {
  for (const file of ['audit-trigger.ts', 'governing-spec.ts', 'report.ts']) {
    const src = readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8')
    assert.equal(/randomUUID/.test(src), false, `${file} must not import/use randomUUID`)
    assert.equal(
      /correlationId\s*:/.test(src),
      false,
      `${file} must not construct a correlationId field`,
    )
  }
  const decision: AuditTriggerDecision = evaluateAuditTrigger({
    declaredRisk: 'low',
    changedPaths: SECURITY,
  })
  assert.equal('correlation' in decision, false)
  const projected = toAuditTriggerEvaluation(decision)
  assert.equal(JSON.stringify(projected).includes('correlation'), false)
})
