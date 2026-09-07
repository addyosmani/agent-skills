---
name: planning-and-task-breakdown
description: Break an approved spec into ordered implementation tasks with dependencies, acceptance criteria, and verification. Use when substantial work needs task planning, decomposition, or parallel agent coordination. Reuse existing executable plans.
---

# Planning and Task Breakdown

## Overview

Make implementation order, acceptance criteria, dependencies, and ownership clear enough to execute. Reuse the user's plan and existing project artifacts.

## When to Use

Use when substantial work has meaningful dependencies, needs decomposition, or benefits from independent agents. Reuse an existing executable plan.

## Establish the plan

Inspect relevant code, interfaces, tests, and prior decisions before asking about discoverable facts. Identify the smallest useful tasks, deliver vertical slices where practical, and resolve shared contracts before work that depends on them. Explore a consequential technical uncertainty early.

Task size follows coherent behavior and risk, not a fixed number of files, lines, hours, or checklist items. A mechanical cross-file change may remain one task. Split work when separate acceptance criteria or dependency boundaries make implementation and verification clearer.

For each meaningful task identify:

- Outcome and observable acceptance criteria.
- Dependencies and likely affected subsystem.
- Relevant verification and required project gates.
- Ownership when multiple workers are involved.

Put checkpoints at integration boundaries or significant risks, not every fixed number of tasks. Include only checks that apply; a unit-level change need not launch an application or run end-to-end tests.

## Authorization and execution

The runtime determines whether the session is in Plan Mode. This skill does not change modes. If the user asks only for a plan, return a plan. If implementation is authorized, complete necessary planning and continue without a new approval round. Honor explicit review gates and pause only work dependent on a material unresolved choice.

Existing authorization persists across tasks. It does not cover unrelated external actions. Distinguish an implementation decision within scope from a change to requirements, exposure, or permissions that needs user input.

## Persistence and task tracking

Write plan or task files only when requested or required by project conventions. Follow existing locations. If persistence is requested without a convention, use `tasks/plan.md` and, only when a separate checklist adds value, `tasks/todo.md`.

When the project designates an external tracker, reference existing item IDs instead of duplicating task state. Create or update remote items only when that action is authorized; a mention of a tracker does not authorize external writes or messages. Keep a requested local plan as an ordered index when task state already lives elsewhere. Do not assume commands such as `/build` exist.

Before writing an existing plan or task list, inspect its current work state. Revise the same task in place when authorized. Preserve incomplete plans for different work; do not overwrite, rename, delete, or bulk-close their tasks. Use an authorized separate destination, or ask about the conflicting artifact while continuing independent work.

## Coordinating agents

Delegate a concrete, bounded task when independent work can save time or improve evidence and the runtime permits delegation. Do not spawn an agent just to wait for its answer while duplicating its investigation. Keep useful local work and stay available to the user.

- **Ownership:** assign each worker an outcome and owned files or subsystem. Identify shared interfaces and avoid concurrent edits to the same files. Serialize dependent changes or use separate worktrees when appropriate and authorized. Shared-workspace workers must preserve others' uncommitted changes.
- **Assignment:** include requirements, acceptance criteria, relevant files, essential prior decisions, access and mutation restrictions, and expected output. A scout gets a narrow read-only question; a worker gets a scoped implementation; a reviewer gets the artifact and contract without a suggested verdict.
- **Context:** use a fresh assignment such as `fork_turns: "none"` when sufficient context can be supplied explicitly. Inherit history when earlier decisions materially affect the task. Restate essential restrictions in fresh-context assignments. Follow the tool schema's constraints on history and model overrides.
- **Effort and model:** inherit the session's model and effort by default. Change effort only when authorized and supported by the runtime, based on the task's difficulty. Do not hardcode model families, roster sizes, or unsupported effort values.
- **Concurrency:** inspect available slots, counting the coordinator and active descendants. Keep dependency chains sequential; release or reuse workers when assignments finish. Do not exceed the runtime's limits or bypass delegation restrictions.
- **Delegation boundary:** ordinary scouts, workers, and reviewers are leaves: explicitly tell them to complete the assignment directly and not spawn agents. Allow a worker to coordinate further help only when it has a bounded coordination assignment, available capacity, and permission under the runtime.
- **Communication:** send dependency findings directly to the relevant teammate when supported, and keep the coordinator aware of changes affecting scope or integration. Report blockers early and include evidence rather than only conclusions. Do not turn inter-agent communication into messages to outside people.
- **Integration:** the coordinator checks outputs against acceptance criteria, reconciles disagreements using source evidence, integrates changes, and runs relevant combined checks. A worker's success report is not proof the integrated result works.

If agents are unavailable, complete the work sequentially where possible. If an independent check was explicitly required but unavailable, report that limitation accurately while completing unaffected work.

## Verification

The plan has executable tasks in dependency order, meaningful checks, and clear ownership. Existing decisions and permissions are respected. Completion means acceptance criteria met and relevant required checks passed, with remaining limitations stated. No new approval, artifact, full-suite run, or agent is required solely to satisfy this template.

## Common Rationalizations

“Every task needs a checkpoint and approval” — place checks at integration and risk boundaries, honoring actual review gates.

## Red Flags

Overlapping worker edits; duplicated investigations; unsupported tool assumptions; unnecessary plan artifacts.
