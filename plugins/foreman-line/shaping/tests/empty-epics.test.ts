/**
 * AC3: the empty-`epics` artifact is schema-valid - a DELIBERATE, tested reliance
 * on the frozen schema declaring no `minItems` on `epics`, not an accident. The
 * emitter never fabricates a placeholder epic; empty means empty (W1-P2 fills it).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv } from 'ajv'
import { shapingResultSchema } from '../../contracts/src/index.js'
import { emitShapingResult } from '../src/index.js'
import { makeTempRepoRoot } from './helpers.js'

const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(shapingResultSchema)

test('AC3: empty-epics payload is schema-valid (no-minItems allowance relied on deliberately)', () => {
  const { payload } = emitShapingResult({
    sessionSlug: 'ac3-session',
    parcelSpecRefs: ['plugins/foreman-line/docs/specs/active/W9-P1-example.md'],
    repoRoot: makeTempRepoRoot(),
  })
  assert.deepEqual(payload.epics, [])
  assert.equal(validate(payload), true, JSON.stringify(validate.errors))
})

test('AC3: emitter never fabricates a placeholder epic', () => {
  const { payload } = emitShapingResult({
    sessionSlug: 'ac3-session-2',
    parcelSpecRefs: ['a.md', 'b.md'],
    repoRoot: makeTempRepoRoot(),
  })
  assert.equal(payload.epics.length, 0)
})
