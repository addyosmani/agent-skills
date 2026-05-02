---
name: kb-curate
description: Use to promote captured journal bullets (L1) to curated decisions/gotchas/playbooks/glossary entries (L2/L3) in the operator's Obsidian vault. 4 invocation modes (PR-merge, manual, weekly cron, session-end), 7-category classification, hybrid control matrix.
---

# KB curation pipeline

## Overview

Capture without curation is noise. Each `git commit` writes an append-only bullet to `docs/sessions/<date>-<slug>.md` (L1) via the `post-commit-kb.sh` hook (Sprint 1). Without explicit promotion, supersede chains coexist at L2 with equal weight and `research-first-dev` Step 1.5 returns ambiguous hits. This skill is the only path that promotes L1→L2 and writes a commit-able audit trail of what was curated.

The skill delegates the actual classification to the **`kb-curator`** agent (Sonnet, project-local read-mostly + targeted Write). Operator confirms drafts before the high-risk categories land at L2.

ADR-0011 D2 documents the decision; the 7-category matrix and hybrid control are the contract.

## When to Use

Four invocation modes — all converge to the same internal logic; differ only in scope:

- **`/kb-curate --feature <branch>`** — invoked by a GitHub Action `kb-curate-on-merge.yml` after a PR merges. Scope: every bullet in journals that mention the merged branch.
- **`/kb-curate --scope session|all-pending|since-YYYY-MM-DD`** — operator-typed slash. Default scope `all-pending` (any bullet without `curated_into:` frontmatter).
- **`/kb-curate --scope week`** — invoked by a `/schedule cron=0 9 * * 1` weekly routine (Sprint 2). Also regenerates `<vault_root>/STATUS.md`.
- **`/kb-end-session`** — operator-typed slash that closes the current session journal AND triggers `/kb-curate --scope session` for that journal's bullets only.

Do NOT use for: editing L2 files directly (operator does that in Obsidian after reviewing drafts), bootstrapping the vault (`batuta-kb-vault`), or backfilling legacy repos (`kb-backfill`, Sprint 2.5).

## Process

### Step 1: Resolve scope and load journals

Read `.claude/kb-config.json` for `client`, `project`, `vault_root`. Derive the list of journal files in scope:

- `--feature <branch>`: `docs/sessions/*` AND vault mirror, filtering bullets where `branch:` matches `<branch>`.
- `--scope session`: only `docs/sessions/<today>-<slug>.md`.
- `--scope week`: journals modified in the last 7 days.
- `--scope all-pending`: every journal in `docs/sessions/`.
- `--since YYYY-MM-DD`: journals modified after the date.

Skip bullets that already carry `curated_into:` frontmatter (idempotent).

### Step 2: Delegate classification to `kb-curator`

Invoke the `kb-curator` agent with the bullet list. The agent returns a structured table:

```
SHA      Category              Target file                                Auto-apply?
abc1234  decision-supersede    decisions/auth-oauth.md.draft               No (manual)
def5678  gotcha-new            gotchas/prophet-tax-calc.md                 Yes
ghi9012  glossary-entry        glossary/products/Prophet.md                Yes
jkl3456  noise                 (none)                                      Skip
```

The 7 categories: `decision-new`, `decision-supersede`, `gotcha-new`, `gotcha-update`, `playbook-candidate`, `glossary-entry`, `noise`.

### Step 3: Apply the hybrid control matrix

| Category | Action |
|---|---|
| `decision-new`, `decision-supersede` | Write to `<vault_root>/.../decisions/<topic>.md.draft` (file extension `.draft`). Operator reviews and renames to `.md`. |
| `gotcha-new` | Auto-apply to `<vault_root>/.../gotchas/<topic>.md`. Mark `#status/needs-review`. |
| `gotcha-update` | `.draft` review obligatorio (semantic change). |
| `playbook-candidate` | `.draft` review (high synthesis). |
| `glossary-entry` | Auto-apply to `<vault_root>/glossary/...`. |
| `noise` | Mark bullet `curated_into: []` for idempotency; nothing else. |

For `decision-supersede`, also stage an edit to the superseded file's frontmatter (`status: superseded by <new-id>`) — but only as a `.draft` patch the operator applies manually.

**Wikilinks (mandatory)**: Every file written (both `.draft` and auto-applied) must include inline `[[wikilinks]]` and a `related:` frontmatter field per the vault convention (`batuta-kb-vault` SKILL.md Step 3.5). The `kb-curator` agent is instructed to generate these — if a returned output lacks them, reject and re-request.

### Step 4: Update journal frontmatter (idempotency)

For every processed bullet, append (or update) sub-bullets:

```markdown
- **HH:MM · `<sha>`** · <subject>
  - branch: <branch>
  - files: <count>
  - curated_into: ["<vault-rel-path-1>", "<vault-rel-path-2>"]
  - curated_at: <ISO timestamp>
```

Edit the project journal in place (`docs/sessions/<file>.md`) AND the vault mirror (`<vault_root>/clients/<c>/projects/<p>/sessions/<date>.md`).

### Step 5: Commit to the vault

`cd <vault_root> && git add . && git commit -m "kb-curate: <scope>, <N> bullets curated, <M> drafts, <K> auto-applies"`. Do NOT push automatically — let the operator review and push.

If `<vault_root>` is unreachable (Drive offline, etc.), skip silently and log to `.claude/kb-debug.log`. The project journal updates land in the project's git anyway.

### Step 6: Report to operator

Plain-text report with three sections: drafts pending review (file paths), auto-applies committed (with hash), bullets marked noise (count). Include any errors from kb-curator (a bullet the agent could not classify is left untouched and surfaced).

## Anti-Rationalizations

| Excuse | Reality |
|---|---|
| "I'll bypass kb-curator and write decisions/ directly" | The 7-category classification is the contract. Bypassing creates uncurated entries with stale `last_verified` and no audit trail in the journal. |
| "Auto-apply gotcha-update too — it's faster" | gotcha-update mutates an existing source-of-truth. Without operator review, a wrong update shadows the correct gotcha in research-first lookups. Manual review is the design. |
| "Skip the .draft extension and write decisions directly" | The .draft extension is what makes `_dashboard.md` Dataview queries surface them as `#status/needs-review`. Without it, the operator never sees pending reviews. |
| "Process bullets older than 30 days too" | Stale bullets often relate to features that shipped; curating retroactively rewrites history. Use `kb-backfill` (Sprint 2.5) for that pipeline; this skill is for the rolling work-in-progress window. |

## Red Flags

- More than 50 drafts pending review in the vault (operator drowning — investigate why review is stalled)
- A `decision-supersede` whose target does not exist in `decisions/` (typo or stale reference; surface as error, do not auto-create)
- Auto-applies producing wikilink targets that do not exist (e.g. `[[Prophet]]` when `glossary/products/Prophet.md` is missing — the agent should have triggered glossary-entry first)
- The same SHA processed twice (idempotency broken — check `curated_into:` write logic)
- Auto-apply producing a file with zero `[[wikilinks]]` in the body or an empty `related:` frontmatter field — every vault entry must be connected to the graph

## Verification

- `find <vault_root> -name '*.md.draft' | wc -l` ≤ 50
- `grep -L 'curated_into:' docs/sessions/*.md | wc -l` decreases over time (or stays low after `--scope all-pending`)
- `git -C <vault_root> log --oneline | head -5` shows recent `kb-curate:` commits
- Re-running `/kb-curate --scope session` immediately after produces 0 changes (idempotent)
- After `/kb-curate --feature <branch>`, the journals' bullets that match `branch:` all carry `curated_into:`
