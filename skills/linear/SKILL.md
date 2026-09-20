---
name: linear
description: "Operates Linear as the organization's project-management tool through the Linear MCP server: projects for features, milestones, cycles as sprints, structured story, task, and bug issues carrying the goal anatomy and the user's verbatim prompt, structured status updates on every state change, blocker definitions, labels, and comments. Use when any persona needs to create, update, read, query, or reassign tracker items, file a bug, post a status update, or link a task to its Linear issue."
category: tools
---

# Linear

## Overview

The Linear ticket is the source of truth for everything; the rules a ticket follows and the ticket anatomy are `project-management` (M1–M18). This skill maps the organization's concepts onto Linear objects and gives the exact templates. Swapping the tool means another skill with the same templates.

## When to Use

- Filing the ticket before any work starts; creating a project, milestone, cycle, story, or task.
- Changing a ticket's state, assignee, labels, or relations; posting a status update or a blocker.
- Filing a bug or a review finding.
- NOT for tracking work anywhere else: no markdown TODO lists or chat threads.
- NOT for fabricating identifiers: if the MCP call fails, report the failure.

## Setup

The Linear MCP server (`mcp.json` in this skill) authenticates with OAuth on first use. Tools with only a global config and the CLI fallback are in `../../references/tool-auth.md`. Verify with a read-only call before writing.

## Process

1. **Read before write.** Search for the project, milestone, cycle, or issue first. Never create a duplicate.
2. **File the ticket before working** (`project-management` M1), under the right project, with the template for its type; a direct user request goes in verbatim (`project-management` M2).
3. **Record the loop steps you skip** on the ticket before code (`project-management` M3).
4. **Write, then read back** the created or updated object and quote its identifier.
5. **Post a structured status update on every state change, reassignment, or re-pointing** (`project-management`, ticket anatomy § Changes); when the new state is `Blocked`, the update carries the blocker block.
6. **Query by structure.** Answer "what was this ticket about" or "what changed" from the description and the status updates in order, never from chat.

## Concept mapping

| Org concept | Linear object | Notes |
|---|---|---|
| Feature | Project | One per feature |
| Milestone | Project milestone | Name = usable outcome |
| Sprint | Cycle | Fixed length, points capacity; sprint record in the description, sprint review as a comment at close |
| Story | Issue (parent) | User-observable outcome; tasks are sub-issues |
| Task | Issue (sub-issue) | Title = the outcome in one sentence |
| Bug | Issue with label `bug` | Bug template; `bug:<type>` and `severity:*` labels; linked to the story |
| Review finding | Issue with label `review` | Filed by a reviewer, linked to the PR and the ticket |
| Contract task | Issue with `blocks` relations to every dependent task | Label `contract`; nothing parallel starts before it lands |
| State | Workflow state | `Backlog`, `Todo`, `In Progress`, `In Review` (PR raised), `QA`, `Done`, `Blocked`, `Canceled`; add missing states once per team |
| Pull request | Attachment / link | PR title starts with the issue id; verdicts mirrored as status updates |
| Points | Estimate | 1, 2, 3, 5, 8; split anything larger |
| Labels | `service:<name>`, `persona:<name>`, `bug`, `review`, `contract`, `bug:<functional\|regression\|performance\|security\|data\|ux\|flaky-test\|environment>`, `severity:<blocker\|high\|medium\|low>` | Create missing labels once per team |

## Ticket templates

The anatomy is `project-management` § Ticket anatomy; it bends to the work type (§ By work type). Fill what applies and say when a field does not.

### Story

```markdown
As a <user>, I want <capability> so that <outcome>.
User prompt (verbatim, when direct): "<...>"
Milestone / phase: <names>
Acceptance criteria:
- [ ] <criterion>
Success target: <from the PRD>
Services: <names>
PRD: <link>
Tasks: <sub-issue ids>
```

### Task

```markdown
User prompt (verbatim, when direct): "<...>"
Outcome: <what is true when done>
Verification surface: <test, benchmark, command output, artifact, or source that proves it>
Constraints: <what must not regress>
Boundaries: <files, tools, data, repositories the agent may use>
Iteration policy: <how to decide what to try next after each attempt>
Blocked stop condition: <when to stop and report that no defensible path remains>
Loop steps skipped: <step: reason, or none>
Persona: <who works it>
Depends on: <issue ids>
Design: <HLD/LLD section, or none>
PR: <url once raised>
```

### Bug

```markdown
Summary: <one sentence, observable>
Bug type: functional | regression | performance | security | data | ux | flaky-test | environment
Severity: blocker | high | medium | low
Discovered by: <persona or user> via <QA | end-to-end test | user report | monitoring | review>
Discovered on: <date> at <commit or environment>
Affects: <story ids>, service <name>
Reproduction:
1. <step>
Expected: <behavior>
Actual: <behavior>
Evidence: <log, screenshot, test output>
Prove-It test: <path, fails on current code: yes | not yet>
Suspected cause: <or unknown>
RCA required: yes | no
```

### Status update (every state change, reassignment, or re-pointing)

```markdown
### Status update
- By: <persona> on <model / effort / harness>
- Change: <field> <old> → <new>
- PR: <url, or n/a> — review: <opened | changes requested (n) | approved | merged>
- Reason: <one or two sentences>
- Evidence: <command → result, commit, or n/a>
- Next action: <what happens next and who does it>
- Blocker (only when Blocked):
  - Type: product ambiguity | technical decision | dependency | environment | ownership | external service | missing access
  - Dependency: <ticket, contract, service, or person this waits on>
  - Requirement: <what must be true or decided for work to continue>
  - Owner: <who resolves it>
```

### Sprint record (cycle description) and sprint review (comment at close)

```markdown
## Sprint <n> — <start> → <end> — milestone <name>
- Goal: <what is usable at the end>
- Capacity: <points>
- Planned: <points> across <n> tickets

### Sprint review
- Delivered: <points> (<n> tickets)
- Spilled over: <points> — <ticket: reason, re-pointed to n>
- Estimation error: <ticket: estimated n, actual m, cause>
- Unplanned work: <ticket: points, why>
- Next sprint capacity: <points>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll create the issue after the code is done." | Then nobody could see the work in progress, and the skipped steps were never recorded. |
| "The prompt is long, I'll paraphrase it." | The verbatim prompt is what the ticket is judged against later. Paste it. |
| "I'll track this small thing in the PR description." | The tracker is the single place. Small things that live elsewhere get lost. |
| "The MCP call failed, I'll note the id I expected." | A guessed identifier corrupts every report that quotes it. Report the failure and retry once. |
| "A one-line comment is enough for this state change." | Without the structured update nobody can later tell why the ticket moved. |
| "I'll keep the bug in a notes file for now." | Bugs live only as tickets. A file cannot be queried, assigned, or linked. |

## Red Flags

- Work started with no ticket, or a direct request with no verbatim prompt.
- A ticket with no outcome or no verification surface.
- A `Blocked` issue without the blocker block.
- A state change without a structured status update.
- A bug outside the tracker, or without reproduction and severity.
- A cycle closed without a sprint review.
- A ticket `In Review` with no PR link, or a merged PR whose ticket did not move.

## Verification

- [ ] The object exists in Linear and its identifier is quoted.
- [ ] Every task carries the goal anatomy and, when direct, the verbatim prompt; skipped loop steps are recorded.
- [ ] Every state change has a structured status update; `Blocked` updates carry the blocker block.
- [ ] Every bug is a `bug` issue with the full template and labels.
- [ ] Every cycle has a sprint record and, when closed, a sprint review.
- [ ] No duplicate project, milestone, or issue was created.
