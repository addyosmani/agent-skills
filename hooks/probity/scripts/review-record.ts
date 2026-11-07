#!/usr/bin/env node
/**
 * CI backstop for the review record (issue #178). The PreToolUse gate
 * (`requireReviewRecord`) only sees merges an agent runs; this checks
 * history, so it also covers merges made in a web UI, by a human, as a
 * squash, or hidden inside a script.
 *
 * Usage (from the project root, next to probity.config.ts):
 *
 *   npx probity-review-record --range <base>..<head>
 *                             [--routed-range <before>..<head>]
 *                             [--config probity.config.ts] [--root .]
 *                             [--all-first-parent]
 *
 * --range: every merge commit on the first-parent line (the merges INTO
 * the branch) whose own diff (first parent → merge) touches
 * `review.record.enforceForPaths` must carry a valid record. Start it at
 * adoption: earlier merges are not judged. `--all-first-parent` also
 * checks non-merge first-parent commits, for squash-merge workflows.
 *
 * --routed-range (issue #181): with `record.requireRoutedAgents`, the
 * commits in this range must also list every agent the CURRENT routes
 * select for their diff. Give it only the newly pushed commits
 * (`${{ github.event.before }}..HEAD`): re-routing old merges with
 * today's routes would fail every merge made before a route was added.
 * An all-zero start (a new branch or force push) skips these checks.
 *
 * Exit codes: 0 all records valid, 1 a record is missing, malformed or
 * incomplete, 2 usage or config error.
 */
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

import { obligationsOf } from '../rules/review-obligations.js'
import { missingObligations, missingRoutedAgents, parseReviewRecord } from '../rules/review-record.js'
import { collectDiff, routeReview } from '../rules/review-router.js'
import { loadReview } from './load-review.js'

type Args = { range?: string; routedRange?: string; config?: string; root: string; allFirstParent: boolean }

function usage(message: string): never {
  console.error(
    `${message}\nUsage: probity-review-record --range <base>..<head> [--routed-range <before>..<head>] ` +
      '[--config <path>] [--root <dir>] [--all-first-parent]',
  )
  process.exit(2)
}

function parseArgs(argv: string[]): Args {
  const out: Args = { root: process.cwd(), allFirstParent: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--range') out.range = argv[++i]
    else if (argv[i] === '--routed-range') out.routedRange = argv[++i]
    else if (argv[i] === '--config') out.config = argv[++i]
    else if (argv[i] === '--root') out.root = resolve(argv[++i] ?? '.')
    else if (argv[i] === '--all-first-parent') out.allFirstParent = true
    else usage(`Unknown argument: ${argv[i]}`)
  }
  if (!out.range) usage('--range is required')
  return out
}

const args = parseArgs(process.argv.slice(2))
let loaded
try {
  loaded = await loadReview(args.root, args.config)
} catch (error) {
  usage(error instanceof Error ? error.message : String(error))
}
const { review } = loaded
const obligations = obligationsOf(loaded.config?.rules ?? [])
const routedChecks = Boolean(review.record?.requireRoutedAgents || review.record?.requireObligations)
const enforce = review.record?.enforceForPaths

const git = (...gitArgs: string[]): string =>
  execFileSync('git', gitArgs, {
    cwd: args.root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()

function firstParentCommits(range: string): string[] {
  const revList = ['rev-list', '--first-parent', '--reverse', ...(args.allFirstParent ? [] : ['--merges']), range]
  try {
    return git(...revList).split('\n').filter(Boolean)
  } catch {
    usage(`git could not list the range ${range} (in CI, check out full history: fetch-depth: 0)`)
  }
}

const touchesEnforced = (commit: string): boolean => {
  if (!enforce) return true
  return git('diff', '--name-only', `${commit}^1`, commit).split('\n').some((file) => enforce.test(file))
}

let routed: Set<string> = new Set()
const notes: string[] = []
if (args.routedRange) {
  if (!routedChecks) {
    notes.push('--routed-range given but neither requireRoutedAgents nor requireObligations is on: routed checks skipped.')
  } else if (/^0+\.\./.test(args.routedRange)) {
    notes.push(`--routed-range ${args.routedRange} starts at the all-zero commit (new branch or force push): routed checks skipped.`)
  } else {
    routed = new Set(firstParentCommits(args.routedRange))
  }
}

const top = git('rev-parse', '--show-toplevel')
let checked = 0
const failures: string[] = []
for (const commit of firstParentCommits(args.range!)) {
  if (!touchesEnforced(commit)) continue
  checked++
  const record = parseReviewRecord(git('log', '-1', '--format=%B', commit))
  const problems = [...record.errors]
  if (problems.length === 0 && routed.has(commit)) {
    const input = collectDiff(top, { base: `${commit}^1`, head: commit })
    const routing = routeReview(review, input, top, obligations)
    if (review.record?.requireRoutedAgents) problems.push(...missingRoutedAgents(record, routing))
    if (review.record?.requireObligations) problems.push(...missingObligations(record, routing))
  }
  if (problems.length > 0) {
    const subject = git('log', '-1', '--format=%h %s', commit)
    failures.push(`${subject}\n  - ${problems.join('\n  - ')}`)
  }
}

for (const note of notes) console.log(note)
if (failures.length > 0) {
  console.log(`Review record missing, malformed or incomplete on ${failures.length} of ${checked} checked commit(s):\n`)
  console.log(failures.join('\n\n'))
  process.exit(1)
}
console.log(`Review record valid on all ${checked} checked commit(s) in ${args.range}.`)
