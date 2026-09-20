---
name: documentation-and-adrs
description: Documentation rules — economical words and high-level ideas with depth only for RCAs and design docs, never copying code into docs, not every feature needs an HLD/LLD/doc update (tickets and commit messages carry most of it), a document index for progressive discovery, keeping docs current and compacting them into skills, no cloud artifacts (every doc lives in the repo at project root or in the service's docs folder), two renderings (Markdown with diagrams-as-code for agents, interactive HTML for humans), user review of every HLD/LLD/PRD, the templates document set, diagrams as code, DB design docs, and decision records. Use when you write, update, or decide whether to write any document, README, design doc, RCA, PRD, changelog, or index — even if the user only says "document this"; also when making architectural decisions, changing public APIs, shipping features, or when you need to record context that future engineers and agents will need to understand the codebase.
category: design
---

# Documentation and ADRs

## Overview

The rules below (W1–W14) decide whether a document is written at all, how it is written, and where it lives. Document decisions, not just code: the most valuable documentation captures the *why* — the context, constraints, and trade-offs that led to a decision. Code shows *what* was built; documentation explains *why it was built this way* and *what alternatives were considered*.

## When to Use

- Writing, updating, or deciding whether to write any document, README, design doc, RCA, PRD, changelog, or index
- Making a significant architectural decision or choosing between competing approaches
- Adding or changing a public API
- Shipping a feature that changes user-facing behavior
- Onboarding new team members (or agents) to the project
- When you find yourself explaining the same thing repeatedly

**When NOT to use:** W1 decides when nothing is written. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

## Whether to write at all

| ID | Rule |
| --- | --- |
| W1 | **Not every feature needs an HLD, LLD, or doc update; the ticket and the commit message carry most of it.** Not everything needs documenting; some things are obvious. Linear tickets and commit messages proxy for the majority of the docs, so focus on good tickets and good commit messages. |
| W2 | **The document set and anatomies are in `templates/`.** Add a section when the work demands it; not every section must be filled. |
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
| W11 | **A document index for progressive discovery** (`templates/README.md`). |

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

## Architecture Decision Records (ADRs)

ADRs are how W5 is met for significant technical decisions. They're the highest-value documentation you can write.

### When to Write an ADR

- Choosing a framework, library, or major dependency
- Designing a data model or database schema
- Selecting an authentication strategy
- Deciding on an API architecture (REST vs. GraphQL vs. tRPC)
- Choosing between build tools, hosting platforms, or infrastructure
- Any decision that would be expensive to reverse

### Match the existing convention first

Before creating an ADR, inspect the available repository context for an established convention — existing ADRs, project instructions, and ADR-related configuration or tooling (e.g. an `.adr-dir` file). An established convention overrides the defaults below. Match:

- **Location and format** — e.g. `docs/adr/*.md`, `Documentation/Decisions/*.rst`, a MADR layout, or an `adr-tools` setup. Match the existing directory, file extension, and markup (Markdown vs reStructuredText).
- **Numbering and naming** — continue the existing sequence and filename pattern (`ADR-004-Title.rst`, `0004-title.md`, …); don't restart at 001 or introduce a second scheme.
- **Section headings** — reuse the project's heading set rather than imposing this template's.

If the available evidence conflicts, surface the conflict rather than silently introducing another scheme. Only when no convention can be established do you apply the default below.

### ADR Template

Store ADRs in `docs/decisions/` with sequential numbering (unless the project already uses another location — see above). The sections are the W5 fields: problem, options, choice, rationale, reversibility.

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Date
2025-01-15

## Problem
We need a primary database for the task management application. Key requirements:
- Relational data model (users, tasks, teams with relationships)
- ACID transactions for task state changes
- Support for full-text search on task content
- Managed hosting available (for small team, limited ops capacity)

## Options

### MongoDB
- Pros: Flexible schema, easy to start with
- Cons: Our data is inherently relational; would need to manage relationships manually
- Rejected: Relational data in a document store leads to complex joins or data duplication

### SQLite
- Pros: Zero configuration, embedded, fast for reads
- Cons: Limited concurrent write support, no managed hosting for production
- Rejected: Not suitable for multi-user web application in production

### MySQL
- Pros: Mature, widely supported
- Cons: PostgreSQL has better JSON support, full-text search, and ecosystem tooling
- Rejected: PostgreSQL is the better fit for our feature requirements

## Choice
Use PostgreSQL with Prisma ORM.

## Rationale
- Prisma provides type-safe database access and migration management
- We can use PostgreSQL's full-text search instead of adding Elasticsearch
- Team needs PostgreSQL knowledge (standard skill, low risk)
- Hosting on managed service (Supabase, Neon, or RDS)

## Reversibility
Two-way door: the ORM isolates the schema; switching engines is a migration, not a rewrite. Name it a one-way door when it is not.
```

### ADR Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED or DEPRECATED)
```

- **Don't delete old ADRs.** They capture historical context.
- When a decision changes, write a new ADR that references and supersedes the old one.

## Inline Documentation

### When to Comment

Comment the *why*, not the *what*:

```typescript
// BAD: Restates the code
// Increment counter by 1
counter += 1;

// GOOD: Explains non-obvious intent
// Rate limit uses a sliding window — reset counter at window boundary,
// not on a fixed schedule, to prevent burst attacks at window edges
if (now - windowStart > WINDOW_SIZE_MS) {
  counter = 0;
  windowStart = now;
}
```

### When NOT to Comment

```typescript
// Don't comment self-explanatory code
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Don't leave TODO comments for things you should just do now
// TODO: add error handling  ← Just add it

// Don't leave commented-out code
// const oldImplementation = () => { ... }  ← Delete it, git has history
```

### Document Known Gotchas

```typescript
/**
 * IMPORTANT: This function must be called before the first render.
 * If called after hydration, it causes a flash of unstyled content
 * because the theme context isn't available during SSR.
 *
 * See ADR-003 for the full design rationale.
 */
export function initializeTheme(theme: Theme): void {
  // ...
}
```

## API Documentation

For public APIs (REST, GraphQL, library interfaces), the reference lives with the code, not copied into a doc (W7); `ARCHITECTURE.md` links to it (`../../references/documentation-map.md`).

### Inline with Types (Preferred for TypeScript)

```typescript
/**
 * Creates a new task.
 *
 * @param input - Task creation data (title required, description optional)
 * @returns The created task with server-generated ID and timestamps
 * @throws {ValidationError} If title is empty or exceeds 200 characters
 * @throws {AuthenticationError} If the user is not authenticated
 *
 * @example
 * const task = await createTask({ title: 'Buy groceries' });
 * console.log(task.id); // "task_abc123"
 */
export async function createTask(input: CreateTaskInput): Promise<Task> {
  // ...
}
```

### OpenAPI / Swagger for REST APIs

```yaml
paths:
  /api/tasks:
    post:
      summary: Create a task
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateTaskInput'
      responses:
        '201':
          description: Task created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Task'
        '422':
          description: Validation error
```

## README Structure

The document index is `templates/README.md` (W11). A repository README covers:

```markdown
# Project Name

One-paragraph description of what this project does.

## Quick Start
1. Clone the repo
2. Install dependencies: `npm install`
3. Set up environment: `cp .env.example .env`
4. Run the dev server: `npm run dev`

## Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm test` | Run tests |
| `npm run build` | Production build |
| `npm run lint` | Run linter |

## Architecture
Brief overview of the project structure and key design decisions.
Link to ADRs for details.

## Contributing
How to contribute, coding standards, PR process.
```

## Changelog Maintenance

The shape of a W6 changelog:

```markdown
# Changelog

## [1.2.0] - 2025-01-20
### Added
- Task sharing: users can share tasks with team members (#123)
- Email notifications for task assignments (#124)

### Fixed
- Duplicate tasks appearing when rapidly clicking create button (#125)

### Changed
- Task list now loads 50 items per page (was 20) for better UX (#126)
```

## Documentation for Agents

Special consideration for AI agent context:

- **CLAUDE.md / rules files** — Document project conventions so agents follow them
- **Spec files** — Keep specs updated so agents build the right thing
- **ADRs** — Help agents understand why past decisions were made (prevents re-deciding)
- **Inline gotchas** — Prevent agents from falling into known traps
- **Skills** — Where stable content from a doc goes when it is compacted (W8)

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Every feature gets an HLD/LLD update" | Not every feature needs one; the ticket and the commit message carry most of it (W1). |
| "I'll paste the code into the doc so it is complete" | Never copy code into a doc; a person can always go to the code (W7). |
| "A longer doc is a more thorough doc" | Old, long docs are less accurate and less read; write short and high level (W7, W8). |
| "The doc has grown, that's normal" | Docs are compacted regularly by extracting stable content into skills (W8). |
| "I'll put it in Notion / a Google Doc for now" | No cloud artifacts; every document lives in the repository (W12). |
| "A screenshot of the diagram is fine" | Diagrams are code: Mermaid, `.drawio`, drawdb, committed and reviewed (W10). |
| "The HLD is done, review can wait" | Every HLD, LLD, and PRD is reviewed by the user before it is final (W3). |
| "Nobody will look for it in the index" | Every document is added to the index for progressive discovery (W11). |
| "The code is self-documenting" | Code shows what. It doesn't show why, what alternatives were rejected, or what constraints apply. |
| "We'll write docs when the API stabilizes" | APIs stabilize faster when you document them. The doc is the first test of the design. |
| "ADRs are overhead" | A 10-minute ADR prevents a 2-hour debate about the same decision six months later. |
| "Comments get outdated" | Comments on *why* are stable. Comments on *what* get outdated — that's why you only write the former. |

## Red Flags

- A doc update for a feature the ticket and commit message already explain (W1)
- Code copied into a document (W7)
- A document that keeps growing and is never compacted into a skill (W8)
- A document in a cloud tool, or in the agent brain, instead of the repository (W12)
- A diagram committed as an image instead of Mermaid, `.drawio`, or drawdb (W10)
- An HLD, LLD, or PRD treated as final without user review (W3)
- A document missing from the index (W11)
- A service with a persistent database and no DB design document (W4)
- Architectural decisions with no written rationale, options, or reversibility (W5)
- Public APIs with no documentation or types
- README that doesn't explain how to run the project
- Commented-out code instead of deletion
- TODO comments that have been there for weeks
- Documentation that restates the code instead of explaining intent

## Verification

After documenting:

- [ ] The ticket and the commit message did not already carry it (W1)
- [ ] The document uses its `templates/` anatomy with only the sections the work demands (W2)
- [ ] It is short and high level, with no code snippets and diagrams as code (W7, W10)
- [ ] It lives in the repository at `docs/` or `<service>/docs/`, with the HTML rendering for humans (W12, W13, W9)
- [ ] It is in the document index (W11)
- [ ] An HLD, LLD, or PRD has been reviewed by the user (W3)
- [ ] ADRs exist for all significant architectural decisions, each with problem, options, choice, rationale, and reversibility (W5)
- [ ] The changelog has a line per merged task and a release entry listing its tickets (W6)
- [ ] README covers quick start, commands, and architecture overview
- [ ] API functions have parameter and return type documentation
- [ ] Known gotchas are documented inline where they matter
- [ ] No commented-out code remains
- [ ] Rules files (CLAUDE.md etc.) are current and accurate
