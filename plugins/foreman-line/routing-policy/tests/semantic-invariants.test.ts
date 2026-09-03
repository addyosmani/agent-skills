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

test('classification-gates-before-cost: shipped policy admits no free, :free, or contributor-tier model anywhere', () => {
  const doc = validPolicy as {
    data_classification: Record<'public' | 'internal' | 'restricted', { eligible_models: string[] }>
    model_tiers: Record<string, string[]>
  }
  const suspicious = /contributor|:free|-free$/
  for (const tier of ['public', 'internal', 'restricted'] as const) {
    for (const id of doc.data_classification[tier].eligible_models) {
      assert.ok(
        !suspicious.test(id),
        `${tier} admits '${id}', which may train on inputs or be rate-capped`,
      )
    }
  }
  for (const [tier, ids] of Object.entries(doc.model_tiers)) {
    for (const id of ids) {
      assert.ok(!suspicious.test(id), `model_tiers.${tier} lists '${id}'`)
    }
  }
  for (const id of KNOWN_FRONTIER_MODELS) {
    assert.ok(!suspicious.test(id), `KNOWN_FRONTIER_MODELS contains '${id}'`)
  }
})

test('classification-gates-before-cost: shipped policy uses OpenRouter vendor/model slugs throughout', () => {
  const doc = validPolicy as {
    data_classification: Record<string, { eligible_models: string[] }>
    model_tiers: Record<string, string[]>
  }
  const slug = /^[a-z0-9-]+\/[a-z0-9.-]+$/
  const all = [
    ...Object.values(doc.data_classification).flatMap((r) => r.eligible_models),
    ...Object.values(doc.model_tiers).flat(),
    ...KNOWN_FRONTIER_MODELS,
  ]
  for (const id of all) {
    assert.match(id, slug, `'${id}' is not a vendor/model OpenRouter slug`)
  }
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
    !KNOWN_FRONTIER_MODELS.includes('anthropic/claude-haiku-4.5'),
    'fixture assumes anthropic/claude-haiku-4.5 is not a known frontier model',
  )
  const doc = loadYaml(join(fixturesDir, 'reject-frontier-anchor.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(
      (e) => e.includes('model_tiers.frontier') && e.includes("'anthropic/claude-haiku-4.5'"),
    ),
    `expected an error naming the offending model id, got: ${JSON.stringify(result.errors)}`,
  )
})

// f. Tier models must be classification-eligible -----------------------------

test('tier eligibility: shipped policy lists every tier model under data_classification.public', () => {
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('tier eligibility: rejects a model_tiers entry absent from data_classification.public, naming the tier and id', () => {
  assert.ok(
    KNOWN_FRONTIER_MODELS.includes('openai/gpt-5.6-sol'),
    'fixture assumes openai/gpt-5.6-sol is a known frontier model so only invariant (f) fires',
  )
  const doc = loadYaml(join(fixturesDir, 'reject-tier-not-eligible.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.equal(
    result.errors.length,
    1,
    `expected exactly one error, got: ${JSON.stringify(result.errors)}`,
  )
  assert.ok(
    result.errors[0]?.includes('model_tiers.frontier') &&
      result.errors[0]?.includes("'openai/gpt-5.6-sol'") &&
      result.errors[0]?.includes('data_classification.public'),
    `expected an error naming the tier and offending model id, got: ${JSON.stringify(result.errors)}`,
  )
})

// g. Non-public transport requirements -----------------------------------------

test('transport requirements: shipped policy requires data_collection deny + zdr for internal and restricted', () => {
  const doc = validPolicy as {
    data_classification: Record<
      'public' | 'internal' | 'restricted',
      { transport_requirements: { data_collection: string; zdr: boolean } }
    >
  }
  for (const tier of ['internal', 'restricted'] as const) {
    assert.deepEqual(doc.data_classification[tier].transport_requirements, {
      data_collection: 'deny',
      zdr: true,
    })
  }
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('transport requirements: rejects permissive values on internal/restricted, naming tier and field', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-transport-requirements.yaml'))
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.equal(
    result.errors.length,
    3,
    `expected exactly three errors, got: ${JSON.stringify(result.errors)}`,
  )
  const has = (tier: string, field: string) =>
    result.errors.some((e) =>
      e.includes(`data_classification.${tier}.transport_requirements.${field}`),
    )
  assert.ok(has('internal', 'data_collection'))
  assert.ok(has('internal', 'zdr'))
  assert.ok(has('restricted', 'zdr'))
  assert.ok(
    !has('restricted', 'data_collection'),
    'restricted.data_collection is deny and must not be reported',
  )
})

test('transport requirements: missing block is a structural error, not a silent pass', () => {
  const doc = structuredClone(validPolicy) as {
    data_classification: Record<string, Record<string, unknown>>
  }
  delete doc.data_classification.internal?.transport_requirements
  const result = validatePolicy(doc)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(
      (e) => e.includes('/data_classification/internal') && e.includes('transport_requirements'),
    ),
  )
})

// h. Public-only shadow routing ------------------------------------------------
//
// The shipped v0.2 policy declares no shadow routes; the containment
// invariant is exercised against `accept-shadow-route.yaml`, which is the
// shipped policy plus one provider-neutral route.

const SHADOW_ROUTE_KEY = 'example-shadow'
const shadowPolicy = loadYaml(join(fixturesDir, 'accept-shadow-route.yaml'))

test('shadow routes: shipped policy declares none and validates with an empty map', () => {
  const doc = validPolicy as { shadow_routes?: Record<string, unknown> }
  assert.deepEqual(doc.shadow_routes, {})
  assert.equal(validatePolicy(validPolicy).valid, true)
})

test('shadow routes: schema no longer requires any particular route key', () => {
  const doc = structuredClone(shadowPolicy) as {
    shadow_routes: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes[SHADOW_ROUTE_KEY]
  assert.ok(route)
  delete doc.shadow_routes[SHADOW_ROUTE_KEY]
  doc.shadow_routes['renamed-shadow'] = { ...route, adapter_id: 'renamed-shadow' }
  const result = validatePolicy(doc)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('shadow route: accepting fixture is public-only, candidate-only, and non-authoritative', () => {
  const doc = shadowPolicy as {
    shadow_routes?: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes?.[SHADOW_ROUTE_KEY]

  assert.deepEqual(route, {
    adapter_id: SHADOW_ROUTE_KEY,
    data_classification: 'public',
    allowed_task_types: ['spec_lint', 'evidence_index', 'review_triage'],
    requires_live_discovery: true,
    candidate_only: true,
    authority: 'none',
    tools_granted: [],
    effect_capability: 'none',
    prohibited_roles: ['coordinator', 'verifier'],
  })
  assert.equal(validatePolicy(shadowPolicy).valid, true)
})

test('shadow route: rejects non-public classification, authority, tools, effects, and missing role prohibitions', () => {
  const doc = structuredClone(shadowPolicy) as {
    shadow_routes?: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes?.[SHADOW_ROUTE_KEY]
  assert.ok(route, 'fixture requires the example-shadow route')
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

test('shadow route: rejects a mismatched adapter, undiscoverable execution, gate-satisfying output, and unsupported task type', () => {
  const doc = structuredClone(shadowPolicy) as {
    shadow_routes?: Record<string, Record<string, unknown>>
  }
  const route = doc.shadow_routes?.[SHADOW_ROUTE_KEY]
  assert.ok(route, 'fixture requires the example-shadow route')
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
