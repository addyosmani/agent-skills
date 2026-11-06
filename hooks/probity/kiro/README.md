# Kiro CLI enforcement assets

Run this framework under **Kiro CLI** with the same Probity guardrail the
Claude Code integration gets. Probity has no native Kiro vendor, so these
files translate between Kiro's hook contract and Probity's `claude-code`
contract.

| File | Role |
|------|------|
| `probity-kiro.sh` | preToolUse shim (event translation + deny→exit 2) |
| `probity-kiro-translate.py` | `event` / `reason` translation helpers, `install` check |
| `kiro-transcript-to-claude.py` | Kiro session JSONL → Anthropic JSONL (for history rules) |
| `skill-activation-forced-eval.sh` | userPromptSubmit skill-activation hook |
| `kiro-agent.template.json` | agent config template (skills + both hooks) |

The shim still asks Probity's default judge, on the Claude login. To judge
on kiro-cli as well, set `ai: judgeChain([kiroJudge(), claudeJudge()])` in
`probity.config.ts` (see `hooks/PROBITY.md`, "Choosing the AI judge"). The
judge runs a no-tool, no-hook agent, so it never triggers this shim.

In a worktree beside the main checkout (`git worktree add ../<name>`) with
no `node_modules` of its own, the shim runs the main worktree's Probity on
this worktree's config, which loads the main worktree's packages through
`NODE_PATH`. When Probity is installed nowhere, the shim blocks every call
with "Run npm ci in <tree>", except that install command. Up to 0.4.21 it
allowed every call in that case, so the rules were off without a trace.

From 0.4.23 the shim runs `probity-claude` (the bare `probity` bin when an
older install lacks it), so Kiro gets the same worktree handling as Claude
Code: a call is judged in the worktree it targets, including a shell write
into another worktree by path, and an edit that would break the config is
blocked before it lands.

**Setup:** see [`docs/kiro-setup.md`](../../../docs/kiro-setup.md).

These are copy-in artifacts (like the `probity.config.*.ts` presets): install
them into a project's `.kiro/`. This directory is the single source of truth —
fix Kiro-integration issues here, then re-copy.
