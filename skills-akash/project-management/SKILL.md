---
name: project-management
description: Project management rules for Linear — a plan, storyboard, and tasks for every large requirement, a ticket (with sub-tickets) before any work, verbatim user prompts on tickets, continuous delivery via stories and sprints cut into usable increments, scope discipline with phased PRDs and milestoned stories, classifying discovered work before it enters scope, PM-set success targets, recording skipped steps and overrides on the ticket, and recording design decisions. Load whenever you create, update, or triage a ticket, plan a feature or sprint, receive a new requirement, discover unplanned work, or the user says "track this", "make a ticket", or "plan this out".
---

# Project management

Tool: **Linear for all project management flow**.

## Tickets

| ID | Rule |
| --- | --- |
| M1 | **A plan, storyboard, and tasks for every large requirement; a ticket — sub-tickets included — before any work, filed under the right head.** |
| M2 | **A ticket created from a direct user request carries the prompt verbatim.** |
| M3 | **A loop step that is skipped is recorded on the ticket with the reason.** Overrides of any convention (one-shot development, migration plan changes) are accepted only on an explicit user instruction and are **recorded in `self-improvement.md`**, with a note on the ticket. |
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
| M11 | **Discovered work is classified before it enters scope** (scope discipline in `ORG.md`, not in this repo); **only MVP requirements and MVP blockers enter automatically.** Everything else becomes a ticket for later. |
| M12 | An MVP ships first for any requirement; the original scope continues after (`continuous-delivery`). |
| M13 | **The PM sets success targets for each feature.** |
| M14 | Product and business metrics are decided by the PM and named in the PRD. |

## Decisions

| ID | Rule |
| --- | --- |
| M15 | **Every meaningful design decision records problem, options, choice, rationale, and reversibility; one-way doors are named.** |
| M16 | Scale infrastructure needs a current requirement recorded in `DECISIONS.md`. |
| M17 | Stack deviations are "recorded decisions" (`CLAUDE.md` § Tech stack). |
| M18 | Every HLD, LLD, and PRD is reviewed by the user. |

## Ticket anatomy (minimum)

```
Title: <capability, user-facing>
Head: <epic / project it files under> (M1)
Prompt (verbatim, if from a user request): (M2)
Acceptance criteria: 1..n → each gets a test (`testing` T2)
Success targets (PM): (M13)
Metrics named in PRD: (M14)
Scope class: MVP | MVP blocker | later (M11, M12)
Sub-tickets: (M1)
Skipped steps / overrides + reason: (M3, M5)
Decisions (problem/options/choice/rationale/reversibility): (M15)
```
