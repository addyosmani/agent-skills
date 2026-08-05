/**
 * Rework item 1 (BLOCKER, R1+R2+R5): the reordered write-back makes a Jira
 * link-write failure RECOVERABLE. The Stage-B receipt + sidecar are minted,
 * written, and committed (commit 2) BEFORE the link write, so a first run that
 * fails at the link write leaves a durable receipt; a re-run then enters
 * reconcile and writes the link idempotently with ZERO duplicate creates.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { detectRegistrationMode, stageBReceiptLocator } from '../src/prior-registration.js'
import { register } from '../src/register.js'
import { RegistrationError } from '../src/types.js'
import { FakeAdapter, singleStoryFixture } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'

test('item1: a link-write failure occurs AFTER the receipt is committed, and the re-run recovers via reconcile', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter({ failOnLink: true })

  // First run: creates + back-fill + commit1 + receipt/sidecar commit2 all
  // succeed; the Jira link write then fails.
  let landed: readonly string[] = []
  await assert.rejects(
    register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS }),
    (err: unknown) => {
      assert.ok(err instanceof RegistrationError)
      landed = err.landed
      return true
    },
  )

  // The receipt IS durable (written + committed before the link write)...
  const stageBAbs = join(
    fx.repoRoot,
    ...stageBReceiptLocator(fx.record.correlation.workflowId).split('/'),
  )
  assert.ok(existsSync(stageBAbs), 'Stage-B receipt must be written before the link write')
  assert.ok(landed.includes('committed stage-B receipt + sidecar'))
  // ...tickets were created, and NO link landed.
  assert.equal(adapter.createCalls.length, 2)
  assert.equal(adapter.linkCalls.length, 0)

  // The receipt exists => detection is now reconcile.
  assert.equal(detectRegistrationMode(fx.record, fx.repoRoot), 'reconcile')

  // Re-run (same adapter, link write now allowed): reconcile writes the link
  // idempotently and creates NOTHING new.
  adapter.failOnLink = false
  const outcome = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })
  assert.equal(outcome.mode, 'reconcile')
  assert.equal(adapter.createCalls.length, 2, 're-run must create no duplicates')
  assert.equal(adapter.linkCalls.length, 1, 're-run writes the previously-failed link')
})
