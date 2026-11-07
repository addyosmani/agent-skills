// Issue #174: a live wholeFiles() shadow doubles judge cost. Compaction
// can instead record a sample of the whole-file prompts it didn't send,
// with the verdict the compacted prompt got, and a replay later asks a
// judge those prompts and reports agreement like probity-shadow-report.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import type { Agent, Rule, RuleContext, Verdict } from '@nizos/probity'

import { compactJudgeFiles } from './compact-judge-files.ts'
import { chmodSync } from 'node:fs'

import { judgeForPrimary, replayWholePrompts, type WholePromptRecord } from './whole-prompt-record.ts'

function dir(t: { after: (fn: () => void) => void }) {
  const path = mkdtempSync(join(tmpdir(), 'whole-prompt-record-'))
  t.after(() => rmSync(path, { recursive: true, force: true }))
  return path
}

const BIG = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`).join('\n') + '\n'
const EDITED = BIG.replace('line 500\n', 'line 500 changed\n')

const rule: Rule = async (action, ctx) => {
  if (action.kind !== 'write') return { kind: 'pass' }
  return ctx!.agent!.reason(
    `## Rules\n\n## Current file content\n\n${BIG}\n\n## Pending action\n\nFile: ${action.path}\n\n${action.content}\n\n## Response format`,
  )
}

function judged(verdict: Verdict, content = BIG) {
  const prompts: string[] = []
  const ctx = {
    readFile: async () => ({ kind: 'present', content }),
    agent: { name: 'claude', reason: async (prompt: string) => (prompts.push(prompt), verdict) },
  } as unknown as RuleContext
  return { ctx, prompts }
}

const write = (content: string) => ({ kind: 'write', path: '/repo/Big.kt', content }) as const

