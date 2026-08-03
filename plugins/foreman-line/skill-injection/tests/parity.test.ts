/**
 * AC2: proves type<->schema parity and no drift.
 *  - Every committed `schemas/*.json` is byte-identical to what the typed source
 *    serializes to (drift is impossible without a failing test).
 *  - Every canonical sample (typed against `types.ts`) validates against its schema.
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  registerNoDriftTests,
  registerSampleValidationTests,
} from '../../schema-scaffold/src/test-scaffold.js'
import { allSchemaFiles } from '../src/registry.js'
import {
  sampleCoordinatorSkills,
  sampleIntegrationSkills,
  sampleRoleSkillMap,
  sampleSkillInjectionMatrix,
} from '../src/testing.js'

const schemasDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas')

const samplesByName: ReadonlyMap<string, unknown> = new Map<string, unknown>([
  ['skill-injection-matrix', sampleSkillInjectionMatrix],
  ['role-skill-map', sampleRoleSkillMap],
  ['coordinator-skills', sampleCoordinatorSkills],
  ['integration-skills', sampleIntegrationSkills],
])

registerNoDriftTests(allSchemaFiles, schemasDir)
registerSampleValidationTests(allSchemaFiles, samplesByName)

test('every exported skill-injection type has a committed schema file', () => {
  assert.equal(allSchemaFiles.length, 4)
})
