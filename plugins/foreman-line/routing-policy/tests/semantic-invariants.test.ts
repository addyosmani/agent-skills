/**
 * AC5: four semantic-invariant test suites, each with a passing fixture (the
 * shipped v0 policy, which satisfies all four at once) and at least one
 * rejecting fixture. The security-override suite additionally covers the
 * Step 0-ratified derived name-guard, and the ceiling suite covers both
 * rejecting cases (missing / zero) per the Step 0 ruling.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { KNOWN_FRONTIER_MODELS, validatePolicy } from '../src/validator.js'

const here = dirname(fileURLToPath(import.meta.url))
const policyPath = join(here, '..', 'routing-policy.yaml')
const fixturesDir = join(here, 'fixtures')

function loadYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'))
}

const validPolicy = loadYaml(policyPath)

// a. Classification-gates-before-cost -----------------------------------------

test('classification-gates-before-cost: shipped policy passes', () => {
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('classification-gates-before-cost: rejects a public-only model leaking into restricted', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-classification-gate.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('data_classification.restricted')))
})

// b. Coordinator/verifier frontier pinning ------------------------------------

test('coordinator/verifier frontier pinning: shipped policy passes', () => {
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('coordinator/verifier frontier pinning: rejects a non-frontier coordinator', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-role-pinning.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('roles.coordinator')))
})

// c. Security override (+ derived name-guard) ---------------------------------

test('security-override: shipped policy passes', () => {
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('security-override: rejects a non-frontier tier in a security_flavored allowlist', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-security-override.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) =>
      e.includes('security_flavored but allowlist contains non-frontier tier'),
    ),
  )
})

test('security-override derived guard: rejects an undeclared security-named class', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-security-undeclared.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('looks security/audit-flavored by name')))
})

// d. Ceiling presence ----------------------------------------------------------

test('ceiling presence: shipped policy passes', () => {
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('ceiling presence: rejects a missing ceiling_usd', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-ceiling-missing.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
})

test('ceiling presence: rejects a zero ceiling_usd', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-ceiling-zero.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
})

// e. Frontier-tier anchoring (rework Finding 1) ------------------------------

test('frontier-tier anchoring: shipped policy passes unchanged', () => {
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('frontier-tier anchoring: rejects a model_tiers.frontier not in KNOWN_FRONTIER_MODELS, naming the offending id', () => {
  assert.ok(
    !KNOWN_FRONTIER_MODELS.includes('claude-haiku-4-5'),
    'fixture assumes claude-haiku-4-5 is not a known frontier model',
  )
  const doc = loadYaml(join(fixturesDir, 'reject-frontier-anchor.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(
      (e) => e.includes('model_tiers.frontier') && e.includes("'claude-haiku-4-5'"),
    ),
    `expected an error naming the offending model id, got: ${JSON.stringify(result.errors)}`,
  )
})

// f. Public-only shadow routing ------------------------------------------------

test('Cerebras shadow route: shipped policy is public-only, candidate-only, and non-authoritative', () => {
  const doc = validPolicy as {
    shadow_routes?: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes?.['cerebras-shadow']

  assert.deepEqual(route, {
    adapter_id: 'cerebras-shadow',
    data_classification: 'public',
    allowed_task_types: ['spec_lint', 'evidence_index', 'review_triage'],
    requires_live_discovery: true,
    candidate_only: true,
    authority: 'none',
    tools_granted: [],
    effect_capability: 'none',
    prohibited_roles: ['coordinator', 'verifier'],
  })
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('Cerebras shadow route: rejects non-public classification, authority, tools, effects, and missing role prohibitions', () => {
  const doc = structuredClone(validPolicy) as {
    shadow_routes?: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes?.['cerebras-shadow']
  assert.ok(route, 'fixture requires the shipped cerebras-shadow route')
  route.data_classification = 'internal'
  route.authority = 'coordinator'
  route.tools_granted = ['filesystem']
  route.effect_capability = 'write'
  route.prohibited_roles = ['coordinator']

  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('data_classification')))
  assert.ok(result.errors.some((error) => error.includes('authority')))
  assert.ok(result.errors.some((error) => error.includes('tools_granted')))
  assert.ok(result.errors.some((error) => error.includes('effect_capability')))
  assert.ok(result.errors.some((error) => error.includes('prohibited_roles')))
})

test('Cerebras shadow route: rejects a mismatched adapter, undiscoverable execution, gate-satisfying output, and unsupported task type', () => {
  const doc = structuredClone(validPolicy) as {
    shadow_routes?: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes?.['cerebras-shadow']
  assert.ok(route, 'fixture requires the shipped cerebras-shadow route')
  route.adapter_id = 'another-adapter'
  route.requires_live_discovery = false
  route.candidate_only = false
  route.allowed_task_types = ['dispatch']

  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => error.includes('adapter_id')))
  assert.ok(result.errors.some((error) => error.includes('requires_live_discovery')))
  assert.ok(result.errors.some((error) => error.includes('candidate_only')))
  assert.ok(result.errors.some((error) => error.includes('allowed_task_types')))
})
