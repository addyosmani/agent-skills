# Advanced per-agent configuration

Skills in this repository are intentionally portable. Every `SKILL.md` keeps its frontmatter limited to the fields the [Agent Skills specification](https://agentskills.io) defines, so the same file works across Claude Code, Cursor, Gemini CLI, Antigravity, and any other spec-conformant client.

Several agents also support extra runtime controls: model routing, tool restrictions, turn limits, execution isolation. These controls are valuable, but they are vendor-specific and do not belong in the shared, portable frontmatter. This document explains which controls each agent supports, where they belong, and how to apply them as an opt-in without breaking portability.

This is the canonical reference for per-agent configuration, and it supersedes the earlier approach of adding vendor fields to top-level `SKILL.md` frontmatter. Fields such as `kind`, `model`, `temperature`, `max_turns`, `tools`, and `context` must not appear at the top level of a skill. They belong under `metadata` or in a separate per-agent adapter file, as described below.

## Principles

1. **Keep `SKILL.md` portable.** The Agent Skills specification reserves top-level frontmatter for `name`, `description`, `license`, `compatibility`, `metadata`, and the experimental `allowed-tools`. Vendor or client-specific properties belong under `metadata`, not at the top level.
2. **Unknown top-level fields are not guaranteed to be ignored.** Many parsers only read `name` and `description` and silently drop the rest, but a strict spec-conformant validator or client may flag or reject unrecognized top-level keys. Putting vendor fields under `metadata` keeps the file conformant everywhere.
3. **Opt-in, not global.** Runtime controls should be something a user adds for their own agent and workflow, not a default baked into every skill in the repository.
4. **Prefer generation over hand-editing.** Where a configuration is repetitive and mechanical, generate it from a single source of truth instead of maintaining copies by hand. See [Automating with scripts](#automating-with-scripts).

## Where vendor fields belong

| Field type | Example | Correct home |
|---|---|---|
| Spec fields | `name`, `description`, `license`, `compatibility` | Top-level frontmatter in `SKILL.md` |
| Vendor metadata | model hints, routing tags | Under the `metadata` key in `SKILL.md` |
| Runtime orchestration | subagent definitions, turn limits, tool allowlists | A separate per-agent adapter file (see each agent below) |

## Claude Code

Claude Code reads `name` and `description` for discovery. Custom commands and skills share the same frontmatter, so the `context` and `allowed-tools` fields below work in both `.claude/commands/*.md` and `.claude/skills/*/SKILL.md`.

- **`context: fork`** runs a command or skill in an isolated subagent context instead of the active conversation. This gives context isolation, repeatable execution from a clean state, execution tokens spent in the fork rather than the main session, and a cleaner handoff where only the result surfaces back. An optional **`agent`** field selects which subagent type runs the fork (for example `agent: Plan`); it defaults to `general-purpose`.
- **`allowed-tools`** pre-approves tools; it does not restrict them. Listed tools run without a permission prompt for the turn that invokes the command or skill, and the grant clears on your next message. Nothing is removed from the tool pool.
- **`disallowed-tools`** is the field that actually restricts: it removes the listed tools from the available pool while the skill is active, which is what least-privilege needs for passive stages such as review or audit. The restriction also clears on your next message. Note it is a Claude Code field and not one of the specification's six, so it belongs in a local copy or an adapter file; in a published `SKILL.md` it fails packaging with an unexpected-key error.

These are Claude Code conventions. Keep the shared, published `SKILL.md` limited to spec fields; apply these runtime controls in your own local command or skill copies instead.

## Gemini CLI and Antigravity

Gemini CLI and Antigravity discover skills the same way: they match `name` and `description`, then load the full skill on demand. Runtime orchestration lives in a separate resource, not in the skill frontmatter.

- **Subagent definitions** live in `.gemini/agents/*.md`, which are distinct from skills. Their schema is `kind` (`local` or `remote`), `model`, `temperature`, `max_turns`, and `tools`. Note that this is a subagent schema, not a skill schema: the two should not be merged into one `SKILL.md`.
- **Model routing** can send lighter tasks (formatting, documentation, git operations) to a faster model and reserve a stronger model for cognitively demanding work (debugging, security auditing, interface design).
- **Tool restrictions** enforce least-privilege per subagent, which also trims unused tool schemas from the prompt.
- **Turn limits** (`max_turns`) cap execution to avoid runaway correction loops.

### Model guidance

Google recommends omitting `temperature` for Gemini 3.x models and using `thinking_level` instead. Do not hardcode `temperature` on skills or subagents routed to 3.x models; prefer `thinking_level` and revisit this guidance as the models evolve.

```yaml
# .gemini/agents/security-auditor.md
---
kind: local
model: gemini-3-pro
thinking_level: high   # not: temperature: 0.1
tools: [read_file, grep]
max_turns: 10
---
```

## Automating with scripts

Maintaining per-agent metadata by hand across every skill is repetitive, drifts out of sync, and is easy to get wrong. A better approach is to keep a single source of truth and generate the agent-specific output:

- A generator reads a per-skill configuration map (which model, tool allowlist, turn limit, and isolation each skill should use for a given agent).
- For metadata-style fields, it injects them under the `metadata` key of each `SKILL.md`, keeping the file spec-conformant.
- For orchestration-style fields, it emits the separate adapter files an agent expects, for example `.gemini/agents/*.md` subagent definitions, leaving `SKILL.md` untouched.

Generation also lets the tooling validate **semantics, not just shape**: confirm that a model name is a known model, that a tool name is a real tool, that `max_turns` is a positive integer, and that `temperature` (where still applicable) is a valid number in range. Shape-only checks let invalid values such as `parseInt("1.5")` or `parseFloat("0.2oops")` slip through.

## Status

This document consolidates the discussion from [#272](https://github.com/addyosmani/agent-skills/pull/272), [#36](https://github.com/addyosmani/agent-skills/pull/36), and [#35](https://github.com/addyosmani/agent-skills/issues/35), all closed in favor of this approach. It is the single reference for per-agent configuration: it keeps the shared skills portable while documenting the advanced controls each agent offers as an opt-in. The script-based automation described above is a proposal pending agreement before any implementation.
