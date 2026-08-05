/**
 * AC8: the frontmatter self-check REUSES the imported parseFrontmatter +
 * validateSpecFrontmatter from frozen spec-linter (relative ESM specifier, no
 * modification). A valid v0.2 draft passes; a draft missing a required field
 * (`risk`) is rejected with the linter's own violation surfaced. A git check
 * confirms no file under spec-linter/ is modified by this parcel.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkFrontmatter } from '../src/index.js'
import { CONFORMANT_DRAFT, DRAFT_MISSING_RISK } from './helpers.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

test('AC8: a valid v0.2 draft passes the frontmatter self-check', () => {
  const result = checkFrontmatter(CONFORMANT_DRAFT)
  assert.equal(result.valid, true, JSON.stringify(result.errors))
})

test('AC8: a draft missing the required `risk` field is rejected with the linter violation', () => {
  const result = checkFrontmatter(DRAFT_MISSING_RISK)
  assert.equal(result.valid, false)
  assert.ok(
    result.errors.some((e) => e.includes('risk')),
    `expected a violation mentioning 'risk', got ${JSON.stringify(result.errors)}`,
  )
})

test('AC8: no file under spec-linter/ is modified by this parcel', () => {
  const out = execFileSync(
    'git',
    ['diff', 'HEAD', '--stat', '--', 'plugins/foreman-line/spec-linter'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
    },
  )
  assert.equal(out.trim(), '')
})
