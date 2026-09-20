---
name: documentation
description: How to write a good document, rules W1–W11 — whether to write it at all (not every feature needs an HLD, LLD, or doc update; the ticket and commit message carry most of it), the templates document set with only the sections the work demands, user review of every HLD, LLD, and PRD, economical high-level writing with never code copied into a doc, docs compacted into skills before they bloat, two renderings (Markdown with diagrams as code for agents, interactive HTML for humans), design as code (Mermaid, .drawio, drawdb), a document index for progressive discovery, and every document in the repository at the root or in the service's docs folder, never in a cloud tool or the agent brain. Use when you write, update, or decide whether to write any document, README, design doc, RCA, PRD, or index — even if the user only says "document this" — or when you must decide where a document lives or how it is rendered.
category: design
---

# Documentation

## Overview

How a document is written well: whether at all, how short, in what form, and where. The rules are W1–W11. What goes into a PRD, HLD, LLD, or ADR is its own skill; the anatomy of each is in `templates/` and which document holds what is `../../references/documentation-map.md`.

## When to Use

- Writing, updating, or deciding whether to write any document, README, design doc, RCA, PRD, or index.
- Deciding where a document lives or how it is rendered.
- Compacting a document that has grown.
- NOT for the contents of a PRD, HLD, LLD, or ADR: `prd-writing`, `hld`, `lld`, `adrs`.
- NOT for comments in code (`coding-standards`) or the changelog (`continuous-delivery`).

## Whether to write at all

| ID | Rule |
| --- | --- |
| W1 | **Not every feature needs an HLD, LLD, or doc update; the ticket and the commit message carry most of it.** Some things are obvious. Focus on good tickets and good commit messages; write a document when they cannot carry it. |
| W2 | **The document set and anatomies are in `templates/`.** Add a section when the work demands it; not every section must be filled. |
| W3 | **Every HLD, LLD, and PRD is reviewed by the user** before it counts. |

## How to write

| ID | Rule |
| --- | --- |
| W4 | **Economical with words; high-level ideas; depth only where it is needed (RCA, design docs). Never copy code into a doc**; a reader can always go to the code. An API reference lives with the code (OpenAPI, docblocks) and `ARCHITECTURE.md` links to it. |
| W5 | **Docs stay current and are compacted regularly by extracting stable content into skills.** Old, long docs are less accurate and less read: a big doc shrinks its audience and is outdated the moment implementation starts. |
| W6 | **Two renderings:** Markdown with diagrams as code, which agents read; an interactive HTML which humans use, currently produced with the lavish skill. |
| W7 | **Design as code:** Mermaid for flows and sequences inside the Markdown, `.drawio` for HLD architecture next to `HLD.md`, drawdb for the DB schema next to `LLD.md`; all committed and reviewed like code. |
| W8 | **A document index for progressive discovery** (`templates/README.md`): every document is in it, with what it answers and at which level. |

## Where docs live

| ID | Rule |
| --- | --- |
| W9 | **No cloud artifacts. Every document lives in the repository**, at the project root or in the service it belongs to, **never in the agent brain**. |
| W10 | **Each service has its own `docs/` folder**, because a service can have several documents (PRD, HLD, LLD, ADRs, RCAs). |
| W11 | **The monorepo default layout has a top-level `docs/`** for the project-level documents. |

## Recipe

1. Ask: does the ticket plus the commit message already carry this? If yes, stop (W1).
2. Pick the template from `templates/`; fill only the sections the work demands (W2).
3. Write high level and short; diagrams as code; no code snippets (W4, W7).
4. Save as Markdown in the repo, `docs/` at the root or `<service>/docs/` for a service; generate the HTML rendering for humans (W9, W10, W6).
5. Add it to the document index (W8).
6. HLD, LLD, or PRD: user review before it is final (W3).
7. When a doc stabilises, extract the stable part into a skill and shrink the doc (W5).

## Interaction with other skills

- `prd-writing`, `hld`, `lld`, and `adrs` decide what goes into their documents; this skill decides whether, how short, in what form, and where.
- `coding-standards` owns comments in code; `continuous-delivery` and `git-workflow-and-versioning` own the changelog.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Every feature gets an HLD/LLD update." | Not every feature needs one; the ticket and the commit message carry most of it (W1). |
| "I'll paste the code into the doc so it is complete." | Never copy code into a doc; a reader can always go to the code (W4). |
| "A longer doc is a more thorough doc." | Old, long docs are less accurate and less read; write short and high level (W4, W5). |
| "The doc has grown, that's normal." | Docs are compacted regularly by extracting stable content into skills (W5). |
| "I'll put it in Notion / a Google Doc for now." | No cloud artifacts; every document lives in the repository (W9). |
| "A screenshot of the diagram is fine." | Diagrams are code: Mermaid, `.drawio`, drawdb, committed and reviewed (W7). |
| "The HLD is done, review can wait." | Every HLD, LLD, and PRD is reviewed by the user before it is final (W3). |
| "Nobody will look for it in the index." | Every document is in the index for progressive discovery (W8). |

## Red Flags

- A doc update for a feature the ticket and commit message already explain (W1).
- Code copied into a document (W4).
- A document that keeps growing and is never compacted into a skill (W5).
- A document in a cloud tool, or in the agent brain, instead of the repository (W9).
- A diagram committed as an image instead of Mermaid, `.drawio`, or drawdb (W7).
- An HLD, LLD, or PRD treated as final without user review (W3).
- A document missing from the index (W8).

## Verification

After documenting:

- [ ] The ticket and the commit message did not already carry it (W1).
- [ ] The document uses its `templates/` anatomy with only the sections the work demands (W2).
- [ ] It is short and high level, with no code snippets and diagrams as code (W4, W7).
- [ ] It lives in the repository at `docs/` or `<service>/docs/`, with the HTML rendering for humans (W9, W10, W6).
- [ ] It is in the document index (W8).
- [ ] An HLD, LLD, or PRD has been reviewed by the user (W3).
