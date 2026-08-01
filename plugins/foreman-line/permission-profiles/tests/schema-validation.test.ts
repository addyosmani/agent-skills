/**
 * AC3: `PROFILE_NAMES` <-> shipped-YAML set-equality (fixture-independent).
 * AC4: the shipped `permission-profiles.yaml` validates against
 * `permission-profile-registry.schema.json` with zero errors, and contains
 * all six profiles with their v0 contents.
 * AC5: schema-structural rejection tests, each with a passing (the shipped
 * document) and a rejecting fixture.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { PROFILE_NAMES } from '../src/types.js'
import { validateRegistry } from '../src/validator.js'

const here = dirname(fileURLToPath(import.meta.url))
const registryPath = join(here, '..', 'permission-profiles.yaml')
const fixturesDir = join(here, 'fixtures')

function loadYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'))
}

const validRegistry = loadYaml(registryPath) as { profiles: Record<string, unknown> }

// AC4 -------------------------------------------------------------------------

test('shipped permission-profiles.yaml validates with zero errors', () => {
  const result = validateRegistry(validRegistry)
  assert.deepEqual(result.errors, [])
  assert.equal(result.valid, true)
})

test('shipped permission-profiles.yaml contains exactly the six v0 profiles', () => {
  assert.deepEqual(Object.keys(validRegistry.profiles).sort(), [...PROFILE_NAMES].sort())
})

test('shipped permission-profiles.yaml: coordinator denies force-push (both shells) + self-mod guard', () => {
  const coordinator = validRegistry.profiles.coordinator as { envelope: { deny: string[] } }
  const deny = coordinator.envelope.deny
  for (const rule of [
    'Bash(git push --force*)',
    'Bash(git push -f *)',
    'PowerShell(git push --force*)',
    'PowerShell(git push -f *)',
    'Edit(.claude/**)',
    'Write(.claude/**)',
  ]) {
    assert.ok(deny.includes(rule), `coordinator.envelope.deny missing '${rule}'`)
  }
})

test('shipped permission-profiles.yaml: builder-architecture envelope equals builder-standard', () => {
  const standard = validRegistry.profiles['builder-standard'] as { envelope: unknown }
  const architecture = validRegistry.profiles['builder-architecture'] as { envelope: unknown }
  assert.deepEqual(architecture.envelope, standard.envelope)
})

test('shipped permission-profiles.yaml: reviewer-readonly denies bare Edit/Write, the ten mutation-command rules, but not bare Bash/PowerShell', () => {
  const reviewer = validRegistry.profiles['reviewer-readonly'] as { envelope: { deny: string[] } }
  const deny = reviewer.envelope.deny
  assert.ok(deny.includes('Edit'))
  assert.ok(deny.includes('Write'))
  for (const command of ['commit', 'push', 'apply', 'stash', 'merge']) {
    assert.ok(deny.includes(`Bash(git ${command}*)`))
    assert.ok(deny.includes(`PowerShell(git ${command}*)`))
  }
  assert.ok(!deny.includes('Bash'))
  assert.ok(!deny.includes('PowerShell'))
})

test('shipped permission-profiles.yaml: builder-deps envelope equals builder-standard plus a network field', () => {
  const standard = validRegistry.profiles['builder-standard'] as {
    envelope: { deny: string[]; ask: string[]; allow: string[] }
  }
  const deps = validRegistry.profiles['builder-deps'] as {
    envelope: { deny: string[]; ask: string[]; allow: string[]; network?: { egress: string } }
  }
  assert.deepEqual(deps.envelope.deny, standard.envelope.deny)
  assert.deepEqual(deps.envelope.ask, standard.envelope.ask)
  assert.deepEqual(deps.envelope.allow, standard.envelope.allow)
  assert.equal(deps.envelope.network?.egress, 'allowlist')
})

// AC5a: rule well-formedness ---------------------------------------------------

test('rule well-formedness: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('rule well-formedness: rejects a malformed rule string', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-malformed-rule.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('deny') && e.includes('pattern')))
})

// AC5b: bypassPermissions excluded at the schema enum layer -------------------

test('no self-nullifying mode: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('no self-nullifying mode: rejects defaultMode bypassPermissions at the schema enum layer', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-bypass-mode.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('defaultMode')))
})

// AC5c: closed six-name profile set --------------------------------------------

test('closed profile set: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('closed profile set: rejects an unknown seventh profile key', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-unknown-profile.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
})

test('closed profile set: rejects a document missing one of the six profiles', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-missing-profile.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
})

// AC5d: required envelope fields -----------------------------------------------

test('required envelope fields: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('required envelope fields: rejects a missing deny/ask/allow field', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-missing-envelope-field.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
})
