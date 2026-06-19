# Skill Anatomy

This document describes the structure and format of agent-skills skill files. Use this as a guide when contributing new skills or understanding existing ones.

## File Location

Every skill lives in its own directory under `skills/`:

```
skills/
  skill-name/
    SKILL.md           # Required: The skill definition
    scripts/           # Optional: Runnable helpers used by the skill workflow
    supporting-file.md # Optional: Reference material loaded on demand
```

`SKILL.md` is the only required file. Add `scripts/` only when the skill actually ships runnable helpers, and omit the directory entirely for markdown-only skills.

## SKILL.md Format

### Frontmatter

Every `SKILL.md` requires a YAML frontmatter block at the very top of the file to configure metadata and execution parameters.

#### Standard Fields (Required)

```yaml
---
name: skill-name-with-hyphens
description: Guides agents through [task/workflow]. Use when [specific trigger conditions].
---
```

* **`name`**: Lowercase, hyphen-separated. Must match the directory name.
* **`description`**: Starts with what the skill does in third person, followed by clear "Use when..." trigger conditions. Maximum 1024 characters.

**Why this matters:** Agents discover skills semantically by parsing descriptions. The description is injected into the system prompt, telling the agent what the skill provides and when to activate it. Do not summarize the workflow—if the description contains process steps, the agent may follow the summary instead of reading the full skill.

#### Advanced Orchestration Fields (Optional, Supported by Antigravity CLI)

To optimize execution efficiency, resource allocation, and safety, you can configure advanced YAML metadata properties:

```yaml
---
name: backend-db-migration
description: Designed to safely execute database migrations...
kind: subagent
model: gemini-2.5-pro
temperature: 0.2
max_turns: 15
tools:
  - run_command
  - view_file
  - write_to_file
---
```

* **`kind`**: Specifies the category or mode of execution.
  * `inline` (Default): The skill runs directly within the parent session's context.
  * `subagent`: The skill instantiates a new isolated subagent in the background. Good for complex tasks to keep the parent conversation clean.
  * `workflow`: Indicates the skill defines a multi-step structured flow.
* **`model`**: Overrides the session's default LLM for this skill.
  * Use `gemini-2.5-flash` for deterministic, lightweight, or formatting tasks (e.g., git commits, markdown documentation).
  * Use `gemini-2.5-pro` for high-reasoning, complex logic, or auditing tasks (e.g., debugging, security audits, database migrations).
* **`temperature`**: Sets model response randomness (`0.0` to `2.0`).
  * Low (`0.0` - `0.3`): Deterministic tasks like debugging, refactoring, and code migration.
  * High (`0.7` - `1.0`): Creative tasks like ideation, brainstorming, and design review.
* **`max_turns`**: A positive integer setting the maximum conversation turns before execution is halted. Prevents the agent from getting stuck in infinite correction loops.
* **`tools`**: A YAML list of tools allowed during execution (e.g., `view_file`, `chrome-devtools/*`).
  * **Principle of Least Privilege:** Restricting tools improves security (e.g., preventing a reviewer from writing files or running terminal commands).
  * **Token Savings:** Only requested tool definitions are loaded into context, reducing token overhead.

### Standard Sections (Recommended Pattern)

The frontmatter contract above is required. The section layout below is a recommended pattern, not a rigid template: equivalent headings are acceptable when they serve the same purpose clearly.

```markdown
# Skill Title

## Overview
One-two sentences explaining what this skill does and why it matters.

## When to Use
- Bullet list of triggering conditions (symptoms, task types)
- When NOT to use (exclusions)

## [Core Process / The Workflow / Steps]
The main workflow, broken into numbered steps or phases.
Include code examples where they help.
Use flowcharts (ASCII) where decision points exist.

## [Specific Techniques / Patterns]
Detailed guidance for specific scenarios.
Code examples, templates, configuration.

## Common Rationalizations
| Rationalization | Reality |
|---|---|
| Excuse agents use to skip steps | Why the excuse is wrong |

## Red Flags
- Behavioral patterns indicating the skill is being violated
- Things to watch for during review

## Verification
After completing the skill's process, confirm:
- [ ] Checklist of exit criteria
- [ ] Evidence requirements
```

## Section Purposes

### Overview
The "elevator pitch" for the skill. Should answer: What does this skill do, and why should an agent follow it?

### When to Use
Helps agents and humans decide if this skill applies to the current task. Include both positive triggers ("Use when X") and negative exclusions ("NOT for Y").

### Core Process
The heart of the skill. This is the step-by-step workflow the agent follows. Must be specific and actionable — not vague advice.

**Good:** "Run `npm test` and verify all tests pass"
**Bad:** "Make sure the tests work"

### Common Rationalizations
The most distinctive feature of well-crafted skills. These are excuses agents use to skip important steps, paired with rebuttals. They prevent the agent from rationalizing its way out of following the process.

Think of every time an agent has said "I'll add tests later" or "This is simple enough to skip the spec" — those go here with a factual counter-argument.

### Red Flags
Observable signs that the skill is being violated. Useful during code review and self-monitoring.

### Verification
The exit criteria. A checklist the agent uses to confirm the skill's process is complete. Every checkbox should be verifiable with evidence (test output, build result, screenshot, etc.).

## Supporting Files

Create supporting files only when:
- Reference material exceeds 100 lines (keep the main SKILL.md focused)
- Code tools or scripts are needed
- Checklists are long enough to justify separate files

Keep patterns and principles inline when under 50 lines.

If a skill does not need runnable helpers, do not create an empty `scripts/` directory just to mirror other skills. Empty directories add noise without changing how the skill works.

## Writing Principles

1. **Process over knowledge.** Skills are workflows, not reference docs. Steps, not facts.
2. **Specific over general.** "Run `npm test`" beats "verify the tests".
3. **Evidence over assumption.** Every verification checkbox requires proof.
4. **Anti-rationalization.** Every skip-worthy step needs a counter-argument in the rationalizations table.
5. **Progressive disclosure.** Main SKILL.md is the entry point. Supporting files are loaded only when needed.
6. **Token-conscious.** Every section must justify its inclusion. If removing it wouldn't change agent behavior, remove it.

## Naming Conventions

- Skill directories: `lowercase-hyphen-separated`
- Skill files: `SKILL.md` (always uppercase)
- Supporting files: `lowercase-hyphen-separated.md`
- References: stored in `references/` at the project root, not inside skill directories

## Cross-Skill References

Reference other skills by name:

```markdown
Follow the `test-driven-development` skill for writing tests.
If the build breaks, use the `debugging-and-error-recovery` skill.
```

Don't duplicate content between skills — reference and link instead.

## Required vs Recommended

Required:

- A `skills/<skill-name>/SKILL.md` file
- Valid YAML frontmatter with `name` and `description`
- A description that includes both what the skill does and when to use it

Recommended:

- The standard section flow shown above
- Equivalent headings such as `How It Works`, `Core Process`, or `Workflow` when they read more naturally for the skill
- Supporting files only when they keep the main `SKILL.md` focused
