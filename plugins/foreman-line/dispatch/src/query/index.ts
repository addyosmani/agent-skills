/**
 * Jira query + next-candidate ranking (W2-P1).
 *
 * Queries KONE for issues assigned to clinton.morgan@kaseya.com in dispatchable
 * states (To Do / In Progress), cross-references the in-repo receipt chain to
 * resolve each candidate's workflowId and priorReceiptLocator, ranks by
 * resolution status + Jira priority + issue key, and returns a RankedCandidateList.
 *
 * **Transport:** @modelcontextprotocol/sdk stdio client connected to
 * `docker mcp gateway run --servers atlassian-remote`. NO `docker mcp tools call`
 * (string-only, cannot carry typed arguments — W1-P4 lesson #20).
 *
 * **JQL injection guard:** any configurable token interpolated into JQL passes
 * assertJqlSafeToken (from registration/src/jql.ts) before use. The assignee
 * email clinton.morgan@kaseya.com is a FIXED LITERAL in the template — not
 * passed through assertJqlSafeToken, which would reject the `@` character.
 *
 * **Read-only enforcement:** zero mutating Jira tool paths exist in this file.
 * No issue-create, issue-edit, or comment-write tools are called or exposed.
 *
 * **Linear-time string ops (lesson #19):** no backtracking regex over untrusted
 * Jira text. Summary, priority name, and status name are copied verbatim.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type { SchemaObject } from 'ajv'
import { Ajv } from 'ajv'
import { assertJqlSafeToken } from '../../../registration/src/jql.js'

// ─── Public types ──────────────────────────────────────────────────────────────

export interface CandidateRecord {
  readonly ticketKey: string
  readonly summary: string
  readonly priority: string
  readonly status: string
  readonly workflowId: string | null
  readonly priorReceiptLocator: string | null
}

export type RankedCandidateList = readonly CandidateRecord[]

/** The injected MCP client boundary; callTool resolves to the tool's raw text body. */
export interface McpToolClient {
  callTool(name: string, args: Record<string, unknown>): Promise<string>
  close(): Promise<void>
}

export type McpClientFactory = () => McpToolClient

export interface QueryOptions {
  /** Injectable factory — tests pass a stub; production omits (real SDK client). */
  clientFactory?: McpClientFactory
  /**
   * Absolute path to the repo root for receipt scanning.
   * Defaults to process.cwd(). W2-P2 (the integrating CLI) passes the actual
   * repo root.
   */
  repoRoot?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Site selection is pinned to this URL; the cloudId behind it is discovered, never hardcoded. */
export const SITE_URL = 'https://kaseya.atlassian.net'

const TOOL_SEARCH = 'searchJiraIssuesUsingJql'
const TOOL_RESOURCES = 'getAccessibleAtlassianResources'
const SERVER = 'atlassian-remote'

// ─── JQL ──────────────────────────────────────────────────────────────────────

/**
 * Build the KONE candidate JQL. Calls assertJqlSafeToken on projectKey before
 * interpolating it (injection guard). The assignee email is a FIXED LITERAL —
 * it contains `@` which assertJqlSafeToken rejects, so it is not interpolated
 * through the guard.
 */
export function buildCandidateJql(projectKey: string): string {
  assertJqlSafeToken(projectKey, 'projectKey')
  return (
    `project = ${projectKey} AND assignee = "clinton.morgan@kaseya.com"` +
    ` AND status in ("To Do", "In Progress") ORDER BY priority ASC, key ASC`
  )
}

// ─── Env / Transport ──────────────────────────────────────────────────────────

/**
 * Copy environment, dropping undefined values to satisfy Record<string,string>.
 * Linear-time single pass.
 */
function buildEnv(source: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) out[key] = value
  }
  return out
}

/**
 * StdioClientTransport server parameters. Passes the FULL parent environment
 * so the docker CLI can find Windows variables (ProgramData, etc.) — the SDK
 * default-minimal env strips them and causes docker to panic (W1-P4 lesson).
 */
