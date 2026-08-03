/** AC11: runtime dependencies are exactly {ajv}. Machine-enforced, not prose. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageJsonPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')

test('AC11: runtime dependencies are exactly {ajv}', () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const keys = Object.keys(pkg.dependencies ?? {}).sort()
  assert.deepEqual(keys, ['ajv'])
})
