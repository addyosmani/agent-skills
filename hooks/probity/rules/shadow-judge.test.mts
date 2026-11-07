// Run: npx tsx --test rules/shadow-judge.test.mts
//
// shadowJudge lets a project measure a cheaper (or different) judge on its
// real traffic: the primary judge decides every verdict, candidates answer
// the same prompt on the side, and both are logged for comparison.
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import type { Agent, Rule, RuleContext, Verdict } from '@nizos/probity'

import { compactJudgeFiles, wholeFiles } from './compact-judge-files.ts'

import { withJudgeTask } from './judge-task.ts'
import { rateUpperBound, shadowJudge, summarizeShadowLog, type ShadowLogEntry } from './shadow-judge.ts'

function dir(t: { after: (fn: () => void) => void }) {
  const path = mkdtempSync(join(tmpdir(), 'shadow-judge-'))
  t.after(() => rmSync(path, { recursive: true, force: true }))
  return path
}

function judge(name: string, answer: (prompt: string) => Promise<Verdict>) {
  const prompts: string[] = []
  const agent = {
    name,
    reason: async (prompt: string) => {
      prompts.push(prompt)
      return answer(prompt)
    },
  } as Agent & { name: string }
  return { agent, prompts }
}

const pass = (reason = 'ok', meta?: Verdict['meta']): Verdict => ({ kind: 'pass', reason, ...(meta && { meta }) })
const deny = (reason = 'no red'): Verdict => ({ kind: 'violation', reason })

function readLog(path: string): ShadowLogEntry[] {
  return readFileSync(path, 'utf8').trim().split('\n').map((line) => JSON.parse(line))
}

test('the primary verdict decides, and both verdicts are logged with the prompt', async (t) => {
  const log = join(dir(t), 'nested', 'shadow.jsonl')
  const primary = judge('claude', async () => deny('production write with no failing test'))
  const candidate = judge('claude:claude-haiku-5-5', async () =>
    pass('looks fine', { models: [{ model: 'claude-haiku-5-5', inputTokens: 900, outputTokens: 40 }] }),
  )
  const shadow = shadowJudge(primary.agent, [candidate.agent], { log })

  const verdict = await shadow.reason('## Rules\nJudge this write.')
  assert.equal(verdict.kind, 'violation')
  assert.equal(verdict.reason, 'production write with no failing test')
  assert.deepEqual(candidate.prompts, ['## Rules\nJudge this write.'])

  const [entry] = readLog(log)
  assert.equal(entry!.prompt, '## Rules\nJudge this write.')
  assert.match(entry!.promptSha256, /^[0-9a-f]{64}$/)
  assert.equal(entry!.primary.name, 'claude')
  assert.equal(entry!.primary.kind, 'violation')
  assert.equal(entry!.candidates[0]!.name, 'claude:claude-haiku-5-5')
  assert.equal(entry!.candidates[0]!.kind, 'pass')
  assert.deepEqual(entry!.candidates[0]!.meta, { models: [{ model: 'claude-haiku-5-5', inputTokens: 900, outputTokens: 40 }] })
  // Prompts hold source code: the log is private to the user.
  assert.equal(statSync(log).mode & 0o777, 0o600)
})

test('the shadow judge carries the primary judge\'s name, so judgeChain treats it as the primary', () => {
  const shadow = shadowJudge(judge('kiro', async () => pass()).agent, [], { log: '/dev/null' }) as Agent & { name?: string }
  assert.equal(shadow.name, 'kiro')
})

test('a candidate that fails or hangs never changes or holds up the verdict', async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  const primary = judge('claude', async () => pass())
  const broken = judge('broken', async () => {
    throw new Error('socket hang up')
  })
  const hung = judge('hung', () => new Promise<Verdict>(() => {}))
  const shadow = shadowJudge(primary.agent, [broken.agent, hung.agent], { log, candidateTimeoutMs: 50 })

  const started = Date.now()
  const verdict = await shadow.reason('p')
  assert.equal(verdict.kind, 'pass')
  assert.ok(Date.now() - started < 1_000, 'waited for the hung candidate')
  const [entry] = readLog(log)
  assert.equal(entry!.candidates[0]!.error, 'socket hang up')
  assert.equal(entry!.candidates[1]!.timedOut, true)
})

test('a log that cannot be written never changes the verdict', async (t) => {
  const blocker = join(dir(t), 'file')
  writeFileSync(blocker, '')
  const shadow = shadowJudge(judge('claude', async () => deny()).agent, [judge('c', async () => pass()).agent], {
    log: join(blocker, 'shadow.jsonl'),
  })
  assert.equal((await shadow.reason('p')).kind, 'violation')
})

