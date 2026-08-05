/**
 * AC2: the vendored `src/canonical.ts` + `src/hash.ts` reproduce the shipped
 * `receipts` package's frozen worked vector - drift of the vendored
 * algorithm from the authority fails this test mechanically. Also asserts no
 * import of pcc internals and no modification of `receipts/`.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { canonicalize, type JsonObject } from '../src/canonical.js'
import { sha256Hex } from '../src/hash.js'
import { diffStatSinceMergeBase } from './helpers.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(packageDir, '..', '..', '..')
const fixturePath = join(
  packageDir,
  '..',
  'receipts',
  'tests',
  'fixtures',
  'hash-vector-genesis.json',
)

const EXPECTED_HASH = '06d29ab66ebffd099f4e9031f7c38ffb778a996f6e18726ab8eea30a35f3ee23'

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

test('AC2: vendored canonicalize+hash reproduce the receipts frozen worked vector', () => {
  const doc = JSON.parse(readFileSync(fixturePath, 'utf8')) as JsonObject & { hash: string }
  const { hash, ...rest } = doc
  const recomputed = sha256Hex(canonicalize(rest))
  assert.equal(recomputed, EXPECTED_HASH)
  assert.equal(hash, EXPECTED_HASH)
})

test('AC2: no import of pcc internals (skills/parcel-compiler) anywhere in the package', () => {
  // Scoped to actual import/require specifiers, not prose - the vendored
  // canonical.ts's own doc comment cites the pcc authority by reference
  // (never imports it), which would otherwise self-trigger a false positive.
  const importPattern = /(?:from|import|require)\s*\(?\s*['"][^'"]*skills\/parcel-compiler/
  for (const file of collectTsFiles(packageDir)) {
    const text = readFileSync(file, 'utf8')
    assert.equal(importPattern.test(text), false, `${file} imports skills/parcel-compiler`)
  }
})

test('AC2: no modification to receipts/ since the branch fork point', () => {
  const out = diffStatSinceMergeBase(repoRoot, 'plugins/foreman-line/receipts')
  assert.equal(out.trim(), '')
})
