---
name: documentation-and-adrs
description: Records decisions and documentation. Use when making architectural decisions, changing public APIs, shipping features, or when you need to record context that future engineers and agents will need to understand the codebase.
---

# Documentation and ADRs

## Overview

Document decisions, not just code. The most valuable documentation captures the *why* — the context, constraints, and trade-offs that led to a decision. Code shows *what* was built; documentation explains *why it was built this way* and *what alternatives were considered*. This context is essential for future humans and agents working in the codebase.

## When to Use

- Making a significant architectural decision
- Choosing between competing approaches
- Adding or changing a public API
- Shipping a feature that changes user-facing behavior
- Onboarding new team members (or agents) to the project
- When you find yourself explaining the same thing repeatedly

**When NOT to use:** Don't document obvious code. Don't add comments that restate what the code already says. Don't write docs for throwaway prototypes.

## Architecture Decision Records (ADRs)

ADRs capture the reasoning behind significant technical decisions. They're the highest-value documentation you can write.

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

Store ADRs in `docs/decisions/` with sequential numbering (unless the project already uses another location — see above):

```markdown
# ADR-001: Use PostgreSQL for primary database

## Status
Accepted | Superseded by ADR-XXX | Deprecated

## Date
2025-01-15

## Context
We need a primary database for the task management application. Key requirements:
- Relational data model (users, tasks, teams with relationships)
- ACID transactions for task state changes
- Support for full-text search on task content
- Managed hosting available (for small team, limited ops capacity)

## Decision
Use PostgreSQL with Prisma ORM.

## Alternatives Considered

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

## Consequences
- Prisma provides type-safe database access and migration management
- We can use PostgreSQL's full-text search instead of adding Elasticsearch
- Team needs PostgreSQL knowledge (standard skill, low risk)
- Hosting on managed service (Supabase, Neon, or RDS)
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

For public APIs (REST, GraphQL, library interfaces):

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

Every project should have a README that covers:

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

For shipped features:

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

## Documentation Drift

Missing documentation is visible. Drifted documentation is not: it was true when
written, the code moved, and the file still reads as authoritative. An agent that
finds a confident, wrong document trusts it — and a reader has no way to tell a
current document from a stale one by looking at it.

Agents make this worse in both directions. They generate documentation readily,
so there is more of it, and they have no mechanism to notice when what they wrote
has stopped being true.

Writing docs is a one-time act. Keeping them true is a recurring one, and it needs
a mechanism rather than an intention.

### Three mechanisms

**1. Stamp each document with a freshness date.**

```markdown
# Rate Limiter

Last verified: 2025-01-20
```

A reader can now tell a document checked last week from one abandoned last year.
The stamp is a claim a human makes, so treat it as a hint, not proof — the check
in mechanism 3 is what actually enforces.

**2. Keep the change log append-only.**

```markdown
## Change Log (newest first)

- [2025-01-20] PERF-412 — switched to token bucket · fixed windows allowed 2x
  burst at the boundary.