test('includePrompt: false logs only the prompt hash', async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  const shadow = shadowJudge(judge('claude', async () => pass()).agent, [judge('c', async () => pass()).agent], {
    log,
    includePrompt: false,
  })
  await shadow.reason('secret source')
  const [entry] = readLog(log)
  assert.equal('prompt' in entry!, false)
  assert.match(entry!.promptSha256, /^[0-9a-f]{64}$/)
})

test("includePrompt: 'disagreements' logs the prompt only when a candidate disagrees", async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  let candidate: () => Verdict = pass
  const shadow = shadowJudge(judge('claude', async () => pass()).agent, [judge('c', async () => candidate()).agent], {
    log,
    includePrompt: 'disagreements',
  })
  await shadow.reason('agreed source')
  candidate = deny
  await shadow.reason('disputed source')
  const [agreed, disputed] = readLog(log)
  assert.equal('prompt' in agreed!, false)
  assert.match(agreed!.promptSha256, /^[0-9a-f]{64}$/)
  assert.equal(disputed!.prompt, 'disputed source')
})

test("includePrompt: 'disagreements' leaves the prompt out when a candidate only failed to answer", async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  const shadow = shadowJudge(
    judge('claude', async () => pass()).agent,
    [judge('c', async () => { throw new Error('socket hang up') }).agent],
    { log, includePrompt: 'disagreements' },
  )
  await shadow.reason('source')
  const [entry] = readLog(log)
  assert.equal('prompt' in entry!, false)
})

function entry(primary: Verdict, candidate: Partial<ShadowLogEntry['candidates'][number]>, durations = [1000, 400]): ShadowLogEntry {
  return {
    at: '2026-10-21T00:00:00.000Z',
    promptSha256: 'x',
    primary: { name: 'claude', kind: primary.kind, reason: primary.reason, durationMs: durations[0]!, meta: { models: [{ model: 'opus', inputTokens: 10, outputTokens: 1 }] } },
    candidates: [{ name: 'haiku', durationMs: durations[1]!, ...candidate }],
  }
}

test('summarizeShadowLog splits disagreements into leaks and friction, apart from unavailable answers', () => {
  const usage = { models: [{ model: 'claude-haiku-5-5', inputTokens: 100, outputTokens: 10 }] }
  const summary = summarizeShadowLog([
    entry(pass(), { kind: 'pass', reason: 'ok', meta: usage }),
    entry(deny(), { kind: 'violation', reason: 'no red', meta: usage }),
    // Candidate lets through what the primary denied: a leak.
    entry(deny(), { kind: 'pass', reason: 'fine', meta: usage }),
    // Candidate denies what the primary passed: friction.
    entry(pass(), { kind: 'violation', reason: 'retrofit' }),
    entry(pass(), { kind: 'violation', reason: 'Claude judge unavailable: spend limit reached' }),
    entry(pass(), { error: 'socket hang up' }),
    entry(pass(), { timedOut: true }),
    // The primary was unavailable: nothing to compare against.
    entry(deny('Kiro judge unavailable: kiro-cli was not found on PATH'), { kind: 'pass', reason: 'ok' }),
  ])
  const haiku = summary.find((row) => row.candidate === 'haiku' && row.task === undefined)!
  assert.equal(haiku.compared, 4)
  assert.equal(haiku.agreed, 2)
  assert.equal(haiku.leaks.length, 1)
  assert.equal(haiku.friction.length, 1)
  assert.equal(haiku.unavailable, 3)
  assert.equal(haiku.skipped, 1)
  assert.deepEqual(haiku.tokens, { 'claude-haiku-5-5': { input: 300, output: 30 } })
  assert.deepEqual(haiku.primaryTokens, { opus: { input: 80, output: 8 } })
  assert.equal(haiku.medianMs, 400)
  assert.equal(haiku.primaryMedianMs, 1000)
})

test('each verdict is logged with the judging task of the rule that asked', async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  const shadow = shadowJudge(judge('claude', async () => pass()).agent, [judge('c', async () => pass()).agent], { log })
  await withJudgeTask('enforceTdd', () => shadow.reason('p'))
  await shadow.reason('q')
  const [labelled, unlabelled] = readLog(log)
  assert.equal(labelled!.task, 'enforceTdd')
  assert.equal('task' in unlabelled!, false)
})

function tasked(task: string | undefined, primary: Verdict, candidate: Verdict): ShadowLogEntry {
  return { ...entry(primary, { kind: candidate.kind, reason: candidate.reason }), ...(task && { task }) }
}

