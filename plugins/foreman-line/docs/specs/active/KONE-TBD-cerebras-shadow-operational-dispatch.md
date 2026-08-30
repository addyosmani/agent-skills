---
ticket: KONE-TBD
title: Cerebras shadow route operational dispatch completion
status: active
owner: clinton.morgan
created: 2026-08-30
updated: 2026-08-30
supersedes: null
superseded_by: null
risk: elevated
surfaces:
  - plugins/foreman-line/routing-policy/
  - plugins/foreman-line/dispatch/
routing_class: architecture/risk
permission_profile: builder-standard
data_classification: public
---

# Cerebras Shadow Route Operational Dispatch Completion

## Intent

Complete the Cerebras shadow-route addition as an executable, fail-closed dispatch API rather than dormant policy. A caller may submit only an exact Parcel-authorized public input for a policy-allowed analysis task; an injected trusted resolver must independently resolve the authorization reference and corroborate every caller claim before discovery. Dispatch then performs fresh host-local discovery and either records a clean skip or returns a bounded, non-authoritative candidate bound to pending independent review. Existing synchronous primary-model routing remains unchanged.

## Objective

Provide a public dispatch API that consumes `routing-policy.yaml` `shadow_routes`, snapshots the entire validated request before any await, verifies that snapshot against a trusted injected Parcel record, enforces every containment field before adapter invocation, validates and bounds untrusted discovery/candidate data, and writes an evidence receipt. Success means mutation after validation cannot change provider input, task, route, receipt identity, Parcel claim, authorization reference, or reviewer binding; forged or unverifiable authorization fails before discovery; unavailable adapters never execute; invalid inputs cannot abuse memory/receipts; runtime containment values cannot be mutated; valid candidates cannot approve or clear anything; and all public schema/type exports are usable from package entrypoints.

## Tech Stack

- TypeScript with strict `NodeNext` compilation.
- Node built-ins for SHA-256 input/candidate binding and receipt filesystem operations.
- Existing `yaml` and routing-policy validator; no new dependencies or live services.
- Node test runner through `tsx`; injected authorization, discovery, and invocation fakes in all shadow-route tests.

## Commands

- Routing-policy tests: `npm test --prefix plugins/foreman-line/routing-policy`
- Routing-policy typecheck: `npm run typecheck --prefix plugins/foreman-line/routing-policy`
- Routing-policy lint: `npm run lint --prefix plugins/foreman-line/routing-policy`
- Dispatch tests: `npm test --prefix plugins/foreman-line/dispatch`
- Dispatch typecheck: `npm run typecheck --prefix plugins/foreman-line/dispatch`
- Dispatch lint: `npm run lint --prefix plugins/foreman-line/dispatch`

## Project Structure

- `routing-policy/src`, `schemas`, and `tests` own the policy contract, exports, and parity proof.
- `dispatch/src/routing-eval` owns both unchanged primary routing and the additive shadow dispatch API.
- `dispatch/tests` owns fake-adapter behavior and receipt integration tests.
- `docs/specs/active` owns this approved implementation work order.

## Code Style

Use explicit immutable contracts and discriminated results; treat every resolver or adapter value as `unknown` until checked.

```ts
const authorization: unknown = await dependencies.resolveParcelAuthorization(authorizationRef)
validateAndCompareAuthorization(authorization, request)
const discovery: unknown = await dependencies.discoverAdapter(route.adapter_id)
if (!isVerifiedAvailable(discovery)) {
  return writeSkippedReceipt(/* normalized evidence only */)
}
```

Use camelCase TypeScript API fields while preserving snake_case policy fields. Keep primary routing synchronous. No implicit authority fields, provider-specific credentials, or side-effect-bearing adapter request options.

## Testing Strategy

