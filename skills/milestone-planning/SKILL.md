---
name: milestone-planning
description: Breaks an approved implementation plan for one service into milestones ordered by earliest usable outcome, then into fixed-length sprints with a points capacity, stories, and tasks in the project-management tool, with a foundation task first, and closes each sprint with a review of delivered, spilled-over, and mis-estimated points. Use when an engineer has a reviewed design for a large piece of work and needs to turn it into incremental delivery, or when a sprint starts or ends.
category: process
---

# Milestone Planning

## Overview

Favor quick, incremental delivery over a complete feature. The hierarchy is project → milestones → sprints → tasks. Each milestone gives a user something they can use; each sprint is a fixed time box with a points capacity; each task has one goal and disjoint owned paths; shared definitions are built first by one engineer so everyone else can work in parallel. Sprint reviews make spillover and estimation error visible so the next sprint is planned better.

## When to Use

- The PE's HLD, domain models, and implementation plan are approved and your service has work in it.
- A sprint starts and needs planning, or ends and needs a review.
- A milestone closes and the next one needs planning.
- Scope changes mid-milestone and the plan must be re-cut.
- NOT before design approval; planning against an unapproved design creates rework.
- NOT for cross-service sequencing: the PM owns that, using the PE's implementation plan.

## Process

1. **Read** the approved HLD, domain model, key interfaces, and the implementation plan sections for your service; the PRD acceptance criteria; the convention skills the work needs and the service's open milestones in Linear.
2. **Find the first usable outcome**: the smallest slice through your service that a user (or a consuming service) can exercise end to end. Deterministic stubs are allowed when the milestone says so.
3. **Cut milestones** backwards from the full scope: each adds one usable outcome, has a budget, and a verification command or manual check. Order by user value, then by unblocking other services.
4. **Identify the foundation task** for milestone 1 (and any later milestone that introduces new shared definitions): folder structure, class interfaces, API models, contracts, test scaffolding. Assign it to one engineer. Nothing else in the milestone starts until it is merged.
5. **Write stories** (user-observable outcomes) and **tasks** (one goal, acceptance criteria, owned paths, interfaces consumed/provided, LLD section, verification command, dependencies). Stories are INVEST (independent, negotiable, valuable, estimable, small, testable) and pointed 1, 2, 3, 5, or 8; anything larger is split; target median 3. Owned paths of concurrent tasks are disjoint. When two tasks need the same file: split the file, extract a shared contract owned by one task, serialize the tasks, or bundle them into one assignment; never let two engineers edit one file concurrently.
5b. **Split each milestone into sprints.** Sprints are fixed length (default one week) with a points capacity from the last sprint's delivered points (first sprint: an explicit assumption, recorded). Sprint 1 of a milestone starts with the foundation task (repository structure, shared types, API interfaces, domain model definitions, basic startup) and then the first usable vertical slice (for example login API → home API → API client → login screen → home screen). Later sprints each add usable value. Pull tasks by priority until capacity is reached; the rest stay in the milestone backlog. Parallelism only where it does not raise integration risk.
6. **Create them in the tracker**: milestone, sprints (cycles) with the sprint record, stories, tasks with labels and points; link the foundation task as `blocks` for its dependents. Follow the project-management interface.
6b. **Close every sprint with a review**: delivered points, spilled-over points (carried to the next sprint, with the reason per ticket), estimation error (tickets whose actual effort or re-pointing differed from the estimate, with the cause), unplanned work pulled in, and the capacity for the next sprint. Post the sprint review as a structured comment on the cycle or milestone. Spillover is re-pointed, not silently carried.
7. **Update** the service `HLD.md`/`LLD.md` with the sections the design defines.

## Milestone record

```markdown
## Milestone <n>: <name>
- Usable outcome: <what a user can do after this>
- Budget: <input>/<output> tokens from the team allocation (cost <x or UNKNOWN>)
- Verification: `<command>` or <manual flow>
- Foundation task: <ticket> (owner: <agent_id>)
- Sprints: <sprint 1: dates, capacity, planned points> · <sprint 2: ...>
- Tasks: <ticket list, with depends-on and points>
- Deferred to later milestones: <list>
```

## Sprint record and review

```markdown
## Sprint <n> — <start> → <end> — milestone <name>
- Goal: <what is usable at the end of the sprint>
- Capacity: <points> (basis: last sprint delivered <points> | assumption)
- Planned: <points> across <n> tickets

### Review (posted at sprint end)
- Delivered: <points> (<n> tickets)
- Spilled over: <points> — <ticket: reason, re-pointed to n>
- Estimation error: <ticket: estimated n, actual m, cause>
- Unplanned work pulled in: <ticket: points, why>
- Blockers hit: <ticket: blocker type, resolution>
- Next sprint capacity: <points> (basis)
```

## Story and milestone quality bar

Before execution starts, verify: every design module maps to at least one story; every story is INVEST and at most 8 points; dependencies are acyclic; owned paths do not conflict within a sprint; the foundation task is small and first; verification commands exist and run; MVP stories are first; deferred work is explicitly marked with a reason; the milestone record lists its sprints, each with capacity, planned points, verification, critical path, and blockers.

## Task quality bar

- Goal is one sentence and observable.
- Acceptance criteria are testable.
- Owned paths are listed and disjoint from other in-flight tasks.
- Verification command exists and runs in this repository.
- Small enough that its PR stays inside the size guards of `git-workflow-and-versioning` P11, and deployable on its own (flagged off if the feature is incomplete).
- Depends only on merged tasks (or the foundation task).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We'll build everything then integrate." | Integration at the end is where projects die. A usable slice per milestone finds problems early. |
| "Everyone can start now, we'll merge conflicts later." | Concurrent edits to shared definitions cause rework. The foundation task removes that. |
| "The foundation task is overhead." | It is the cheapest task in the plan and unblocks all parallelism. |
| "Milestone 1 can include the nice UI too." | If it is not needed to exercise the outcome, it is milestone 2. |
| "Budgets are the PM's problem." | The budget decides routing. Without it you cannot route. |
| "More engineers in parallel means faster." | Parallelism helps only when it does not raise integration risk. Sprint capacity and disjoint paths keep integration safe. |
| "We'll just move unfinished tickets to the next sprint." | Silent carry-over hides estimation error. Record the spillover, its reason, and re-point it. |

## Red Flags

- Milestone 1 has no usable outcome, only "infrastructure".
- Two ready tasks list the same path.
- A task depends on something not yet merged and not the foundation task.
- A milestone has no verification command.
- Tasks exist in a markdown list but not in the tracker.
- A story larger than 8 points is in a sprint unsplit.
- Sprint 1 of a milestone does not end in something a user can exercise.
- A sprint closed without a review, or with tickets carried over without a reason.

## Verification

- [ ] Every milestone has a usable outcome, budget, verification, and a foundation task where shared definitions are introduced.
- [ ] Every task meets the quality bar and exists in the tracker with labels and dependencies.
- [ ] Linear reflects the plan.
- [ ] No two concurrent tasks share an owned path.
- [ ] Every sprint has a record with capacity and planned points, and every closed sprint has a review with delivered, spilled, and estimation-error figures.
