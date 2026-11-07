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
 *                             [--config probity.config.ts] [--root .]
 *                             [--all-first-parent]
 *
 * Checks every merge commit on the first-parent line of the range (the
 * merges INTO the branch) whose own diff (first parent → merge) touches
 * `review.record.enforceForPaths`. `--all-first-parent` also checks
 * non-merge first-parent commits, for squash-merge workflows. Choose
 * the base to start from adoption: earlier merges are not judged.
 *
 * Exit codes: 0 all records valid, 1 a record is missing or malformed,
 * 2 usage or config error.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { createJiti } from 'jiti'

import type { ReviewConfig } from '../rules/review-config.js'
import { parseReviewRecord } from '../rules/review-record.js'

const jiti = createJiti(import.meta.url)

type Args = { range?: string; config?: string; root: string; allFirstParent: boolean }

function usage(message: string): never {
  console.error(`${message}\nUsage: probity-review-record --range <base>..<head> [--config <path>] [--root <dir>] [--all-first-parent]`)
  process.exit(2)
}

function parseArgs(argv: string[]): Args {
  const out: Args = { root: process.cwd(), allFirstParent: false }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--range') out.range = argv[++i]
    else if (argv[i] === '--config') out.config = argv[++i]
    else if (argv[i] === '--root') out.root = resolve(argv[++i] ?? '.')
    else if (argv[i] === '--all-first-parent') out.allFirstParent = true
    else usage(`Unknown argument: ${argv[i]}`)
  }
  if (!out.range) usage('--range is required')
  return out
}

const args = parseArgs(process.argv.slice(2))
const configPath =
  args.config ??
  ['probity.config.ts', 'probity.config.mts', 'probity.config.js', 'probity.config.mjs']
    .map((name) => join(args.root, name))
    .find(existsSync)
if (!configPath) usage(`No probity.config.{ts,mts,js,mjs} in ${args.root}`)

const module = await jiti.import<{ review?: ReviewConfig }>(resolve(configPath))
const review = module.review
if (!review) {
  usage(`${configPath} has no review settings. Add: export const review = reviewConfig({ record: { … } })`)
}
const enforce = review.record?.enforceForPaths

const git = (...gitArgs: string[]): string =>
  execFileSync('git', gitArgs, { cwd: args.root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim()

const revListArgs = ['rev-list', '--first-parent', '--reverse', ...(args.allFirstParent ? [] : ['--merges']), args.range!]
let commits: string[]
try {
  commits = git(...revListArgs).split('\n').filter(Boolean)
} catch {
  usage(`git could not list the range ${args.range}`)
}

let checked = 0
const failures: string[] = []
for (const commit of commits) {
  const files = git('diff', '--name-only', `${commit}^1`, commit).split('\n').filter(Boolean)
  if (enforce && !files.some((file) => enforce.test(file))) continue
  checked++
  const record = parseReviewRecord(git('log', '-1', '--format=%B', commit))
  if (record.errors.length > 0) {
    const subject = git('log', '-1', '--format=%h %s', commit)
    failures.push(`${subject}\n  - ${record.errors.join('\n  - ')}`)
  }
}

if (failures.length > 0) {
  console.log(`Review record missing or malformed on ${failures.length} of ${checked} checked commit(s):\n`)
  console.log(failures.join('\n\n'))
  process.exit(1)
}
console.log(`Review record valid on all ${checked} checked commit(s) in ${args.range}.`)
