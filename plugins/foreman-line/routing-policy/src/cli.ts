/**
 * `routing-policy validate <path>` — thin wrapper over `validatePolicy`.
 * Exit-code contract (frozen by this parcel, no workflow wiring):
 *   0  valid
 *   1  schema or semantic-invariant violation (every violation on stderr)
 *   2  usage error (missing/unreadable path, bad invocation)
 */
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { validatePolicy } from './validator.js'

function run(argv: readonly string[]): number {
  const [command, path] = argv
  if (command !== 'validate' || path === undefined) {
    process.stderr.write('usage: routing-policy validate <path>\n')
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
    doc = parse(raw)
  } catch (err) {
    process.stderr.write(`error: cannot parse '${path}' as YAML: ${(err as Error).message}\n`)
    return 2
  }

  const result = validatePolicy(doc)
  if (!result.valid) {
    for (const message of result.errors) {
      process.stderr.write(`${message}\n`)
    }
    return 1
  }
  return 0
}

process.exitCode = run(process.argv.slice(2))
