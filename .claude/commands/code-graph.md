---
description: Build or query the code knowledge graph using codebase-memory-mcp. Operator-invoked complement to the auto-trigger code-graph skill.
---

You will run a code-graph operation against codebase-memory-mcp. This is the manual counterpart to the `code-graph` skill — invoked by the operator via `/code-graph <args>` for explicit control.

`$ARGUMENTS` may contain (in any order, with sensible defaults):

- A path: `<path>` (default `.`)
- `--scan` (default action — index the path one-shot)
- `--watch` (daemon mode — sets `auto_index true`)
- `--query "<expr>"` (run a query against the active index — see Step 4 for tool dispatch)

If `$ARGUMENTS` is empty: equivalent to `--scan .`.

## Steps

1. **Verify engine** (Bash):

   ```bash
   bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/check-code-graph-engines.sh
   ```

   If exit code is 2 (state file missing) or 1 (engine `MISSING|BROKEN`): instruct the operator to run `bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh` and stop. Do not improvise.

2. **Confirm engine**:

   - Take `--field best` from `check-code-graph-engines.sh`. If the result is not `codebase-memory`, abort with: "Engine status not OK. Run setup-code-graph.sh first."
   - Echo the choice to the operator: `Using engine: codebase-memory-mcp`.

3. **Ensure ignore entries** (idempotent):

   - The cache lives at `~/.cache/codebase-memory-mcp/` (outside the repo) — no `.gitignore` change needed unless `CBM_CACHE_DIR` was overridden into the repo, in which case ignore that path.
   - If you find a legacy `graphify-out/` directory in the repo (pre-v4.0 artifact), ensure `graphify-out/` is in `.gitignore` and offer to delete the directory.

4. **Dispatch the action**:

   - **`--scan`** (default): invoke MCP tool `index_repository` with the path. Wait for completion, then call `index_status` to confirm.

   - **`--watch`**: run `codebase-memory-mcp config set auto_index true`. The watcher is internal to the server; no PID to manage. Tell the operator to disable with `codebase-memory-mcp config set auto_index false`.

   - **`--query "<expr>"`**: dispatch to the matching MCP tool based on intent:
     - "find symbol X" → `search_graph` or `search_code`
     - "what calls X" / "what does X call" → `trace_call_path`
     - "high-level architecture" → `get_architecture`
     - "show the code at <path:line>" → `get_code_snippet`
     - "list all projects indexed" → `list_projects`

5. **Confirm to the operator**: print a one-line summary including the path/result. Format:

   ```
   Done via codebase-memory-mcp. Output: <path-or-tool-call-result>.
   ```

## Constraints

- The slash command never edits `.claude/settings.json`. The kill-switch v2.7 in `hooks/delegation-guard.sh` would block it anyway, but the command should not even attempt it. If the operator's intent appears to require that, refuse and explain.
- Do NOT invoke `graphify claude install` under any circumstances. graphify was deprecated in v4.0 (ADR-0013); the prohibition is preserved because the upstream command still exists as a footgun. If the operator types something that maps to that command, refuse and point to `tools/setup-code-graph.sh`.
- Do NOT auto-install. Installation is the responsibility of `tools/setup-code-graph.sh`, run by the operator. If the engine is missing, instruct re-bootstrap, do not call the installer from here.
- For `--watch`, the operator owns lifecycle. Always emit the disable command in your confirmation.

## Why this is a slash command and not just a skill

The skill (`skills/code-graph/SKILL.md`) auto-triggers when Claude detects an architecture question. The slash command exists for two cases the skill does not cover well:

1. **Operator wants explicit control**. A one-shot scan that the operator wants triggered now (not on next architecture question), or enabling/disabling auto-indexing on demand.
2. **Imperative invocation in shell-like flow**. `/code-graph --watch ./src` is a clearer affordance than relying on description-matching.

Both paths converge on the same engine state and the same kill-switch discipline.
