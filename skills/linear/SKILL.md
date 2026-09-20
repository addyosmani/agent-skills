---
name: linear
description: "Operates Linear as the organisation's single tracker, in Linear's own vocabulary: a project per feature divided into milestones made of issues, cycles, labels, estimates, relations, triage, templates, and the one workflow every issue follows from request to production; carries the issue rules M1–M7. Use when any persona creates, updates, reads, queries, or reassigns anything in Linear, files a bug or a review finding, posts a status or project update, records a skipped state, sets up a project's Linear team, or the user says \"make a ticket\", \"create a project\", or \"track this\"."
category: tools
---

# Linear

## Overview

Linear is the source of truth for all work: what was asked, what was decided, what changed, and why. This skill speaks Linear's vocabulary so that what you must do is what Linear shows. A **project** is a feature: "a unit of work that has a clear outcome or planned completion date, comprised of issues and optional documents". A project is divided into **milestones**, "different stages in a project's lifecycle", each a usable outcome. An **issue** is the smallest unit of work and the one an agent works on: from a few minutes to several days, always inside one project and one milestone. A **cycle** is the team's time-box. The rules (M1–M7) say when an issue exists and what it carries; the objects table says how that lands in Linear; the workflow says where the work is; the templates in `templates/` say what to write. What a project, its milestones, and its issues contain is decided by `planning-and-task-breakdown`.

## When to Use

- Setting up a project's Linear team: creating the workflow states and labels once.
- Filing the issue before any work starts; creating a project, a milestone, a cycle, or an issue.
- Changing an issue's state, assignee, labels, estimate, milestone, cycle, or relations; posting a status update, a project update, or a blocker.
- Filing a bug or a review finding; recording a skipped state or an override.
- Answering what an issue or a project is about, what changed, or where it is.
- NOT for deciding how a feature is divided into milestones and issues: `planning-and-task-breakdown`.

## Rules

| ID | Rule |
| --- | --- |
| M1 | **An issue before any work, in the right project and milestone.** A large requirement is a project with its milestones and issues in Linear before code; a small one is an issue and starts. |
| M2 | **An issue created from a direct user request carries the prompt verbatim.** |
| M3 | **A workflow state that is skipped is recorded on the issue with the reason.** An override of any convention (one-shot development, a migration plan change) is accepted only on an explicit user instruction and is recorded in `docs/LEARNINGS.md`, with a note on the issue. |
| M4 | **The issue carries the reasoning; the code and the commit carry the issue id.** The issue and the commit message together replace most documentation: do not repeat on one what the other already says. |
| M5 | **Every state change, reassignment, or re-estimate is a status update on the issue**; a `Blocked` update carries the blocker block. A project gets a project update at every milestone close and whenever its health changes. |
| M6 | **Linear is the single place.** No markdown TODO lists, notes files, or chat threads for work; bugs live only as `bug` issues; reviewers file findings as `review` issues. |
| M7 | **Read before write; write, then read back.** Search for the project, milestone, cycle, or issue first and never create a duplicate; quote the identifier of what you created or changed; if a call fails, report the failure and retry once. Never fabricate an identifier. |

## Setup

- **The team.** Every project this organisation runs has one Linear team; its key is recorded in the project's `docs/README.md`. One team per repository unless the user says otherwise.
- **The workflow.** When a project starts, or when the team lacks the states, run `skills/linear/scripts/create-workflow.sh <TEAM-KEY>` with `LINEAR_API_KEY` set. It reads `skills/linear/workflow.json`, enables triage, creates the missing states in their categories, never touches existing ones, and prints the team's states as JSON. Then create the labels below once.
- **The MCP server** (`mcp.json` in this skill) authenticates with OAuth on first use. Tools with only a global config and the CLI fallback are in `../../references/tool-auth.md`. Verify with a read-only call before writing.

## Linear objects and how we use them

