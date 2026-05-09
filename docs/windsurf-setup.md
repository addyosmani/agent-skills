# Windsurf Setup

This guide explains how to use Agent Skills with Windsurf's modern Rules system (memories, workspace rules, AGENTS.md, and native skills).

## Overview

Windsurf has evolved significantly. It now supports a sophisticated Rules engine that can automatically activate skills based on intent, file patterns, or manual invocation. This guide covers both **global** (all projects) and **workspace-local** (per-project) installation.

### Windsurf Context System

| Feature | What it does | Best for |
|---------|-------------|----------|
| **Global Rules** | `~/.codeium/windsurf/memories/global_rules.md` — applies to every workspace, always on | Base behavior, intent mapping, coding conventions |
| **Workspace Rules** | `.windsurf/rules/*.md` — one file per rule, with activation modes | Project-specific skills, tech-stack constraints |
| **AGENTS.md** | Any directory in your workspace | Directory-specific conventions without frontmatter |
| **Native Skills** | Multi-step procedures with supporting files | Complex workflows requiring reference files |

> **Note:** The old `.windsurfrules` file is deprecated. Windsurf now uses the Rules engine described above.

---

## Global Installation (All Projects)

### Why Global?

Windsurf's Rules system supports activation modes. We can define a global rule that maps user intent to skills, and workspace rules that activate only when relevant. This avoids copying skills into every project.

### How It Works

1. **Global Rules** (`global_rules.md`) contain the base intent mapping and lifecycle rules
2. **Workspace Rules** (`.windsurf/rules/*.md`) contain individual skills with `trigger: model_decision` — Cascade reads the full skill only when the description matches the user's intent
3. **AGENTS.md** in the workspace root acts as an always-on rule for project-specific conventions

### Step-by-Step Setup

#### 1. Clone the repository

```bash
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
```

#### 2. Run the install script

```bash
bash scripts/install-windsurf.sh
```

This script will:
- Detect your OS
- Create `~/.codeium/windsurf/memories/global_rules.md` with intent mapping **generated dynamically** from `skills/*/SKILL.md` frontmatter (never drifts)
- Copy skills to `~/.agents/skills/` for on-demand reading, with a **confirmation prompt and automatic backup** if the directory already exists
- Optionally install workspace rules in your current project

#### 3. Manual setup (if you prefer)

If you prefer not to run the script, replicate its steps manually:

**Copy skills to global location:**

> ⚠️ The install script includes a safety check: if `~/.agents/skills/` already exists, it lists existing contents, asks for confirmation, and creates a timestamped backup before overwriting. Replicate this behavior if copying manually.

```bash
mkdir -p ~/.agents/skills
# WARNING: the following overwrites existing files. Back up first if needed.
cp -R skills/* ~/.agents/skills/
```

**Create Global Rules:**

Create `~/.codeium/windsurf/memories/global_rules.md`. Rather than hard-coding the skill list (which drifts), generate it by reading the `name` and `description` fields from each `skills/*/SKILL.md` frontmatter. The install script does this automatically; you can run it once and copy the generated file, or adapt the `generate_skill_mapping` function from the script.

The generated file includes:
- Core rules (where skills live, when to use them)
- **Available Skills** — a complete, alphabetically sorted list derived live from the repo's skill frontmatter
- Lifecycle mapping (DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP)
- Execution model

---

## Workspace-Local Installation (Per Project)

For project-specific behavior, create rules in `.windsurf/rules/`.

### Recommended Workspace Rules

Create `.windsurf/rules/agent-skills.md`:

```markdown
---
trigger: always_on
---

# Agent Skills Base Rules

This project uses agent-skills workflows. Always check if a skill applies before acting.

## Core Principles

- Spec before code
- Test before implementation
- Review before merge
- One logical change per commit (~100 lines)

## Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior:

- Always check for and use skills first
```

Create `.windsurf/rules/test-driven-development.md`:

```markdown
---
trigger: model_decision
description: Use when implementing logic, fixing bugs, or changing behavior. Triggers for "add tests", "fix bug", "implement feature", "TDD".
---

# Test-Driven Development

Read `~/.agents/skills/test-driven-development/SKILL.md` and follow its workflow.

Key principles:
- Red-Green-Refactor cycle
- Test pyramid (80% unit, 15% integration, 5% E2E)
- DAMP over DRY in tests
- Beyonce Rule: if you liked it, you should have put a test on it
```

Create `.windsurf/rules/spec-driven-development.md`:

```markdown
---
trigger: model_decision
description: Use when starting a new project, feature, or significant change. Triggers for "design", "spec", "PRD", "plan feature".
---

# Spec-Driven Development

Read `~/.agents/skills/spec-driven-development/SKILL.md` and follow its workflow.

Key principles:
- Write spec before code
- Cover objectives, commands, structure, code style, testing, boundaries
```

### Activation Modes Explained

| Mode | `trigger:` value | When it activates | Context cost |
|------|------------------|-------------------|--------------|
| Always On | `always_on` | Every message | Every message |
| Model Decision | `model_decision` | When description matches intent | Description always; full content on demand |
| Glob | `glob` | When touching matching files | Only when matching files are touched |
| Manual | `manual` | When `@rule-name` is typed | Only when @mentioned |

**Recommendation:** Use `model_decision` for most skills. Cascade only reads the full skill content when it decides the skill is relevant, keeping context usage minimal.

---

## AGENTS.md Integration

Windsurf natively supports `AGENTS.md` files in any workspace directory:

- **Root-level** `AGENTS.md` = always-on rules for the entire project
- **Subdirectory** `AGENTS.md` = applies only to that directory (auto-glob)

Create an `AGENTS.md` in your project root:

```markdown
# AGENTS.md

## Project Context

[Describe your project here]

## Agent Behavior

- Always check if a skill applies before implementing
- If a skill applies, you MUST use it
- Never skip required workflows (spec, plan, test, review)
```

---

## Verification

After setup, test with natural language prompts:

```
Design a feature for user authentication
```

Expected behavior:
- Cascade detects `spec-driven-development` applies
- Reads `~/.agents/skills/spec-driven-development/SKILL.md`
- Follows the spec-writing workflow before coding

```
This endpoint is returning 500 errors
```

Expected behavior:
- Cascade detects `debugging-and-error-recovery` applies
- Reads `~/.agents/skills/debugging-and-error-recovery/SKILL.md`
- Follows the five-step triage workflow

---

## Limitations

- **No native skill tool:** Unlike Claude Code, Windsurf does not have a `/skill` command. Skills are triggered via intent mapping in rules.
- **Context limits:** Workspace rules are limited to 12,000 characters each; global rules to 6,000. Large skills should reference external files rather than being pasted inline.
- **Model compliance:** As with all agent-driven workflows, skill adherence depends on the model following the instructions.

---

## Summary

Windsurf integration works through:

1. **Global Rules** (`global_rules.md`) for base intent mapping — generated dynamically from skill frontmatter so it never drifts
2. **Workspace Rules** (`.windsurf/rules/*.md`) for project-specific skills with smart activation
3. **AGENTS.md** for directory-specific conventions
4. **On-demand skill reading** via `~/.agents/skills/<skill-name>/SKILL.md`

This creates a **fully agent-driven, production-grade engineering workflow** without requiring manual skill invocation or pasting large files into context.

---

## Recommended Workflow

Just use natural language:

- "Design a feature"
- "Plan this change"
- "Implement this"
- "Fix this bug"
- "Review this"

The agent will automatically select and execute the correct skills.
