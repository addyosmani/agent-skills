/** AC11: runtime dependencies are exactly {ajv}; hashing uses only node:crypto. */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const packageJsonPath = join(packageDir, 'package.json')

function collectTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...collectTsFiles(full))
    else if (entry.name.endsWith('.ts')) out.push(full)
  }
  return out
}

test('AC11: runtime dependencies are exactly {ajv}', () => {
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const keys = Object.keys(pkg.dependencies ?? {}).sort()
  assert.deepEqual(keys, ['ajv'])
})

test('AC11: hashing uses only node:crypto (no external hashing package dependency imported)', () => {
  // Scoped to non-relative (bare package) specifiers - this package's own
  // vendored './hash.js'/'./canonical.js' (which themselves use only
  // node:crypto) are the expected internal re-exports, not a violation.
  const pattern = /from\s+['"](?!\.|node:crypto)[^'"]*hash[^'"]*['"]/i
  for (const file of collectTsFiles(join(packageDir, 'src'))) {
    if (file.endsWith('hash.ts')) continue
    const text = readFileSync(file, 'utf8')
    assert.equal(pattern.test(text), false, `${file} imports a non-node:crypto hashing module`)
  }
})
