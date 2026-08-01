/**
 * AC3: the composite approval subject + `approvedHash` (coordinator ruling
 * Q2). Tests assert: (a) hash stability across two different on-disk
 * pretty-print formattings of the same projected payload; (b) editing any
 * referenced spec file's content changes `approvedHash`; (c) reordering
 * `parcelSpecRefs` (with matching content) changes `approvedHash`; (d) two
 * spec-sets differing only in one spec's content produce different hashes
 * (no collision).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ShapingResult } from '../../contracts/src/index.js'
import { computeApprovalSubject } from '../src/subject.js'
import { makeTempRepoRoot, sampleShapingResult, writeSpecDraft } from './helpers.js'

test('AC3a: approvedHash is stable across two differently key-ordered (but structurally identical) payloads', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const payload = sampleShapingResult()

  const a = computeApprovalSubject(payload, repoRoot)
  // Same data, top-level keys declared in the opposite order - simulates two
  // different on-disk pretty-print formattings of the same payload. The hash
  // is over the canonicalized (key-sorted) payload, never the on-disk bytes,
  // so this must not change approvedHash.
  const reordered: ShapingResult = { epics: payload.epics, parcelSpecRefs: payload.parcelSpecRefs }
  const b = computeApprovalSubject(reordered, repoRoot)

  assert.equal(a.approvedHash, b.approvedHash)
})

test('AC3b: editing a referenced spec file changes approvedHash', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/example.md', 'Example')
  const payload = sampleShapingResult()

  const before = computeApprovalSubject(payload, repoRoot)

  writeSpecDraft(
    repoRoot,
    'plugins/foreman-line/docs/specs/active/example.md',
    'Example',
    'Changed body.',
  )
  const after = computeApprovalSubject(payload, repoRoot)

  assert.notEqual(before.approvedHash, after.approvedHash)
})

test('AC3c: reordering parcelSpecRefs (matching content) changes approvedHash', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/a.md', 'A')
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/b.md', 'B')

  const forward = sampleShapingResult({
    parcelSpecRefs: [
      'plugins/foreman-line/docs/specs/active/a.md',
      'plugins/foreman-line/docs/specs/active/b.md',
    ],
  })
  const reversed = sampleShapingResult({
    parcelSpecRefs: [
      'plugins/foreman-line/docs/specs/active/b.md',
      'plugins/foreman-line/docs/specs/active/a.md',
    ],
  })

  const forwardResult = computeApprovalSubject(forward, repoRoot)
  const reversedResult = computeApprovalSubject(reversed, repoRoot)

  assert.notEqual(forwardResult.approvedHash, reversedResult.approvedHash)
})

test('AC3d: two spec-sets differing only in one spec content produce different hashes (no collision)', () => {
  const repoRootOne = makeTempRepoRoot()
  writeSpecDraft(repoRootOne, 'plugins/foreman-line/docs/specs/active/a.md', 'A', 'Body one.')
  writeSpecDraft(repoRootOne, 'plugins/foreman-line/docs/specs/active/b.md', 'B', 'Body two.')

  const repoRootTwo = makeTempRepoRoot()
  writeSpecDraft(repoRootTwo, 'plugins/foreman-line/docs/specs/active/a.md', 'A', 'Body one.')
  writeSpecDraft(
    repoRootTwo,
    'plugins/foreman-line/docs/specs/active/b.md',
    'B',
    'Body TWO different.',
  )

  const payload = sampleShapingResult({
    parcelSpecRefs: [
      'plugins/foreman-line/docs/specs/active/a.md',
      'plugins/foreman-line/docs/specs/active/b.md',
    ],
  })

  const one = computeApprovalSubject(payload, repoRootOne)
  const two = computeApprovalSubject(payload, repoRootTwo)

  assert.notEqual(one.approvedHash, two.approvedHash)
  assert.notEqual(one.subject.specSet[1]?.contentHash, two.subject.specSet[1]?.contentHash)
  assert.equal(one.subject.specSet[0]?.contentHash, two.subject.specSet[0]?.contentHash)
})

test('AC3: the composite subject construction never omits a spec content hash', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/a.md', 'A')
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/b.md', 'B')
  const payload = sampleShapingResult({
    parcelSpecRefs: [
      'plugins/foreman-line/docs/specs/active/a.md',
      'plugins/foreman-line/docs/specs/active/b.md',
    ],
  })
  const { subject } = computeApprovalSubject(payload, repoRoot)
  assert.equal(subject.specSet.length, payload.parcelSpecRefs.length)
  for (const [index, entry] of subject.specSet.entries()) {
    assert.equal(entry.ref, payload.parcelSpecRefs[index])
    assert.match(entry.contentHash, /^[0-9a-f]{64}$/)
  }
})
