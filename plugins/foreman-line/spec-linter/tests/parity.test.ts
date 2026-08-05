/**
 * AC5: proves the TypeScript type <-> JSON Schema parity, and no drift between
 * the typed schema source and the committed `schemas/*.json` file, following
 * the identical W0-P3/W0-P4 pattern (never generating one representation from
 * the other — both are hand-authored and proven to agree by this test).
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Ajv, type SchemaObject } from 'ajv'
import { registerNoDriftTests } from '../../schema-scaffold/src/test-scaffold.js'
import type { SchemaFile } from '../src/registry.js'
import { allSchemaFiles } from '../src/registry.js'
import { sampleSpecFrontmatter } from '../src/testing.js'

const schemasDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas')
const ajv = new Ajv({ allErrors: true })

function getContract(): SchemaFile {
  const contract = allSchemaFiles.find((f) => f.name === 'spec-frontmatter')
  if (contract === undefined) {
    throw new Error("no 'spec-frontmatter' entry registered in allSchemaFiles")
  }
  return contract
}

registerNoDriftTests(allSchemaFiles, schemasDir)

test('canonical sample (typed against SpecFrontmatter) validates against the schema', () => {
  const contract = getContract()
  const validate = ajv.compile(contract.schema as SchemaObject)
  assert.ok(validate(sampleSpecFrontmatter), JSON.stringify(validate.errors))
})

test('exactly one schema file is registered', () => {
  assert.equal(allSchemaFiles.length, 1)
})
