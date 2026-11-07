import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import type { Agent, Verdict } from '@nizos/probity'

import { compactedFrom } from './compact-judge-files.js'
import { isJudgeUnavailable } from './gates.js'
import { judgeTask } from './judge-task.js'
import type { NamedJudge } from './kiro-judge.js'

// Probity doesn't export its telemetry type; derive it from the verdict.
type AgentTelemetry = NonNullable<Verdict['meta']>

/**
 * A judge that measures other judges on a project's real traffic.
 *
 * Why: whether a cheaper model (or another judge) is good enough depends
 * on the prompts a project's rules actually send, and Probity's
 * `--debug` trace records verdicts but not prompts, so they cannot be
 * replayed afterwards. `shadowJudge` asks the primary judge and every
 * candidate the same prompt in parallel, always returns the primary's
 * verdict, and appends the prompt and all verdicts to a JSONL log that
 * `probity-shadow-report` summarizes:
 *
 *   export default defineConfig({
 *     rules: kmpRuleEntries(root),
 *     ai: shadowJudge(claudeJudge(), [claudeJudge({ model: 'claude-haiku-5-5' })], {
 *       log: '.probity/shadow.jsonl',
 *     }),
 *   })
 *
 * Enforcement is unchanged: a candidate that fails, hangs or cannot be
 * logged never alters or blocks the verdict. Each candidate adds its own
 * spend, and a write waits for the slowest candidate up to
 * `candidateTimeoutMs`.
 */

export type ShadowJudgeOptions = {
  /** JSONL file each verdict is appended to (created 0600, directories as needed). */
  log: string
  /** Stop waiting for a candidate after this long from the start of the verdict. Default 60,000 ms. */
  candidateTimeoutMs?: number
  /**
   * Log the full prompt, so the log can be replayed on other models.
   * Default true. Prompts contain the code being judged; with false only
   * its SHA-256 is kept. With `'disagreements'` the prompt is kept only
   * where a candidate's answer differs from the primary's (the leaks and
   * friction `--show` lists), so the log stays small (issue #164).
   */
  includePrompt?: boolean | 'disagreements'
}

type LoggedVerdict = {
  name: string
  kind?: Verdict['kind']
  reason?: string
  meta?: AgentTelemetry
  /** The candidate threw instead of answering. */
  error?: string
  /** The candidate had not answered within `candidateTimeoutMs`. */
  timedOut?: boolean
  durationMs: number
}

export type ShadowLogEntry = {
  at: string
  /** The judging task of the rule that asked (judge-task.ts), when it was labelled. */
  task?: string
  promptSha256: string
  prompt?: string
  /** The prompt was compacted (a diff in place of a large file, issue #168): its size whole and as sent. */
  compaction?: { fullChars: number; sentChars: number }
  primary: LoggedVerdict & { kind: Verdict['kind']; reason: string }
  candidates: LoggedVerdict[]
}

const DEFAULT_CANDIDATE_TIMEOUT_MS = 60_000

function judgeName(judge: Agent, fallback: string): string {
  return (judge as NamedJudge).name ?? fallback
}

function logged(name: string, verdict: Verdict, durationMs: number): LoggedVerdict {
  return { name, kind: verdict.kind, reason: verdict.reason, ...(verdict.meta && { meta: verdict.meta }), durationMs }
}

