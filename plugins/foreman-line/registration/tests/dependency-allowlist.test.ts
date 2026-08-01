/**
 * AC13: runtime dependencies are exactly {ajv, @modelcontextprotocol/sdk}. The
 * recorded Q11 contingency FIRED (the one-shot `docker mcp tools call` path
 * cannot transport objects, and `additional_fields` is unavoidable), so the
 * production adapter uses the `@modelcontextprotocol/sdk` client - the single
 * admitted deviation, recorded in the README. Git goes through built-ins.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')

test('AC13: package.json dependencies keys equal exactly {ajv, @modelcontextprotocol/sdk}', () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}).sort(), ['@modelcontextprotocol/sdk', 'ajv'])
})
