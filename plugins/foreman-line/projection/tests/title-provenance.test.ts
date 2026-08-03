/**
 * AC5: each Story title equals the referenced spec draft's frontmatter
 * `title:`, read via the frozen spec-linter `parseFrontmatter`. A conformant
 * fixture passes; missing/unparseable/missing-or-empty-title fixtures are
 * rejected with a clear error naming the ref. No title is fabricated/defaulted.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectShapingResult, readSpecTitle } from '../src/index.js'
import {
  makeTempRepoRoot,
  writeSpecDraft,
  writeSpecDraftEmptyTitle,
  writeSpecDraftMissingTitle,
  writeSpecDraftNoFrontmatter,
} from './helpers.js'

test('AC5: Story title equals the referenced spec draft frontmatter title (conformant fixture)', () => {
  const root = makeTempRepoRoot()
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/ok.md', 'The Real Title')
  assert.equal(
    readSpecTitle(root, 'plugins/foreman-line/docs/specs/active/ok.md'),
    'The Real Title',
  )
})

test('AC5: rejects when the referenced spec is missing, naming the ref', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => readSpecTitle(root, 'plugins/foreman-line/docs/specs/active/missing.md'),
    /missing\.md.*does not exist/,
  )
})

test('AC5: rejects when the referenced spec has no parseable frontmatter, naming the ref', () => {
  const root = makeTempRepoRoot()
  writeSpecDraftNoFrontmatter(root, 'plugins/foreman-line/docs/specs/active/nofm.md')
  assert.throws(
    () => readSpecTitle(root, 'plugins/foreman-line/docs/specs/active/nofm.md'),
    /nofm\.md.*no parseable frontmatter/,
  )
})

test('AC5: rejects when the referenced spec has a missing title field, naming the ref', () => {
  const root = makeTempRepoRoot()
  writeSpecDraftMissingTitle(root, 'plugins/foreman-line/docs/specs/active/notitle.md')
  assert.throws(
    () => readSpecTitle(root, 'plugins/foreman-line/docs/specs/active/notitle.md'),
    /notitle\.md.*missing or empty/,
  )
})

test('AC5: rejects when the referenced spec has an empty title field, naming the ref', () => {
  const root = makeTempRepoRoot()
  writeSpecDraftEmptyTitle(root, 'plugins/foreman-line/docs/specs/active/emptytitle.md')
  assert.throws(
    () => readSpecTitle(root, 'plugins/foreman-line/docs/specs/active/emptytitle.md'),
    /emptytitle\.md.*missing or empty/,
  )
})

test('AC5: projectShapingResult propagates the title-provenance rejection (no fabrication) end-to-end', () => {
  const root = makeTempRepoRoot()
  writeSpecDraftMissingTitle(root, 'plugins/foreman-line/docs/specs/active/notitle.md')
  assert.throws(
    () =>
      projectShapingResult(
        { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/notitle.md'], epics: [] },
        'Epic',
        'slug',
        { repoRoot: root },
      ),
    /missing or empty/,
  )
})
