# MEMORY index — jota-batuta (user-level)

Index of persistent memory entries that apply across all projects and sessions on this machine. Each line points at a `memory/<file>.md` with full context. This index is auto-loaded into every session.

## User profile
- [Operator profile](memory/user_operator_profile.md) — single-operator Batuta consulting; Spanish convo / English artifacts; Windows + Git Bash + Claude Code 2.1.x

## Feedback (validated patterns + corrections)
- [No AI attribution in commits](memory/feedback_no_ai_attribution.md) — never `Co-Authored-By: Claude` in commits or PRs
- [Claude never merges PRs](memory/feedback_pr_policy.md) — Claude creates via `gh pr create`, operator merges manually after review
- [Sanitize PII in public repos](memory/feedback_sanitize_public_repos.md) — abstract client names and CO-specific vendor names before merge
- [Hook bypass with acceptEdits](memory/feedback_hook_acceptedits_caveat.md) — Rule #0 PreToolUse hook is bypassed under `--permission-mode acceptEdits`; convention still holds via CLAUDE.md but no runtime enforcement

## References (where things live)
- [Plugins and project paths](memory/reference_paths.md) — plugin install path, project dirs, plans/sessions conventions
- [External docs and standards](memory/reference_external_docs.md) — Claude Code docs, AGENTS.md spec, Spec Kit, Obsidian KB pipeline (ADR-0012)

## How to use this index
- Lines are ≤ 150 chars: `- [Title](memory/file.md) — one-line hook`
- Memory files in `memory/` carry frontmatter `name`, `description`, `type` (user|feedback|project|reference)
- Update this index when adding or removing memories; keep < 200 lines total
- Project-specific memories live in `~/.claude/projects/<project>/memory/MEMORY.md`, not here
