# Using agent-skills with Pi

This guide explains how to use Agent Skills natively with the [pi coding agent](https://pi.dev). Pi implements the [Agent Skills standard](https://agentskills.io) natively  skills auto-discover from standard locations, and the agent loads them on demand when it detects a matching task.

## Overview

Pi discovers, loads, and activates skills without any plugins or configuration files:

- **Skill auto-discovery**  Skills in `~/.agents/skills/` or installed via `pi install` are automatically found and advertised to the agent
- **On-demand loading**  Only skill names and descriptions sit in context; full instructions load only when the agent activates a skill
- **AGENTS.md support**  Pi loads `AGENTS.md` (or `CLAUDE.md`) from the project root, parent directories, and global config
- **Package management**  Install via `pi install git:github.com/addyosmani/agent-skills` for automatic discovery
- **`/skill:name` commands**  Skills register as explicit slash commands for manual invocation

---

## Installation

### Option 1: Clone to Global Skills Directory (Recommended)

Clone the repository into pi's global skills directory  no further setup needed:

```bash
git clone https://github.com/addyosmani/agent-skills.git ~/.agents/skills/addyosmani-agent-skills
```

Pi scans `~/.agents/skills/` at startup and discovers all 24 skills automatically. The agent sees the skill names and descriptions in context and activates them on demand.

> **Already installed?** Verify with pi's startup log  available skills appear in the header after "Skills:".

### Option 2: Install as a Pi Package

Install via the built-in package manager:

```bash
pi install git:github.com/addyosmani/agent-skills
```

This clones the repository into `~/.pi/agent/git/github.com/addyosmani/agent-skills/`. Pi auto-discovers all 24 skills from the `skills/` convention directory on every startup.

**Project-local install** (per-project, shared with your team):

```bash
pi install -l git:github.com/addyosmani/agent-skills
```

This writes `.pi/settings.json` with the package reference so all team members who clone the project get the skills automatically.

### Option 3: Clone Anywhere, Reference in Settings

Clone the repo anywhere on disk and add the path to pi's settings:

```bash
git clone https://github.com/addyosmani/agent-skills.git /path/to/agent-skills
```

Add to `~/.pi/agent/settings.json` (global) or `.pi/settings.json` (project):

```json
{
  "skills": ["/path/to/agent-skills/skills"]
}
```

---

## How Pi Integrates with Agent Skills

### 1. Native Skill Discovery

Pi implements the Agent Skills standard without requiring plugins or configuration. At startup, pi scans:

| Location | Scope |
|----------|-------|
| `~/.pi/agent/skills/` | Global (user-level) |
| `~/.agents/skills/` | Global (shared with other tools) |
| `.pi/skills/` | Project (after trust) |
| `.agents/skills/` in cwd and ancestors | Project (after trust) |
| Installed packages (`pi install`) | Global or project |
| `--skill <path>` CLI flag | Ad-hoc |
| `settings.json` `skills` array | Config-defined |

Each skill directory containing a `SKILL.md` with valid YAML frontmatter (`name`, `description`) is discovered. The `using-agent-skills` meta-skill and all 23 lifecycle skills are loaded this way.

### 2. Progressive Disclosure

Only skill names and descriptions are injected into the system prompt (XML format per the spec). Full `SKILL.md` instructions are loaded on demand when:

- The agent detects a task that matches the skill's description
- You explicitly invoke `/skill:name`
- The agent uses `read` to load the skill file

This keeps the context window focused  you get the benefit of 24 skills without paying the token cost for all of them at once.

### 3. Skill Commands

Each skill registers as a `/skill:name` command:

```bash
/skill:spec-driven-development       # Load and execute the spec skill
/skill:test-driven-development        # Load and execute TDD
/skill:debugging-and-error-recovery   # Start debugging workflow
```

Arguments after the command are appended to the skill content:

```bash
/skill:code-review-and-quality Review the auth module changes
```

Enable or disable skill commands via `/settings` in interactive mode, or in `settings.json`:

```json
{
  "enableSkillCommands": true
}
```

### 4. AGENTS.md Context

Pi loads `AGENTS.md` (and `CLAUDE.md`) from:

- `~/.pi/agent/AGENTS.md` (global  always loaded)
- Parent directories walking up from cwd
- Current working directory

The existing `AGENTS.md` in this repository works with pi. It encodes:

- **Intent → Skill Mapping**  The agent maps user requests to skills automatically (feature → `spec-driven-development`, bug → `debugging-and-error-recovery`, etc.)
- **Lifecycle Mapping**  DEFINE → BUILD → VERIFY → REVIEW → SHIP phases
- **Anti-Rationalization**  Rules preventing the agent from skipping skills

### 5. Personas as Context

The 4 agent personas in `agents/` (`code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`) can be loaded as system prompt additions:

```bash
cat agents/code-reviewer.md | pi -p "Review this diff" --append-system-prompt "You are a Senior Staff Engineer..."
```

Or add as a [prompt template](https://pi.dev/docs/prompt-templates) for reuse:

```bash
cp agents/code-reviewer.md ~/.pi/agent/prompts/code-reviewer.md
```

Then invoke via `/code-reviewer` in any session.

---

## Usage Examples

### Example 1: Feature Development

**You say:**
```
Add authentication to this app
```

**Pi behavior:**
1. Pi's system prompt includes all available skill descriptions
2. The agent detects "add authentication" as feature work → matches `spec-driven-development`
3. Agent reads `skills/spec-driven-development/SKILL.md` via the `read` tool
4. Agent produces a spec (defining auth requirements, user model, endpoints, etc.)
5. Agent invokes `planning-and-task-breakdown` → breaks spec into tasks
6. Agent invokes `incremental-implementation` + `test-driven-development` → implements each task

### Example 2: Bug Fix

**You say:**
```
This endpoint is returning 500 errors
```

**Pi behavior:**
1. Agent detects bug → matches `debugging-and-error-recovery`
2. Reads the skill → follows five-step triage: reproduce → localize → reduce → fix → guard
3. Adds regression tests as required by the verification gates

### Example 3: Explicit Skill Invocation

**You say:**
```
/skill:code-review-and-quality
```

**Pi behavior:**
1. Pi invokes the skill command
2. Agent reads the full `code-review-and-quality/SKILL.md`
3. Agent applies the five-axis review framework to the current codebase

---

## Recommended Configuration

### Global Setup (Once)

```bash
# Clone the skills globally
git clone https://github.com/addyosmani/agent-skills.git ~/.agents/skills/addyosmani-agent-skills
```

### Project Setup

```bash
# 1. (Optional) Install as a project-local package
cd your-project
pi install -l git:github.com/addyosmani/agent-skills

# 2. The root AGENTS.md is auto-loaded  no additional config needed
```

### Selective Skill Loading

If you want only specific skills active (e.g., to reduce noise), use skill filtering in `settings.json`:

```json
{
  "skills": [
    "~/.agents/skills/addyosmani-agent-skills/skills/spec-driven-development",
    "~/.agents/skills/addyosmani-agent-skills/skills/test-driven-development"
  ]
}
```

Or use `--no-skills` at the CLI level to disable all skill discovery, or `--no-context-files` (`-nc`) to disable AGENTS.md loading.

---

## Limitations

- **No native slash commands for `/spec`, `/plan`, etc.**  Use `/skill:name` or let the agent auto-discover. Pi intentionally does not ship with a command-based workflow; skills activate on intent.
- **No subagent orchestration**  Pi does not have a subagent system, so the `/ship` parallel fan-out pattern is not available. Each skill runs in the main agent context.
- **Skill invocation depends on model compliance**  The agent must recognize when a skill applies. Explicit `/skill:name` commands guarantee invocation.

---

## Summary

Pi integration works through:

- **Native Agent Skills standard**  No plugins, no configuration files, no setup scripts
- **Progressive disclosure**  Skills load on demand, keeping context efficient
- **AGENTS.md**  Intent mapping and workflow enforcement via existing context file
- **`/skill:name` commands**  Explicit invocation when you want to guarantee a skill runs
- **Package management**  `pi install` for automatic discovery and team sharing

This gives you a production-grade engineering workflow within pi: skills activate when you need them, stay out of context when you don't, and enforce the same quality gates that senior engineers bring to production code.