| Linear object | What it is | How we use it |
|---|---|---|
| **Workspace** | the container for all teams, projects, and issues | one |
| **Team** | owns its workflow, triage, and cycles | one per repository; its key in `docs/README.md`; the workflow created once by the script |
| **Initiative** | a strategic effort above projects | optional: a roadmap theme grouping several feature projects; the PM owns it |
| **Project** | **a feature**: a clear outcome or completion date, comprised of issues and optional documents; can be shared across teams | one per feature. Lead = the persona driving it; members = the personas working it; description = `templates/project.md`; documents = the PRD, HLD, and ADR links; a target date at the certainty the user has; a project update (`templates/project-update.md`) at every milestone close and when health changes |
| **Milestone** | a stage of a project, dividing its issues; progress is the percentage of its issues started and completed; belongs to one project | **a usable outcome**: something a user can exercise after it; ordered by earliest usable outcome; an optional target date; description = the milestone record from `planning-and-task-breakdown`; the first milestone is the MVP |
| **Issue** | **the fundamental unit of work**: the smallest thing tracked, from minutes to days; in one project and one milestone at a time | **what an agent works on**: one goal in one sentence as the title, `templates/issue.md` as the body, an estimate, owned paths, `blocks` relations; assigned to a cycle when planned; moved through the workflow by the agent doing it |
| **Sub-issue** | an issue under a parent, for "work too large to be a single issue but too small to be a project"; inherits the parent's team, priority, and project | only when an issue must be broken down further; each is a full issue with its own state and estimate; the parent is done when its sub-issues are done, never before |
| **Cycle** | the team's time-boxed period for a pre-defined set of issues; unfinished issues roll over; nothing is assigned to a cooldown | a sprint: fixed length (default one week) with a points capacity; `templates/cycle.md` in its description, the review as a comment at close; a rolled-over issue is re-estimated with the reason |
| **Estimate** | points on an issue | 1, 2, 3, 5, 8; split anything larger |
| **Priority** | urgency on an issue | set by the PM: urgent, high, medium, low, none |
| **Label** | classification on an issue | `service:<name>`, `persona:<name>`, `bug`, `review`, `contract`, `bug:<functional\|regression\|performance\|security\|data\|ux\|flaky-test\|environment>`, `severity:<blocker\|high\|medium\|low>`; created once per team |
| **Relation** | a link between issues | `blocks` / `blocked by` for dependencies (the foundation issue blocks every dependent one), `related` for context, `duplicate` before cancelling |
| **Triage** | the team's inbox for new work | a direct user request lands in `Triage` as a request (`templates/request.md`: feature, product change, tech improvement, chore, question) with the prompt verbatim, then is classified into a project or an issue |
| **Template** | a body per object | `templates/` in this skill: request, project, issue, bug, status update, project update, cycle; read the one you need when you write |
| **Attachment** | a link on an issue | the PR (title starts with the issue id); verdicts mirrored as status updates |
| **Comment** | a record on an issue or a cycle | status updates (`templates/status-update.md`), the cycle review, the blocker block; never chat that belongs elsewhere |
| **Workflow state** | where the work is | the Workflow below |

A bug is an issue with the `bug` label (`templates/bug.md`), related to the issue it affects. A review finding is an issue with the `review` label, related to the PR's issue. The foundation issue of a milestone carries the `contract` label and `blocks` every dependent issue; nothing parallel starts before it lands. A story in the PRD is delivered by one or more issues in the milestone that ships it.

## Workflow

One workflow per team, the whole cycle from the user's request to production, as ordered Linear workflow states in Linear's categories (Triage, Backlog, Unstarted, Started, Completed, Canceled). It is the development loop: there is no other. `workflow.json` defines it and the script creates it; this table says what each state means. Every issue follows it, but not every issue needs every state: skip what the work does not need and record every skip on the issue with the reason (M3).

| Category | State | The issue is here while | It leaves when |
|---|---|---|---|
| Triage | `Triage` | a request arrived (`templates/request.md`), in the user's words, not yet classified | it has a kind, a persona, a scope class, and a size: small → `Todo` as an issue, large → `Spec` as a project's planning issue, a chore → `Todo` |
| Backlog | `Backlog` | accepted, in a project or not, not planned into a cycle | it is pulled into a cycle |
| Unstarted | `Todo` | ready: the design section, the contract, and the dependencies it needs exist | an agent declares and starts |
| Started | `Spec` | intent is being pinned down: interview, refine, spec; a feature gets its phased PRD | the user reviewed the PRD, or the spec is on the issue |
| Started | `Design` | HLD, LLD, ADRs; the contracts and the DB model | the user reviewed the design and the contracts exist |
| Started | `Planned` | the project's milestones and issues are cut and the foundation issue identified | the issues are in a cycle with owned paths |
| Started | `In Progress` | code and tests, in the agent's own environment | the PR is raised |
| Started | `In Review` | the PR is open; findings inline and as `review` issues; the author resolves every thread | approved, or review made optional on the issue and CI green |
| Started | `QA` | independent verification of a milestone's usable outcome, end to end and under concurrency | QA verified; a failure is a `bug` issue |
| Started | `Merged` | in `main`, releasable, changelog line added; build and deploy pending | it is deployed |
| Started | `Blocked` | it cannot continue; the status update carries the blocker block | the blocker is resolved; it returns to the state it left |
| Completed | `Done` | deployed and exercised where the issue says (production by default) | never; a regression is a new `bug` |
| Canceled | `Canceled` · `Duplicate` | it will not be done, or another issue tracks it (related as duplicate) | |

