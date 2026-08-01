/**
 * AC13: no bare `@foreman-line/*` specifier appears anywhere in the package
 * (cross-package imports use filesystem-relative ESM specifiers), and the root
 * package.json is unmodified by this parcel.
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

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

test('AC13: no bare @foreman-line/* import specifier anywhere in the package sources', () => {
  // A "bare specifier" is a scoped module specifier in a static or dynamic import,
  // not a prose mention. The pattern below matches a from-clause or dynamic import
  // whose specifier begins with the scoped package prefix.
  const specifierPattern = /(?:from|import)\s*\(?\s*['"]@foreman-line\//
  for (const file of collectTsFiles(packageDir)) {
    const text = readFileSync(file, 'utf8')
    assert.equal(
      specifierPattern.test(text),
      false,
      `${file} contains a banned bare @foreman-line/* import specifier`,
    )
  }
})

test('AC13: root package.json is unmodified by this parcel', () => {
  const out = execFileSync('git', ['diff', 'HEAD', '--stat', '--', 'package.json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  assert.equal(out.trim(), '')
})
