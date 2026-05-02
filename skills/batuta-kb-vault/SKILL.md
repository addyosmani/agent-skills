---
name: batuta-kb-vault
description: Use when bootstrapping or operating the operator's Obsidian vault as a 4-level KB (L0 inbox, L1 journals, L2 curated, L3 glossary) with git versioning. Covers structure, frontmatter, tagging, and the inbox drain protocol.
---

# Batuta KB vault

## Overview

The operator's primary KB is an Obsidian vault at `${VAULT_ROOT}` (operator-machine local, configured via `.claude/kb-config.json` per project). This skill encodes the vault's structural contract and operational protocols so that the git `post-commit-kb.sh` hook, the `kb-curate` skill (Sprint 2), and the `research-first-dev` Step 1.5 lookup all share a stable target.

The vault is **structured by maturity, not chronology**. Captured journal entries (L1) are append-only. Curated decisions and gotchas (L2) are one-source-of-truth-per-topic. The promotion L1→L2 is explicit, not automatic. ADR-0011 documents the rationale.

## When to Use

- Bootstrapping the vault for the first time on the operator's machine (Sprint 1 setup)
- Adding a new client/project subtree under `clients/<slug>/projects/<slug>/`
- Reviewing or repairing the vault structure after a Drive-sync conflict
- Documenting the vault contract in onboarding for a second machine

Do NOT use for: editing journal content (the `post-commit-kb.sh` hook handles that), promoting L1→L2 (that is `kb-curate`), or backfilling legacy repos (that is `kb-backfill`).

## Process

### Step 1: Bootstrap (first-time setup)

The vault directory typically already exists with Obsidian configured. `git init` is layered on top:

```bash
cd "$VAULT_ROOT"   # e.g. "E:/Gdrive Batuta/My Drive/BATUTA AI/OBSIDIAN/BATUTA/BATUTA"
mkdir -p clients decisions gotchas glossary/products glossary/domains glossary/people \
         playbooks journals templates _inbox status
cat > .gitignore <<'EOF'
.obsidian/workspace*.json
.obsidian/cache/
.DS_Store
*.tmp
.trash/
**/secrets/
**/.env
EOF

git init -b main
git add .gitignore .obsidian clients decisions gotchas glossary playbooks journals templates _inbox status
git commit -m "chore: vault git bootstrap"
gh repo create jota-batuta/batuta-kb --private --source=. --remote=origin --push
```

**Drive + git mitigation (mandatory)**: `.git/objects/` thrashes Drive sync. Choose Option A (recommended) or B at bootstrap time:

- **Option A** — exclude `.git/` from Drive Desktop sync (Preferences → Folders on My Drive → vault folder → Choose folders to sync → uncheck `.git`).
- **Option B** — bare repo outside Drive + worktree inside: `git init --bare $HOME/batuta-kb-bare.git`, then in the vault `echo "gitdir: $HOME/batuta-kb-bare.git" > .git`.

### Step 2: Structure invariants

```
${VAULT_ROOT}/
├── .obsidian/                       (config, partially gitignored)
├── _inbox/                          (L0 — raw captures, drain incrementally)
├── clients/<client-slug>/
│   └── projects/<project-slug>/
│       ├── decisions/               (L2 — per-project)
│       ├── gotchas/                 (L2 — per-project)
│       └── sessions/                (L1 — mirrored from docs/sessions/)
├── decisions/                       (L2 — cross-cliente)
├── gotchas/                         (L2 — cross-cliente)
├── glossary/{products,domains,people}/   (L3)
├── playbooks/                       (L2 — synthetic patterns)
├── journals/                        (L1 — operator personal journals)
├── status/                          (auto-generated dashboards)
└── templates/                       (Templater frontmatter)
```

Never write outside this tree. The `post-commit-kb.sh` hook resolves paths by reading `client` and `project` from the project's `.claude/kb-config.json`.

### Step 3: Tagging convention

Wikilinks and hashtags are how cross-project lookup works:

- **Products / systems**: `[[Prophet]]`, `[[ERP/SAP]]`, `[[ERP/ICG]]`, `[[POS/Aronium]]` — slash for hierarchy.
- **Note type**: `#decision`, `#gotcha`, `#playbook`, `#session`, `#question-open`, `#question-resolved`.
- **Client**: `#client/<slug>` (always present except in cross-cliente `decisions/`, `gotchas/`).
- **Severity**: `#sev/blocker`, `#sev/workaround`, `#sev/cosmetic`.
- **Status**: `#status/draft`, `#status/needs-review`, `#status/verified-2026-04`.

`research-first-dev` Step 1.5 (Sprint 2) reads `last_verified` from frontmatter to enforce staleness policy. Keep frontmatter accurate.

### Step 3.5: Wikilink convention

Wikilinks (`[[...]]`) are the sole mechanism that connects notes in the Obsidian graph and enables `research-first-dev` Step 1.5 cross-project lookups. Every file written to the vault — by agents, hooks, or the operator — must follow this convention.

**What gets linked (allowlist)**:

