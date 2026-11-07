import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { basename, isAbsolute, resolve } from 'node:path'

import type { Rule, RuleEntry, RuleResult } from '@nizos/probity'

import { gitSubcommand } from './commit-target.js'
import { DEFAULT_PROTECTED_BRANCHES, type ReviewConfig } from './review-config.js'
import { obligationsOf, type ReviewedExemption } from './review-obligations.js'
import { bareAgent, collectDiff, gitTop, parsePatch, routeReview, type DiffInput, type Routing } from './review-router.js'
import { COMMAND_PREFIXES, parseShell, type SimpleCommand } from './shell-writes.js'

/**
 * Review record (issue #178): a merge into a protected branch carries git
 * trailers naming every review agent considered, so a merge that was
 * reviewed and found clean no longer looks the same as one never
 * reviewed. Grammar, one line per agent, in the message's last paragraph:
 *
 *   Reviewed-by-agent: <agent> (ran, <N> findings[, <M> fixed])
 *   Reviewed-by-agent: <agent> (skipped: <reason>)
 *   Review-obligation: <id> (addressed by <agent>)
 *   Visual-check: ran (<what was captured>)
 *   Visual-check: skipped: <reason>
 *
 * The same parser backs the PreToolUse gate below and the CI checker
 * (scripts/review-record.ts), so both read a record identically.
 */

export type AgentEntry =
  | { agent: string; status: 'ran'; findings: number; fixed?: number }
  | { agent: string; status: 'skipped'; reason: string }

export type ReviewRecord = {
  agents: AgentEntry[]
  obligations: { id: string; addressedBy: string }[]
  visualChecks: string[]
  /** Every problem found; empty means the record is valid. */
  errors: string[]
}

const AGENT_KEY = 'reviewed-by-agent'
const OBLIGATION_KEY = 'review-obligation'
const VISUAL_KEY = 'visual-check'
const NAME = '[a-z0-9][a-z0-9-]*'
// A persona as launched: bare (`code-reviewer`) or with its plugin
// prefix (`agent-skills:code-reviewer`). Recorded by the bare name, so
// the record and the router compare one canonical form.
const AGENT = `(?:${NAME}:)?(${NAME})`
const AGENT_VALUE = new RegExp(
  `^${AGENT} \\((?:ran, (\\d+) findings?(?:, (\\d+) fixed)?|skipped: (\\S.*))\\)$`,
)
const OBLIGATION_VALUE = new RegExp(`^(${NAME}) \\(addressed by ${AGENT}\\)$`)
const VISUAL_VALUE = /^(?:ran \(.+\)|skipped: \S.*)$/

export const RECORD_TEMPLATE = [
  'Reviewed-by-agent: <agent> (ran, <N> findings)',
  'Reviewed-by-agent: <agent> (ran, <N> findings, <M> fixed)',
  'Reviewed-by-agent: <agent> (skipped: <reason>)',
].join('\n')

/** Parses the review trailers in a commit message's last paragraph. */
export function parseReviewRecord(message: string): ReviewRecord {
  const record: ReviewRecord = { agents: [], obligations: [], visualChecks: [], errors: [] }
  const paragraphs = message.trim().split(/\n[ \t]*\n/)
  const last = paragraphs.length > 1 ? paragraphs[paragraphs.length - 1]! : ''
  for (const raw of last.split('\n')) {
    const line = raw.trim()
    const match = line.match(/^([A-Za-z0-9-]+):\s*(.*)$/)
    if (!match) continue
    const key = match[1]!.toLowerCase()
    const value = match[2]!.trim()
    if (key === AGENT_KEY) {
      const parsed = value.match(AGENT_VALUE)
      if (!parsed) {
        record.errors.push(`malformed reviewer line: \`${line}\``)
      } else if (record.agents.some((entry) => entry.agent === parsed[1])) {
        record.errors.push(`\`${parsed[1]}\` is listed more than once`)
      } else if (parsed[4] !== undefined) {
        record.agents.push({ agent: parsed[1]!, status: 'skipped', reason: parsed[4] })
      } else {
        const entry: AgentEntry = { agent: parsed[1]!, status: 'ran', findings: Number(parsed[2]) }
        if (parsed[3] !== undefined) entry.fixed = Number(parsed[3])
        record.agents.push(entry)
      }
    } else if (key === OBLIGATION_KEY) {
      const parsed = value.match(OBLIGATION_VALUE)
      if (parsed) record.obligations.push({ id: parsed[1]!, addressedBy: parsed[2]! })
      else record.errors.push(`malformed obligation line: \`${line}\``)
    } else if (key === VISUAL_KEY) {
      if (VISUAL_VALUE.test(value)) record.visualChecks.push(value)
      else record.errors.push(`malformed visual-check line: \`${line}\``)
    }
  }
  const malformedAgent = record.errors.some((error) => error.startsWith('malformed reviewer line'))
  if (record.agents.length === 0 && !malformedAgent) {
    const earlier = paragraphs.slice(0, -1).some((paragraph) => /^\s*reviewed-by-agent:/im.test(paragraph))
    record.errors.unshift(
      earlier
        ? 'the Reviewed-by-agent trailers are not in the last paragraph; put them in one final block with ' +
            'any other trailers (Co-Authored-By, Signed-off-by), with no blank line between'
        : 'no Reviewed-by-agent trailer in the last paragraph of the message',
    )
  }
  return record
}

