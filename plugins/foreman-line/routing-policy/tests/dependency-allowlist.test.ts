/**
 * Runtime-dependency allowlist (Step 0 amendment): exactly `{ajv, yaml}`.
 * Machine-enforced, not prose.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerDependencyAllowlistTest } from '../../schema-scaffold/src/test-scaffold.js'

registerDependencyAllowlistTest(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'),
  ['ajv', 'yaml'],
)
