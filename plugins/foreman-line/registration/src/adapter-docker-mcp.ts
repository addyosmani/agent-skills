/**
 * Production `JiraTransport` (coordinator ruling Q2/Q11 - the recorded
 * contingency FIRED). The one-shot `docker mcp tools call` positional
 * `key=value` transport is string-only (docker mcp CLI v0.43.1:
 * `additional_fields=<json>` arrives as a string, `maxResults=1` fails
 * "expected number, received string"), and objects cannot be transported -
 * but `additional_fields` is unavoidable (required `customfield_14522` has no
 * default; `labels` is required by our own gate). So the adapter moves up the
 * ratified contingency ladder to the `@modelcontextprotocol/sdk` client
 * connected over stdio to the persistent single-server gateway
 * (`docker mcp gateway run --servers atlassian-remote`), sending full JSON tool
 * arguments (objects native). One runtime dependency is admitted -
 * `@modelcontextprotocol/sdk` - recorded as a deliberate, ratified deviation in
 * the README and asserted by the dependency-allowlist test as
 * `{ajv, @modelcontextprotocol/sdk}`.
 *
 * **cloudId discovery (discover, don't hardcode).** Every Jira tool requires a
 * `cloudId`. Resolved ONCE, lazily, on the first tool call, via the
 * argument-less `getAccessibleAtlassianResources` tool -> a JSON array of
 * accessible sites - selecting the entry whose `url` is
 * `https://kaseya.atlassian.net`, then cached and passed on every call. The id
 * is never hardcoded (only the site URL selection is pinned); a missing site
 * throws naming the site rather than guessing.
 *
 * **issue-type translation (adapter-only).** `createJiraIssue`'s live schema
 * takes `issueTypeName` (the NAME - "Epic"/"Story"), while our payloads/gate/
 * create-schema are id-based (`11`/`7`, Q3/D3). The adapter translates
 * `{'11':'Epic','7':'Story'}`; payloads and the gate are unchanged.
 *
 * Tool mapping (coordinator live tool list, 2026-07-22; VERIFIED-AT-PROBE):
 *   createIssue   -> createJiraIssue    (cloudId, projectKey, issueTypeName,
 *                                        summary; additional_fields object)
 *   updateIssue   -> editJiraIssue
 *   search        -> searchJiraIssuesUsingJql
 *   addRemoteLink -> addCommentToJiraIssue   (no create-remote-link tool
 *                    exists; the ticket->commit link is a comment carrying the
 *                    permalink).
 *
 * Deterministic tests inject an `McpToolClient` factory stub (arg-JSON fidelity
 * asserted with NO live call and NO gateway spawn); the real gateway/write path
 * is a live probe (coordinator/human action). Response shapes and exact per-
 * tool arg keys stay VERIFY-AT-PROBE. Credentials never appear - auth is
 * Clint's OAuth identity resolved by the gateway (F10); failures surface by
 * message only.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { assertRegistrationGate, MCP_TEST_LABEL, TEST_PREFIX } from './gate.js'
import {
  type IssueCreatePayload,
  type IssueUpdateFields,
  type IssueUpdatePayload,
  type JiraTransport,
  RegistrationGateError,
} from './types.js'

const SERVER = 'atlassian-remote'
/** Site selection is pinned to this URL; the cloudId behind it is discovered, never hardcoded. */
export const SITE_URL = 'https://kaseya.atlassian.net'

export const TOOL_CREATE = 'createJiraIssue'
export const TOOL_UPDATE = 'editJiraIssue'
export const TOOL_SEARCH = 'searchJiraIssuesUsingJql'
export const TOOL_COMMENT = 'addCommentToJiraIssue'
export const TOOL_RESOURCES = 'getAccessibleAtlassianResources'

/** Adapter-only translation: our issuetype ids -> the live `issueTypeName` (Clint's KONE schema). */
export const ISSUE_TYPE_ID_TO_NAME: Readonly<Record<string, string>> = {
  '11': 'Epic',
  '7': 'Story',
}

/**
 * Copy an environment map, dropping `undefined` values to satisfy the SDK's
 * `Record<string, string>` env type. Linear-time.
 */