function records(path: string): WholePromptRecord[] {
  return readFileSync(path, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
}

test('a sampled compacted verdict records the whole prompt, unsent, with the verdict it got', async (t) => {
  const log = join(dir(t), 'nested', 'whole.jsonl')
  const { ctx, prompts } = judged({ kind: 'violation', reason: 'no red' })
  const result = await compactJudgeFiles(rule, { record: { log, sample: 1 } })(write(EDITED), ctx)
  assert.equal(result.kind, 'violation')
  assert.equal(prompts.length, 1, 'the judge is asked once, compacted')
  assert.match(prompts[0]!, /Unified diff/)
  const [entry] = records(log)
  assert.ok(entry!.wholePrompt.includes(BIG), 'whole prompt recorded')
  assert.match(entry!.promptSha256, /^[0-9a-f]{64}$/)
  assert.deepEqual([entry!.primary.name, entry!.primary.kind, entry!.primary.reason], ['claude', 'violation', 'no red'])
  assert.equal(statSync(log).mode & 0o777, 0o600)
})

test('sampling records only the chosen share', async (t) => {
  const log = join(dir(t), 'whole.jsonl')
  const draws = [0.05, 0.5, 0.09, 0.95]
  const wrapped = compactJudgeFiles(rule, { record: { log, sample: 0.1, random: () => draws.shift()! } })
  for (let i = 0; i < 4; i++) await wrapped(write(EDITED), judged({ kind: 'pass', reason: '' }).ctx)
  assert.equal(records(log).length, 2)
})

test('a verdict that was not compacted is not recorded', async (t) => {
  const log = join(dir(t), 'whole.jsonl')
  const small = 'line 1\nline 2\n'
  await compactJudgeFiles(rule, { record: { log, sample: 1 } })(write('line 1\nchanged\n'), judged({ kind: 'pass', reason: '' }, small).ctx)
  assert.throws(() => statSync(log))
})

test('a record that cannot be written never changes the verdict', async (t) => {
  const blocker = join(dir(t), 'file')
  writeFileSync(blocker, '')
  const result = await compactJudgeFiles(rule, { record: { log: join(blocker, 'whole.jsonl'), sample: 1 } })(
    write(EDITED),
    judged({ kind: 'violation', reason: 'no red' }).ctx,
  )
  assert.equal(result.kind, 'violation')
})

function recordLine(primary: Verdict, task = 'enforceTdd', wholePrompt = 'whole prompt'): string {
  return JSON.stringify({
    at: '2026-11-01T00:00:00.000Z',
    task,
    promptSha256: 'a'.repeat(64),
    wholePrompt,
    primary: { name: 'kiro', kind: primary.kind, reason: primary.reason, durationMs: 9000 },
  })
}

async function* lines(...items: string[]) {
  yield* items
}

test('replay asks the judge each whole prompt and logs it as a whole-files candidate', async () => {
  const asked: string[] = []
  const judge = {
    name: 'claude:claude-opus-5-5',
    reason: async (prompt: string) => (asked.push(prompt), prompt === 'p2' ? { kind: 'pass', reason: 'fine' } : { kind: 'violation', reason: 'no red' }),
  } as Agent & { name: string }
  const { entries, unreadable } = await replayWholePrompts(
    lines(recordLine({ kind: 'violation', reason: 'r' }, 'enforceTdd', 'p1'), 'not json', recordLine({ kind: 'violation', reason: 'r' }, 'enforceTdd', 'p2')),
    judge,
  )
  assert.deepEqual(asked.sort(), ['p1', 'p2'])
  assert.equal(unreadable, 1)
  assert.equal(entries.length, 2)
  assert.equal(entries[0]!.candidates[0]!.name, 'claude:claude-opus-5-5:whole-files')
  assert.equal(entries[0]!.task, 'enforceTdd')
  assert.equal(entries.filter((e) => e.candidates[0]!.kind === 'pass').length, 1)
})

test('replay stops at the limit and records a judge failure as unavailable', async () => {
  const judge = { name: 'kiro', reason: async () => { throw new Error('kiro-cli not found') } } as Agent & { name: string }
  const { entries } = await replayWholePrompts(lines(recordLine({ kind: 'pass', reason: '' }), recordLine({ kind: 'pass', reason: '' })), judge, { limit: 1 })
  assert.equal(entries.length, 1)
  assert.equal(entries[0]!.candidates[0]!.error, 'kiro-cli not found')
})

// ── Review of #174 ──────────────────────────────────────────────────

test('the record keeps the primary judge\'s telemetry, so a replay can use the same model', async (t) => {
  const log = join(dir(t), 'whole.jsonl')
  const meta = { models: [{ model: 'claude-opus-5.5', inputTokens: 1, outputTokens: 1 }] }
  await compactJudgeFiles(rule, { record: { log, sample: 1 } })(write(EDITED), judged({ kind: 'pass', reason: '', meta }).ctx)
  assert.deepEqual(records(log)[0]!.primary.meta, meta)
})

test('a recorder that throws never changes the verdict', async (t) => {
  const log = join(dir(t), 'whole.jsonl')
  const result = await compactJudgeFiles(rule, {
    record: { log, sample: 1, random: () => { throw new Error('rng') } },
  })(write(EDITED), judged({ kind: 'violation', reason: 'no red' }).ctx)
  assert.equal(result.kind, 'violation')
})

test('an existing log with wider permissions is narrowed to 0600', async (t) => {
  const log = join(dir(t), 'whole.jsonl')
  writeFileSync(log, '')
  chmodSync(log, 0o644)
  await compactJudgeFiles(rule, { record: { log, sample: 1 } })(write(EDITED), judged({ kind: 'pass', reason: '' }).ctx)
  assert.equal(statSync(log).mode & 0o777, 0o600)
})

test('replay counts a record with no time or duration as unreadable', async () => {
  const judge = { name: 'kiro', reason: async () => ({ kind: 'pass', reason: '' }) } as Agent & { name: string }
  const noAt = JSON.stringify({ promptSha256: 'a', wholePrompt: 'p', primary: { name: 'kiro', kind: 'pass', reason: '', durationMs: 1 } })
  const noDuration = JSON.stringify({ at: '2026-11-01T00:00:00.000Z', promptSha256: 'a', wholePrompt: 'p', primary: { name: 'kiro', kind: 'pass', reason: '' } })
  const { entries, unreadable } = await replayWholePrompts(lines(noAt, noDuration, recordLine({ kind: 'pass', reason: '' })), judge)
  assert.equal(entries.length, 1)
  assert.equal(unreadable, 2)
})

test('the replay judge defaults to the recorded primary\'s', () => {
  assert.deepEqual(judgeForPrimary('kiro'), { judge: 'kiro' })
  assert.deepEqual(judgeForPrimary('claude'), { judge: 'claude' })
  assert.deepEqual(judgeForPrimary('claude:claude-opus-5-5'), { judge: 'claude', model: 'claude-opus-5-5' })
  assert.equal(judgeForPrimary('primary'), null)
})
