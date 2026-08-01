---
ticket: KONE-TBD
title: Foreman Line - W2-P1 Jira query + next-candidate ranking
status: active
owner: clinton.morgan
created: 2026-07-23
updated: 2026-07-23
supersedes: null
superseded_by: null
# --- schema v0.2 fields ---
risk: standard
surfaces: [plugins/foreman-line/dispatch/]
routing_class: standard-feature
permission_profile: builder-standard
---

# W2-P1 — Jira Query + Next-Candidate Ranking

## Intent

Create the `plugins/foreman-line/dispatch/` package (the home for all W2 parcels' sub-modules), and implement the first sub-module: the Jira query + next-candidate ranking engine. This module queries KONE for issues assigned to `clinton.morgan` in a dispatchable state (To Do / In Progress), cross-references the in-repo receipt chain to resolve each candidate's `workflowId` and prior-stage receipt locator, ranks by Jira priority + issue key (stable tiebreaker), and returns a `RankedCandidateList`. It is the entry point of the W2 dispatch flow: W2-P2 (the integrating CLI) calls this to select a candidate before calling P3 (routing eval), P5 (skill injection), and P4 (Kompress).

This parcel is **read-only**. No Jira writes at any point. The query runs against the production KONE project (not a sandbox) because it only reads — there is no write gate needed for reads. The mechanical read-only constraint is enforced by the transport: the dispatch package exposes NO `createJiraIssue`, NO `editJiraIssue`, NO `addCommentToJiraIssue` path. An attempt to call any mutating tool through this package is a loop-stop.

## Constraints

- **Package scaffold (PAR-4 ruling):** This parcel creates the `plugins/foreman-line/dispatch/` package from scratch. It does not exist on disk. Structure must follow the W1 package pattern: `package.json` (private, ESM, `engines.node >= 24.11.1`), `tsconfig.json` (extends `../../tsconfig.json` if a root tsconfig exists, else self-contained), `src/index.ts` (re-exports from sub-modules), `src/query/index.ts` (the query sub-module). Subsequent W2 parcels add sub-modules (`routing-eval/`, `skill-resolver/`, `kompress-adapter/`, `approval-cli/`) to this package.
- **Transport (lesson #20/W1-P4 precedent):** Atlassian remote MCP via `@modelcontextprotocol/sdk` stdio client connected to `docker mcp gateway run --servers atlassian-remote`. The one-shot `docker mcp tools call key=value` path is STRING-ONLY (v0.43.1 confirmed) and cannot carry the typed arguments needed; this package goes directly to the SDK path (the ratified W1-P4 contingency, lesson #20). No `docker mcp tools call` invocation anywhere.
- **CloudId discovery (adapter pattern from W1-P4):** `cloudId` is discovered once lazily via the argument-less `getAccessibleAtlassianResources` tool, selecting the entry whose `url` is `https://kaseya.atlassian.net`. Never hardcoded. Discovery throws (naming the missing site) if the site is absent.
- **JQL read-only guard:** The JQL query uses only `searchJiraIssuesUsingJql`. The exported `createDockerMcpAdapter` equivalent for this package does NOT include `createIssue`, `updateIssue`, `addRemoteLink`, or any mutating tool. An attempt to call a mutating tool returns an error; the module does not expose a path to reach one.
- **WorkflowId + prior-receipt-locator resolution (PAR-5 ruling):** After the Jira search returns candidate issue keys, the module scans `docs/receipts/` in the repo root for Stage-B receipt files matching the pattern `docs/receipts/<uuid>/000001-B-registration-result.json`. For each, it reads the `subject.ticketKeys` array. A candidate whose ticket key appears in `ticketKeys` is resolved: `workflowId` = the UUID directory name, `priorReceiptLocator` = the path of the receipt file with the highest sequence number in that directory (the most-recent prior stage, Stage-B for a just-registered parcel). This resolution is filesystem-only (no Jira reads for this step). Candidates with no matching receipt in-repo are returned with `workflowId: null` and `priorReceiptLocator: null` (valid but undispatchable by W2-P2 until registered).
- **JQL injection guard:** Any token interpolated into a JQL string must pass `assertJqlSafeToken` (imported from `plugins/foreman-line/registration/src/jql.js`) before use. The assignee email `clinton.morgan@kaseya.com` contains `@` — it must be passed as a JQL quoted string literal, not a raw token, and the `@` must not flow through `assertJqlSafeToken`. The JQL template is a fixed string literal with no user-controlled interpolation; any configurable field (e.g., project key) passes `assertJqlSafeToken` before use.
- **Linear-time string operations (lesson #19):** Any string-processing path over untrusted Jira issue data (title, description, label values) must use linear-time char-code loops, not regex with backtracking. `assertJqlSafeToken` is already linear-time.
- **Branch/worktree (lesson #9):** builder works on branch `w2-p1-jira-query-ranking` in worktree `C:\Repos\foreman-line-w2-p1`.
- **Deterministic-pass environment (lessons #10, #11):** `node -v` first; PowerShell only; `$LASTEXITCODE` only after full-capture (never through a truncating pipeline).
- **Dependency allowlist:** `{ajv, @modelcontextprotocol/sdk}` — same as `registration`. The `dispatch` package needs MCP SDK for the transport and ajv for schema validation of the `RankedCandidateList` output.
- **No bare specifier for cross-package imports:** Imports from `registration/src/jql.js` (for `assertJqlSafeToken`) use a filesystem-relative ESM specifier (`../../registration/src/jql.js`). No npm workspace linking exists for `plugins/foreman-line/*` packages. Adding workspace linking to root `package.json` is a Stop-and-Report.
- Integration is PR-only; spec moves to `done/` in the merge PR.

## Acceptance Criteria

1. `plugins/foreman-line/dispatch/` package exists with correct W1-pattern structure: `package.json` (name `@foreman-line/dispatch`, private, ESM, `engines.node >= 24.11.1`, `dependencies: {ajv, @modelcontextprotocol/sdk}`), `tsconfig.json`, `src/index.ts` (re-exports `queryAndRankCandidates`, `CandidateRecord`, `RankedCandidateList`), `src/query/index.ts`.
2. `npx tsc --noEmit` passes in `plugins/foreman-line/dispatch/`.
3. `queryAndRankCandidates(options)` accepts an injectable `McpClientFactory` (same pattern as W1-P4's `createDockerMcpAdapter`) so tests can drive a stub without a live gateway. The live adapter uses `@modelcontextprotocol/sdk` stdio to `docker mcp gateway run --servers atlassian-remote`; it calls `searchJiraIssuesUsingJql` with JQL `project = KONE AND assignee = "clinton.morgan@kaseya.com" AND status in ("To Do", "In Progress") ORDER BY priority ASC, key ASC`.
4. Each returned `CandidateRecord` carries: `ticketKey: string`, `summary: string`, `priority: string`, `status: string`, `workflowId: string | null`, `priorReceiptLocator: string | null`. Candidates with a resolved `workflowId` are listed first (prioritized for dispatch); within each group, order is Jira priority rank + ticket key.
5. WorkflowId + priorReceiptLocator resolution is covered by unit tests: a fixture that creates a temp `docs/receipts/<uuid>/000001-B-registration-result.json` (with `subject.ticketKeys: ['KONE-TEST-1']`) and verifies that `queryAndRankCandidates` resolves `workflowId` and `priorReceiptLocator` correctly for `KONE-TEST-1`. Also covers the unresolved case (candidate with no matching receipt returns `workflowId: null, priorReceiptLocator: null`).
6. Read-only enforcement: no `createJiraIssue`, `editJiraIssue`, or `addCommentToJiraIssue` path exists anywhere in `dispatch/src/`. A grep for these tool names in `dispatch/src/` returns zero matches.
7. JQL injection guard: `assertJqlSafeToken` (imported from `../../registration/src/jql.js`) is called on every configurable token interpolated into JQL strings. The assignee email is a fixed string literal in the JQL template (not interpolated through `assertJqlSafeToken`, which would reject `@`).
8. Linear-time string processing confirmed: any scan over untrusted Jira text uses char-code loops (same discipline as lesson #19). Grep for `/[^a-z\s]/i` style regex over untrusted input paths yields zero matches in `dispatch/src/`.
9. Dependency-allowlist test in `dispatch/tests/dependency-allowlist.test.ts` asserts `Object.keys(dependencies)` equals `['ajv', '@modelcontextprotocol/sdk']` (or the actual set — must be confirmed on disk).
10. `biome check .` passes with zero diagnostics in `dispatch/`.
11. All tests pass via `npx tsx --test tests/*.test.ts` in `dispatch/`. Test count is non-trivially covered: at minimum, the four adapter unit-test cases (successful search with one candidate resolved + one unresolved; empty result; search tool error; cloudId discovery failure) and the two JQL safety cases (safe token passes; unsafe token throws).
12. `dispatch/README.md` describes the package purpose, the sub-module layout (current: `src/query/`; to be extended by W2-P3/P5/P4/P2), and the transport constraint (SDK path only, no `docker mcp tools call`).

## Out of Scope

- Routing evaluation (W2-P3), skill injection (W2-P5), Kompress integration (W2-P4), or the integrating CLI (W2-P2) — those are subsequent parcels that add sub-modules to the `dispatch/` package this parcel scaffolds.
- Any Jira write — reads only. A write attempt anywhere in the dispatch package is a stop condition.
- Filtering or parsing the candidate spec file content — W2-P1 returns `ticketKey` and metadata; the spec file path is resolved by W2-P2 from the `active/` directory by ticket key.
- Priority resolution beyond the Jira `priority.name` field value — ranking uses the Jira priority as-is; normalization or numeric mapping is W2-P2's concern if needed.
- Adding npm workspace linking to the root `package.json` — Stop-and-Report if a builder concludes it is needed.

## Context & References

- `plugins/foreman-line/registration/src/adapter-docker-mcp.ts` — the proven W1-P4 transport adapter; W2-P1's adapter follows the same McpClientFactory injection pattern, cloudId discovery pattern, and SDK transport. Read this file before writing the adapter.
- `plugins/foreman-line/registration/src/jql.ts` — `assertJqlSafeToken`; import via relative ESM specifier.
- `plugins/foreman-line/registration/package.json` — reference package structure for `dispatch/package.json`.
- `docs/receipts/bfdba601-8d48-449e-9530-2317ed931d6d/` — live example of the receipt directory layout this parcel scans. `000001-B-registration-result.json` has `subject.ticketKeys: ["KONE-23194", "KONE-23195"]` — SCAF-P2's Story is KONE-23195.
- `plugins/foreman-line/receipts/src/paths.ts` — `receiptPath()` function; use its path convention to construct the Stage-B locator path when scanning.
- `plugins/foreman-line/contracts/src/stages/c-dispatch.ts` — frozen `DispatchOrder` interface; W2-P1 does not emit this, but it informs what `CandidateRecord` must carry for W2-P2.
- `plugins/foreman-line/docs/goals/w2-dispatch/charter.md` — D1–D9 as amended, especially D5 amendment (Kompress data goes in receipt, not DispatchOrder) and PAR-5 ruling (W2-P1 must include workflowId + priorReceiptLocator in candidate records).
- `docs/transcripts/defects_lessons.md` #9 (branch/worktree line in kickstarter), #10 (PowerShell + `node -v`), #11 (no truncating pipelines), #19 (linear-time string ops), #20 (probe full argument types before building adapter), #21 (live probe in its own stage, fixture-isolated).

## Verification Plan

Deterministic: `tsc --noEmit` in `dispatch/` (AC2); dependency-allowlist test asserting `{ajv, @modelcontextprotocol/sdk}` (AC9); read-only grep confirming no mutating tool names in `dispatch/src/` (AC6); `biome check .` (AC10); full `npx tsx --test` (AC11). Runs in PowerShell; `node -v` first; full-capture before `$LASTEXITCODE`.

Adversarial review mandated focus questions:
1. **Transport ceiling:** confirm the adapter calls `searchJiraIssuesUsingJql` with the full argument shape it will receive in production — particularly, confirm `cloudId` is passed as a native string object (not a `key=value` string) and that the JQL string is an object-valued argument. Attempt to exercise the adapter with the stub and verify arg-JSON fidelity.
2. **Read-only enforcement:** grep `dispatch/src/` for `createJiraIssue`, `editJiraIssue`, `addCommentToJiraIssue`, `updateIssue` — zero matches required. Confirm no side door exists through the MCP client factory.
3. **WorkflowId resolution correctness:** confirm the filesystem scan uses the correct Stage-B receipt path pattern and correctly handles the "multiple receipts in directory" case (always picks the highest-sequence file, not the first one found). Perturb the fixture (add a `000002-C-dispatch-order.json` to the temp receipt dir) and confirm `priorReceiptLocator` updates accordingly.
4. **JQL injection:** confirm `assertJqlSafeToken` is called on every interpolated token. The assignee email `clinton.morgan@kaseya.com` contains `@` — confirm it is a fixed literal in the JQL template string, not passed through `assertJqlSafeToken` (which would reject it).
5. **Package structure fidelity:** confirm `dispatch/package.json` uses `"type": "module"` and `"exports": {".": "./src/index.ts"}` consistent with the W1 package pattern, and that `src/index.ts` re-exports all public surface of the query sub-module.

## Epic/Story Projection (proposal only — Jira registration is Stage B)

- **Epic:** Foreman Line - W2 Dispatch
  - **Story:** W2-P1 - Jira query + next-candidate ranking
    - **Task:** Create `dispatch/` package scaffold (package.json, tsconfig.json, src/index.ts) — AC1
    - **Task:** Implement `src/query/` sub-module with JQL search, cloudId discovery, read-only enforcement — AC3, AC6, AC7
    - **Task:** Implement workflowId + priorReceiptLocator resolution via receipt-dir scan — AC4, AC5
    - **Task:** Tests + dependency-allowlist test + biome check — AC9, AC10, AC11
    - **Task:** `dispatch/README.md` — AC12
