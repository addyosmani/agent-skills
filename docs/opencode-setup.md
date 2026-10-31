# OpenCode Setup

This guide explains how to use Agent Skills with OpenCode. The reusable assets are the markdown skills in the `skills/` directory; the root `AGENTS.md` file in this repository is repo-scoped and should not be copied into other projects.

## Overview

OpenCode discovers skills from several locations. Agent Skills provides two optional usage styles:

- **Agent-driven workflow:** skills are selected automatically via the built-in `skill` tool and a project-local `AGENTS.md` that you write for your own repository.
- **Command-driven workflow:** manually invoke lifecycle commands with `.opencode/commands/` (optional).

## Installation

There are two ways to get the skills into your project:

1. Install with the `skills` CLI (fastest).
2. Clone this repository and copy the skill directories manually.

After either step, create your own project-local `AGENTS.md` and, if you want them, copy the `.opencode/commands/*.md` files.

### Option 1: Install with `npx skills`

The fastest path is the open [`skills` CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add addyosmani/agent-skills            # install selected skills
npx skills add addyosmani/agent-skills --list     # browse before installing
```

Install a single skill:

```bash
npx skills add addyosmani/agent-skills --skill spec-driven-development
```

By default `npx skills` installs into a tool-specific directory (often `.claude/skills/` or a shared location). OpenCode will discover skills placed there because it reads `.claude/skills/<name>/SKILL.md` and the generic `.agents/skills/<name>/SKILL.md` paths.

If the skills land somewhere OpenCode does not scan, copy or symlink them into one of the discovery paths listed below, for example:

```bash
mkdir -p .opencode/skills
cp -r .claude/skills/<skill-name> .opencode/skills/
```

> **Note:** Per-skill installs copy only the skill directory itself. If a skill references shared files under `references/`, copy those into the installed skill directory or install the whole pack. See [#361](https://github.com/addyosmani/agent-skills/issues/361) for background.

### Option 2: Clone this repository

1. Clone the repository:

```bash
git clone https://github.com/addyosmani/agent-skills.git
```

2. Copy the desired skills into one of the OpenCode skill discovery paths.

#### Project-local installation

```bash
mkdir -p .opencode/skills
cp -r /path/to/agent-skills/skills/<skill-name> .opencode/skills/
```

For example, to install `spec-driven-development` and `incremental-implementation`:

```bash
mkdir -p .opencode/skills
cp -r /path/to/agent-skills/skills/spec-driven-development .opencode/skills/
cp -r /path/to/agent-skills/skills/incremental-implementation .opencode/skills/
```

#### Global installation

```bash
mkdir -p ~/.config/opencode/skills
cp -r /path/to/agent-skills/skills/<skill-name> ~/.config/opencode/skills/
```

#### Cross-compatible paths

OpenCode also discovers skills placed in Claude-compatible or generic agent paths:

- `.claude/skills/<name>/SKILL.md`
- `~/.claude/skills/<name>/SKILL.md`
- `.agents/skills/<name>/SKILL.md`
- `~/.agents/skills/<name>/SKILL.md`

If you already share skills across Claude Code and OpenCode, any of these locations work.

### What to copy

Copy the directories under `skills/` (for example `skills/spec-driven-development/`). Each directory must contain a `SKILL.md` file. Do not copy the repository's root `AGENTS.md` or `CLAUDE.md`; those files configure development of this repository itself.

## Project `AGENTS.md`

Create an `AGENTS.md` in **your own project** root. This is the system prompt that tells OpenCode when and how to invoke the installed skills. Unlike the repo-scoped `AGENTS.md` in `addyosmani/agent-skills`, this file belongs to your project and should be adapted to your stack.

Below is a template you can paste into your project's `AGENTS.md`:

```markdown
# Agent Skills (OpenCode)

This project uses skills installed under `.opencode/skills/` (or a compatible path).

## Core Rules

- If a task matches a skill, invoke it with the `skill` tool before acting.
- Skills are located in `.opencode/skills/<skill-name>/SKILL.md`.
- Follow the skill workflow strictly; do not partially apply it.
- Never skip required steps such as spec, plan, or test when a skill demands them.

## Intent → Skill Mapping

Map the user's intent to the matching skill automatically:

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation` and `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`

## Execution Model

For every request:

1. Determine if any skill applies (even a small chance).
2. Load the skill with `skill({ name: "<skill-name>" })`.
3. Follow the skill workflow exactly.
4. Only proceed to implementation once required steps are complete.
```

Save this as `AGENTS.md` in your project root. OpenCode will load it automatically.

> **Note:** The root `AGENTS.md` inside the `addyosmani/agent-skills` repository is intended for contributors working on this repository and should not be copied into other projects. See [CONTRIBUTING.md](../CONTRIBUTING.md#repo-scoped-files).

## How It Works

### 1. Skill Discovery

OpenCode walks the following paths (project-local first, then global):

- `.opencode/skills/<name>/SKILL.md`
- `~/.config/opencode/skills/<name>/SKILL.md`
- `.claude/skills/<name>/SKILL.md`
- `~/.claude/skills/<name>/SKILL.md`
- `.agents/skills/<name>/SKILL.md`
- `~/.agents/skills/<name>/SKILL.md`

Each skill must contain a `SKILL.md` file with a valid `name` and `description` in its frontmatter.

### 2. Automatic Skill Invocation

When your project's `AGENTS.md` instructs the agent to use skills, the agent evaluates every request and maps it to the appropriate skill.

Examples:

- "build a feature" → `incremental-implementation` + `test-driven-development`
- "design a system" → `spec-driven-development`
- "fix a bug" → `debugging-and-error-recovery`
- "review this code" → `code-review-and-quality`

### 3. Lifecycle Mapping (Implicit Commands)

OpenCode does not require slash commands, but if you prefer them see the next section. In agent-driven mode the lifecycle is mapped implicitly:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

### Copy the optional slash commands

If you prefer explicit commands, copy the example command files from this repository into your project and adjust them to invoke the skills you installed:

```bash
mkdir -p .opencode/commands
cp /path/to/agent-skills/.opencode/commands/*.md .opencode/commands/
```

> **Note:** The repository currently does not include `.opencode/commands/*.md` on `main`. You can create your own command files or watch PR #200, which proposes adding them. Once they exist, the pattern above applies.

A typical command file looks like:

```markdown
---
description: Break work into small verifiable tasks
---

Invoke the planning-and-task-breakdown skill. Read the spec and create tasks with acceptance criteria.
```

Save it as `.opencode/commands/plan.md` to enable `/plan` in OpenCode.

## Usage Examples

### Example 1: Feature Development

User:
```
Add authentication to this app
```

Agent behavior:
- Detects feature work
- Invokes `spec-driven-development`
- Produces a spec before writing code
- Moves to planning and implementation skills

### Example 2: Bug Fix

User:
```
This endpoint is returning 500 errors
```

Agent behavior:
- Invokes `debugging-and-error-recovery`
- Reproduces → localizes → fixes → adds guards

### Example 3: Code Review

User:
```
Review this PR
```

Agent behavior:
- Invokes `code-review-and-quality`
- Applies structured review (correctness, design, readability, etc.)

## Agent Expectations

For OpenCode to work correctly, the agent should:

- Always check if a skill applies before acting
- Use the `skill` tool to load the skill when it applies
- Never skip required workflows (spec, plan, test, etc.)
- Not jump directly to implementation

These rules are enforced by your project's `AGENTS.md`, not by the copy of the skill itself.

## Limitations

- Skill invocation depends on model compliance.
- OpenCode does not install skills automatically; copy or install the directories you need.
- If a skill references files under `references/`, you may need to copy those as well when installing manually.

## Summary

1. Install the skills you need, either with `npx skills add addyosmani/agent-skills` or by copying them from a clone of this repository into `.opencode/skills/` (project), `~/.config/opencode/skills/` (global), or a cross-compatible path such as `.claude/skills/` / `.agents/skills/`.
2. Create your own project-local `AGENTS.md` with the rules and intent mapping above.
3. OpenCode discovers the skills and your `AGENTS.md` guides the agent to invoke them.
4. Optionally add `.opencode/commands/*.md` for explicit slash commands.

This keeps the reusable assets (skills) separate from the repository-specific configuration (the `addyosmani/agent-skills` root `AGENTS.md`).
