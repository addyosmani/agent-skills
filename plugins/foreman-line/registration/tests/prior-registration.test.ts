/**
 * AC7: prior-registration / reconcile ordering (Q5). Detection keys off the
 * Stage-B RECEIPT for the same workflowId (not off non-TBD ticket keys);
 * reconcile mode creates nothing and skips F7 against back-filled content; and
 * a hand-edited `ticket:` key on an unapproved spec (no Stage-B receipt for its
 * workflowId) does NOT enter reconcile mode - the abuse is closed.
 */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { detectRegistrationMode } from '../src/prior-registration.js'
import { register } from '../src/register.js'
import { HashMismatchError } from '../src/types.js'
import { FakeAdapter, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

test('AC7: order is first (no Stage-B receipt) -> then reconcile once the receipt exists', async () => {
  const fx = singleStoryFixture()
  assert.equal(detectRegistrationMode(fx.record, fx.repoRoot), 'first')

  const adapter = new FakeAdapter()
  await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })

  // The completed first registration minted the Stage-B receipt -> reconcile.
  assert.equal(detectRegistrationMode(fx.record, fx.repoRoot), 'reconcile')
})

test('AC7: reconcile creates nothing and skips F7 against (legitimately) back-filled content', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  const createsAfterFirst = adapter.createCalls.length

  // Content is now back-filled (ticket: != KONE-TBD); a naive F7 would refuse.
  // Reconcile mode must proceed without creating anything and without F7.
  const outcome = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  assert.equal(outcome.mode, 'reconcile')
  assert.equal(adapter.createCalls.length, createsAfterFirst, 'reconcile must create nothing')
})

test('AC7: abuse closed - hand-edited ticket keys on unapproved content do NOT enter reconcile', async () => {
  const fx = singleStoryFixture()
  const specAbs = join(fx.repoRoot, ...(fx.specRefs[0] as string).split('/'))

  // Forge a non-TBD ticket key by hand, WITHOUT any Stage-B receipt.
  const forged = readFileSync(specAbs, 'utf8').replace('ticket: KONE-TBD', 'ticket: KONE-9999')
  writeFileSync(specAbs, forged, 'utf8')

  // Detection still keys off the (absent) Stage-B receipt -> first, not reconcile.
  assert.equal(detectRegistrationMode(fx.record, fx.repoRoot), 'first')

  // And first-mode F7 refuses the tampered content: reconcile is unreachable.
  await assert.rejects(
    register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter: new FakeAdapter(), timestamp: TS }),
    HashMismatchError,
  )
})
