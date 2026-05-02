---
name: kb-end-session
description: Close the current session journal, append the Next entry point, commit, and trigger kb-curate --scope session for the just-closed bullets. Use at the end of a productive session.
---

# KB end-session

## Overview

A session without a closed journal leaves the next session blind. This skill closes the current day's journal, records the entry point for the next session, commits the journal to git, and triggers `kb-curate --scope session` to promote the day's bullets from L1 to the vault. It is the mandatory last step of every productive session.

Companion to `/save-plan` (which handles plan-mode artifacts) and `kb-curate` (which does the L1→L2 promotion). See also `skills/kb-curate/SKILL.md` for the curate pipeline.

## When to Use

- At the end of every productive session where commits were made or decisions were taken.
- Run AFTER all productive commits of the day so the journal captures everything.
- Do NOT use if the session produced no commits and no decisions (nothing to close).

Do NOT use as a substitute for `/kb-curate` on a broader scope — this skill is session-scoped only.

## Process

### Step 1: Validate prerequisites

Read `.claude/kb-config.json`. If absent, exit with:

> `kb-end-session: project has no kb-config.json — run batuta-project-hygiene mode=project-retrofit first.`

Resolve today's journal path: `docs/sessions/<YYYY-MM-DD>-<slug>.md`. If the file is empty (no bullets), exit with:

> `no productive bullets today, nothing to close.`

### Step 2: Append the Next block

Append a closing block to the journal:

```markdown

## Next

Next session entry point: <docs/plans/active/<file>.md @ <task-id>> OR <no pending plans>
```

If the entry point is uncertain, prompt the operator interactively before writing.

**Idempotency**: if `## Next` already exists in the journal, skip the append but continue to Steps 3 and 4.

### Step 3: Commit the journal

Stage and commit the closed journal:

```bash
git add docs/sessions/<file>.md
git commit -m "chore(housekeeping): close session journal for <YYYY-MM-DD>"
```

### Step 4: Trigger curate

Invoke `/kb-curate --scope session` to classify the bullets just written. The curate skill is itself idempotent — running it again on the same journal is safe.

### Step 5: Report

Print a short summary:
- Bullet count in the journal
- Draft files pending operator review after curate
- Vault commit hash (from `git -C <vault_root> log --oneline -1`)

## Red Flags

- Journal has bullets but `## Next` already exists from a previous run — safe to skip append, but verify the entry point is still accurate.
- `kb-curate --scope session` exits with errors — surface them; do not mark the session closed until curate completes.
- `docs/sessions/` directory missing — `batuta-project-hygiene mode=project-retrofit` was not run.

## Verification

- `grep -l '## Next' docs/sessions/<today>-*.md` returns the file.
- `git log --oneline -1` shows `chore(housekeeping): close session journal for <YYYY-MM-DD>`.
- Re-running `/kb-end-session` on the same journal produces 0 net changes (idempotent).
