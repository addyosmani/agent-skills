// Issue #181, part 2: a TDD exemption declares the review that keeps it
// safe, on the negation itself, so the two can't drift apart.
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import { probityConfig } from './probity-config.ts'
import {
  obligationsOf,
  reviewedBlock,
  splitReviewedGlobs,
  unreviewedExemptionsOf,
  withObligations,
  type ReviewedExemption,
} from './review-obligations.ts'
import { anchorEntries, withExcludeGlobs } from './scoping.ts'
import { kotlinRuleEntries } from '../presets/kotlin.ts'
import { kmpRuleEntries } from '../presets/kmp.ts'
import { jsRuleEntries } from '../presets/js.ts'
import { swiftRuleEntries } from '../presets/swift.ts'

const THIN: ReviewedExemption = {
  glob: '!ui/web/src/commonMain/**/*Screen.kt',
  id: 'thin-rendering',
  reviewWith: 'code-reviewer',
  check: 'no branching on domain state; only renders view-model fields',
  reason: 'screens are thin rendering; logic is unit-tested in the view model',
}

test('should split objects into their negation and an obligation', () => {
  const split = splitReviewedGlobs(['ui/web/src/**', THIN, '!**/*Preview*.kt'])
  assert.deepEqual(split.globs, ['ui/web/src/**', '!ui/web/src/commonMain/**/*Screen.kt', '!**/*Preview*.kt'])
  assert.deepEqual(split.obligations, [THIN])
  assert.deepEqual(split.unreviewed, ['!**/*Preview*.kt'])
})

test('should add the ! to an exemption glob written without one', () => {
  const split = splitReviewedGlobs(['src/**', { ...THIN, glob: 'ui/**/*Screen.kt' }])
  assert.deepEqual(split.globs, ['src/**', '!ui/**/*Screen.kt'])
  assert.equal(split.obligations[0]!.glob, '!ui/**/*Screen.kt')
})

const invalid: [string, Partial<ReviewedExemption>][] = [
  ['an id that is not kebab-case', { id: 'Thin Rendering' }],
  ['an empty check', { check: ' ' }],
  ['an empty reason', { reason: '' }],
  ['a reviewWith that is not a persona name', { reviewWith: 'Code Reviewer' }],
]
for (const [name, override] of invalid) {
  test(`should reject an exemption with ${name}`, () => {
    assert.throws(() => splitReviewedGlobs(['src/**', { ...THIN, ...override }]), /review obligation/)
  })
}

test('should reject two obligations with the same id', () => {
  assert.throws(() => splitReviewedGlobs(['src/**', THIN, { ...THIN, glob: '!x/**' }]), /thin-rendering.*twice/)
})

test('should survive the spreads that anchoring, excludes and judge labels do', () => {
  const block = withObligations({ files: ['src/**', '!x/**'], rules: [() => ({ kind: 'pass' })] } as never, [THIN], [])
  const entries = probityConfig({ rules: withExcludeGlobs(anchorEntries([block], '/repo'), ['spikes/**']) }).rules
  assert.deepEqual(obligationsOf(entries), [THIN])
})

test('should build a hand-written block from mixed files', () => {
  const block = reviewedBlock({ files: ['src/**', THIN, '!src/gen/**'], rules: [] })
  assert.deepEqual(block.files, ['src/**', '!ui/web/src/commonMain/**/*Screen.kt', '!src/gen/**'])
  assert.deepEqual(obligationsOf([block]), [THIN])
  assert.deepEqual(unreviewedExemptionsOf([block]), [{ block: 0, globs: ['!src/gen/**'] }])
})

test('should carry tddGlobs obligations out of the kotlin, js and swift presets', () => {
  for (const entries of [
    kotlinRuleEntries('/repo', { tddGlobs: ['ui/web/src/**', THIN] }),
    jsRuleEntries({ tddGlobs: ['src/**', THIN] }),
    swiftRuleEntries('/repo', { tddGlobs: ['App/Sources/**', THIN] }),
  ]) {
    assert.deepEqual(obligationsOf(entries), [THIN])
  }
})

test('should carry tddExemptions out of the kmp preset', () => {
  assert.deepEqual(obligationsOf(kmpRuleEntries('/repo', { tddExemptions: [THIN] })), [THIN])
})

test('should leave the presets without obligations by default', () => {
  assert.deepEqual(obligationsOf(kotlinRuleEntries('/repo')), [])
  assert.deepEqual(unreviewedExemptionsOf(kotlinRuleEntries('/repo')), [])
})

test('should load obligations back from a config file through jiti, as the CLIs do', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'review-obligations-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const here = new URL('.', import.meta.url).pathname
  writeFileSync(
    join(dir, 'probity.config.ts'),
    `import { probityConfig } from '${here}probity-config.ts'
import { kotlinRuleEntries } from '${here}../presets/kotlin.ts'
export const review = {}
export default probityConfig({ rules: kotlinRuleEntries('${dir}', { tddGlobs: ['ui/**', ${JSON.stringify(THIN)}] }) })
`,
  )
  const { loadReview } = await import('../scripts/load-review.ts')
  const loaded = await loadReview(dir)
  assert.deepEqual(obligationsOf(loaded.config!.rules), [THIN])
})

test('should reject tddGlobs with no include glob, which would widen TDD to the whole repo', () => {
  assert.throws(() => kotlinRuleEntries('/repo', { tddGlobs: [THIN] }), /include/)
  assert.throws(() => jsRuleEntries({ tddGlobs: ['!src/gen/**'] }), /include/)
})

test('should still accept kmp tddExemptions alone, since its includes are fixed', () => {
  assert.doesNotThrow(() => kmpRuleEntries('/repo', { tddExemptions: [THIN] }))
})
