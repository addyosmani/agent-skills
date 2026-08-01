/**
 * Public surface of the Foreman Line Jira MCP registration package (W1-P4).
 * `RegistrationResult`/`RegistrationLink`/`registrationResultSchema` and the
 * receipt/approval types are owned by the frozen `contracts`/`receipts`/
 * `approval` packages and imported from there directly by consumers - not
 * re-exported here (same precedent as `shaping`/`projection`/`approval`).
 */
export {
  createDockerMcpAdapter,
  ISSUE_TYPE_ID_TO_NAME,
  type McpClientFactory,
  type McpToolClient,
  SITE_URL,
} from './adapter-docker-mcp.js'
export {
  backfillTicketLine,
  type FileSnapshot,
  restoreSnapshots,
} from './backfill.js'
export {
  ALLOWED_PROJECT_KEYS,
  assertRegistrationGate,
  MCP_TEST_LABEL,
  TEST_PREFIX,
} from './gate.js'
export { GatedTransport } from './gated-transport.js'
export { assertApprovedHashMatches } from './hash-refusal.js'
export { assertJqlSafeToken, buildIdempotencyJql } from './jql.js'
export {
  buildCreatePayload,
  type CreateBits,
  composeSummary,
  EPIC_ISSUETYPE_ID,
  STORY_ISSUETYPE_ID,
  WORK_TYPE_FIELD,
  WORK_TYPE_ID,
} from './payloads.js'
export { buildPermalink, type OwnerRepo, parseOwnerRepo } from './permalink.js'
export {
  detectRegistrationMode,
  type RegistrationMode,
  stageBReceiptLocator,
} from './prior-registration.js'
export {
  type MintedStageBReceipt,
  mintStageBReceipt,
  RECEIPT_SCHEMA_VERSION,
  STAGE_B_SUBJECT_KIND,
} from './receipt.js'
export {
  assertRegistrationSlug,
  PROJECT_KEY,
  type PreviewResult,
  preview,
  type RegisterOptions,
  type RegisterOutcome,
  register,
} from './register.js'
export {
  type GateFields,
  HashMismatchError,
  type IssueCreatePayload,
  type IssueFields,
  type IssueUpdateFields,
  type IssueUpdatePayload,
  type JiraTransport,
  RegistrationError,
  RegistrationGateError,
} from './types.js'
