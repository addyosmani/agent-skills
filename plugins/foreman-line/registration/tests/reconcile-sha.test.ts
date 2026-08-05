/**
 * Rework item 4 (R6): reconcile reads the permalink + commitSha from the
 * Stage-B receipt subject (the receipted source of truth), NOT from `git log`.
 * A later commit touching the spec must NOT drift the reconciled link.
 */
import assert from 'node:assert/strict'
import { appendFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { register } from '../src/register.js'
import { FakeAdapter, git, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

test('item4: reconcile pins the receipted SHA even after a later commit touches the spec', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()

  const first = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  const receiptedSha = first.result.links[0]?.commitSha as string

  // Simulate drift: a later commit touches the spec, so `git log` would report
  // a NEWER SHA than the one the receipt recorded.
  const specRef = fx.specRefs[0] as string
  appendFileSync(join(fx.repoRoot, ...specRef.split('/')), '\n<!-- later edit -->\n', 'utf8')
  git(fx.repoRoot, ['add', specRef])
  git(fx.repoRoot, ['commit', '-m', 'later: unrelated edit touching the spec'])
  const newSha = git(fx.repoRoot, ['rev-parse', 'HEAD']).trim()
  assert.notEqual(receiptedSha, newSha)
  assert.equal(git(fx.repoRoot, ['log', '-1', '--format=%H', '--', specRef]).trim(), newSha)

  // Reconcile must use the RECEIPTED SHA, not the drifted git-log SHA.
  const linksBefore = adapter.linkCalls.length
  const outcome = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  assert.equal(outcome.mode, 'reconcile')
  for (const link of outcome.result.links) {
    assert.equal(link.commitSha, receiptedSha)
    assert.ok(link.permalink.includes(receiptedSha))
    assert.ok(!link.permalink.includes(newSha))
  }
  const lastLink = adapter.linkCalls.at(-1)
  assert.ok(lastLink !== undefined)
  assert.ok(lastLink.permalink.includes(receiptedSha))
  assert.ok(adapter.linkCalls.length > linksBefore, 'reconcile re-writes the link')
})
