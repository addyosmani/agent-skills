---
name: project-management
description: Project management rules for Linear — a plan, storyboard, and tasks for every large requirement, a ticket (with sub-tickets) before any work, verbatim user prompts on tickets, continuous delivery via stories and sprints cut into usable increments, scope discipline with phased PRDs and milestoned stories, classifying discovered work before it enters scope, PM-set success targets, recording skipped steps and overrides on the ticket, and recording design decisions. Use when you create, update, or triage a ticket, plan a feature or sprint, receive a new requirement, discover unplanned work, or the user says "track this", "make a ticket", or "plan this out".
category: process
---

# Project management

## Overview

Tool: **Linear for all project management flow**. The rules below (M1–M18) say what a ticket must carry, how scope is cut and delivered, and how decisions are recorded; the `linear` skill maps them onto Linear objects and templates.

## When to Use

- Creating, updating, or triaging a ticket, or filing sub-tickets.
- Planning a feature or a sprint, or receiving a new requirement.
- Discovering unplanned work and deciding whether it enters scope.
- Recording a skipped loop step, an override, or a design decision.
- NOT for operating the Linear MCP server itself: that is the `linear` skill.
- NOT for slicing a service into milestones or ordering tasks: `milestone-planning` and `planning-and-task-breakdown`.

## Tickets

| ID | Rule |
| --- | --- |
| M1 | **A plan, storyboard, and tasks for every large requirement; a ticket — sub-tickets included — before any work, filed under the right head.** |
| M2 | **A ticket created from a direct user request carries the prompt verbatim.** |
| M3 | **A loop step that is skipped is recorded on the ticket with the reason.** Overrides of any convention (one-shot development, migration plan changes) are accepted only on an explicit user instruction and are **recorded in `docs/LEARNINGS.md`**, with a note on the ticket. |
| M4 | The ticket carries the reasoning behind code; the code carries the ticket id. Linear tickets and commit messages proxy for the majority of the docs, so **focus on creating good tickets and good commit messages.** |
| M5 | Where slicing is technically impossible, say so on the ticket. |
| M6 | Reviewers file findings as Linear issues. Security audits are a later ticket. |
| M7 | Every commit references its ticket. |
| M8 | No secrets in tracker comments (`coding-standards`). |

## Scope and delivery

| ID | Rule |
| --- | --- |
| M9 | **A feature is delivered continuously: stories and sprints are cut so the user gets usable increments, always.** |
| M10 | **Scope creep is prevented by phased PRDs and milestoned stories. Requirements are gathered before they are cut.** |
| M11 | **Discovered work is classified before it enters scope** (scope discipline in `project/AGENTS.md`); **only MVP requirements and MVP blockers enter automatically.** Everything else becomes a ticket for later. |
| M12 | An MVP ships first for any requirement; the original scope continues after (`continuous-delivery`). |
| M13 | **The PM sets success targets for each feature.** |
| M14 | Product and business metrics are decided by the PM and named in the PRD. |

## Decisions

