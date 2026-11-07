// Issue #178: a merge into a protected branch carries a machine-readable
// record of which review agents ran, so "reviewed and clean" and "never
// reviewed" no longer look the same in history.
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'

import {
  mergeMessage,
  parseReviewRecord,
  requireReviewRecord,
  type ReviewRecordGit,
} from './review-record.ts'

const RECORD = [
  'Merge feat/x: add widget',
  '',
  'Longer body explaining the change.',
  '',
  'Reviewed-by-agent: code-reviewer (ran, 3 findings, 3 fixed)',
  'Reviewed-by-agent: security-auditor (ran, 0 findings)',
  'Reviewed-by-agent: design-conformance-reviewer (skipped: no UI: paths in diff)',
  'Review-obligation: thin-rendering (addressed by code-reviewer)',
  'Visual-check: ran (390w webkit, 1280w chromium; states: loading, empty)',
].join('\n')

test('should parse every reviewer line, ran or skipped, from the final paragraph', () => {
  const record = parseReviewRecord(RECORD)
  assert.deepEqual(record.errors, [])
  assert.deepEqual(record.agents, [
    { agent: 'code-reviewer', status: 'ran', findings: 3, fixed: 3 },
    { agent: 'security-auditor', status: 'ran', findings: 0 },
    { agent: 'design-conformance-reviewer', status: 'skipped', reason: 'no UI: paths in diff' },
  ])
  assert.deepEqual(record.obligations, [{ id: 'thin-rendering', addressedBy: 'code-reviewer' }])
  assert.deepEqual(record.visualChecks, ['ran (390w webkit, 1280w chromium; states: loading, empty)'])
})

test('should report a missing record when no reviewer line is present', () => {
  const record = parseReviewRecord('Merge feat/x\n\nNo trailers here.')
  assert.equal(record.agents.length, 0)
  assert.match(record.errors.join('\n'), /no Reviewed-by-agent/)
})

test('should ignore reviewer lines outside the final paragraph', () => {
  const record = parseReviewRecord(
    'Merge\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\n\nTrailing prose paragraph.',
  )
  assert.equal(record.agents.length, 0)
})

const malformed: [string, string][] = [
  ['ran without a count', 'Reviewed-by-agent: code-reviewer (ran)'],
  ['skipped without a reason', 'Reviewed-by-agent: code-reviewer (skipped: )'],
  ['uppercase agent name', 'Reviewed-by-agent: Code-Reviewer (ran, 1 finding)'],
  ['obligation without an agent', 'Review-obligation: thin-rendering (addressed)'],
  ['visual check with neither form', 'Visual-check: yes'],
]
for (const [name, line] of malformed) {
  test(`should reject a malformed record line: ${name}`, () => {
    const record = parseReviewRecord(`Merge\n\nReviewed-by-agent: test-engineer (ran, 0 findings)\n${line}`)
    assert.ok(record.errors.some((error) => error.includes(line.trim())), record.errors.join('\n'))
  })
}

test('should reject the same agent listed twice', () => {
  const record = parseReviewRecord(
    'Merge\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nReviewed-by-agent: code-reviewer (skipped: dup)',
  )
  assert.match(record.errors.join('\n'), /code-reviewer.*more than once/)
})

test('should join repeated -m values as paragraphs, like git', () => {
  assert.equal(mergeMessage(['merge', '--no-ff', 'b', '-m', 'Subject', '-m', 'Body'], '/'), 'Subject\n\nBody')
  assert.equal(mergeMessage(['merge', 'b', '--message=Subject'], '/'), 'Subject')
})

test('should read the message out of a quoted heredoc substitution', () => {
  const word = "$(cat <<'EOF'\nMerge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nEOF\n)"
  assert.equal(
    mergeMessage(['merge', '--no-ff', 'b', '-m', word], '/'),
    'Merge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)',
  )
})

test('should read the message from -F relative to the merge directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'review-record-'))
  writeFileSync(join(dir, 'msg.txt'), 'Merge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\n')
  assert.match(mergeMessage(['merge', 'b', '-F', 'msg.txt'], dir) ?? '', /Reviewed-by-agent/)
})

// --- the gate -------------------------------------------------------------

function fakeGit(overrides: Partial<ReviewRecordGit> = {}): ReviewRecordGit {
  return {
    currentBranch: () => 'main',
    mergeFiles: () => ['src/app.kt'],
    wouldFastForward: () => false,
    prFiles: () => ['src/app.kt'],
    prBase: () => 'main',
    ...overrides,
  }
}

const VALID = '"Merge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)"'
const action = (command: string) => ({ kind: 'command', command }) as never

