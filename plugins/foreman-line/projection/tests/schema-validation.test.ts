/**
 * AC2: the projection function's produced payload validates against the
 * frozen `shapingResultSchema` imported from `contracts` (no local
 * re-declaration of the schema or the types).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv } from 'ajv'
import { shapingResultSchema } from '../../contracts/src/index.js'
import { projectShapingResult } from '../src/index.js'
import { makeTempRepoRoot, writeSpecDraft } from './helpers.js'

const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(shapingResultSchema)

test('AC2: the produced payload validates against the frozen shapingResultSchema', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'A Story Title')
  const output = projectShapingResult(
    { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/w1-p2.md'], epics: [] },
    'An Epic Title',
    'my-slug',
    { repoRoot },
  )
  assert.equal(validate(output), true, JSON.stringify(validate.errors))
})

test('AC2: the output has exactly one Epic containing one Story per parcelSpecRef', () => {
  const repoRoot = makeTempRepoRoot()
  writeSpecDraft(repoRoot, 'plugins/foreman-line/docs/specs/active/w1-p2.md', 'A Story Title')
  const output = projectShapingResult(
    { parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/w1-p2.md'], epics: [] },
    'An Epic Title',
    'my-slug',
    { repoRoot },
  )
  assert.equal(output.epics.length, 1)
  assert.equal(output.epics[0]?.stories.length, 1)
  assert.equal(output.epics[0]?.title, 'An Epic Title')
  assert.equal(output.epics[0]?.stories[0]?.title, 'A Story Title')
})
