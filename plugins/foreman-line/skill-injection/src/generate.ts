import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate } from '../../schema-scaffold/src/generate.js'
import { allSchemaFiles } from './registry.js'

export { serialize } from '../../schema-scaffold/src/generate.js'

const here = dirname(fileURLToPath(import.meta.url))
const schemasDir = join(here, '..', 'schemas')

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generate(allSchemaFiles, schemasDir)
}
