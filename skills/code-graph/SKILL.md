---
name: code-graph
description: Use to build or query a code knowledge graph before answering architecture, onboarding, or large-refactor questions. Auto-triggers when the operator asks about repo structure, dependencies, module relationships, or wants to understand a codebase quickly. Backed by codebase-memory-mcp. Three modes — scan, watch, query.
---

# Code Graph

## Overview

**Re-reading the repo every time is the most expensive way to answer architecture questions.** When the operator asks "what does this repo do", "where is X called", "what depends on Y", or "explain this codebase", the cheapest correct answer comes from a persisted graph of the codebase — not from another round of `Glob` + `Grep` + `Read`.

This skill governs the use of `codebase-memory-mcp`, the MCP server that builds and serves the graph. The cached engine state (written by `tools/setup-code-graph.sh`) is the single source of truth for availability.

The skill does NOT install anything. Installation is operator-side via `tools/setup-code-graph.sh`. If the engine is missing, this skill instructs re-bootstrap and stops.

**Hard constraint**: this skill never causes an edit to `.claude/settings*.json`. The upstream `graphify claude install` command would do that and is therefore forbidden — see Red Flags. (graphify itself was deprecated in v4.0 — ADR-0013.)

## When to Use

Auto-trigger on any of:

- Operator asks an architecture question: "explain this repo", "what depends on X", "where is Y called", "find god-modules", "find circular dependencies", "are there cycles", "what's the module map".
- Operator starts onboarding into an unfamiliar codebase (> 5k LOC).
- Operator initiates a large refactor that crosses modules.
- A subagent in the audit chain (`code-reviewer`, `security-auditor`) requests a call-graph snapshot to evaluate a diff.

Do NOT use for:

- Trivial single-file edits.
- Questions about code the operator has just pasted into the conversation.
- Repos < 1k LOC where re-reading is faster than indexing.

The three user-facing modes:

| Mode | Operator intent | What runs |
|---|---|---|
| `--scan` | First time in this repo, or index missing/stale | MCP tool `index_repository` → `~/.cache/codebase-memory-mcp/` |
| `--watch` | Long refactor session, keep index fresh | `codebase-memory-mcp config set auto_index true` (built-in watcher) |
| `--query` | Index is fresh, just need an answer | call MCP tools `search_graph`, `query_graph`, `trace_call_path`, `get_architecture`, `get_code_snippet` |

## Process

### Step 0 — Engine selection (ALWAYS FIRST)

Read the cached state with `tools/check-code-graph-engines.sh`:

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/check-code-graph-engines.sh --field best
```

The output is one of `codebase-memory` or `none`.

- If `none`: instruct the operator to run `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh` and STOP. Do not attempt analysis blind.
- If `codebase-memory`: proceed.

State that you are using codebase-memory-mcp in one short sentence to the operator before proceeding.

### Step 1 — Detect freshness

Call MCP tool `index_status` for the current project. If the project is not indexed, or `last_indexed_at` is older than the latest commit on the active branch → recommend `--scan`.

If the operator says "go anyway with the stale graph", proceed with a caveat in the answer ("graph is N hours old; recent commits not yet reflected").

### Step 2 — Run

Invoke the chosen mode. For `--watch`, confirm `auto_index` was enabled and tell the operator how to disable it (`codebase-memory-mcp config set auto_index false`). For `--scan` and `--query`, wait for completion and verify by calling `index_status` afterwards.

### Step 3 — Read, don't dump

Synthesize the answer for the operator. Always include:

1. The engine used: `[via codebase-memory-mcp]`.
2. Top findings (god-nodes, modules, cycles, hot paths) — at most 5 bullets.
3. Source pointers (file:line or graph node IDs) so the operator can click through.

Do NOT paste raw MCP tool output. Context is finite.

### Step 4 — Cite the graph

Every architectural claim made in the rest of the session must reference either:

- A node in the graph (with the node ID or the `file:line`), or
- A direct quote from a `query_graph` / `get_architecture` response with the source tool named (e.g. `trace_call_path depth=4`).

If a claim cannot be cited from the graph, fall back to reading the file directly — and note that in the answer ("graph did not cover this; read directly from `<path>:<line>`").

## Anti-Rationalizations

| Excuse | Reality |
|---|---|
| "codebase-memory-mcp failed, no graph possible" | Re-bootstrap. The skill never falls back to a second engine and never improvises from `Grep` for relationship questions. |
| "The graph is stale but the answer is the same" | False by construction if there were commits. Re-scan or warn the operator. |
| "I'll just `Glob` + `Grep` + `Read`, it's faster" | Only true under ~1k LOC. Above that, the graph wins both on tokens and on completeness. |
| "I'll run `graphify claude install` once, then the graph is automatic" | Forbidden. That command writes to `.claude/settings.json` and the v2.7 kill-switch will block it. graphify itself is no longer supported by this plugin (ADR-0013). |
| "The engine looks broken; let me write my own AST scanner" | No. Re-bootstrap. We do not maintain a second engine. |

## Red Flags

- Running `graphify claude install` (kill-switch violation; the prohibition is preserved because the upstream command still exists as a footgun).
- Editing `.claude/settings.json` to register a hook for any code-graph engine.
- Skipping Step 0 and assuming the engine is available.
- Pasting raw MCP tool output into the chat.
- Committing `~/.cache/codebase-memory-mcp/` (or any `CBM_CACHE_DIR` override pointing inside the repo) to git.
- Answering an architecture question without running Step 0 because "I already know this codebase".

## Verification

For codebase-memory-mcp runs:

- `claude mcp list | grep -q '^codebase-memory'` (registered).
- An MCP `index_status` call returns a non-empty payload for the current project.
- A test query against `search_graph` with a known symbol returns at least one match.
- The answer to the operator names the engine in brackets (`[via codebase-memory-mcp]`).
- Every architectural claim cites a node ID or `file:line`.

If any check fails, do not deliver the answer. Re-run the relevant step or escalate to the operator.