async function judge(command: string, git = fakeGit(), extra: { enforceForPaths?: RegExp } = {}) {
  const rule = requireReviewRecord({ record: { enforceForPaths: /^src\//, ...extra } }, { git })
  return rule(action(command))
}

test('should deny a no-ff merge into main that carries no review record', async () => {
  const result = await judge('git merge --no-ff b -m "Merge b"')
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /Reviewed-by-agent: <agent> \(ran, <N> findings\)/)
})

test('should pass a no-ff merge into main whose message carries a valid record', async () => {
  assert.equal((await judge(`git merge --no-ff b -m ${VALID}`)).kind, 'pass')
})

test('should deny a merge whose record has a malformed line, naming it', async () => {
  const result = await judge('git merge --no-ff b -m "Merge b\n\nReviewed-by-agent: code-reviewer (ran)"')
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /code-reviewer \(ran\)/)
})

test('should pass a merge into a branch that is not protected', async () => {
  const result = await judge('git merge --no-ff b -m "Merge b"', fakeGit({ currentBranch: () => 'feature' }))
  assert.equal(result.kind, 'pass')
})

test('should pass a merge that touches no enforced path', async () => {
  const result = await judge('git merge --no-ff b -m "Merge b"', fakeGit({ mergeFiles: () => ['README.md'] }))
  assert.equal(result.kind, 'pass')
})

test('should enforce when the merged files cannot be listed (fail safe)', async () => {
  const git = fakeGit({
    mergeFiles: () => {
      throw new Error('no git')
    },
  })
  assert.equal((await judge('git merge --no-ff b -m "Merge b"', git)).kind, 'violation')
})

test('should deny a merge that would fast-forward, since no commit would hold the record', async () => {
  const result = await judge(`git merge b -m ${VALID}`, fakeGit({ wouldFastForward: () => true }))
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /--no-ff/)
})

test('should deny --ff-only into a protected branch', async () => {
  const result = await judge('git merge --ff-only b')
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /--no-ff/)
})

test('should find the merge after a cd and through git -C', async () => {
  const seen: string[] = []
  const git = fakeGit({
    currentBranch: (dir) => {
      seen.push(dir)
      return 'main'
    },
  })
  await judge('cd /repo && git merge --no-ff b -m "Merge b"', git)
  await judge('git -C /other merge --no-ff b -m "Merge b"', git)
  assert.deepEqual(seen, ['/repo', '/other'])
})

const notGated: [string, string][] = [
  ['not a merge', 'git commit -m x'],
  ['merge-base plumbing', 'git merge-base HEAD main'],
  ['abort', 'git merge --abort'],
  ['continue', 'git merge --continue'],
  ['words as data', 'echo "then git merge b into main"'],
  ['squash (left to the CI checker)', 'git merge --squash b'],
]
for (const [name, command] of notGated) {
  test(`should not gate: ${name}`, async () => {
    assert.equal((await judge(command)).kind, 'pass')
  })
}

test('should gate gh pr merge into main on its --body text', async () => {
  assert.equal((await judge('gh pr merge 12 --merge --body "Merge"')).kind, 'violation')
  assert.equal((await judge(`gh pr merge 12 --squash --body ${VALID}`)).kind, 'pass')
})

test('should pass gh pr merge into a branch that is not protected', async () => {
  const result = await judge('gh pr merge 12 --merge', fakeGit({ prBase: () => 'release' }))
  assert.equal(result.kind, 'pass')
})

test('should honour configured protected branches', async () => {
  const rule = requireReviewRecord(
    { record: { protectedBranches: ['trunk'] } },
    { git: fakeGit({ currentBranch: () => 'main' }) },
  )
  assert.equal((await rule(action('git merge --no-ff b -m "Merge b"'))).kind, 'pass')
})

// --- found in review before handoff ------------------------------------------

test('should deny a record cut off by a later Co-Authored-By paragraph, naming the fix', async () => {
  const msg = '"Merge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\n\nCo-Authored-By: X <x@example.com>"'
  const result = await judge(`git merge --no-ff b -m ${msg}`)
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /Co-Authored-By/)
})

test('should pass a record that shares its final paragraph with Co-Authored-By', async () => {
  const msg = '"Merge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nCo-Authored-By: X <x@example.com>"'
  assert.equal((await judge(`git merge --no-ff b -m ${msg}`)).kind, 'pass')
})

// git merge has no stdin form: `-F -` fails with "could not read file '-'".
test('should deny git merge -F - and say git cannot read it', async () => {
  const command = "git merge --no-ff b -F - <<'EOF'\nMerge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nEOF"
  const result = await judge(command)
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /cannot read -F -/)
})

