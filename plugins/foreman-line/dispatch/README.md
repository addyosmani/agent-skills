# @foreman-line/dispatch

The dispatch package for the Foreman Line W2 workflow. Provides the sub-modules needed to select,
evaluate, and dispatch a candidate parcel to a builder agent.

## Package purpose

This package is the home for all W2 parcels' sub-modules. Starting with W2-P1 (Jira query +
ranking), subsequent W2 parcels add sub-modules here:

| Sub-module | Parcel | Status |
|---|---|---|
| `src/query/` | W2-P1 | Active |
| `src/routing-eval/` | W2-P3 + shadow-route extension | Active |
| `src/skill-resolver/` | W2-P5 | Pending |
| `src/kompress-adapter/` | W2-P4 | Pending |
| `src/approval-cli/` | W2-P2 | Pending |

## Sub-module: `src/query/`

Queries KONE Jira for issues assigned to `clinton.morgan@kaseya.com` in dispatchable states
(`To Do` / `In Progress`), cross-references the in-repo receipt chain to resolve each candidate's
`workflowId` and `priorReceiptLocator`, and returns a ranked `CandidateList`.

**Ranking:** Candidates with a resolved `workflowId` (registered parcels ready to dispatch) come
first. Within each group, Jira's `priority ASC, key ASC` ordering is preserved (highest-priority
issues first, `key` as a stable tiebreaker).

**Public API:**

```typescript
import { queryAndRankCandidates } from '@foreman-line/dispatch'

const candidates = await queryAndRankCandidates({ repoRoot: '/path/to/repo' })
// candidates[0] is the highest-priority dispatchable candidate (if any exist)
```

## Transport constraint (SDK path only)

**All Jira calls use `@modelcontextprotocol/sdk` stdio client connected to
`docker mcp gateway run --servers atlassian-remote`.** The one-shot
`docker mcp tools call key=value` path is string-only and cannot carry typed arguments;
this package always uses the SDK path (W1-P4 lesson #20).

## Read-only enforcement

This package exposes **zero mutating tool paths**. No `createJiraIssue`, `editJiraIssue`, or
`addCommentToJiraIssue` call exists anywhere in `dispatch/src/`. An attempt to reach a mutating
tool through this package is a loop-stop.

## JQL injection guard

Any configurable token interpolated into JQL passes `assertJqlSafeToken` (from
`registration/src/jql.ts`) before use. The assignee email `clinton.morgan@kaseya.com` is a
**fixed string literal** in the JQL template — it is not passed through `assertJqlSafeToken`
because the `@` character would be rejected.

## WorkflowId resolution

After the Jira search, the module scans `docs/receipts/<uuid>/000001-B-registration-result.json`
files in the repo root. For each file, it reads `subject.ticketKeys`. A candidate whose key
appears in the array is resolved: `workflowId` = the UUID directory name,
`priorReceiptLocator` = the path of the **highest-sequence** receipt file in that directory.

Candidates with no matching receipt are returned with `workflowId: null` and
`priorReceiptLocator: null` (valid but not dispatchable by W2-P2 until registered).

## Injectable adapter

`queryAndRankCandidates` accepts an optional `clientFactory` for testing. Tests inject a stub;
production omits the factory and the real SDK stdio client is used.

```typescript
// Test injection
const result = await queryAndRankCandidates({
  clientFactory: () => myStubClient,
  repoRoot: tempDir,
})
```

## Sub-module: `src/routing-eval/`

`evaluateRouting` remains the synchronous deterministic primary-model selector.
`executeShadowRoute` is an additive asynchronous dispatch API for optional,
policy-governed analysis sidecars such as `cerebras-shadow`.

The shadow API accepts only exact Parcel-authorized public JSON input. Callers
bind that input with `hashShadowPublicInput`, name a policy- and Parcel-allowed
task, and assign an independent reviewer. Caller fields are claims only: a
trusted injected `resolveParcelAuthorization` must resolve the authorization
reference to an exact record containing `parcelId`, public
`dataClassification`, `allowedTaskTypes`, and `publicInputSha256`. Dispatch
validates and compares that record before discovery. Missing, throwing,
malformed, non-public, or mismatched resolution fails closed without persisting
raw resolver data. Callers also inject fresh host-local discovery and provider
invocation functions; this package does not read credentials or implement a
Cerebras transport.

```typescript
import { executeShadowRoute, hashShadowPublicInput } from '@foreman-line/dispatch'

const publicInput = { specRef: 'docs/specs/active/example.md' }
const result = await executeShadowRoute(
  {
    workflowId: 'workflow-001',
    routeName: 'cerebras-shadow',
    taskType: 'spec_lint',
    publicInput,
    parcelAuthorization: {
      parcelId: 'PARCEL-001',
      authorizationRef: 'docs/specs/active/example.md#shadow-inputs',
      dataClassification: 'public',
      allowedTaskTypes: ['spec_lint'],
      publicInputSha256: hashShadowPublicInput(publicInput),
    },
    independentReviewerId: 'reviewer-001',
  },
  { resolveParcelAuthorization, discoverAdapter, invokeAdapter },
)
```

`SHADOW_LIMITS` exposes the enforced conservative boundaries: canonical dense
JSON public input is at most 65,536 UTF-8 bytes; candidate text is at most
32,768 bytes; at most 64 evidence references are accepted, each at most 2,048
bytes. Authorization references are capped at 512 bytes, independent reviewer
identities at 256 bytes, Parcel identities at 128 bytes, and allowed-task lists
at 16 unique values of at most 128 bytes. Sparse arrays, cycles, non-finite
numbers, non-plain/accessor-bearing objects, and non-JSON values are rejected.
Before calling any asynchronous dependency, dispatch canonicalizes and hashes
the input, parses that canonical form into a deep clone, and recursively freezes
the clone. Trusted authorization and discovery cannot introduce a time-of-check
to time-of-use change: `invokeAdapter` receives only that authorized snapshot,
never the caller's mutable object reference.
Dispatch also copies and freezes all request metadata before the first await:
workflow/route/task identifiers, Parcel claims and allowed tasks, authorization
reference, and reviewer identity. Every later policy, adapter, receipt, and
review operation uses that full request snapshot. Resolver, discovery, and
invocation function references (plus receipt-root/time options) are captured at
the same boundary, preventing asynchronous replacement of dependencies or
receipt metadata.

Only `{ status: 'verified_available' }` from discovery permits invocation. All
other discovery values skip cleanly without provider execution. Accepted
adapter output is candidate-only, receives no tools/effects/authority, cannot
clear review/approval/gates, and is returned with independent review still
pending. Invocation/result objects and their empty no-tools arrays are frozen;
accepted evidence references are defensively copied and frozen before hashing,
receipt creation, and return. Candidate and skip evidence is normalized at
`docs/receipts/<workflowId>/shadow-routing-<routeName>.json`; raw probe/provider
details and raw candidate text are not written to the receipt.
