/**
 * AC6: five semantic-invariant test suites, each with a passing fixture (the
 * shipped v0 registry, which satisfies all five at once) and at least one
 * rejecting fixture.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { validateRegistry } from '../src/validator.js'

const here = dirname(fileURLToPath(import.meta.url))
const registryPath = join(here, '..', 'permission-profiles.yaml')
const fixturesDir = join(here, 'fixtures')

function loadYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'))
}

const validRegistry = loadYaml(registryPath)

// a. Profile-set completeness --------------------------------------------------

test('profile-set completeness: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('profile-set completeness: rejects keys != PROFILE_NAMES (unknown seventh key)', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-unknown-profile.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('unknown profile') && e.includes('PROFILE_NAMES')))
})

test('profile-set completeness: rejects keys != PROFILE_NAMES (missing profile)', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-missing-profile.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(
      (e) => e.includes('missing required profile') && e.includes('PROFILE_NAMES'),
    ),
  )
})

// b. Self-modification guard ---------------------------------------------------

test('self-modification guard: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('self-modification guard: rejects a profile lacking the Edit/Write(.claude/**)-covering deny', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-self-mod-guard.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('self-modification guard')))
})

// c. No self-nullifying mode ---------------------------------------------------

test('no self-nullifying mode: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('no self-nullifying mode: rejects bypass mode with a validator-level message', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-bypass-mode.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('bypassPermissions') && e.includes('nullifies')))
})

// d. reviewer-readonly restriction completeness --------------------------------

test('reviewer-readonly restriction completeness: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('reviewer-readonly restriction completeness: rejects a reviewer-readonly missing one of the ten mutation-command denies', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-reviewer-incomplete.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some(
      (e) => e.includes('reviewer-readonly') && e.includes('PowerShell(git merge*)'),
    ),
  )
})

test('reviewer-readonly restriction completeness: rejects a reviewer-readonly missing the bare Edit deny', () => {
  const doc = {
    profiles: {
      coordinator: {
        description: 'x',
        envelope: { deny: ['Edit(.claude/**)', 'Write(.claude/**)'], ask: [], allow: [] },
      },
      'builder-standard': {
        description: 'x',
        envelope: { deny: ['Edit(.claude/**)', 'Write(.claude/**)'], ask: [], allow: [] },
      },
      'builder-architecture': {
        description: 'x',
        envelope: { deny: ['Edit(.claude/**)', 'Write(.claude/**)'], ask: [], allow: [] },
      },
      'reviewer-readonly': {
        description: 'x',
        envelope: {
          deny: [
            'Write',
            'Edit(.claude/**)',
            'Write(.claude/**)',
            'Bash(git commit*)',
            'PowerShell(git commit*)',
            'Bash(git push*)',
            'PowerShell(git push*)',
            'Bash(git apply*)',
            'PowerShell(git apply*)',
            'Bash(git stash*)',
            'PowerShell(git stash*)',
            'Bash(git merge*)',
            'PowerShell(git merge*)',
          ],
          ask: [],
          allow: [],
        },
      },
      'shaping-agent': {
        description: 'x',
        envelope: { deny: ['Edit(.claude/**)', 'Write(.claude/**)'], ask: [], allow: [] },
      },
      'builder-deps': {
        description: 'x',
        envelope: { deny: ['Edit(.claude/**)', 'Write(.claude/**)'], ask: [], allow: [] },
      },
    },
  }
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes("bare 'Edit' deny")))
})

// e. reviewer-readonly shell-access preservation -------------------------------

test('reviewer-readonly shell-access preservation: shipped registry passes', () => {
  assert.equal(validateRegistry(validRegistry).valid, true)
})

test('reviewer-readonly shell-access preservation: rejects a reviewer-readonly that denies bare Bash', () => {
  const doc = loadYaml(join(fixturesDir, 'reject-reviewer-shell-denied.yaml'))
  const result = validateRegistry(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes("bare 'Bash' deny")))
})
