/**
 * Contingency-fired production adapter (Q2/Q11): the `@modelcontextprotocol/sdk`
 * client over stdio to the persistent gateway, sending FULL JSON tool arguments
 * (objects native - the one-shot positional `key=value` path could not carry
 * `additional_fields`). Unit-tested against an INJECTED `McpToolClient` factory
 * stub - NO live call, NO gateway spawn. cloudId is discovered+cached; the
 * issuetype id is translated to `issueTypeName`; the gate fires before any
 * client call.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  buildEnv,
  createDockerMcpAdapter,
  ISSUE_TYPE_ID_TO_NAME,
  type McpToolClient,
  SITE_URL,
  stdioServerParameters,
} from '../src/adapter-docker-mcp.js'
import { buildCreatePayload } from '../src/payloads.js'
import { type IssueCreatePayload, RegistrationGateError } from '../src/types.js'

const KASEYA_ID = 'ce9c498d-4b25-4dd1-855b-deccb810936c'

interface ToolCall {
  name: string
  args: Record<string, unknown>
}

/** A recording `McpToolClient` factory stub returning canned per-tool JSON; no network. */
function makeClientStub(
  opts: { siteId?: string; includeKaseya?: boolean; responses?: Record<string, string> } = {},
): {
  factory: () => McpToolClient
  calls: ToolCall[]
  factoryCount: () => number
  isClosed: () => boolean
} {
  const siteId = opts.siteId ?? KASEYA_ID
  const includeKaseya = opts.includeKaseya ?? true
  const responses = opts.responses ?? {}
  const calls: ToolCall[] = []
  let factoryCalls = 0
  let closed = false
  const client: McpToolClient = {
    async callTool(name, args) {
      calls.push({ name, args })
      // Per-tool override lets a test model a non-JSON (text/empty) success body.
      if (name in responses) return responses[name] as string
      if (name === 'getAccessibleAtlassianResources') {
        return JSON.stringify([
          { id: 'other-id', url: 'https://other.example.com' },
          ...(includeKaseya ? [{ id: siteId, url: SITE_URL }] : []),
        ])
      }
      if (name === 'createJiraIssue') return JSON.stringify({ key: 'KONE-4242' })
      if (name === 'editJiraIssue') return JSON.stringify({ key: 'KONE-1' })
      if (name === 'searchJiraIssuesUsingJql')
        return JSON.stringify({ issues: [{ key: 'KONE-7' }] })
      if (name === 'addCommentToJiraIssue') return JSON.stringify({ id: 'comment-1' })
      return '{}'
    },
    async close() {
      closed = true
    },
  }
  const factory = (): McpToolClient => {
    factoryCalls += 1
    return client
  }
  return { factory, calls, factoryCount: () => factoryCalls, isClosed: () => closed }
}

const validCreate = buildCreatePayload({
  projectKey: 'KONE',
  issuetypeId: '7',
  title: 'A Story',
  stableId: 'demo-story',
  parentKey: 'KONE-1000',
})

function argsOf(calls: readonly ToolCall[], name: string): Record<string, unknown> {
  const c = calls.find((x) => x.name === name)
  assert.ok(c !== undefined, `expected a ${name} call`)
  return c.args
}

test('createIssue sends additional_fields as a NATIVE OBJECT (not a string) with labels/customfield/parent', async () => {
  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  assert.equal(await adapter.createIssue(validCreate), 'KONE-4242')

  const args = argsOf(calls, 'createJiraIssue')
  const af = args.additional_fields
  assert.equal(typeof af, 'object')
  assert.ok(af !== null && !Array.isArray(af))
  const obj = af as Record<string, unknown>
  assert.deepEqual(obj.labels, ['mcp-test'])
  assert.deepEqual(obj.customfield_14522, { id: '12817' })
  assert.deepEqual(obj.parent, { key: 'KONE-1000' })
})

test('createIssue maps issuetype id -> issueTypeName and sends string top-level args', async () => {
  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  await adapter.createIssue(validCreate)
  const args = argsOf(calls, 'createJiraIssue')
  assert.equal(args.issueTypeName, 'Story') // id '7' -> 'Story'
  assert.equal(args.projectKey, 'KONE')
  assert.equal(args.summary, '[TEST] [demo-story] A Story')
  assert.equal(args.cloudId, KASEYA_ID)
  assert.equal('issueTypeId' in args, false)
})

