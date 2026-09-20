---
name: planning-and-task-breakdown
description: How a requirement becomes incremental delivery — a plan document, milestones ordered by earliest usable outcome, fixed-length sprints with a points capacity, stories, and small verifiable tasks with acceptance criteria, disjoint owned paths, and dependency order, with a foundation task first so parallel work is safe; scope discipline (phased PRDs, milestoned stories, discovered work classified before it enters scope); and a sprint review at every close. Use when you have a spec, PRD, or reviewed design and must break it into tasks, when a task feels too large to start, when a large requirement arrives ("plan this out"), when a sprint starts or ends, when scope changes mid-milestone, or when unplanned work is discovered.
category: process
---

# Planning and Task Breakdown

## Overview

Favor quick, incremental delivery over a complete feature. The hierarchy is project → milestones → sprints → stories → tasks. Each milestone gives a user something they can use; each sprint is a fixed time box with a points capacity; each task is small enough to implement, test, and verify in one focused session, with one goal and owned paths disjoint from every other task in flight; shared definitions are built first by one engineer so everyone else can work in parallel. Sprint reviews make spillover and estimation error visible so the next sprint is planned better.

The plan lives in `tasks/plan.md`; milestones, sprints, stories, and tasks live in Linear. This skill decides what they contain; `linear` says how to create them.

## When to Use

- You have a spec, PRD, or reviewed HLD and need to break it into implementable units.
- A large requirement arrives, even as "plan this out" or "build feature X": it gets a plan, milestones, sprints, stories, and tasks before code.
- A task feels too large or vague to start; the implementation order isn't obvious; work must be parallelised across agents.
- A sprint starts and needs planning, or ends and needs a review; a milestone closes and the next needs planning.
- Scope changes mid-milestone, or unplanned work is discovered.
- NOT for single-file changes with obvious scope: a ticket, then start.
- NOT before design approval for large work: planning against an unapproved design creates rework.
- NOT for creating the Linear objects: `linear`.

## Process

### 1. Read, write no code

Operate read-only: the spec or PRD with its acceptance criteria and success target, the HLD, the domain model and key interfaces, the existing code and its conventions, and the open milestones in Linear. Map dependencies between components; note risks and unknowns. The output is a plan and tickets, never implementation.

### 2. Map the dependency graph

```
Database schema
    ├── API models/types
    │       ├── API endpoints
    │       │       └── Frontend API client
    │       │               └── UI components
    │       └── Validation logic
    └── Seed data / migrations
```

Implementation order follows the graph bottom-up. A dependency's shape is resolved before anything is built on it.

### 3. Cut milestones from the first usable outcome

Find the smallest slice a user (or a consuming service) can exercise end to end; deterministic stubs are allowed when the milestone says so. Cut milestones backwards from the full scope: each adds one usable outcome, has a budget, and a verification command or manual check. Order by user value, then by unblocking other services. The MVP is milestone 1; "infrastructure only" is not a milestone.

### 4. Identify the foundation task

For milestone 1, and any later milestone that introduces new shared definitions: folder structure, shared types, API models and contracts, domain model definitions, test scaffolding, basic startup. One engineer owns it; nothing else in the milestone starts until it is merged. It is the cheapest task in the plan and unblocks all parallelism.

### 5. Slice vertically into stories

Build one complete feature path at a time, not all the schema, then all the API, then all the UI:

```
Bad:   Task 1 entire schema · Task 2 all endpoints · Task 3 all UI · Task 4 connect
Good:  Story 1 user can register (schema + API + UI) · Story 2 user can log in · Story 3 user can create a task
```

A story is a user-observable outcome, INVEST (independent, negotiable, valuable, estimable, small, testable), pointed 1, 2, 3, 5, or 8, split when larger, target median 3. Every design module maps to at least one story; MVP stories come first.

### 6. Write tasks

One goal per task, in one observable sentence. Each carries: acceptance criteria (testable; each gets a test), a verification command that runs in this repository, owned paths, interfaces consumed and provided, the LLD section, dependencies, and points. It depends only on merged tasks or the foundation task, and its PR stays inside the PR size limit and is deployable on its own, flagged off if the feature is incomplete.

Owned paths of concurrent tasks are disjoint. When two tasks need the same file: split the file, extract a shared contract owned by one task, serialise the tasks, or bundle them into one assignment. Never let two engineers edit one file concurrently.

| Points | Files | Scope | Example |
|---|---|---|---|
| 1 | 1 | single function or config change | add a validation rule |
| 2 | 1–2 | one component or endpoint | a new API endpoint |
| 3 | 3–5 | one feature slice | the registration flow |
| 5 | 5–8 | multi-component feature | search with filtering and pagination |
| 8 | 8+ | the maximum; split before it enters a sprint | |

Split further when a task would take more than one focused session, its acceptance criteria need more than three bullets, it touches two independent subsystems, or its title contains "and".

### 7. Plan sprints

Sprints are fixed length (default one week) with a points capacity from the last sprint's delivered points; the first sprint's capacity is an explicit, recorded assumption. Sprint 1 of a milestone starts with the foundation task and then the first usable vertical slice (login API → home API → API client → login screen → home screen). Later sprints each add usable value. Pull tasks by priority until capacity is reached; the rest stay in the milestone backlog. High-risk tasks go early.

Parallelise only where it does not raise integration risk: independent slices and tests for merged features are safe; migrations, shared state, and dependency chains are sequential; anything sharing a contract waits for the contract.

### 8. Order and checkpoint

Every task leaves the app working. A verification checkpoint after every two or three tasks and at every milestone: tests pass, the build is clean, the core flow works end to end, the user reviews before the next phase.

### 9. Record it

