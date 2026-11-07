// Coverage for issue #146: the Language Test judged the same step
// differently in two feature files, and rejected a glossary verb. The
// judge saw only the file being written and the first 8,000 characters
// of a 21,000-character glossary. It now sees which of the write's new
// steps the project's other specifications already use, and a glossary
// of that size whole.
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import type { Rule, RuleContext, RuleEntry } from '@nizos/probity'

import { enforceAcceptanceLanguage } from './acceptance-language.ts'
import { isRuleBlock } from './scoping.ts'
import { kmpRuleEntries } from '../presets/kmp.ts'

const MESSAGING = `Feature: Messaging

  Scenario: A Handle that is too long is refused
    Given a Sudo
    When the owner asks for a Handle longer than the limit
    Then the Handle is refused as too long
    And nothing was asked of the service
`

const PHONE_BEFORE = `Feature: Phone Numbers

  Scenario: Provisioning a Phone Number for a Sudo
    Given a Sudo
    When the owner provisions a Phone Number for it
    Then the Sudo has that Phone Number
`

const PHONE_AFTER =
  PHONE_BEFORE +
  `
  Scenario: Getting a Phone Number is refused before identity evidence is accepted
    Given a Sudo
    And the owner's identity evidence has not been accepted
    When the owner provisions a Phone Number for it
    Then the Phone Number is refused until the evidence is accepted
    And nothing was asked of the service
`

function specs(t: { after: (fn: () => void) => void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'probity-language-'))
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  mkdirSync(join(dir, 'telephony'))
  writeFileSync(join(dir, 'messaging.feature'), MESSAGING)
  writeFileSync(join(dir, 'telephony', 'phone-numbers.feature'), PHONE_BEFORE)
  return dir
}

function judge(files: Record<string, string> = {}) {
  const prompts: string[] = []
  const ctx = {
    readFile: async (path: string) =>
      path in files ? { kind: 'present', content: files[path] } : { kind: 'absent' },
    agent: {
      reason: async (prompt: string) => {
        prompts.push(prompt)
        return { kind: 'pass', reason: '' }
      },
    },
  } as unknown as RuleContext
  return { prompts, ctx }
}

test('a new step another specification already uses is shown as settled wording', async (t) => {
  const dir = specs(t)
  const path = join(dir, 'telephony', 'phone-numbers.feature')
  const j = judge({ [path]: PHONE_BEFORE })
  await enforceAcceptanceLanguage({ specsDir: dir })({ kind: 'write', path, content: PHONE_AFTER }, j.ctx)
  const prompt = j.prompts[0]!
  assert.match(prompt, /## Wording already settled/)
  const settled = prompt.slice(prompt.indexOf('## Wording already settled'))
  assert.match(settled, /nothing was asked of the service/)
  assert.match(settled, /messaging\.feature:7/)
  assert.match(settled, /do not block/i)
})

test('steps the write leaves unchanged are not listed', async (t) => {
  const dir = specs(t)
  const path = join(dir, 'telephony', 'phone-numbers.feature')
  const j = judge({ [path]: PHONE_BEFORE })
  await enforceAcceptanceLanguage({ specsDir: dir })({ kind: 'write', path, content: PHONE_AFTER }, j.ctx)
  const settled = j.prompts[0]!.slice(j.prompts[0]!.indexOf('## Wording already settled'))
  // "a Sudo" is in both files, but it was already in this one.
  assert.doesNotMatch(settled, /`a Sudo`/)
})

test('a write whose new steps appear nowhere else gets no settled section', async (t) => {
  const dir = specs(t)
  const path = join(dir, 'telephony', 'phone-numbers.feature')
  const j = judge({ [path]: PHONE_BEFORE })
  const content = PHONE_BEFORE + '\n  Scenario: Releasing a Phone Number\n    When the owner releases it\n    Then the Sudo has no Phone Number\n'
  await enforceAcceptanceLanguage({ specsDir: dir })({ kind: 'write', path, content }, j.ctx)
  assert.doesNotMatch(j.prompts[0]!, /## Wording already settled/)
})

test('without specsDir the prompt is unchanged', async () => {
  const j = judge()
  await enforceAcceptanceLanguage()({ kind: 'write', path: '/repo/x.feature', content: PHONE_AFTER }, j.ctx)
  assert.doesNotMatch(j.prompts[0]!, /## Wording already settled/)
})

test('a glossary the size of a real project reaches the judge whole', async () => {
  const glossaryPath = '/repo/GLOSSARY.md'
  const glossary =
    Array.from({ length: 120 }, (_, i) => `## Term ${i}\n\nA domain concept number ${i}, described at some length here.\n`).join('\n') +
    '\n## Identity Evidence\n\nDetails and documents the owner submits so that the service may provision a Phone Number.\n'
  assert.ok(glossary.length > 8_000 && glossary.length < 32_000)
  const j = judge({ [glossaryPath]: glossary })
  await enforceAcceptanceLanguage({ glossaryPath })({ kind: 'write', path: '/repo/x.feature', content: PHONE_AFTER }, j.ctx)
  assert.match(j.prompts[0]!, /so that the service may provision a Phone Number/)
  assert.doesNotMatch(j.prompts[0]!, /glossary truncated/)
})

test('a truncated glossary tells the judge that a missing term may be recorded', async () => {
  const glossaryPath = '/repo/GLOSSARY.md'
  const glossary = 'x'.repeat(40_000)
  const j = judge({ [glossaryPath]: glossary })
  await enforceAcceptanceLanguage({ glossaryPath })({ kind: 'write', path: '/repo/x.feature', content: PHONE_AFTER }, j.ctx)
  assert.match(j.prompts[0]!, /glossary truncated/)
  assert.match(j.prompts[0]!, /not evidence/i)
})

test('the vocabulary rules accept any grammatical form of a word the specs already use', async () => {
  const j = judge()
  await enforceAcceptanceLanguage()({ kind: 'write', path: '/repo/x.feature', content: PHONE_AFTER }, j.ctx)
  assert.match(j.prompts[0]!, /any grammatical form/i)
})

// ── Preset wiring: the KMP preset passes its specsDir ──────────────

function languageRule(entries: RuleEntry[]): Rule {
  for (const entry of entries) {
    if (!isRuleBlock(entry)) continue
    const rule = entry.rules?.find((candidate: Rule) => candidate.name.includes('enforceAcceptanceLanguage'))
    if (rule) return rule
  }
  assert.fail('preset should include enforceAcceptanceLanguage')
}

test('kmpRuleEntries: the language judge sees settled wording from specsDir', async (t) => {
  const dir = specs(t)
  const path = join(dir, 'telephony', 'phone-numbers.feature')
  const j = judge({ [path]: PHONE_BEFORE })
  await languageRule(kmpRuleEntries('/repo', { specsDir: dir }))({ kind: 'write', path, content: PHONE_AFTER }, j.ctx)
  assert.match(j.prompts[0]!, /## Wording already settled[^]*nothing was asked of the service/)
})
