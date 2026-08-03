/**
 * JQL idempotency-lookup builder (jira-integration search-first). Every scan
 * is linear-time (lesson #19): a single char-code pass rejects any token
 * carrying a character that could break out of the quoted JQL literal, so no
 * crafted stable id / project key can inject JQL. No regex over untrusted text.
 */
import { MCP_TEST_LABEL } from './gate.js'

/**
 * Reject any token containing a character outside `[A-Za-z0-9._-]` (linear
 * scan by char code). Stable ids are spec filename stems / Epic slug tokens
 * and project keys are allowlisted - all comfortably within this set; anything
 * else is refused before it reaches JQL.
 */
export function assertJqlSafeToken(token: string, label: string): void {
  if (token.length === 0) {
    throw new Error(`assertJqlSafeToken: ${label} must be non-empty`)
  }
  for (let i = 0; i < token.length; i++) {
    const c = token.charCodeAt(i)
    const ok =
      (c >= 48 && c <= 57) || // 0-9
      (c >= 65 && c <= 90) || // A-Z
      (c >= 97 && c <= 122) || // a-z
      c === 45 || // -
      c === 46 || // .
      c === 95 // _
    if (!ok) {
      throw new Error(
        `assertJqlSafeToken: ${label} ${JSON.stringify(token)} contains an unsafe character at index ${i}`,
      )
    }
  }
}

/** `project = <KEY> AND labels = "mcp-test" AND summary ~ "<stableId>"` (Q5/F2). */
export function buildIdempotencyJql(projectKey: string, stableId: string): string {
  assertJqlSafeToken(projectKey, 'projectKey')
  assertJqlSafeToken(stableId, 'stableId')
  return `project = ${projectKey} AND labels = "${MCP_TEST_LABEL}" AND summary ~ "${stableId}"`
}
