---
name: workflow-tracker
description: Use at the start of any development task alongside lifecycle skills to track progress across SPEC→PLAN→BUILD→TEST→REVIEW→SIMPLIFY→SHIP phases via a TodoWrite list. Phases derive from the slash commands in `.claude/commands/` — see `references/lifecycle.md` for the canonical order and per-command phase sets.
---

# Workflow Tracker

Companion skill — activates alongside lifecycle skills to maintain a live `TodoWrite` list mapped to the active workflow phases so the user always sees where they are and what comes next.

Requires the `TodoWrite` tool.

## Activation

Invoke alongside any lifecycle skill or slash command:

| Slash command | Phases to initialize |
|--------------|----------------------|
| `/spec` | SPEC → PLAN → BUILD → TEST → REVIEW → SIMPLIFY → SHIP |
| `/plan` | PLAN → BUILD → TEST → REVIEW → SIMPLIFY → SHIP |
| `/build` | BUILD → TEST → REVIEW → SIMPLIFY → SHIP |
| `/test` | TEST → REVIEW → SIMPLIFY → SHIP |
| `/review` | REVIEW → SIMPLIFY → SHIP |
| `/code-simplify` | SIMPLIFY → SHIP |
| `/ship` | SHIP |

The canonical phase list and order is defined in `references/lifecycle.md`. If new slash commands are added, update that file — this skill derives its phase sets from it.

## Initialization

When a task begins, immediately create a `TodoWrite` list containing only the phases relevant to the invoked command (see table above). Use these statuses:

- `in_progress` — the current phase
- `pending` — future phases
- `completed` — phases already done

**Example: `/review` invoked**

```
[in_progress] REVIEW — code review passed
[pending]     SIMPLIFY — complexity reduced
[pending]     SHIP — branch merged / PR created
```

**Example: `/spec` invoked**

```
[in_progress] SPEC — spec written and approved
[pending]     PLAN — plan written and approved
[pending]     BUILD — all tasks complete
[pending]     TEST — verification output shown
[pending]     REVIEW — code review passed
[pending]     SIMPLIFY — complexity reduced
[pending]     SHIP — branch merged / PR created
```

If a formal plan from `planning-and-task-breakdown` exists with multiple tasks, expand BUILD into one `TodoWrite` item per task:

```
[pending] BUILD — task 1: <task name from plan>
[pending] BUILD — task 2: <task name from plan>
...
```

## Phase Gates

| Phase | Entry gate | Exit gate |
|-------|-----------|-----------|
| SPEC | Task described | Spec approved by user |
| PLAN | Spec approved | Plan approved by user |
| BUILD | Plan approved | All tasks verified complete |
| TEST | Tasks complete | Verification output shown and passing |
| REVIEW | Verification passing | Code review GO |
| SIMPLIFY | Review GO | Simplification complete or explicitly skipped |
| SHIP | Simplify complete | Merged / PR created |

## Real-time Updates

Update `TodoWrite` items in real time as gates are passed — do not batch updates.

Mark a phase `completed` the moment its exit gate is reached. Mark the next phase `in_progress` immediately after.

## Phase Regression

Phases are not always linear. When a phase must be revisited (e.g., TEST fails and work returns to BUILD):

1. Set the previously-completed phase back to `in_progress`
2. Do **not** add a duplicate item — update the existing one
3. When it passes again, mark it `completed` and re-advance

## Completion

The tracker is complete when SHIP is marked `completed`.
