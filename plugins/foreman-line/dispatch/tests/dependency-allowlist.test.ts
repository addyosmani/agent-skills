/**
 * Runtime dependency allowlist.
 *
 * W2-P1: @modelcontextprotocol/sdk (SDK stdio client, lesson #20) + ajv
 *        (RankedCandidateList output validation).
 * W2-P3: yaml (routing-policy.yaml parsing; same version as @foreman-line/routing-policy).
 *
 * All three are deliberate, ratified dependencies. Any addition must update
 * this assertion — the allowlist is the diff surface for security review.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')

test('AC9/AC11: package.json dependencies keys equal exactly {@modelcontextprotocol/sdk, ajv, yaml}', () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), [
    '@modelcontextprotocol/sdk',
    'ajv',
    'yaml',
  ])
})
