#!/usr/bin/env node
/**
 * Replays recorded whole-file prompts (issue #174): asks a judge each
 * prompt that compaction replaced with a diff, and reports how often it
 * agrees with the verdict the compacted prompt got, as
 * `probity-shadow-report` does for a live shadow.
 *
 *   npx probity-shadow-replay .probity/whole-prompts.jsonl [--judge claude|kiro] [--model ID]
 *     [--limit N] [--concurrency N] [--show leaks|friction|all]
 *
 * Record with the presets' `compactJudgeFiles: { record: { log, sample } }`.
 * The judge defaults to the one the recorded primary ran on (`kiro`,
 * `claude`, `claude:<model>`), so disagreements measure compaction, not
 * a different model; a kiro primary's model and effort aren't in its
 * name, so pass `--model` if it wasn't kiro's default.
 * A leak is a verdict the whole-file judge passes that the compacted one
 * denied; friction the reverse. Each replayed prompt is one judge call,
 * on your account: `--limit` caps the spend. The prompts hold code and
 * session context, so keep the log local.
 */
import { closeSync, createReadStream, openSync } from 'node:fs'
import { createInterface } from 'node:readline'

import { claudeJudge, kiroJudge } from '../rules/kiro-judge.js'
import { judgeForPrimary, replayWholePrompts, type WholePromptRecord } from '../rules/whole-prompt-record.js'
import { shadowReportLines } from './shadow-format.js'

const USAGE =
  'usage: probity-shadow-replay <whole-prompts.jsonl> [--judge claude|kiro (default: the recorded primary)] [--model ID] [--limit N] ' +
  '[--concurrency N] [--show leaks|friction|all]'

function fail(message: string): never {
  process.stderr.write(`${message}\n${USAGE}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const VALUED = new Set(['--judge', '--model', '--limit', '--concurrency', '--show'])
// Strict, because a dropped `--limit` would replay the whole log on your
// account: every `--x` must be known and have a value.
for (let i = 0; i < args.length; i++) {
  if (!args[i]!.startsWith('--')) continue
  if (!VALUED.has(args[i]!)) fail(`unknown option ${args[i]}`)
  const value = args[i + 1]
  if (value === undefined || value.startsWith('--')) fail(`${args[i]} needs a value`)
  i++
}
const option = (name: string) => {
  const at = args.indexOf(name)
  return at === -1 ? undefined : args[at + 1]
}
const path = args.find((arg, i) => !arg.startsWith('--') && !VALUED.has(args[i - 1] ?? ''))
const chosenJudge = option('--judge')
if (chosenJudge !== undefined && !['claude', 'kiro'].includes(chosenJudge)) fail(`--judge takes claude or kiro, not ${chosenJudge}`)
const show = option('--show')
if (show !== undefined && !['leaks', 'friction', 'all'].includes(show)) fail(`--show takes leaks, friction or all, not ${show}`)
const count = (name: string) => {
  const value = option(name)
  if (value === undefined) return undefined
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1) fail(`${name} takes a whole number from 1, not ${value}`)
  return n
}
const limit = count('--limit')
const concurrency = count('--concurrency') ?? 4
if (!path) fail('no record log given')

try {
  closeSync(openSync(path, 'r'))
} catch (error) {
  fail(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`)
}

// By default, replay on the judge the primary ran on, so the comparison
// measures compaction, not a different model.
let recordedPrimary: string | undefined
for await (const line of createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity })) {
  try {
    recordedPrimary = (JSON.parse(line) as WholePromptRecord).primary?.name
  } catch {
    continue
  }
  if (recordedPrimary) break
}
const recorded = recordedPrimary ? judgeForPrimary(recordedPrimary) : null
const judgeKind = chosenJudge ?? recorded?.judge
if (!judgeKind) fail(`the log's primary judge is ${recordedPrimary ?? 'not recorded'}: say which to replay on with --judge`)
const model = option('--model') ?? (judgeKind === recorded?.judge ? recorded.model : undefined)
const judge = judgeKind === 'kiro' ? kiroJudge(model ? { model } : {}) : claudeJudge(model ? { model } : {})
const sameJudge = recordedPrimary === (judge as { name?: string }).name
const lines = createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity })
const { entries, unreadable } = await replayWholePrompts(lines, judge, { limit, concurrency })
const heading =
  `Replay of ${path} (whole-file prompts; primary verdicts were on compacted prompts` +
  (sameJudge ? ')' : `; primary ${recordedPrimary ?? 'unknown'}, replayed on ${(judge as { name?: string }).name}, so model differences count too)`)
process.stdout.write(shadowReportLines(entries, { heading, unreadable, show }).join('\n') + '\n')
