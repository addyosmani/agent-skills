---
name: vertical-slicing
description: Decomposes work into thin end-to-end slices that each deliver verifiable, demoable functionality through every layer. Use when breaking down a spec or plan into tasks, when a task feels like it builds an entire layer before any user-facing behavior is visible, or when the implementation order is unclear.
---

# Vertical Slicing

## Overview

A vertical slice cuts through all layers of the stack — schema, API, logic, UI, tests — for one narrow piece of behavior, and delivers something demoable at the end. The alternative, horizontal slicing, builds one entire layer before moving to the next. Horizontal slicing feels organized but routinely produces integration failures at the end, tests that test imagined behavior, and work that cannot be reviewed or demoed mid-stream.

This skill is the decomposition companion to `incremental-implementation` (which governs how to execute a slice) and `planning-and-task-breakdown` (which governs how to order slices). Use this skill when breaking down a spec or requirement into tasks.

## When to Use

Use this skill when:
- A spec or requirement exists and you need to determine how to break the work into tasks
- A task title describes a layer ("Add database schema", "Build API endpoints") rather than a behavior
- The implementation order is unclear or risky
- You're about to hand tasks to an agent and want to prevent integration failures

**When NOT to use:**
- Single-function changes that don't span multiple layers
- A task already decomposed into well-specified behaviors by the caller
- Pure infrastructure work with no user-facing or system-observable behavior

## The Core Distinction

```
HORIZONTAL (avoid):
  Task 1: All database schemas
  Task 2: All API endpoints
  Task 3: All UI components
  Task 4: Connect everything and hope

VERTICAL (use this):
  Slice 1: User can create a task        ← schema + API + UI + tests
  Slice 2: User can view their tasks     ← query + API + UI + tests
  Slice 3: User can delete a task        ← delete + API + UI + tests
```

Each vertical slice is independently demoable. If the project stops after Slice 1, something real was shipped.

## Slice Types

Not all slices are the same. Three types matter:

### Tracer Bullet

The first slice in any feature. Its job is not to be complete — it is to prove the path exists end-to-end. A tracer bullet slice is intentionally thin: the minimum surface area that touches every layer and confirms they connect.

```
Tracer bullet for a task management feature:
  - Schema: one table, two columns (id, title)
  - API: one endpoint, POST /tasks
  - UI: a text input and a submit button
  - Test: user enters a title and submits; task appears in response
```

If the tracer bullet fails, you discover the integration problem before investing in any real functionality. Ship the tracer bullet first, always.

### HITL Slice (Human-in-the-Loop)

A slice that requires a human decision or action before it can be completed. Examples: an architectural decision, a design review, an external approval, a manual verification step that cannot be automated.

Mark these explicitly so they are not handed to an AFK agent that will block.

### AFK Slice (Away From Keyboard)

A slice that an agent can implement, test, and merge without human interaction. The majority of slices should be AFK. If a slice requires human judgment mid-implementation, it is either a HITL slice or it is not well-enough specified.

**How to decide:**

| Use HITL when... | Use AFK when... |
| ---------------- | --------------- |
| Acceptance criteria reference taste or judgment ("looks correct", "makes sense") | Acceptance criteria are fully mechanical (test passes, API returns X) |
| An external approval or design review is required | No external approvals needed |
| The decision depends on information the agent does not have at slice start | The agent has all information required at slice start |

If uncertain, mark as HITL. A false HITL blocks briefly; a false AFK blocks indefinitely.

## How to Slice

### Step 1: Identify the behaviors

From the spec or task, list every piece of user-visible or system-observable behavior. Not layers — behaviors.

```
Spec: "Users can manage their tasks"

Behaviors:
- Create a task with a title
- View a list of tasks
- Mark a task as complete
- Delete a task
- Filter tasks by status
```

### Step 2: Order by dependency and risk