Follow red-green-refactor increments. First add package-entrypoint and reversed-role parity tests. Then add shadow-dispatch tests using injected authorization/discovery/invocation fakes and temporary receipt roots. Cover forged, missing, throwing, malformed, non-public, and mismatched authorization; pre-discovery rejections; unavailable discovery; verified execution; malformed discovery/output; JSON/size boundaries; zero tools/effects; fixed non-authoritative result semantics; independent-review binding; and evidence receipts. Finish with both packages' complete tests, typechecks, and Biome checks.

## Constraints

- Preserve `evaluateRouting` as the synchronous primary-model route.
- Load and validate the policy at invocation; do not copy its route settings into code as mutable authority.
- Require public classification, a policy-allowed task, a Parcel authorization reference, and a SHA-256 binding to the exact public input before discovery.
- Validate and snapshot `workflowId`, `routeName`, `taskType`, `independentReviewerId`, every Parcel claim field, a defensively copied/frozen allowed-task list, and the canonicalized/hashed/deep-cloned/recursively frozen public input before the first asynchronous dependency call. Use only this frozen request snapshot for trusted authorization comparison, policy resolution, discovery, invocation, receipt paths/content, and review binding; never re-read the caller's request.
- Capture and validate the three trusted dependency function references before the first await so asynchronous mutation of the dependency container cannot replace the resolver, discovery, or invocation operation mid-flight.
- Require injected `resolveParcelAuthorization(authorizationRef)` to return an exact authoritative record containing only `parcelId`, `dataClassification`, `allowedTaskTypes`, and `publicInputSha256`; independently validate it, then require exact agreement with the request. Missing, throwing, malformed, non-public, or mismatched resolution fails closed before discovery without persisting resolver details.
- Accept only dense canonical JSON public input up to 65,536 UTF-8 bytes. Reject sparse arrays, cycles, non-finite numbers, non-plain objects, `undefined`, functions, symbols, and bigint values.
- Limit candidate text to 32,768 UTF-8 bytes; allow at most 64 evidence references, each no more than 2,048 UTF-8 bytes. Limit authorization references to 512 bytes, reviewer identities to 256 bytes, parcel identities to 128 bytes, and claimed/authoritative allowed-task lists to 16 unique non-empty values.
- Perform live discovery on every shadow invocation. Only the exact normalized status `verified_available` permits adapter execution.
- Grant the adapter no tools, no effect capability, no authority, and no gate/review/approval role.
- Accept only a narrow candidate schema from the untrusted adapter; never persist raw discovery/provider failure content.
- Defensively copy and freeze accepted evidence references. Freeze the no-tools array and invocation/result containment values so adapter or caller mutation cannot create drift from the digest or receipt.
- Bind accepted candidates to a distinct independent reviewer with status `pending`.
- Do not access credentials, networks, providers, Docker, MCP, or live services.

## Boundaries

- Always: validate before boundary crossing; inject trusted authorization and adapter operations; write normalized receipts for skipped and accepted outcomes; run focused tests after each increment.
- Ask first: new dependencies, changing the primary routing contract, widening policy task types, or changing CI.
- Never: invoke Cerebras in tests, record secrets/provider requests/probe details in policy, let candidate output clear a gate, or commit from this worker task.

## Allowed Files

- `plugins/foreman-line/docs/specs/active/KONE-TBD-cerebras-shadow-operational-dispatch.md`
- `plugins/foreman-line/routing-policy/README.md`
- `plugins/foreman-line/routing-policy/routing-policy.yaml`
- `plugins/foreman-line/routing-policy/src/index.ts`
- `plugins/foreman-line/routing-policy/src/schemas.ts`
- `plugins/foreman-line/routing-policy/src/types.ts`
- `plugins/foreman-line/routing-policy/schemas/shadow-route.schema.json`
- `plugins/foreman-line/routing-policy/tests/entrypoint.test.ts`
- `plugins/foreman-line/routing-policy/tests/parity.test.ts`
- `plugins/foreman-line/dispatch/README.md`
- `plugins/foreman-line/dispatch/src/index.ts`
- `plugins/foreman-line/dispatch/src/routing-eval/index.ts`
- `plugins/foreman-line/dispatch/src/routing-eval/shadow.ts`
- `plugins/foreman-line/dispatch/tests/shadow-routing.test.ts`

