# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Copilot, Antigravity, etc.) when working with code in this repository.

## Purpose

A collection of skills for Claude.ai and Claude Code for senior software engineers. Skills are packaged instructions and scripts that extend Claude and your coding agents capabilities.

This repository serves as the canonical "agent skills" knowledge base for the CP7 ecosystem, documenting reusable skill definitions, agent configurations, and reference materials.

## Key Facts

- **Stack**: Markdown, YAML (skill definitions)
- **Deploy Method**: None. This is a documentation repository / skill library with no runtime or deployment pipeline.
- **Directory Structure**:
  - `skills/` — Skill definitions (each skill has its own directory with `SKILL.md`)
  - `agents/` — Agent configuration files (`code-reviewer.md`, `security-auditor.md`, `test-engineer.md`)
  - `references/` — Reference checklists and patterns (`accessibility-checklist.md`, `performance-checklist.md`, `security-checklist.md`, `testing-patterns.md`)
  - `docs/` — Project documentation and ADR template
  - `hooks/` — Git hooks

## Architecture

### Directory Layout

```
agent-skills/
  skills/
    {skill-name}/           # kebab-case directory name
      SKILL.md              # Required: skill definition
      scripts/              # Optional: executable scripts
        {script-name}.sh    # Bash scripts (preferred)
      {skill-name}.zip      # Required: packaged for distribution
  agents/
    code-reviewer.md        # Code reviewer agent config
    security-auditor.md     # Security auditor agent config
    test-engineer.md        # Test engineer agent config
  references/
    accessibility-checklist.md
    performance-checklist.md
    security-checklist.md
    testing-patterns.md
  docs/
    decisions/              # ADRs directory
      ADR-template.md
      README.md
  hooks/                    # Git hooks
```

### How Skills Work

Skills are loaded on-demand — only the skill name and description are loaded at startup. The full `SKILL.md` loads into context only when the agent decides the skill is relevant.

- Each skill lives in `skills/{skill-name}/`
- Must contain a `SKILL.md` file with frontmatter (name, description)
- May contain a `scripts/` directory with executable bash scripts
- Must be packaged as `{skill-name}.zip` for distribution

### How to Add a New Skill

1. Create a new directory: `mkdir skills/{skill-name}`
2. Create `SKILL.md` following the template format with proper frontmatter
3. Add any scripts to `skills/{skill-name}/scripts/`
4. Package the skill: `cd skills && zip -r {skill-name}.zip {skill-name}/`

**Naming Conventions:**
- Skill directory: `kebab-case`
- `SKILL.md`: Always uppercase, always this exact filename
- Scripts: `kebab-case.sh`
- Zip file: Must match directory name exactly

## Agents and Crons

- **Claude Code** is the primary consumer via the `.claude-plugin/` system. On every session start, `hooks/session-start.sh` auto-injects the `using-agent-skills` meta-skill into context, and slash commands in `.claude/commands/` (spec, plan, build, test, review, code-simplify, ship) activate the corresponding skill workflows.
- **OpenCode** discovers and invokes skills through AGENTS.md and the `skill` tool, loading skill definitions on-demand when the task matches a skill's description.
- **Other agents** (Cursor, Gemini CLI, Windsurf, GitHub Copilot, Kiro) consume skills by copying `SKILL.md` files into their respective configuration directories or referencing the `skills/` path directly.
- **Skill loading is lazy**: only the `name` and `description` frontmatter are loaded at startup. The full `SKILL.md` content is pulled into context only when the agent determines the skill is relevant to the current task.
- **No automated packaging or distribution cron exists**. After modifying any skill, you must manually re-package it as a `.zip` (`cd skills && zip -r {skill-name}.zip {skill-name}/`) for distribution to agents.

## Gotchas

- **Directory name must match frontmatter exactly**. The `name` field in YAML frontmatter and the kebab-case directory name must be identical (e.g., `name: idea-refine` → `skills/idea-refine/`). Mismatches break skill discovery.
- **`SKILL.md` is case-sensitive**. The filename must be exactly `SKILL.md` in all caps. `skill.md`, `Skill.md`, or any variation will not be recognized by agents.
- **Description field has strict requirements**. Max 1024 characters, must state what the skill does in third person, and must include clear "Use when" trigger conditions. Do NOT put process steps in the description — agents may follow the summary instead of the full skill.
- **Scripts must be executable bash with `set -e`**. All scripts in `skills/{name}/scripts/` must start with `#!/bin/bash` and include `set -e`. Scripts are optional and should only be included when they provide real utility.
- **Keep SKILL.md focused; split only when necessary**. Supporting files should only be created when content exceeds 100 lines. Reference material belongs in `references/` at the project root, not inside skill directories.
- **Never duplicate content across skills**. Reference other skills by name (e.g., "Follow the `test-driven-development` skill for writing tests") rather than copying instructions. Cross-skill references keep the knowledge base maintainable and reduce token usage.
- **This is a documentation-only repository**. There is no runtime, no deployment pipeline, and no services to restart. Changes are purely content updates to markdown and scripts.

## Active Work

See HANDOFF.md.

## Decisions

See `docs/decisions/`. No ADRs exist yet.

<!-- CP7-AGENT-STANDARDS:START -->

## CP7 Agent Standard

Before behavior changes, read `/home/chris/cp7-bridge/docs/agent-standards/AGENT-OPERATING-STANDARD.md`, this project's README/HANDOFF, and `docs/decisions/`.

Create or update an ADR for changes to ports, bind addresses, tunnels, Docker Compose, volumes, healthchecks, systemd, timers, persistent data paths, MCP tools, auth, allowlists, writable roots, or unusual config.

Every change report must include what changed, why, verification, rollback, and touched files/services.

Verifier:

```bash
/home/chris/cp7-bridge/scripts/verify_agent_standards.sh
```

<!-- CP7-AGENT-STANDARDS:END -->
