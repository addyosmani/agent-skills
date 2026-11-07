import assert from 'node:assert/strict'
import test from 'node:test'

import type { Rule, RuleContext } from '@nizos/probity'

import { jsRuleEntries } from '../presets/js.ts'
import { enforceJsTdd, JS_TDD_ADDENDUM } from './js-tdd.ts'

const testWrite = {
  kind: 'write' as const,
  path: '/repo/src/domain/account.test.ts',
  content: "  it('forbids a Manager from naming a different Manager', () => {})\n",
}

function presetTddRule(): Rule {
  const entry = jsRuleEntries().find((candidate) =>
    candidate.rules?.some((rule) => rule.name === 'enforceTdd'),
  )
  const rule = entry?.rules?.find((candidate) => candidate.name === 'enforceTdd')
  assert.ok(rule, 'JS preset should wire a TDD rule named enforceTdd')
  return rule
}

async function capturedPrompt(rule: Rule): Promise<string> {
  let prompt = ''
  const ctx: RuleContext = {
    readFile: async () => ({ kind: 'present', content: "describe('invite', () => {})" }),
    rawHistory: async () => [],
    agent: {
      reason: async (value) => {
        prompt = value
        return { kind: 'pass', reason: '' }
      },
    },
  }
  await rule(testWrite, ctx)
  return prompt
}

const sources = [
  ['jsRuleEntries', presetTddRule],
  ['enforceJsTdd standalone', enforceJsTdd],
] as const

test('JS TDD judge lets a new red test in without a prior run of it (#73)', async () => {
  for (const [source, make] of sources) {
    const prompt = await capturedPrompt(make())
    assert.match(prompt, /Adding a failing test is the red step itself/, source)
    assert.match(prompt, /passes without any prior run of that test/, source)
    assert.match(prompt, /applies only to the production write that follows it/, source)
    assert.match(prompt, /only green->red question is whether the prior green left an unmistakable refactor unmade/, source)
    assert.match(prompt, /never a reason to block it/, source)
  }
})

test('JS TDD judge still requires an observed failing run before production code', async () => {
  for (const [source, make] of sources) {
    const prompt = await capturedPrompt(make())
    assert.match(prompt, /more than one new test is a violation/, source)
    assert.match(prompt, /A test written in the session with no run after it has not been observed failing/, source)
  }
})

test('JS TDD addendum extends the default rules rather than replacing them', async () => {
  const prompt = await capturedPrompt(enforceJsTdd())
  assert.match(prompt, /### Red phase: write a failing test first/)
  assert.match(prompt, /#### Enforcing the refactor phase/)
  assert.ok(
    prompt.indexOf('#### Enforcing the refactor phase') < prompt.indexOf('## Adding a red test'),
    'addendum comes after the defaults',
  )
})

// Issue #166: vitest doesn't type-check, so a green step can leave
// `tsc --noEmit` failing; the judge refused every type-only fix as "not
// driven by a failing test" and left no path.
test('the JS TDD addendum allows a type-only fix for a type-check failure', () => {
  assert.match(JS_TDD_ADDENDUM, /type-check failure/)
  assert.match(JS_TDD_ADDENDUM, /changes only types/)
  assert.match(JS_TDD_ADDENDUM, /at least as strong/)
  assert.match(JS_TDD_ADDENDUM, /runtime behavior/)
})
