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
  /** Repo-relative files the merge would bring in. `head` is the branch the
   *  merge lands on: `HEAD`, or the branch a `git switch` earlier in the same
   *  command moves to (#195). */
  mergeFiles(dir: string, branches: string[], head?: string): string[]
  wouldFastForward(dir: string, branches: string[], head?: string): boolean
  prFiles(pr: string | undefined, dir: string): string[]
  prBase(pr: string | undefined, dir: string): string
  /** glab (#193): the MR's target branch, files, and the target project's
   *  merge method ('merge' | 'rebase_merge' | 'ff'). Optional so existing
   *  custom adapters still type-check; missing ones use the glab defaults. */
  mrBase?(mr: string | undefined, repo: string | undefined, dir: string): string
  mrFiles?(mr: string | undefined, repo: string | undefined, dir: string): string[]
  mrMergeMethod?(mr: string | undefined, repo: string | undefined, dir: string): string
}

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
}
const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

export const defaultReviewRecordGit: ReviewRecordGit = {
  currentBranch: (dir) => run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], dir),
  mergeFiles: (dir, branches, head = 'HEAD') => [
    ...new Set(branches.flatMap((branch) => lines(run('git', ['diff', '--name-only', `${head}...${branch}`], dir)))),
  ],
  wouldFastForward(dir, branches, head = 'HEAD') {
    if (branches.length !== 1) return false
    try {
      if (run('git', ['config', '--get', 'merge.ff'], dir) === 'false') return false
    } catch {
      // unset: git's default allows fast-forward
    }
    try {
      run('git', ['merge-base', '--is-ancestor', head, branches[0]!], dir)
      return true
    } catch {
      return false
    }
  },
  prFiles: (pr, dir) => lines(run('gh', ['pr', 'diff', ...(pr ? [pr] : []), '--name-only'], dir)),
  prBase: (pr, dir) => run('gh', ['pr', 'view', ...(pr ? [pr] : []), '--json', 'baseRefName', '-q', '.baseRefName'], dir),
}

/** `glab mr <sub> [<mr>] [-R <repo>] <extra>` as an argv. */
const glabArgs = (sub: string, mr: string | undefined, repo: string | undefined, extra: string[]) => [
  'mr',
  sub,
  ...(mr ? [mr] : []),
  ...(repo ? ['-R', repo] : []),
  ...extra,
]
const mrView = (mr: string | undefined, repo: string | undefined, dir: string) =>
  JSON.parse(run('glab', glabArgs('view', mr, repo, ['-F', 'json']), dir)) as Record<string, unknown>

export const defaultGlab = {
  mrBase: (mr: string | undefined, repo: string | undefined, dir: string) => String(mrView(mr, repo, dir).target_branch),
  mrFiles: (mr: string | undefined, repo: string | undefined, dir: string) =>
    patchFiles(run('glab', glabArgs('diff', mr, repo, ['--raw']), dir)),
  mrMergeMethod(mr: string | undefined, repo: string | undefined, dir: string) {
    const project = mrView(mr, repo, dir).target_project_id
    const info = JSON.parse(run('glab', ['api', `projects/${String(project)}`], dir)) as { merge_method?: string }
    return String(info.merge_method)
  },
}

/**
 * Repo-relative files a raw git patch (`glab mr diff --raw`) touches, in
 * order: a deletion by its old path, a rename by its new one.
 */