export function buildEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * The `StdioClientTransport` server parameters. `env` MUST carry the FULL parent
 * environment: the SDK's default minimal env strips Windows variables (e.g.
 * `ProgramData`), which makes the docker CLI panic
 * `unable to get 'ProgramData'` and closes the connection (MCP error -32000).
 * Passing `{ ...process.env }` (undefined-filtered) fixes it.
 */
export function stdioServerParameters(): {
  command: string
  args: string[]
  env: Record<string, string>
} {
  return {
    command: 'docker',
    args: ['mcp', 'gateway', 'run', '--servers', SERVER],
    env: buildEnv(),
  }
}

/** The injected MCP client boundary; `callTool` resolves to the tool's raw text body. */
export interface McpToolClient {
  callTool(name: string, args: Record<string, unknown>): Promise<string>
  close(): Promise<void>
}

export type McpClientFactory = () => McpToolClient

/**
 * Default factory: the real `@modelcontextprotocol/sdk` stdio client against
 * the persistent gateway. Connects lazily on first call, reuses the connection,
 * and extracts the first text content block from each tool result. Never
 * instantiated by a deterministic test (tests inject a stub).
 */
function defaultClientFactory(): McpToolClient {
  let client: Client | undefined
  const ensure = async (): Promise<Client> => {
    if (client !== undefined) return client
    const transport = new StdioClientTransport(stdioServerParameters())
    const c = new Client({ name: 'foreman-line-registration', version: '0.0.0' })
    await c.connect(transport)
    client = c
    return c
  }
  return {
    async callTool(name, args) {
      const c = await ensure()
      const result = (await c.callTool({ name, arguments: args })) as {
        isError?: boolean
        content?: Array<{ type?: string; text?: string }>
      }
      const text = (result.content ?? []).find(
        (b) => b.type === 'text' && typeof b.text === 'string',
      )?.text
      // Keep failures loud: a tool-reported error still throws (a client-side
      // rejection propagates on its own).
      if (result.isError === true) {
        throw new Error(`dockerMcpAdapter: tool ${name} reported an error: ${text ?? '(no text)'}`)
      }
      return text ?? ''
    },
    async close() {
      if (client !== undefined) {
        await client.close()
        client = undefined
      }
    },
  }
}

/** Parse a tool-call text body defensively (JSON), naming the tool on failure. */
function parseToolJson<T>(tool: string, raw: string): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    throw new Error(`dockerMcpAdapter: tool ${tool} returned non-JSON content`)
  }
}

/**
 * Defense-in-depth gate on the update payload (rework item 3 / R4). An update
 * carries no `project.key`, so only the label + prefix conditions present in
 * the payload are assertable; the project-key condition is enforced at
 * create-time and by the in-package `GatedTransport`.
 */
function assertUpdateGate(fields: IssueUpdateFields): void {
  if (fields.labels !== undefined && !fields.labels.includes(MCP_TEST_LABEL)) {
    throw new RegistrationGateError(
      'label',
      `update labels must include ${JSON.stringify(MCP_TEST_LABEL)}`,
    )
  }
  if (fields.summary !== undefined && !fields.summary.startsWith(TEST_PREFIX)) {
    throw new RegistrationGateError(
      'prefix',
      `update summary must begin with ${JSON.stringify(TEST_PREFIX)}`,
    )
  }
}

/**
 * Build the production adapter. `clientFactory` is injectable (default: the
 * real SDK stdio client) so deterministic tests exercise tool-arg JSON fidelity
 * with a stub and never touch the network. The mutating methods embed the gate
 * as defense-in-depth (rework item 3 / R4): a DIRECT integrator call cannot
 * reach the client without the gate having passed first. The returned adapter
 * carries a caller-owned `dispose()` that closes the persistent gateway
 * connection (F2).
 */
