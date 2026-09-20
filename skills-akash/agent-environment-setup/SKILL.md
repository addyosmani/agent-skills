---
name: agent-environment-setup
description: How an agent sets up and tears down its own isolated development environment before doing any work — a git worktree at the project root (never inside the harness or agent brain directory), Docker containers, LocalStack for AWS, a database snapshot or seed script, and optional private observability for debugging, with cleanup afterwards. Load at the start of every coding task an agent performs.
---

# Agent environment setup

**Every agent creates its own environment**. This is what lets several agents work in parallel on the same repository without interfering, and what keeps the user's checkout untouched.

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

1. `git worktree add <project-root>/<ticket>-<slug>` from the project root (branch naming per `commits-and-pull-requests` P5).
2. Start Docker + LocalStack for the services you touch; do not reuse another agent's containers.
3. Snapshot or seed the database.
4. Work; run the app and tests inside this environment (`testing` T2: exercise the running app).
5. Open the PR, then **remove the worktree, containers, and snapshot**.
