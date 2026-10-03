---
name: task-ledger
description: Maintains durable work state in the repository as a reviewable task ledger - one record per task with status, dependencies, and an outcome receipt - so any session or agent can find the next ready task, resume in-progress work, and see what is blocked without re-asking a human. Use when work spans multiple sessions or agents and progress must survive, when asked to update a task list or task board, mark a task done or blocked, decide what to work on next, resume previously started work, or keep two agents from grabbing the same task. Not for one-time spec decomposition (planning-and-task-breakdown) or slicing a single implementation (incremental-implementation).
---

# Task Ledger

> Adapted from the task-ledger practice behind [YYLO Ledger](https://github.com/yylo-dev/yylo-ledger) into a tool-agnostic skill: the ledger is plain Markdown in the repo, no CLI required.

## Overview

Keep task state in the repository itself — a `TASK_LEDGER.md` file with one record per task — so progress survives the session that made it. A plan written once (planning-and-task-breakdown) answers "what should we do?"; a ledger answers "where did we get to, what is ready now, and what is stuck?" Every status change is a visible git diff a human can review, and any agent session can reconstruct the working state by reading one file.

## When to Use

- Work spans multiple sessions, days, or agents, and progress must survive session end
- A session starts and needs to know what is in progress, blocked, or ready to pick up
- The user asks to update a task list or board: mark something done, blocked, or deprioritized
- Multiple agents work in the same repo and must not grab the same task
- You are about to stop mid-task and need to hand off cleanly

**When NOT to use:**

- Decomposing a spec into tasks the first time (that is `planning-and-task-breakdown` — its output *seeds* this ledger)
- Deciding how to slice one implementation you are actively writing (that is `incremental-implementation`)
- Recording durable codebase knowledge for future sessions (that is long-lived documentation, not work state)

## The Ledger Format

One file: `TASK_LEDGER.md` at the repo root (or a `tasks/` directory with per-task records for large ledgers). One record per task:

```markdown
## T-003: Add trim option to capitalize()

- **Status:** todo | doing | blocked | done
- **Depends on:** T-001            # task IDs that must be done first
- **Claimed by:** session 2026-09-04   # only while status: doing
- **Updated:** 2026-09-04
- **Acceptance:** capitalize('  hi ', {trim:true}) === 'Hi'; default unchanged; test added
- **Receipt (on done):** commit a1b2c3d — src/capitalize.test.js `trim option` green
```

Rules:

- **IDs are stable.** Never renumber; archived tasks keep their IDs.
- **Status is one of** `todo`, `doing`, `blocked`, `done`. Nothing else.
- **Receipts are evidence, not claims.** A done record quotes the commit, passing test, or command output that proves it. "Fixed" is not a receipt.
- **History is append-only.** When a record changes materially (blocked reason, re-open), append a dated line under the record instead of rewriting what was there. Never delete or edit old receipts.

## The Workflow

### Step 1: Read before acting

At session start on a repo with a ledger, read the whole ledger before proposing any work. Say what you found: how many todo / doing / blocked / done, and which tasks are actually ready. Do not re-ask the user for state the ledger already answers.

### Step 2: Select the next ready task

A task is **ready** when: status is `todo`, every task in `Depends on:` is `done`, and no other ready task has an explicit priority order ahead of it. Blocked and dependency-unmet tasks are not candidates. If two tasks are ready, prefer the one other tasks depend on.

### Step 3: Claim it — exactly one

Move the chosen task to `doing` with `Claimed by: <session id or date>` and update `Updated:` before starting work. Never work on two ledger tasks at once, and never edit a record another session has claimed — surface the conflict to the user instead. A `doing` claim older than the project's normal session gap is stale: mention it, and let the user decide whether to reclaim, rather than silently overwriting it.

### Step 4: Do the task — only the task

Implement the `Acceptance:` criteria and nothing else. Scope discipline belongs to the implementation skills (`incremental-implementation`, `test-driven-development`); the ledger's job is that the *boundary* holds — if the work grew, add a new task to the ledger instead of stretching this one.

### Step 5: Record the outcome

- **Done:** set `Status: done`, write a `Receipt:` quoting the evidence (commit sha, test name, command output).
- **Not finished but useful:** return to `todo` (release the claim) and append a dated note saying exactly where it stopped and what remains.
- **Blocked:** set `Status: blocked` with a one-line reason naming *what unblocks it*. Then check the rest of the ledger — dependencies pointing at the blocked task need to be visible as not-ready, and the user should be told what can still proceed.

### Step 6: Close the session

Before stopping, the ledger must be consistent: one `doing` claim per active session, receipts on every `done`, and the git diff of the ledger readable as a story of this session's change. Commit ledger updates with the work they describe, not in a pile at the end of the week.

## Working with Multiple Agents

- The `doing` + `Claimed by` pair is the lock. Check it before starting work; set it when you start; clear it when you stop.
- Never modify another session's `doing` record. If it blocks you, report the conflict.
- Two `done` receipts for one task means the work collided — surface it, do not pick a winner silently.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll remember to update the ledger after the code" | You won't — session ends, context is dropped. The update *is* the unit of work; do it in the same commit. |
| "The task is 90% done, I'll leave it doing for the next session" | A task is done or it is not. 90% goes back to `todo` with a note of exactly what remains. |
| "It's faster to just fix the blocked task's blocker inline" | You now have two tasks in flight and neither tracked. Ledger the blocker as its own task. |
| "The ledger is out of date, I'll just work from memory" | A stale ledger is a defect to fix first — reconcile it against git history, then work. Working around it makes it permanently wrong. |
| "Nobody else is working right now, no need to claim" | Claims cost one line. The one time you skip it is the time two agents edit the same file. |

## Red Flags

- Ledger unchanged while code changed — work happened outside the ledger
- `done` records with no receipt, or receipts that name no artifact ("it works", "done!")
- A `blocked` task with no reason, or a reason that names no unblocking condition
- `doing` claims from many sessions ago that nobody reconciled
- Dependencies silently ignored — a task started while its `Depends on:` is still `todo`
- The ledger rewritten (receipts edited or deleted) instead of appended to

## Verification

After working with the ledger:

- [ ] Every task you touched has a correct status and an updated `Updated:` date
- [ ] Every `done` you wrote carries a receipt quoting real evidence
- [ ] No other session's claim was modified
- [ ] Ready-task selection respected `Depends on:` and `blocked`
- [ ] The ledger diff reads cleanly: status flips, one appended note per material change
- [ ] A fresh session reading only `TASK_LEDGER.md` would know exactly where things stand

## See Also

- `planning-and-task-breakdown` — produces the task breakdown that seeds this ledger
- `incremental-implementation` — how to execute the task once claimed
- `git-workflow-and-versioning` — commit granularity for ledger + work
