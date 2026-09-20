---
name: documentation
description: Documentation rules — economical words and high-level ideas with depth only for RCAs and design docs, never copying code into docs, not every feature needs an HLD/LLD/doc update (tickets and commit messages carry most of it), a document index for progressive discovery, keeping docs current and compacting them into skills, no cloud artifacts (every doc lives in the repo at project root or in the service's docs folder), two renderings (Markdown with diagrams-as-code for agents, interactive HTML for humans), user review of every HLD/LLD/PRD, the templates document set, diagrams as code, DB design docs, and decision records. Load whenever you write, update, or decide whether to write any document, README, design doc, RCA, PRD, changelog, or index — even if the user only says "document this".
---

# Documentation

## Whether to write at all

| ID | Rule |
| --- | --- |
| W1 | **Not every feature needs an HLD, LLD, or doc update; the ticket and the commit message carry most of it.** Not everything needs documenting; some things are obvious. Linear tickets and commit messages proxy for the majority of the docs, so focus on good tickets and good commit messages. |
| W2 | **The document set and anatomies are in `templates/`** (not in this repo — see `CLAUDE.md`). Add a section when the work demands it; not every section must be filled. |
| W3 | **Every HLD, LLD, and PRD is reviewed by the user.** |
| W4 | Maintain the DB schema and a DB design document whenever the service has a persistent database. |
| W5 | Every meaningful design decision is recorded: problem, options, choice, rationale, reversibility; one-way doors named. |
| W6 | Changelog: global and per service; a line per merged task; a release entry listing its tickets (`continuous-delivery`). |

## How to write

| ID | Rule |
| --- | --- |
| W7 | **Economical with words; high-level ideas; depth only where it is needed (RCA, design docs). Never copy code into a doc** — for that a person can always go to the code. While creating a doc, think about how to be succinct without losing the information. |
| W8 | **Docs stay current and are compacted regularly by extracting stable content into skills** so they do not bloat. **Old, long docs are less accurate and less read**: avoid big docs because you have already significantly reduced the audience ("ain't nobody got time to read all that") and increased the likelihood that the information is outdated the moment implementation starts. The older and longer the document, the less accurate, useful, and likely to be read and understood. |
| W9 | **Two renderings:** (1) Markdown with diagrams as code, which other agents can read; (2) an interactive HTML which humans will use ; the HTML rendering is currently produced with the lavish skill. |
| W10 | **Design docs use design-as-code:** Mermaid for flows and sequences inside the Markdown, `.drawio` for HLD architecture next to `HLD.md`, drawdb for the DB schema next to `LLD.md`; all committed and reviewed like code. |
| W11 | **A document index for progressive discovery** (`templates/README.md`, not in this repo). |

## Where docs live

| ID | Rule |
| --- | --- |
| W12 | **No cloud artifacts. Every document lives in the repository**, at the project root or in the service it belongs to (`<service>/docs/`), **never in the agent brain**. |
| W13 | **Each service has its own `docs/` folder** because a service can have multiple docs (HLD, LLD,...). |
| W14 | The monorepo default layout includes a top-level `docs/`. |

## Recipe

1. Ask: does the ticket + commit message already carry this? If yes, stop (W1).
2. Pick the template from `templates/`; fill only the sections the work demands (W2).
3. Write high level, short; diagrams as code; no code snippets (W7, W10).
4. Save as Markdown in the repo (`docs/` at the root, or `<service>/docs/` for service docs); generate the HTML rendering for humans (W12, W13, W9).
5. Add it to the document index (W11).
6. HLD / LLD / PRD → user review before it is final (W3).
7. When a doc stabilises, extract the stable part into a skill and shrink the doc (W8).
