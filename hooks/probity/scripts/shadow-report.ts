#!/usr/bin/env node
/**
 * Summarizes a `shadowJudge` log: for each candidate judge, how often it
 * agreed with the primary, and where it did not.
 *
 *   npx probity-shadow-report .probity/shadow.jsonl [--show leaks|friction|all]
 *
 * A leak is a write the candidate would have let through that the
 * primary denied; friction is a write it would have denied that the
 * primary passed. Each rate comes with its 95% upper bound, so a small
 * sample cannot pass for a good result, and a table splits every
 * candidate by judging task (the rule that asked). The primary is not
 * ground truth, so read the leaks before trusting a cheaper judge:
 * `--show leaks` prints each one's task, reasons and prompt hash, which
 * finds the full prompt in the log.
 */
import { closeSync, createReadStream, openSync } from 'node:fs'
import { createInterface } from 'node:readline'

import type { ShadowLogEntry } from '../rules/shadow-judge.js'
import { shadowReportLines } from './shadow-format.js'

const USAGE = 'usage: probity-shadow-report <shadow.jsonl> [--show leaks|friction|all]'

function fail(message: string): never {
  process.stderr.write(`${message}\n${USAGE}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const showAt = args.indexOf('--show')
const show = showAt === -1 ? undefined : args[showAt + 1]
if (show !== undefined && !['leaks', 'friction', 'all'].includes(show)) fail(`--show takes leaks, friction or all, not ${show}`)
const path = args.find((arg, i) => !arg.startsWith('--') && (showAt === -1 || i !== showAt + 1))
if (!path) fail('no shadow log given')

try {
  closeSync(openSync(path, 'r'))
} catch (error) {
  fail(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`)
}

// Line by line, without the prompts: a log that keeps every prompt grows
// ~80 KB per verdict, past what one string or the heap can hold (#164).
const entries: ShadowLogEntry[] = []
let unreadable = 0
for await (const line of createInterface({ input: createReadStream(path, 'utf8'), crlfDelay: Infinity })) {
  if (!line.trim()) continue
  try {
    const entry = JSON.parse(line) as ShadowLogEntry
    delete entry.prompt
    if (entry?.primary && Array.isArray(entry.candidates)) entries.push(entry)
    else unreadable++
  } catch {
    unreadable++
  }
}

process.stdout.write(shadowReportLines(entries, { heading: `Shadow log ${path}`, unreadable, show }).join('\n') + '\n')
