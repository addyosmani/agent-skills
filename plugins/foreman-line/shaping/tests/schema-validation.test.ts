/** AC2: the produced artifact validates against the frozen shapingResultSchema. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv } from 'ajv'
import { shapingResultSchema } from '../../contracts/src/index.js'
import { emitShapingResult } from '../src/index.js'
import { makeTempRepoRoot } from './helpers.js'

const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(shapingResultSchema)

test('AC2: emitted ShapingResult validates against the frozen shapingResultSchema', () => {
  const { payload } = emitShapingResult({
    sessionSlug: 'ac2-session',
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/W9-P1-example.md'],
    repoRoot: makeTempRepoRoot(),
  })
  assert.equal(validate(payload), true, JSON.stringify(validate.errors))
})