test('should accept a plugin-prefixed agent name and record it by its bare persona name', () => {
  const record = parseReviewRecord(
    'Merge\n\nReviewed-by-agent: agent-skills:code-reviewer (ran, 0 findings)\nReview-obligation: thin-rendering (addressed by agent-skills:code-reviewer)',
  )
  assert.deepEqual(record.errors, [])
  assert.deepEqual(record.agents, [{ agent: 'code-reviewer', status: 'ran', findings: 0 }])
  assert.deepEqual(record.obligations, [{ id: 'thin-rendering', addressedBy: 'code-reviewer' }])
})

test('should treat a prefixed and a bare name for the same persona as a duplicate', () => {
  const record = parseReviewRecord(
    'Merge\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nReviewed-by-agent: agent-skills:code-reviewer (ran, 1 finding)',
  )
  assert.match(record.errors.join('\n'), /code-reviewer.*more than once/)
})

test('should report only the malformed line, not also a missing record', () => {
  const record = parseReviewRecord('Merge\n\nReviewed-by-agent: code-reviewer (ran)')
  assert.equal(record.errors.length, 1, record.errors.join('\n'))
  assert.match(record.errors[0]!, /malformed reviewer line/)
})

test('should read a gh --body-file - body from a heredoc on stdin', async () => {
  const command = "gh pr merge 3 --merge --body-file - <<'EOF'\nMerge\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nEOF"
  assert.equal((await judge(command)).kind, 'pass')
})

test('should enforce when the current branch cannot be read (fail safe)', async () => {
  const git = fakeGit({
    currentBranch: () => {
      throw new Error('no git')
    },
  })
  assert.equal((await judge('git merge --no-ff b -m "Merge b"', git)).kind, 'violation')
})

test('should drive the real git adapter: branch, merge files, fast-forward', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdirSync } = await import('node:fs')
  const { defaultReviewRecordGit: real } = await import('./review-record.ts')
  const dir = mkdtempSync(join(tmpdir(), 'review-record-git-'))
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' })
  git('init', '-q', '-b', 'main')
  git('config', 'user.email', 't@example.com')
  git('config', 'user.name', 't')
  writeFileSync(join(dir, 'README.md'), 'x\n')
  git('add', '.')
  git('commit', '-q', '-m', 'init')
  git('switch', '-q', '-c', 'b')
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'src/a.kt'), 'x\n')
  git('add', '.')
  git('commit', '-q', '-m', 'work')
  git('switch', '-q', 'main')

  assert.equal(real.currentBranch(dir), 'main')
  assert.deepEqual(real.mergeFiles(dir, ['b']), ['src/a.kt'])
  assert.equal(real.wouldFastForward(dir, ['b']), true)
  git('config', 'merge.ff', 'false')
  assert.equal(real.wouldFastForward(dir, ['b']), false)
})

// --- #181: the record must cover the agents the router selects ----------------

test('should deny a merge whose record omits an agent the router selected', async () => {
  const rule = requireReviewRecord(
    { record: { requireRoutedAgents: true } },
    {
      git: fakeGit(),
      routeMerge: () => ({ agents: [{ agent: 'agent-skills:security-auditor', why: ['auth/crypto in diff'] }] }),
    },
  )
  const result = await rule(action(`git merge --no-ff b -m ${VALID}`))
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /security-auditor.*auth\/crypto in diff/)
})

test('should pass when every routed agent is listed, ran or skipped, prefixed or bare', async () => {
  const rule = requireReviewRecord(
    { record: { requireRoutedAgents: true } },
    {
      git: fakeGit(),
      routeMerge: () => ({
        agents: [
          { agent: 'agent-skills:security-auditor', why: ['x'] },
          { agent: 'code-reviewer', why: ['y'] },
        ],
      }),
    },
  )
  const msg = '"Merge b\n\nReviewed-by-agent: code-reviewer (ran, 0 findings)\nReviewed-by-agent: security-auditor (skipped: only renames)"'
  assert.equal((await rule(action(`git merge --no-ff b -m ${msg}`))).kind, 'pass')
})

test('should deny (fail safe) when the merge cannot be routed', async () => {
  const rule = requireReviewRecord(
    { record: { requireRoutedAgents: true } },
    {
      git: fakeGit(),
      routeMerge: () => {
        throw new Error('bad ref')
      },
    },
  )
  const result = await rule(action(`git merge --no-ff b -m ${VALID}`))
  assert.equal(result.kind, 'violation')
  assert.match(result.reason ?? '', /could not route/)
})

test('should not route at all unless requireRoutedAgents is on', async () => {
  let called = false
  const rule = requireReviewRecord({ record: {} }, {
    git: fakeGit(),
    routeMerge: () => {
      called = true
      return { agents: [] }
    },
  })
  await rule(action(`git merge --no-ff b -m ${VALID}`))
  assert.equal(called, false)
})