test('issueTypeName mapping covers Epic (id 11) and Story (id 7)', async () => {
  assert.equal(ISSUE_TYPE_ID_TO_NAME['11'], 'Epic')
  assert.equal(ISSUE_TYPE_ID_TO_NAME['7'], 'Story')

  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  await adapter.createIssue(
    buildCreatePayload({ projectKey: 'KONE', issuetypeId: '11', title: 'E', stableId: 'epic-x' }),
  )
  assert.equal(argsOf(calls, 'createJiraIssue').issueTypeName, 'Epic')
})

test('cloudId is discovered ONCE (lazy) + cached, and passed on EVERY tool call', async () => {
  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  await adapter.createIssue(validCreate)
  await adapter.search('project = KONE')

  const discovery = calls.filter((c) => c.name === 'getAccessibleAtlassianResources')
  assert.equal(discovery.length, 1)
  for (const c of calls) {
    if (c.name === 'getAccessibleAtlassianResources') continue
    assert.equal(c.args.cloudId, KASEYA_ID, `tool ${c.name} must carry cloudId`)
  }
})

test('site selection is discovered (not hardcoded): a different discovered id is used verbatim', async () => {
  const custom = '11111111-2222-3333-4444-555555555555'
  const { factory, calls } = makeClientStub({ siteId: custom })
  const adapter = createDockerMcpAdapter(factory)
  await adapter.search('project = KONE')
  assert.equal(argsOf(calls, 'searchJiraIssuesUsingJql').cloudId, custom)
})

test('missing kaseya site rejects with a clear error naming the site (never guesses)', async () => {
  const { factory } = makeClientStub({ includeKaseya: false })
  const adapter = createDockerMcpAdapter(factory)
  await assert.rejects(
    adapter.search('project = KONE'),
    (err: unknown) => err instanceof Error && err.message.includes(SITE_URL),
  )
})

test('search sends { cloudId, jql } and parses issue keys', async () => {
  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  const keys = await adapter.search('project = KONE AND labels = "mcp-test"')
  assert.deepEqual(keys, ['KONE-7'])
  assert.equal(
    argsOf(calls, 'searchJiraIssuesUsingJql').jql,
    'project = KONE AND labels = "mcp-test"',
  )
})

test('updateIssue sends issueIdOrKey + a fields object and NEVER status/assignee/sprint', async () => {
  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  await adapter.updateIssue('KONE-7', {
    fields: { summary: '[TEST] [demo-story] A Story', labels: ['mcp-test'] },
  })
  const args = argsOf(calls, 'editJiraIssue')
  assert.equal(args.issueIdOrKey, 'KONE-7')
  assert.equal(args.cloudId, KASEYA_ID)
  // editJiraIssue's required arg is `fields` (an object), NOT `additional_fields`.
  assert.equal('additional_fields' in args, false)
  assert.equal(typeof args.fields, 'object')
  const fields = args.fields as Record<string, unknown>
  assert.equal(fields.summary, '[TEST] [demo-story] A Story')
  assert.deepEqual(fields.labels, ['mcp-test'])
  for (const forbidden of ['status', 'assignee', 'sprint']) {
    assert.equal(forbidden in args, false)
    assert.equal(forbidden in fields, false)
  }
})

test('addRemoteLink writes a comment carrying the permalink, with cloudId + issueIdOrKey', async () => {
  const { factory, calls } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  // The return is the raw opaque body (this mutating call's result is not consumed).
  const ref = await adapter.addRemoteLink('KONE-7', 'https://github.com/acme/widgets/blob/abc/x.md')
  assert.ok(ref.length > 0)
  const args = argsOf(calls, 'addCommentToJiraIssue')
  assert.equal(args.issueIdOrKey, 'KONE-7')
  assert.equal(args.cloudId, KASEYA_ID)
  // Required arg key is `commentBody` (coordinator schema probe), not `body`.
  assert.equal('body' in args, false)
  assert.ok(String(args.commentBody).includes('github.com/acme/widgets/blob/abc/x.md'))
})

test('the client is created LAZILY (factory not called until the first tool call)', async () => {
  const { factory, factoryCount } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  assert.equal(factoryCount(), 0, 'no client until first use')
  await adapter.search('project = KONE')
  assert.equal(factoryCount(), 1)
})

test('dispose() closes the underlying client (caller-owned lifecycle)', async () => {
  const stub = makeClientStub()
  const adapter = createDockerMcpAdapter(stub.factory)
  await adapter.search('project = KONE')
  assert.equal(stub.isClosed(), false)
  await adapter.dispose()
  assert.equal(stub.isClosed(), true)
})

