/**
 * AC2: proves type<->schema parity and no drift.
 *  - Every committed `schemas/*.json` is byte-identical to what the typed
 *    source serializes to (drift is impossible without a failing test).
 *  - The canonical fixture sample validates against `receiptDocumentSchema`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { Ajv, type SchemaObject } from 'ajv'
import { registerNoDriftTests } from '../../schema-scaffold/src/test-scaffold.js'
import { allSchemaFiles } from '../src/registry.js'
import { receiptDocumentSchema } from '../src/schemas.js'

const here = dirname(fileURLToPath(import.meta.url))
const schemasDir = join(here, '..', 'schemas')
const ajv = new Ajv({ allErrors: true })

registerNoDriftTests(allSchemaFiles, schemasDir)

test('every exported receipts type has a committed schema file', () => {
  assert.equal(allSchemaFiles.length, 2)
})

test('canonical genesis fixture validates against receiptDocumentSchema', () => {
  const sample = JSON.parse(
    readFileSync(join(here, 'fixtures', 'hash-vector-genesis.json'), 'utf8'),
  )
  const validate = ajv.compile(receiptDocumentSchema as SchemaObject)
  assert.ok(validate(sample), JSON.stringify(validate.errors))
})
