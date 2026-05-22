# Development Lifecycle

This file is the single source of truth for phase names, order, and per-command phase sets. All skills and documentation that enumerate phases must reference this file rather than defining their own lists.

## Canonical Phases

The 7 phases map 1:1 to the slash commands in `.claude/commands/`:

| # | Phase | Slash Command | What it covers |
|---|-------|---------------|----------------|
| 1 | SPEC | `/spec` | Define what to build — requirements, acceptance criteria, boundaries |
| 2 | PLAN | `/plan` | Break the spec into small, verifiable, ordered tasks |
| 3 | BUILD | `/build` | Implement the tasks incrementally |
| 4 | TEST | `/test` | Prove the implementation works — TDD, browser testing, debugging |
| 5 | REVIEW | `/review` | Quality gates before merge — code review, security, performance |
| 6 | SIMPLIFY | `/code-simplify` | Reduce complexity without changing behavior |
| 7 | SHIP | `/ship` | Deploy safely — pre-launch checklist, monitoring, rollback |

## Per-Command Phase Sets

When a slash command is invoked, only the phases from that point forward are relevant. Show only these phases in the workflow tracker.

| Command invoked | Phases to show |
|-----------------|----------------|
| `/spec` | SPEC → PLAN → BUILD → TEST → REVIEW → SIMPLIFY → SHIP |
| `/plan` | PLAN → BUILD → TEST → REVIEW → SIMPLIFY → SHIP |
| `/build` | BUILD → TEST → REVIEW → SIMPLIFY → SHIP |
| `/test` | TEST → REVIEW → SIMPLIFY → SHIP |
| `/review` | REVIEW → SIMPLIFY → SHIP |
| `/code-simplify` | SIMPLIFY → SHIP |
| `/ship` | SHIP |

## Phase Regression

Phases are not always linear. When a phase must be revisited (e.g., TEST fails and work returns to BUILD), reopen the completed phase by setting it back to `in_progress`. Do not add a duplicate item — update the existing one.

## Skill Mapping

Each phase is primarily served by one or more skills:

| Phase | Primary skills |
|-------|---------------|
| SPEC | `interview-me`, `idea-refine`, `spec-driven-development` |
| PLAN | `planning-and-task-breakdown` |
| BUILD | `incremental-implementation`, `test-driven-development`, `frontend-ui-engineering`, `api-and-interface-design`, `source-driven-development`, `context-engineering`, `doubt-driven-development` |
| TEST | `test-driven-development`, `browser-testing-with-devtools`, `debugging-and-error-recovery` |
| REVIEW | `code-review-and-quality`, `security-and-hardening`, `performance-optimization` |
| SIMPLIFY | `code-simplification` |
| SHIP | `git-workflow-and-versioning`, `ci-cd-and-automation`, `documentation-and-adrs`, `shipping-and-launch` |