// `$(cat <<'EOF' … EOF)`: the usual way an agent passes a multi-line -m.
const HEREDOC_SUBSTITUTION = /^\$\(\s*cat\s+<<-?\s*(['"]?)(\w+)\1\n([\s\S]*?)\n\2\s*\)$/

function unwrap(value: string): string {
  return value.match(HEREDOC_SUBSTITUTION)?.[3] ?? value
}

/**
 * The message a `merge` (args from the subcommand on) records: repeated
 * `-m` values joined as paragraphs, as git does, or the `-F` file read
 * relative to `dir`. Undefined when neither is given.
 */
export function mergeMessage(args: string[], dir: string): string | undefined {
  const messages: string[] = []
  let file: string | undefined
  for (let k = 1; k < args.length; k++) {
    const arg = args[k]!
    if (arg === '-m' || arg === '--message') messages.push(unwrap(args[++k] ?? ''))
    else if (arg.startsWith('--message=')) messages.push(unwrap(arg.slice('--message='.length)))
    else if (/^-m./.test(arg)) messages.push(unwrap(arg.slice(2)))
    else if (arg === '-F' || arg === '--file') file = args[++k]
    else if (arg.startsWith('--file=')) file = arg.slice('--file='.length)
  }
  if (messages.length > 0) return messages.join('\n\n')
  if (file === '-') return undefined // git merge has no stdin form; the gate names this
  return file === undefined ? undefined : readMessageFile(file, dir, [])
}

/** A message file, or the heredoc on stdin for `-`. Undefined if unreadable. */
function readMessageFile(file: string, dir: string, stdin: string[]): string | undefined {
  if (file === '-') return stdin[0] // gh reads stdin; git merge never reaches here (see mergeMessage)
  try {
    return readFileSync(isAbsolute(file) ? file : resolve(dir, file), 'utf8')
  } catch {
    return undefined
  }
}

// Options of `git merge` that take the next word as their value.
const MERGE_VALUE_OPTIONS = new Set([
  '-m', '--message', '-F', '--file', '-s', '--strategy', '-X', '--strategy-option', '--cleanup', '--into-name',
])

function mergeBranches(args: string[]): string[] {
  const branches: string[] = []
  for (let k = 1; k < args.length; k++) {
    const arg = args[k]!
    if (MERGE_VALUE_OPTIONS.has(arg)) k++
    else if (!arg.startsWith('-')) branches.push(arg)
  }
  return branches
}

/** Git and GitHub lookups the gate makes; injectable for tests. */
export type ReviewRecordGit = {
  currentBranch(dir: string): string
  /** Repo-relative files the merge would bring in. */
  mergeFiles(dir: string, branches: string[]): string[]
  wouldFastForward(dir: string, branches: string[]): boolean
  prFiles(pr: string | undefined, dir: string): string[]
  prBase(pr: string | undefined, dir: string): string
}

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}
const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

export const defaultReviewRecordGit: ReviewRecordGit = {
  currentBranch: (dir) => run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], dir),
  mergeFiles: (dir, branches) => [
    ...new Set(branches.flatMap((branch) => lines(run('git', ['diff', '--name-only', `HEAD...${branch}`], dir)))),
  ],
  wouldFastForward(dir, branches) {
    if (branches.length !== 1) return false
    try {
      if (run('git', ['config', '--get', 'merge.ff'], dir) === 'false') return false
    } catch {
      // unset: git's default allows fast-forward
    }
    try {
      run('git', ['merge-base', '--is-ancestor', 'HEAD', branches[0]!], dir)
      return true
    } catch {
      return false
    }
  },
  prFiles: (pr, dir) => lines(run('gh', ['pr', 'diff', ...(pr ? [pr] : []), '--name-only'], dir)),
  prBase: (pr, dir) => run('gh', ['pr', 'view', ...(pr ? [pr] : []), '--json', 'baseRefName', '-q', '.baseRefName'], dir),
}

