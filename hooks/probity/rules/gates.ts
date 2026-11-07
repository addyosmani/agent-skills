import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import type { Action, Rule, RuleContext, RuleResult } from '@nizos/probity'

import {
  canonical,
  commitDirectory,
  gitToplevel,
  isGitCommit,
  leadingCdDirectory,
  nestedCommitTree,
  owningTree,
  splitTopLevelCommands,
  worktreeRoots,
} from './commit-target.js'
import { withJudgeTask } from './judge-task.js'

/**
 * Language-neutral gate rules. These accumulated in the Kotlin preset
 * (`kotlin.ts`) because that's where the real-project trials happened,
 * but nothing in them is Kotlin-specific — they take every
 * language-shaped decision (what a test command looks like, what an
 * ambient-effect call looks like) as a pattern option. This module is
 * their canonical home; `kotlin.ts` re-exports wrappers that apply the
 * Kotlin/Gradle defaults, so existing preset configs are unchanged.
 *
 * All rules here are deterministic — no AI call — and delta-based
 * where they judge file content: only what a write INTRODUCES blocks,
 * so brownfield files migrate incrementally instead of freezing.
 */

/** A labeled content pattern; the label names the hit in deny text. */
export type NamedPattern = { label: string; pattern: RegExp }

function countMatches(content: string, pattern: RegExp): number {
  let count = 0
  for (const _ of content.matchAll(pattern)) count++
  return count
}

/** Patterns whose occurrence count grows from before → after. */
export async function introducedPatterns(
  action: { path: string; content: string },
  ctx: RuleContext | undefined,
  patterns: NamedPattern[],
): Promise<string[]> {
  const hits = patterns.filter(
    ({ pattern }) => countMatches(action.content, pattern) > 0,
  )
  if (hits.length === 0) return []
  const before = await ctx?.readFile?.(action.path)
  const beforeContent = before?.kind === 'present' ? before.content : ''
  return hits
    .filter(
      ({ pattern }) =>
        countMatches(action.content, pattern) >
        countMatches(beforeContent, pattern),
    )
    .map(({ label }) => label)
}

/**
 * Ambient-effect calls for a JS/TS core: OS clock, randomness, and
 * environment reads. Pass to {@link forbidNewAmbientEffects} from a
 * JS/TS config. `process.env` reads belong in the composition root or
 * a config adapter; if your core legitimately branches on injected
 * config, that config should arrive through a port, not the OS.
 */
