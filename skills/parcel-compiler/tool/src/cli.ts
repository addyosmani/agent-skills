/**
 * pcc – Proof-Gated Parcel Compiler CLI
 *
 * Exit-code contract (frozen by PCC-P0):
 *   0  success
 *   1  validation / verification failure
 *   2  usage error, unknown command, or NOT_IMPLEMENTED stub
 *   3  trust-invariant violation
 *   4  environment error
 *
 * Only 0 and 2 are reachable in this scaffold; all commands are stubs.
 */

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ---------------------------------------------------------------------------
// Exit codes
// ---------------------------------------------------------------------------

export const EXIT = {
  SUCCESS: 0,
  VALIDATION_FAILURE: 1,
  USAGE_ERROR: 2,
  TRUST_VIOLATION: 3,
  ENVIRONMENT_ERROR: 4,
} as const

// ---------------------------------------------------------------------------
// Command surface (frozen)
// ---------------------------------------------------------------------------

export type CommandDef = {
  /** Space-separated token(s) used for longest-prefix routing. */
  readonly key: string
  readonly usage: string
  readonly summary: string
}

export const COMMANDS: readonly CommandDef[] = [
  {
    key: 'compile',
    usage: 'pcc compile <artifact-path>',
    summary: 'Compile an artifact into a validated parcel plan (or refuse with clarifications)',
  },
  {
    key: 'answer',
    usage: 'pcc answer <plan-id> --file <answers.json>',
    summary: 'Merge clarification answers and recompile',
  },
  {
    key: 'validate',
    usage: 'pcc validate <plan-id>',
    summary: 'Run the deterministic validator pipeline (V-01..V-14) on a plan',
  },
  {
    key: 'directive',
    usage: 'pcc directive <plan-id> <parcel-id>',
    summary: 'Render the implementation directive for a parcel',
  },
  {
    key: 'claim init',
    usage: 'pcc claim init <parcel-id>',
    summary: 'Scaffold a claim manifest (records author identity + base SHA)',
  },
  {
    key: 'claim seal',
    usage: 'pcc claim seal <parcel-id>',
    summary: 'Hash the evidence tree and freeze the claim manifest',
  },
  {
    key: 'verify',
    usage: 'pcc verify <parcel-id>',
    summary: 'Re-derive claim tier from the verification contract (trusted only in CI)',
  },
  {
    key: 'receipt verify',
    usage: 'pcc receipt verify',
    summary: 'Walk the receipt chain; recompute hashes and check signatures',
  },
  {
    key: 'status',
    usage: 'pcc status <plan-id>',
    summary: 'Fold the receipt chain into per-parcel states',
  },
]

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Longest-prefix match over COMMANDS.key using the leading tokens of `tokens`.
 * Two-token keys (e.g. "claim init") are tried before one-token keys.
 * Returns null for unknown commands.
 */
export function resolveCommand(tokens: readonly string[]): CommandDef | null {
  if (tokens.length >= 2) {
    const twoToken = `${tokens[0]} ${tokens[1]}`
    const match = COMMANDS.find((c) => c.key === twoToken)
    if (match !== undefined) return match
  }
  if (tokens.length >= 1) {
    return COMMANDS.find((c) => c.key === tokens[0]) ?? null
  }
  return null
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export type WriteOutput = (s: string) => void

function buildUsage(): string {
  const rows = COMMANDS.map((c) => `  pcc ${c.key.padEnd(16)}  ${c.summary}`)
  return [
    'Usage: pcc <command> [options]',
    '',
    'Commands:',
    ...rows,
    '',
    'Options:',
    '  --version  Print version and exit',
    '  --help     Show this help and exit',
    '',
    'Exit codes:',
    '  0  success',
    '  1  validation / verification failure',
    '  2  usage error, unknown command, or NOT_IMPLEMENTED stub',
    '  3  trust-invariant violation',
    '  4  environment error',
    '',
  ].join('\n')
}

/**
 * Parse `argv` (process.argv.slice(2)) and dispatch.
 * Writes to `stdout`/`stderr` (defaults to process streams).
 * Returns the exit code; never calls process.exit directly.
 */
export function run(
  argv: readonly string[],
  stdout: WriteOutput = (s) => {
    process.stdout.write(s)
  },
  stderr: WriteOutput = (s) => {
    process.stderr.write(s)
  },
): number {
  // Bare pcc or global --help
  if (argv.length === 0 || argv[0] === '--help') {
    stdout(buildUsage())
    return EXIT.SUCCESS
  }

  if (argv[0] === '--version') {
    stdout('0.1.0-scaffold\n')
    return EXIT.SUCCESS
  }

  // Resolve command by longest-prefix match on non-flag tokens
  const nonFlags = argv.filter((a) => !a.startsWith('-'))
  const cmd = resolveCommand(nonFlags)

  if (cmd === null) {
    const label =
      nonFlags.length >= 2
        ? `${nonFlags[0]} ${nonFlags[1]}`
        : nonFlags.length === 1
          ? nonFlags[0]
          : argv[0]
    stderr(`unknown command '${label}'\n`)
    stderr(buildUsage())
    return EXIT.USAGE_ERROR
  }

  // --help for known command
  if (argv.includes('--help')) {
    stdout(`${cmd.usage}\n  ${cmd.summary}\n`)
    return EXIT.SUCCESS
  }

  // All commands are stubs in this scaffold
  stderr('NOT_IMPLEMENTED [pcc-scaffold 0.1.0]\n')
  return EXIT.USAGE_ERROR
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const thisFile = fileURLToPath(import.meta.url)
if (resolve(process.argv[1] ?? '') === resolve(thisFile)) {
  process.exitCode = run(process.argv.slice(2))
}
