---
name: reference_external_docs
description: Authoritative external references — Claude Code docs, AGENTS.md spec, GitHub Spec Kit, Obsidian KB pipeline (ADR-0012)
type: reference
---

# External documentation references

## Claude Code (Anthropic, official)

- **Memory system + `@<path>` imports:** https://code.claude.com/docs/en/memory.md (covers the `@<filepath>` directive, recursion limit of 5 hops, approval dialog on first use, no `${CLAUDE_PLUGIN_ROOT}` expansion in CLAUDE.md)
- **Hooks reference:** https://code.claude.com/docs/en/hooks.md (PreToolUse output schema with `hookSpecificOutput.permissionDecision`, exit-code 2 alternative, `agent_id` + `hook_event_name` in stdin JSON for subagent detection, plugin-level vs user-level placement)
- **Permissions reference:** https://code.claude.com/docs/en/permissions.md (Read/Edit allow/deny syntax, no per-caller distinction — that's why the Rule #0 enforcement is a hook, not a permissions rule)
- **Best practices:** https://www.anthropic.com/engineering/claude-code-best-practices (subagent usage, context budget < 50%, nested CLAUDE.md, run_in_background)
- **Sub-agents reference:** https://docs.anthropic.com/en/docs/claude-code/sub-agents

Claude Code version we standardize on: **2.1.119** (verified 2026-04-26 via `claude --version`). Ship-time guarantees may differ in earlier 1.x or future 2.x.

## AGENTS.md cross-tool standard

- **Spec:** https://agents.md (open standard for AI-coding-agent rules across tools — adopted by Codex CLI, Cursor as complement, Aider via `read:`, Gemini CLI, OpenCode, Windsurf; Claude Code reads it as fallback if no `CLAUDE.md`)

## GitHub Spec Kit (formalizes spec-driven development)

- **Repo:** https://github.com/github/spec-kit (PRD/SPEC/Plan/Tasks separation, slash commands `/specify` `/plan` `/tasks`)

## Aider conventions

- **`.aider.conf.yml`:** https://aider.chat/docs/usage/conventions.html (`read:` directive to pre-load files at session start, including `AGENTS.md`)

## Obsidian KB pipeline (operator's external memory, ADR-0012)

The KB lives in the operator's local Obsidian vault. Path resolved from `~/.claude/kb-vault.json` → `vault_root`. Structure: `<vault>/clients/<slug>/projects/<slug>/{sessions,sprints,decisions,gotchas,tasks}/` plus shared `<vault>/{decisions,gotchas,playbooks,glossary,_inbox,templates}/`.

Per-project automation (gated by `.claude/kb-config.json` flags, default `false`):

- `hooks/session-start.sh` — auto-loads client metadata + project status + last 3 vault sessions + active plan into the main agent's context at session start
- `hooks/post-commit-kb.sh` with `adr_mirror_enabled: true` — mirrors any committed `docs/adr/NNNN-*.md` to `<vault>/decisions/adr-NNNN-<slug>.md`
- `hooks/post-commit-kb.sh` with `kb_pipeline_enabled: true` — dispatches the `kb-pipeline` agent (Capture / Curate / Write phases) in a detached background process per commit
- Manual `/kb-curate` for batch L1 → L2 promotion

Cross-machine sync: vault is a private git repo (`jota-batuta/batuta-kb`). On Windows, `.git/` lives outside Google Drive sync via `git init --separate-git-dir` to avoid Drive thrashing on `.git/objects/`.

**Deprecated**: `notion-kb-workflow` (frozen 2026-05-01). Notion KB content was migrated to `<vault>/glossary/domains/` on 2026-04-30 (40 entries from the "Batuta Knowledge Base" Notion DB).

## When to consult these

- Implementing a hook → check `hooks.md` for current schema (it has changed across versions; never trust legacy `decision: block` shape without re-reading)
- Writing a CLAUDE.md `@<path>` import → check `memory.md` for path resolution rules
- Cross-tool work → check `agents.md` standard if a non-Claude-Code tool is in scope
- Adopting a new pattern → check Anthropic best-practices post for current guidance
