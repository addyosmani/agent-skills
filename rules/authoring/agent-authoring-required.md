---
title: Agent authoring required before agent file creation
applies-to: ["markdown", "batuta-plugin"]
last-reviewed: 2026-05-04
enforcement: hook
hook: hooks/pre-write-agent-gate.sh
---

# Agent authoring required before agent file creation

Agent overlap is the failure mode this rule prevents. Two agents with fuzzy boundaries both fire on the same trigger and produce inconsistent output. Without an enforced gate, the main agent itself can create overlapping agents with one `Write` call. Distinctness check against existing agents and tool minimality enforcement of `batuta-agent-authoring` (or, at runtime, `agent-architect` for project-local specialists) are the only mechanisms that keep agent triggers crisp.

This rule is derived from the operator's global `~/.claude/CLAUDE.md` "Authoring gates" section and the project-level CLAUDE.md "Mandatory Skills" declaration. It counts as universally applied under §A.6 of the admission gate.

## Inviolable rules

1. Before any `Write` or `Edit` that creates a new `**/agents/**.md` file in the `batuta-agent-skills` plugin repository OR a new `<project>/.claude/agents/**.md` file (project-local specialists), the agent (main or subagent) MUST first invoke the appropriate authoring gate: `batuta-agent-authoring` for plugin-shipped agents under `agents/`, or `agent-architect` for project-local specialists under `.claude/agents/`.
2. Completion of `batuta-agent-authoring` OR start-of-execution of `agent-architect` MUST leave a marker file at `<plugin-root>/.claude/.authoring-marker-agent-<ISO-timestamp>` (UTC, RFC 3339 format). The marker is the proof-of-workflow consumed by the runtime hook `pre-write-agent-gate.sh`.
3. The marker is valid for 60 minutes from its timestamp. Any `Write` to `**/agents/**.md` after the marker expires MUST re-invoke the appropriate gate.
4. Editing an existing agent file is NOT subject to this gate — only creation of a new agent file (path does not yet exist on disk) requires the marker. The hook implements the file-existence check as the boundary.
5. The gate scope is repo-local for plugin agents: it applies when `git remote get-url origin` matches the `batuta-agent-skills` plugin repository. For project-local agents under `<project>/.claude/agents/`, the gate applies in any repository — projects that do not adopt the gate must opt out explicitly via `BATUTA_AGENT_AUTHORING_BYPASS=1`.

## Allowed patterns

```bash
# Operator authoring a new plugin-shipped agent — proper sequence
$ claude
> /skill batuta-agent-authoring
# (workflow runs: scope check → skills.sh search → distinctness → conventions)
# (marker file written: .claude/.authoring-marker-agent-2026-04-29T18:42:00Z)

> Now create agents/my-new-specialist.md with the validated content
# (Write proceeds; hook reads recent marker; marker is <60 min old; allowed)
```

```bash
# Project-local specialist via agent-architect — proper sequence
$ claude
> /agent agent-architect "create a specialist for OAuth 2.0 PKCE flows"
# (agent-architect's Phase 1 Discovery runs)
# (Phase 5 Materialize creates marker AND writes the specialist)
# (Write proceeds; both happen in the same agent execution)
```

```markdown
<!-- Editing an existing agent is unrestricted -->
<!-- File: agents/code-reviewer.md (already exists) -->
# code-reviewer — minor tweak to the Step 0 wording -- no marker required
```

## Anti-patterns

```bash
# Bad — violates rule 1 (skipping the authoring gate)
$ claude
> Create agents/quick-helper.md with the content I gave you
# Hook blocks: "Invocá batuta-agent-authoring primero. Marker faltante o expirado."
```

```bash
# Bad — violates rule 1 (creating a project-local specialist without agent-architect)
$ claude
> Write to <project>/.claude/agents/oauth-helper.md
# Hook blocks even though the path is project-local; agent-architect must
# orchestrate to enforce the discovery-first contract before file creation.
```

```bash
# Bad — violates rule 2 (workflow not completed; marker absent)
$ claude
> /skill batuta-agent-authoring
# (operator interrupts the skill mid-workflow before the conventions step)
> Create agents/my-agent.md
# Hook blocks: marker file missing because workflow did not finish
```

```bash
# Bad — violates rule 3 (marker expired)
# Marker timestamp: 2026-04-29T15:00:00Z
# Current time:     2026-04-29T17:30:00Z (150 min elapsed)
> Create agents/my-agent.md
# Hook blocks: marker exists but is older than 60 minutes
```

## Documented exceptions

- **`BATUTA_AGENT_AUTHORING_BYPASS=1`**: operator-side environment variable, set on the shell that launches Claude Code. Allowed for legitimate cosmetic edits or test scaffolding that should not require re-running distinctness analysis. Logs a warning to `.claude/kb-debug.log` for audit. Cannot be set from inside an agent's tool call.
- **`agent-architect` runtime materialization**: when `agent-architect` runs as part of its Phase 5, it writes the marker AND the specialist file in the same execution. The hook does not need a separate prior invocation — `agent-architect`'s prompt itself instructs it to write the marker before the specialist file. This is the documented exception "agent-architect is the runtime authoring gate".
- **Subagent context other than agent-architect**: subagents that are NOT `agent-architect` and try to create an agent file are blocked. There is no general subagent bypass for agent authoring.
- **Project-local agents in non-Batuta repos**: a project that adopts the rule must explicitly import it via its CLAUDE.md `@.claude/rules/authoring/agent-authoring-required.md`. Projects that do not import it are outside the scope of this rule, and the hook MUST allow agent creation in those repos. The gate is opt-in for downstream projects.
