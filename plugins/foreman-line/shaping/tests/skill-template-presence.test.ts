/**
 * AC11: the skill and the reusable dispatch kickstarter template exist and carry
 * the interaction shape (inputs, small-batch clarifying questions with defaults,
 * outputs = drafts + ShapingResult, STOP boundary) without recursively describing
 * this build session.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const skillPath = join(repoRoot, 'plugins', 'foreman-line', 'skills', 'foreman-shaping', 'SKILL.md')
const templatePath = join(
  repoRoot,
  'plugins',
  'foreman-line',
  'docs',
  'kickstarters',
  'foreman-shaping-template.md',
)

test('AC11: plugin-local foreman-shaping/SKILL.md exists and documents the session shape', () => {
  assert.ok(existsSync(skillPath), `missing ${skillPath}`)
  const text = readFileSync(skillPath, 'utf8')
  assert.match(text, /STOP/)
  assert.match(text, /ShapingResult/)
  assert.match(text, /status: draft|status:\s*`?draft/i)
  // Coordinator lint is the sole authority (self-check advisory).
  assert.match(text, /coordinator lint/i)
})

test('AC11: the reusable dispatch kickstarter template exists', () => {
  assert.ok(existsSync(templatePath), `missing ${templatePath}`)
  const text = readFileSync(templatePath, 'utf8')
  assert.match(text, /Step 0/)
})
