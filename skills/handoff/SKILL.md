---
name: handoff
description: Compacts the current conversation into a handoff document so another agent (or a future session) can resume the work without re-deriving context. Use when the session is running low on context, you are about to /clear or /compact, the task spans multiple sessions, or you are passing work to a different agent or person.
---

# Handoff

> Inspired by Matt Pocock's [`handoff` skill](https://github.com/mattpocock/.agents). Adapted here as a model-agnostic, process-driven skill aligned with the agent-skills anatomy.

## Overview

A handoff document captures the *state of the work*, not a transcript of the conversation. The next agent starts cold — it has no memory of what was tried, what was decided, or what is half-finished. A good handoff lets it resume in one read instead of re-deriving context from scratch (or worse, repeating work and undoing decisions).

The discipline is selective compaction: write down what only lives in this conversation, and reference everything that already lives in a durable artifact. A handoff that restates the PRD, the plan, and the diff is noise; a handoff that says "here's where we are, here's what's left, here's the landmine" is signal.

## When to Use

- Context is running low and you are about to `/compact` or `/clear`
- The task won't finish in this session and needs to continue later
- You are passing work to a different agent, model, or teammate
- A long debugging or exploration session uncovered state worth preserving (dead ends, working hypotheses, environment quirks)
- Before a risky operation, so a fresh session can pick up if this one is interrupted

**When NOT to use:**

- The task is complete and verified — write a commit message or PR description instead, not a handoff
- Everything needed is already in durable artifacts (spec, plan, ADR, issue, commits) — point to them; don't duplicate
- The next step is trivial and self-evident from the code — a handoff doc adds overhead without value

## The Handoff Process

### Step 1: Choose the Destination

Write the document to the operating system's temporary directory, **not** the current workspace — a handoff is scratch state, not a tracked artifact, and committing it pollutes the repo.

```
- macOS / Linux:  $TMPDIR or /tmp/handoff-<short-task-name>.md
- Windows:        %TEMP%\handoff-<short-task-name>.md
```

Tell the user the exact path so they can pass it to the next session.

### Step 2: Capture Only What Lives in This Conversation

Reference durable artifacts by path or URL — do not restate their contents:

| Already captured in… | Reference it, don't copy it |
|---|---|
| PRD / spec | Link the file or issue |
| Plan / task breakdown | Link the plan; note which task is in progress |
| ADRs | Link the decision record |
| Commits / diffs | Give the SHA or branch name |
| Open issues / PRs | Give the URL |

What belongs in the handoff is the context that exists *only* in the conversation: the current intent, what's in flight, what was ruled out and why, and the next concrete action.

### Step 3: Write the Document

Use this structure. Keep it tight — every line must earn its place.

```markdown
# Handoff: <task name>

## Goal
One or two sentences: what we are ultimately trying to achieve.

## Current State
Where things stand right now. What works, what's half-done, what's untouched.

## What's Been Done
- Decisions made (and the reasoning, if non-obvious)
- Approaches tried and rejected — with WHY, so the next agent doesn't retry them

## Next Steps
1. The immediate next concrete action
2. Then the following one
Ordered, specific, actionable.

## Landmines & Context
- Environment quirks, flaky steps, non-obvious constraints
- "Don't touch X — it breaks Y"
- Anything that would cost the next agent an hour to rediscover

## References
- spec: path/or/url
- plan: path/or/url
- branch / commit: <name or SHA>
- related issues/PRs: url

## Suggested Skills
Which agent-skills the next session should invoke and when,
e.g. "resume with `incremental-implementation`; run `test-driven-development` before the auth slice."
```

### Step 4: Redact Sensitive Information

Before saving, scrub anything that should not be written to disk in plaintext:

- API keys, tokens, passwords, connection strings
- Personally identifiable information (PII)
- Internal hostnames or secrets surfaced during debugging

Replace with a placeholder and a note on where to obtain the real value (`<DB_PASSWORD — see 1Password "staging-db">`).

### Step 5: Tailor to the Next Session's Focus

If the user said what the next session is for, bias the document toward it. A handoff aimed at "finish the migration" leads with migration state and next steps; one aimed at "review what we built" leads with decisions and rationale. Don't write a generic dump when you know the destination.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just paste the whole conversation" | A transcript forces the next agent to re-derive state. Compact to decisions, current state, and next steps — that's the entire point. |
| "Let me restate the plan and spec to be safe" | Duplicated content goes stale the moment the source changes. Reference artifacts by path; only capture what isn't already written down. |
| "I'll save it in the repo so it's easy to find" | Handoffs are scratch state. Committing them pollutes history and risks leaking secrets. Use the OS temp dir. |
| "The next agent can figure out what I tried" | It can't — rejected approaches live only in this conversation. Omitting them means the next session repeats your dead ends. |
| "Redaction is overkill for a temp file" | Temp files get shared, pasted, and synced. Scrub secrets and PII regardless of destination. |
| "It's obvious what to do next" | It's obvious to *you*, holding full context. Write the next concrete action explicitly — the cold-start reader has none of it. |

## Red Flags

- The handoff is as long as the conversation — you transcribed instead of compacting
- It restates the spec, plan, or diff that already exists elsewhere
- It was written into the workspace/repo instead of the temp directory
- Secrets, tokens, or PII appear in plaintext
- "Next steps" are vague ("continue the work") instead of a specific next action
- Rejected approaches are missing, so the next agent will retry them
- No references section — the next agent can't find the spec, branch, or issues

## Verification

Before handing off, confirm:

- [ ] Document saved to the OS temp directory, not the workspace
- [ ] Exact file path reported to the user
- [ ] Durable artifacts (spec, plan, ADR, commits, issues) are referenced, not duplicated
- [ ] Decisions and rejected approaches are captured with their reasoning
- [ ] Next steps are ordered, specific, and actionable
- [ ] Landmines and non-obvious constraints are documented
- [ ] A "Suggested Skills" section tells the next session which skills to invoke
- [ ] All secrets and PII are redacted with pointers to the real source
- [ ] The document is tailored to the next session's stated focus (if one was given)