test('summarizeShadowLog adds a row per judging task, with leak and friction rates bounded for small samples', () => {
  const log = [
    ...Array.from({ length: 20 }, () => tasked('enforceAcceptanceLanguage', deny(), deny())),
    ...Array.from({ length: 20 }, () => tasked('enforceAcceptanceLanguage', pass(), pass())),
    ...Array.from({ length: 3 }, () => tasked('enforceTdd', deny(), pass())),
    ...Array.from({ length: 7 }, () => tasked('enforceTdd', deny(), deny())),
    tasked('enforceTdd', pass(), deny()),
    tasked(undefined, pass(), pass()),
  ]
  const rows = summarizeShadowLog(log).filter((row) => row.candidate === 'haiku')
  assert.deepEqual(rows.map((row) => row.task), [undefined, 'enforceAcceptanceLanguage', 'enforceTdd', '(unlabelled)'])
  const [all, language, tdd] = rows
  assert.equal(all!.compared, 52)
  assert.equal(language!.leaks.length, 0)
  assert.equal(language!.primaryDenials, 20)
  // No leak in 20 denials still allows a true leak rate near 14%.
  assert.ok(Math.abs(language!.leakRateUpper! - (1 - 0.05 ** (1 / 20))) < 1e-6)
  assert.equal(tdd!.leaks.length, 3)
  assert.equal(tdd!.primaryDenials, 10)
  assert.equal(tdd!.friction.length, 1)
  assert.equal(tdd!.primaryPasses, 1)
  assert.equal(tdd!.frictionRateUpper, 1)
})

test('rateUpperBound is the one-sided 95% Clopper-Pearson bound', () => {
  assert.equal(rateUpperBound(0, 0), null)
  assert.equal(rateUpperBound(5, 5), 1)
  assert.ok(Math.abs(rateUpperBound(0, 100)! - (1 - 0.05 ** (1 / 100))) < 1e-6)
  // Known value: 3 in 60 gives about 12.5%.
  assert.ok(Math.abs(rateUpperBound(3, 60)! - 0.1253) < 0.002, String(rateUpperBound(3, 60)))
})

// Issue #168: compacted prompts (a diff in place of a large file) are
// on by default, so the log says which verdicts saw one, and a
// wholeFiles() candidate gets the uncompacted prompt for a direct A/B.
function bigEdit() {
  const before = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`).join('\n') + '\n'
  const after = before.replace('line 500\n', 'line 500 changed\n')
  const rule: Rule = async (action, ctx) => {
    if (action.kind !== 'write') return { kind: 'pass' }
    return ctx!.agent!.reason(
      `## Rules\n\n## Current file content\n\n${before}\n\n## Pending action\n\nFile: ${action.path}\n\n${action.content}\n\n## Response format`,
    )
  }
  return { before, after, rule }
}

test('a compacted verdict logs its full and sent prompt sizes', async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  const shadow = shadowJudge(judge('claude', async () => pass()).agent, [judge('c', async () => pass()).agent], { log })
  const { before, after, rule } = bigEdit()
  const ctx = { readFile: async () => ({ kind: 'present', content: before }), agent: shadow } as RuleContext
  await compactJudgeFiles(rule)({ kind: 'write', path: '/repo/Big.kt', content: after }, ctx)
  await shadow.reason('a prompt no rule compacted')
  const [compacted, whole] = readLog(log)
  assert.ok(compacted!.compaction, 'compacted verdict records compaction')
  assert.ok(compacted!.compaction!.sentChars < compacted!.compaction!.fullChars / 2)
  assert.equal(compacted!.compaction!.sentChars, compacted!.prompt!.length)
  assert.equal(whole!.compaction, undefined)
})

test('a wholeFiles() candidate is asked the uncompacted prompt, under its own name', async (t) => {
  const log = join(dir(t), 'shadow.jsonl')
  const primary = judge('claude', async () => pass())
  const same = judge('claude', async () => pass())
  const shadow = shadowJudge(primary.agent, [wholeFiles(same.agent)], { log })
  const { before, after, rule } = bigEdit()
  const ctx = { readFile: async () => ({ kind: 'present', content: before }), agent: shadow } as RuleContext
  await compactJudgeFiles(rule)({ kind: 'write', path: '/repo/Big.kt', content: after }, ctx)
  assert.match(primary.prompts[0]!, /Unified diff/)
  assert.ok(same.prompts[0]!.includes(before), 'candidate saw the whole file')
  assert.equal(readLog(log)[0]!.candidates[0]!.name, 'claude:whole-files')
  // Outside a compacted call it is the candidate unchanged.
  await shadow.reason('plain')
  assert.equal(same.prompts[1], 'plain')
})
