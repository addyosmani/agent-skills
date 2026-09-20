---
name: agent-environment-setup
description: How an agent sets up and tears down its own isolated development environment before doing any work — a git worktree at the project root (never inside the harness or agent brain directory), Docker containers, LocalStack for AWS, a database snapshot or seed script, and optional private observability for debugging, with cleanup afterwards. Use when starting any coding task an agent performs.
category: delivery
---

# Agent environment setup

## Overview

**Every agent creates its own environment**. This is what lets several agents work in parallel on the same repository without interfering, and what keeps the user's checkout untouched.

## When to Use

- At the start of every coding task an agent performs
- Before running the app or tests for a ticket
- When several agents work on the same repository in parallel

**NOT for:** the branch, commit and PR rules (`git-workflow-and-versioning`) or how to slice the work (`continuous-delivery`).

## What to create

| Item | Rule |
| --- | --- |
| Git worktree | Create a **git worktree at the project root** — never in the harness's directory (for example, not in a `herdr` root or a `claude` root). **Clean it up after development.** |
| Ephemeral environments | Everything below is ephemeral and belongs to this agent only. |
| Docker container | Run the service(s) in a Docker container; Docker is the local development standard. |
| LocalStack | Use LocalStack to mock AWS. |
| Database | Take a **snapshot of the DB or run a seed script** so the agent has its own data. |
| Observability | Its **own observability — metrics and logs** — when debugging (optional). |

## Procedure

1. `git worktree add <project-root>/<ticket>-<slug>` from the project root (branch naming per `git-workflow-and-versioning` P5).
2. Start Docker + LocalStack for the services you touch; do not reuse another agent's containers.
3. Snapshot or seed the database.
4. Work; run the app and tests inside this environment (`end-to-end-testing` T2: exercise the running app).
5. Open the PR, then **remove the worktree, containers, and snapshot**.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll just work in the user's checkout" | Every agent creates its own environment; the user's checkout stays untouched. |
| "The harness directory is a convenient place for the worktree" | The worktree lives at the project root — never in the harness's directory (not a `herdr` root or a `claude` root). |
| "Another agent's containers are already running, I'll reuse them" | Do not reuse another agent's containers; everything is ephemeral and belongs to this agent only. |
| "I'll point at the shared database" | Take a snapshot of the DB or run a seed script so the agent has its own data. |
| "I'll hit real AWS for this test" | Use LocalStack to mock AWS. |
| "I'll clean up the worktree later" | Clean it up after development: open the PR, then remove the worktree, containers, and snapshot. |

## Red Flags

- Code changes appearing in the user's checkout instead of an agent worktree
- A worktree created inside the harness's directory
- Two agents sharing a container, a database, or a worktree
- Tests run against real AWS or a shared database
- Worktrees, containers, or snapshots left behind after the PR is open

## Verification

Before starting work:

- [ ] A git worktree exists at `<project-root>/<ticket>-<slug>`, created from the project root, not inside the harness's directory
- [ ] Docker containers and LocalStack are running for the services you touch, and belong to this agent only
- [ ] The database is snapshotted or seeded for this agent

Before finishing:

- [ ] The app and tests were run inside this environment
- [ ] The PR is open, and the worktree, containers, and snapshot are removed
