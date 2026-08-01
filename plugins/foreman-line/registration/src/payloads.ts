/**
 * Create/update payload builders (create schema per Clint via coordinator
 * ruling Q3/D3). The reference ids (Epic issuetype `11`, Story issuetype `7`,
 * Work Type `customfield_14522` -> `12817`) are encoded as constants here and
 * VERIFIED at the live probe - never assumed; a server-side schema rejection
 * is reported per-item, never retried with a guess.
 *
 * The package stamps the `mcp-test` label and the `[TEST] ` summary prefix; it
 * never trusts the caller to have done so. The stable idempotency id (Story
 * filename-stem key / Epic slug token) is carried in the summary alongside the
 * `[TEST] ` prefix, so the search-first JQL keys off it.
 */
import { MCP_TEST_LABEL, TEST_PREFIX } from './gate.js'
import type { IssueCreatePayload, IssueUpdatePayload } from './types.js'

export const EPIC_ISSUETYPE_ID = '11'
export const STORY_ISSUETYPE_ID = '7'
export const WORK_TYPE_FIELD = 'customfield_14522'
export const WORK_TYPE_ID = '12817'

export interface CreateBits {
  readonly projectKey: string
  readonly issuetypeId: string
  readonly title: string
  readonly stableId: string
  readonly parentKey?: string
}

/** `[TEST] [<stableId>] <title>` - the `[TEST] ` prefix (gate) then the stable idempotency id. */
export function composeSummary(stableId: string, title: string): string {
  return `${TEST_PREFIX}[${stableId}] ${title}`
}

/**
 * Build a create payload, stamping the `mcp-test` label and the `[TEST] `
 * prefix. The returned payload is what `assertRegistrationGate` then asserts
 * (post-injection) - stamp-then-assert, never trust-the-caller.
 */
export function buildCreatePayload(bits: CreateBits): IssueCreatePayload {
  const base = {
    project: { key: bits.projectKey },
    issuetype: { id: bits.issuetypeId },
    summary: composeSummary(bits.stableId, bits.title),
    labels: [MCP_TEST_LABEL],
    customfield_14522: { id: WORK_TYPE_ID },
  }
  const fields = bits.parentKey !== undefined ? { ...base, parent: { key: bits.parentKey } } : base
  return { fields }
}

/**
 * Derive an update payload from a create payload - refreshes only
 * summary/labels/customfield. Structurally cannot carry status/assignee/sprint
 * (update-never-clobber, F2).
 */
export function buildUpdatePayload(payload: IssueCreatePayload): IssueUpdatePayload {
  return {
    fields: {
      summary: payload.fields.summary,
      labels: payload.fields.labels,
      customfield_14522: payload.fields.customfield_14522,
    },
  }
}
