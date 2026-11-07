// Issue #162: a run piped through grep or head can pass every test and
// still lose the runner's summary line, the only thing the commit gate
// reads as green. Its deny said "not green", which sent the agent hunting
// for failures that weren't there; it must name the missing summary.
import assert from 'node:assert/strict'
import test from 'node:test'

import { requireGreenTestRun } from './gates.ts'

const rule = requireGreenTestRun({
  command: /\bnpm\s+(?:run\s+)?test\b/,
  successPattern: /Test Files\s+\d+ passed|Tests:\s+.*\b\d+ passed/,
  failurePattern: /\bFAIL\b|Tests:\s+.*\b\d+ failed|Test Files\s+.*\b\d+ failed/,
  listCommitFiles: () => [],
})

const commit = { kind: 'command' as const, command: 'git commit -m x' }

async function verdictAfter(command: string, output: string) {
  const history = [
    { kind: 'write' as const, path: 'src/a.ts', content: '' },
    { kind: 'command' as const, command, output },
  ]
  return rule(commit, { history: async () => history as never })
}

test('a run whose output lost the summary line is denied for that, not as a failure', async () => {
  const verdict = await verdictAfter(
    "npm test 2>&1 | grep -E 'FAIL|Error' | head",
    '',
  )
  assert.equal(verdict.kind, 'violation')
  const reason = verdict.reason ?? ''
  assert.match(reason, /no failure, but/)
  assert.match(reason, /summary line/)
  assert.match(reason, /grep|head|tail/)
  assert.ok(reason.includes('Test Files\\s+\\d+ passed'), reason)
  assert.doesNotMatch(reason, /Fix the failures/)
})

test('a run that shows a failure keeps the failure message', async () => {
  const verdict = await verdictAfter('npm test', ' FAIL  src/a.test.ts\nTest Files  1 failed')
  assert.equal(verdict.kind, 'violation')
  assert.match(verdict.reason ?? '', /Fix the failures/)
  assert.doesNotMatch(verdict.reason ?? '', /summary line/)
})

test('an unfiltered green run passes', async () => {
  const verdict = await verdictAfter('npm test', ' Test Files  4 passed (4)\n      Tests  27 passed (27)')
  assert.equal(verdict.kind, 'pass')
})
