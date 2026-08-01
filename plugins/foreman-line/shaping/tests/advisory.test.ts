/**
 * AC10: the self-check is ADVISORY-only in behavior - it never writes, moves, or
 * flips a spec's status. Coordinator lint is the sole authority (stated in README
 * and SKILL.md; asserted here behaviorally).
 */
import assert from 'node:assert/strict'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { selfCheckDraft } from '../src/index.js'
import { CONFORMANT_DRAFT, makeTempRepoRoot } from './helpers.js'

test('AC10: selfCheckDraft performs no filesystem mutation and does not flip status', () => {
  const root = makeTempRepoRoot()
  const activeDir = join(root, 'plugins', 'foreman-line', 'docs', 'specs', 'active')
  mkdirSync(activeDir, { recursive: true })
  const draftPath = join(activeDir, 'W9-P9-example.md')
  writeFileSync(draftPath, CONFORMANT_DRAFT, 'utf8')

  const before = readdirSync(activeDir).sort()
  const result = selfCheckDraft(CONFORMANT_DRAFT)
  const after = readdirSync(activeDir).sort()

  assert.equal(result.valid, true, JSON.stringify(result.errors))
  // No file created, moved, or removed.
  assert.deepEqual(after, before)
  // Draft is untouched and still status: draft.
  assert.equal(readFileSync(draftPath, 'utf8'), CONFORMANT_DRAFT)
  assert.match(readFileSync(draftPath, 'utf8'), /status: draft/)
})

test('AC10: a passing self-check does not authorize a status flip (result carries no status mutation)', () => {
  const result = selfCheckDraft(CONFORMANT_DRAFT)
  // The result is a pure verdict: valid + layered errors, nothing that mutates state.
  assert.deepEqual(Object.keys(result).sort(), ['body', 'errors', 'frontmatter', 'valid'])
})