function stdioServerParameters(): {
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

/**
 * Default (production) McpClientFactory: real @modelcontextprotocol/sdk stdio
 * client connected to the persistent gateway. Connects lazily on the first
 * call and reuses the connection. Never instantiated by deterministic tests.
 */
function defaultClientFactory(): McpToolClient {
  let client: Client | undefined
  const ensure = async (): Promise<Client> => {
    if (client !== undefined) return client
    const transport = new StdioClientTransport(stdioServerParameters())
    const c = new Client({ name: 'foreman-line-dispatch', version: '0.0.0' })
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
      if (result.isError === true) {
        throw new Error(`dispatchAdapter: tool ${name} reported an error: ${text ?? '(no text)'}`)
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

// ─── Receipt scanning ─────────────────────────────────────────────────────────

interface ReceiptResolution {
  readonly workflowId: string
  readonly priorReceiptLocator: string
}

/**
 * Find the receipt file with the highest 6-digit sequence prefix in a directory.
 * Filenames follow NNNNNN-Stage-slug.json. Returns a POSIX-style path relative
 * to the repo root (docs/receipts/<workflowId>/<file>), or null if no JSON
 * files are found.
 */
function findHighestSequenceFile(dirPath: string, workflowId: string): string | null {
  let maxSeq = -1
  let maxFile = ''
  for (const entry of readdirSync(dirPath)) {
    if (!entry.endsWith('.json')) continue
    // Parse the 6-char zero-padded sequence prefix — O(1) per file (prefix is fixed-length)
    const seq = parseInt(entry.slice(0, 6), 10)
    if (!Number.isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
      maxFile = entry
    }
  }
  if (maxFile.length === 0) return null
  return `docs/receipts/${workflowId}/${maxFile}`
}

/**
 * Scan docs/receipts/ in repoRoot for Stage-B receipt files. Returns a map from
 * ticketKey to { workflowId, priorReceiptLocator } for all resolved candidates.
 *
 * Pattern: docs/receipts/<uuid>/000001-B-registration-result.json
 * priorReceiptLocator = highest-sequence receipt file in the UUID directory.
 */
function scanReceiptsForResolution(repoRoot: string): Map<string, ReceiptResolution> {
  const receiptsDir = join(repoRoot, 'docs', 'receipts')
  const result = new Map<string, ReceiptResolution>()
  if (!existsSync(receiptsDir)) return result

  for (const entry of readdirSync(receiptsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const workflowId = entry.name
    const stageBPath = join(receiptsDir, workflowId, '000001-B-registration-result.json')
    if (!existsSync(stageBPath)) continue

    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(stageBPath, 'utf8'))
    } catch {
      continue
    }

    const subject = (parsed as { subject?: { ticketKeys?: unknown } } | null)?.subject
    if (!Array.isArray(subject?.ticketKeys)) continue

    const priorReceiptLocator = findHighestSequenceFile(join(receiptsDir, workflowId), workflowId)
    if (priorReceiptLocator === null) continue

    for (const key of subject.ticketKeys as unknown[]) {
      if (typeof key === 'string' && key.length > 0) {
        result.set(key, { workflowId, priorReceiptLocator })
      }
    }
  }

  return result
}

// ─── AJV output validation ────────────────────────────────────────────────────

const candidateRecordSchema: SchemaObject = {
  type: 'object',
  additionalProperties: false,
  required: ['ticketKey', 'summary', 'priority', 'status', 'workflowId', 'priorReceiptLocator'],
  properties: {
    ticketKey: { type: 'string', minLength: 1 },
    summary: { type: 'string' },
    priority: { type: 'string' },
    status: { type: 'string' },
    workflowId: { type: ['string', 'null'] },
    priorReceiptLocator: { type: ['string', 'null'] },
  },
}

const ajv = new Ajv({ allErrors: true })
const validateCandidateRecord = ajv.compile(candidateRecordSchema)

function assertValidCandidateRecord(record: unknown): asserts record is CandidateRecord {
  if (!validateCandidateRecord(record)) {
    throw new Error(
      `queryAndRankCandidates: invalid CandidateRecord shape: ${ajv.errorsText(validateCandidateRecord.errors)}`,
    )
  }
}

// ─── Jira response types (internal) ──────────────────────────────────────────

interface JiraIssueField {
  summary?: string
  priority?: { name?: string }
  status?: { name?: string }
}

interface JiraIssue {
  key?: string
  fields?: JiraIssueField
}

interface JiraSearchResult {
  issues?: JiraIssue[]
}

// ─── Main query function ──────────────────────────────────────────────────────

/**
 * Query KONE for dispatchable candidates and return them ranked.
 *
 * Ranking:
 *   1. Candidates with a resolved workflowId come first (ready to dispatch).
 *   2. Within each group, Jira's priority ASC + key ASC ordering is preserved.
 *
 * The MCP client is created lazily and closed after the query completes.
 *
 * Read-only: this function calls only searchJiraIssuesUsingJql and
 * getAccessibleAtlassianResources. No mutating tools are reachable.
 */
export async function queryAndRankCandidates(options?: QueryOptions): Promise<RankedCandidateList> {
  const factory = options?.clientFactory ?? defaultClientFactory
  const repoRoot = options?.repoRoot ?? process.cwd()

  let mcpClient: McpToolClient | undefined
  let cachedCloudId: string | undefined

  const getClient = (): McpToolClient => {
    if (mcpClient === undefined) mcpClient = factory()
    return mcpClient
  }

  const callJson = async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
    const raw = await getClient().callTool(tool, args)
    try {
      return JSON.parse(raw) as T
    } catch {
      throw new Error(`dispatchAdapter: tool ${tool} returned non-JSON content`)
    }
  }

  const resolveCloudId = async (): Promise<string> => {
    if (cachedCloudId !== undefined) return cachedCloudId
    const resources = await callJson<Array<{ id?: string; url?: string }>>(TOOL_RESOURCES, {})
    const site = Array.isArray(resources) ? resources.find((r) => r.url === SITE_URL) : undefined
    if (site === undefined || typeof site.id !== 'string' || site.id.length === 0) {
      throw new Error(
        `dispatchAdapter: no accessible Atlassian site matching ${SITE_URL}` +
          ` in getAccessibleAtlassianResources response`,
      )
    }
    cachedCloudId = site.id
    return cachedCloudId
  }

  try {
    const cloudId = await resolveCloudId()
    const jql = buildCandidateJql('KONE')
    const parsed = await callJson<JiraSearchResult>(TOOL_SEARCH, { cloudId, jql })

    // Resolve workflowId + priorReceiptLocator from in-repo receipt chain
    const resolutionMap = scanReceiptsForResolution(repoRoot)

    // Build candidate records; Jira already returns them in priority + key order
    const records: CandidateRecord[] = []
    for (const issue of parsed.issues ?? []) {
      if (typeof issue.key !== 'string' || issue.key.length === 0) continue
      const ticketKey = issue.key
      const resolution = resolutionMap.get(ticketKey)
      const record: CandidateRecord = {
        ticketKey,
        // Summary and status are copied verbatim — no processing over untrusted text (lesson #19)
        summary: issue.fields?.summary ?? '',
        priority: issue.fields?.priority?.name ?? '',
        status: issue.fields?.status?.name ?? '',
        workflowId: resolution?.workflowId ?? null,
        priorReceiptLocator: resolution?.priorReceiptLocator ?? null,
      }
      assertValidCandidateRecord(record)
      records.push(record)
    }

    // Rank: resolved first (preserving Jira order within each group), then unresolved
    const resolved: CandidateRecord[] = []
    const unresolved: CandidateRecord[] = []
    for (const r of records) {
      if (r.workflowId !== null) {
        resolved.push(r)
      } else {
        unresolved.push(r)
      }
    }

    return [...resolved, ...unresolved]
  } finally {
    if (mcpClient !== undefined) {
      await mcpClient.close()
    }
  }
}