export function createDockerMcpAdapter(
  clientFactory: McpClientFactory = defaultClientFactory,
): JiraTransport & { dispose(): Promise<void> } {
  let client: McpToolClient | undefined
  let cachedCloudId: string | undefined

  const getClient = (): McpToolClient => {
    if (client === undefined) client = clientFactory()
    return client
  }

  // Raw call: any non-error response (a client rejection / isError content is
  // surfaced by the client wrapper as a thrown error) - used by mutating tools
  // whose semantic result we do not consume (editJiraIssue / addCommentToJiraIssue
  // return text or empty success, not JSON).
  const callRaw = (tool: string, args: Record<string, unknown>): Promise<string> =>
    getClient().callTool(tool, args)

  // JSON call: for tools whose result we consume (cloudId discovery, search,
  // createIssue key extraction). Non-JSON here is a genuine failure.
  const call = async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
    return parseToolJson<T>(tool, await callRaw(tool, args))
  }

  const resolveCloudId = async (): Promise<string> => {
    if (cachedCloudId !== undefined) return cachedCloudId
    const resources = await call<Array<{ id?: string; url?: string }>>(TOOL_RESOURCES, {})
    const site = Array.isArray(resources) ? resources.find((r) => r.url === SITE_URL) : undefined
    if (site === undefined || typeof site.id !== 'string' || site.id.length === 0) {
      throw new Error(
        `dockerMcpAdapter: no accessible Atlassian site matching ${SITE_URL} in getAccessibleAtlassianResources response`,
      )
    }
    cachedCloudId = site.id
    return cachedCloudId
  }

  return {
    async createIssue(payload: IssueCreatePayload): Promise<string> {
      assertRegistrationGate(payload.fields) // all three conditions, before any client call
      const cloudId = await resolveCloudId()
      const f = payload.fields
      const additionalFields: Record<string, unknown> = {
        labels: f.labels,
        customfield_14522: f.customfield_14522,
      }
      if (f.parent !== undefined) additionalFields.parent = f.parent
      const res = await call<{ key?: string }>(TOOL_CREATE, {
        cloudId,
        projectKey: f.project.key,
        issueTypeName: ISSUE_TYPE_ID_TO_NAME[f.issuetype.id] ?? f.issuetype.id,
        summary: f.summary,
        additional_fields: additionalFields,
      })
      if (typeof res.key !== 'string' || res.key.length === 0) {
        throw new Error(`dockerMcpAdapter: could not read an issue key from tool response`)
      }
      return res.key
    },
    async updateIssue(key: string, payload: IssueUpdatePayload): Promise<void> {
      assertUpdateGate(payload.fields) // label + prefix (project-key absent from update)
      const cloudId = await resolveCloudId()
      const f = payload.fields
      // editJiraIssue's required args (coordinator schema probe): cloudId,
      // issueIdOrKey, fields (an OBJECT of the Jira fields to set).
      const fields: Record<string, unknown> = {}
      if (f.summary !== undefined) fields.summary = f.summary
      if (f.labels !== undefined) fields.labels = f.labels
      if (f.customfield_14522 !== undefined) fields.customfield_14522 = f.customfield_14522
      // editJiraIssue returns text/empty success (not JSON); any non-error
      // response is success - we consume no result.
      await callRaw(TOOL_UPDATE, { cloudId, issueIdOrKey: key, fields })
    },
    async search(jql: string): Promise<readonly string[]> {
      const cloudId = await resolveCloudId()
      const parsed = await call<{ issues?: Array<{ key?: string }> }>(TOOL_SEARCH, { cloudId, jql })
      return (parsed.issues ?? [])
        .map((i) => i.key)
        .filter((k): k is string => typeof k === 'string')
    },
    async addRemoteLink(issueKey: string, permalink: string): Promise<string> {
      const cloudId = await resolveCloudId()
      // addCommentToJiraIssue's required args (coordinator schema probe): cloudId,
      // issueIdOrKey, commentBody. It returns text/empty success (not necessarily
      // JSON); any non-error response is success. Return the raw body as the ref.
      return callRaw(TOOL_COMMENT, {
        cloudId,
        issueIdOrKey: issueKey,
        commentBody: `Spec permalink (SPEC-CONVENTION §5): ${permalink}`,
      })
    },
    async dispose(): Promise<void> {
      if (client !== undefined) {
        await client.close()
        client = undefined
      }
    },
  }
}
