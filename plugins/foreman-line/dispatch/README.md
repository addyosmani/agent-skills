# @foreman-line/dispatch

The dispatch package for the Foreman Line W2 workflow. Provides the sub-modules needed to select,
evaluate, and dispatch a candidate parcel to a builder agent.

## Package purpose

This package is the home for all W2 parcels' sub-modules. Starting with W2-P1 (Jira query +
ranking), subsequent W2 parcels add sub-modules here:

| Sub-module | Parcel | Status |
|---|---|---|
| `src/query/` | W2-P1 | Active |
| `src/routing-eval/` | W2-P3 | Pending |
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
