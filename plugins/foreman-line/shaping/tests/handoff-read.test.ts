/**
 * AC6: the P1->P2 handoff. Explicit-path read is the primary contract (valid +
 * rejects a schema-invalid file); the active/*.shaping-result.json glob is the
 * documented discovery fallback.
 */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { test } from 'node:test'
import { discoverShapingResults, emitShapingResult, readShapingResult } from '../src/index.js'
import { makeTempRepoRoot } from './helpers.js'

test('AC6: explicit-path reader returns the parsed, schema-valid payload', () => {
  const { artifactPath } = emitShapingResult({
    sessionSlug: 'read-ok',
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/x.md'],
    repoRoot: makeTempRepoRoot(),
  })
  const payload = readShapingResult(artifactPath)
  assert.deepEqual(payload.epics, [])
  assert.equal(payload.parcelSpecRefs.length, 1)
})

test('AC6: explicit-path reader rejects a schema-invalid file', () => {
  const root = makeTempRepoRoot()
  const { artifactPath } = emitShapingResult({
    sessionSlug: 'read-bad',
    parcelSpecRefs: ['x.md'],
    repoRoot: root,
  })
  // Overwrite with a payload that violates the schema (missing `epics`).
  writeFileSync(artifactPath, JSON.stringify({ parcelSpecRefs: ['x.md'] }), 'utf8')
  assert.throws(() => readShapingResult(artifactPath), /failed shapingResultSchema validation/)
})

test('AC6: glob discovery finds every artifact under active/', () => {
  const root = makeTempRepoRoot()
  emitShapingResult({ sessionSlug: 'disc-a', parcelSpecRefs: ['a.md'], repoRoot: root })
  emitShapingResult({ sessionSlug: 'disc-b', parcelSpecRefs: ['b.md'], repoRoot: root })
  const found = discoverShapingResults(root)
  assert.equal(found.length, 2)
  assert.ok(found.every((p) => p.endsWith('.shaping-result.json')))
  assert.ok(found.some((p) => p.endsWith('disc-a.shaping-result.json')))
})

test('AC6: glob discovery returns [] when active/ does not exist', () => {
  assert.deepEqual(discoverShapingResults(makeTempRepoRoot()), [])
})
