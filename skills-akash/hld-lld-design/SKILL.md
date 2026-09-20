---
name: hld-lld-design
description: What a principal engineer puts in a High-Level Design and what a Low-Level Design must satisfy — API interface, domain models and glossary, service interactions and boundaries, tradeoffs, assumptions, goals, non-goals, diagrams, constraints, high-level observability (metrics, logs, alerts), alternatives considered, dependencies/infra, SLOs, and the LLD elements (important classes and interactions, DB schema, API contracts), plus the LLD design checklist (illegal states unrepresentable, validation at edges, typed models, layered models, comments policy, testability, composition). Load whenever you write, review, or are asked for an HLD, LLD, design doc, architecture proposal, tech spec, or "how should we design X".
---

# HLD and LLD design

Roles: the **principal engineer (PE)** writes the HLD, keeps it very high level (discussing an item only if they deem fit — items can be skipped), and **calls out what is left for staff engineers to figure out**. The HLD has some elements of LLD. Every HLD, LLD, and PRD is reviewed by the user. Not every feature needs an HLD or LLD.

## HLD contents — the PE covers

| # | Item |
| --- | --- |
| 1 | **API interface** |
| 2 | **Domain models and glossary** (see `domain-driven-design`) |
| 3 | **Interaction between services** |
| 4 | **Clear service boundaries** — when creating a new service or deciding where a feature should sit (bounded contexts, `CLAUDE.md` § Architecture A3) |
| 5 | **Tradeoffs** |
| 6 | **Assumptions** |
| 7 | **Goals** |
| 8 | **Non-goals** |
| 9 | **Diagrams** — as code: Mermaid flows, `.drawio` architecture next to `HLD.md` (`documentation`, W10) |
| 10 | **Constraints** |
| 11 | Separation of API models, domain/application models, and DB models so each layer can evolve independently (three layers: API, domain, DB) |
| 12 | Don't put comments in the code; put comments in the ticket and link the ticket in the code (read together with item 13: comments rare, "why" only) |
| 13 | **Dependencies / infra** |
| 14 | **SLOs** |
| 15 | **Constraints** (same as item 10) |
| 16 | **Some LLD:** (a) important classes, their interfaces and interactions among them; (b) DB schema (drawdb file next to `LLD.md`); (c) API contracts (OpenAPI) |

Tradeoffs and alternatives double as the decision record: problem, options, choice, rationale, reversibility, one-way doors. Be deliberate about DB models, main classes/interfaces, composition and inheritance, and patterns — each pattern names the problem it solves.

## LLD design checklist

Every item is also a coding rule in `coding-standards` / `domain-driven-design`; the LLD must show how the design satisfies them.

| # | Rule |
| --- | --- |
| 1 | Make illegal states unrepresentable |
| 2 | Do validations at the edges (when receiving data from API, database, event store, etc.) |
| 3 | Business logic has zero to minimal defense |
| 4 | If defensive programming is absolutely necessary, make that illegal state a first-class domain object so errors are explicit, not implicit |
| 5 | Strong typing according to the domain model |
| 6 | OpenAPI and generate well-typed clients |
| 7 | Type JSON |
| 8 | Use enums |
| 9 | Avoid raw strings at all costs |
| 10 | Don't favor high cyclomatic complexity |
| 11 | Separation of API models, domain/application models, and DB models so each layer can evolve independently (three layers: API, domain, DB) |
| 12 | Don't put comments in the code; put comments in the ticket and link the ticket in the code (read together with item 13: comments rare, "why" only) |
| 13 | Comments are sparingly used and describe the "why" — the product/business reasoning; what the code does should be self-explanatory |
| 14 | Always write testable code: don't inject concrete dependencies directly; avoid `random()`, `time()` in the code |
| 15 | Favor composition over inheritance |
| 16 | Deliberation on domain models: (a) use domain models for uuids; (b) sum types, product types |

## Document mechanics

- Write in the `templates/` anatomy; fill only what the work demands (`documentation` W2); keep it short and high level (`documentation` W7).
- `HLD.md` with `.drawio` beside it; `LLD.md` with the drawdb schema beside it; Mermaid inline.
- Store in `docs/` or `<service>/docs/`, never in the agent brain (`documentation` W12). Produce the Markdown and HTML renderings (`documentation` W9).
- Submit for user review (`documentation` W3).
