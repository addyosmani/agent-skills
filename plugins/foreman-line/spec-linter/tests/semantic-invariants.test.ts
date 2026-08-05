/**
 * AC6: six semantic-invariant test suites (AC6a-AC6f), each with at least one
 * passing fixture and one rejecting fixture. AC6a-e are schema-structural
 * (enforced by ajv via `schemas/spec-frontmatter.schema.json`); AC6f is the
 * one true cross-field semantic rule enforced by `validateSpecFrontmatter`
 * itself (status: superseded requires non-null superseded_by).
 *
 * Also covers the `permission_profile:` and `surfaces:` advisory-warning
 * behavior mandated by the spec (Verification Plan focus question 3).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, validateSpecFrontmatter } from '../src/validate.js'

const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')

function loadFixture(name: string): unknown {
  const content = readFileSync(join(fixturesDir, name), 'utf8')
  const doc = parseFrontmatter(content)
  assert.notEqual(doc, null, `${name}: no parsable frontmatter`)
  return doc
}

// a. risk: enum -----------------------------------------------------------

test('AC6a risk: passing fixture (valid-spec.md, risk: standard)', () => {
  const doc = loadFixture('valid-spec.md')
  assert.equal(validateSpecFrontmatter(doc).valid, true)
})

test('AC6a risk: rejects a value outside {low, standard, elevated, critical}', () => {
  const doc = loadFixture('reject-risk.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('risk')))
})

// b. routing_class: enum ---------------------------------------------------

test('AC6b routing_class: passing fixture (valid-spec.md, routing_class: standard-feature)', () => {
  const doc = loadFixture('valid-spec.md')
  assert.equal(validateSpecFrontmatter(doc).valid, true)
})

test('AC6b routing_class: rejects a value outside the four-value enum', () => {
  const doc = loadFixture('reject-routing-class.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('routing_class')))
})

// c. surfaces: non-empty ----------------------------------------------------

test('AC6c surfaces: passing fixture (valid-spec.md, non-empty array)', () => {
  const doc = loadFixture('valid-spec.md')
  assert.equal(validateSpecFrontmatter(doc).valid, true)
})

test('AC6c surfaces: rejects an empty array', () => {
  const doc = loadFixture('reject-surfaces-empty.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('surfaces')))
})

// d. permission_profile: non-empty, non-whitespace-only string, and (P4) a
//    name in the P1 permission-profile registry ---------------------------

test('AC6d permission_profile: passing fixture (valid-spec.md, registered name builder-standard)', () => {
  const doc = loadFixture('valid-spec.md')
  assert.equal(validateSpecFrontmatter(doc).valid, true)
})

test('AC6d permission_profile: rejects a whitespace-only string', () => {
  const doc = loadFixture('reject-permission-profile-whitespace.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('permission_profile')))
})

test('AC6d permission_profile: rejects an explicit null (distinct from key-absent)', () => {
  const doc = loadFixture('permission-profile-null.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('permission_profile')))
})

test('AC6d permission_profile: rejects a well-formed but unregistered name (P4 enum)', () => {
  const doc = loadFixture('reject-permission-profile-unknown.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('permission_profile')))
})

// e. status: enum ------------------------------------------------------------

test('AC6e status: passing fixture (valid-spec.md, status: active)', () => {
  const doc = loadFixture('valid-spec.md')
  assert.equal(validateSpecFrontmatter(doc).valid, true)
})

test('AC6e status: rejects a value outside {draft, active, done, superseded}', () => {
  const doc = loadFixture('reject-status.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('status')))
})

// f. status: superseded requires non-null superseded_by (semantic, not schema) ----

test('AC6f superseded invariant: passing fixture (valid-superseded.md, superseded_by set)', () => {
  const doc = loadFixture('valid-superseded.md')
  assert.equal(validateSpecFrontmatter(doc).valid, true)
})

test('AC6f superseded invariant: rejects status: superseded with superseded_by: null', () => {
  const doc = loadFixture('reject-superseded-null.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, false)
  assert.ok(result.errors.some((e) => e.includes('superseded_by')))
})

// permission_profile advisory warning ----------------------------------------

test('permission_profile warning: absent key produces exactly one advisory warning, exit-valid unaffected', () => {
  const doc = loadFixture('valid-spec-no-perm.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, true)
  const permWarnings = result.warnings.filter((w) => w.includes('permission_profile'))
  assert.equal(permWarnings.length, 1)
})

test('permission_profile warning: --no-permission-profile-warning suppresses it with no other side effects', () => {
  const doc = loadFixture('valid-spec-no-perm.md')
  const result = validateSpecFrontmatter(doc, { noPermissionProfileWarning: true })
  assert.equal(result.valid, true)
  assert.ok(!result.warnings.some((w) => w.includes('permission_profile')))
})

test('permission_profile warning: present key produces no advisory warning', () => {
  const doc = loadFixture('valid-spec.md')
  const result = validateSpecFrontmatter(doc)
  assert.ok(!result.warnings.some((w) => w.includes('permission_profile')))
})

// surfaces vocabulary advisory warning ----------------------------------------

test('surfaces vocabulary warning: unknown prefix produces an advisory warning, exit-valid unaffected', () => {
  const doc = loadFixture('valid-spec-unknown-surface.md')
  const result = validateSpecFrontmatter(doc)
  assert.equal(result.valid, true)
  assert.ok(
    result.warnings.some((w) => w.includes('does not begin with a known vocabulary prefix')),
  )
})

test('surfaces vocabulary warning: known prefix produces no vocabulary warning', () => {
  const doc = loadFixture('valid-spec.md')
  const result = validateSpecFrontmatter(doc)
  assert.ok(
    !result.warnings.some((w) => w.includes('does not begin with a known vocabulary prefix')),
  )
})
