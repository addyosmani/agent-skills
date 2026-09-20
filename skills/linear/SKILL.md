---
name: linear
description: "How Linear is used as the organisation's single tracker, with the ticket rules M1–M7 — a ticket before any work, the user's prompt verbatim, skipped loop steps and overrides recorded, the ticket carrying the reasoning and the code the ticket id, a structured status update on every state change, nothing tracked outside Linear, never a fabricated identifier — plus the mapping of features, milestones, sprints, stories, tasks, bugs, and review findings onto Linear objects and the exact templates for each, through the Linear MCP server. Use when any persona creates, updates, reads, queries, or reassigns a ticket, files a bug or a review finding, posts a status update, records a skipped step, or the user says \"make a ticket\" or \"track this\"."
category: tools
---

# Linear

## Overview

Linear is the source of truth for all work: what was asked, what was decided, what changed, and why. The rules below (M1–M7) say when a ticket exists and what it carries; the concept mapping and templates say how that lands in Linear through the MCP server. What the tickets contain for a large requirement (milestones, sprints, stories, tasks) is decided by `planning-and-task-breakdown`. Swapping the tool means another skill with the same rules and templates.

## When to Use

- Filing the ticket before any work starts; creating a project, milestone, cycle, story, or task.
- Changing a ticket's state, assignee, labels, or relations; posting a status update or a blocker.
- Filing a bug or a review finding; recording a skipped loop step or an override.
- Answering what a ticket was about or what changed.
- NOT for deciding how work is sliced into milestones, sprints, and tasks: `planning-and-task-breakdown`.

## Rules

| ID | Rule |
| --- | --- |
| M1 | **A ticket, sub-tickets included, before any work, filed under the right project.** A large requirement has its plan, milestones, sprints, stories, and tasks in Linear before code; a small one gets a ticket and starts. |
| M2 | **A ticket created from a direct user request carries the prompt verbatim.** |
| M3 | **A loop step that is skipped is recorded on the ticket with the reason.** An override of any convention (one-shot development, a migration plan change) is accepted only on an explicit user instruction and is recorded in `docs/LEARNINGS.md`, with a note on the ticket. |
| M4 | **The ticket carries the reasoning; the code and the commit carry the ticket id.** The ticket and the commit message together replace most documentation: do not repeat on one what the other already says. |
| M5 | **Every state change, reassignment, or re-pointing is a structured status update** (template below): by whom, what changed, why, the evidence, the next action; a `Blocked` update carries the blocker block. |
| M6 | **Linear is the single place.** No markdown TODO lists, notes files, or chat threads for work; bugs live only as `bug` issues; reviewers file findings as `review` issues. |
| M7 | **Read before write; write, then read back.** Search for the project, milestone, cycle, or issue first and never create a duplicate; quote the identifier of what you created or changed; if a call fails, report the failure and retry once. Never fabricate an identifier. |

## Setup

The Linear MCP server (`mcp.json` in this skill) authenticates with OAuth on first use. Tools with only a global config and the CLI fallback are in `../../references/tool-auth.md`. Verify with a read-only call before writing.

## Concept mapping

| Org concept | Linear object | Notes |
|---|---|---|
| Feature | Project | One per feature |
| Milestone | Project milestone | Name = usable outcome; description = the milestone record |
| Sprint | Cycle | Fixed length, points capacity; sprint record in the description, sprint review as a comment at close |
| Story | Issue (parent) | User-observable outcome; tasks are sub-issues |
| Task | Issue (sub-issue) | Title = the outcome in one sentence |
| Bug | Issue with label `bug` | Bug template; `bug:<type>` and `severity:*` labels; linked to the story |
| Review finding | Issue with label `review` | Filed by a reviewer, linked to the PR and the ticket |
| Foundation task | Issue with `blocks` relations to every dependent task | Label `contract`; nothing parallel starts before it lands |
| State | Workflow state | `Backlog`, `Todo`, `In Progress`, `In Review` (PR raised), `QA`, `Done`, `Blocked`, `Canceled`; add missing states once per team |
| Pull request | Attachment / link | PR title starts with the issue id; verdicts mirrored as status updates |
| Points | Estimate | 1, 2, 3, 5, 8; split anything larger |
| Labels | `service:<name>`, `persona:<name>`, `bug`, `review`, `contract`, `bug:<functional\|regression\|performance\|security\|data\|ux\|flaky-test\|environment>`, `severity:<blocker\|high\|medium\|low>` | Create missing labels once per team |

