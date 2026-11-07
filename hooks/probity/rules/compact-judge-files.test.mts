// Issue #168: every judge prompt carried the whole file twice (before and
// after), so a run of small edits to a large file resent it each time.
// For an edit to a large existing file the judge now gets a unified diff
// with context; the rule itself still sees the whole file.
import assert from 'node:assert/strict'
import test from 'node:test'

import type { Rule, RuleContext } from '@nizos/probity'

import { jsRuleEntries } from '../presets/js.ts'
import { compactJudgeFiles, unifiedDiff, withCompactJudgeFiles } from './compact-judge-files.ts'

const lines = (n: number, tag = 'line') => Array.from({ length: n }, (_, i) => `${tag} ${i + 1}`)
// ~9 KB, over the default 8,000-byte threshold.
const BIG = lines(1000).join('\n') + '\n'
const EDITED = BIG.replace('line 200\n', 'line 200 changed\n')

// ── unifiedDiff ────────────────────────────────────────────────────

test('one changed line gives one hunk with context either side', () => {
  const diff = unifiedDiff(BIG, EDITED, 3)
  assert.equal(
    diff,
    ['@@ -197,7 +197,7 @@', ' line 197', ' line 198', ' line 199', '-line 200', '+line 200 changed', ' line 201', ' line 202', ' line 203'].join('\n'),
  )
})

test('changes far apart give separate hunks; close ones merge', () => {
  const far = BIG.replace('line 10\n', 'ten\n').replace('line 300\n', 'three hundred\n')
  assert.equal(unifiedDiff(BIG, far, 3).match(/^@@/gm)?.length, 2)
  const near = BIG.replace('line 10\n', 'ten\n').replace('line 14\n', 'fourteen\n')
  assert.equal(unifiedDiff(BIG, near, 3).match(/^@@/gm)?.length, 1)
})

test('inserted and deleted lines are counted in the hunk header', () => {
  const inserted = BIG.replace('line 5\n', 'line 5\nnew a\nnew b\n')
  assert.match(unifiedDiff(BIG, inserted, 1), /^@@ -5,2 \+5,4 @@\n line 5\n\+new a\n\+new b\n line 6$/)
  const deleted = BIG.replace('line 5\nline 6\n', '')
  assert.match(unifiedDiff(BIG, deleted, 1), /^@@ -4,4 \+4,2 @@\n line 4\n-line 5\n-line 6\n line 7$/)
})

test('identical content gives an empty diff', () => {
  assert.equal(unifiedDiff(BIG, BIG, 3), '')
})

test('an edit at both ends of a long file gives two small hunks (review of #168)', () => {
  const long = lines(3000).join('\n') + '\n'
  const ends = long.replace('line 1\n', 'first\n').replace('line 3000\n', 'last\n')
  const diff = unifiedDiff(long, ends, 20)!
  assert.equal(diff.match(/^@@/gm)?.length, 2)
  assert.ok(diff.split('\n').length < 60, `${diff.split('\n').length} lines`)
})

test('past 1,000 changed lines there is no diff', () => {
  const long = lines(3000).join('\n') + '\n'
  const rewritten = lines(3000, 'other').join('\n') + '\n'
  assert.equal(unifiedDiff(long, rewritten, 20), null)
})

test('lines matching keep stay in view as context of their own', () => {
  const source = ["import { a } from './a'", 'package x', ...lines(200)].join('\n') + '\n'
  const diff = unifiedDiff(source, source.replace('line 150\n', 'changed\n'), 2, (line) => /import|package/.test(line))!
  assert.match(diff, /^@@ -1,2 \+1,2 @@\n import \{ a \} from '\.\/a'\n package x\n@@ -150,5 \+150,5 @@/)
})

test('a dropped final newline is marked', () => {
  const diff = unifiedDiff(BIG, EDITED.slice(0, -1), 1)!
  assert.match(diff, /-line 1000\n\+line 1000\n\\ No newline at end of file$/)
})

// ── the wrapper ────────────────────────────────────────────────────

