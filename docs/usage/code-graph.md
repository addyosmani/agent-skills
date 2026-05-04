# Code-graph: codebase-memory-mcp setup

The `code-graph` skill (shipped in v2.8, hardened in v2.9 + v3.1, integrated with the audit chain in v3.0, single-engine since v4.0) lets the agent consult a persisted graph of your codebase instead of doing rounds of `Glob` + `Grep` + `Read` over dozens of files. This guide covers what it does, how to install the engine, and how to apply it to old repos.

For the **why** and **architecture** history, see [ADR-0007](../adr/0007-code-graph-dual-engine.md), [ADR-0008](../adr/0008-audit-chain-code-graph-integration.md), and [ADR-0013](../adr/0013-v4.0-distillation.md). For a hands-on debug recipe mapping common questions to MCP tools, see [`debugging-with-code-graph.md`](debugging-with-code-graph.md).

## What it does

Single engine: **codebase-memory-mcp** ([github.com/DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)) — code-only, native Go MCP server, ~99% token reduction reported. Stable on Linux, macOS, and Windows. (Pre-v4.0 the plugin shipped graphify as a second engine; it was deprecated due to bus factor 1 and three blocking Windows issues — see ADR-0013.)

The skill auto-triggers on prompts about architecture, dependencies, blast radius, refactor scope, onboarding. Two auditors (`code-reviewer`, `security-auditor`) consult the graph in their **Step 0.5** for blast-radius / attack-surface enumeration on every diff. `test-engineer` is intentionally NOT consulting the graph (scope guard, see ADR-0008).

## Why there's NO per-repo retrofit

Unlike `batuta-project-hygiene` (which scaffolds `CLAUDE.md`, `docs/`, `.claude/rules/` files inside each repo), code-graph **does not insert any files into the consumer repo**. Its components live in 3 separate places:

| Layer | Where | Setup frequency |
|---|---|---|
| Skill, slash, rule | `~/.claude/plugins/cache/...` | Comes with `claude plugin install/update` |
| codebase-memory-mcp binary | `~/.local/bin/` and `~/.claude.json` | **1 time per machine** via `setup-code-graph.sh` |
| Per-repo graph cache | `~/.cache/codebase-memory-mcp/` | Auto-generated on first architecture question |

So for old repos: there's nothing to retrofit. **Run the bootstrap once, every old repo can use it.**

## Bootstrap (1 time per machine)

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh
```

This installs:

1. `codebase-memory-mcp` v0.6.0 binary, downloaded from the pinned GitHub Release, SHA-256 verified against the release's signed `checksums.txt`, and provenance-attested via `gh attestation verify` if `gh` CLI is authenticated (graceful-degrade otherwise).
2. MCP server registration via `claude mcp add --scope user --transport stdio codebase-memory -- <binary>`. Writes to `~/.claude.json` — outside the v2.7 kill-switch.

State persists at `~/.claude/code-graph-engines.json`. Re-running the script is idempotent.

## Verify the install

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/check-code-graph-engines.sh
# Expected: codebase-memory-mcp=OK, best=codebase-memory
```

## Use it in any repo (old or new)

After the bootstrap is done, **no per-repo setup is required**. Open Claude Code in the repo, ask an architecture question:

```
> explain the architecture of this repo
> where is process_payment called from?
> what depends on the auth service?
```

The skill auto-triggers, runs `--scan` if no graph exists, and answers citing `[via codebase-memory-mcp]`. The graph cache is generated once per repo (and incrementally updated on watch mode).

For explicit control:

```
> /code-graph                      # one-shot scan
> /code-graph --watch ./src        # auto_index true
> /code-graph --query "callers of process_payment"
```

## Optional: import the rule into a consumer repo

If you want the project's `CLAUDE.md` to formally adopt the code-graph contract (citing the engine in answers, not committing cache directories, etc.), import the rule:

```bash
cd /path/to/your-repo
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-rules.sh --rule integrations/code-graph-usage
```

This creates a symlink at `<your-repo>/.claude/rules/code-graph-usage.md` and instructs you to add `@.claude/rules/code-graph-usage.md` to the project's CLAUDE.md.

Or run `--all` to get every rule in one go (includes `code-graph-usage` plus the universal core rules):

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-rules.sh --all
```

`--all` does NOT chain into `setup-code-graph.sh` (changed in v4.0). The engine bootstrap is a separate operator-side step:

```bash
bash ~/.claude/plugins/marketplaces/batuta-agent-skills/tools/setup-code-graph.sh
```

## Common pitfalls

| Symptom | Diagnosis | Fix |
|---|---|---|
| Skill not auto-triggering | Plugin cache is stale (still on a pre-v2.8 version) | Run [`upgrading.md`](upgrading.md) — `claude plugin update batuta-agent-skills` + restart |
| `code-graph-engines.json` missing | Bootstrap never ran on this machine | Run `bash setup-code-graph.sh` once |
| Skill says engine BROKEN | Network failure during install OR Windows-specific install issue | Re-run bootstrap; if persistent, file an issue with the install log |
| Different model gives different answers | Graph is stale (commits after last scan) | Re-run `/code-graph --scan` or enable watch mode |
| Legacy `graphify-out/` showing in git status | Pre-v4.0 artifact left behind | Add `graphify-out/` to `.gitignore` and `rm -rf` it |

## Forbidden pattern (kill-switch v2.7)

**Never** run `graphify claude install`. graphify itself was deprecated in v4.0 (ADR-0013), but the upstream auto-installer still exists and modifies `.claude/settings*.json` to inject a PreToolUse hook — which is on the v2.7 kill-switch. The skill, slash, rule, and validator 07 all enforce this prohibition.
