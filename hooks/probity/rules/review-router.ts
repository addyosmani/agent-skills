import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'

import {
  DEFAULT_NON_CODE,
  DEFAULT_TEST_PATHS,
  type ReviewConfig,
} from './review-config.js'
import type { ReviewedExemption } from './review-obligations.js'
import { isWithin } from './commit-target.js'
import { anchorGlob, buildMatcher } from './scoping.js'

/**
 * Deterministic review routing (issue #181): maps a diff to the review
 * agents it warrants, using the project's configured routes and no model
 * tokens. The same router backs `probity-review-route` and the merge
 * gate's `requireRoutedAgents` check.
 */

/** A diff, by repo-relative path. */
export type DiffInput = {
  /** Every changed file, deleted ones included. */
  files: string[]
  /** Added lines per file, without the leading `+`. */
  added: Record<string, string[]>
  /** Files whose change is binary: never grepped, never code. */
  binary: string[]
}

export type RoutedAgent = { agent: string; why: string[] }
/** An obligation (#181) the diff incurs: a changed file sits in its exemption. */
export type IncurredObligation = Omit<ReviewedExemption, 'glob'> & { files: string[] }
export type Routing = { agents: RoutedAgent[]; obligations?: IncurredObligation[] }

/** A persona's bare name: `agent-skills:code-reviewer` → `code-reviewer`. */
export function bareAgent(agent: string): string {
  return agent.slice(agent.lastIndexOf(':') + 1)
}

function test(pattern: RegExp, text: string): boolean {
  pattern.lastIndex = 0 // a /g or /y route must not carry state between lines
  return pattern.test(text)
}

/**
 * Routes `input`. `top` is the repository root (absolute); route,
 * ignore and obligation globs are anchored at `config.root`, resolved
 * against it. Each obligation a changed file falls under adds its
 * `reviewWith` agent; obligations never suppress the fallback.
 */
export function routeReview(
  config: ReviewConfig,
  input: DiffInput,
  top: string,
  obligations: readonly ReviewedExemption[] = [],
): Routing {
  const root = config.root === undefined ? top : isAbsolute(config.root) ? config.root : resolve(top, config.root)
  const absolute = (file: string) => `${top.replace(/\/$/, '')}/${file}`
  const matcher = (globs: string[]) => buildMatcher(globs.map((glob) => anchorGlob(glob, root)))
  const ignored = config.ignore?.length ? matcher(config.ignore) : () => false
  const testPaths = config.testPaths ?? DEFAULT_TEST_PATHS
  const nonCode = config.nonCode ?? DEFAULT_NON_CODE
  const binary = new Set(input.binary)

  const files = input.files.filter((file) => !ignored(absolute(file)))
  const isCode = (file: string) => !binary.has(file) && !test(nonCode, file)
  const isProd = (file: string) => isCode(file) && !test(testPaths, file)

  const found = new Map<string, RoutedAgent>()
  const add = (agent: string, why?: string) => {
    const key = bareAgent(agent)
    const entry = found.get(key) ?? { agent, why: [] }
    if (why && !entry.why.includes(why)) entry.why.push(why)
    found.set(key, entry)
  }

  for (const route of config.routes ?? []) {
    const byPath = route.paths?.length
      ? files.some((file) => matcher(route.paths!)(absolute(file)))
      : false
    const inScope = route.lines === 'code' ? isCode : isProd
    const byLine =
      route.added !== undefined &&
      files.some(
        (file) =>
          inScope(file) &&
          (input.added[file] ?? []).some(
            (line) => test(route.added!, line) && !(route.notAdded && test(route.notAdded, line)),
          ),
      )
    if (byPath || byLine) add(route.agent, route.why)
  }

  if (found.size === 0 && files.some(isProd)) {
    for (const agent of config.fallback ?? []) add(agent, 'no specific trigger; default pass for source changes')
  }
  const incurred: IncurredObligation[] = []
  for (const { glob, ...obligation } of obligations) {
    const inExemption = matcher([glob.replace(/^!/, '')])
    const hit = files.filter((file) => inExemption(absolute(file)))
    if (hit.length === 0) continue
    incurred.push({ ...obligation, files: hit })
    add(obligation.reviewWith, `obligation ${obligation.id}: ${obligation.check}`)
  }
  if (files.length > 0) for (const agent of config.always ?? []) add(agent, 'runs on every change')

  const agents = [...found.values()].sort((a, b) => bareAgent(a.agent).localeCompare(bareAgent(b.agent)))
  return { agents, obligations: incurred }
}

