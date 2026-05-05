# OpenCode Setup

This guide explains how to use Agent Skills with OpenCode in a way that closely mirrors the Claude Code experience (automatic skill selection, lifecycle-driven workflows, and strict process enforcement).

## Overview

OpenCode supports custom `/commands`, but does not have a native plugin system or automatic skill routing like Claude Code.

Instead, we achieve parity through:

- A strong system prompt (`AGENTS.md`)
- The built-in `skill` tool
- Consistent skill discovery from the `/skills` directory

This creates an **agent-driven workflow** where skills are selected and executed automatically.

While it is possible to recreate `/spec`, `/plan`, and other commands in OpenCode, this integration intentionally uses an agent-driven approach instead:

- Skills are selected automatically based on intent
- Workflows are enforced via `AGENTS.md`
- No manual command invocation is required

This more closely matches how Claude Code behaves in practice, where skills are triggered automatically rather than manually.

---

## Installation

1. Clone the repository:

```bash
git clone https://github.com/addyosmani/agent-skills.git
```

2. Open the project in OpenCode.

3. Ensure the following files are present in your workspace:

- `AGENTS.md` (root)
- `skills/` directory

No additional installation is required.

---

## Global Installation (All Projects)

The workspace-local approach above requires copying `AGENTS.md` and `skills/` into every project. You can also install skills **globally** so they apply to any OpenCode session without per-project setup.

### Why Global?

OpenCode's built-in `skill` tool only recognizes a small set of natively registered skills. The skills in this repository (`spec-driven-development`, `debugging-and-error-recovery`, `code-review-and-quality`, etc.) are **not** automatically discoverable by that tool. To use them across all projects, we inject the skill definitions into OpenCode's global context.

### How It Works

OpenCode loads `~/.claude/CLAUDE.md` into **every** session, regardless of working directory. By placing a global `AGENTS.md` in `~/.claude/` and referencing it from `~/.claude/CLAUDE.md`, the agent receives the skill-mapping instructions on every request.

When a skill applies, the agent reads the skill definition directly from `~/.agents/skills/<skill-name>/SKILL.md` using the `read` tool and follows it exactly.

### Step-by-Step Setup