async function askCandidate(candidate: Agent, name: string, prompt: string, started: number, timeoutMs: number): Promise<LoggedVerdict> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    // Not unref'd: while the hook waits on a hung candidate, this timer is
    // what keeps the process alive to return the verdict.
    timer = setTimeout(() => resolve('timeout'), Math.max(0, started + timeoutMs - Date.now()))
  })
  try {
    const answer = await Promise.race([candidate.reason(prompt), timeout])
    const durationMs = Date.now() - started
    return answer === 'timeout' ? { name, timedOut: true, durationMs } : logged(name, answer, durationMs)
  } catch (error) {
    return { name, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

export function shadowJudge(primary: Agent, candidates: readonly Agent[], options: ShadowJudgeOptions): NamedJudge {
  const primaryName = judgeName(primary, 'primary')
  return {
    ...((primary as NamedJudge).name !== undefined && { name: primaryName }),
    reason: async (prompt) => {
      const started = Date.now()
      const task = judgeTask()
      const full = compactedFrom()
      const timeoutMs = options.candidateTimeoutMs ?? DEFAULT_CANDIDATE_TIMEOUT_MS
      const shadows = candidates.map((candidate, i) =>
        askCandidate(candidate, judgeName(candidate, `candidate-${i + 1}`), prompt, started, timeoutMs),
      )
      const verdict = await primary.reason(prompt)
      const primaryMs = Date.now() - started
      const primaryLogged = { ...logged(primaryName, verdict, primaryMs), kind: verdict.kind, reason: verdict.reason }
      const answers = await Promise.all(shadows)
      const keepPrompt =
        options.includePrompt === 'disagreements'
          ? answers.some((answer) => disagrees(primaryLogged, answer))
          : options.includePrompt !== false
      const entry: ShadowLogEntry = {
        at: new Date(started).toISOString(),
        ...(task && { task }),
        promptSha256: createHash('sha256').update(prompt).digest('hex'),
        ...(keepPrompt && { prompt }),
        ...(full !== undefined && { compaction: { fullChars: full.length, sentChars: prompt.length } }),
        primary: primaryLogged,
        candidates: answers,
      }
      try {
        mkdirSync(dirname(options.log), { recursive: true })
        appendFileSync(options.log, JSON.stringify(entry) + '\n', { mode: 0o600 })
      } catch {
        // Measuring must never change enforcement.
      }
      return verdict
    },
  }
}

export type ShadowDisagreement = { at: string; task?: string; promptSha256: string; primaryReason: string; candidateReason: string }

export type ShadowSummary = {
  candidate: string
  /** The judging task this row covers; undefined for the row over all tasks. */
  task?: string
  /** Verdicts where both judges answered. */
  compared: number
  agreed: number
  /** The candidate passed what the primary denied: enforcement it would have lost. */
  leaks: ShadowDisagreement[]
  /** The candidate denied what the primary passed: interruptions it would have added. */
  friction: ShadowDisagreement[]
  /** Compared verdicts the primary denied: the denominator of the leak rate. */
  primaryDenials: number
  /** Compared verdicts the primary passed: the denominator of the friction rate. */
  primaryPasses: number
  /** 95% upper bound on the candidate's leak rate (null with no denials to go by). */
  leakRateUpper: number | null
  /** 95% upper bound on the candidate's friction rate. */
  frictionRateUpper: number | null
  /** The candidate errored, timed out, or reported itself unavailable. */
  unavailable: number
  /** The primary was unavailable, so there was nothing to compare against. */
  skipped: number
  /** Tokens per model, the judge's own background calls included. */
  tokens: TokensByModel
  primaryTokens: TokensByModel
  medianMs: number | null
  primaryMedianMs: number | null
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export type TokensByModel = Record<string, { input: number; output: number }>

/** Adds the per-model usage rows of a verdict's `meta.models` to `into`. */
function addTokens(into: TokensByModel, meta: AgentTelemetry | undefined): void {
  const rows = Array.isArray(meta?.models) ? meta.models : []
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue
    const usage = row as Record<string, unknown>
    if (typeof usage.model !== 'string') continue
    const total = (into[usage.model] ??= { input: 0, output: 0 })
    if (typeof usage.inputTokens === 'number') total.input += usage.inputTokens
    if (typeof usage.outputTokens === 'number') total.output += usage.outputTokens
  }
}

function logChoose(n: number, k: number): number {
  let sum = 0
  for (let i = 1; i <= k; i++) sum += Math.log(n - k + i) - Math.log(i)
  return sum
}

/** P(X <= k) for X ~ Binomial(n, p). */
function binomialCdf(k: number, n: number, p: number): number {
  if (p <= 0) return 1
  if (p >= 1) return k >= n ? 1 : 0
  let total = 0
  for (let i = 0; i <= k; i++) total += Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p))
  return total
}

