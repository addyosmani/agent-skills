/**
 * AC11: RegistrationResult conformance. The emitted result validates against
 * the frozen registrationResultSchema; `links` carries both a ticket->commit
 * and a commit->ticket entry per SPEC-CONVENTION §5, each with non-empty
 * ticketKey/commitSha/permalink. One link-pair per spec-bearing Story
 * (coordinator ruling C).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Ajv, type SchemaObject } from 'ajv'
import { registrationResultSchema } from '../../contracts/src/index.js'
import { register } from '../src/register.js'
import { buildApprovedFixture, FakeAdapter, makeGitRepo, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'
const ajv = new Ajv({ allErrors: true })
const validate = ajv.compile(registrationResultSchema as SchemaObject)

test('AC11: the emitted RegistrationResult validates against the frozen schema', async () => {
  const fx = singleStoryFixture()
  const outcome = await register({
    slug: fx.slug,
    repoRoot: fx.repoRoot,
    adapter: new FakeAdapter(),
    timestamp: TS,
  })
  assert.equal(validate(outcome.result), true, JSON.stringify(validate.errors))
})

test('AC11: links carry BOTH directions, each with non-empty fields', async () => {
  const fx = singleStoryFixture()
  const outcome = await register({
    slug: fx.slug,
    repoRoot: fx.repoRoot,
    adapter: new FakeAdapter(),
    timestamp: TS,
  })
  const directions = outcome.result.links.map((l) => l.direction)
  assert.ok(directions.includes('ticket->commit'))
  assert.ok(directions.includes('commit->ticket'))
  for (const link of outcome.result.links) {
    assert.ok(link.ticketKey.length > 0)
    assert.ok(link.commitSha.length > 0)
    assert.ok(link.permalink.length > 0)
  }
})

test('AC11: one link-pair per spec-bearing Story (2 stories => 4 links)', async () => {
  const repoRoot = makeGitRepo()
  const fx = buildApprovedFixture(repoRoot, 'two-story-idea', [
    { stem: 'story-alpha', title: 'Alpha' },
    { stem: 'story-beta', title: 'Beta' },
  ])
  const outcome = await register({
    slug: fx.slug,
    repoRoot,
    adapter: new FakeAdapter(),
    timestamp: TS,
  })

  assert.equal(outcome.result.links.length, 4)
  // Epic + 2 Stories = 3 ticket keys; the Epic carries no link-pair.
  assert.equal(outcome.result.ticketKeys.length, 3)
  const linkedKeys = new Set(outcome.result.links.map((l) => l.ticketKey))
  assert.equal(linkedKeys.size, 2)
})