function gatePayload(o: { projectKey?: string; labels?: readonly string[] }): IssueCreatePayload {
  return {
    fields: {
      project: { key: o.projectKey ?? 'KONE' },
      issuetype: { id: '7' },
      summary: '[TEST] [demo] T',
      labels: o.labels ?? ['mcp-test'],
      customfield_14522: { id: '12817' },
    },
  }
}

test('the gate fires before any client call: a non-KONE createIssue rejects, zero calls, no client', async () => {
  const { factory, calls, factoryCount } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  await assert.rejects(
    adapter.createIssue(gatePayload({ projectKey: 'EVIL' })),
    (err: unknown) => err instanceof RegistrationGateError && err.violation === 'project-key',
  )
  assert.equal(calls.length, 0)
  assert.equal(factoryCount(), 0, 'the client is never even created for a gate-rejected call')
})

test('the adapter parses the tool text body as JSON (structured content path)', async () => {
  const { factory } = makeClientStub()
  const adapter = createDockerMcpAdapter(factory)
  // createIssue only returns a key if the JSON body parsed and had `.key`.
  assert.equal(await adapter.createIssue(validCreate), 'KONE-4242')
})

test('updateIssue succeeds when editJiraIssue returns a NON-JSON text success body', async () => {
  const { factory } = makeClientStub({ responses: { editJiraIssue: 'Issue KONE-7 updated.' } })
  const adapter = createDockerMcpAdapter(factory)
  await adapter.updateIssue('KONE-7', {
    fields: { summary: '[TEST] [demo-story] A Story', labels: ['mcp-test'] },
  })
  // No throw = success; the text body is tolerated (result not consumed).
})

test('addRemoteLink succeeds on a NON-JSON text body and returns it as the opaque ref', async () => {
  const { factory } = makeClientStub({ responses: { addCommentToJiraIssue: 'comment added' } })
  const adapter = createDockerMcpAdapter(factory)
  const ref = await adapter.addRemoteLink('KONE-7', 'https://github.com/acme/widgets/blob/abc/x.md')
  assert.equal(ref, 'comment added')
})

test('createIssue still DEMANDS JSON (a text createJiraIssue body rejects)', async () => {
  const { factory } = makeClientStub({ responses: { createJiraIssue: 'created ok (text)' } })
  const adapter = createDockerMcpAdapter(factory)
  await assert.rejects(
    adapter.createIssue(validCreate),
    (err: unknown) => err instanceof Error && /non-JSON/.test(err.message),
  )
})

test('search still DEMANDS JSON (a text search body rejects)', async () => {
  const { factory } = makeClientStub({
    responses: { searchJiraIssuesUsingJql: 'no results (text)' },
  })
  const adapter = createDockerMcpAdapter(factory)
  await assert.rejects(
    adapter.search('project = KONE'),
    (err: unknown) => err instanceof Error && /non-JSON/.test(err.message),
  )
})

test('cloudId discovery still DEMANDS JSON (a text resources body rejects)', async () => {
  const { factory } = makeClientStub({
    responses: { getAccessibleAtlassianResources: 'not json' },
  })
  const adapter = createDockerMcpAdapter(factory)
  await assert.rejects(
    adapter.search('project = KONE'),
    (err: unknown) => err instanceof Error && /non-JSON/.test(err.message),
  )
})

test('buildEnv copies the environment and drops undefined values (Record<string,string>)', () => {
  const env = buildEnv({ KEEP: 'yes', DROP: undefined, ALSO: 'x' })
  assert.deepEqual(env, { KEEP: 'yes', ALSO: 'x' })
  for (const v of Object.values(env)) assert.equal(typeof v, 'string')
})

test('stdioServerParameters passes the FULL parent env (fixes the docker ProgramData panic)', () => {
  // A parent variable the SDK default-minimal env would strip must survive.
  const marker = 'FOREMAN_W1P4_ENV_MARKER'
  process.env[marker] = 'present'
  try {
    const params = stdioServerParameters()
    assert.deepEqual(params.command, 'docker')
    assert.deepEqual(params.args, ['mcp', 'gateway', 'run', '--servers', 'atlassian-remote'])
    assert.equal(params.env[marker], 'present', 'the full parent environment must be forwarded')
    // No undefined leaks into the Record<string,string>.
    for (const v of Object.values(params.env)) assert.equal(typeof v, 'string')
  } finally {
    delete process.env[marker]
  }
})
