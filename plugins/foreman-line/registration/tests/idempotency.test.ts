/**
 * AC12: jira-integration discipline (F2). Idempotent re-run (second run
 * creates nothing) and update-never-clobber (an update path can never mutate
 * status/assignee/sprint - they are structurally absent from the update
 * payload).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildCreatePayload, buildUpdatePayload } from '../src/payloads.js'
import { register } from '../src/register.js'
import { blockCommits, FakeAdapter, singleStoryFixture, unblockCommits } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

test('AC12: a second run after a complete first registration creates nothing (reconcile)', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  const createsAfterFirst = adapter.createCalls.length

  const outcome = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  assert.equal(outcome.mode, 'reconcile')
  assert.equal(adapter.createCalls.length, createsAfterFirst)
})

test('AC12: the update payload structurally omits status/assignee/sprint', () => {
  const create = buildCreatePayload({
    projectKey: 'KONE',
    issuetypeId: '7',
    title: 'Story',
    stableId: 'demo-story',
    parentKey: 'KONE-1',
  })
  const update = buildUpdatePayload(create)
  const keys = Object.keys(update.fields).sort()
  assert.deepEqual(keys, ['customfield_14522', 'labels', 'summary'])
  assert.equal('status' in update.fields, false)
  assert.equal('assignee' in update.fields, false)
  assert.equal('sprint' in update.fields, false)
})

test('AC12: the search-first UPDATE path never carries status/assignee/sprint', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()

  // First run fails at the back-fill commit (no identity) but leaves the
  // created tickets; the re-run then takes the UPDATE branch of search-first.
  blockCommits(fx.repoRoot)
  await assert.rejects(register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS }))
  unblockCommits(fx.repoRoot)
  await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })

  assert.ok(adapter.updateCalls.length >= 1)
  for (const { payload } of adapter.updateCalls) {
    const keys = Object.keys(payload.fields)
    assert.ok(!keys.includes('status'))
    assert.ok(!keys.includes('assignee'))
    assert.ok(!keys.includes('sprint'))
  }
})