type Merge = {
  kind: 'git' | 'gh'
  dir: string
  args: string[]
  stdin: string[]
}

/** The `git merge` / `gh pr merge` invocations in a shell command, with the directory each runs in. */
function findMerges(command: string): Merge[] {
  const merges: Merge[] = []
  let dir = process.cwd()
  for (const simple of parseShell(command)) {
    const words = skipPrefixes(simple)
    const name = basename(words[0] ?? '')
    if (name === 'cd' && words[1]) {
      dir = isAbsolute(words[1]) ? words[1] : resolve(dir, words[1])
      continue
    }
    if (name === 'git' && gitSubcommand(words.slice(1)) === 'merge') {
      const index = words.indexOf('merge')
      const dashC = words.slice(1, index).indexOf('-C')
      const target = dashC >= 0 ? words[dashC + 2]! : undefined
      const mergeDir = target ? (isAbsolute(target) ? target : resolve(dir, target)) : dir
      merges.push({ kind: 'git', dir: mergeDir, args: words.slice(index), stdin: simple.stdin })
    } else if (name === 'gh' && words[1] === 'pr' && words[2] === 'merge') {
      merges.push({ kind: 'gh', dir, args: words.slice(2), stdin: simple.stdin })
    }
  }
  return merges
}

function skipPrefixes(simple: SimpleCommand): string[] {
  let k = 0
  const words = simple.words
  while (k < words.length && (/^[A-Za-z_]\w*=/.test(words[k]!) || COMMAND_PREFIXES.has(words[k]!))) k++
  return words.slice(k)
}

function ghBody(args: string[], dir: string, stdin: string[]): string | undefined {
  for (let k = 1; k < args.length; k++) {
    const arg = args[k]!
    if (arg === '-b' || arg === '--body') return unwrap(args[k + 1] ?? '')
    if (arg.startsWith('--body=')) return unwrap(arg.slice('--body='.length))
    if (arg === '-F' || arg === '--body-file' || arg.startsWith('--body-file=')) {
      const file = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : args[k + 1]
      return file ? readMessageFile(file, dir, stdin) : undefined
    }
  }
  return undefined
}

function ghPr(args: string[]): string | undefined {
  const GH_VALUE = new Set(['-b', '--body', '-F', '--body-file', '-t', '--subject', '-A', '--author-email', '--match-head-commit', '-R', '--repo'])
  for (let k = 1; k < args.length; k++) {
    const arg = args[k]!
    if (GH_VALUE.has(arg)) k++
    else if (!arg.startsWith('-')) return arg
  }
  return undefined
}

function violation(target: string, problems: string[]): RuleResult {
  return {
    kind: 'violation',
    reason:
      `Merging into ${target} needs a review record (code-review-and-quality, "Review Record"). ` +
      'Put one trailer per reviewer you considered, ran or skipped, in the LAST paragraph of the merge ' +
      'message (-m or -F), in the same block as any Co-Authored-By line:' +
      `\n${RECORD_TEMPLATE}\nProblems: ${problems.join('; ')}.`,
  }
}

