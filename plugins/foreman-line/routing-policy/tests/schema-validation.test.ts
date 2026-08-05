/**
 * AC3 + AC4: the shipped `routing-policy.yaml` validates against
 * `routing-policy.schema.json` with zero errors, and contains all four
 * reconciled class values.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { validatePolicy } from '../src/validator.js'

const policyPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'routing-policy.yaml')

test('shipped routing-policy.yaml validates with zero errors', () => {
  const doc = parse(readFileSync(policyPath, 'utf8'))
  const result = validatePolicy(doc)
  assert.deepEqual(result.errors, [])
  assert.equal(result.valid, true)
})

test('shipped routing-policy.yaml contains all four reconciled classes', () => {
  const doc = parse(readFileSync(policyPath, 'utf8')) as { classes: Record<string, unknown> }
  assert.deepEqual(
    Object.keys(doc.classes).sort(),
    ['architecture/risk', 'boilerplate', 'implementation/standard', 'standard-feature'].sort(),
  )
})

test('shipped routing-policy.yaml pins coordinator and verifier to frontier, builder per-class', () => {
  const doc = parse(readFileSync(policyPath, 'utf8')) as {
    roles: { coordinator: string; verifier: string; builder: string }
  }
  assert.equal(doc.roles.coordinator, 'frontier')
  assert.equal(doc.roles.verifier, 'frontier')
  assert.equal(doc.roles.builder, 'per-class')
})

test('shipped routing-policy.yaml every class entry has a positive ceiling_usd', () => {
  const doc = parse(readFileSync(policyPath, 'utf8')) as {
    classes: Record<string, { ceiling_usd: number }>
  }
  for (const [name, entry] of Object.entries(doc.classes)) {
    assert.ok(entry.ceiling_usd > 0, `classes['${name}'].ceiling_usd must be > 0`)
  }
})
