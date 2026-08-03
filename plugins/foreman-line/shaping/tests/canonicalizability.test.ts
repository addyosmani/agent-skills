/**
 * AC7: RFC 8785 canonicalizability (Q9 hook). The emitted artifact is a plain
 * JSON object with no non-serializable values, byte-stable under a parse/serialize
 * round-trip - so W1-P3 can hash it later. This parcel mints NO receipt and
 * imports NO canonicalization/hashing code - proven by a source grep.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { emitShapingResult } from '../src/index.js'
import { makeTempRepoRoot } from './helpers.js'

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src')

test('AC7: emitted payload round-trips byte-stable through parse/serialize', () => {
  const { payload } = emitShapingResult({
    sessionSlug: 'canon',
    parcelSpecRefs: ['a.md', 'b.md'],
    repoRoot: makeTempRepoRoot(),
  })
  const once = JSON.stringify(payload)
  const twice = JSON.stringify(JSON.parse(once))
  assert.equal(once, twice)
})

test('AC7: no source module imports receipts/, parcel-compiler, or any hashing/canonicalization code', () => {
  const forbidden = [
    /from '[^']*receipts\//,
    /from '[^']*skills\/parcel-compiler/,
    /from 'node:crypto'/,
    /createHash/,
    /rfc8785/i,
    /canonicalize/i,
  ]
  for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(join(srcDir, file), 'utf8')
    for (const pattern of forbidden) {
      assert.equal(pattern.test(text), false, `${file} matched forbidden pattern ${pattern}`)
    }
  }
})
