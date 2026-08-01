/**
 * `permission-profiles` CLI — two verbs sharing one bin (no second package,
 * no second bin; P3 adds a verb to P1's package per decision #1):
 *
 *   validate <path>
 *     Thin wrapper over `validateRegistry`. Exit codes:
 *       0  valid
 *       1  schema or semantic-invariant violation (every violation on stderr)
 *       2  usage error (missing/unreadable path, bad invocation, unparsable YAML)
 *
 *   dispatch-worktree --parcel <ref> --profile <name> --path <worktree-path>
 *     Resolve the named profile against the shipped registry, create the git
 *     worktree + branch, and write the untracked `.claude/settings.local.json`
 *     from the resolved envelope (P3). Exit codes:
 *       0  success — worktree + branch created, profile resolved, settings written
 *       1  well-formed invocation that could not complete (registry-integrity
 *          failure, git-worktree failure, settings already present, write error);
 *          every failure reason on stderr
 *       2  usage error — missing/unknown flags, missing --parcel/--profile/--path,
 *          or a --profile value not in PROFILE_NAMES (caught before any git mutation)
 */
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { dispatchWorktree } from './emitter.js'
import { validateRegistry } from './validator.js'

function runValidate(argv: readonly string[]): number {
  const [path] = argv
  if (path === undefined) {
    process.stderr.write('usage: permission-profiles validate <path>\n')
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

  const result = validateRegistry(doc)
  if (!result.valid) {
    for (const message of result.errors) {
      process.stderr.write(`${message}\n`)
    }
    return 1
  }
  return 0
}

const DISPATCH_USAGE =
  'usage: permission-profiles dispatch-worktree --parcel <ref> --profile <name> --path <worktree-path>\n'

/** Parse `--flag value` pairs imperatively (no schema — standing ajv ban). */
function parseFlags(
  argv: readonly string[],
): { flags: Record<string, string> } | { error: string } {
  const flags: Record<string, string> = {}
  const known = new Set(['--parcel', '--profile', '--path'])
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]
    if (token === undefined || !token.startsWith('--')) {
      return { error: `unexpected argument '${token ?? ''}'` }
    }
    if (!known.has(token)) {
      return { error: `unknown flag '${token}'` }
    }
    const value = argv[i + 1]
    if (value === undefined || value.startsWith('--')) {
      return { error: `flag '${token}' requires a value` }
    }
    const key = token.slice(2)
    flags[key] = value
    i += 1
  }
  return { flags }
}

function runDispatch(argv: readonly string[]): number {
  const parsed = parseFlags(argv)
  if ('error' in parsed) {
    process.stderr.write(`error: ${parsed.error}\n`)
    process.stderr.write(DISPATCH_USAGE)
    return 2
  }
  const { flags } = parsed
  const missing = (['parcel', 'profile', 'path'] as const).filter((k) => flags[k] === undefined)
  if (missing.length > 0) {
    process.stderr.write(
      `error: missing required flag(s): ${missing.map((m) => `--${m}`).join(', ')}\n`,
    )
    process.stderr.write(DISPATCH_USAGE)
    return 2
  }

  const result = dispatchWorktree({
    // biome-ignore lint/style/noNonNullAssertion: presence enforced by the `missing` check above.
    parcel: flags.parcel!,
    // biome-ignore lint/style/noNonNullAssertion: presence enforced by the `missing` check above.
    profile: flags.profile!,
    // biome-ignore lint/style/noNonNullAssertion: presence enforced by the `missing` check above.
    path: flags.path!,
  })
  if (result.stdout.length > 0) {
    process.stdout.write(result.stdout)
  }
  if (result.stderr.length > 0) {
    process.stderr.write(result.stderr)
  }
  return result.code
}

function run(argv: readonly string[]): number {
  const [command, ...rest] = argv
  if (command === 'validate') {
    return runValidate(rest)
  }
  if (command === 'dispatch-worktree') {
    return runDispatch(rest)
  }
  process.stderr.write(
    'usage: permission-profiles <validate|dispatch-worktree> ...\n' +
      '  permission-profiles validate <path>\n' +
      `  ${DISPATCH_USAGE}`,
  )
  return 2
}

process.exitCode = run(process.argv.slice(2))
