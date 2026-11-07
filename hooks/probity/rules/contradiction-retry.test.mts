import assert from 'node:assert/strict'
import test from 'node:test'

import type { Rule, RuleContext, RuleEntry, RuleResult } from '@nizos/probity'
import { toVerdict } from '../node_modules/@nizos/probity/dist/vendors/to-verdict.js'

import { jsRuleEntries } from '../presets/js.ts'
import { kmpRuleEntries } from '../presets/kmp.ts'
import { kotlinRuleEntries } from '../presets/kotlin.ts'
import { swiftRuleEntries } from '../presets/swift.ts'
import { withContradictionRetry } from './gates.ts'

// Issue #45, the judge's reason as recorded. The identical retry passed.
const CONTRADICTION =
  'This write adds a new test `should delete one Text Message, then the ' +
  'whole conversation` while the prior test `should show a Text Message ' +
  'received unread, and mark the conversation read and unread` was just ' +
  'added and its green (the mark commands) has been implemented. That is ' +
  'fine, but the current file already contains the mark test and this ' +
  'write adds a second, distinct behavior-driving test (delete). Red ' +
  'allows at most one new test per write; add the delete test in its own ' +
  'write after the mark slice is green — which it is — so this is a ' +
  'single new test, which is allowed. Re-examining: the diff versus ' +
  'current file content adds only ONE new test (the delete test). This ' +
  'is permitted.'

const write = {
  kind: 'write' as const,
  path: '/repo/src/Thing.ts',
  content: 'export const thing = 1',
}

function sequence(...results: RuleResult[]): { rule: Rule; calls: () => number } {
  let calls = 0
  const rule: Rule = async function enforceTdd() {
    return results[Math.min(calls++, results.length - 1)]!
  }
  return { rule, calls: () => calls }
}

test('a deny whose reason concludes the write is permitted is judged once more', async () => {
  const { rule, calls } = sequence(
    { kind: 'violation', reason: CONTRADICTION },
    { kind: 'pass' },
  )
  const result = await withContradictionRetry(rule)(write)
  assert.equal(result.kind, 'pass')
  assert.equal(calls(), 2)
})

test('the second verdict stands when it denies again', async () => {
  const { rule, calls } = sequence(
    { kind: 'violation', reason: CONTRADICTION },
    { kind: 'violation', reason: 'adds two tests' },
  )
  const result = await withContradictionRetry(rule)(write)
  assert.equal(result.kind, 'violation')
  assert.equal(result.reason, 'adds two tests')
  assert.equal(calls(), 2)
})

// Issue #50, the judge's reason as recorded: it ends in a bare "Pass.".
const BARE_PASS =
  'The green write for the reset test also introduces DEFAULT_GREETING, ' +
  'but that constant is not defined anywhere in the pending file (the ' +
  'companion object still only has VOICEMAIL_MEDIA_TYPE), so this alone ' +
  'is a transient reference — allowed. However, the reset implementation ' +
  'reuses pointGreeting, and the observed failing test asserts a PUT with ' +
  'greeting=/greeting/default and Default result, which this satisfies ' +
  'minimally. The real issue: the pending write points at DEFAULT_GREETING ' +
  '= "/greeting/default" via a constant not present in the file, which is ' +
  'fine transiently. Reconsidering: this is a minimal green satisfying the ' +
  'single failing reset test by delegating to the existing pointGreeting ' +
  'move. It is not over-implementation. Pass.'

for (const reason of [
  BARE_PASS,
  'Re-examining the diff, it adds one test. Verdict: pass.',
  'The helper only moves existing logic. So, allowed.',
  'Reconsidering: the write only moves covered logic, so it is not a violation.',
  'On reflection the extra branch is required by the assertion; this is not over-implementation.',
  // A Sonnet judge's endings (#169).
  'The file on disk has the earlier tests; this write adds one, so this is a valid single red test add.',
  'Correction: this write adds exactly one new test, which is allowed as the red step.',
]) {
  test(`a deny concluding it passes is retried: ${reason.slice(-40)}`, async () => {
    const { rule, calls } = sequence({ kind: 'violation', reason }, { kind: 'pass' })
    const result = await withContradictionRetry(rule)(write)
    assert.equal(result.kind, 'pass')
    assert.equal(calls(), 2)
  })
}

for (const reason of [
  'This write adds two new tests. This is not permitted.',
  'Over-implementation: the NotSent branch is not required by the failing test.',
  'Adding a test is permitted, but this production write has no observed red.',
  'The green adds an unasserted branch even though the tests pass.',
  'The tests pass. The NotSent branch is still over-implementation.',
  'This does not pass.',
  'Adding one test would be allowed as the red step, but this write adds two, so it is not allowed as the red step.',
  'Correction: the write adds two new tests, which is a violation.',
  'Correction: it adds production logic, which is allowed only after an observed failing test.',
  'Neither is a valid red step.',
  'Only a deletion is a valid refactor step.',
]) {
  test(`a consistent deny is not retried: ${reason.slice(0, 40)}`, async () => {
    const { rule, calls } = sequence({ kind: 'violation', reason })
    const result = await withContradictionRetry(rule)(write)
    assert.equal(result.kind, 'violation')
    assert.equal(calls(), 1)
  })
}

test('a pass is not retried', async () => {
  const { rule, calls } = sequence({ kind: 'pass' })
  assert.equal((await withContradictionRetry(rule)(write)).kind, 'pass')
  assert.equal(calls(), 1)
})

function tddRules(entries: RuleEntry[]): Rule[] {
  const rules: Rule[] = []
  const visit = (entry: unknown) => {
    if (typeof entry === 'function') rules.push(entry as Rule)
    else if (entry && typeof entry === 'object' && 'rules' in entry) {
      for (const inner of (entry as { rules: unknown[] }).rules) visit(inner)
    }
  }
  for (const entry of entries) visit(entry)
  return rules
}

for (const [preset, entries, path, content] of [
  ['js', jsRuleEntries('/repo'), '/repo/src/Thing.ts', 'export const thing = 1'],
  ['kotlin', kotlinRuleEntries('/repo'), '/repo/src/main/kotlin/Thing.kt', 'val thing = 1'],
  [
    'kmp',
    kmpRuleEntries('/repo'),
    '/repo/shared/src/commonMain/kotlin/Thing.kt',
    'val thing = 1',
  ],
  ['swift', swiftRuleEntries('/repo'), '/repo/Sources/App/Thing.swift', 'let thing = 1'],
] as const) {
  test(`${preset} preset: the TDD judge retries a self-contradicting deny`, async () => {
    let tddCalls = 0
    const ctx = {
      readFile: async () => ({ kind: 'absent' as const }),
      rawHistory: async () => [],
      agent: {
        reason: async (prompt: string) => {
          const tdd = prompt.includes('You are a TDD validator')
          const first = tdd && tddCalls++ === 0
          const text = first
            ? JSON.stringify({ kind: 'violation', reason: CONTRADICTION })
            : '{"kind":"pass","reason":""}'
          return toVerdict(async () => ({ text }))
        },
      },
    } as unknown as RuleContext
    for (const rule of tddRules(entries as RuleEntry[])) {
      await rule({ kind: 'write', path, content }, ctx)
    }
    assert.equal(tddCalls, 2, 'TDD judge was not asked again')
  })
}
