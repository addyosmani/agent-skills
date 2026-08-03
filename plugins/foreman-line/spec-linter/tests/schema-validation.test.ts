/**
 * AC4 + AC7 (live-corpus half): the shipped `docs/specs/done/*.md` specs
 * validate with zero schema/semantic violations, proving no false positives
 * on real content. Advisory warnings are separate and asserted here too:
 * W0-P1 (pre-v0.2 surfaces shorthand) is expected to warn; W0-P3/W0-P4/PCC-P0
 * must not.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseFrontmatter, validateSpecFrontmatter } from '../src/validate.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const doneDir = join(repoRoot, 'plugins', 'foreman-line', 'docs', 'specs', 'done')
const parcelCompilerDoneDir = join(repoRoot, 'skills', 'parcel-compiler', 'docs', 'specs', 'done')

const doneSpecs = [
  'W0-P1-pipeline-stage-contracts.md',
  'W0-P3-routing-policy-schema-validator.md',
  'W0-P4-receipt-chain-schema-validator.md',
]

for (const specFile of doneSpecs) {
  test(`live corpus: ${specFile} has zero schema/semantic violations`, () => {
    const content = readFileSync(join(doneDir, specFile), 'utf8')
    const doc = parseFrontmatter(content)
    assert.notEqual(doc, null, `${specFile}: no parsable frontmatter`)
    const result = validateSpecFrontmatter(doc)
    assert.deepEqual(result.errors, [], `${specFile}: unexpected violations`)
    assert.equal(result.valid, true)
  })
}

test('live corpus: PCC-P0-pcc-cli-scaffold.md has zero schema/semantic violations', () => {
  const specFile = 'PCC-P0-pcc-cli-scaffold.md'
  const content = readFileSync(join(parcelCompilerDoneDir, specFile), 'utf8')
  const doc = parseFrontmatter(content)
  assert.notEqual(doc, null, `${specFile}: no parsable frontmatter`)
  const result = validateSpecFrontmatter(doc)
  assert.deepEqual(result.errors, [], `${specFile}: unexpected violations`)
  assert.equal(result.valid, true)
})

test('live corpus: W0-P1 produces a surfaces-vocabulary advisory warning (pre-v0.2 shorthand, informational)', () => {
  const content = readFileSync(join(doneDir, 'W0-P1-pipeline-stage-contracts.md'), 'utf8')
  const doc = parseFrontmatter(content)
  const result = validateSpecFrontmatter(doc)
  assert.ok(
    result.warnings.some((w) => w.includes('does not begin with a known vocabulary prefix')),
    `expected a surfaces-vocabulary advisory warning, got: ${JSON.stringify(result.warnings)}`,
  )
})

for (const specFile of [
  'W0-P3-routing-policy-schema-validator.md',
  'W0-P4-receipt-chain-schema-validator.md',
]) {
  test(`live corpus: ${specFile} produces no surfaces-vocabulary warning (standard prefix)`, () => {
    const content = readFileSync(join(doneDir, specFile), 'utf8')
    const doc = parseFrontmatter(content)
    const result = validateSpecFrontmatter(doc)
    assert.ok(
      !result.warnings.some((w) => w.includes('does not begin with a known vocabulary prefix')),
      `expected no vocabulary warning for ${specFile}, got: ${JSON.stringify(result.warnings)}`,
    )
  })
}

test('live corpus: PCC-P0-pcc-cli-scaffold.md produces no surfaces-vocabulary warning (standard prefix)', () => {
  const specFile = 'PCC-P0-pcc-cli-scaffold.md'
  const content = readFileSync(join(parcelCompilerDoneDir, specFile), 'utf8')
  const doc = parseFrontmatter(content)
  const result = validateSpecFrontmatter(doc)
  assert.ok(
    !result.warnings.some((w) => w.includes('does not begin with a known vocabulary prefix')),
    `expected no vocabulary warning for ${specFile}, got: ${JSON.stringify(result.warnings)}`,
  )
})
