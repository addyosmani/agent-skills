import { createHash } from 'node:crypto'
import { appendFileSync, chmodSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import type { Agent, Verdict } from '@nizos/probity'

import type { ShadowLogEntry } from './shadow-judge.js'

/**
 * Checking compaction later without a live shadow (issue #174).
 *
 * A `wholeFiles()` shadow candidate measures whether a diff in place of
 * the file changes verdicts, but it asks a second judge on every verdict.
 * Compaction can instead record, for a sampled share of compacted
 * verdicts, the whole-file prompt it didn't send (built locally, no model
 * call) and the verdict the compacted prompt got. `probity-shadow-replay`
 * later asks a judge those prompts and reports agreement the way
 * `probity-shadow-report` does.
 *
 * Prompts hold the code being judged and session context: keep the
 * record log local and out of git.
 */

export type WholePromptRecordOptions = {
  /** JSONL file each record is appended to (created 0600, directories as needed). */
  log: string
  /** Share of compacted verdicts recorded, 0 to 1. Default 0.1. */
  sample?: number
  /** Random source for sampling, for tests. Default `Math.random`. */
  random?: () => number
}

export type WholePromptRecord = {
  at: string
  task?: string
  /** SHA-256 of the compacted prompt the primary judge was sent. */
  promptSha256: string
  /** The whole-file prompt the compaction replaced. */
  wholePrompt: string
  primary: { name: string; kind: Verdict['kind']; reason: string; meta?: Verdict['meta']; durationMs: number }
}

/** Appends one record, keeping the log `0600`; a failure to write never reaches the verdict. */
export function appendWholePromptRecord(log: string, record: WholePromptRecord): void {
  try {
    mkdirSync(dirname(log), { recursive: true })
    appendFileSync(log, JSON.stringify(record) + '\n', { mode: 0o600 })
    // `mode` applies only on creation; narrow a log created wider.
    chmodSync(log, 0o600)
  } catch {
    // Measuring must never change enforcement.
  }
}

/**
 * The judge a recorded primary ran on, by its name: `kiro`, `claude`, or
 * `claude:<model>`. Null for any other name. Replaying on the primary's
 * own judge keeps model differences out of the comparison.
 */
export function judgeForPrimary(name: string): { judge: 'kiro' | 'claude'; model?: string } | null {
  if (name === 'kiro') return { judge: 'kiro' }
  if (name === 'claude') return { judge: 'claude' }
  const model = name.match(/^claude:(.+)$/)?.[1]
  return model ? { judge: 'claude', model } : null
}

export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function judgeName(judge: Agent): string {
  return (judge as Agent & { name?: string }).name ?? 'judge'
}

/**
 * Asks `judge` each recorded whole-file prompt (up to `limit`, at most
 * `concurrency` at a time) and returns shadow-log entries: the recorded
 * verdict as the primary, and the judge's answer as a
 * `<name>:whole-files` candidate. A judge that throws is logged as
 * unavailable. Lines that aren't records are counted, not judged.
 */
export async function replayWholePrompts(
  lines: AsyncIterable<string>,
  judge: Agent,
  options: { limit?: number; concurrency?: number } = {},
): Promise<{ entries: ShadowLogEntry[]; unreadable: number }> {
  const limit = options.limit ?? Infinity
  const concurrency = Math.max(1, options.concurrency ?? 1)
  const name = `${judgeName(judge)}:whole-files`
  const entries: ShadowLogEntry[] = []
  const running = new Set<Promise<void>>()
  let unreadable = 0
  let taken = 0
  for await (const line of lines) {
    if (taken >= limit) break
    if (!line.trim()) continue
    let record: WholePromptRecord
    try {
      record = JSON.parse(line) as WholePromptRecord
    } catch {
      unreadable++
      continue
    }
    if (
      typeof record?.wholePrompt !== 'string' ||
      typeof record.at !== 'string' ||
      !record.primary?.kind ||
      typeof record.primary.durationMs !== 'number'
    ) {
      unreadable++
      continue
    }
    taken++
    const job = (async () => {
      const started = Date.now()
      let candidate: ShadowLogEntry['candidates'][number]
      try {
        const verdict = await judge.reason(record.wholePrompt)
        candidate = { name, kind: verdict.kind, reason: verdict.reason, ...(verdict.meta && { meta: verdict.meta }), durationMs: Date.now() - started }
      } catch (error) {
        candidate = { name, error: error instanceof Error ? error.message : String(error), durationMs: Date.now() - started }
      }
      entries.push({
        at: record.at,
        ...(record.task && { task: record.task }),
        promptSha256: record.promptSha256,
        primary: record.primary,
        candidates: [candidate],
      })
    })()
    running.add(job)
    void job.finally(() => running.delete(job))
    if (running.size >= concurrency) await Promise.race(running)
  }
  await Promise.all(running)
  entries.sort((a, b) => a.at.localeCompare(b.at))
  return { entries, unreadable }
}