/** Routed agents (#181) the record doesn't list, ran or skipped, as problems. */
export function missingRoutedAgents(record: ReviewRecord, routing: Routing): string[] {
  const listed = new Set(record.agents.map((entry) => entry.agent))
  return routing.agents
    .filter(({ agent }) => !listed.has(bareAgent(agent)))
    .map(({ agent, why }) => `the router selected \`${agent}\` (${why.join('; ')}) but the record does not list it; run it, or list it as (skipped: <reason>)`)
}

/** Incurred obligations (#181) the record doesn't address, as problems. */
export function missingObligations(record: ReviewRecord, routing: Routing): string[] {
  return (routing.obligations ?? []).flatMap((obligation) => {
    const reviewer = bareAgent(obligation.reviewWith)
    const files = obligation.files.join(', ')
    const line = record.obligations.find((entry) => entry.id === obligation.id)
    if (!line) {
      return [
        `the diff touches files exempt under obligation \`${obligation.id}\` (${files}); ${reviewer} must confirm: ` +
          `${obligation.check}. Then add \`Review-obligation: ${obligation.id} (addressed by ${reviewer})\``,
      ]
    }
    if (line.addressedBy !== reviewer) {
      return [`obligation ${obligation.id} must be addressed by ${reviewer}, not ${line.addressedBy}`]
    }
    const entry = record.agents.find((agent) => agent.agent === reviewer)
    if (!entry) return [`obligation ${obligation.id} names ${reviewer}, but the record has no Reviewed-by-agent line for it`]
    if (entry.status === 'skipped') return [`obligation ${obligation.id} needs ${reviewer} to run, but ${reviewer} is recorded as skipped`]
    return []
  })
}

/** Routes what `git merge <branches>` brings in: merge-base(HEAD, branch)..branch. */
function defaultRouteMerge(
  review: ReviewConfig,
  obligations: readonly ReviewedExemption[],
): (dir: string, branches: string[]) => Routing {
  return (dir, branches) => {
    const top = gitTop(dir)
    const input: DiffInput = { files: [], added: {}, binary: [] }
    for (const branch of branches) {
      const base = execFileSync('git', ['merge-base', 'HEAD', branch], { cwd: top, encoding: 'utf8' }).trim()
      const part = collectDiff(top, { base, head: branch })
      input.files.push(...part.files.filter((file) => !input.files.includes(file)))
      input.binary.push(...part.binary)
      for (const [file, lines] of Object.entries(part.added)) (input.added[file] ??= []).push(...lines)
    }
    return routeReview(review, input, top, obligations)
  }
}

/** Routes a PR from `gh pr diff` (no binary detection: gh's patch omits it). */
function defaultRoutePr(
  review: ReviewConfig,
  git: ReviewRecordGit,
  obligations: readonly ReviewedExemption[],
): (pr: string | undefined, dir: string) => Routing {
  return (pr, dir) => {
    const added: Record<string, string[]> = {}
    parsePatch(run('gh', ['pr', 'diff', ...(pr ? [pr] : [])], dir), added)
    return routeReview(review, { files: git.prFiles(pr, dir), added, binary: [] }, gitTop(dir), obligations)
  }
}

/**
 * Denies a merge into a protected branch whose message lacks a valid
 * review record. Sibling of `requireGreenTestRun`: scoped by
 * `record.enforceForPaths` against the files the merge brings in, and
 * any error listing those files enforces (fail safe).
 *
 * Gated: `git merge` run directly (after `cd`, or with `git -C`) and
 * `gh pr merge` (record in `--body`/`--body-file`). Not gated:
 * `--squash`, `--no-commit`, `--abort`/`--continue`/`--quit`, and a
 * merge hidden inside `bash -c` or a script; the CI checker
 * (`probity-review-record`) is the backstop for those and for merges
 * made outside an agent session.
 */
