#!/usr/bin/env node
/**
 * Deterministic review routing (issue #181): prints the review agents a
 * diff warrants, from the routes in probity.config.ts's
 * `export const review`. Zero model tokens; a drop-in for a project's own
 * grep-based router hook.
 *
 *   npx probity-review-route [--base <ref>] [--format text|json]
 *                            [--config <path>] [--root <dir>]
 *
 * The base defaults to merge-base(HEAD, origin/<mainBranch>), then
 * merge-base(HEAD, <mainBranch>), then HEAD. The diff is the base
 * against the working tree and index, plus untracked files unless
 * `includeUntracked: false`.
 *
 * Text output is one `agent|why; why` line per agent. When nothing is
 * warranted, stdout is empty and a note goes to stderr. Exit codes: 0 ok,
 * 2 usage, config or git error.
 */
import { resolve } from 'node:path'

import { obligationsOf } from '../rules/review-obligations.js'
import { collectDiff, defaultBase, formatRouting, gitTop, routeReview } from '../rules/review-router.js'
import { loadReview } from './load-review.js'

type Args = { base?: string; format: 'text' | 'json'; config?: string; root: string }

function usage(message: string): never {
  console.error(`${message}\nUsage: probity-review-route [--base <ref>] [--format text|json] [--config <path>] [--root <dir>]`)
  process.exit(2)
}

const args: Args = { format: 'text', root: process.cwd() }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--base') args.base = argv[++i]
  else if (argv[i] === '--config') args.config = argv[++i]
  else if (argv[i] === '--root') args.root = resolve(argv[++i] ?? '.')
  else if (argv[i] === '--format') {
    const format = argv[++i]
    if (format !== 'text' && format !== 'json') usage(`--format must be text or json, not ${format}`)
    args.format = format
  } else usage(`Unknown argument: ${argv[i]}`)
}

let loaded
try {
  loaded = await loadReview(args.root, args.config)
} catch (error) {
  usage(error instanceof Error ? error.message : String(error))
}
const { review } = loaded

let top: string
try {
  top = gitTop(args.root)
} catch {
  usage(`${args.root} is not inside a git repository`)
}
const base = args.base ?? defaultBase(top, review.mainBranch)
let routing
try {
  const input = collectDiff(top, { base, includeUntracked: review.includeUntracked })
  routing = routeReview(review, input, top, obligationsOf(loaded.config?.rules ?? []))
} catch (error) {
  usage(`git could not diff against ${base} (${error instanceof Error ? error.message : String(error)})`)
}

if (args.format === 'json') {
  process.stdout.write(formatRouting({ base, ...routing }, 'json'))
} else if (routing.agents.length === 0) {
  console.error(`no review agents warranted for the diff against ${base} (no route fired, and no production code changed)`)
} else {
  process.stdout.write(formatRouting(routing, 'text'))
}
