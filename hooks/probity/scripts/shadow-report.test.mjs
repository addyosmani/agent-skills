import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { closeSync, mkdtempSync, openSync, rmSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SCRIPT = join(HERE, 'shadow-report.ts')
const TSX = join(HERE, '..', 'node_modules', '.bin', 'tsx')

function line(primaryKind, candidateKind, extra = {}, task) {
  return JSON.stringify({
    at: '2026-10-21T10:00:00.000Z',
    ...(task && { task }),
    promptSha256: `sha-${primaryKind}-${candidateKind}`,
    primary: { name: 'claude', kind: primaryKind, reason: `primary says ${primaryKind}`, durationMs: 8000 },
    candidates: [{ name: 'claude:claude-haiku-5-5', kind: candidateKind, reason: `haiku says ${candidateKind}`, durationMs: 2000, ...extra }],
  })
}

function report(t, content, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'shadow-report-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const log = join(dir, 'shadow.jsonl')
  writeFileSync(log, content)
  return spawnSync(TSX, [SCRIPT, log, ...args], { encoding: 'utf8' })
}

test('reports agreement, leaks and friction per candidate', (t) => {
  const usage = { meta: { models: [{ model: 'claude-haiku-5-5', inputTokens: 1000, outputTokens: 50 }] } }
  const res = report(t, [line('pass', 'pass', usage), line('violation', 'violation', usage), line('violation', 'pass'), line('pass', 'violation'), 'not json'].join('\n') + '\n')
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /4 verdicts/)
  assert.match(res.stdout, /1 unreadable line skipped/)
  assert.match(res.stdout, /claude:claude-haiku-5-5/)
  assert.match(res.stdout, /agreed 2 of 4 \(50\.0%\)/)
  assert.match(res.stdout, /leaks 1 of 2 primary denials \(50\.0%, up to 97\.5% at 95%\)/)
  assert.match(res.stdout, /friction 1 of 2 primary passes \(50\.0%, up to 97\.5% at 95%\)/)
  assert.match(res.stdout, /median 2\.0 s \(primary 8\.0 s\)/)
  assert.match(res.stdout, /tokens:\n    claude-haiku-5-5: in 2,000, out 100/)
  assert.match(res.stdout, /primary tokens: none recorded/)
  // Disagreements are listed only on request.
  assert.doesNotMatch(res.stdout, /haiku says pass/)
})

test('--show leaks lists each leak with both reasons and the prompt hash to find it by', (t) => {
  const res = report(t, [line('violation', 'pass'), line('pass', 'violation')].join('\n') + '\n', ['--show', 'leaks'])
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /sha-violation-pass/)
  assert.match(res.stdout, /primary: primary says violation/)
  assert.match(res.stdout, /candidate: haiku says pass/)
  assert.doesNotMatch(res.stdout, /sha-pass-violation/)
})

test('a missing log is an error with usage', (t) => {
  const res = spawnSync(TSX, [SCRIPT, join(tmpdir(), 'no-such-shadow.jsonl')], { encoding: 'utf8' })
  assert.equal(res.status, 1)
  assert.match(res.stderr, /cannot read/)
})

test('a table breaks each candidate down by judging task', (t) => {
  const lines = [
    ...Array.from({ length: 30 }, () => line('violation', 'violation', {}, 'enforceAcceptanceLanguage')),
    line('violation', 'pass', {}, 'enforceTdd'),
    line('pass', 'pass', {}, 'enforceTdd'),
  ]
  const res = report(t, lines.join('\n') + '\n', ['--show', 'leaks'])
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /by task:/)
  assert.match(res.stdout, /enforceAcceptanceLanguage +30 +100\.0% +0\/30 \(≤ ?9\.5%\) +-/)
  assert.match(res.stdout, /enforceTdd +2 +50\.0% +1\/1 \(≤ ?100\.0%\) +0\/1 \(≤ ?95\.0%\)/)
  // A listed disagreement names its task.
  assert.match(res.stdout, /sha-violation-pass  enforceTdd/)
})

test('unlabelled verdicts are flagged with how to label them', (t) => {
  const res = report(t, [line('pass', 'pass', {}, 'enforceTdd'), line('pass', 'pass'), line('violation', 'violation')].join('\n') + '\n')
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /2 of 3 verdicts \(66\.7%\) have no judging task/)
  assert.match(res.stdout, /probityConfig\(\)/)
})

test('a log where every verdict has a task carries no such warning', (t) => {
  const res = report(t, line('pass', 'pass', {}, 'enforceTdd') + '\n')
  assert.doesNotMatch(res.stdout, /no judging task/)
})

// Issue #164: a week of full prompts made a 620 MB log, past V8's
// longest string, and the report read it whole. Read under a small heap,
// a log far larger than the heap must still report.
test('a log larger than the heap is read line by line, prompts dropped', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'shadow-report-big-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const log = join(dir, 'shadow.jsonl')
  const prompt = 'x'.repeat(100_000)
  const fd = openSync(log, 'w')
  for (let i = 0; i < 1500; i++) {
    const entry = JSON.parse(line('pass', i % 2 ? 'pass' : 'violation'))
    writeSync(fd, JSON.stringify({ ...entry, prompt }) + '\n')
  }
  closeSync(fd)
  const res = spawnSync(TSX, [SCRIPT, log], {
    encoding: 'utf8',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=64' },
  })
  assert.equal(res.status, 0, res.stderr.slice(-500))
  assert.match(res.stdout, /1500 verdicts/)
  assert.match(res.stdout, /agreed 750 of 1500/)
})

test('the report compares agreement on compacted prompts with the rest (#168)', (t) => {
  const compaction = (entry) => JSON.stringify({ ...JSON.parse(entry), compaction: { fullChars: 40000, sentChars: 8000 } })
  const res = report(t, [compaction(line('pass', 'pass')), compaction(line('violation', 'pass')), line('pass', 'pass')].join('\n') + '\n')
  assert.equal(res.status, 0, res.stderr)
  assert.match(res.stdout, /2 of 3 verdicts had a compacted prompt \(a diff in place of the file\), median 40\.0K chars sent as 8\.0K chars/)
  assert.match(res.stdout, /on compacted prompts: agreed 1 of 2/)
  assert.match(res.stdout, /on whole prompts: agreed 1 of 1/)
})

// Issue #174: the replay command shares the report's output.
const REPLAY = join(HERE, 'shadow-replay.ts')

test('the replay command needs a record log and a known judge', (t) => {
  const none = spawnSync(TSX, [REPLAY], { encoding: 'utf8' })
  assert.equal(none.status, 1)
  assert.match(none.stderr, /usage: probity-shadow-replay/)
  const bad = spawnSync(TSX, [REPLAY, join(tmpdir(), 'x.jsonl'), '--judge', 'gpt'], { encoding: 'utf8' })
  assert.equal(bad.status, 1)
  assert.match(bad.stderr, /--judge takes claude or kiro/)
})

test('the replay command refuses option mistakes that would lift the spend cap', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'shadow-replay-test-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  const log = join(dir, 'whole.jsonl')
  writeFileSync(log, '')
  for (const [args, message] of [
    [['--limit'], /--limit needs a value/],
    [['--limit=1'], /unknown option --limit=1/],
    [['--limt', '1'], /unknown option --limt/],
    [['--judge'], /--judge needs a value/],
    [['--judge', '--limit', '1'], /--judge needs a value/],
  ]) {
    const res = spawnSync(TSX, [REPLAY, log, ...args], { encoding: 'utf8' })
    assert.equal(res.status, 1, args.join(' '))
    assert.match(res.stderr, message)
  }
})
