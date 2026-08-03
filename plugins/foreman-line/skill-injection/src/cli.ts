/**
 * `skill-injection validate <path>` — thin wrapper over
 * `validateSkillInjectionMatrix`. Exit-code contract (frozen by this parcel,
 * no workflow wiring):
 *   0  valid
 *   1  schema violation (every violation on stderr, not just the first)
 *   2  usage error (missing/unreadable path, bad invocation, or unparsable
 *      YAML — including a duplicate-key document; AC4e's rejection is a
 *      parse-time failure, the same bucket as "cannot parse as YAML",
 *      mirroring the sibling `routing-policy`/`spec-linter` CLIs)
 *
 * No `resolve`/`evaluate` command — resolving what skills a parcel's
 * `surfaces:` + `routing_class:` would actually inject is dispatch-time
 * evaluation (W2-P5), not static validation, and is not built here.
 */
import { readFileSync } from 'node:fs'
import { parseSkillInjectionMatrixYaml, validateSkillInjectionMatrix } from './validate.js'

function run(argv: readonly string[]): number {
  const [command, path] = argv
  if (command !== 'validate' || path === undefined) {
    process.stderr.write('usage: skill-injection validate <path>\n')
    return 2
  }

  let raw: string
  try {
    raw = readFileSync(path, 'utf8')
  } catch (err) {
    process.stderr.write(`error: cannot read '${path}': ${(err as Error).message}\n`)
    return 2
  }

  let doc: unknown
  try {
    doc = parseSkillInjectionMatrixYaml(raw)
  } catch (err) {
    process.stderr.write(`error: cannot parse '${path}' as YAML: ${(err as Error).message}\n`)
    return 2
  }

  const result = validateSkillInjectionMatrix(doc)
  if (!result.valid) {
    for (const message of result.errors) {
      process.stderr.write(`${message}\n`)
    }
    return 1
  }
  return 0
}

process.exitCode = run(process.argv.slice(2))
