/**
 * `approval <show|approve|reject> <slug|path>` - the CLI surface (coordinator
 * ruling Q6, matching the shipped `routing-policy`/`receipts` precedent):
 * `process.argv` parsing, `process.exitCode`, exit codes `0` success / `1`
 * semantic-or-validation failure / `2` usage error (missing/unreadable path,
 * bad invocation, non-TTY approve).
 *
 * `show` - renders the tree, read-only, mints nothing; safe in CI / non-TTY.
 * `approve` - renders the tree, then requires BOTH an interactive TTY and a
 * matching typed confirmation (the exact slug, ruling F2) before minting the
 * genesis/Stage-A receipt and writing the approval record. There is NO
 * `--yes`/`--force`/auto-approve flag of any kind (Q6) - a non-TTY `approve`
 * refuses with exit code 2 and writes nothing (no receipt, no approval
 * record - checked BEFORE any mint/write is attempted, so the human-gate
 * checks are the only path to the mint/write step below).
 * `reject` - records a rejection with a reason but mints no receipt and
 * produces no `approvedHash` binding.
 *
 * `--repo-root <path>` (optional, all three verbs): overrides the repo root
 * every library call below resolves paths against (defaults to
 * `DEFAULT_REPO_ROOT`). Purely a filesystem-location override - it never
 * touches approval authorization, the TTY check, or the confirmation check.
 */
import { performApproval } from './approve-flow.js'
import { confirmationMatches, isInteractiveTty, promptForConfirmation } from './confirm.js'
import { type RejectionRecord, writeRejectionRecord } from './rejection-record.js'
import { renderTree } from './render.js'
import { resolveArtifact } from './resolve-input.js'
import { computeApprovalSubject } from './subject.js'

interface Flags {
  readonly [name: string]: string | undefined
}

function parseFlags(args: readonly string[]): Flags {
  const flags: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === undefined || !a.startsWith('--')) continue
    const name = a.slice(2)
    const next = args[i + 1]
    if (next === undefined || next.startsWith('--')) {
      flags[name] = ''
      continue
    }
    flags[name] = next
    i++
  }
  return flags
}

async function runShow(arg: string, flags: Flags): Promise<number> {
  try {
    const resolved = resolveArtifact(arg, {
      epicTitle: flags['epic-title'],
      repoRoot: flags['repo-root'],
    })
    process.stdout.write(`${renderTree(resolved.projectedResult)}\n`)
    return 0
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`)
    return 2
  }
}

async function runApprove(arg: string, flags: Flags): Promise<number> {
  const repoRoot = flags['repo-root']
  let resolved: ReturnType<typeof resolveArtifact>
  try {
    resolved = resolveArtifact(arg, { epicTitle: flags['epic-title'], repoRoot })
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`)
    return 2
  }

  process.stdout.write(`${renderTree(resolved.projectedResult)}\n`)

  const approver = flags.approver
  if (approver === undefined || approver.trim().length === 0) {
    process.stderr.write('error: approve requires --approver <name>\n')
    return 2
  }

  // Human-gate check 1 of 2 (Q6/AC8): a live interactive TTY. No flag, no
  // environment variable can substitute. Refuses BEFORE any mint/write.
  if (!isInteractiveTty()) {
    process.stderr.write(
      'error: approve requires an interactive TTY; refusing (no receipt, no approval record written)\n',
    )
    return 2
  }

  // Human-gate check 2 of 2 (Q6/AC8/F2): a typed confirmation matching the
  // exact slug, linear-time exact-string comparison. Still before any write.
  const typed = await promptForConfirmation(resolved.slug)
  if (!confirmationMatches(typed, resolved.slug)) {
    process.stderr.write(
      'error: typed confirmation did not match the slug; refusing (no receipt, no approval record written)\n',
    )
    return 1
  }

  // Both human-gate checks passed - this is the ONLY call site in the
  // package that reaches receipt-mint + approval-record write (via
  // `performApproval`, which also owns the record-before-receipt durability
  // ordering and refuse-to-overwrite check).
  try {
    const { record, receiptPath } = performApproval(resolved, approver, repoRoot)
    process.stdout.write(
      `approved: ${resolved.slug}\n  approvedHash: ${record.approvedHash}\n  receipt: ${receiptPath}\n`,
    )
    return 0
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`)
    return 1
  }
}

async function runReject(arg: string, flags: Flags): Promise<number> {
  const repoRoot = flags['repo-root']
  let resolved: ReturnType<typeof resolveArtifact>
  try {
    resolved = resolveArtifact(arg, { epicTitle: flags['epic-title'], repoRoot })
  } catch (err) {
    process.stderr.write(`error: ${(err as Error).message}\n`)
    return 2
  }

  process.stdout.write(`${renderTree(resolved.projectedResult)}\n`)

  const { approvedHash } = computeApprovalSubject(resolved.projectedResult, repoRoot)
  const reason = flags.reason === undefined ? null : flags.reason
  const timestamp = new Date().toISOString()
  const record: RejectionRecord = {
    decision: 'rejected',
    reason,
    timestamp,
    referenceHash: approvedHash,
  }
  writeRejectionRecord(resolved.slug, record, repoRoot)
  process.stdout.write(`rejected: ${resolved.slug}\n`)
  return 0
}

async function main(argv: readonly string[]): Promise<number> {
  const [command, arg, ...rest] = argv
  if (arg === undefined || (command !== 'show' && command !== 'approve' && command !== 'reject')) {
    process.stderr.write(
      'usage: approval <show|approve|reject> <slug|path> [--epic-title <title>] [--approver <name>] [--reason <text>] [--repo-root <path>]\n',
    )
    return 2
  }

  const flags = parseFlags(rest)
  if (command === 'show') return runShow(arg, flags)
  if (command === 'approve') return runApprove(arg, flags)
  return runReject(arg, flags)
}

process.exitCode = await main(process.argv.slice(2))