- [2024-11-03] Initial limiter documented.
```

Append; never rewrite. Git already holds the old text, so a rewritten log destroys
the only record of *why* something changed while preserving nothing. One line per
change: date, reference, what changed, and the reason after a separator.

**3. Route each code path to the document that must change with it.**

This is the mechanism that makes the other two enforceable. Without it,
"keep the docs current" has nothing to check against.

```json
{
  "map": {
    "src/rate-limiter.js": "docs/rate-limiter.md",
    "src/queue.js": "docs/queue.md"
  },
  "exempt": ["src/index.js"]
}
```

Explicit entries beat glob patterns: they are greppable, reviewable in a diff, and
a new file that nobody mapped is itself a finding rather than a silent gap. Make
exemption deliberate and written down.

### The workflow

1. **Map the code paths that have documentation.** Generate the map from the
   repository rather than hand-writing it, then review it.
2. **Check the map.** For each entry, ask four questions:

   | Condition | Meaning |
   |---|---|
   | The mapped document does not exist | Documentation was never written |
   | The code's last commit is newer than the document's | The document has drifted |
   | A source file is neither mapped nor exempt | New code escaped the check |
   | The document exists but its code is gone | Documentation outlived its subject |

3. **Decide staleness from version control, not from the stamp.** A hand-written
   date is forged by forgetting. Compare the last commit that touched the code
   against the last commit that touched its document:

   ```bash
   git log -1 --format=%H -- src/rate-limiter.js
   git log -1 --format=%H -- docs/rate-limiter.md
   git merge-base --is-ancestor "$DOC_SHA" "$CODE_SHA" && echo "doc is stale"
   ```

   Identical commits mean they were changed together — not stale.

4. **Report what you could not determine.** If the two commits are unordered —
   divergent branches, a rebase, a cherry-pick, a shallow clone — the honest answer
   is *"cannot tell"*. Reporting that as "current" is the failure this whole section
   exists to prevent: a check that passes because it saw nothing.

5. **Run the check where it changes behaviour.** In CI, and in a pre-commit hook
   scoped to staged files only: if a mapped code file is staged without its
   document, stop the commit.

### Gate strictness is a real trade-off

| | Blocks the commit | Warns only |
|---|---|---|
| **Cost** | Friction; gets bypassed under deadline | Gets scrolled past and ignored |
| **Escape** | `--no-verify`, deliberate and visible | None needed — that is the problem |

There is no free option. Choose blocking when the documentation is load-bearing,
and print the escape hatch in the failure message so it stays deliberate rather
than becoming a workaround someone discovers under pressure.

**Keep the commit gate scoped to staged files.** A gate that fails on pre-existing
repository-wide drift blocks work unrelated to the change in hand, and a gate that
blocks unrelated work is disabled within a week. Repository-wide checking belongs
in CI, run against the whole tree.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The code is self-documenting" | Code shows what. It doesn't show why, what alternatives were rejected, or what constraints apply. |
| "We'll write docs when the API stabilizes" | APIs stabilize faster when you document them. The doc is the first test of the design. |
| "Nobody reads docs" | Agents do. Future engineers do. Your 3-months-later self does. |
| "ADRs are overhead" | A 10-minute ADR prevents a 2-hour debate about the same decision six months later. |
| "Comments get outdated" | Comments on *why* are stable. Comments on *what* get outdated — that's why you only write the former. |
| "The docs were right when I wrote them" | They were. Nobody reads a document with a timestamp of when it was *written* — they need to know when it was last *checked*. |
| "I'll tidy the change log while I'm in here" | Git holds the old text; the log holds the reasons. Rewriting it destroys the only copy of the reasoning and preserves nothing. |
| "A warning is enough, blocking is annoying" | A warning that can be scrolled past is not enforcement. Choose deliberately, and print the escape hatch. |

## Red Flags

- Architectural decisions with no written rationale
- Public APIs with no documentation or types
- README that doesn't explain how to run the project
- Commented-out code instead of deletion
- TODO comments that have been there for weeks
- No ADRs in a project with significant architectural choices
- Documentation that restates the code instead of explaining intent
- Documentation with no indication of when it was last checked against the code
- A change log that has been rewritten rather than appended to
- Source files with no documented owner and no recorded exemption
- A doc-freshness check that reports "clean" without saying what it could not determine

## Verification

After documenting:

- [ ] ADRs exist for all significant architectural decisions
- [ ] README covers quick start, commands, and architecture overview
- [ ] API functions have parameter and return type documentation
- [ ] Known gotchas are documented inline where they matter
- [ ] No commented-out code remains
- [ ] Rules files (CLAUDE.md etc.) are current and accurate
- [ ] Each documented code path is routed to its document, and unmapped files are either mapped or explicitly exempt
- [ ] Documents carry a freshness stamp, and change logs were appended to rather than rewritten
- [ ] The drift check runs somewhere it changes behaviour (CI, or a staged-file commit hook)
- [ ] Anything the check could not determine is reported as undetermined, not as passing
