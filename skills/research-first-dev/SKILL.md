---
name: research-first-dev
description: Use before writing code that calls any external library or API not verified this session. Forces Context7 lookup, web-search fallback, and a source-citation comment on every new import site.
---

# Research First Dev

## Overview

**The cheapest bug is the one caught by reading docs.** Most library misuses come from assuming an API that matches the model's training data — which may be months or years out of date. This skill makes documentation lookup a gate, and the proof lives in the code as a citation comment.

This skill delegates the lookup mechanic to `skills/_vendored/context7/` (CC0, from intellectronica/agent-skills). The Batuta layer adds:

1. A mandatory trigger: "before writing code that uses library X"
2. A web-search fallback when Context7 has no coverage
3. An evidence requirement: a `Source:` comment at the import site

## When to Use

Trigger on any of:

- About to write `import`, `require`, `from ... import`, `use ...`, or equivalent for a library not yet cited in this session
- About to call a new HTTP API endpoint
- About to use a CLI tool that has version-specific flags
- User asks "does library X support Y?" and the answer is not in the conversation history

Do NOT use for:
- Language built-ins (JS/TS `Array.map`, Python `dict`, etc.)
- Libraries already cited in this session with the same version

## Process

### Step 1: Resolve version

Before anything else, read the project's dependency manifest:

- `package.json` → `dependencies` + `devDependencies`
- `requirements.txt` or `pyproject.toml` → pinned versions
- `Cargo.toml`, `go.mod`, etc.

Record the exact version string. If the project has no pinned version yet, state that in the citation as `version: unpinned`.

### Step 1.5: Local KB lookup (added v3.8)

Before going external, check whether the operator has already researched this library/API in a previous session. The operator's Obsidian vault at `${VAULT_ROOT}` (configured in `.claude/kb-config.json` or `~/batuta-kb` default) may contain a curated `decisions/`, `gotchas/`, or `playbooks/` entry that resolves the question without spending Context7 tokens or web requests.

**Lookup order (priority L2 > L3 > L1)**:

1. **L2 (curated, source-of-truth)** — `<vault_root>/decisions/`, `<vault_root>/gotchas/`, `<vault_root>/playbooks/`, `<vault_root>/clients/<this-client>/projects/<this-project>/{decisions,gotchas}/`. Grep for the library name + topic. Read frontmatter `last_verified`. Also check `related:` frontmatter fields for `[[library-name]]` wikilinks — these are more reliable than body-text grep when the vault has been curated. A `related:` hit confirms the entry is about the library, not just mentioning it.
2. **L3 (glossary)** — `<vault_root>/glossary/products/`, `<vault_root>/glossary/domains/`. Useful when the library is part of a product the operator integrates frequently (`Prophet`, `ICG`, `SAP`).
3. **L1 (journals, fallback only)** — `<vault_root>/clients/<c>/projects/<p>/sessions/`. Hits here are uncurated raw captures — surface them with disclaimer "no curado, verificá" and **always proceed to Step 2 anyway**.

**Staleness policy by `last_verified` age (L2 / L3 only)**:

| Edad | Acción |
|---|---|
| < 4 meses | Hit local gana. Cite local source. **Skip Step 2.** |
| 4–12 meses | Hit local is signal. **Run Step 2.** Cite both sources (dual cite). |
| > 12 meses | Hit local solo informa contexto. Run Step 2. Cite only Step-2 source. **Update `last_verified` in the vault file as side-effect.** |

**Always run Step 2** for: introducing a new library to the project, bumping a major version, anything `decision-new` per the `kb-curate` 7-category contract. Local hits cannot substitute Context7 for structural decisions.

**If `vault_root` is unreachable** (Drive offline, no `kb-config.json`): skip Step 1.5 entirely. Proceed to Step 2.

**Citation format for local hits** (one-line comment at the import site):

```ts
// Source: ~/batuta-kb/clients/bato-cajas/gotchas/prophet-tax-calc.md (verified 2026-03-15)
// Cross-checked: https://prophet-docs.example.com/v8/tax (verified 2026-04-29, prophet@8.2.1)
import { calcTax } from "@bato/prophet-adapter";
```

The presence of `Cross-checked:` indicates a 4–12-month dual cite. A bare `Source: ~/batuta-kb/...` line with no Cross-checked means a < 4-month local-only cite (per staleness policy).

### Step 2: Context7 lookup (primary)

Follow `skills/_vendored/context7/SKILL.md`:

```
/mcp context7 resolve-library-id "<library-name>"
/mcp context7 get-library-docs "<resolved-id>" --topic "<specific-api>"
```

If Context7 returns results for the required version:
- Extract the relevant snippet
- Proceed to Step 4

If Context7 has no coverage for the version (outdated by > 1 minor, or library not indexed):
- Proceed to Step 3

### Step 3: Web-search fallback

Use web search with queries like:
- `site:<official-docs-url> <api-name>`
- `<library-name> <version> <api-name> changelog`

Required: the source URL must be one of:
- The library's official documentation domain
- The library's GitHub repository (README, CHANGELOG, or source file)
- Published release notes

Reject as sources: blog posts, StackOverflow answers older than 1 year, AI-generated summaries.

### Step 4: Cite at the import site

When writing the code, include a single-line comment at or above the import / call site:

```ts
// Source: https://orm.drizzle.team/docs/column-types/pg (verified 2026-04-16, drizzle-orm@0.32.1)
import { pgTable, integer } from "drizzle-orm/pg-core";
```

Python:
```python
# Source: https://fastapi.tiangolo.com/tutorial/first-steps/ (verified 2026-04-16, fastapi==0.115.0)
from fastapi import FastAPI
```

The comment is the proof. Without it, the gate has not been passed.

## Anti-Rationalizations

| Excuse | Reality |
|---|---|
| "The API is stable, I've used it for years" | Libraries break APIs. `verified YYYY-MM-DD` is proof, not trust. |
| "I'll add the citation later" | Later means never. Add it at the same commit as the import. |
| "Context7 didn't have the version, so I guessed" | Step 3 exists for this case. Guessing is the bug. |
| "It's a one-line call, citing is overhead" | One-line calls are the most common source of silent breakage. Cite. |

## Red Flags

- Writing `import` statement without reading any docs this session
- Citation URL is a blog or StackOverflow
- Citation has no version pinning
- Citation is copy-pasted from another file without re-verifying for current version
- Dependency manifest was not opened before citing

## Verification

For every PR / commit that touches code:

1. **Grep for citations**:
   ```bash
   git diff --staged -- '*.ts' '*.py' '*.js' | grep -c '^+.*Source: http'
   ```
   Number must equal the count of new `import` statements for external libraries in the diff.

2. **Spot-check one citation**: pick one Source URL from the diff. Open it. Confirm the API still exists and the signature matches.

3. **Version match**: the version in the comment must match the version in the dependency manifest.

If any check fails, do not commit. Add or fix citations.