/**
 * A warning when `config.root` lies outside the repository at `top`, as
 * when an absolute root names the main checkout but the router runs in
 * another worktree: changed files then resolve under `top`, every path
 * route, ignore and obligation glob is anchored elsewhere, and all of
 * them silently match nothing.
 */
export function rootWarning(config: ReviewConfig, top: string): string | undefined {
  if (config.root === undefined) return undefined
  const root = isAbsolute(config.root) ? config.root : resolve(top, config.root)
  if (isWithin(top, root)) return undefined
  return (
    `review.root (${root}) is outside the repository being routed (${top}), so no path route, ignore ` +
    'or obligation glob can match. In another worktree, set root relative to the repository, or derive it from the config file\'s location.'
  )
}

/** `text`: one `agent|why; why` line per agent. `json`: the routing object. */
export function formatRouting(routing: Routing & { base?: string }, format: 'text' | 'json'): string {
  if (format === 'json') return `${JSON.stringify(routing, null, 2)}\n`
  return routing.agents.map(({ agent, why }) => `${agent}|${why.join('; ')}\n`).join('')
}

// --- collecting the diff ----------------------------------------------------

const DIFF_FLAGS = ['--no-color', '--no-ext-diff', '--no-textconv', '--no-renames']

function git(top: string, args: string[]): string {
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd: top,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
}

function unquote(path: string): string {
  return path.startsWith('"') ? JSON.parse(path) : path
}

/** Added lines per file from a `-U0` patch; header lines (`+++ b/…`) are not content. */
export function parsePatch(patch: string, into: Record<string, string[]>): void {
  let file: string | undefined
  let inHeader = false
  for (const raw of patch.split('\n')) {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
    if (line.startsWith('diff --git ')) {
      inHeader = true
      file = undefined
    } else if (inHeader) {
      if (line.startsWith('+++ ')) {
        const target = unquote(line.slice(4))
        file = target === '/dev/null' ? undefined : target.replace(/^b\//, '')
      } else if (line.startsWith('@@')) {
        inHeader = false
      }
    } else if (line.startsWith('+') && file !== undefined) {
      ;(into[file] ??= []).push(line.slice(1))
    }
  }
}

function binaryFromNumstat(numstat: string): string[] {
  return numstat
    .split('\n')
    .filter((line) => line.startsWith('-\t-\t'))
    .map((line) => unquote(line.slice(4)))
}

const lines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

/**
 * The diff to route, from git. With `head`: the committed change from
 * `base` to `head` only. Without: `base` against the working tree plus
 * the index, and untracked non-ignored files unless `includeUntracked`
 * is false (as homelab's review-router.sh did).
 */
export function collectDiff(
  top: string,
  options: { base: string; head?: string; includeUntracked?: boolean },
): DiffInput {
  const ranges = options.head !== undefined ? [[options.base, options.head]] : [[options.base], ['--cached']]
  const files = new Set<string>()
  const added: Record<string, string[]> = {}
  const binary = new Set<string>()
  for (const range of ranges) {
    for (const file of lines(git(top, ['diff', '--name-only', '--no-renames', ...range]))) files.add(unquote(file))
    for (const file of binaryFromNumstat(git(top, ['diff', '--numstat', '--no-renames', ...range]))) binary.add(file)
    parsePatch(git(top, ['diff', ...DIFF_FLAGS, '-U0', ...range]), added)
  }
  if (options.head === undefined && options.includeUntracked !== false) {
    for (const file of git(top, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)) {
      files.add(file)
      let content: Buffer
      try {
        content = readFileSync(join(top, file))
      } catch {
        continue
      }
      if (content.subarray(0, 8000).includes(0)) {
        binary.add(file)
        continue
      }
      const text = content.toString('utf8').replace(/\r\n/g, '\n')
      added[file] = (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n')
    }
  }
  return { files: [...files], added, binary: [...binary] }
}

/** merge-base(HEAD, origin/<main>), else merge-base(HEAD, <main>), else HEAD. */
export function defaultBase(top: string, mainBranch = 'main'): string {
  for (const ref of [`origin/${mainBranch}`, mainBranch]) {
    try {
      return git(top, ['merge-base', 'HEAD', ref]).trim()
    } catch {
      // try the next candidate
    }
  }
  return 'HEAD'
}

export function gitTop(dir: string): string {
  return git(dir, ['rev-parse', '--show-toplevel']).trim()
}
