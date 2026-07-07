---
name: slash-commands
description: Guides agents through the 7 development lifecycle slash commands that map spec→plan→build→test→review→simplify→ship. Use when the user mentions any slash command (/spec, /plan, /build, /test, /review, /code-simplify, /ship), when starting a new feature, or when the agent needs to understand which command maps to the current phase of work.
---

# Slash Commands

## Overview

Seven slash commands that orchestrate the complete development lifecycle. Each command activates the right combination of skills automatically and provides a structured workflow from definition through shipping. This skill ensures agents understand which command to use, when to use it, and how to execute its workflow.

## When to Use

Use this skill when:
- User explicitly types `/spec`, `/plan`, `/build`, `/test`, `/review`, `/code-simplify`, or `/ship`
- Starting a new feature or project (use `/spec`)
- Ready to break down a spec into tasks (use `/plan`)
- Ready to implement (use `/build` or `/build auto`)
- Need to prove functionality (use `/test`)
- Before merging (use `/review`)
- Code is working but messy (use `/code-simplify`)
- Ready to deploy to production (use `/ship`)
- User asks "what command should I use for X?"

## Process

### Step 1: Identify the Current Phase

Map the user's goal to the correct command:

| User Goal | Command | Key Principle |
|-----------|---------|----------------|
| Define what to build | `/spec` | Spec before code |
| Plan how to build it | `/plan` | Small, atomic tasks |
| Build incrementally | `/build` | One slice at a time |
| Prove it works | `/test` | Tests are proof |
| Review before merge | `/review` | Improve code health |
| Simplify the code | `/code-simplify` | Clarity over cleverness |
| Ship to production | `/ship` | Faster is safer |

### Step 2: Execute the Command Workflow

**For `/spec`**: 
- Activate `spec-driven-development` skill
- Interview user to extract requirements (use `interview-me` if underspecified)
- Produce PRD with objectives, commands, structure, code style, testing, boundaries

**For `/plan`**: 
- Activate `planning-and-task-breakdown` skill
- Decompose existing spec into verifiable tasks with acceptance criteria
- Output dependency-ordered task list sized for ~100-line changes

**For `/build`**: 
- If standard: activate `incremental-implementation` + `test-driven-development`
- If `/build auto`: generate plan first (same as `/plan`), then implement every task in one approved pass without manual stepping between tasks
- Pause on failures or risky steps
- Commit each task individually, test-driven

**For `/test`**: 
- Activate `browser-testing-with-devtools` (if web) + `debugging-and-error-recovery`
- Run test suite, analyze failures, apply Red-Green-Refactor
- Verify test pyramid (80/15/5 unit/integration/e2e)

**For `/review`**: 
- Activate `code-review-and-quality`
- Five-axis review: correctness, design, complexity, testing, naming
- Enforce ~100-line change size, severity labels (Nit/Optional/FYI)

**For `/code-simplify`**: 
- Activate `code-simplification` skill
- Apply Chesterton's Fence (understand before removing)
- Respect Rule of 500 (split files exceeding 500 lines)

**For `/ship`**: 
- Activate `shipping-and-launch` + `observability-and-instrumentation`
- Run pre-launch checklist, verify feature flags, staged rollout plan
- Confirm rollback procedure and monitoring dashboards

### Step 3: Skill Auto-activation

Commands automatically trigger relevant skills without user prompting:

| Build Activity | Auto-triggered Skills |
|----------------|----------------------|
| Designing API | `api-and-interface-design` |
| Building UI | `frontend-ui-engineering` |
| Any code change | `git-workflow-and-versioning`, `incremental-implementation` |
| Debugging | `debugging-and-error-recovery` |
| Security review | `security-and-hardening` |

### Step 4: Handle the Auto Mode

When user invokes `/build auto`:
1. Generate plan exactly like `/plan` would
2. Present plan for single approval
3. After approval, run autonomously through all tasks
4. Each task: test-driven → implement → verify → commit
5. Pause and notify on: test failures, risky operations, ambiguous requirements
6. Resume after user resolution

The auto mode removes human stepping between tasks, not verification.

## Common Rationalizations

| Excuse | Rebuttal |
|--------|----------|
| "I'll just start coding without `/spec`" | Underspecified work leads to rework. The 5 minutes writing a spec saves 2 hours of confusion. |
| "`/build auto` is too magical" | Each task still requires tests passing and individual commits. It only removes the manual "/next" keystrokes. |
| "I don't need `/test` for this small change" | Small changes break big things. Run tests. Always. |
| "I'll review after merge" | Review gates happen BEFORE merge. That's the point of quality control. |
| "`/code-simplify` can wait until later" | Complexity compounds. Simplify when you touch the code or never will. |
| "Let me just ship this one thing without `/ship`" | The checklist exists because humans forget steps under pressure. Use the command. |

## Red Flags

❌ User wants to skip to `/build` without ever running `/spec` → Stop. Ask for requirements first.
❌ `/build auto` fails more than 3 tasks in a row → Stop. Investigate if spec is underspecified or plan is wrong.
❌ User asks to review code that's already in production → Too late. Review happens pre-merge.
❌ Running `/ship` without feature flags for a breaking change → Block until flags are added.
❌ User types `/test` but has zero tests written → Block. Use `/spec` to add testing requirements first.

## Verification

To confirm the slash command workflow was applied correctly:

- [ ] Correct command was used for the current phase (define/plan/build/test/review/simplify/ship)
- [ ] Command triggered the appropriate skills (check skill activation logs)
- [ ] Each command produced its expected output (spec, plan, commits, test results, review comments, simplified code, deployment checklist)
- [ ] `/build auto` produced a plan that was approved before execution
- [ ] No commands were skipped in the lifecycle (e.g., shipping without review)
- [ ] Every commit passes tests and follows atomic commit practice
- [ ] User can state which phase they're in and which command to use next

## Supporting References

When deeper guidance is needed, these skills contain the detailed workflows:
- `spec-driven-development` for `/spec`
- `planning-and-task-breakdown` for `/plan`
- `incremental-implementation` + `test-driven-development` for `/build`
- `browser-testing-with-devtools` for `/test`
- `code-review-and-quality` for `/review`
- `code-simplification` for `/code-simplify`
- `shipping-and-launch` for `/ship`

## Integration with Existing Skills

This skill doesn't duplicate content—it orchestrates the existing 24 skills. It's the command-line interface to the entire skillset, mapping user intent to the right deep workflow.