| ID | Rule |
| --- | --- |
| M15 | **Every meaningful design decision records problem, options, choice, rationale, and reversibility; one-way doors are named.** |
| M16 | Scale infrastructure needs a current requirement recorded in `DECISIONS.md`. |
| M17 | Stack deviations are "recorded decisions" (the project's `docs/ARCHITECTURE.md`). |
| M18 | Every HLD, LLD, and PRD is reviewed by the user. |

## Ticket anatomy (minimum)

```
Title: <capability, user-facing>
Head: <epic / project it files under> (M1)
Prompt (verbatim, if from a user request): (M2)
Acceptance criteria: 1..n → each gets a test (`end-to-end-testing` T2)
Success targets (PM): (M13)
Metrics named in PRD: (M14)
Scope class: MVP | MVP blocker | later (M11, M12)
Sub-tickets: (M1)
Skipped steps / overrides + reason: (M3, M5)
Decisions (problem/options/choice/rationale/reversibility): (M15)
```

### Goal anatomy

Every ticket carries these, filled to the degree the work type warrants. Not every field is mandatory; use judgement, and say when a field does not apply.

| Field | Answers |
|---|---|
| **Outcome** | what should be true when the work is done |
| **Verification surface** | the test, benchmark, report, artifact, command output, or source material that proves it |
| **Constraints** | what must not regress while the agent works |
| **Boundaries** | which files, tools, data, repositories, or resources the agent may use |
| **Iteration policy** | how the agent decides what to try next after each attempt |
| **Blocked stop condition** | when the agent stops and reports that no defensible path remains under the current limits |

### By work type

The anatomy bends to the type. A feature story adds the user story and acceptance criteria; a bug adds reproduction, expected and actual, evidence, and severity; a chore adds only what a reader needs. Add a section when a ticket demands one; if it keeps recurring, propose it for this page.

### Changes

Every state change, reassignment, or re-pointing is a structured status update on the ticket: by whom, what changed, why, the evidence, the next action, and the blocker definition when blocked. The commit message and the ticket together replace most documentation; do not repeat on one what the other already says.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a small change, I'll file the ticket after." | A ticket comes before any work, sub-tickets included (M1). |
| "I'll summarize the user's request on the ticket." | A ticket from a direct request carries the prompt verbatim (M2). |
| "Skipping review this once needs no note." | A skipped loop step is recorded on the ticket with the reason (M3). |
| "The user said to one-shot it, so the convention is gone." | An override is accepted only on an explicit user instruction and is recorded in `docs/LEARNINGS.md` with a note on the ticket (M3). |
| "I'll explain the reasoning in the code comments." | The ticket carries the reasoning; the code carries the ticket id (M4). |
| "This can't be sliced, so I'll just build it whole." | Say so on the ticket (M5). |
| "I'll fix the review finding inline instead of filing it." | Reviewers file findings as Linear issues (M6). |
| "I'll ship the whole feature when it's all done." | Stories and sprints are cut so the user gets usable increments, always (M9); an MVP ships first (M12). |
| "This discovered work is obviously in scope." | Discovered work is classified before it enters scope; only MVP requirements and MVP blockers enter automatically (M11). |
| "I'll pick a success target myself." | The PM sets success targets and names the metrics in the PRD (M13, M14). |
| "The decision is obvious, no need to record options." | Every meaningful decision records problem, options, choice, rationale, and reversibility (M15). |
| "The HLD is done; the user can read it later." | Every HLD, LLD, and PRD is reviewed by the user (M18). |

## Red Flags

- Work started, or code written, with no ticket or with sub-tickets missing (M1).
- A ticket from a direct user request with a paraphrased prompt (M2).
- A loop step skipped, or a convention overridden, with nothing on the ticket or in `docs/LEARNINGS.md` (M3).
- A commit with no ticket id (M7).
- A secret in a tracker comment (M8).
- A feature with no usable increment until the end (M9), or no MVP first (M12).
- Discovered work entering scope without a scope class (M11).
- A feature with no PM-set success target or PRD-named metrics (M13, M14).
- A design decision without options, rationale, or reversibility; a one-way door not named (M15).
- Scale infrastructure with no current requirement in `DECISIONS.md` (M16).
- An HLD, LLD, or PRD treated as final without user review (M18).
- A state change with no structured status update (Changes).

## Verification

- [ ] The ticket exists under the right head before any work, with sub-tickets for a large requirement, plus a plan, storyboard, and tasks (M1).
- [ ] A ticket from a direct request carries the prompt verbatim (M2).
- [ ] Skipped steps and overrides are on the ticket with the reason; overrides are in `docs/LEARNINGS.md` (M3, M5).
- [ ] Acceptance criteria are numbered and each maps to a test (`end-to-end-testing` T2).
- [ ] Success targets and PRD-named metrics are on the ticket (M13, M14).
- [ ] The ticket carries its scope class: MVP, MVP blocker, or later (M11, M12).
- [ ] Decisions on the ticket record problem, options, choice, rationale, and reversibility (M15).
- [ ] The goal anatomy fields are filled or marked as not applying.
- [ ] Every state change since the last check has a structured status update (Changes).
