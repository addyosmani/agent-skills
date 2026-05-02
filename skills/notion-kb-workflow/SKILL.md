---
name: notion-kb-workflow
description: DEPRECATED — superseded by the Obsidian KB pipeline (ADR-0012). Do NOT invoke. The replacements are session-start.sh (auto context load), batuta-project-hygiene mode=project-init (vault menu), and post-commit-kb.sh + kb-pipeline agent (per-commit dispatch).
status: deprecated
deprecated_at: 2026-05-01
deprecated_by: docs/adr/0012-obsidian-only-kb-pipeline.md
replacements:
  - hooks/session-start.sh (auto session-start vault context load)
  - skills/batuta-project-hygiene/SKILL.md (mode=project-init vault client menu)
  - hooks/post-commit-kb.sh + agents/kb-pipeline.md (per-commit ADR mirror + KB curation)
---

> **DEPRECATED** (ADR-0012, 2026-04-30). DO NOT invoke `--read`, `--init`, or `--append`. Replacements: `hooks/session-start.sh` (context loading), `hooks/post-commit-kb.sh` + `agents/kb-pipeline.md` (capture), `skills/kb-curate/SKILL.md` (promotion). See CLAUDE.md § "notion-kb-workflow (DEPRECATED)".

# Notion KB Workflow — DEPRECATED

> **DEPRECATED 2026-05-01.** Per [ADR-0012](../../docs/adr/0012-obsidian-only-kb-pipeline.md), Notion is no longer the source of truth for the internal Batuta KB. Obsidian is. **Do not invoke this skill.** The body below is preserved for historical reference; the workflow it describes will be removed in a future release.
>
> **Replacements**:
> - **Session-start context load** → `hooks/session-start.sh` reads the operator's vault automatically when `.claude/kb-config.json` is present and the vault is reachable. No manual command needed.
> - **New project bootstrap** → `batuta-project-hygiene` mode `project-init` scans `<vault>/clients/*` and presents a numbered menu of existing clients before asking for a new one.
> - **End-of-session capture** → `hooks/post-commit-kb.sh` writes a journal bullet to `docs/sessions/` and mirrors it to the vault on every commit. With `kb_pipeline_enabled: true` in `.claude/kb-config.json`, the `kb-pipeline` agent runs Capture / Curate / Write phases against the commit diff in a detached background process.
>
> Operators with prior Notion KB content can keep it as a read-only archive in Notion, or migrate it via a one-shot export to `<vault>/glossary/domains/` (see `docs/sessions/2026-05-01-kb-pipeline-shipped.md` for the migration that already moved 40 entries from the "Batuta Knowledge Base" Notion DB on 2026-04-30).

## Overview

**The context window is not your memory.** Session-to-session continuity requires a durable store outside the agent. This skill ORIGINALLY treated Notion (via the official Notion MCP plugin) as that store, with three explicit modes so the agent does not contaminate its working context with raw page dumps. The Obsidian-based replacement (ADR-0012) keeps the same intent — explicit boundaries, structured persistence, no auto-flooding — but uses local markdown files instead of a remote MCP, eliminating ~$15-25/month in token overhead and the network-dependency on the commit path.

Prerequisite: the Notion MCP plugin must be installed and authenticated:

```
/plugin install notion
```

All modes are invoked manually. There is no Stop hook. The intent is for the operator to decide when state is worth persisting, not for every tool call to leak into Notion.

## When to Use

Invoke one of three modes at session boundaries:

| Mode | When | Command |
|---|---|---|
| `--read` | Start of a session on an existing project | `/skill notion-kb-workflow --read client:<X> project:<Y>` |
| `--init` | Start of a brand-new project not yet in Notion | `/skill notion-kb-workflow --init client:<X> project:<Y>` |
| `--append` | End of a productive session (made commits, took decisions) | `/skill notion-kb-workflow --append` |

Do NOT use for:
- Reading individual Notion pages for reference (use the Notion MCP directly)
- Storing secrets or credentials (Notion is not a secrets store)

## Process

### Mode: `--read`

Input: `client:<name>`, `project:<name>`.

Steps:
1. Query Notion for the client page by name. If absent, stop and prompt the operator to run `--init` or correct the name.
2. Query the project page nested under the client page.
3. Fetch the latest 5 session appends (ordered by date descending).
4. Fetch the active sprint page (status = In Progress).
5. Fetch open tasks assigned to the project.
6. Emit a **structured summary** into the chat, not raw page content:
   ```
   PROJECT CONTEXT (from Notion KB)
   Stack: <from project page>
   Active sprint: <sprint name, end date>
   Pending tasks: <count, titles>
   Recent decisions: <bulleted, max 5>
   Known gotchas: <bulleted, max 5>
   ```
7. Stop. Wait for the operator to direct next actions.

Do NOT dump raw page JSON or full block content. The goal is context priming, not context flooding.

### Mode: `--init`

Input: `client:<name>`, `project:<name>`, optional `stack:<stack>`.

Steps:
1. Confirm with the operator the client and project names before writing anything.
2. Check if the client page exists. If yes, re-use. If no, create under the Notion root "Clients" database with properties: Name, Status (Active), Created.
3. Create the project page nested under the client page with properties: Name, Stack, Status (Planning), Created.
4. Create linked databases under the project page:
   - Sprints (Name, Start, End, Status)
   - Tasks (Title, Status, Sprint, Assignee)
   - Decisions (Title, Date, Rationale)
   - Gotchas (Title, Context, Workaround)
5. Emit confirmation with the project page URL.

Do NOT proceed to code until this returns.

### Mode: `--append`

Input: none (reads session state).

Steps:
1. Read `git log --oneline -n 20` in the current project. If no new commits since the last append, ask the operator to confirm an append is warranted.
2. Read `git diff --stat <last-append-sha>..HEAD`.
3. Infer and draft the following block:
   ```
   Session: <YYYY-MM-DD HH:MM>
   Commits: <sha list with subjects>
   Files touched: <counts by top-level dir>
   Libraries added / bumped: <name@version>
   Decisions: <bulleted>
   Gotchas: <bulleted>
   Next step: <one line>
   ```
4. Show the draft to the operator. Wait for approval.
5. On approval, append to the project page as a new block. Move tasks to "Done" if their IDs appear in commit subjects.

Do NOT auto-commit to Notion without operator approval.

## Anti-Rationalizations

| Excuse | Reality |
|---|---|
| "I'll remember the decisions without writing them down" | You won't. Next session starts with 0 recall. |
| "Notion read is slow, I'll skip `--read`" | Skipping = restarting every session blind. The slowness is one-time. |
| "I can auto-append via a Stop hook" | Hooks run on every stop, including interrupted sessions. Manual gate is the design. |
| "The summary is too terse, let me paste the full page" | Terse is the point. Context is scarce. |

## Red Flags

- Invoking `--read` without `client:` and `project:` args
- Creating client or project page before confirming name with operator
- Dumping raw Notion JSON into the chat
- Appending a session with 0 commits and no declared decisions
- Using `--init` when `--read` already returns a page (duplicate pages)

## Verification

For each mode:

**`--read`**:
- Output is the structured block above, not raw page content
- Summary line count ≤ 20

**`--init`**:
- Notion page URL is emitted and fetchable
- Operator confirmed names before the write occurred

**`--append`**:
- Draft shown to operator and approved before write
- Notion append block contains all 7 fields
- Tasks referenced in commit subjects are transitioned to Done

Evidence command after `--append`:
```
git log --format='%H' -n 1 > .notion-last-append.sha
```
Commit this file so the next `--append` knows where to diff from.
