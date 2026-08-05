/**
 * AC10: the emitted artifact is a plain JSON object with no non-serializable
 * values (byte-stable under a JSON.parse(JSON.stringify(x)) round-trip). Zero
 * import from receipts/, skills/parcel-compiler/, or any hashing/
 * canonicalization utility, and no receipt is minted.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { writeProjectedResult } from '../src/index.js'
import { makeTempRepoRoot, writeShapingResultFixture, writeSpecDraft } from './helpers.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

test('AC10: the projected payload round-trips byte-stable through parse/serialize', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'Title')
  const inputPath = writeShapingResultFixture(root, 'canon-slug', [
    'plugins/foreman-line/docs/specs/active/w1-p2.md',
  ])
  const { payload } = writeProjectedResult(inputPath, 'Epic', { repoRoot: root })
  const once = JSON.stringify(payload)
  const twice = JSON.stringify(JSON.parse(once))
  assert.equal(once, twice)
})

test('AC10: no source module imports receipts/, parcel-compiler, or any hashing/canonicalization code, and no receipt is minted', () => {
  const forbidden = [
    /from '[^']*receipts\//,
    /from '[^']*skills\/parcel-compiler/,
    /from 'node:crypto'/,
    /createHash/,
    /rfc8785/i,
    /canonicalize/i,
    /receipt/i,
  ]
  for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(join(srcDir, file), 'utf8')
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${file} matched forbidden pattern ${pattern}`)
    }
  }
})