1. **Clone the repository** (if you haven't already):

```bash
git clone https://github.com/addyosmani/agent-skills.git
cd agent-skills
```

2. **Copy the skills to the global agents directory:**

```bash
mkdir -p ~/.agents/skills
cp -R skills/* ~/.agents/skills/
```

3. **Create the global `AGENTS.md`:**

Copy the following into `~/.claude/AGENTS.md`:

```markdown
# Global Agent Skills — OpenCode Integration

These instructions apply to ALL projects. Skills are located in `~/.agents/skills/`.

## Core Rules

- If a task matches a skill, you MUST use it
- Skills are located in `~/.agents/skills/<skill-name>/SKILL.md`
- Never implement directly if a skill applies
- Always follow the skill instructions exactly (do not partially apply them)
- When invoking a skill, use the `read` tool to load its `SKILL.md` and follow it strictly

## Intent → Skill Mapping

- Feature / new functionality → `spec-driven-development`, then `incremental-implementation`, `test-driven-development`
- Planning / breakdown → `planning-and-task-breakdown`
- Bug / failure / unexpected behavior → `debugging-and-error-recovery`
- Code review → `code-review-and-quality`
- Refactoring / simplification → `code-simplification`
- API or interface design → `api-and-interface-design`
- UI work → `frontend-ui-engineering`
- Performance issues → `performance-optimization`
- Security concerns → `security-and-hardening`
- CI/CD setup → `ci-cd-and-automation`
- Documentation → `documentation-and-adrs`
- Git workflow → `git-workflow-and-versioning`
- Shipping / launch → `shipping-and-launch`
- Deprecation or migration → `deprecation-and-migration`
- Testing with browser DevTools → `browser-testing-with-devtools`
- Context engineering → `context-engineering`
- Source-driven development → `source-driven-development`

## Lifecycle Mapping (Implicit Commands)

OpenCode does not support slash commands like `/spec` or `/plan`.

Instead, the agent must internally follow this lifecycle:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

## Execution Model

For every request:

1. Determine if any skill applies (even 1% chance)
2. Read the appropriate skill from `~/.agents/skills/<skill-name>/SKILL.md`
3. Follow the skill workflow strictly
4. Only proceed to implementation after required steps (spec, plan, etc.) are complete

## Anti-Rationalization

The following thoughts are incorrect and must be ignored:

- "This is too small for a skill"
- "I can just quickly implement this"
- "I'll gather context first"

Correct behavior:

- Always check for and use skills first
```

4. **Reference it from your global `CLAUDE.md`:**

Ensure `~/.claude/CLAUDE.md` includes:

```
@AGENTS.md
```

If the file already has other includes (e.g., `@RTK.md`), add `@AGENTS.md` on its own line.

5. **Verify it works:**

Open any project in OpenCode and try a natural-language prompt that triggers a skill, e.g.:

```
Design a feature for adding user authentication
```

The agent should:
- Detect that `spec-driven-development` applies
- Read `~/.agents/skills/spec-driven-development/SKILL.md`
- Follow the spec-writing workflow before writing any code

### Limitations of Global Setup

- **OpenCode `skill` tool incompatibility:** The native `skill` tool will not list these skills in `available_skills`. They are loaded on-demand via `read` instead.
- **Project-specific overrides:** If a project has its own `AGENTS.md` in the workspace root, it takes precedence. The global setup acts as a fallback.
- **Model compliance:** As with the workspace-local setup, skill adherence depends on the model following the instructions in `AGENTS.md`.

---

## How It Works

### 1. Skill Discovery

All skills live in:

```
skills/<skill-name>/SKILL.md
```

OpenCode agents are instructed (via `AGENTS.md`) to:

- Detect when a skill applies
- Invoke the `skill` tool
- Follow the skill exactly

### 2. Automatic Skill Invocation

The agent evaluates every request and maps it to the appropriate skill.

Examples:

- "build a feature" → `incremental-implementation` + `test-driven-development`
- "design a system" → `spec-driven-development`
- "fix a bug" → `debugging-and-error-recovery`
- "review this code" → `code-review-and-quality`

The user does **not** need to explicitly request skills.

### 3. Lifecycle Mapping (Implicit Commands)

The development lifecycle is encoded implicitly:

- DEFINE → `spec-driven-development`
- PLAN → `planning-and-task-breakdown`
- BUILD → `incremental-implementation` + `test-driven-development`
- VERIFY → `debugging-and-error-recovery`
- REVIEW → `code-review-and-quality`
- SHIP → `shipping-and-launch`

This replaces slash commands like `/spec`, `/plan`, etc.

---

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

---

### Example 2: Bug Fix

User:
```
This endpoint is returning 500 errors
```

Agent behavior:
- Invokes `debugging-and-error-recovery`
- Reproduces → localizes → fixes → adds guards

---

### Example 3: Code Review

User:
```
Review this PR
```

Agent behavior:
- Invokes `code-review-and-quality`
- Applies structured review (correctness, design, readability, etc.)

---

## Agent Expectations (Critical)

For OpenCode to work correctly, the agent must follow these rules:

- Always check if a skill applies before acting
- If a skill applies, it MUST be used
- Never skip required workflows (spec, plan, test, etc.)
- Do not jump directly to implementation

These rules are enforced via `AGENTS.md`.

---

## Limitations

- No native slash commands (handled via intent mapping instead)
- No plugin system (handled via prompt + structure)
- Skill invocation depends on model compliance

Despite these, the workflow closely matches Claude Code in practice.

---

## Recommended Workflow

Just use natural language:

- "Design a feature"
- "Plan this change"
- "Implement this"
- "Fix this bug"
- "Review this"

The agent will automatically select and execute the correct skills.

---

## Summary

OpenCode integration works by combining:

- Structured skills (this repo)
- Strong agent rules (`AGENTS.md`)
- Automatic skill invocation via reasoning

This results in a **fully agent-driven, production-grade engineering workflow** without requiring plugins or manual commands.