// Builds its prompt the way Probity's enforceTdd and this package's
// rules do, and records what the rule and the judge each saw.
function promptingRule(seen: { content?: string; prompt?: string }): Rule {
  const rule: Rule = async (action, ctx) => {
    if (action.kind !== 'write') return { kind: 'pass' }
    seen.content = action.content
    const before = await ctx!.readFile!(action.path)
    const current = before.kind === 'present' ? before.content : '(file does not exist)'
    const prompt = [
      '## Rules\n\nJudge the change.',
      `## Current file content\n\n${current}`,
      `## Pending action\n\nFile: ${action.path}\n\n${action.content}`,
      '## Response format\n\nJSON.',
    ].join('\n\n')
    return ctx!.agent!.reason(prompt)
  }
  Object.defineProperty(rule, 'name', { value: 'enforceTdd' })
  return rule
}

function ctxWith(onDisk: string | undefined, seen: { prompt?: string }): RuleContext {
  return {
    readFile: async () => (onDisk === undefined ? { kind: 'absent' } : { kind: 'present', content: onDisk }),
    agent: {
      reason: async (prompt: string) => {
        seen.prompt = prompt
        return { kind: 'pass', reason: '' }
      },
    },
  } as RuleContext
}

const write = (content: string, path = '/repo/src/Big.kt') => ({ kind: 'write', path, content }) as const

