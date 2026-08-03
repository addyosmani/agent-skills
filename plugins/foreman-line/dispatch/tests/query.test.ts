/**
 * AC11: unit tests for the query sub-module.
 *
 * All tests inject an McpToolClient stub — NO live gateway spawn, NO network.
 * Receipt resolution tests use a temp directory fixture cleaned up in finally.
 *
 * Coverage:
 *   - Successful search: one resolved + one unresolved candidate
 *   - Empty result
 *   - Search tool error propagates
 *   - CloudId discovery failure (kaseya site absent)
 *   - JQL safe-token enforcement: safe token passes, unsafe token throws
 *   - WorkflowId resolution: correct priorReceiptLocator from Stage-B receipt
 *   - WorkflowId resolution: highest-sequence file wins when 000002-C-* present
 *   - CloudId is passed to the search tool
 *   - Correct JQL is passed to the search tool
 *   - Client is closed after queryAndRankCandidates completes
 *   - Client is closed even when an error is thrown
 */
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import {
  buildCandidateJql,
  type McpToolClient,
  queryAndRankCandidates,
  SITE_URL,
} from '../src/index.js'

// ─── Constants ────────────────────────────────────────────────────────────────

const KASEYA_CLOUD_ID = 'ce9c498d-4b25-4dd1-855b-deccb810936c'

// ─── Stub helpers ─────────────────────────────────────────────────────────────

interface ToolCall {
  name: string
  args: Record<string, unknown>
}

interface IssueShape {
  key?: string
  fields?: {
    summary?: string
    priority?: { name?: string }
    status?: { name?: string }
  }
}

interface StubOptions {
  /** Cloud id returned for getAccessibleAtlassianResources. Default: KASEYA_CLOUD_ID */
  cloudId?: string
  /** Include the kaseya site in the resources response. Default: true */
  includeKaseya?: boolean
  /** Issues returned by searchJiraIssuesUsingJql. Default: [] */
  issues?: IssueShape[]
  /** If true, callTool throws for searchJiraIssuesUsingJql */
  searchError?: boolean
  /** If true, callTool throws for getAccessibleAtlassianResources */
  resourcesError?: boolean
}

/**
 * A recording McpToolClient stub with canned responses. No network; no gateway.
 */
function makeStub(opts: StubOptions = {}): {
  factory: () => McpToolClient
  calls: ToolCall[]
  isClosed: () => boolean
} {
  const cloudId = opts.cloudId ?? KASEYA_CLOUD_ID
  const includeKaseya = opts.includeKaseya ?? true
  const issues = opts.issues ?? []
  const calls: ToolCall[] = []
  let closed = false

  const client: McpToolClient = {
    async callTool(name, args) {
      calls.push({ name, args })
      if (name === 'getAccessibleAtlassianResources') {
        if (opts.resourcesError === true) throw new Error('resources gateway error')
        return JSON.stringify([
          { id: 'other-id', url: 'https://other.example.com' },
          ...(includeKaseya ? [{ id: cloudId, url: SITE_URL }] : []),
        ])
      }
      if (name === 'searchJiraIssuesUsingJql') {
        if (opts.searchError === true) throw new Error('search gateway error')
        return JSON.stringify({ issues })
      }
      return '{}'
    },
    async close() {
      closed = true
    },
  }

  return {
    factory: () => client,
    calls,
    isClosed: () => closed,
  }
}

/** Find the first call to a named tool (throws if absent). */
function callArgs(calls: ToolCall[], toolName: string): Record<string, unknown> {
  const found = calls.find((c) => c.name === toolName)
  assert.ok(found !== undefined, `expected a call to ${toolName}`)
  return found.args
}

// ─── Fixture helpers ──────────────────────────────────────────────────────────

/**
 * Create a temp repo root with a Stage-B receipt for the given workflowId and
 * ticketKeys. Extra files (e.g. '000002-C-dispatch-order.json') are also written
 * to the receipt directory as empty JSON objects. Returns the temp root path;
 * caller must rmSync it in a finally block.
 */