export function patchFiles(patch: string): string[] {
  const files: string[] = []
  let header: string | undefined
  let from: string | undefined
  let to: string | undefined
  const flush = () => {
    if (header === undefined) return
    const fromHeader = / b\/(.*)$/.exec(header)?.[1]
    const file = to ?? from ?? fromHeader
    if (file && !files.includes(file)) files.push(file)
    header = from = to = undefined
  }
  for (const raw of patch.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (line.startsWith('diff --git ')) {
      flush()
      header = line
    } else if (header !== undefined) {
      if (line.startsWith('rename to ')) to = unquotePath(line.slice('rename to '.length))
      else if (line.startsWith('--- a/') || line.startsWith('--- "a/')) from = unquotePath(line.slice(4)).replace(/^a\//, '')
      else if (line.startsWith('+++ ')) {
        const target = unquotePath(line.slice(4))
        if (target !== '/dev/null') to = target.replace(/^b\//, '')
      } else if (line.startsWith('@@')) flush()
    }
  }
  flush()
  return files
}

const unquotePath = (path: string) => (path.startsWith('"') ? (JSON.parse(path) as string) : path)

type Merge = {
  kind: 'git' | 'gh' | 'glab'
  dir: string
  args: string[]
  stdin: string[]
  /** git merges after a `git switch`/`git checkout` in the same command:
   *  the branch switched to (`null` when unknown, e.g. `git switch -`) and
   *  the ref to diff from. */
  switched?: Switch
}

type Switch = { branch: string | null; head: string }

/**
 * The branch a `git switch` / `git checkout` argv (from the subcommand on)
 * moves to, or undefined when it doesn't switch branches (a path checkout).
 */
function branchSwitch(args: string[]): Switch | undefined {
  const sub = args[0]
  if (args.includes('--')) return undefined // checkout [<tree>] -- <paths>
  const CREATE = sub === 'switch' ? ['-c', '-C', '--create', '--force-create', '--orphan'] : ['-b', '-B', '--orphan']
  const VALUE = new Set(['--conflict', '--pathspec-from-file'])
  const positional: string[] = []
  let created: string | undefined
  for (let k = 1; k < args.length; k++) {
    const arg = args[k]!
    if (CREATE.includes(arg)) created = args[++k]
    else if (VALUE.has(arg)) k++
    else if (arg === '-d' || arg === '--detach') return { branch: 'HEAD', head: 'HEAD' }
    else if (arg === '-' || !arg.startsWith('-')) positional.push(arg)
  }
  if (created !== undefined) return { branch: created, head: positional[0] ?? 'HEAD' }
  if (positional.length !== 1) return undefined // checkout <tree> <paths>, or nothing to switch to
  const target = positional[0]!
  return target === '-' ? { branch: null, head: '@{-1}' } : { branch: target, head: target }
}

/** The `git merge` / `gh pr merge` invocations in a shell command, with the directory each runs in. */
function findMerges(command: string): Merge[] {
  const merges: Merge[] = []
  const switched = new Map<string, Switch>()
  let dir = process.cwd()
  for (const simple of parseShell(command)) {
    const words = skipPrefixes(simple)
    const name = basename(words[0] ?? '')
    if (name === 'cd' && words[1]) {
      dir = isAbsolute(words[1]) ? words[1] : resolve(dir, words[1])
      continue
    }
    const sub = name === 'git' ? gitSubcommand(words.slice(1)) : undefined
    if (sub === 'merge' || sub === 'switch' || sub === 'checkout') {
      const index = words.indexOf(sub)
      const dashC = words.slice(1, index).indexOf('-C')
      const target = dashC >= 0 ? words[dashC + 2]! : undefined
      const gitDir = target ? (isAbsolute(target) ? target : resolve(dir, target)) : dir
      if (sub === 'merge') {
        merges.push({ kind: 'git', dir: gitDir, args: words.slice(index), stdin: simple.stdin, switched: switched.get(gitDir) })
      } else {
        const move = branchSwitch(words.slice(index))
        if (move) switched.set(gitDir, move)
      }
    } else if (name === 'gh' && words[1] === 'pr' && words[2] === 'merge') {
      merges.push({ kind: 'gh', dir, args: words.slice(2), stdin: simple.stdin })
    } else if (name === 'glab' && words[1] === 'mr' && (words[2] === 'merge' || words[2] === 'accept')) {
      merges.push({ kind: 'glab', dir, args: words.slice(2), stdin: simple.stdin })
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

const GLAB_VALUE = new Set(['-m', '--message', '--sha', '--squash-message', '-R', '--repo'])

/** The MR (id or branch), -R repo and -m message of a `glab mr merge` argv. */
function glabMerge(args: string[]): { mr?: string; repo?: string; message?: string } {
  const out: { mr?: string; repo?: string; message?: string } = {}
  for (let k = 1; k < args.length; k++) {
    const arg = args[k]!
    const eq = arg.indexOf('=')
    const flag = arg.startsWith('--') && eq > 0 ? arg.slice(0, eq) : arg
    const value = flag !== arg ? arg.slice(eq + 1) : GLAB_VALUE.has(arg) ? args[++k] : undefined
    if (flag === '-m' || flag === '--message') out.message = unwrap(value ?? '')
    else if (flag === '-R' || flag === '--repo') out.repo = value
    else if (!arg.startsWith('-') && out.mr === undefined) out.mr = arg
  }
  return out
}

function violation(target: string, problems: string[]): RuleResult {
  return {
    kind: 'violation',
    reason:
      `Merging into ${target} needs a review record (code-review-and-quality, "Review Record"). ` +
      'Put one trailer per reviewer you considered, ran or skipped, in the LAST paragraph of the merge ' +
      'message (git merge -m/-F, gh pr merge --body, glab mr merge -m), in the same block as any Co-Authored-By line:' +
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

/** Routes what `git merge <branches>` brings in: merge-base(head, branch)..branch. */
function defaultRouteMerge(
  review: ReviewConfig,
  obligations: readonly ReviewedExemption[],
): (dir: string, branches: string[], head?: string) => Routing {
  return (dir, branches, head = 'HEAD') => {
    const top = gitTop(dir)
    const input: DiffInput = { files: [], added: {}, binary: [] }
    for (const branch of branches) {
      const base = execFileSync('git', ['merge-base', head, branch], { cwd: top, encoding: 'utf8' }).trim()
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

/** Routes an MR from `glab mr diff --raw`. */
function defaultRouteMr(
  review: ReviewConfig,
  obligations: readonly ReviewedExemption[],
): (mr: string | undefined, repo: string | undefined, dir: string) => Routing {
  return (mr, repo, dir) => {
    const patch = run('glab', glabArgs('diff', mr, repo, ['--raw']), dir)
    const added: Record<string, string[]> = {}
    parsePatch(patch, added)
    return routeReview(review, { files: patchFiles(patch), added, binary: [] }, gitTop(dir), obligations)
  }
}

/**
 * Denies a merge into a protected branch whose message lacks a valid
 * review record. Sibling of `requireGreenTestRun`: scoped by
 * `record.enforceForPaths` against the files the merge brings in, and
 * any error listing those files enforces (fail safe).
 *
 * Gated: `git merge` run directly (after `cd`, or with `git -C`) and
 * `gh pr merge` (record in `--body`/`--body-file`), and `glab mr merge`
 * or `glab mr accept` (record in `-m`/`--message`; denied when the GitLab
 * project merges fast-forward, which makes no merge commit). Not gated:
 * `--squash`, `--no-commit`, `--abort`/`--continue`/`--quit`, and a
 * merge hidden inside `bash -c` or a script; the CI checker
 * (`probity-review-record`) is the backstop for those and for merges
 * made outside an agent session.
 */
export function requireReviewRecord(
  review: ReviewConfig,
  deps: {
    git?: ReviewRecordGit
    routeMerge?: (dir: string, branches: string[], head?: string) => Routing
    routePr?: (pr: string | undefined, dir: string) => Routing
    routeMr?: (mr: string | undefined, repo: string | undefined, dir: string) => Routing
    /** The rule entries whose exemption obligations apply (a preset's
     *  output); needed for `record.requireObligations`. */
    obligationsFrom?: readonly RuleEntry[]
  } = {},
): Rule {
  const git = deps.git ?? defaultReviewRecordGit
  const obligations = deps.obligationsFrom ? obligationsOf(deps.obligationsFrom) : []
  const routeMerge = deps.routeMerge ?? defaultRouteMerge(review, obligations)
  const routePr = deps.routePr ?? defaultRoutePr(review, git, obligations)
  const routeMr = deps.routeMr ?? defaultRouteMr(review, obligations)
  const glab = {
    mrBase: git.mrBase ?? defaultGlab.mrBase,
    mrFiles: git.mrFiles ?? defaultGlab.mrFiles,
    mrMergeMethod: git.mrMergeMethod ?? defaultGlab.mrMergeMethod,
  }
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
    if (action.kind !== 'command' || !/\b(merge|accept)\b/.test(action.command)) return { kind: 'pass' }
    for (const merge of findMerges(action.command)) {
      const result =
        merge.kind === 'git' ? judgeGitMerge(merge) : merge.kind === 'gh' ? judgeGhMerge(merge) : judgeGlabMerge(merge)
      if (result) return result
    }
    return { kind: 'pass' }
  }

  function judgeGitMerge({ dir, args, switched }: Merge): RuleResult | undefined {
    if (args.some((arg) => /^--(abort|continue|quit|squash|no-commit)$/.test(arg))) return undefined
    let branch: string | undefined
    if (switched) {
      branch = switched.branch ?? undefined // switched to an unknown branch: enforce (fail safe)
    } else {
      try {
        branch = git.currentBranch(dir)
      } catch {
        branch = undefined // unknown: enforce (fail safe)
      }
    }
    if (branch !== undefined && !protectedBranches.includes(branch)) return undefined
    const target = branch ?? 'the current branch'
    const head = switched?.head ?? 'HEAD'
    const branches = mergeBranches(args)
    const incoming = branches.length > 0 ? branches : [head === 'HEAD' ? '@{upstream}' : `${head}@{upstream}`]
    if (!touchesEnforced(() => git.mergeFiles(dir, incoming, head))) return undefined
    const noFf = args.includes('--no-ff')
    if (args.includes('--ff-only') || (!noFf && safeFastForward(dir, incoming, head))) {
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
    const found = problems(parseReviewRecord(message), () => routeMerge(dir, incoming, head))
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

  function judgeGlabMerge({ dir, args }: Merge): RuleResult | undefined {
    const { mr, repo, message } = glabMerge(args)
    let base: string | undefined
    try {
      base = glab.mrBase(mr, repo, dir)
    } catch {
      base = undefined // unknown: enforce (fail safe)
    }
    if (base !== undefined && !protectedBranches.includes(base)) return undefined
    if (!touchesEnforced(() => glab.mrFiles(mr, repo, dir))) return undefined
    const target = base ?? 'a protected branch'
    let method: string | undefined
    try {
      method = glab.mrMergeMethod(mr, repo, dir)
    } catch {
      method = undefined // unreadable: judge the message; CI checks the result
    }
    if (method === 'ff') {
      return violation(target, [
        "the GitLab project merges fast-forward, so no merge commit holds the record; set Settings → Merge requests → Merge method to 'Merge commit' or 'Merge commit with semi-linear history'",
      ])
    }
    if (message === undefined) return violation(target, ['no -m/--message given (glab uses it as the merge commit message)'])
    const found = problems(parseReviewRecord(message), () => routeMr(mr, repo, dir))
    return found.length > 0 ? violation(target, found) : undefined
  }

  function safeFastForward(dir: string, branches: string[], head: string): boolean {
    try {
      return git.wouldFastForward(dir, branches, head)
    } catch {
      return false
    }
  }
}
