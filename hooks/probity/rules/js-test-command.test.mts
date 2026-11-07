// Issue #150: the JS preset's default commit-gate command,
// /npm (run )?test|vitest|jest/, matched those words anywhere, so a
// `gh issue create` whose body mentioned vitest was recorded as the
// latest test run, and the next commit was denied as not green. A
// command counts only when one of its top-level commands starts the
// runner.
import assert from 'node:assert/strict'
import test from 'node:test'

import type { Rule, RuleEntry } from '@nizos/probity'

import { jsRuleEntries } from '../presets/js.ts'
import { isJsTestInvocation } from './gates.ts'

const INVOCATIONS = [
  'npm test',
  'npm t',
  'npm run test',
  'npm run test:unit -- --run',
  'pnpm test',
  'yarn test',
  'npx vitest run',
  'vitest',
  'npx jest --ci',
  './node_modules/.bin/vitest run',
  'CI=1 npx vitest run',
  'cd /repo && npm test 2>&1 | tail -5',
  "npm test 2>&1 | grep -E 'FAIL|Tests' | head; npm run typecheck",
]

const MENTIONS = [
  'echo vitest',
  'gh issue create --title x --body "the jest and vitest runs"',
  "git commit -m 'fix npm test script'",
  'echo "Test Files  3 passed (3)"',
  'grep -rn jest src',
  'npm install -D vitest',
  'cat package.json',
]

for (const command of INVOCATIONS) {
  test(`runs the suite: ${command}`, () => {
    assert.equal(isJsTestInvocation(command), true)
  })
}

for (const command of MENTIONS) {
  test(`only mentions a runner: ${command}`, () => {
    assert.equal(isJsTestInvocation(command), false)
  })
}

function gate(entries: RuleEntry[]): Rule {
  const rule = entries
    .flatMap((entry) => (typeof entry === 'function' ? [entry] : (entry.rules ?? [])))
    .find((candidate) => candidate.name === 'requireGreenTestRun')
  assert.ok(rule, 'JS preset should wire requireGreenTestRun')
  return rule
}

const commit = { kind: 'command' as const, command: 'git commit -m x' }

function historyCtx(events: unknown[]) {
  return { history: async () => events as never }
}

test('the preset gate ignores a later command that only mentions a runner', async () => {
  const verdict = await gate(jsRuleEntries())(
    commit,
    historyCtx([
      { kind: 'write', path: 'src/a.ts', content: '' },
      { kind: 'command', command: 'npm test', output: ' Test Files  4 passed (4)' },
      { kind: 'command', command: 'gh issue create --body "vitest"', output: 'https://github.com/x/y/issues/1' },
    ]),
  )
  assert.equal(verdict.kind, 'pass')
})

test('the preset gate does not take an echoed summary line as a green run', async () => {
  const verdict = await gate(jsRuleEntries())(
    commit,
    historyCtx([
      { kind: 'write', path: 'src/a.ts', content: '' },
      { kind: 'command', command: 'echo "vitest: Test Files  4 passed"', output: 'vitest: Test Files  4 passed' },
    ]),
  )
  assert.equal(verdict.kind, 'violation')
  assert.match(verdict.reason ?? '', /Run the test suite/)
})

test('a custom commitCommand is used as given', async () => {
  const verdict = await gate(jsRuleEntries({ commitCommand: /make check/ }))(
    commit,
    historyCtx([
      { kind: 'write', path: 'src/a.ts', content: '' },
      { kind: 'command', command: 'make check', output: ' Test Files  4 passed (4)' },
    ]),
  )
  assert.equal(verdict.kind, 'pass')
})
