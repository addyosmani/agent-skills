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

None.

## Gotchas

None.

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