export function requireReviewRecord(
  review: ReviewConfig,
  deps: {
    git?: ReviewRecordGit
    routeMerge?: (dir: string, branches: string[]) => Routing
    routePr?: (pr: string | undefined, dir: string) => Routing
    /** The rule entries whose exemption obligations apply (a preset's
     *  output); needed for `record.requireObligations`. */
    obligationsFrom?: readonly RuleEntry[]
  } = {},
): Rule {
  const git = deps.git ?? defaultReviewRecordGit
  const obligations = deps.obligationsFrom ? obligationsOf(deps.obligationsFrom) : []
  const routeMerge = deps.routeMerge ?? defaultRouteMerge(review, obligations)
  const routePr = deps.routePr ?? defaultRoutePr(review, git, obligations)
  const options = review.record ?? {}
  const protectedBranches = options.protectedBranches ?? DEFAULT_PROTECTED_BRANCHES
  /** Record errors, plus routed agents it misses when requireRoutedAgents is on. */
  const problems = (record: ReviewRecord, route: () => Routing): string[] => {
    if (record.errors.length > 0 || !(options.requireRoutedAgents || options.requireObligations)) return record.errors
    if (options.requireObligations && !deps.obligationsFrom) {
      return ['record.requireObligations is on, but the rule has no obligations to check: use requireReviewRecord(review, { obligationsFrom: <your rule entries> })']
    }
    try {
      const routing = route()
      return [
        ...(options.requireRoutedAgents ? missingRoutedAgents(record, routing) : []),
        ...(options.requireObligations ? missingObligations(record, routing) : []),
      ]
    } catch (error) {
      return [`could not route the merge to check its reviewers (${error instanceof Error ? error.message : String(error)})`]
    }
  }
  const touchesEnforced = (list: () => string[]): boolean => {
    if (!options.enforceForPaths) return true
    try {
      return list().some((file) => options.enforceForPaths!.test(file))
    } catch {
      return true
    }
  }

  return async function requireReviewRecord(action): Promise<RuleResult> {
    if (action.kind !== 'command' || !/\bmerge\b/.test(action.command)) return { kind: 'pass' }
    for (const merge of findMerges(action.command)) {
      const result = merge.kind === 'git' ? judgeGitMerge(merge) : judgeGhMerge(merge)
      if (result) return result
    }
    return { kind: 'pass' }
  }

  function judgeGitMerge({ dir, args }: Merge): RuleResult | undefined {
    if (args.some((arg) => /^--(abort|continue|quit|squash|no-commit)$/.test(arg))) return undefined
    let branch: string | undefined
    try {
      branch = git.currentBranch(dir)
    } catch {
      branch = undefined // unknown: enforce (fail safe)
    }
    if (branch !== undefined && !protectedBranches.includes(branch)) return undefined
    const target = branch ?? 'the current branch'
    const branches = mergeBranches(args)
    const incoming = branches.length > 0 ? branches : ['@{upstream}']
    if (!touchesEnforced(() => git.mergeFiles(dir, incoming))) return undefined
    const noFf = args.includes('--no-ff')
    if (args.includes('--ff-only') || (!noFf && safeFastForward(dir, incoming))) {
      return violation(target, [
        'a fast-forward merge creates no commit to hold the record; merge with `git merge --no-ff <branch> -m "…"`',
      ])
    }
    const message = mergeMessage(args, dir)
    if (message === undefined) {
      const stdinFile = args.some((arg, k) => (arg === '-F' || arg === '--file') && args[k + 1] === '-') || args.includes('--file=-')
      return violation(target, [
        stdinFile
          ? 'git merge cannot read -F - (it fails with "could not read file \'-\'"); write the message to a file for -F <file>, or pass it with -m'
          : 'no -m or -F message given',
      ])
    }
    const found = problems(parseReviewRecord(message), () => routeMerge(dir, incoming))
    return found.length > 0 ? violation(target, found) : undefined
  }

  function judgeGhMerge({ dir, args, stdin }: Merge): RuleResult | undefined {
    const pr = ghPr(args)
    let base: string | undefined
    try {
      base = git.prBase(pr, dir)
    } catch {
      base = undefined // unknown: enforce (fail safe)
    }
    if (base !== undefined && !protectedBranches.includes(base)) return undefined
    if (!touchesEnforced(() => git.prFiles(pr, dir))) return undefined
    const target = base ?? 'a protected branch'
    const body = ghBody(args, dir, stdin)
    if (body === undefined) return violation(target, ['no --body or --body-file given'])
    const found = problems(parseReviewRecord(body), () => routePr(pr, dir))
    return found.length > 0 ? violation(target, found) : undefined
  }

  function safeFastForward(dir: string, branches: string[]): boolean {
    try {
      return git.wouldFastForward(dir, branches)
    } catch {
      return false
    }
  }
}
