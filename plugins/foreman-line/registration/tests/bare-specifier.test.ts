/**
 * AC14: no bare `@foreman-line/*` specifier appears anywhere in the package
 * (cross-package imports are filesystem-relative ESM), and the root
 * `package.json` is unmodified by this parcel.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { diffStatSinceMergeBase } from './helpers.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageDir, '..', '..', '..')

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

test('AC14: no bare @foreman-line/* import specifier anywhere in the package', () => {
  const pattern = /(?:from|import)\s*\(?\s*['"]@foreman-line\//
  for (const file of collectTsFiles(packageDir)) {
    const text = readFileSync(file, 'utf8')
    assert.equal(pattern.test(text), false, `${file} contains a banned @foreman-line/* specifier`)
  }
})

test('AC14: root package.json is unmodified since the branch fork point', () => {
  assert.equal(diffStatSinceMergeBase(repoRoot, 'package.json').trim(), '')
})