## Ticket anatomy

Every ticket carries these, filled to the degree the work type warrants. Not every field is mandatory; use judgement, and say when a field does not apply.

| Field | Answers |
|---|---|
| **Outcome** | what should be true when the work is done |
| **Verification surface** | the test, benchmark, report, artifact, command output, or source material that proves it |
| **Constraints** | what must not regress while the agent works |
| **Boundaries** | which files, tools, data, repositories, or resources the agent may use |
| **Iteration policy** | how the agent decides what to try next after each attempt |
| **Blocked stop condition** | when the agent stops and reports that no defensible path remains under the current limits |

The anatomy bends to the type: a story adds the user story, acceptance criteria (each gets a test), and the success target; a bug adds reproduction, expected and actual, evidence, and severity; a chore adds only what a reader needs. Add a section when a ticket demands one; if it keeps recurring, propose it for this page.

## Templates

### Story

```markdown
As a <user>, I want <capability> so that <outcome>.
User prompt (verbatim, when direct): "<...>"
Milestone / phase: <names>
Scope class: MVP | MVP blocker | later
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
Owned paths: <disjoint from every in-flight task>
Iteration policy: <how to decide what to try next after each attempt>
Blocked stop condition: <when to stop and report that no defensible path remains>
Loop steps skipped / overrides: <step: reason, or none>
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

### Status update (M5)

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
- Capacity: <points> (basis: last sprint delivered <points> | assumption)
- Planned: <points> across <n> tickets

### Sprint review
- Delivered: <points> (<n> tickets)
- Spilled over: <points> — <ticket: reason, re-pointed to n>
- Estimation error: <ticket: estimated n, actual m, cause>
- Unplanned work: <ticket: points, why>
- Blockers hit: <ticket: blocker type, resolution>
- Next sprint capacity: <points> (basis)
```

## Interaction with other skills

- `planning-and-task-breakdown` decides what the milestones, sprints, stories, and tasks contain; this skill creates and tracks them.
- `github` links the PR to the ticket; `test-driven-development` writes the test behind every acceptance criterion.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a small change, I'll file the ticket after." | A ticket comes before any work; without it nobody could see the work in progress and the skipped steps were never recorded (M1, M3). |
| "The prompt is long, I'll paraphrase it." | The verbatim prompt is what the ticket is judged against later. Paste it (M2). |
| "The user said to one-shot it, so the convention is gone." | An override is accepted only on an explicit user instruction and is recorded in `docs/LEARNINGS.md` with a note on the ticket (M3). |
| "I'll explain the reasoning in a code comment." | The ticket carries the reasoning; the code carries the ticket id (M4). |
| "A one-line comment is enough for this state change." | Without the structured update nobody can later tell why the ticket moved (M5). |
| "I'll track this small thing in the PR description / a notes file." | Linear is the single place; things that live elsewhere get lost and cannot be queried, assigned, or linked (M6). |
| "The MCP call failed, I'll note the id I expected." | A guessed identifier corrupts every report that quotes it. Report the failure and retry once (M7). |

## Red Flags

- Work started with no ticket, or a direct request with no verbatim prompt (M1, M2).
- A loop step skipped, or a convention overridden, with nothing on the ticket or in `docs/LEARNINGS.md` (M3).
- A commit or PR with no ticket id (M4).
- A state change without a structured status update; a `Blocked` issue without the blocker block (M5).
- A bug outside the tracker or without reproduction and severity; tasks in a markdown list only (M6).
- A quoted identifier that was never read back; a duplicate project, milestone, or issue (M7).
- A ticket with no outcome or no verification surface.
- A ticket `In Review` with no PR link, or a merged PR whose ticket did not move; a cycle closed without a sprint review.

## Verification

- [ ] The ticket exists under the right project before any work, with sub-tickets for a large requirement (M1).
- [ ] A ticket from a direct request carries the prompt verbatim; skipped steps and overrides are recorded (M2, M3).
- [ ] Every task carries the ticket anatomy; every story has acceptance criteria, a scope class, and a success target.
- [ ] Every state change has a structured status update; `Blocked` updates carry the blocker block (M5).
- [ ] Every bug is a `bug` issue with the full template and labels; every review finding is a `review` issue (M6).
- [ ] Every cycle has a sprint record and, when closed, a sprint review.
- [ ] Every object was read back and its identifier quoted; no duplicate was created (M7).
