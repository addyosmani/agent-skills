/**
 * AC7: Story key = referenced spec's filename stem; Epic key = the provisional
 * `epic-<slug>` token (Flag 2 ruling); `ticket:` frontmatter is never used as a
 * key; duplicate Story keys - including a Story key colliding with the Epic
 * key - are rejected by the uniqueness guard.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { deriveEpicKey, projectShapingResult, specFilenameStem } from '../src/index.js'
import { makeTempRepoRoot, writeSpecDraft } from './helpers.js'

test('AC7: Story key is the filename stem of the referenced spec', () => {
  assert.equal(
    specFilenameStem('plugins/foreman-line/docs/specs/active/W1-P2-epic-story-projection.md'),
    'W1-P2-epic-story-projection',
  )
  assert.equal(specFilenameStem('a/b/c.md'), 'c')
})

test('AC7: Epic key is the pinned epic-<slug> token, verbatim', () => {
  assert.equal(deriveEpicKey('w1-intake-registration'), 'epic-w1-intake-registration')
  assert.equal(deriveEpicKey('x'), 'epic-x')
})

test('AC7: end-to-end keys match the expected stems/token; ticket: frontmatter is never used as a key', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'A Title')
  const output = projectShapingResult(
    { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/w1-p2.md'], epics: [] },
    'Epic',
    'w1-slug',
    { repoRoot: root },
  )
  assert.equal(output.epics[0]?.key, 'epic-w1-slug')
  assert.equal(output.epics[0]?.stories[0]?.key, 'w1-p2')
  // The fixture's ticket: frontmatter is 'KONE-TBD' - it must never appear as a key.
  assert.notEqual(output.epics[0]?.stories[0]?.key, 'KONE-TBD')
  assert.notEqual(output.epics[0]?.key, 'KONE-TBD')
})

test('AC7: two parcelSpecRefs sharing a filename stem are rejected by the uniqueness guard', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/dupe.md', 'One')
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/other/dupe.md', 'Two')
  assert.throws(
    () =>
      projectShapingResult(
        {
          parcelSpecRefs: [
            'plugins/foreman-line/docs/specs/active/dupe.md',
            'plugins/foreman-line/docs/specs/other/dupe.md',
          ],
          epics: [],
        },
        'Epic',
        'slug',
        { repoRoot: root },
      ),
    /duplicate Story key 'dupe'/,
  )
})

test('AC7 (Flag 2): a Story key colliding with the Epic key is rejected by the same uniqueness guard', () => {
  const root = makeTempRepoRoot()
  // slug 'x' => epicKey 'epic-x'; a spec literally named epic-x.md collides.
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/epic-x.md', 'Legal Filename')
  assert.throws(
    () =>
      projectShapingResult(
        { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/epic-x.md'], epics: [] },
        'Epic',
        'x',
        { repoRoot: root },
      ),
    /duplicate Story key 'epic-x'/,
  )
})