test('an edit to a large file sends the judge a diff, the rule the whole file', async () => {
  const seen: { content?: string; prompt?: string } = {}
  await compactJudgeFiles(promptingRule(seen))(write(EDITED), ctxWith(BIG, seen))
  assert.equal(seen.content, EDITED)
  const prompt = seen.prompt ?? ''
  assert.match(prompt, /## Current file content\n\n\(\/repo\/src\/Big\.kt exists, 1000 lines;/)
  assert.match(prompt, /## Pending action\n\nFile: \/repo\/src\/Big\.kt\n\nUnified diff/)
  assert.match(prompt, /-line 200\n\+line 200 changed/)
  assert.doesNotMatch(prompt, /line 100\n/)
  assert.match(prompt, /## Rules[\s\S]*## Response format\n\nJSON\.$/)
  assert.ok(prompt.length < BIG.length / 2, `prompt is ${prompt.length} chars`)
})

test('a small file is sent whole', async () => {
  const small = lines(20).join('\n') + '\n'
  const seen: { prompt?: string } = {}
  await compactJudgeFiles(promptingRule(seen))(write(small.replace('line 3', 'three')), ctxWith(small, seen))
  assert.match(seen.prompt ?? '', /## Current file content\n\nline 1\nline 2\nline 3\n/)
})

test('a new file is sent whole', async () => {
  const seen: { prompt?: string } = {}
  await compactJudgeFiles(promptingRule(seen))(write(BIG), ctxWith(undefined, seen))
  assert.match(seen.prompt ?? '', /\(file does not exist\)/)
  assert.ok((seen.prompt ?? '').includes(BIG))
})

test('a prompt without the exact file sections is passed on unchanged', async () => {
  const seen: { prompt?: string } = {}
  const rule: Rule = async (_action, ctx) => ctx!.agent!.reason(`Judge this:\n${BIG}`)
  await compactJudgeFiles(rule)(write(EDITED), ctxWith(BIG, seen))
  assert.equal(seen.prompt, `Judge this:\n${BIG}`)
})

test('import lines far from the change reach the judge', async () => {
  const source = ["import com.vendor.Sdk", ...lines(1000)].join('\n') + '\n'
  const seen: { prompt?: string } = {}
  await compactJudgeFiles(promptingRule(seen))(write(source.replace('line 900\n', 'nine hundred\n')), ctxWith(source, seen))
  assert.match(seen.prompt ?? '', /@@ -1,1 \+1,1 @@\n import com\.vendor\.Sdk\n@@/)
})

test('a diff not clearly smaller than the files is not used', async () => {
  const everyOther = BIG.split('\n').map((line, i) => (i % 2 ? `${line} changed` : line)).join('\n')
  const seen: { prompt?: string } = {}
  await compactJudgeFiles(promptingRule(seen))(write(everyOther), ctxWith(BIG, seen))
  assert.ok((seen.prompt ?? '').includes(BIG), 'whole file sent')
})

test('a prompt without this write\'s file is sent without reading the file', async () => {
  let reads = 0
  const seen: { prompt?: string } = {}
  const ctx = { ...ctxWith(BIG, seen), readFile: async () => (reads++, { kind: 'present', content: BIG }) } as RuleContext
  const rule: Rule = async (_action, c) => c!.agent!.reason('Judge the scenario.')
  await compactJudgeFiles(rule)(write(EDITED), ctx)
  assert.equal(reads, 0)
  assert.equal(seen.prompt, 'Judge the scenario.')
})

test('minBytes and contextLines are options', async () => {
  // ~2.7 KB: under the default threshold, over minBytes 1,000.
  const small = lines(300).join('\n') + '\n'
  const seen: { prompt?: string } = {}
  await compactJudgeFiles(promptingRule(seen), { minBytes: 1000, contextLines: 1 })(
    write(small.replace('line 10\n', 'ten\n')),
    ctxWith(small, seen),
  )
  assert.match(seen.prompt ?? '', /@@ -9,3 \+9,3 @@\n line 9\n-line 10\n\+ten\n line 11/)
})

test('the wrapper keeps the rule name and leaves rules that ask no judge alone', async () => {
  const seen: { content?: string; prompt?: string } = {}
  const wrapped = compactJudgeFiles(promptingRule(seen))
  assert.equal(wrapped.name, 'enforceTdd')
  const deterministic: Rule = async () => ({ kind: 'violation', reason: 'no' })
  const verdict = await compactJudgeFiles(deterministic)(write(EDITED), ctxWith(BIG, seen))
  assert.deepEqual(verdict, { kind: 'violation', reason: 'no' })
})

test('withCompactJudgeFiles wraps flat rules and block rules', async () => {
  const seen: { content?: string; prompt?: string } = {}
  const [flat, block] = withCompactJudgeFiles([promptingRule(seen), { files: ['**'], rules: [promptingRule(seen)] }])
  await (flat as Rule)(write(EDITED), ctxWith(BIG, seen))
  assert.match(seen.prompt ?? '', /Unified diff/)
  seen.prompt = undefined
  await (block as { rules: Rule[] }).rules[0]!(write(EDITED), ctxWith(BIG, seen))
  assert.match(seen.prompt ?? '', /Unified diff/)
})

// ── the presets ────────────────────────────────────────────────────

function presetTdd(entries: ReturnType<typeof jsRuleEntries>): Rule {
  const rule = entries
    .flatMap((entry) => (typeof entry === 'function' ? [entry] : entry.rules))
    .find((candidate) => candidate.name === 'enforceTdd')
  assert.ok(rule)
  return rule
}

function tddCtx(onDisk: string, seen: { prompt?: string }): RuleContext {
  return { ...ctxWith(onDisk, seen), rawHistory: async () => [] } as RuleContext
}

const BIG_TS = lines(400, 'export const value').map((line) => line.replace(/ (\d+)$/, '$1 = 1')).join('\n') + '\n'
const EDITED_TS = BIG_TS.replace('value200 = 1', 'value200 = 2')

test("the JS preset's TDD judge gets a diff for an edit to a large file", async () => {
  const seen: { prompt?: string } = {}
  await presetTdd(jsRuleEntries())(write(EDITED_TS, '/repo/src/big.ts'), tddCtx(BIG_TS, seen))
  assert.match(seen.prompt ?? '', /-export const value200 = 1\n\+export const value200 = 2/)
  assert.doesNotMatch(seen.prompt ?? '', /value100 = 1/)
})

test('compactJudgeFiles: false sends the whole file', async () => {
  const seen: { prompt?: string } = {}
  await presetTdd(jsRuleEntries({ compactJudgeFiles: false }))(write(EDITED_TS, '/repo/src/big.ts'), tddCtx(BIG_TS, seen))
  assert.match(seen.prompt ?? '', /value100 = 1/)
})