- The plan in `tasks/plan.md` (template below). **Never overwrite an incomplete plan**: if the file exists with unchecked work for different work, stop and ask; if it is the same work being revised, update in place.
- Milestones, sprints, stories, and tasks in Linear with labels, points, and `blocks` relations from the foundation task. The plan's task list is an ordered index of Linear ids, never a duplicate checklist. `tasks/todo.md` is used only when no tracker is configured.
- The user reviews and approves the plan before execution.

### 10. Close every sprint with a review

Delivered points; spilled-over points, each re-pointed with the reason, never silently carried; estimation error per ticket with the cause; unplanned work pulled in; blockers hit; the capacity for the next sprint. Posted as the sprint review on the cycle. Re-cut the milestone when the review says the plan is wrong.

### 11. Keep the design current

Update the service `HLD.md` and `LLD.md` with the sections the plan defines.

## Scope discipline

- Requirements are gathered before they are cut; phased PRDs and milestoned stories keep scope creep out.
- Discovered work is classified before it enters scope: MVP requirement, MVP blocker, or later. Only the first two enter automatically; everything else becomes a ticket in the backlog with a reason. Deferred work is always marked explicitly.
- Every story carries the PM's success target from the PRD; engineers do not invent one.
- Where a slice is technically impossible, the ticket says so.

## Milestone record

```markdown
## Milestone <n>: <name>
- Usable outcome: <what a user can do after this>
- Budget: <input>/<output> tokens from the team allocation (cost <x or UNKNOWN>)
- Verification: `<command>` or <manual flow>
- Foundation task: <ticket> (owner)
- Sprints: <sprint 1: dates, capacity, planned points> · <sprint 2: ...>
- Stories and tasks: <ticket ids, with depends-on and points>
- Deferred to later milestones: <list, with reason>
```

## Plan document template

```markdown
# Implementation Plan: <feature>

## Overview
<one paragraph>

## Decisions
<links to the HLD tradeoffs and ADRs this plan builds on>

## Milestones
<milestone records, in order>

## Task index
<ordered Linear ids per milestone and sprint; checkpoints between phases>

## Risks and mitigations
| Risk | Impact | Mitigation |
|---|---|---|

## Open questions
<what needs the user>
```

## Interaction with other skills

- Upstream: `prd-writing` for the stories and success targets; `hld` and `lld` for the design the tasks implement.
- Alongside: `linear` creates the objects this skill defines; `continuous-delivery` decides what a shippable slice is; `development-setup` puts the contract first so parallel tasks do not block.
- Downstream: `test-driven-development` writes the test behind every acceptance criterion; `git-workflow-and-versioning` sets the PR size a task must fit.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll figure it out as I go." | That is how work becomes a tangled mess. Ten minutes of planning saves hours; written plans survive session boundaries. |
| "The tasks are obvious." | Write them down anyway. Explicit tasks surface hidden dependencies and forgotten edge cases. |
| "We'll build everything then integrate." | Integration at the end is where projects die. A usable slice per milestone finds problems early. |
| "Milestone 1 can include the nice UI too." | If it is not needed to exercise the outcome, it is milestone 2. |
| "Everyone can start now, we'll merge conflicts later." | Concurrent edits to shared definitions cause rework. The foundation task removes that. |
| "More engineers in parallel means faster." | Only when it does not raise integration risk. Capacity and disjoint paths keep integration safe. |
| "This discovered work is obviously in scope." | It is classified first; only MVP requirements and MVP blockers enter automatically. |
| "I'll pick a success target myself." | The PM sets it in the PRD. |
| "Budgets are the PM's problem." | The budget decides routing. Without it you cannot route. |
| "We'll just move unfinished tickets to the next sprint." | Silent carry-over hides estimation error. Record the spillover, its reason, and re-point it. |
| "The old plan is stale, I'll replace it." | Unchecked tasks may be mid-build in another session. Stop and ask. |

## Red Flags

- Implementation started without a plan and tickets; tasks in a markdown list but not in Linear.
- Milestone 1 has no usable outcome, only infrastructure; a milestone with no verification command.
- Two ready tasks list the same path; a task depends on something not merged and not the foundation task.
- A task that says "implement the feature" with no acceptance criteria or verification; a story above 8 points in a sprint unsplit; all tasks at the maximum size.
- Sprint 1 of a milestone does not end in something a user can exercise.
- No checkpoints between phases; dependency order not considered; high-risk work left for last.
- Discovered work entering scope without a class; a story with no success target.
- A sprint closed without a review, or with tickets carried over without a reason.
- A `tasks/plan.md` with unchecked tasks for different work overwritten without asking.

## Verification

Before execution starts:

- [ ] Every milestone has a usable outcome, budget, verification, and a foundation task where shared definitions are introduced; MVP stories are first.
- [ ] Every design module maps to a story; every story is INVEST and at most 8 points; dependencies are acyclic.
- [ ] Every task has one goal, testable acceptance criteria, a verification command that runs, owned paths disjoint from every in-flight task, and dependencies only on merged work or the foundation task.
- [ ] Every sprint has a record with capacity and planned points; sprint 1 starts with the foundation task and ends in a usable slice.
- [ ] Deferred and discovered work is classified and marked with a reason; every story carries its success target.
- [ ] The plan is in `tasks/plan.md` with an index of Linear ids, no incomplete plan was overwritten, and the user approved it.

At every sprint close:

- [ ] The review records delivered, spilled (re-pointed, with reasons), estimation error, unplanned work, and next capacity.

## See Also

Acceptance criteria are per task and answer "did we build the right thing?". They sit on top of the project-wide Definition of Done, the standing bar every task clears before it counts as done: `../../references/definition-of-done.md`.
