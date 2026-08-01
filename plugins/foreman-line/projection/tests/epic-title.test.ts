/**
 * AC6: Epic title is a required-explicit parameter. A call with a valid
 * epicTitle uses it verbatim; a call with an absent, empty, or
 * whitespace-only epicTitle is rejected. No slug-derived fallback.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { projectShapingResult } from '../src/index.js'
import { makeTempRepoRoot, writeSpecDraft } from './helpers.js'

function fixture(root: string) {
  writeSpecDraft(root, 'plugins/foreman-line/docs/specs/active/x.md', 'X Title')
  return { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/x.md'], epics: [] as const }
}

test('AC6: a valid epicTitle is used verbatim as the Epic title', () => {
  const root = makeTempRepoRoot()
  const output = projectShapingResult(fixture(root), 'Exactly This Title', 'my-slug', {
    repoRoot: root,
  })
  assert.equal(output.epics[0]?.title, 'Exactly This Title')
})

test('AC6: an absent epicTitle is rejected', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () =>
      projectShapingResult(fixture(root), undefined as unknown as string, 'my-slug', {
        repoRoot: root,
      }),
    /epicTitle is required/,
  )
})

test('AC6: an empty-string epicTitle is rejected', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => projectShapingResult(fixture(root), '', 'my-slug', { repoRoot: root }),
    /epicTitle is required/,
  )
})

test('AC6: a whitespace-only epicTitle is rejected', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => projectShapingResult(fixture(root), '   ', 'my-slug', { repoRoot: root }),
    /epicTitle is required/,
  )
})

test('AC6: there is no slug-derived fallback - a rejected epicTitle never synthesizes one from the slug', () => {
  const root = makeTempRepoRoot()
  assert.throws(
    () => projectShapingResult(fixture(root), '', 'my-very-distinctive-slug', { repoRoot: root }),
    (err: unknown) => {
      const message = (err as Error).message
      return (
        !message.includes('my-very-distinctive-slug') && /no slug-derived fallback/.test(message)
      )
    },
  )
})
