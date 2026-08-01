/**
 * AC10: runtime-dependency allowlist — exactly `{ajv}`, machine-enforced.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerDependencyAllowlistTest } from '../../schema-scaffold/src/test-scaffold.js'

registerDependencyAllowlistTest(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
  ['ajv'],
)