## Out of Scope

- Live Parcel authorization stores, Cerebras discovery/provider implementations, credential management, pricing, billing, model selection, or network transport.
- Changes to approval CLI, Jira, verification, human gates, primary-model selection, CI, or package dependencies.
- Treating a candidate or its pending review binding as completed independent review.

## Implementation Plan and Tasks

### Task 1: Close routing-policy public-contract drift

**Dependencies:** None.

**Files:** routing-policy types, schemas, entrypoint, and focused tests.

**Acceptance criteria:**

- [ ] `shadowRouteSchema`, `ShadowRoute`, and `ShadowTaskType` import from the package entrypoint.
- [ ] `prohibited_roles` is typed as exactly the two required roles in either order, matching runtime validation.
- [ ] Forward/reverse order and duplicate/missing-role cases prove exact parity.

**Verification:** Run routing-policy tests and typecheck after observing the new tests fail against the prior implementation.

### Task 2: Add fail-closed shadow dispatch API

**Dependencies:** Task 1.

**Files:** new shadow routing module, routing-eval/public entrypoint exports, and fake-driven dispatch tests.

**Acceptance criteria:**

- [ ] Public authorization/classification/task/digest/reviewer checks precede discovery, using one immutable full-request snapshot created before the first await; mutations during authorization/discovery cannot change invocation, receipt, or review semantics.
- [ ] A trusted injected Parcel resolver corroborates the request; forged, missing, throwing, malformed, non-public, or mismatched records fail before discovery.
- [ ] Fresh verified discovery is required; all other/invalid discovery outcomes skip without invocation.
- [ ] Verified invocation receives fixed no-tool/no-effect/no-authority constraints.
- [ ] Only dense bounded JSON input and bounded validated candidates/evidence are accepted; provider input, zero-tools containment, and returned evidence remain runtime-immutable, with fixed no-gate/no-approval semantics and pending independent review bound by digest.
- [ ] Accepted and skipped results write normalized receipts; no raw provider/probe content is persisted.

**Verification:** Run focused shadow-routing tests after observing their initial missing-API failure, then run dispatch tests and typecheck.

### Task 3: Align documentation and full verification

**Dependencies:** Tasks 1 and 2.

**Files:** routing-policy README/YAML comments and dispatch README.

**Acceptance criteria:**

- [ ] README claims match the exact enforced dispatch API and explicitly leave actual provider transport operator-owned.
- [ ] Policy header says v0.1, August 2026, and six invariants.
- [ ] Both packages pass tests, typecheck, and lint, subject only to a precisely reported host Node engine mismatch.

**Verification:** Run all six commands listed above and inspect `git diff --check` plus the scoped worktree diff.

## Success Criteria

- All review findings and enumerated behavioral tests are satisfied without live access or new dependencies.
- Caller-supplied authorization fields have no authority unless they exactly match the trusted resolver record, and all untrusted input/output sizes are conservatively bounded.
- Shadow execution is publicly invokable from `@foreman-line/dispatch`, consumes validated policy, and leaves auditable candidate/skip receipts.
- No shadow candidate can express authority through the accepted output schema or result envelope; independent review remains visibly pending.
- The implementation diff stays within Allowed Files and leaves unrelated work untouched.

## Open Questions

None. The developer explicitly approved this narrow implementation scope; live adapter transport remains a separate operator-owned integration.

## Verification Plan

Mandated reviewer focus questions:

- Does any path reach discovery before public-input and Parcel-authorization checks?
- Can malformed discovery or candidate data trigger invocation, authority, a gate, approval, or review completion?
- Is independent review bound to the exact accepted candidate digest while remaining pending?
- Does the receipt omit raw probe/provider failure material and preserve primary routing compatibility?
