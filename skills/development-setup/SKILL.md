---
name: development-setup
description: How development is set up before any code is written, run, tested, or debugged, with rule ids DS1–DS9 — every agent's own isolated environment (a git worktree at the project root, never inside the harness or agent-brain directory; its own Docker containers; LocalStack for AWS; a database snapshot or seed script; optional private observability for debugging; cleanup after the PR) and how parallel work is set up so nobody blocks (API contract first with the frontend mocking it and the backend returning labelled mock data, backend services working concurrently once the DB model and contracts are fixed, a dependency's shape and type resolved before anything else). Use when starting any task that writes, runs, tests, or debugs code, or when several agents, or the frontend and the backend, work on the same repository at once.
category: delivery
---

# Development setup

## Overview

What is in place before development starts: an environment that belongs to this agent alone, so several agents work on one repository without interfering and the user's checkout stays untouched, and the contracts that let frontend, backend, and dependent services proceed in parallel.

## When to Use

- At the start of every task that writes, runs, tests, or debugs code.
- Before running the app or tests for a ticket.
- When several agents work on the same repository, or the frontend and the backend build the same feature at once.
- NOT for the branch, commit, and PR rules (`git-workflow-and-versioning`), how to slice and ship the work (`continuous-delivery`), or the testing rules (`test-driven-development`).

## Environment

| ID | Rule |
| --- | --- |
| DS1 | **Every agent creates its own environment.** Everything below is ephemeral and belongs to this agent only; the user's checkout stays untouched. |
| DS2 | **A git worktree at the project root**, `<project-root>/<ticket>-<slug>`, never inside the harness's directory (not a `herdr` root or a `claude` root) or the agent brain. Removed after the PR is open. |
| DS3 | **The service runs in its own Docker containers**; Docker is the local development standard. Never reuse another agent's containers. |
| DS4 | **LocalStack mocks AWS.** Never real AWS from a development environment. |
| DS5 | **Its own data:** a snapshot of the database or a seed script. Never the shared database. |
| DS6 | **Its own observability, metrics and logs, when debugging** (optional). |

## Parallel work

| ID | Rule |
| --- | --- |
| DS7 | **API contract first, so frontend and backend work independently.** While an API does not exist yet, the frontend mocks it from the contract; the backend returns labelled mock data for integration testing until complete. |
| DS8 | **Once the DB model and the API contracts are decided, backend services work concurrently**, including service-to-service communication. |
| DS9 | **A dependency's shape and type are resolved before anything else is done.** No code is written against a dependency on another service whose shape or type is still open. |

## Procedure

1. `git worktree add <project-root>/<ticket>-<slug>` from the project root (DS2).
2. Start Docker and LocalStack for the services you touch (DS3, DS4); snapshot or seed the database (DS5).
3. Confirm the API contract, DB model, and every dependency's shape exist for the slice you are about to build (DS7–DS9); if not, that is the first task, not a thing to work around.
4. Work; run the app and tests inside this environment.
5. Open the PR, then remove the worktree, containers, and snapshot (DS2).

## Interaction with other skills

- `git-workflow-and-versioning` owns the branch, commit, and PR rules the worktree serves; `continuous-delivery` owns how the work is sliced and shipped.
- `test-driven-development` runs its tests inside this environment and against the contract mocks set up here.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just work in the user's checkout." | Every agent creates its own environment; the user's checkout stays untouched (DS1). |
| "The harness directory is a convenient place for the worktree." | The worktree lives at the project root, never in the harness's directory (DS2). |
| "Another agent's containers are already running, I'll reuse them." | Everything is ephemeral and belongs to this agent only (DS3). |
| "I'll hit real AWS / the shared database for this test." | LocalStack and your own snapshot or seed (DS4, DS5). |
| "I'll clean up the worktree later." | Open the PR, then remove the worktree, containers, and snapshot (DS2). |
| "I'll build the frontend once the backend is done." | The contract comes first; the frontend mocks it, the backend returns labelled mock data until complete (DS7). |
| "I'll figure out the dependency's shape as I go." | It is resolved before anything else is done (DS9). |

## Red Flags

- Code changes appearing in the user's checkout instead of an agent worktree (DS1).
- A worktree created inside the harness's directory or the agent brain (DS2).
- Two agents sharing a container, a database, or a worktree (DS3, DS5).
- Tests run against real AWS or a shared database (DS4, DS5).
- Worktrees, containers, or snapshots left behind after the PR is open (DS2).
- Frontend and backend serialized because no contract exists (DS7).
- Backend services blocked on each other after the DB model and contracts are fixed (DS8).
- Code written against a dependency whose shape or type is still open (DS9).

## Verification

Before starting work:

- [ ] A git worktree exists at `<project-root>/<ticket>-<slug>`, created from the project root (DS2).
- [ ] Docker containers and LocalStack are running for the services you touch and belong to this agent only (DS3, DS4).
- [ ] The database is snapshotted or seeded for this agent (DS5).
- [ ] The API contract, DB model, and dependency shapes for this slice exist (DS7–DS9).

Before finishing:

- [ ] The app and tests were run inside this environment.
- [ ] The PR is open, and the worktree, containers, and snapshot are removed (DS2).
