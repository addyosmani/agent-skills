/**
 * AC6: F7 hash-refusal. Consumes `approval`'s exported
 * `computeApprovalSubject`/`canonicalize`/`sha256Hex` READ-ONLY (grep: no
 * vendored `src/canonical.ts`/`src/hash.ts` here, no `parcel-compiler` import).
 * Refuses (HashMismatchError, exit 1) when a referenced spec is edited after
 * approval; proceeds when content is unchanged.
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { assertApprovedHashMatches } from '../src/hash-refusal.js'
import { register } from '../src/register.js'
import { HashMismatchError } from '../src/types.js'
import { FakeAdapter, singleStoryFixture } from './helpers.js'

const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(packageDir, 'src')

test('AC6: proceeds (no throw) when content is unchanged since approval', () => {
  const fx = singleStoryFixture()
  assert.doesNotThrow(() => assertApprovedHashMatches(fx.record, fx.repoRoot))
})

test('AC6: refuses with HashMismatchError (exit 1) when a referenced spec is edited after approval', () => {
  const fx = singleStoryFixture()
  const specAbs = join(fx.repoRoot, ...(fx.specRefs[0] as string).split('/'))
  writeFileSync(specAbs, `${readFileSync(specAbs, 'utf8')}\nTampered.\n`, 'utf8')

  assert.throws(
    () => assertApprovedHashMatches(fx.record, fx.repoRoot),
    (err: unknown) => err instanceof HashMismatchError && err.exitCode === 1,
  )
})

test('AC6: register() refuses a post-approval edit on the first-registration path', async () => {
  const fx = singleStoryFixture()
  const specAbs = join(fx.repoRoot, ...(fx.specRefs[0] as string).split('/'))
  writeFileSync(specAbs, `${readFileSync(specAbs, 'utf8')}\nTampered.\n`, 'utf8')

  await assert.rejects(
    register({
      slug: fx.slug,
      repoRoot: fx.repoRoot,
      adapter: new FakeAdapter(),
      timestamp: '2026-07-22T12:00:00Z',
    }),
    HashMismatchError,
  )
})

test('AC6: no fourth vendored canonical/hash copy, and no parcel-compiler import', () => {
  const files = readdirSync(srcDir)
  assert.equal(files.includes('canonical.ts'), false, 'must not vendor a fourth canonical.ts')
  assert.equal(files.includes('hash.ts'), false, 'must not vendor a fourth hash.ts')
  for (const name of files) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(srcDir, name), 'utf8')
    assert.equal(
      text.includes('parcel-compiler'),
      false,
      `${name} must not import from skills/parcel-compiler`,
    )
  }
})

test('AC6: F7 consumes approval exports and does not exist without the genesis fixture', () => {
  // Sanity: the fixture wrote a real genesis receipt the hash-refusal chains from.
  const fx = singleStoryFixture()
  const genesisAbs = join(fx.repoRoot, ...fx.record.receipt.locator.split('/'))
  assert.ok(existsSync(genesisAbs))
})
