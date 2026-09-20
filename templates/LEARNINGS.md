# Learnings

What this project taught the agents about the personas, skills, and conventions. Append-only, newest last; nothing here is a rule by itself. The maintainer reads it to change what a note points at.

## What counts

The test is one question: **would this change a rule, a skill, or a persona?** If yes, record it. If no, it is the ordinary work of the task and belongs on the ticket, not here. A user's request, a preference about one output, a decision that already has an ADR, or a discovery that a skill already covers is not a learning.

| Kind | Record when |
|---|---|
| `feedback` | The user corrects something a rule, skill, or persona told you to do, or corrects the same kind of output twice. Not a one-off preference about one piece of work. |
| `gap` | A rule or skill was silent, ambiguous, or wrong for the situation you were in, and you had to decide without it. |
| `workaround` | You wrote code, a script, or a manual step to get around a missing capability, a tool limitation, or a hole in the conventions. |
| `override` | The user explicitly directed you to do something a convention forbids or does differently. Do it, then record it; the same override twice means the rule is wrong. |

## Procedure

1. Notice the trigger while it is happening.
2. Append the note below immediately; tell the user in one line that a learning note was added.
3. An override is also noted on the ticket.
4. Never delete or edit a note; it is the record of why a skill changed.

## Learning notes

Fill every field you can; leave a field blank rather than dropping it.

```
✍️ Learning notes added:
Learnt from: <person or agent>
Kind: feedback | gap | workaround | override
Skill: <skill name, or the AGENTS.md section>
Ticket / PR: <id or number, if any>
Filename: <path, if the note is about one>
Timestamp: <YYYY-MM-DD HH:MM:SS>
Notes: <what was learnt, in one or two sentences; for an override, the user's direction verbatim and what it replaced>
```
