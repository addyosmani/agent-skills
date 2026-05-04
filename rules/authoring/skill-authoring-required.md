---
title: Skill authoring required before SKILL.md creation
applies-to: ["markdown", "batuta-plugin"]
last-reviewed: 2026-05-04
enforcement: hook
hook: hooks/pre-write-skill-gate.sh
---

# Skill authoring required before SKILL.md creation

Skill sprawl is the failure mode this rule prevents. Without an enforced gate, any agent — including the main agent itself — can create overlapping or low-quality skills with one `Write` call. Discovery against the 91k+ skills catalog at skills.sh and the conventions enforcement of `batuta-skill-authoring` are the only mechanisms that keep the plugin's `skills/` directory coherent over time.

This rule is derived from the operator's global `~/.claude/CLAUDE.md` "Authoring gates" section and the project-level CLAUDE.md "Mandatory Skills" declaration. It counts as universally applied under §A.6 of the admission gate.

## Inviolable rules

1. Before any `Write` or `Edit` that creates a new `**/skills/**/SKILL.md` file in the `batuta-agent-skills` plugin repository, the agent (main or subagent) MUST first invoke the `batuta-skill-authoring` skill and complete its workflow end-to-end. The skill validates discovery against skills.sh, install bar, and Batuta naming/tone conventions.
2. Completion of `batuta-skill-authoring` MUST leave a marker file at `<plugin-root>/.claude/.authoring-marker-skill-<ISO-timestamp>` (UTC, RFC 3339 format). The marker is the proof-of-workflow consumed by the runtime hook `pre-write-skill-gate.sh`.
3. The marker is valid for 60 minutes from its timestamp. Any `Write` to `**/skills/**/SKILL.md` after the marker expires MUST re-invoke `batuta-skill-authoring`.
4. Editing an existing `SKILL.md` is NOT subject to this gate — only creation of a new `SKILL.md` (file does not yet exist on disk) requires the marker. The hook implements the file-existence check as the boundary.
5. The gate scope is repo-local: it applies only when `git remote get-url origin` matches the `batuta-agent-skills` plugin repository. Editing `SKILL.md` in any other project (e.g. a project-local skill at `<project>/.claude/skills/`) is NOT covered by this rule and the hook MUST allow it.

## Allowed patterns

```bash
# Operator authoring a new skill — proper sequence
$ claude
> /skill batuta-skill-authoring
# (workflow runs: discovery → writing-skills → conventions check)
# (marker file written: .claude/.authoring-marker-skill-2026-04-29T18:42:00Z)

> Now create skills/my-new-skill/SKILL.md with the validated content
# (Write proceeds; hook reads recent marker; marker is <60 min old; allowed)
```

```markdown
<!-- Editing an existing skill is unrestricted -->
<!-- File: skills/research-first-dev/SKILL.md (already exists) -->
# research-first-dev — minor tweak to Step 2 -- no marker required
```

## Anti-patterns

```bash
# Bad — violates rule 1 (skipping the authoring gate)
$ claude
> Create skills/quick-helper/SKILL.md with the content I gave you
# Hook blocks: "Invocá batuta-skill-authoring primero. Marker faltante o expirado."
```

```bash
# Bad — violates rule 2 (workflow not completed; marker absent)
$ claude
> /skill batuta-skill-authoring
# (operator interrupts the skill mid-workflow before Step 4 marker write)
> Create skills/my-skill/SKILL.md
# Hook blocks: marker file missing because workflow did not finish
```

```bash
# Bad — violates rule 3 (marker expired)
# Marker timestamp: 2026-04-29T15:00:00Z
# Current time:     2026-04-29T17:30:00Z (150 min elapsed)
> Create skills/my-skill/SKILL.md
# Hook blocks: marker exists but is older than 60 minutes
```

## Documented exceptions

- **`BATUTA_SKILL_AUTHORING_BYPASS=1`**: operator-side environment variable, set on the shell that launches Claude Code. Allowed for legitimate cosmetic edits during rebases or spelling fixes that should not require re-running discovery. The bypass logs a warning to `.claude/kb-debug.log` for audit. Cannot be set from inside an agent's tool call (that is the design — same pattern as `BATUTA_ALLOW_PR_MERGE`).
- **Subagent context**: when the hook fires inside a subagent (`agent_id` present in stdin JSON for `PreToolUse`), the gate STILL applies. There is no subagent bypass for skill authoring — a subagent that legitimately creates a SKILL.md (rare, almost never the right call) must still produce the marker via prior invocation of `batuta-skill-authoring`. Reasoning: subagents inherit the same coherence concern.
- **Vendored skills under `skills/_vendored/`**: imports from upstream sources (writing-skills, find-skills) are exempt — the file already passed gates in its origin repo and is being mirrored, not authored. The hook MUST NOT match `**/skills/_vendored/**` paths.
