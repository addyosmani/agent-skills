---
name: workflow-tracker
description: Keeps the user oriented across the DEFINE→PLAN→BUILD→VERIFY→REVIEW→SHIP lifecycle via a TodoWrite list mapped to workflow phases. Use at the start of any development task to maintain workflow visibility.
---

# Workflow Tracker

Maintains a TodoWrite list mapped to the six workflow phases so the user always sees where they are and what comes next — without needing to memorize the workflow.

## How It Works

### On task start — initialize the phase TodoWrite list

When any task begins, immediately create a TodoWrite list with these items. Mark phases already complete as `completed`, the current phase as `in_progress`, and future phases as `pending`:

```
[ ] DEFINE  — spec written and approved
[ ] PLAN    — plan written and approved
[ ] BUILD   — all tasks complete
[ ] VERIFY  — verification output shown
[ ] REVIEW  — code review passed
[ ] SHIP    — branch merged / PR created
```

If a plan exists with multiple tasks, expand BUILD into one item per task:

```
[ ] BUILD — task 1: <task name from plan>
[ ] BUILD — task 2: <task name from plan>
...
```

Update items in real time as gates are passed — do not batch updates.

## Phase Reference

| Phase | Entry gate | Exit gate |
|-------|-----------|-----------|
| DEFINE | Task described | Spec approved by user |
| PLAN | Spec approved | Plan approved by user |
| BUILD | Plan approved | All tasks verified complete |
| VERIFY | Tasks complete | Verification output shown |
| REVIEW | Verification passing | Code review GO |
| SHIP | Review GO | Merged / PR created |

## Trigger

This skill is a companion — it activates alongside any lifecycle skill:
- `brainstorming` / `spec-driven-development` → initialize tracker at DEFINE
- `writing-plans` / `planning-and-task-breakdown` → update tracker to PLAN
- `incremental-implementation` / `test-driven-development` → update tracker to BUILD
- `verification-before-completion` → update tracker to VERIFY
- `code-review-and-quality` → update tracker to REVIEW
- `shipping-and-launch` / `finishing-a-development-branch` → update tracker to SHIP
