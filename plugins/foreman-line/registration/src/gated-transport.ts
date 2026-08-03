/**
 * The gated wrapper - the ONLY module that touches the injected adapter's
 * mutating methods (`createIssue`/`updateIssue`/`addRemoteLink`). Each mutating
 * call asserts `assertRegistrationGate` first; the raw adapter is a private
 * field, unreachable except through these methods. This is the structural fact
 * the negative-control test and review focus 1 prove: there is no code path
 * that reaches a Jira create/update/link without the gate having run and
 * passed. `search` is read-only and not gated.
 */
import { assertRegistrationGate } from './gate.js'
import { buildUpdatePayload } from './payloads.js'
import type { GateFields, IssueCreatePayload, JiraTransport } from './types.js'

export class GatedTransport {
  readonly #adapter: JiraTransport

  constructor(adapter: JiraTransport) {
    this.#adapter = adapter
  }

  /** Read-only JQL search - not a mutation, so not gated. */
  search(jql: string): Promise<readonly string[]> {
    return this.#adapter.search(jql)
  }

  /** Gated create: assert the gate on the stamped payload, then create. */
  createGated(payload: IssueCreatePayload): Promise<string> {
    assertRegistrationGate(payload.fields)
    return this.#adapter.createIssue(payload)
  }

  /** Gated update: assert the gate on the stamped payload, then update (never clobbering status/assignee/sprint). */
  updateGated(key: string, payload: IssueCreatePayload): Promise<void> {
    assertRegistrationGate(payload.fields)
    return this.#adapter.updateIssue(key, buildUpdatePayload(payload))
  }

  /**
   * Gated link write: assert the gate on the originating issue's fields, then
   * write the ticket->commit link (defense-in-depth - the issue already passed
   * the gate at create/update; the link write cannot target an ungated issue).
   */
  addLinkGated(issueKey: string, permalink: string, gate: GateFields): Promise<string> {
    assertRegistrationGate(gate)
    return this.#adapter.addRemoteLink(issueKey, permalink)
  }
}
