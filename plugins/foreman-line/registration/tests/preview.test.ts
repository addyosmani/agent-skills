/**
 * Rework item 5 (R9): the first-class preview / dry-run path. Returns the
 * payloads that WOULD be created plus planned actions, making ZERO adapter
 * calls and performing NO git/fs writes - backing the jira-integration
 * preview-before-write discipline the spec claims.
 */
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { stageBReceiptLocator } from '../src/prior-registration.js'
import { preview } from '../src/register.js'
import { FakeAdapter, git, singleStoryFixture } from './helpers.js'

test('item5: preview returns the built payloads + planned actions and makes ZERO adapter calls / no writes', () => {
  const fx = singleStoryFixture()
  const adapter = new FakeAdapter()
  const headBefore = git(fx.repoRoot, ['rev-parse', 'HEAD']).trim()

  const result = preview({ slug: fx.slug, repoRoot: fx.repoRoot, adapter })

  // Mode + payload fidelity (reference shapes).
  assert.equal(result.mode, 'first')
  assert.deepEqual(result.epicPayload, {
    fields: {
      project: { key: 'KONE' },
      issuetype: { id: '11' },
      summary: '[TEST] [epic-demo-idea] Epic for demo-idea',
      labels: ['mcp-test'],
      customfield_14522: { id: '12817' },
    },
  })
  assert.equal(result.storyPayloads.length, 1)
  assert.equal(result.storyPayloads[0]?.fields.issuetype.id, '7')
  assert.deepEqual(result.storyPayloads[0]?.fields.parent, { key: 'epic-demo-idea' })
  assert.ok(result.plannedActions.length >= 3)

  // ZERO adapter calls (structural: preview never touches the adapter).
  assert.equal(adapter.createCalls.length, 0)
  assert.equal(adapter.updateCalls.length, 0)
  assert.equal(adapter.searchCalls.length, 0)
  assert.equal(adapter.linkCalls.length, 0)

  // No git commit, no receipt/sidecar written.
  assert.equal(git(fx.repoRoot, ['rev-parse', 'HEAD']).trim(), headBefore)
  assert.equal(
    existsSync(
      join(fx.repoRoot, ...stageBReceiptLocator(fx.record.correlation.workflowId).split('/')),
    ),
    false,
  )
  assert.equal(
    existsSync(
      join(
        fx.repoRoot,
        'plugins',
        'foreman-line',
        'docs',
        'specs',
        'active',
        `${fx.slug}.registration.json`,
      ),
    ),
    false,
  )
})
