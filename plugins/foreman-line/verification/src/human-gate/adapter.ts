/**
 * Production HumanGateJiraTransport adapter (W3-P4). Reuses the W1-P4
 * *pattern and gateway*, not a method that does not exist on the frozen
 * W1-P4 transport (which has no transition method by design —
 * update-never-clobber): injectable McpClientFactory, stdio client against
 * the `atlassian-remote` gateway, lazy cloudId discovery via
 * `getAccessibleAtlassianResources` selecting SITE_URL.
 *
 * VERIFY-AT-PROBE (lessons #20/#21): the transition tool names
 * (`getTransitionsForJiraIssue` / `transitionJiraIssue`), their exact arg
 * keys, and their response shapes are the spec's named tools and have NOT
 * been live-probed by this parcel. The probe is a coordinator-owned action
 * against a throwaway [TEST] fixture ticket, gate-first, recorded before
 * this production path is trusted. `addCommentToJiraIssue` arg keys follow
 * the W1-P4 coordinator schema probe (cloudId, issueIdOrKey, commentBody).
 *
 * Deterministic tests NEVER instantiate the default client factory (no
 * gateway launch, no network); they inject a stub factory. The default
 * factory resolves the MCP SDK lazily and dynamically at first-call time —
 * the verification package deliberately carries no runtime dependency on it
 * (package.json is frozen), so a live run requires the SDK to be resolvable
 * (coordinator probe environment) or an injected factory.
 *
 * Default-deny (standing authorization 5, the R4 defense-in-depth pattern):
 * assertHumanGateJiraGate runs inside EVERY method before any client call —
 * a direct caller cannot reach the client with a non-KONE key.
 */

import type { McpClientFactory, McpToolClient } from '../../../registration/src/index.js'
import { SITE_URL } from '../../../registration/src/index.js'
import { assertHumanGateJiraGate, HumanGateError, type HumanGateJiraTransport } from './index.js'

/** VERIFY-AT-PROBE: spec-named gateway tools (coordinator probe pending). */
export const TOOL_GET_TRANSITIONS = 'getTransitionsForJiraIssue'
export const TOOL_TRANSITION = 'transitionJiraIssue'
export const TOOL_COMMENT = 'addCommentToJiraIssue'
export const TOOL_RESOURCES = 'getAccessibleAtlassianResources'

const GATEWAY_SERVER = 'atlassian-remote'

/**
 * Copy an environment map, dropping undefined values (the W1-P4 rule: the
 * SDK's minimal default env strips Windows variables and panics the docker
 * CLI, so the FULL parent environment is passed). Linear-time.
 */
function buildEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * Default factory: the real MCP SDK stdio client against the persistent
 * gateway, resolved DYNAMICALLY at first tool call (the SDK is not a
 * dependency of this frozen-scaffold package; deterministic tests never
 * reach this code — lesson #21).
 */
function defaultClientFactory(): McpToolClient {
  // biome-ignore lint/suspicious/noExplicitAny: dynamic SDK module, untyped by design (no compile-time dependency).
  let client: any
  const ensure = async (): Promise<unknown> => {
    if (client !== undefined) return client
    const clientSpecifier = '@modelcontextprotocol/sdk/client/index.js'
    const stdioSpecifier = '@modelcontextprotocol/sdk/client/stdio.js'
    let clientModule: { Client: new (info: Record<string, unknown>) => unknown }
    let stdioModule: { StdioClientTransport: new (params: Record<string, unknown>) => unknown }
    try {
      clientModule = (await import(clientSpecifier)) as typeof clientModule
      stdioModule = (await import(stdioSpecifier)) as typeof stdioModule
    } catch (err) {
      throw new HumanGateError(
        'JIRA_CALL_FAILED',
        `The MCP SDK is not resolvable from the verification package; inject a McpClientFactory or run the probe with the SDK available: ${String(err)}`,
      )
    }
    const transport = new stdioModule.StdioClientTransport({
      command: 'docker',
      args: ['mcp', 'gateway', 'run', '--servers', GATEWAY_SERVER],
      env: buildEnv(),
    })
    const c = new clientModule.Client({ name: 'foreman-line-human-gate', version: '0.0.0' })
    // biome-ignore lint/suspicious/noExplicitAny: dynamic SDK module, untyped by design.
    await (c as any).connect(transport)
    client = c
    return c
  }
  return {
    async callTool(name, args) {
      const c = (await ensure()) as {
        callTool(input: { name: string; arguments: Record<string, unknown> }): Promise<{
          isError?: boolean
          content?: Array<{ type?: string; text?: string }>
        }>
      }
      const result = await c.callTool({ name, arguments: args })
      const text = (result.content ?? []).find(
        (b) => b.type === 'text' && typeof b.text === 'string',
      )?.text
      if (result.isError === true) {
        throw new Error(`humanGateAdapter: tool ${name} reported an error: ${text ?? '(no text)'}`)
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
    throw new HumanGateError(
      'JIRA_CALL_FAILED',
      `humanGateAdapter: tool ${tool} returned non-JSON content`,
    )
  }
}

interface RawTransition {
  readonly id?: unknown
  readonly name?: unknown
  readonly to?: { readonly name?: unknown }
}

/**
 * Map the getTransitionsForJiraIssue response defensively (shape is
 * VERIFY-AT-PROBE): accept either a bare array or `{ transitions: [...] }`;
 * each entry needs a string id and name; `to.name` (when present) is the
 * destination status, else the transition name stands in.
 */
function mapTransitions(
  parsed: unknown,
): readonly { id: string; name: string; toStatus: string }[] {
  const list: unknown = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null
      ? (parsed as { transitions?: unknown }).transitions
      : undefined
  if (!Array.isArray(list)) {
    throw new HumanGateError(
      'JIRA_CALL_FAILED',
      `humanGateAdapter: ${TOOL_GET_TRANSITIONS} response carries no transitions array (shape is VERIFY-AT-PROBE)`,
    )
  }
  const out: { id: string; name: string; toStatus: string }[] = []
  for (const entry of list as readonly RawTransition[]) {
    const id = typeof entry.id === 'string' ? entry.id : String(entry.id ?? '')
    const name = typeof entry.name === 'string' ? entry.name : ''
    if (id.length === 0 || name.length === 0) continue
    const toName = entry.to?.name
    out.push({ id, name, toStatus: typeof toName === 'string' ? toName : name })
  }
  return out
}

/**
 * Build the production adapter. Never instantiated by a deterministic test
 * with the default factory (tests inject a recording stub — the W1-P4
 * pattern). The gate runs inside every method as defense-in-depth (R4).
 */
export function createHumanGateJiraAdapter(
  clientFactory: McpClientFactory = defaultClientFactory,
): HumanGateJiraTransport & { dispose(): Promise<void> } {
  let client: McpToolClient | undefined
  let cachedCloudId: string | undefined

  const getClient = (): McpToolClient => {
    if (client === undefined) client = clientFactory()
    return client
  }

  const callRaw = async (tool: string, args: Record<string, unknown>): Promise<string> => {
    try {
      return await getClient().callTool(tool, args)
    } catch (err) {
      if (err instanceof HumanGateError) throw err
      throw new HumanGateError(
        'JIRA_CALL_FAILED',
        `humanGateAdapter: tool ${tool} failed: ${String(err)}`,
      )
    }
  }

  const resolveCloudId = async (): Promise<string> => {
    if (cachedCloudId !== undefined) return cachedCloudId
    const resources = parseToolJson<Array<{ id?: string; url?: string }>>(
      TOOL_RESOURCES,
      await callRaw(TOOL_RESOURCES, {}),
    )
    const site = Array.isArray(resources) ? resources.find((r) => r.url === SITE_URL) : undefined
    if (site === undefined || typeof site.id !== 'string' || site.id.length === 0) {
      throw new HumanGateError(
        'JIRA_CALL_FAILED',
        `humanGateAdapter: no accessible Atlassian site matching ${SITE_URL} in ${TOOL_RESOURCES} response`,
      )
    }
    cachedCloudId = site.id
    return cachedCloudId
  }

  return {
    async getTransitions(issueKey) {
      assertHumanGateJiraGate(issueKey) // before any client call
      const cloudId = await resolveCloudId()
      // Arg keys VERIFY-AT-PROBE.
      const raw = await callRaw(TOOL_GET_TRANSITIONS, { cloudId, issueIdOrKey: issueKey })
      return mapTransitions(parseToolJson<unknown>(TOOL_GET_TRANSITIONS, raw))
    },
    async transitionIssue(issueKey, transitionId) {
      assertHumanGateJiraGate(issueKey) // defense-in-depth, before any client call
      const cloudId = await resolveCloudId()
      // Arg keys VERIFY-AT-PROBE; the tool returns text/empty success —
      // any non-error response is success (no result is consumed).
      await callRaw(TOOL_TRANSITION, {
        cloudId,
        issueIdOrKey: issueKey,
        transition: { id: transitionId },
      })
    },
    async addComment(issueKey, body) {
      assertHumanGateJiraGate(issueKey) // defense-in-depth, before any client call
      const cloudId = await resolveCloudId()
      // Arg keys per the W1-P4 coordinator schema probe.
      return callRaw(TOOL_COMMENT, { cloudId, issueIdOrKey: issueKey, commentBody: body })
    },
    async dispose() {
      if (client !== undefined) {
        await client.close()
        client = undefined
      }
    },
  }
}
