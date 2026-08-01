/**
 * Serializes a set of typed schemas to `<outDir>/<name>.schema.json`.
 * The committed JSON files are what runtime agents and CI consume; the parity test
 * asserts they are byte-identical to what this script produces (no drift).
 *
 * `outDir` is an explicit parameter rather than derived from this module's own
 * location: the old per-package form assumed its own file lived inside the
 * package whose schemas it generated, which stops being true once this
 * function lives in a different package than every caller.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { SchemaFile } from './registry.js'

export function serialize(schema: object): string {
  return `${JSON.stringify(schema, null, 2)}\n`
}

export function generate(files: readonly SchemaFile[], outDir: string): void {
  mkdirSync(outDir, { recursive: true })
  for (const { name, schema } of files) {
    writeFileSync(join(outDir, `${name}.schema.json`), serialize(schema), 'utf8')
  }
  console.log(`generated ${files.length} schema files in ${outDir}`)
}
