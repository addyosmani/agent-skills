/**
 * AC8: the 12-step write-back, driven against a fake adapter + a temp git repo.
 * Asserts: the permalink binds the PUSHED post-key SHA (commit 1, not commit 2
 * or a pre-key SHA); the back-fill edits ONLY the `ticket:` line (no status
 * flip, no folder move, no body change); a simulated post-create failure stops,
 * reports what landed, and a re-run is idempotent (no duplicate creates); and
 * no destructive ticket-deletion path exists.
 */
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { stageBReceiptLocator } from '../src/prior-registration.js'
import { register } from '../src/register.js'
import { RegistrationError } from '../src/types.js'
import { blockCommits, FakeAdapter, git, singleStoryFixture, unblockCommits } from './helpers.js'

const TS = '2026-07-22T12:00:00Z'
const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(packageDir, 'src')

test('AC8: the permalink binds the pushed post-key SHA (commit 1), not HEAD (commit 2)', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  const outcome = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })

  const specRef = fx.specRefs[0] as string
  const backfillSha = git(fx.repoRoot, ['log', '-1', '--format=%H', '--', specRef]).trim()
  const head = git(fx.repoRoot, ['rev-parse', 'HEAD']).trim()

  assert.notEqual(backfillSha, head, 'commit 1 (back-fill) must differ from HEAD (commit 2)')
  for (const link of outcome.result.links) {
    assert.equal(link.commitSha, backfillSha)
    assert.ok(link.permalink.includes(backfillSha))
    assert.ok(link.permalink.startsWith('https://github.com/acme/widgets/blob/'))
  }
})

test('AC8: back-fill edits ONLY the ticket: line (no status flip, no body change)', async () => {
  const fx = singleStoryFixture()
  const specAbs = join(fx.repoRoot, ...(fx.specRefs[0] as string).split('/'))
  const before = readFileSync(specAbs, 'utf8')

  await register({
    slug: fx.slug,
    repoRoot: fx.repoRoot,
    adapter: new FakeAdapter(),
    timestamp: TS,
  })
  const after = readFileSync(specAbs, 'utf8')

  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  assert.equal(beforeLines.length, afterLines.length)
  const changed = afterLines.filter((line, i) => line !== beforeLines[i])
  assert.equal(changed.length, 1, 'exactly one line changed')
  assert.ok((changed[0] as string).startsWith('ticket:'))
  assert.ok(!(changed[0] as string).includes('KONE-TBD'))
  assert.ok(after.includes('status: draft'), 'status must not flip')
  assert.ok(after.includes('# Demo Story'), 'body heading unchanged')
})

test('AC8: a post-create commit failure stops, reports what landed, and rolls the back-fill back', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  const specAbs = join(fx.repoRoot, ...(fx.specRefs[0] as string).split('/'))

  blockCommits(fx.repoRoot) // make the back-fill commit fail deterministically

  let landed: readonly string[] = []
  await assert.rejects(
    register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS }),
    (err: unknown) => {
      assert.ok(err instanceof RegistrationError)
      landed = err.landed
      return true
    },
  )

  // Tickets were created and reported...
  assert.equal(adapter.createCalls.length, 2) // epic + story
  assert.ok(landed.some((l) => l.startsWith('created')))
  // ...the back-fill was rolled back (content restored to approved state)...
  assert.ok(readFileSync(specAbs, 'utf8').includes('ticket: KONE-TBD'))
  // ...and no Stage-B receipt was written (the genesis receipt still exists).
  const stageBAbs = join(
    fx.repoRoot,
    ...stageBReceiptLocator(fx.record.correlation.workflowId).split('/'),
  )
  assert.equal(existsSync(stageBAbs), false)
})

test('AC8: re-run after the failure is idempotent - search-first creates no duplicates', async () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()

  blockCommits(fx.repoRoot)
  await assert.rejects(register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS }))
  assert.equal(adapter.createCalls.length, 2)

  unblockCommits(fx.repoRoot) // let the re-run complete
  const outcome = await register({ slug: fx.slug, repoRoot: fx.repoRoot, adapter, timestamp: TS })

  assert.equal(outcome.mode, 'first')
  assert.equal(adapter.createCalls.length, 2, 're-run must create NO duplicates')
  assert.equal(adapter.updateCalls.length, 2, 're-run updates the existing Epic + Story')
})

test('AC8: no destructive ticket-deletion path exists anywhere in src', () => {
  const forbidden = /(deleteissue|deletejiraissue|removeissue|\.delete\s*\()/i
  for (const name of readdirSync(srcDir)) {
    if (!name.endsWith('.ts')) continue
    const text = readFileSync(join(srcDir, name), 'utf8')
    assert.equal(forbidden.test(text), false, `${name} appears to contain a ticket-deletion path`)
  }
})
