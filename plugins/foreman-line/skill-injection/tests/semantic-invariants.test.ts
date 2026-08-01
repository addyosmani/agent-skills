/**
 * AC3 (schema-structural) + AC4 (semantic invariants), each with a passing
 * and a rejecting fixture. AC3/AC4a-d are enforced entirely by
 * `skillInjectionMatrixSchema` (see `schemas.ts` for why); AC4e is enforced
 * by `parseSkillInjectionMatrixYaml`'s strict duplicate-key parsing, a
 * separate, earlier gate than schema validation.
 *
 * Mandated adversarial-review focus #2 (silent-default hunt): this suite
 * explicitly constructs both smuggling paths — a matrix with
 * `verifier_harness` entirely omitted, and a matrix with `'*': []` under
 * `builder` — and asserts both are rejected.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { parseSkillInjectionMatrixYaml, validateSkillInjectionMatrix } from '../src/validate.js'

const here = dirname(fileURLToPath(import.meta.url))
const matrixPath = join(here, '..', 'skill-injection.yaml')
const fixturesDir = join(here, 'fixtures')

function loadYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'))
}

function loadRaw(path: string): string {
  return readFileSync(path, 'utf8')
}

const validMatrix = loadYaml(matrixPath)

// Shared passing case for every AC3 / AC4a-d structural invariant ------------

test('shipped matrix passes structural validation (shared passing case for AC3/AC4a-d)', () => {
  assert.equal(validateSkillInjectionMatrix(validMatrix).valid, true)
})

// AC3a: all five top-level keys required -------------------------------------

test('AC3a: rejects a document missing a top-level key (verifier_harness omitted)', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-missing-toplevel.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('verifier_harness')))
})

// AC3b: unknown sixth top-level key rejected ----------------------------------

test('AC3b: rejects an unknown sixth top-level key', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-unknown-toplevel.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('additional properties')))
})

// AC3c: glob-pattern key syntax -----------------------------------------------

test('AC3c: rejects a malformed glob-pattern key', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-bad-glob.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/builder')))
})

// AC3d: unknown nested key under coordinator/integration ----------------------

test('AC3d: rejects an unknown key nested under coordinator', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-unknown-nested.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/coordinator')))
})

// AC4a: role-map present-but-empty accepted (explicit "no rule yet") ---------

test('AC4a: accepts a role map present as an empty object ({})', () => {
  const doc = loadYaml(join(fixturesDir, 'accept-empty-role-map.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.deepEqual(result.errors, [])
  assert.equal(result.valid, true)
})

// AC4b: present glob key with empty skill-array rejected -----------------------

test('AC4b: rejects a present glob-pattern key mapping to an empty skill-name array', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-empty-glob-array.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/builder')))
})

// AC4c: coordinator.rework_first / integration.jira non-empty required --------

test('AC4c: rejects an empty coordinator.rework_first array', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-empty-rework-first.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/coordinator/rework_first')))
})

test('AC4c: rejects an empty integration.jira array', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-empty-jira.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/integration/jira')))
})

// AC4d: empty-string / whitespace-only skill name rejected ---------------------

test('AC4d: rejects a whitespace-only skill name', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-whitespace-skill-name.yaml'))
  const result = validateSkillInjectionMatrix(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('/adversarial_reviewer')))
})

// AC4e: duplicate-key rejection at YAML parse time ------------------------------

test('AC4e: passing case — the shipped matrix parses with zero duplicate keys', () => {
  const doc = parseSkillInjectionMatrixYaml(loadRaw(matrixPath))
  assert.ok(doc !== undefined)
})

test('AC4e: rejects a document with a duplicated top-level key', () => {
  const raw = loadRaw(join(fixturesDir, 'reject-duplicate-top-level.yaml'))
  assert.throws(() => parseSkillInjectionMatrixYaml(raw), /unique/i)
})

test('AC4e: rejects a document with a duplicated glob-pattern key within one role map', () => {
  const raw = loadRaw(join(fixturesDir, 'reject-duplicate-nested-key.yaml'))
  assert.throws(() => parseSkillInjectionMatrixYaml(raw), /unique/i)
})