export const JS_AMBIENT_EFFECT_PATTERNS: NamedPattern[] = [
  { label: 'Date.now()', pattern: /\bDate\.now\s*\(/g },
  { label: 'new Date() (argless)', pattern: /\bnew\s+Date\s*\(\s*\)/g },
  { label: 'Math.random()', pattern: /\bMath\.random\s*\(/g },
  { label: 'crypto.randomUUID()', pattern: /\bcrypto\.randomUUID\s*\(/g },
  { label: 'randomUUID()', pattern: /\brandomUUID\s*\(/g },
  { label: 'process.env', pattern: /\bprocess\.env\b/g },
]

/**
 * Blocks production writes that introduce direct ambient-effect calls.
 * Under ports-and-adapters these are unowned OS dependencies: clock,
 * randomness, and environment are ports.
 *
 * Delta-based: pre-existing call sites in a brownfield codebase don't
 * block edits to their files; only net-new occurrences do. Scope to
 * production sources — tests and adapter implementations (e.g. a
 * `SystemClock`) legitimately touch the real OS, so exclude adapter
 * paths via globs or negations.
 *
 * @param options.patterns — what an ambient-effect call looks like in
 *   your language ({@link JS_AMBIENT_EFFECT_PATTERNS} for JS/TS; the
 *   Kotlin preset supplies JVM patterns). Each RegExp needs `g`.
 * @param options.seamHint — appended to the block message to point
 *   the agent at the project's canonical seam(s), e.g.
 *   "inject the Clock port from src/ports/clock.ts".
 */
export function forbidNewAmbientEffects(options: {
  patterns: NamedPattern[]
  seamHint?: string
}): Rule {
  return async function forbidNewAmbientEffects(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const introduced = await introducedPatterns(action, ctx, options.patterns)
    if (introduced.length === 0) return { kind: 'pass' }
    const hint = options.seamHint ? ` ${options.seamHint}.` : ''
    return {
      kind: 'violation',
      reason:
        `This write introduces direct ambient-effect calls (${introduced.join(
          ', ',
        )}). Clock, randomness, and environment are unowned OS ` +
        'dependencies: reach them through a port injected into this ' +
        `code, implemented by a thin adapter.${hint} Existing call ` +
        'sites in the file are untouched by this rule — only new ones ' +
        'are blocked.',
    }
  }
}

/**
 * Fixed waits for a JS/TS acceptance suite: Playwright's
 * `waitForTimeout`, timer-based sleeps, Cypress's numeric `cy.wait`,
 * sleep helpers, and WebdriverIO's `browser.pause`. Pass to
 * {@link forbidNewFixedWaits}.
 */
export const JS_FIXED_WAIT_PATTERNS: NamedPattern[] = [
  { label: 'waitForTimeout()', pattern: /\bwaitForTimeout\s*\(/g },
  { label: 'setTimeout()', pattern: /\bsetTimeout\s*\(/g },
  { label: 'cy.wait(<ms>)', pattern: /\bcy\.wait\s*\(\s*\d/g },
  { label: 'sleep()', pattern: /\bsleep\s*\(/g },
  { label: 'browser.pause()', pattern: /\bbrowser\.pause\s*\(/g },
]

/** Blanks comments so a wait named in prose doesn't count as a call.
 *  Naive about strings: a `//` inside a string literal hides the rest
 *  of its line, which can only make the screen miss, never misfire. */
function withoutComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ' ')
}

/**
 * Blocks acceptance-suite writes that introduce a fixed wait (issue
 * #119). A sleep postpones a race instead of fixing it and wastes time
 * on every passing run: protocol drivers wait for the concluding
 * event through one poll-with-timeout helper. Scope it to the whole
 * acceptance suite (scenarios, DSL, and drivers), and exempt that one
 * helper with a `!` glob.
 *
 * Delta-based like {@link forbidNewAmbientEffects}: waits already in a
 * file don't block edits to it; only new ones do. Waits named in
 * comments don't count.
 */
export function forbidNewFixedWaits(options: { patterns: NamedPattern[] }): Rule {
  return async function forbidNewFixedWaits(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const uncommented: RuleContext = {
      ...ctx,
      readFile: async (path) => {
        const before = await ctx?.readFile?.(path)
        return before?.kind === 'present'
          ? { ...before, content: withoutComments(before.content) }
          : (before ?? { kind: 'absent' })
      },
    }
    const introduced = await introducedPatterns(
      { path: action.path, content: withoutComments(action.content) },
      uncommented,
      options.patterns,
    )
    if (introduced.length === 0) return { kind: 'pass' }
    return {
      kind: 'violation',
      reason:
        `This write adds a fixed wait to the acceptance suite (${introduced.join(', ')}). ` +
        'A sleep postpones a race instead of fixing it, and costs its ' +
        'full delay on every passing run. Wait for the concluding event ' +
        'instead: poll for the observable outcome with a generous ' +
        "timeout through the suite's one poll helper, so the test is " +
        'fast when the system is fast and tolerant when it is slow. ' +
        'To move time forward, advance a test clock behind the clock ' +
        'port. Waits already in the file are untouched by this rule — ' +
        'only new ones are blocked (see the acceptance-testing skill, ' +
        'Test Isolation).',
    }
  }
}

/**
 * Files the pending commit will record, relative to the root of the
 * tree being committed (`cwd`). Reads the
 * staged set (`git diff --cached --name-only`); for a `git commit`
 * with `-a`/`-am`/`--all` it also folds in modified-but-unstaged
 * tracked files. Throws if git is unavailable — callers fail safe.
 */
function defaultListCommitFiles(command: string, cwd = process.cwd()): string[] {
  const run = (args: string[]): string[] =>
    execFileSync('git', args, { cwd, encoding: 'utf8' })
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
  const files = run(['diff', '--cached', '--name-only'])
  if (/\s-\w*a\w*\b/.test(command) || /--all\b/.test(command)) {
    for (const file of run(['diff', '--name-only'])) {
      if (!files.includes(file)) files.push(file)
    }
  }
  return files
}

// Probity's transcript reader refuses files over 100 MiB and throws
// "file at <path> exceeds <n> bytes" from ctx.history() (issue #54).
const TRANSCRIPT_TOO_LARGE = /^file at (.+) exceeds (\d+) bytes$/

/**
 * Turns Probity's "transcript too large" error into a deny that names
 * the cause and the fix; rethrows any other error, so the engine still
 * fails closed on it. Without this, the engine reports the oversized
 * transcript as an opaque `rule error` on every history-based rule
 * until the session is restarted (issue #54). `probity-claude` avoids
 * the limit by handing Probity the transcript's newest part.
 */
export function transcriptLimitViolation(error: unknown): RuleResult {
  const match =
    error instanceof Error ? error.message.match(TRANSCRIPT_TOO_LARGE) : null
  if (!match) throw error
  const limitMiB = Math.round(Number(match[2]) / (1024 * 1024))
  return {
    kind: 'violation',
    reason:
      `Probity could not read this session's transcript (${match[1]}): ` +
      `it is larger than Probity's ${limitMiB} MiB limit, so this check ` +
      'cannot see the session history and stays blocked (fail closed). ' +
      'This is not a judgement of your change. Fix: run the hook through ' +
      "@jjchill/probity-rules' probity-claude bin (0.4.9 or later), which " +
      'reads only the newest part of a long transcript, or start a new ' +
      'session. Do not bypass the hook.',
  }
}

/**
 * Commit-on-green, strictly: Probity's `requireCommand` checks only
 * that a matching test invocation was *recorded* after the last write
 * and would happily pass a transcript whose latest run FAILED. This
 * rule additionally judges the recorded run's output: the last
 * matching test command after the last write must look green
 * (`successPattern` present, `failurePattern` absent).
 *
 * Inherent limit (unchanged from requireCommand): the gate sees only
 * the session transcript. A green run in another terminal, CI, or a
 * wrapper script is invisible — rerun the suite in-session, and keep
 * the CI mirror for human commits.
 *
 * Applies to: `git commit` commands, including `git -C <dir> commit`
 * and `git -c key=value commit`. Deterministic — no AI call.
 *
 * @param options.command — regex matching a test invocation.
 * @param options.commandPredicate — optional additive filter over the
 *   raw command string: a recorded command counts only when both the
 *   regex matches AND this returns true. Narrows, never widens, what
 *   the regex accepts — lets a language preset layer a structural
 *   parse on top of a broad regex.
 * @param options.successPattern — output must match to count as green.
 * @param options.extraSuccessPredicate — optional command-aware extra
 *   way to count a matched run as green (e.g. a structured exit-status
 *   envelope the runner's own text banner wouldn't contain). Receives
 *   the matched run's command and output. A run is green if EITHER
 *   `successPattern` matches OR this returns true — but
 *   `failurePattern`/`extraFailurePredicate` still win over both.
 * @param options.failurePattern — output matching this is red even if
 *   the success pattern also appears.
 * @param options.extraFailurePredicate — optional command-aware extra
 *   way to mark a matched run red (e.g. a structured exit-status
 *   envelope reporting nonzero/malformed with no failure TEXT).
 *   Receives the matched run's command and output; wins over both
 *   `successPattern` and `extraSuccessPredicate`.
 * @param options.enforceForPaths — only demand the run when the
 *   pending commit stages a file whose repo-relative path matches.
 *   Scopes an expensive suite to the code it covers — infra/docs-only
 *   commits pay no friction. Commit-accurate (reads git's staged set,
 *   not session history); any listing error falls through to
 *   enforcing (fail safe).
 * @param options.listCommitFiles — injectable staged-file lister
 *   (defaults to reading git's staged set); present for testing. Its
 *   second argument is the root of the tree being committed.
 * @param options.reason — appended to either deny path to name the
 *   suite, accepted forms, and any setup it needs.
 */
export function requireGreenTestRun(options: {
  command: RegExp
  commandPredicate?: (command: string) => boolean
  successPattern: RegExp
  extraSuccessPredicate?: (command: string, output: string) => boolean
  failurePattern: RegExp
  extraFailurePredicate?: (command: string, output: string) => boolean
  enforceForPaths?: RegExp
  listCommitFiles?: (command: string, cwd: string) => string[]
  reason?: string
}): Rule {
  const listCommitFiles = options.listCommitFiles ?? defaultListCommitFiles
  return async function requireGreenTestRun(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'command') return { kind: 'pass' }
    if (!isGitCommit(action.command)) return { kind: 'pass' }
    // Scope the gate to commits that stage code the suite validates.
    // On any error listing files, fall through and enforce (fail safe).
    if (options.enforceForPaths) {
      const pattern = options.enforceForPaths
      // A commit inside a git tree nested in the project (a linked
      // worktree at .claude/worktrees/<name>) is scoped by that tree's
      // staged files, not the project's (issue #63).
      const cwd = process.cwd()
      const tree = nestedCommitTree(action.command, gitToplevel(cwd) ?? cwd) ?? cwd
      let files: string[] | undefined
      try {
        files = listCommitFiles(action.command, tree)
      } catch {
        files = undefined
      }
      if (files && !files.some((file) => pattern.test(file))) {
        return { kind: 'pass' }
      }
    }
    let history
    try {
      history = (await ctx?.history?.()) ?? []
    } catch (error) {
      return transcriptLimitViolation(error)
    }
    // With several worktrees of one repo in a session, a write or a run
    // that is placed in a different worktree says nothing about this
    // commit (issue #152). A run places itself only by a leading absolute
    // `cd`; anything not placed still counts, so the gate fails closed.
    const commitTree = canonical(
      gitToplevel(commitDirectory(action.command)) ?? gitToplevel(process.cwd()) ?? process.cwd(),
    )
    const roots = worktreeRoots(commitTree)
    const elsewhere = (path: string | null): boolean => {
      if (path === null || roots.length < 2) return false
      const owner = owningTree(path, roots)
      return owner !== null && owner !== commitTree
    }
    const lastWrite = history.reduce(
      (last, event, index) => (event.kind === 'write' && !elsewhere(event.path) ? index : last),
      -1,
    )
    const runs = history.filter(
      (event, index) =>
        index > lastWrite &&
        event.kind === 'command' &&
        !elsewhere(leadingCdDirectory(event.command)) &&
        options.command.test(event.command) &&
        (!options.commandPredicate || options.commandPredicate(event.command)),
    )
    const extra = options.reason ? ` ${options.reason}` : ''
    if (runs.length === 0) {
      return {
        kind: 'violation',
        reason:
          'Run the test suite after the last change before committing ' +
          `(see test-driven-development: commit only on green).${extra}`,
      }
    }
    const lastRun = runs[runs.length - 1]!
    if (!isGreenRun(lastRun, options)) {
      // Name the run, so a surprising deny shows which one was judged (issue #138).
      const judged = ` Judged run: \`${shortened(lastRun.kind === 'command' ? lastRun.command : '')}\``
      if (!isRedRun(lastRun, options)) {
        // Issue #162: a passing run piped through grep/head/tail loses the
        // summary line, and "not green" sent the agent hunting for failures.
        return {
          kind: 'violation',
          reason:
            'The last recorded test run after your changes shows no failure, but ' +
            "its output has no runner summary line matching " +
            `\`${options.successPattern.source}\`, so it can't count as green. ` +
            'Output filtered or cut short (`| grep`, `| head`, `| tail`) drops ' +
            'that line: rerun the suite with its summary in the output, then ' +
            `commit.${extra}${judged}`,
        }
      }
      return {
        kind: 'violation',
        reason:
          'The last recorded test run after your changes was not ' +
          'green — a recorded invocation is not a passing suite. Fix ' +
          `the failures (or the build) and rerun before committing.${extra}${judged}`,
      }
    }
    return { kind: 'pass' }
  }
}

const JUDGED_COMMAND_EXCERPT = 200

function shortened(command: string): string {
  const line = command.trim().replace(/\s+/g, ' ')
  return line.length > JUDGED_COMMAND_EXCERPT ? `${line.slice(0, JUDGED_COMMAND_EXCERPT)}…` : line
}

// Probity doesn't export its canonical event type; derive it from the context.
type SessionEvent = Awaited<ReturnType<NonNullable<RuleContext['history']>>>[number]

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'yarn', 'bun'])
const PACKAGE_RUNNERS = new Set(['npx', 'bunx'])
const JS_RUNNER = /^(?:[\w./-]*\/)?(?:vitest|jest)$/

/**
 * Whether a shell command runs a JS/TS test suite: one of its top-level
 * commands (split on `;`, `&&`, `||`, `|` and newlines, quote-aware)
 * starts with `npm test`/`npm t`/`npm run test[:…]` (or pnpm, yarn, bun)
 * or the vitest or jest binary, directly or through npx. A command that
 * only mentions a runner (`echo vitest`, an issue body, `npm install -D
 * vitest`) is not a run (issue #150). For `requireGreenTestRun`'s
 * `commandPredicate`; the JS preset uses it with its default command.
 */
export function isJsTestInvocation(command: string): boolean {
  return splitTopLevelCommands(command).some((segment) => {
    const words = segment.trim().split(/\s+/).filter(Boolean)
    if (words[0] === 'env') words.shift()
    while (words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0]!)) words.shift()
    const [first = '', second = '', third = ''] = words
    if (PACKAGE_MANAGERS.has(first)) {
      if (second === 'test' || second === 't') return true
      if (second === 'run') return /^test(?::[\w:-]+)?$/.test(third)
      if (first === 'pnpm' && (second === 'exec' || second === 'dlx')) return JS_RUNNER.test(third)
      return first === 'yarn' && JS_RUNNER.test(second)
    }
    if (PACKAGE_RUNNERS.has(first)) return JS_RUNNER.test(second)
    return JS_RUNNER.test(first)
  })
}

/** How a test or build run is recognized and judged green, shared by the gates below. */
export type GreenRunOptions = {
  command: RegExp
  commandPredicate?: (command: string) => boolean
  successPattern: RegExp
  extraSuccessPredicate?: (command: string, output: string) => boolean
  failurePattern: RegExp
  extraFailurePredicate?: (command: string, output: string) => boolean
}

function isMatchingRun(event: SessionEvent, options: GreenRunOptions): boolean {
  return (
    event.kind === 'command' &&
    options.command.test(event.command) &&
    (!options.commandPredicate || options.commandPredicate(event.command))
  )
}

/** A matching run is red when its output shows a failure signal. */
function isRedRun(event: SessionEvent, options: GreenRunOptions): boolean {
  const output = 'output' in event ? (event.output ?? '') : ''
  const command = event.kind === 'command' ? event.command : ''
  return (
    options.failurePattern.test(output) ||
    (options.extraFailurePredicate?.(command, output) ?? false)
  )
}

/** A matching run is green when no failure signal shows and a success signal does. */
function isGreenRun(event: SessionEvent, options: GreenRunOptions): boolean {
  const output = 'output' in event ? (event.output ?? '') : ''
  const command = event.kind === 'command' ? event.command : ''
  return (
    !isRedRun(event, options) &&
    (options.successPattern.test(output) ||
      (options.extraSuccessPredicate?.(command, output) ?? false))
  )
}

const EXTRACTION_RESPONSE_SPEC = `## Response format

Respond with a single JSON object of exactly this shape:
{"reason":"<your analysis> Finding: <move|new behavior|unsure>","kind":"pass"|"violation"}
Write reason FIRST and set kind to the conclusion your reason reached —
the two must agree. The reason MUST end with the finding label, exactly
one of "Finding: move" (kind pass), "Finding: new behavior" or
"Finding: unsure" (kind violation). For example:
{"reason":"Everything maps to createClient in Client.kt except a new scheme check: it throws on an http:// URL, which no shown source does. Finding: new behavior","kind":"violation"}
Return JSON only. No prose, no code fences.`

const EXTRACTION_INSTRUCTIONS = `## Role

You check one narrow claim for a TDD gate: that a NEW production file
is a refactor, moving logic the codebase already has, and adds no new
behavior. The session's most recent build or test run passed, so the
moved logic is already tested where it lives now.

## Inputs

1. "Existing production sources" — the current on-disk content of
   production files the session read or edited, in full.
2. "Pending new file" — the path and full content about to be written.

## Rules

Pass only if every behavior in the pending file is already performed by
the existing sources shown: each function body, branch, condition,
default value, constant, error path and external call corresponds to
code in those sources, verbatim or re-expressed one for one (renamed,
reordered, split into smaller functions, moved into a class or object,
parameters gathered into a type).

Part of a move, never new behavior:
  - The original code still being in the source file. Mid-refactor the
    logic exists twice until a later write removes the old copy; a
    "parallel" entry point that duplicates shown code is a move.
  - An interface, abstract class or data type that only declares or
    carries operations and values the shown sources already have
    (extracting an interface and its implementation is one refactor).
  - Imports, package declarations, visibility changes, comments.

Violation: anything in the pending file that no shown source performs,
however small — a new branch or condition, a changed default or
constant, an extra parameter that changes behavior, a new external
call, new error handling, new logging or telemetry.

The finding (the reason's last words, see Response format):
  - "Finding: move" — every behavior is in the shown sources (kind pass).
  - "Finding: new behavior" — the pending file produces an outcome a
    caller could observe that no shown source produces: a new rejection
    or validation, a new external call or side effect, a changed literal
    value or default, a new feature. Name it and where it is. Use this
    only when you are certain (kind violation). A different route to an
    outcome the sources already have is NOT new behavior: the same
    cleanup and the same exception reached through try/catch instead of
    a null check, logic moved into a caller or an implementation, a
    loop rewritten as a collection call. If the other half of such a
    restructuring is not shown, the finding is unsure.
  - "Finding: unsure" — you could not match something, for example it
    calls or replaces code with a type whose source is not shown (a
    clock, a helper, a constant defined elsewhere). A substitution you
    cannot verify is unsure, not new behavior (kind violation).`

function mentionedPaths(history: readonly SessionEvent[]): string[] {
  const paths: string[] = []
  for (const event of history) {
    const path =
      event.kind === 'write'
        ? event.path
        : event.kind === 'other' &&
            typeof event.input === 'object' &&
            event.input !== null &&
            typeof (event.input as { file_path?: unknown }).file_path === 'string'
          ? (event.input as { file_path: string }).file_path
          : undefined
    if (path && !paths.includes(path)) paths.push(path)
  }
  return paths
}

const identifiers = (text: string): Set<string> =>
  new Set(text.match(/[A-Za-z_][A-Za-z0-9_]{3,}/g) ?? [])

/**
 * Lets a TDD rule's writes through when they move existing, tested code
 * into a NEW production file under green (issue #70): extract a
 * function into another source set, or an interface plus the class that
 * implements it.
 *
 * The TDD judge cannot verify such a move on its own. It sees the
 * session's events clipped (Kotlin preset: 6,000 characters, head and
 * tail), so most of a large source file it was moved from is missing,
 * and the original still on disk reads as a parallel new entry point.
 * This wrapper runs only when the write creates a new production file
 * and the most recent matching build or test run in the session was
 * green. It gives a separate judge the current on-disk content, in
 * full, of the production files the session read or edited, and asks
 * whether every behavior in the new file is already there. A pass is
 * returned with an `extraction-under-green` note. When the judge names
 * specific new behavior ("Finding: new behavior"), the write is blocked: the
 * last run was green, so no failing test justifies it, and the wrapped
 * TDD judge cannot see the full sources to catch it. A "Finding:
 * unsure" answer, any other answer, or a judge error falls through to the
 * wrapped rule.
 *
 * Sources come from disk (`ctx.readFile`), never from transcript text:
 * whatever is in a production file has already been through the gates.
 *
 * @param rule — the TDD rule stack to wrap.
 * @param options — the green-run options `requireGreenTestRun` takes,
 *   plus `productionPattern` and `testPattern` (which paths are
 *   production sources and which are tests) and `maxSourceChars`
 *   (total source text given to the judge, default 120,000; files
 *   sharing the most identifiers with the new file come first).
 */
export function withExtractionUnderGreen(
  rule: Rule,
  options: GreenRunOptions & {
    productionPattern: RegExp
    testPattern: RegExp
    maxSourceChars?: number
  },
): Rule {
  const isProduction = (path: string) =>
    options.productionPattern.test(path) && !options.testPattern.test(path)
  const budget = options.maxSourceChars ?? 120_000
  const wrapped = async function extractionUnderGreen(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write' || !isProduction(action.path)) return rule(action, ctx)
    if (!ctx?.agent || !ctx.readFile || !ctx.history) return rule(action, ctx)
    const before = await ctx.readFile(action.path)
    if (before.kind !== 'absent') return rule(action, ctx)
    let history: readonly SessionEvent[]
    try {
      history = await ctx.history()
    } catch {
      // e.g. an over-limit transcript: the wrapped rule reports it.
      return rule(action, ctx)
    }
    const runs = history.filter((event) => isMatchingRun(event, options))
    const lastRun = runs[runs.length - 1]
    if (!lastRun || !isGreenRun(lastRun, options)) return rule(action, ctx)

    const wanted = identifiers(action.content)
    const sources: { path: string; content: string; overlap: number }[] = []
    for (const path of mentionedPaths(history)) {
      if (path === action.path || !isProduction(path)) continue
      const file = await ctx.readFile(path)
      if (file.kind !== 'present') continue
      const overlap = [...identifiers(file.content)].filter((id) => wanted.has(id)).length
      sources.push({ path, content: file.content, overlap })
    }
    sources.sort((a, b) => b.overlap - a.overlap)
    const shown: string[] = []
    let used = 0
    for (const source of sources) {
      if (source.overlap === 0 || used + source.content.length > budget) continue
      shown.push(`### ${source.path}\n\n${source.content}`)
      used += source.content.length
    }
    if (shown.length === 0) return rule(action, ctx)

    try {
      // A different question from the wrapped TDD rule's (judge-task.ts).
      const agent = ctx.agent
      const verdict = await withJudgeTask('extractionUnderGreen', () => agent.reason(
        [
          EXTRACTION_INSTRUCTIONS,
          `## Existing production sources\n\n${shown.join('\n\n')}`,
          `## Pending new file\n\nFile: ${action.path}\n\n${action.content}`,
          EXTRACTION_RESPONSE_SPEC,
        ].join('\n\n'),
      ))
      if (verdict.kind === 'pass') {
        return {
          kind: 'pass',
          reason: verdict.reason,
          notes: [{ kind: 'extraction-under-green' }],
        }
      }
      // A move with new behavior spliced in: the last run is green, so no
      // failing test justifies it. Block here rather than leave it to the
      // TDD judge, which can't see the full sources either.
      const reason = (verdict.reason ?? '').trim()
      const findings = [...reason.matchAll(/Finding:\s*(move|new behavior|unsure)/gi)]
      const last = findings[findings.length - 1]
      const found = last?.[1]?.toLowerCase() === 'new behavior' ? last : undefined
      if (found) {
        return {
          kind: 'violation',
          reason:
            'This new file moves existing code under green, but also adds ' +
            `behavior the sources it came from do not have: ${reason.slice(0, found.index).trim()}\n` +
            'Move the code as it is in this write, then add that behavior in ' +
            'its own red-green step: a failing test for it first.',
        }
      }
    } catch {
      // Judge unavailable or malformed: let the wrapped rule decide.
    }
    return rule(action, ctx)
  }
  Object.defineProperty(wrapped, 'name', { value: rule.name || 'extractionUnderGreen' })
  return wrapped
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  'target',
  '.next',
])

function walk(dir: string, out: string[] = []): string[] {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(join(dir, entry.name), out)
    } else {
      out.push(join(dir, entry.name))
    }
  }
  return out
}

