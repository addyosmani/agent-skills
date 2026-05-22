---
name: ubiquitous-language
description: Maintains a living domain glossary (CONTEXT.md) and lightweight ADRs so the agent and team share precise vocabulary across sessions. Use when starting work on an unfamiliar codebase, when a domain term is ambiguous or contested, when an architectural decision is being made that is hard to reverse, or when spec-driven-development or interview-me surfaces a term that does not yet exist in CONTEXT.md.
---

# Ubiquitous Language

## Overview

Agents forget terminology between sessions. Teams argue about what words mean. Code drifts from the language the domain experts use. This skill maintains `CONTEXT.md` — a strict domain glossary — and `docs/adr/` — a record of architectural decisions — so that vocabulary is consistent across every session, every skill, and every team member.

This skill does **not** conduct interviews (that is `interview-me`) and does **not** write specs (that is `spec-driven-development`). Its only job is vocabulary and decision capture.

## When to Use

- A domain term appears in conversation that is not in `CONTEXT.md`
- A term in conversation conflicts with a definition already in `CONTEXT.md`
- `interview-me` or `spec-driven-development` resolves a naming decision
- An architectural decision is made that meets the ADR threshold (see below)
- Starting work on a codebase with no `CONTEXT.md` yet
- A team member uses a different word for a concept that already has a canonical name

**NOT for:**
- General project documentation (use `documentation-and-adrs`)
- Implementation decisions that are easy to reverse
- Anything covered by `interview-me` or `spec-driven-development`

## Process

### Step 1 — Discover existing context

Before adding or updating anything, check what already exists:

```
/
├── CONTEXT.md           ← single-context repo
├── CONTEXT-MAP.md       ← multi-context repo (points to per-context CONTEXT.md files)
└── docs/
    └── adr/
        ├── 0001-*.md
        └── 0002-*.md
```

- If `CONTEXT-MAP.md` exists, read it to find all contexts. Infer which context the current topic belongs to. If unclear, ask.
- If only a root `CONTEXT.md` exists, single context.
- If neither exists, create `CONTEXT.md` lazily — only when the first term is ready to record.

### Step 2 — Resolve the term

Before writing anything, the term must be fully resolved:

1. **Check for conflict.** Does `CONTEXT.md` already define this concept under a different name? If so, surface the conflict: "Your glossary defines this as X, but you are using Y — which should be canonical?"
2. **Sharpen the definition.** Is the proposed definition one or two sentences? Does it define what the concept *is* — not what it does? Does it avoid implementation details?
3. **Pick the canonical name.** If multiple words exist for the same concept, pick one. List the others under `_Avoid_`.
4. **Check for relationships.** Does this term have a clear cardinality relationship with another term already in the glossary? Express it.

### Step 3 — Update CONTEXT.md

Update immediately — do not batch.

Add the term under the `## Language` section:

```markdown
**[Term]**:
[One or two sentence definition. What it IS, not what it does. No implementation details.]
_Avoid_: [synonym], [alias]
```

**CONTEXT.md structure:**

```markdown
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request
```

If this is the first substantial entry, or if the term's boundaries with related concepts are non-obvious, also add an **example dialogue** — a short conversation between a developer and a domain expert that demonstrates how the terms interact and clarifies where one concept ends and another begins.

Group terms under subheadings only when natural clusters emerge. A flat list is fine for small glossaries.

**CONTEXT.md must stay free of:**
- Implementation details (no class names, no database schemas)
- Specs or plans
- General programming concepts (timeouts, retries, error types)
- Anything a reader could infer without domain knowledge

### Step 4 — Offer an ADR (sparingly)

Only offer an ADR when **all three** conditions are true:

1. **Hard to reverse** — the cost of changing the decision later is meaningful
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **Result of a real trade-off** — genuine alternatives existed and one was chosen for specific reasons

If any condition is missing, skip the ADR. Most decisions do not need one.

**ADR format** (`docs/adr/0001-slug.md`, sequential numbering):

```markdown
# {Short title of the decision}

{1-3 sentences: what's the context, what did we decide, and why.}
```

That's it. An ADR can be a single paragraph. Only add optional sections (`Status`, `Considered Options`, `Consequences`) when they add genuine value — most ADRs won't need them.

**What qualifies for an ADR:**
- Architectural shape ("we're using a monorepo", "the write model is event-sourced")
- Integration patterns between contexts (domain events vs synchronous HTTP)
- Technology choices that carry lock-in (database, message bus, auth provider)
- Deliberate deviations from the obvious path — anything where a reasonable reader would assume the opposite
- Constraints not visible in the code ("we can't use AWS because of compliance requirements")

### Step 5 — Cross-reference downstream skills

If a spec file (`docs/spec-*.md` or equivalent) exists and is actively being drafted, search it for the alias terms listed in `_Avoid_` for the entry you just added. If any alias appears in the spec, flag it to the user: state the old alias, the canonical name, and which file:line needs updating. Do not silently substitute — confirm the canonical name before editing the spec.

## Multi-context repos

When `CONTEXT-MAP.md` exists, infer which bounded context the current topic belongs to. Update only that context's `CONTEXT.md`. If a term spans multiple contexts (e.g. a shared `CustomerId` type), document it in the context that owns the concept and reference it from others.

`CONTEXT-MAP.md` format:

```markdown
# Context Map

## Contexts

- [ContextName](./path/to/CONTEXT.md) — one sentence description

## Relationships

- **A → B**: how A and B interact
```

## Common Rationalizations

| Rationalization | Reality |
| --------------- | ------- |
| "Everyone on the team already knows what this means" | Everyone on the team uses different words for it. The next agent session will too. |
| "I'll update the glossary after the spec is done" | Terminology is hardest to fix after it is embedded in a spec. Fix it now while it is one word. |
| "This term is obvious, it doesn't need a definition" | Obvious terms are the most frequently contested. Define them anyway. |
| "We need an ADR for every decision" | No. ADRs are for decisions that are hard to reverse, surprising without context, and the result of a real trade-off. Most decisions fail at least one condition. |
| "The code is the documentation" | The code shows what was done. `CONTEXT.md` shows what it means in the domain. These are different things. |
| "CONTEXT.md will get out of date" | CONTEXT.md goes out of date when it is not updated inline. This skill updates it immediately. |

## Red Flags

- Agent uses a term in a spec that is not in `CONTEXT.md` without flagging it
- Two terms in `CONTEXT.md` describe the same concept
- `CONTEXT.md` contains implementation details (class names, table names, API paths)
- An ADR is being written for a decision that is easy to reverse
- `CONTEXT.md` has not been checked before writing a spec or a plan

## Verification

After each update, confirm:

- [ ] New term appears in `CONTEXT.md` under `## Language`
- [ ] Definition is one or two sentences, describes what the concept IS
- [ ] All aliases listed under `_Avoid_`
- [ ] No implementation details in any definition
- [ ] If an ADR was written, it meets all three conditions (hard to reverse, surprising, real trade-off)
- [ ] No existing term in `CONTEXT.md` now conflicts with the new entry
- [ ] Any in-progress spec uses the canonical name, not an alias