- `[[KB-NN]]` — cross-reference to another KB entry by its ID (e.g., `[[KB-43]]`)
- `[[client-slug]]` — link to the client metadata file (e.g., `[[kiosco]]`, `[[kiro]]`)
- `[[project-slug]]` — link to the project subtree (e.g., `[[bancos-ekgs]]`, `[[bato-gek]]`)
- `[[Technology Name]]` — link to a glossary product entry (e.g., `[[Temporal.io]]`, `[[Google ADK]]`, `[[Evolution API]]`, `[[n8n]]`)
- `[[adr-NNNN-slug]]` — link to a mirrored ADR decision file in `decisions/`

**What does NOT get linked**:

- Commit SHAs, branch names, file paths — these are identifiers, not concepts
- Generic terms (`Python`, `Docker`, `PostgreSQL`) unless a glossary entry exists for them in the Batuta context

**Where links appear**:

1. **Inline in body text** — at the first mention of a linkable concept. Example: "Usar `[[Temporal.io]]` self-hosted como backbone de orquestación."
2. **`related:` frontmatter field** — a YAML list of all wikilinks used in the body, for explicit graph edges. Example: `related: ["[[KB-43]]", "[[Temporal.io]]", "[[kiosco]]"]`

**Invariant**: a vault file with zero wikilinks and an empty `related:` field is disconnected from the graph. Agents that write to the vault must populate both. The `post-commit-kb.sh` hook populates `related:` with at least `[[client]]` and `[[project]]` for session journals.

### Step 4: Frontmatter contracts (templates/)

Three templates ship in `templates/`:

```yaml
---
type: session
date: 2026-04-29
client: bato-cajas
project: bato-cajas
repo: jota-batuta/bato-cajas
branch: feature/<slug>
commits: ["abc1234"]
tags: [session, client/bato-cajas]
related: ["[[bato-cajas]]"]
last_verified: 2026-04-29
---
```

```yaml
---
type: decision
id: 0001
date: 2026-04-29
status: accepted
deciders: [jota-batuta]
client: null            # null = cross-cliente
supersedes: null
domain: <domain-slug>   # required, never "unknown"
origin_project: <project-slug>
tags: [decision]
related: ["[[KB-NN]]", "[[Technology]]"]
last_verified: 2026-04-29
---
```

```yaml
---
type: gotcha
date_discovered: 2026-04-29
last_verified: 2026-04-29
product: "[[Prophet]]"
severity: workaround
client: bato-cajas
tags: [gotcha, sev/workaround]
related: ["[[KB-NN]]", "[[Prophet]]"]
---
```

### Step 5: Inbox drain protocol

`_inbox/` accumulates raw captures (Notion exports, free-form notes, backfill outputs from Sprint 2.5). Drain rule: 3–5 entries per session. For each:

1. Decide category: decision / gotcha / playbook / glossary / noise.
2. If it survives, move to the right L2 path with proper frontmatter.
3. Mark the source entry `curated_into: [<paths>]` if the source remains traceable.
4. Delete `_inbox/` files only after the move; never bulk-delete without review.

Do not let `_inbox/` exceed ~50 entries. Above that, drain becomes a chore the operator skips, and the inbox calcifies.

## Anti-Rationalizations

| Excuse | Reality |
|---|---|
| "I'll write this directly to L2 to skip curation" | L2 is one-source-of-truth-per-topic; uncurated raw entries pollute the lookup. Capture goes to L1 (journals) or L0 (_inbox); L2 is for curated synthesis. |
| "The Drive folder is fine, no need for git" | Drive does not version, audit, or revert. Certification requires audit trail. Git is mandatory; Drive is the sync layer underneath. |
| "Wikilinks are too much overhead, let me just use plain text" | Backlinks are the entire reason Obsidian was chosen over Notion. Without `[[Prophet]]`, the cross-project lookup that resolves Prophet/SAP vs Prophet/ICG breaks. |
| "I'll dump the Notion export straight into clients/" | The export carries Notion artifacts (page-id suffixes, broken links, untriaged drafts). Land in `_inbox/` first, drain incrementally per Step 5. |

## Red Flags

- `_inbox/` exceeds 50 entries
- A `clients/<x>/projects/<y>/decisions/` file lacks `last_verified` in frontmatter (research-first staleness policy needs it)
- `.git/` appearing in Drive sync conflict logs (`<file> (jota-batuta@machine).md`)
- A wikilink target that does not exist in the vault (Obsidian flags broken links — fix or remove)
- Multiple decision files on the same topic without a `supersedes:` chain — that is the gap `kb-curate` Sprint 2 is meant to fix

## Verification

- `git -C "$VAULT_ROOT" remote get-url origin` returns the `jota-batuta/batuta-kb` URL
- `gh repo view jota-batuta/batuta-kb --json visibility` returns `{"visibility": "PRIVATE"}`
- `find "$VAULT_ROOT" -maxdepth 2 -type d` shows the 9 mandatory top-level folders
- `find "$VAULT_ROOT/_inbox" -type f -newer /tmp/4days-ago | wc -l` ≤ 50 (or document the spike)
- `grep -r 'last_verified:' "$VAULT_ROOT/decisions" "$VAULT_ROOT/gotchas" | wc -l` should be > 0 once decisions/gotchas have been curated
- Drive sync conflict files: `find "$VAULT_ROOT" -name '*\(*jota-batuta*\)*'` returns 0 — non-zero indicates Drive+git contention; apply Option B from Step 1
