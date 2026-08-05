/**
 * Rework item 3 (R4): the exported production adapter embeds the gate. A DIRECT
 * integrator call with a gate-violating payload REJECTS with
 * `RegistrationGateError` BEFORE the MCP client is ever created (the default
 * SDK client factory is invoked lazily only on the first tool call, which the
 * gate rejection precedes) - proven by asserting the error is specifically a
 * `RegistrationGateError` (an SDK/gateway error would mean the gate did not fire
 * and would FAIL this test). No live call / gateway spawn is ever made.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDockerMcpAdapter } from '../src/adapter-docker-mcp.js'
import { MCP_TEST_LABEL, TEST_PREFIX } from '../src/gate.js'
import { type IssueCreatePayload, RegistrationGateError } from '../src/types.js'

function createPayload(o: {
  projectKey?: string
  labels?: readonly string[]
  summary?: string
}): IssueCreatePayload {
  return {
    fields: {
      project: { key: o.projectKey ?? 'KONE' },
      issuetype: { id: '7' },
      summary: o.summary ?? `${TEST_PREFIX}[demo] Title`,
      labels: o.labels ?? [MCP_TEST_LABEL],
      customfield_14522: { id: '12817' },
    },
  }
}

test('item3: adapter.createIssue rejects a non-KONE key with RegistrationGateError (no shell-out)', async () => {
  const adapter = createDockerMcpAdapter()
  await assert.rejects(
    adapter.createIssue(createPayload({ projectKey: 'EVIL' })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'project-key',
  )
})

test('item3: adapter.createIssue rejects a missing label / missing prefix with RegistrationGateError', async () => {
  const adapter = createDockerMcpAdapter()
  await assert.rejects(
    adapter.createIssue(createPayload({ labels: ['other'] })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'label',
  )
  await assert.rejects(
    adapter.createIssue(createPayload({ summary: 'no prefix' })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'prefix',
  )
})

test('item3: adapter.updateIssue rejects a gate-violating update payload (no shell-out)', async () => {
  const adapter = createDockerMcpAdapter()
  await assert.rejects(
    adapter.updateIssue('KONE-1', { fields: { labels: ['other'] } }),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'label',
  )
  await assert.rejects(
    adapter.updateIssue('KONE-1', { fields: { summary: 'no prefix' } }),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'prefix',
  )
})
