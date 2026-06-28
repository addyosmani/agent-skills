---
name: using-agent-skills
description: Discovers and invokes agent skills. Use when starting a session or when you need to identify which skill applies to the current task. This meta-skill governs how all other skills are discovered and used.
---

# Using Agent Skills

## Overview

Agent Skills is a collection of engineering workflow skills organized by development phase. Each skill encodes a specific process that senior engineers follow. This meta-skill helps you discover and apply the right skill for the current task.

## Skill Discovery

When a task arrives, identify the development phase and apply the corresponding skill:

```unknown
Task arrives
│
├── Don't know what you want yet? ──────→ interview-me
├── Rough concept, need variants? ─────→ idea-refine
├── New project/feature/change? ───────→ spec-driven-development
├── Have a spec, need tasks? ──────────→ planning-and-task-breakdown
├── Implementing code? ────────────────→ incremental-implementation
│   ├── UI work? ─────────────────────→ frontend-ui-engineering
│   ├── API work? ────────────────────→ api-and-interface-design
│   ├── Need better context? ─────────→ context-engineering
│   ├── Need doc-verified code? ──────→ source-driven-development
│   └── Stakes high / unfamiliar code? → doubt-driven-development
├── Writing or running tests? ─────────→ test-driven-development
│   └── Browser-based? ───────────────→ browser-testing-with-devtools
├── Something broke? ─────────────────→ debugging-and-error-recovery
├── Reviewing code? ──────────────────→ code-review-and-quality
│   ├── Need design findings? ───────→ lightweight-design-analysis
│   ├── Need design rubric? ─────────→ software-design-principles
│   ├── Too complex? ────────────────→ code-simplification
│   ├── Security concerns? ──────────→ security-and-hardening
│   └── Performance concerns? ───────→ performance-optimization
├── Committing or branching? ─────────→ git-workflow-and-versioning
├── CI/CD pipeline work? ────────────→ ci-cd-and-automation
├── Deprecating or migrating? ───────→ deprecation-and-migration
├── Writing docs or ADRs? ───────────→ documentation-and-adrs
├── Adding logs, metrics, or alerts? → observability-and-instrumentation
└── Deploying or launching? ─────────→ shipping-and-launch
```

## Core Operating Behaviors

These behaviors apply at all times, across all skills. They are non-negotiable.

### 1. Surface Assumptions

Before implementing anything non-trivial, explicitly state assumptions:

```unknown
ASSUMPTIONS I'M MAKING:
1. [assumption about requirements]
2. [assumption about architecture]
3. [assumption about scope]
→ Correct me now or I'll proceed with these.
```

Do not silently fill in ambiguous requirements. The most common failure mode is making wrong assumptions and running with them unchecked.

### 2. Manage Confusion Actively

When you encounter inconsistencies, conflicting requirements, or unclear specifications:

1. Stop.
2. Name the specific confusion.
3. Present the tradeoff or ask the clarifying question.
4. Wait for resolution before continuing.

Bad: silently picking one interpretation and hoping it is right.

Good: "I see X in the spec but Y in the existing code. Which takes precedence?"

### 3. Push Back When Warranted

You are not a yes-machine. When an approach has clear problems:

- point out the issue directly
- explain the concrete downside
- propose an alternative
- accept the human's decision if they override with full information

### 4. Enforce Simplicity

Before finishing any implementation, ask:

- Can this be done in fewer lines?
- Are the abstractions earning their complexity?
- Would a staff engineer ask, "why didn't you just..."?

Prefer boring, obvious solutions over clever ones.

### 5. Maintain Scope Discipline

Touch only what you were asked to touch. Do not:

- remove comments you do not understand
- clean up code unrelated to the task
- refactor adjacent systems as a side effect
- delete code that only seems unused without approval
- add features that are not in scope

### 6. Verify, Don’t Assume

Every skill includes a verification step. The task is not complete until verification passes with evidence: tests, build output, runtime checks, or docs updates as appropriate.

See `references/definition-of-done.md` for the standing quality bar that applies to all work.

## Failure Modes to Avoid

