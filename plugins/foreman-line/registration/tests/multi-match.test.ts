/**
 * Rework item 2 (R3): the fake adapter models JQL `~` loosely (bare-token
 * substring, multi-match capable). When a search returns more than one match,
 * the search-first upsert STOPS and reports - it never guesses which to update.
 * Exact `~` word-token semantics are verified at the live probe (L4).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildIdempotencyJql } from '../src/jql.js'
import { register } from '../src/register.js'
import { RegistrationError } from '../src/types.js'
import { FakeAdapter, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

test('item2: the loose fake search is multi-match capable (bare-token substring)', async () => {
  const adapter = new FakeAdapter()
  adapter.seed('[TEST] [epic-demo-idea] decoy one')
  adapter.seed('[TEST] [epic-demo-idea] decoy two')
  const matches = await adapter.search(buildIdempotencyJql('KONE', 'epic-demo-idea'))
  assert.equal(matches.length, 2)
})

test('item2: an ambiguous (multi-match) idempotency lookup stops and reports, creating nothing', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  // Two pre-existing issues both match the Epic's stable id.
  adapter.seed('[TEST] [epic-demo-idea] decoy one')
  adapter.seed('[TEST] [epic-demo-idea] decoy two')

  await assert.rejects(
    register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS }),
    (err: unknown) => err instanceof RegistrationError && /match/.test(err.message),
  )
  // Stop-and-report: no create was attempted past the ambiguous lookup.
  assert.equal(adapter.createCalls.length, 0)
})
