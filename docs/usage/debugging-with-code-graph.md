# Debugging with codebase-memory-mcp

Practical recipe for using the code-graph engine to debug fast. Instead of grepping for a function name and reading every match to figure out which are actual callers, ask the graph: relationship queries beat text search. This guide maps common debug questions to the MCP tools that answer them.

For the engine setup and scan/watch workflow, see [`docs/usage/code-graph.md`](code-graph.md). For the architectural rationale, see [ADR-0007](../adr/0007-code-graph-dual-engine.md) and [ADR-0008](../adr/0008-audit-chain-code-graph-integration.md).

## Quick start

```bash
# Install once per machine (idempotent)
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh

# Verify the engine is healthy
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/check-code-graph-engines.sh
# Expected: codebase-memory=OK, best=codebase-memory
```

The engine registers as an MCP server and exposes its tools to Claude Code automatically. No per-repo setup required — open the repo, ask an architecture question, and the skill auto-triggers a `--scan` on first use.

## Debug scenario → MCP tool

| Debug question | MCP tool | What you get |
|---|---|---|
| "What calls this failing function?" | `trace_call_path` (upstream) | Full chain of callers up to entry points (HTTP routes, CLI handlers, cron jobs). No false positives from comments or docstrings. |
| "What does this function call?" | `trace_call_path` (downstream) | Transitive closure of callees — what breaks if I change this function. |
| "Where is symbol X defined?" | `search_graph` / `search_code` | Single canonical definition, no grep noise. |
| "What's the high-level architecture?" | `get_architecture` | Module map: what depends on what, public surface, layering. |
| "Which modules are god-modules?" | `get_architecture` + `query_graph` | Modules with too many incoming dependencies — refactor candidates. |
| "Show me the source of node N" | `get_code_snippet` | Read the code without leaving the graph context. |
| "Is the index fresh?" | `index_status` | Last scan time + commit; trust signal before relying on results. |
| "Re-index after big changes" | `index_repository` | Triggers a fresh scan. Run after merges, large refactors, or branch switches. |

## Typical debug flow

1. **Verify the index is fresh.** Run `index_status`. If the cached graph is older than the last commit on the branch, run `index_repository` first — stale graph = wrong answers.
2. **Get the lay of the land.** Call `get_architecture` for the module map before drilling into specifics. Knowing where the buggy function sits in the dependency hierarchy frames the rest of the investigation.
3. **Trace the call chain.** Use `trace_call_path` upstream from the failing function. The chain reveals what code path was actually exercised — often the bug is two frames up, not in the function that crashed.
4. **Find similar patterns.** Use `search_graph` for the symbol or pattern across the repo. If the bug is a missing null check on a config field, the graph surfaces every other call site that does or does not handle it.
5. **Act.** Edit, test, re-index when done.

## When NOT to use the graph

| Situation | Why grep wins |
|---|---|
| Repo under ~1k LOC | Index overhead exceeds query time. `Grep`/`Glob` are fast enough. |
| Code freshly pasted into the conversation | Not in the index yet — read it directly. |
| Single-file mechanical edit (rename, format, string change) | No relationships involved. |
| Debugging the conversation transcript itself | Out of scope for any code graph. |
| Generated artifacts (build outputs, lockfiles) | Not source code; the graph excludes them by design. |

## Common pitfalls

| Symptom | Diagnosis | Fix |
|---|---|---|
| Empty results for a known function | Index missed the file (new path, ignored extension) | `index_repository` to re-scan |
| Trace returns shorter chain than expected | Index is stale | `index_status`, then `index_repository` if old |
| Two definitions returned for one symbol | Real polymorphism / overload — or a copy-paste bug worth investigating | Read both with `get_code_snippet` |
| MCP tools not visible to Claude | Engine not registered as MCP server | Re-run `setup-code-graph.sh` |

## Boundaries

- **Read-only.** The graph engine never modifies source. Editing happens via the standard `Edit`/`Write` tools after the graph informs the change.
- **Local.** No code or symbol leaves the machine. Safe for NDA work.
- **Scoped to source.** Comments, docstrings, and READMEs are not first-class nodes — for those, use `Grep` or `Read` directly.
- **Cite the engine.** When an answer rests on graph data, label it: `[via codebase-memory-mcp]` plus the tool used (e.g., `trace_call_path depth=4`). The audit chain enforces this.