const DEFAULT_STRING_LITERAL =
  /(['"])((?:(?!\1)[^\\\n]|\\.){4,})\1|`((?:(?!`)(?!\$\{)[^\\]|\\.){4,})`/g

function extractStringLiterals(content: string, minLength: number): Set<string> {
  const out = new Set<string>()
  for (const match of content.matchAll(DEFAULT_STRING_LITERAL)) {
    const value = match[2] ?? match[3] ?? ''
    if (value.trim().length >= minLength) out.add(value)
  }
  return out
}

/**
 * Surfaces the "renamed a button, broke the E2E suite" failure at
 * write time: when a write REMOVES a string literal that still appears
 * verbatim in files under `searchRoots` (typically your E2E/UI-test
 * specs, which select elements by visible text or accessible name),
 * the write is blocked with the list of dependent files.
 *
 * The inverse of a glossary guard: `surfaceGlossaryTermBreakage`
 * protects the vocabulary file from code that depends on it; this
 * protects test selectors from the UI code they depend on. Scope it to
 * your UI sources, with `searchRoots` pointing at the spec layers the
 * quick local loop does NOT run (E2E, smoke) — specs the inner loop
 * runs will fail red on their own.
 *
 * Deterministic, delta-based — no AI call. The write goes through once
 * the dependent specs are updated in the same session (or the string
 * genuinely stops being referenced).
 *
 * @param options.searchRoots — absolute paths to scan for usages.
 * @param options.searchPattern — which files count as usage sites
 *   (default: `*.spec.*` / `*.test.*` under the roots).
 * @param options.minLength — ignore removed literals shorter than
 *   this after trimming (default 8; short strings false-positive).
 */
export function surfaceRemovedStringUsage(options: {
  searchRoots: string[]
  searchPattern?: RegExp
  minLength?: number
}): Rule {
  const pattern = options.searchPattern ?? /\.(spec|test)\.[jt]sx?$/
  const minLength = options.minLength ?? 8
  return async function surfaceRemovedStringUsage(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    if (action.kind !== 'write') return { kind: 'pass' }
    const before = await ctx?.readFile?.(action.path)
    if (!before || before.kind !== 'present') return { kind: 'pass' }
    const beforeStrings = extractStringLiterals(before.content, minLength)
    if (beforeStrings.size === 0) return { kind: 'pass' }
    const afterContent = action.content
    const removed = [...beforeStrings].filter(
      (s) => !afterContent.includes(s),
    )
    if (removed.length === 0) return { kind: 'pass' }
    const files = options.searchRoots
      .flatMap((root) => walk(root))
      .filter((file) => pattern.test(file))
    const broken: string[] = []
    for (const text of removed) {
      // Case-insensitive: specs routinely select via /log out/i-style
      // regexes whose source is lowercased relative to the UI text.
      const needle = text.toLowerCase()
      const users = files.filter((file) => {
        try {
          return readFileSync(file, 'utf8').toLowerCase().includes(needle)
        } catch {
          return false
        }
      })
      if (users.length > 0) {
        broken.push(`"${text}" → ${users.join(', ')}`)
      }
    }
    if (broken.length === 0) return { kind: 'pass' }
    return {
      kind: 'violation',
      reason:
        'This write removes UI text that test specs still select by:\n' +
        broken.map((line) => `  - ${line}`).join('\n') +
        '\nThose suites are not in the quick local loop, so this ' +
        'breaks them silently until CI. Update the listed specs to the ' +
        'new text (and run their suite) alongside this change.',
    }
  }
}

// A deny reason whose last sentence concludes the write is allowed:
// "... This is permitted." (#45), a bare verdict word such as "Pass."
// or "Verdict: pass." (#50), or "... is not over-implementation."
// Negated forms ("is not permitted", "does not pass"), qualified ones
// ("permitted, but ...") and "the tests pass" do not match. A Sonnet
// judge's endings (#169): "... this is a valid single red test add." and
// "Correction: ..., which is allowed as the red step."
const PERMITTED_CONCLUSION = new RegExp(
  [
    String.raw`\b(?:this|it|the write|the change) is a valid (?:[\w-]+ ){0,4}(?:add|addition|step|write|change)\.?\s*$`,
    String.raw`^correction:.*\bwhich is (?:allowed|permitted)\b(?!\s+(?:only|after|if|when|once|unless)\b)[^,;]*\.?\s*$`,
    String.raw`\b(?:is|are) (?:permitted|allowed|acceptable|valid)\.?\s*$`,
    String.raw`\bshould (?:pass|be allowed)\.?\s*$`,
    String.raw`\bno violation\.?\s*$`,
    String.raw`^(?:so,?\s+|verdict:\s*|therefore,?\s+)?(?:pass(?:es|ed)?|allow(?:ed)?|permitted)\.?\s*$`,
    String.raw`\b(?:is|are) not (?:a violation|over-implementation|under-implementation)\.?\s*$`,
  ].join('|'),
  'i',
)

/**
 * Wraps an AI-validated rule so that a deny whose own reason concludes
 * the write is permitted is judged once more.
 *
 * Why (issue #45): Probity's judge answers `{"kind", "reason"}` in that
 * order, with thinking disabled, so it picks `kind` before it reasons.
 * Now and then the reasoning in `reason` reaches the opposite
 * conclusion. One block ended "... adds only ONE new test. This is
 * permitted." and still denied; the identical retry passed.
 *
 * Only a deny whose last sentence says the write is permitted is
 * retried, once, with the same inputs. The second verdict stands,
 * deny or pass. Every other verdict passes through untouched. Wrap
 * the judge rule directly, inside any wrapper that appends notes to
 * `reason`, so the last sentence tested is the judge's own. A
 * conclusion followed by a closing quote or bracket does not match.
 *
 * Asking the judge to reason before `kind` was tried instead and
 * rejected: on a live replica it let a production write with no
 * recorded failing test through 5 of 8 times, against 0 of 8 without.
 *
 * @param rule — the AI-validated rule to wrap.
 */
export function withContradictionRetry(rule: Rule): Rule {
  const wrapped = async function contradictionRetry(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    const result = await rule(action, ctx)
    if (result.kind !== 'violation') return result
    if (!PERMITTED_CONCLUSION.test(lastSentence(result.reason ?? ''))) return result
    return rule(action, ctx)
  }
  Object.defineProperty(wrapped, 'name', { value: rule.name || 'rule' })
  return wrapped
}

function lastSentence(text: string): string {
  const sentences = text.trim().split(/(?<=[.!?])\s+/)
  return sentences[sentences.length - 1] ?? ''
}

// Reasons Probity's verdict plumbing produces when the AI judge never
// returned a verdict at all — the validator's raw output was not JSON,
// had the wrong shape, or the SDK stream produced no result. None of
// these is a code-policy judgment of the pending write. The
// "<name> judge unavailable" form comes from this package's own judges
// (rules/kiro-judge.ts): the judge could not be started or answered
// nothing.
const JUDGE_FAILURE_REASON =
  /^(?:could not parse verdict from validator output|validator returned unexpected shape|expected string result from validator|no result message received|enforceTdd: no AI agent available|\w+ judge unavailable)/

// Judge failures that mean "no service": nothing to retry against this
// judge, so a judge chain moves on to the next one.
const JUDGE_UNAVAILABLE_REASON =
  /^(?:\w+ judge unavailable|no result message received|expected string result from validator|enforceTdd: no AI agent available)/

/**
 * Whether a verdict's reason says the judge gave no verdict because it
 * is unavailable, rather than judging the write: one of this package's
 * judges could not be started or answered nothing, the SDK stream
 * ended without a result, or the provider reports a spend limit,
 * quota, rate limit or authentication failure. Output that was simply
 * not valid JSON is not unavailability: the judge is up, and
 * `withJudgeFailureDiagnostics` asks it again.
 */
export function isJudgeUnavailable(reason: string): boolean {
  if (JUDGE_UNAVAILABLE_REASON.test(reason)) return true
  return JUDGE_FAILURE_REASON.test(reason) && PROVIDER_UNAVAILABLE.test(judgeOutput(reason))
}

// Provider messages that mean "no service" rather than "bad output":
// spend/credit limits, quota, rate limits, and auth failures.
const PROVIDER_UNAVAILABLE =
  /spend limit|usage[- ]credits|credit balance|out of credits|quota|rate[- ]limit|too many requests|overloaded|unauthori[sz]ed|authentication|invalid api key|\b(?:401|403|429|529)\b/i

const JUDGE_OUTPUT_EXCERPT = 300

// Failures a second judge call can fix: output that was not a valid
// verdict, or an SDK stream that ended without one. Not retried: a
// missing AI agent (configuration) and a provider that reports it is
// unavailable (spend limit, quota, rate limit, auth) — see
// PROVIDER_UNAVAILABLE.
const TRANSIENT_JUDGE_FAILURE =
  /^(?:could not parse verdict from validator output|validator returned unexpected shape|expected string result from validator|no result message received)/

const UNPARSED_OUTPUT = /^could not parse verdict from validator output:\s*/

function judgeOutput(reason: string): string {
  return reason.replace(JUDGE_FAILURE_REASON, '').replace(/^\s*:/, '').trim()
}

function isTransientFailure(reason: string): boolean {
  return TRANSIENT_JUDGE_FAILURE.test(reason) && !PROVIDER_UNAVAILABLE.test(judgeOutput(reason))
}

/**
 * The reason of a deny the judge wrote as broken JSON (an unescaped
 * quote or line break in `reason`, or an answer cut off mid-string),
 * or null when the output does not read as a deny. Anchors on the last
 * `"kind"`, as Probity's own parser takes the verdict from the end.
 */
function salvagedDenyReason(failureReason: string): string | null {
  if (!UNPARSED_OUTPUT.test(failureReason)) return null
  const output = failureReason.replace(UNPARSED_OUTPUT, '')
  const kinds = [...output.matchAll(/"kind"\s*:\s*"(pass|violation)"/g)]
  const last = kinds.at(-1)
  if (!last || last[1] !== 'violation') return null
  const rest = output.slice(last.index! + last[0].length)
  const field = /"reason"\s*:\s*"/.exec(rest)
  if (!field) return null
  const text = rest
    .slice(field.index + field[0].length)
    .replace(/"\s*\}\s*(?:```)?\s*$/, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim()
  return text || null
}

/**
 * Wraps an AI-validated rule so that a judge that returned no verdict
 * is handled by cause, instead of reading as a policy verdict on the
 * write.
 *
 * Why: Probity fails closed when it cannot parse the judge's output,
 * which is correct, but the deny text ("could not parse verdict from
 * validator output: …") looks like a rejection of the change. There
 * are two different causes, and they need opposite advice:
 *
 * - The provider is unavailable (spend limit, quota, rate limit, auth)
 *   or no AI agent is configured. No retry is made; the reason says
 *   the write was not judged and that retrying will not help until
 *   the judge is back.
 * - The judge answered, but not as a valid verdict (issue #52): an
 *   unescaped quote or line break inside `reason`, an answer cut off
 *   mid-string, or prose. The judge is asked once more and a
 *   well-formed second verdict stands. If the second answer is still
 *   malformed but reads as a deny, it is reported as the policy block
 *   it is, with the judge's reason quoted in full. Anything else stays
 *   blocked, and the reason says retrying the same write may succeed.
 *
 * Agents already retry a blocked write, so the automatic retry changes
 * what the agent is told, not how many chances the write gets. Inside
 * the presets' `withContradictionRetry`, the worst case is three judge
 * calls, and only when both anomalies occur.
 *
 * Genuine verdicts and passes pass through untouched. The wrapper keeps
 * the wrapped rule's name, so traces and block reports still identify
 * the rule that failed.
 *
 * @param rule — the AI-validated rule to wrap.
 * @param options.deterministicPaths — sentence listing the writes this
 *   rule stack passes without calling the judge (e.g. single-test
 *   fast paths), appended to the deny text so an agent can keep
 *   working while the provider is down.
 */
export function withJudgeFailureDiagnostics(
  rule: Rule,
  options: { deterministicPaths?: string } = {},
): Rule {
  const judge = rule.name || 'rule'
  const wrapped = async function judgeFailureDiagnostics(
    action: Action,
    ctx?: RuleContext,
  ): Promise<RuleResult> {
    let result
    try {
      result = await rule(action, ctx)
      if (result.kind === 'violation' && isTransientFailure(result.reason ?? '')) {
        result = await rule(action, ctx)
      }
    } catch (error) {
      return transcriptLimitViolation(error)
    }
    if (result.kind !== 'violation') return result
    const reason = result.reason ?? ''
    if (!JUDGE_FAILURE_REASON.test(reason)) return result
    const output = judgeOutput(reason)
    const excerpt =
      output.length > JUDGE_OUTPUT_EXCERPT
        ? `${output.slice(0, JUDGE_OUTPUT_EXCERPT)}…`
        : output

    if (isTransientFailure(reason)) {
      const denied = salvagedDenyReason(reason)
      if (denied) {
        return {
          ...result,
          reason:
            `Probity's AI judge (${judge}) denied this write. Its answer was ` +
            'not valid JSON, so its reason is quoted as written:\n\n' +
            denied,
        }
      }
      const lines = [
        `Probity's AI judge (${judge}) answered twice, but not in the ` +
          'expected format, so this write was not judged and stays blocked ' +
          '(fail closed). This is usually a one-off formatting slip: ' +
          'retrying the same write may succeed. If it keeps happening, ' +
          'check the judge provider (network, model availability).',
      ]
      if (options.deterministicPaths) lines.push(options.deterministicPaths)
      // In full (Probity caps it at 4,000 characters): the judge did
      // answer, and its text is the evidence for an issue report.
      lines.push('Do not bypass the hook. Judge output: ' + (output || '(empty)'))
      return { ...result, reason: lines.join('\n\n') }
    }

    const lines = [
      `Probity's AI judge (${judge}) returned no verdict, so ` +
        'this write was NOT judged — this is an infrastructure failure, not ' +
        'a policy decision about your change. The write stays blocked ' +
        '(fail closed). Rewording, splitting, or retrying the same write ' +
        'will not help until the judge is back.',
      PROVIDER_UNAVAILABLE.test(output)
        ? 'The judge provider reports it is unavailable (spend limit, ' +
          'quota, rate limit, or authentication). Restore service — e.g. ' +
          'raise the limit (/usage-credits) or fix the credentials Probity ' +
          'runs with — then retry.'
        : 'Check the judge provider (auth, network, model availability), ' +
          'then retry.',
    ]
    if (options.deterministicPaths) lines.push(options.deterministicPaths)
    lines.push('Do not bypass the hook. Judge output: ' + (excerpt || '(empty)'))
    return { ...result, reason: lines.join('\n\n') }
  }
  Object.defineProperty(wrapped, 'name', { value: judge })
  return wrapped
}