Typical paths, the skipped states recorded:

- **A bug**: `Triage` → `Todo` → `In Progress` → `In Review` → `Merged` → `Done`.
- **A small issue**: `Todo` → `In Progress` → `In Review` → `Merged` → `Done`.
- **A feature**: one planning issue runs `Triage` → `Spec` → `Design` → `Planned` and produces the project, its milestones, and their issues; then each issue runs `Todo` → `In Progress` → `In Review` → `Merged` → `Done`; the milestone's usable outcome gets a `QA` issue before the milestone closes; the project completes when its last milestone's issues are `Done`.
- **A one-shot override** (M3): `Todo` → `In Review`, the skipped states named in the note.

The agent doing the work moves the issue, with a status update on every move (M5). A parent issue never runs ahead of its sub-issues; a milestone closes when its issues are `Done` and its outcome is verified, with a project update.

## Interaction with other skills

- `planning-and-task-breakdown` decides what the project, its milestones, its cycles, and its issues contain; this skill creates and tracks them in Linear's terms.
- `github` links the PR to the issue; `test-driven-development` writes the test behind every acceptance criterion.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a small change, I'll file the issue after." | An issue comes before any work; without it nobody could see the work in progress and the skipped states were never recorded (M1, M3). |
| "The prompt is long, I'll paraphrase it." | The verbatim prompt is what the issue is judged against later. Paste it (M2). |
| "The user said to one-shot it, so the convention is gone." | An override is accepted only on an explicit user instruction and is recorded in `docs/LEARNINGS.md` with a note on the issue (M3). |
| "I'll explain the reasoning in a code comment." | The issue carries the reasoning; the code carries the issue id (M4). |
| "A one-line comment is enough for this state change." | Without the structured update nobody can later tell why the issue moved (M5). |
| "I'll track this small thing in the PR description / a notes file." | Linear is the single place; things that live elsewhere get lost and cannot be queried, assigned, or linked (M6). |
| "The MCP call failed, I'll note the id I expected." | A guessed identifier corrupts every report that quotes it. Report the failure and retry once (M7). |
| "A feature is just a big issue." | A feature is a project: it has milestones, a lead, documents, and project updates; an issue is one unit of work inside a milestone. |
| "I'll nest sub-issues to organise the milestone." | Milestones organise a project's issues. A sub-issue is only for an issue too large to be one issue and too small to be a project. |
| "The team's states are close enough; I'll map ours onto them." | Run the script; it adds what is missing and touches nothing else. Every project uses the same workflow. |

## Red Flags

- Work started with no issue, or a direct request with no verbatim prompt (M1, M2).
- A state skipped, or a convention overridden, with nothing on the issue or in `docs/LEARNINGS.md` (M3).
- A commit or PR with no issue id (M4).
- A state change without a status update; a `Blocked` issue without the blocker block; a milestone closed without a project update (M5).
- A bug outside the tracker or without reproduction and severity; work in a markdown list only (M6).
- A quoted identifier that was never read back; a duplicate project, milestone, cycle, or issue (M7).
- A team whose states are not the workflow; a feature tracked as one issue instead of a project; an issue in a project with no milestone; an issue with no owned paths, no outcome, or no verification surface; an issue rolled over without a reason.
- An issue `In Review` with no PR link, or a merged PR whose issue did not move; a cycle closed without a cycle review.

## Verification

- [ ] The team has the workflow states and labels; its key is in `docs/README.md`.
- [ ] The issue exists in the right project and milestone before any work; a large requirement has its project, milestones, and issues (M1).
- [ ] A request is filed with `templates/request.md` and carries the prompt verbatim; skipped states and overrides are recorded (M2, M3).
- [ ] The issue is in the workflow state its work is in; a skipped state has a status update with the reason (M3, M5).
- [ ] Every issue follows `templates/issue.md` with an estimate and owned paths; an issue delivering a story has acceptance criteria, a scope class, and a success target; every project follows `templates/project.md` with its documents attached.
- [ ] Every state change has a status update; `Blocked` updates carry the blocker block; every closed milestone has a project update (M5).
- [ ] Every bug is a `bug` issue with the full template and labels; every review finding is a `review` issue (M6).
- [ ] Every cycle has a cycle record and, when closed, a cycle review.
- [ ] Every object was read back and its identifier quoted; no duplicate was created (M7).