function makeTempReceiptDir(
  workflowId: string,
  ticketKeys: string[],
  extraFiles: string[] = [],
): string {
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p1-test-'))
  const receiptDir = join(tempRoot, 'docs', 'receipts', workflowId)
  mkdirSync(receiptDir, { recursive: true })
  writeFileSync(
    join(receiptDir, '000001-B-registration-result.json'),
    JSON.stringify({ subject: { ticketKeys } }),
  )
  for (const extra of extraFiles) {
    writeFileSync(join(receiptDir, extra), '{}')
  }
  return tempRoot
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('queryAndRankCandidates: resolved candidate comes first, unresolved after', async () => {
  const workflowId = '11111111-2222-3333-4444-555555555555'
  const tempRoot = makeTempReceiptDir(workflowId, ['KONE-100'])
  try {
    const stub = makeStub({
      issues: [
        {
          key: 'KONE-100',
          fields: {
            summary: 'Resolved issue',
            priority: { name: 'High' },
            status: { name: 'To Do' },
          },
        },
        {
          key: 'KONE-200',
          fields: {
            summary: 'Unresolved issue',
            priority: { name: 'Medium' },
            status: { name: 'In Progress' },
          },
        },
      ],
    })
    const result = await queryAndRankCandidates({
      clientFactory: stub.factory,
      repoRoot: tempRoot,
    })

    assert.equal(result.length, 2)

    // Resolved candidate: comes first
    assert.equal(result[0]?.ticketKey, 'KONE-100')
    assert.equal(result[0]?.workflowId, workflowId)
    assert.equal(
      result[0]?.priorReceiptLocator,
      `docs/receipts/${workflowId}/000001-B-registration-result.json`,
    )
    assert.equal(result[0]?.summary, 'Resolved issue')
    assert.equal(result[0]?.priority, 'High')
    assert.equal(result[0]?.status, 'To Do')

    // Unresolved candidate: comes second
    assert.equal(result[1]?.ticketKey, 'KONE-200')
    assert.equal(result[1]?.workflowId, null)
    assert.equal(result[1]?.priorReceiptLocator, null)
    assert.equal(result[1]?.summary, 'Unresolved issue')
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: empty issues array returns empty list', async () => {
  const stub = makeStub({ issues: [] })
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p1-empty-'))
  try {
    const result = await queryAndRankCandidates({ clientFactory: stub.factory, repoRoot: tempRoot })
    assert.equal(result.length, 0)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: search tool error propagates', async () => {
  const stub = makeStub({ searchError: true })
  await assert.rejects(
    queryAndRankCandidates({ clientFactory: stub.factory }),
    (err: unknown) => err instanceof Error && err.message.includes('search gateway error'),
  )
})

test('queryAndRankCandidates: cloudId discovery failure when kaseya site is absent', async () => {
  const stub = makeStub({ includeKaseya: false })
  await assert.rejects(
    queryAndRankCandidates({ clientFactory: stub.factory }),
    (err: unknown) => err instanceof Error && err.message.includes(SITE_URL),
  )
})

test('buildCandidateJql: safe project key produces correct JQL', () => {
  const jql = buildCandidateJql('KONE')
  assert.ok(jql.includes('project = KONE'), 'JQL must reference project key')
  assert.ok(
    jql.includes('"clinton.morgan@kaseya.com"'),
    'JQL must include assignee email as a quoted literal',
  )
  assert.ok(jql.includes('"To Do"'), 'JQL must include To Do status')
  assert.ok(jql.includes('"In Progress"'), 'JQL must include In Progress status')
  assert.ok(jql.includes('ORDER BY priority ASC'), 'JQL must order by priority')
})

test('buildCandidateJql: unsafe project key (contains @) throws assertJqlSafeToken error', () => {
  assert.throws(
    () => buildCandidateJql('BAD@KEY'),
    (err: unknown) => err instanceof Error && err.message.includes('assertJqlSafeToken'),
  )
})

test('buildCandidateJql: unsafe project key (contains space) throws assertJqlSafeToken error', () => {
  assert.throws(
    () => buildCandidateJql('BAD KEY'),
    (err: unknown) => err instanceof Error && err.message.includes('assertJqlSafeToken'),
  )
})

test('workflowId resolution: priorReceiptLocator is highest-sequence file when 000002-C-* present', async () => {
  const workflowId = '22222222-3333-4444-5555-666666666666'
  const tempRoot = makeTempReceiptDir(workflowId, ['KONE-100'], ['000002-C-dispatch-order.json'])
  try {
    const stub = makeStub({
      issues: [
        {
          key: 'KONE-100',
          fields: { summary: 'Test', priority: { name: 'High' }, status: { name: 'To Do' } },
        },
      ],
    })
    const result = await queryAndRankCandidates({
      clientFactory: stub.factory,
      repoRoot: tempRoot,
    })

    assert.equal(result.length, 1)
    assert.equal(result[0]?.workflowId, workflowId)
    // Must pick 000002-C-* (seq 2) over 000001-B-* (seq 1)
    assert.equal(
      result[0]?.priorReceiptLocator,
      `docs/receipts/${workflowId}/000002-C-dispatch-order.json`,
    )
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: candidate with no matching receipt has null workflowId + locator', async () => {
  const workflowId = '33333333-4444-5555-6666-777777777777'
  // Receipt exists for KONE-999, but the query returns KONE-888 (no matching receipt)
  const tempRoot = makeTempReceiptDir(workflowId, ['KONE-999'])
  try {
    const stub = makeStub({
      issues: [
        {
          key: 'KONE-888',
          fields: { summary: 'No receipt', priority: { name: 'Low' }, status: { name: 'To Do' } },
        },
      ],
    })
    const result = await queryAndRankCandidates({
      clientFactory: stub.factory,
      repoRoot: tempRoot,
    })

    assert.equal(result.length, 1)
    assert.equal(result[0]?.ticketKey, 'KONE-888')
    assert.equal(result[0]?.workflowId, null)
    assert.equal(result[0]?.priorReceiptLocator, null)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: cloudId is passed to the search tool', async () => {
  const customCloudId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  const stub = makeStub({ cloudId: customCloudId, issues: [] })
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p1-cloudid-'))
  try {
    await queryAndRankCandidates({ clientFactory: stub.factory, repoRoot: tempRoot })
    const args = callArgs(stub.calls, 'searchJiraIssuesUsingJql')
    assert.equal(args.cloudId, customCloudId)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: correct JQL is sent to the search tool', async () => {
  const stub = makeStub({ issues: [] })
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p1-jql-'))
  try {
    await queryAndRankCandidates({ clientFactory: stub.factory, repoRoot: tempRoot })
    const args = callArgs(stub.calls, 'searchJiraIssuesUsingJql')
    const jql = args.jql
    assert.equal(typeof jql, 'string')
    assert.ok(String(jql).includes('project = KONE'))
    assert.ok(String(jql).includes('"clinton.morgan@kaseya.com"'))
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: client is closed after successful query', async () => {
  const stub = makeStub({ issues: [] })
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p1-close-'))
  try {
    await queryAndRankCandidates({ clientFactory: stub.factory, repoRoot: tempRoot })
    assert.ok(stub.isClosed(), 'MCP client must be closed after queryAndRankCandidates')
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})

test('queryAndRankCandidates: client is closed even when search throws', async () => {
  const stub = makeStub({ searchError: true })
  await assert.rejects(queryAndRankCandidates({ clientFactory: stub.factory }))
  assert.ok(stub.isClosed(), 'MCP client must be closed even after a thrown error')
})

test('queryAndRankCandidates: receipts dir absent is handled gracefully (all null)', async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'w2p1-noreceipts-'))
  // No docs/receipts/ directory created
  try {
    const stub = makeStub({
      issues: [
        {
          key: 'KONE-300',
          fields: {
            summary: 'No receipts dir',
            priority: { name: 'Medium' },
            status: { name: 'To Do' },
          },
        },
      ],
    })
    const result = await queryAndRankCandidates({
      clientFactory: stub.factory,
      repoRoot: tempRoot,
    })
    assert.equal(result.length, 1)
    assert.equal(result[0]?.workflowId, null)
    assert.equal(result[0]?.priorReceiptLocator, null)
  } finally {
    rmSync(tempRoot, { recursive: true, force: true })
  }
})
