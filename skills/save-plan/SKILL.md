---
name: save-plan
description: Copy the most recently modified plan-mode plan from ~/.claude/plans/ to the project-local docs/plans/active/ directory so it persists with the repo via git. Use after exiting plan mode.
---

# Save plan

## Overview

Plan-mode in Claude Code writes plans to `~/.claude/plans/` — a user-global ephemeral location that does not travel with the repo. This skill copies the most recently modified plan to `docs/plans/active/<YYYY-MM-DD>-<slug>.md` so it is committed, versioned, and discoverable in the next session. The implementer pre-flight check rejects any slice whose plan is not at the project-local path.

Why a slash command rather than a hook: `ExitPlanMode`'s tool input does not expose the plan file path, making a `PreToolUse` hook fragile. The slash command is operator-invoked but deterministic and idempotent. See `docs/adr/0005-plan-mode-persistence-mechanism.md`.

## When to Use

- Immediately after exiting plan mode, before starting implementation.
- Any time a plan exists in `~/.claude/plans/` that should be committed with the repo.

Do NOT use to archive plans — archival (moving from `active/` to `archive/`) is a separate housekeeping step that happens after the slice ships.

## Process

### Step 1: Locate the source plan

```bash
ls -t ~/.claude/plans/*.md 2>/dev/null | head -1
```

If empty, abort:

> `No plan found in ~/.claude/plans/. Run plan mode first.`

### Step 2: Verify the project skeleton

Confirm `docs/plans/active/` exists in the current project root. If absent:

> `Project lacks doc skeleton. Run batuta-project-hygiene mode=project-retrofit first, then re-run /save-plan.`

Stop — do not create the directory inline; the hygiene skill handles it.

### Step 3: Compute the target path

- **Date**: `date +%Y-%m-%d` (Bash)
- **Slug**: if `$ARGUMENTS` is non-empty, use it (kebab-case, ≤ 50 chars, strip leading/trailing hyphens). If empty, take the source filename basename (strip `.md`) and keep only the first 3–4 meaningful words separated by hyphens (drop Claude Code's random suffix like `-refactored-lobster`).
- **Target**: `docs/plans/active/<YYYY-MM-DD>-<slug>.md`

### Step 4: Idempotency check

If the target file already exists, abort:

> `File exists at <target>. Choose a different slug or rename the existing file first.`

Do NOT overwrite — overwriting silently destroys a plan the audit chain may have referenced.

### Step 5: Copy and verify

```bash
cp "<source>" "<target>"
```

Verify target file size matches source (`wc -c` on both — expect identical bytes).

### Step 6: Confirm to operator

Print:

> `Plan saved to <target>. Source preserved at <source> as user-global backup.`

Suggest next steps: the implementer pre-flight will pick up the project-local plan automatically. The user-global copy can be deleted manually if desired (`rm <source>`).

## Red Flags

- `~/.claude/plans/` contains multiple `.md` files from concurrent sessions — the `head -1` picks the most-recently-modified file. Verify it matches the session just closed before proceeding.
- Target path collides with an existing plan of a different scope — do not overwrite; pick a distinct slug.
- `docs/plans/active/` has more than one file — typically a smell that a prior slice closed without archiving its plan.

## Verification

- `ls docs/plans/active/` shows exactly one file with today's date and the correct slug.
- `wc -c <source> <target>` shows identical byte counts.
- `git status` shows the new plan file as untracked (ready to commit with the first implementation commit).