/**
 * The one-sided 95% Clopper-Pearson upper bound on a rate seen `k` times
 * in `n`: the highest true rate still consistent with so few. Null when
 * `n` is 0. Zero leaks in 20 verdicts still allows about 14%.
 */
export function rateUpperBound(k: number, n: number): number | null {
  if (n === 0) return null
  if (k >= n) return 1
  let low = k / n
  let high = 1
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2
    if (binomialCdf(k, n, mid) > 0.05) low = mid
    else high = mid
  }
  return (low + high) / 2
}

type Tally = ShadowSummary & { durations: number[]; primaryDurations: number[] }

function emptyTally(candidate: string, task: string | undefined): Tally {
  return {
    candidate,
    ...(task !== undefined && { task }),
    compared: 0,
    agreed: 0,
    leaks: [],
    friction: [],
    primaryDenials: 0,
    primaryPasses: 0,
    leakRateUpper: null,
    frictionRateUpper: null,
    unavailable: 0,
    skipped: 0,
    tokens: {},
    primaryTokens: {},
    medianMs: null,
    primaryMedianMs: null,
    durations: [],
    primaryDurations: [],
  }
}

function answered(verdict: LoggedVerdict): boolean {
  return verdict.error === undefined && !verdict.timedOut && !!verdict.kind && !isJudgeUnavailable(verdict.reason ?? '')
}

/** Both judges answered, differently: a leak or friction. */
function disagrees(primary: ShadowLogEntry['primary'], candidate: LoggedVerdict): boolean {
  return answered(primary) && answered(candidate) && candidate.kind !== primary.kind
}

function count(row: Tally, entry: ShadowLogEntry, candidate: LoggedVerdict): void {
  addTokens(row.tokens, candidate.meta)
  addTokens(row.primaryTokens, entry.primary.meta)
  row.durations.push(candidate.durationMs)
  row.primaryDurations.push(entry.primary.durationMs)
  if (isJudgeUnavailable(entry.primary.reason)) {
    row.skipped++
    return
  }
  if (!answered(candidate)) {
    row.unavailable++
    return
  }
  row.compared++
  if (entry.primary.kind === 'violation') row.primaryDenials++
  else row.primaryPasses++
  if (candidate.kind === entry.primary.kind) {
    row.agreed++
    return
  }
  const disagreement = {
    at: entry.at,
    ...(entry.task && { task: entry.task }),
    promptSha256: entry.promptSha256,
    primaryReason: entry.primary.reason,
    candidateReason: candidate.reason ?? '',
  }
  if (candidate.kind === 'pass') row.leaks.push(disagreement)
  else row.friction.push(disagreement)
}

/**
 * Agreement with the primary judge over a shadow log: per candidate, a
 * row over all tasks, then one row per judging task (most verdicts
 * first; unlabelled verdicts under `(unlabelled)`).
 */
export function summarizeShadowLog(entries: readonly ShadowLogEntry[]): ShadowSummary[] {
  const overall = new Map<string, Tally>()
  const byTask = new Map<string, Map<string, Tally>>()
  for (const entry of entries) {
    const task = entry.task ?? '(unlabelled)'
    for (const candidate of entry.candidates) {
      if (!overall.has(candidate.name)) {
        overall.set(candidate.name, emptyTally(candidate.name, undefined))
        byTask.set(candidate.name, new Map())
      }
      const tasks = byTask.get(candidate.name)!
      if (!tasks.has(task)) tasks.set(task, emptyTally(candidate.name, task))
      count(overall.get(candidate.name)!, entry, candidate)
      count(tasks.get(task)!, entry, candidate)
    }
  }
  const finish = ({ durations, primaryDurations, ...row }: Tally): ShadowSummary => ({
    ...row,
    leakRateUpper: rateUpperBound(row.leaks.length, row.primaryDenials),
    frictionRateUpper: rateUpperBound(row.friction.length, row.primaryPasses),
    medianMs: median(durations),
    primaryMedianMs: median(primaryDurations),
  })
  return [...overall.entries()].flatMap(([name, row]) => [
    finish(row),
    ...[...byTask.get(name)!.values()].sort((a, b) => b.durations.length - a.durations.length).map(finish),
  ])
}
