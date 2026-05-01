---
name: user_operator_profile
description: jota-batuta — Batuta consultoría, single-operator workflow, Spanish convo / English artifacts, Windows + Git Bash + Claude Code 2.1.x, regulated CO domains
type: user
---

# Operator profile — jota-batuta (Batuta)

## Identity and role

- GitHub handle: `jota-batuta` (used in commits, repo ownership, marketplace plugin namespace)
- Operating mode: **single operator** — no team to coordinate with, but multiple consulting clients in parallel
- Primary tooling: Claude Code 2.1.x on Windows 11, working from Git Bash via VS Code extension

## Working style

- Conversation language: **Spanish**. Operator writes Spanish, expects Spanish replies.
- Artifact language: **English**. Code, README, SKILL.md, commit messages, PR descriptions, ADRs, tests, plans — all in English. Exception: docs intended for Spanish-speaking internal team members may be Spanish if explicitly stated.
- Decision style: divergent then convergent. Expects ≥ 3 viable approaches surfaced before converging on one. Stopping at the first workable idea is a known failure mode the operator actively guards against.

## Domain and stack patterns

- Operates in Colombian regulated and operational domains (Colombian e-invoicing, banking integrations, payment processors). Specific client names are sanitized in public artifacts; abstractions like "Colombian e-invoicing authority" or "Colombian banks" are preferred.
- Common stacks: Python (pyproject.toml + src layout), TypeScript/Node, Next.js. Some projects are Temporal-worker layered. Frontend often React/Next.
- Plugin distribution: marketplace via `jota-batuta/batuta-agent-skills` GitHub repo (PUBLIC).

## Process commitments

- Every change goes through a PR. **Operator merges manually**; Claude creates PRs via `gh pr create` but never merges.
- New project on day 0: GitHub repo first (`gh repo create jota-batuta/<name> --private` or `--public` for plugin forks), branch + draft PR before feature code.
- Obsidian vault is durable memory across machines (per ADR-0012). Auto-loaded at session start by `hooks/session-start.sh`; auto-mirrored per commit by `hooks/post-commit-kb.sh`. Notion KB workflow deprecated 2026-05-01.

## How to apply this in future sessions

- Default to Spanish conversation, English artifacts. Don't ask which language to use.
- When proposing approaches, surface 3+ alternatives with explicit rejections — even if one is clearly preferred.
- For commits and PRs, follow the no-AI-attribution rule (separate memory).
- For public repos, sanitize client names before publishing (separate memory).
