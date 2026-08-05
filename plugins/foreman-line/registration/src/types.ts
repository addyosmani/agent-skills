/**
 * Public types for the registration package: the injected transport boundary
 * (`JiraTransport`), the Jira payload shapes the gate/wrapper build, and the
 * typed errors. No stage schema is authored here - the emitted
 * `RegistrationResult` is the frozen `contracts` type, re-validated against the
 * frozen `registrationResultSchema` (never re-declared).
 */

/**
 * The three fields the mechanical sandbox gate asserts on. `IssueFields`
 * extends this, so `assertRegistrationGate` operates on any create payload's
 * fields directly.
 */
export interface GateFields {
  readonly project: { readonly key: string }
  readonly labels: readonly string[]
  readonly summary: string
}

/**
 * Full create-payload fields. `customfield_14522` (Work Type) has no server
 * default, so it is always present. `parent` links a Story to its Epic
 * (issuetype linkage, NOT an epic-link custom field). Reference ids
 * (issuetype 11/7, customfield 12817) are verified at the live probe - see the
 * README - never silently defaulted.
 */
export interface IssueFields extends GateFields {
  readonly issuetype: { readonly id: string }
  readonly customfield_14522: { readonly id: string }
  readonly parent?: { readonly key: string }
}

export interface IssueCreatePayload {
  readonly fields: IssueFields
}

/**
 * Update-never-clobber (jira-integration F2): an update refreshes only
 * summary/labels/customfield. `status`, `assignee`, and `sprint` are
 * structurally absent - they cannot be expressed, so an update can never
 * mutate them.
 */
export interface IssueUpdateFields {
  readonly summary?: string
  readonly labels?: readonly string[]
  readonly customfield_14522?: { readonly id: string }
}

export interface IssueUpdatePayload {
  readonly fields: IssueUpdateFields
}

/**
 * The injected MCP boundary (coordinator ruling Q2). Each method receives
 * already-validated arguments and returns opaque string refs. All gate /
 * hash-refusal / write-back / receipt logic sits above this and is unit-tested
 * against a fake recording adapter - no network in any deterministic test.
 * Asynchronous: the ratified Q2/Q11 contingency fired, so the production
 * adapter is the `@modelcontextprotocol/sdk` client over stdio (objects
 * native), whose calls are Promise-based; git write-back stays synchronous
 * within the async orchestrator.
 */
export interface JiraTransport {
  /** Create an issue; resolves to the new issue key. */
  createIssue(payload: IssueCreatePayload): Promise<string>
  /** Update an existing issue; never touches status/assignee/sprint. */
  updateIssue(key: string, payload: IssueUpdatePayload): Promise<void>
  /** Read-only JQL search; resolves to matching issue keys. */
  search(jql: string): Promise<readonly string[]>
  /** Write the ticket->commit link (a comment carrying the permalink); resolves to an opaque id. */
  addRemoteLink(issueKey: string, permalink: string): Promise<string>
}

/** Thrown by `assertRegistrationGate` when a mechanical isolation condition fails. */
export class RegistrationGateError extends Error {
  readonly violation: 'project-key' | 'label' | 'prefix'
  constructor(violation: 'project-key' | 'label' | 'prefix', message: string) {
    super(message)
    this.name = 'RegistrationGateError'
    this.violation = violation
  }
}

/**
 * Thrown by the F7 hash-refusal when current on-disk content no longer hashes
 * to the P3-approved `approvedHash`. `exitCode` is `1` - a CLI wrapper surfaces
 * this as a process exit code (the library refuses by throwing).
 */
export class HashMismatchError extends Error {
  readonly exitCode = 1
  readonly expected: string
  readonly actual: string
  constructor(expected: string, actual: string) {
    super(
      `F7 hash-refusal: current content hashes to ${actual} but the approval record recorded ${expected}; refusing to register changed content`,
    )
    this.name = 'HashMismatchError'
    this.expected = expected
    this.actual = actual
  }
}

/**
 * Thrown on a post-create failure. Carries `landed` - the per-item report of
 * exactly what was created/updated before the failure - so the caller can see
 * the re-runnable state (search-first idempotency guarantees a re-run creates
 * no duplicates). No ticket is ever deleted.
 */
export class RegistrationError extends Error {
  readonly landed: readonly string[]
  constructor(message: string, landed: readonly string[]) {
    super(message)
    this.name = 'RegistrationError'
    this.landed = landed
  }
}