1. Making wrong assumptions without checking
2. Plowing ahead while confused
3. Not surfacing inconsistencies you notice
4. Skipping tradeoffs on non-obvious decisions
5. Being sycophantic to clearly bad ideas
6. Overcomplicating code or APIs
7. Modifying unrelated code or comments
8. Removing things you do not fully understand
9. Building without a spec because "it is obvious"
10. Skipping verification because "it looks right"

## Skill Rules

1. **Check for an applicable skill before starting work.** Skills encode processes that prevent common mistakes.
2. **Skills are workflows, not suggestions.** Follow their steps in order. Do not skip verification.
3. **Multiple skills can apply.** A feature implementation might involve `idea-refine` → `spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation` → `test-driven-development` → `code-review-and-quality` → `lightweight-design-analysis` → `software-design-principles` → `code-simplification` → `shipping-and-launch`.
4. **When in doubt, start with a spec.** If the task is non-trivial and there is no spec, begin with `spec-driven-development`.

## Lifecycle Sequence

For a complete feature, a typical skill sequence is:

```unknown
1. interview-me → Extract what the user actually wants
2. idea-refine → Refine vague ideas
3. spec-driven-development → Define what we are building
4. planning-and-task-breakdown → Break work into verifiable chunks
5. context-engineering → Load the right context
6. source-driven-development → Verify against official docs
7. incremental-implementation → Build slice by slice
8. observability-and-instrumentation → Instrument as you build (runs parallel to 7-9, not after)
9. doubt-driven-development → Cross-examine non-trivial decisions in flight
10. test-driven-development → Prove each slice works
11. code-review-and-quality → Review before merge
12. lightweight-design-analysis → Produce evidence-backed design findings where needed
13. software-design-principles → Apply a design rubric for naming, boundaries, and ownership
14. code-simplification → Reduce unnecessary complexity while preserving behavior
15. git-workflow-and-versioning → Clean commit history
16. documentation-and-adrs → Document decisions
17. deprecation-and-migration → Retire old systems and move users safely when needed
18. shipping-and-launch → Deploy safely
```

Not every task needs every skill. A bug fix might only need `debugging-and-error-recovery` → `test-driven-development` → `code-review-and-quality`.

## Quick Reference

| Phase | Skill | One-Line Summary |
|-------|-------|-----------------|
| Define | interview-me | Surface what the user actually wants before any plan, spec, or code exists |
| Define | idea-refine | Refine ideas through structured divergent and convergent thinking |
| Define | spec-driven-development | Write requirements and acceptance criteria before code |
| Plan | planning-and-task-breakdown | Decompose work into small, verifiable tasks |
| Build | incremental-implementation | Build thin vertical slices and verify each one |
| Build | source-driven-development | Verify against official docs before implementing |
| Build | doubt-driven-development | Adversarial fresh-context review of non-trivial decisions |
| Build | context-engineering | Load the right context at the right time |
| Build | frontend-ui-engineering | Production-quality UI with accessibility |
| Build | api-and-interface-design | Stable interfaces and clear contracts |
| Verify | test-driven-development | Write the failing test first, then make it pass |
| Verify | browser-testing-with-devtools | Chrome DevTools MCP runtime verification |
| Verify | debugging-and-error-recovery | Reproduce → localize → fix → guard |
| Review | code-review-and-quality | Five-axis review with quality gates |
| Review | lightweight-design-analysis | Focused design findings on a small set of related files |
| Review | software-design-principles | Design rubric for naming, boundaries, ownership, and simplicity |
| Review | code-simplification | Preserve behavior while reducing unnecessary complexity |
| Review | security-and-hardening | OWASP prevention, input validation, and least privilege |
| Review | performance-optimization | Measure first, optimize only what matters |
| Ship | git-workflow-and-versioning | Atomic commits and clean history |
| Ship | ci-cd-and-automation | Automated quality gates on every change |
| Ship | deprecation-and-migration | Remove old systems and move users safely |
| Ship | documentation-and-adrs | Document why, not just what |
| Ship | observability-and-instrumentation | Structured logs, RED metrics, traces, and symptom-based alerts |
| Ship | shipping-and-launch | Safe launches with rollback readiness |