- **Risk order:** Put the riskiest slice first. A risky slice is one where the approach is uncertain, the integration is novel, or failure would invalidate subsequent slices. Discovering a risk early is cheap. Discovering it after five slices is expensive.
- **Tracer bullet first:** For any new feature, the tracer bullet IS the riskiest slice — it is the one that proves the end-to-end path even exists. So "tracer bullet first" is a special case of risk-first, not a competing rule. Start with the tracer bullet, then order remaining slices by dependency and residual risk.
- **Dependency order:** If Slice B cannot exist without Slice A (e.g. "mark complete" requires a task to exist), A comes first.

### Step 3: Write each slice

Each slice needs:

| Field | Content |
| ----- | ------- |
| **Title** | One short verb phrase describing the behavior: "User can create a task" |
| **Type** | AFK or HITL |
| **Layers touched** *(optional)* | Which layers this slice passes through (schema, API, logic, UI, tests). Useful when the team is unfamiliar with the stack; omit if it pushes focus toward implementation over behavior. |
| **Acceptance criteria** | Specific, testable conditions — not implementation steps |
| **Blocked by** | Which prior slices must complete first, or "None" |
| **Demoable as** | What you can show or verify when this slice is complete |

### Step 4: Validate the slices

Before handing to an agent or starting implementation, check each slice against:

- [ ] Does completing this slice produce something demoable or verifiable on its own?
- [ ] Does it pass through every layer it needs to (not just one layer)?
- [ ] Could an AFK agent complete it without a human decision mid-way?
- [ ] Is the acceptance criteria testable without knowing implementation internals?
- [ ] Is the title a behavior, not a layer? ("User can create a task" not "Add task schema")

## Slice Sizing

The right size for a slice is the smallest surface that produces demoable behavior.

**Too large:** A slice that takes more than one focused session to implement, or that touches two or more independent subsystems.

**Too small:** A slice that does not produce anything demoable. If completing the slice leaves the system in an untestable intermediate state, it is not a slice — it is a horizontal layer pretending to be a slice.

When a slice feels too large, ask: "What is the minimum behavior that would be worth showing to a human?" That is the boundary of the slice.

## Relationship to Other Skills

| Skill | Relationship |
| ----- | ------------ |
| `planning-and-task-breakdown` | Slices are the output format for a plan. Use vertical slicing to determine what the tasks in the plan are. |
| `incremental-implementation` | Governs how to execute a single slice: implement → test → verify → commit. |
| `test-driven-development` | Each slice follows red-green-refactor. The tracer bullet is the first red-green cycle. |
| `spec-driven-development` | Slices are derived from the spec. The spec defines behaviors; slicing determines how to deliver them incrementally. |
| `ubiquitous-language` | Slice titles and acceptance criteria use the canonical vocabulary from `CONTEXT.md`. |

## Common Rationalizations

| Rationalization | Reality |
| --------------- | ------- |
| "It's faster to build the whole database first" | Faster to type, slower to discover that the API you designed does not fit the UI you need. |
| "We can't demo anything until the UI is done" | The tracer bullet proves the path. A form that submits and shows a response is demoable. |
| "These layers are too coupled to slice vertically" | That coupling is the problem. Vertical slicing forces you to confront it early instead of at integration time. |
| "The slices are too thin to be useful tasks" | A thin slice that delivers demoable behavior is exactly the right size. Thin is not small — it is precise. |
| "I'll add the tests after all slices are done" | Tests written after the fact test imagined behavior. Tests written per slice test actual behavior. |

## Red Flags

- A task title names a layer, not a behavior ("Add database schema", "Build API endpoints")
- The first task in a plan does not produce anything demoable
- No task is marked as a tracer bullet
- All tasks depend on all previous tasks (no parallel work is possible)
- Acceptance criteria describe implementation steps, not observable outcomes
- A slice cannot be completed without a human decision mid-way but is marked AFK

## Verification

Before handing slices to an agent:

- [ ] First slice is a tracer bullet that proves end-to-end connectivity
- [ ] Every slice title describes a behavior, not a layer
- [ ] Every slice has acceptance criteria stated as observable outcomes
- [ ] Every slice is independently demoable or verifiable when complete
- [ ] HITL and AFK types are correctly assigned
- [ ] Dependency order is correct (blockers listed explicitly)
- [ ] No slice is large enough to require more than one focused implementation session
