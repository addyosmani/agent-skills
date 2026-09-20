---
name: lld
description: What a Low-Level Design must satisfy — the LLD elements (important classes and interactions, DB schema, API contracts) plus the LLD design checklist (illegal states unrepresentable, validation at edges, typed models, layered models, comments policy, testability, composition), and the document mechanics; turns a reviewed HLD into a low-level design for one service or module with folder structure, a UML class diagram of the main classes and their composition, data model and migrations, API contracts, state machines, error handling, and testing strategy, with the domain types from domain-modeling. Use when you write, review, or are asked for an LLD, or when an engineer designs or updates the internals of the service it works in, before or alongside implementation.
category: design
---

# Low-Level Design

## Overview

The LLD is what an engineer implements from without asking questions. It lives in the service `docs/LLD.md` (`templates/LLD.md`), stays in sync with the code, and is reviewed by the user (roles in `hld`). The HLD named the APIs; the LLD decides the contracts.

Types, identifiers, invariants, and aggregate validation are `domain-modeling`; the coding rules the design must satisfy are `coding-standards`; the data model rules are `database`. The LLD includes their output as code and adds the structure around it.

## When to Use

- After the HLD is reviewed, before the foundation task of a milestone.
- When a contract, schema, class structure, or state machine changes.
- Asked for an LLD, or to review one.
- NOT before the HLD is reviewed.
- NOT as a substitute for reading existing code: the LLD extends what is there.

## Process

1. **Read** the HLD, `docs/DOMAIN.md`, `coding-standards`, and the existing code the module touches.
2. **Folder structure**: the files an engineer will create, feature-first and as flat as possible.
3. **Classes and composition as a UML class diagram** (Mermaid `classDiagram`): the main classes, interfaces, composition and inheritance, dependency direction. Name each pattern used (functional: compose; object: factory, registry, adapter, repository) and the problem it solves (`domain-modeling` DD5). Never a pattern for sophistication.
4. **Data model** (`database` D8, D10): tables, columns, types, constraints, indexes; migration steps and rollback per `database` D4; the schema as a drawdb file next to the LLD per `database` D7.
5. **API contracts**: every endpoint with method, path, auth, request, response, errors, idempotency; the OpenAPI document is the source; the client per `coding-standards` C12.
6. **State machines** where lifecycle exists: states, transitions, guards, side effects.
7. **Error handling**: per error type, whether the caller retries, corrects, or escalates; timeouts and idempotency keys only where an external flow needs them. Fail loudly (`coding-standards` C15, C16).
8. **Testing strategy**: what is unit, contract, integration, end to end; which fakes are injected (`coding-standards` C19).
9. **Write** the sections into the service `docs/LLD.md` (Document mechanics below); link from the tasks that implement them; hand it to the user for review. Open questions go on the ticket.

## LLD design checklist

Every item is also a coding rule in `coding-standards` / `domain-modeling`; the LLD must show how the design satisfies them.

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

- Write in the `templates/` anatomy; fill only what the work demands (`documentation-and-adrs` W2); keep it short and high level (`documentation-and-adrs` W7).
- `HLD.md` with `.drawio` beside it; `LLD.md` with the drawdb schema beside it; Mermaid inline.
- Store in `docs/` or `<service>/docs/`, never in the agent brain (`documentation-and-adrs` W12). Produce the Markdown and HTML renderings (`documentation-and-adrs` W9).
- Submit for user review (`documentation-and-adrs` W3).

## Section checklist

| Section | Required when |
|---|---|
| Folder structure | always |
| Domain types as code (`domain-modeling`) | always |
| UML class diagram and patterns | always |
| Data model and migrations, drawdb file (`database`) | persistence changes |
| API contracts, OpenAPI | any external or cross-service surface |
| State machines | any entity with lifecycle |
| Error handling | always |
| Testing strategy | always |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Types will emerge from the code." | Then every engineer invents their own. Types first is how parallel work stays consistent. |
| "The class diagram is overhead." | It is where composition and inheritance get decided deliberately instead of by accident. |
| "The checklist is for the code review, not the design." | The LLD must show how the design satisfies every checklist item; a design that cannot is rewritten before implementation. |
| "The LLD is done once written." | An LLD that drifts from code is worse than none. Update it in the PR that changes the code. |
| "Keep the LLD in the agent brain so agents find it." | It lives in `docs/` or `<service>/docs/`, never in the agent brain (Document mechanics). |

## Red Flags

- A type-first folder layout for new code, or nesting nobody needed.
- An endpoint without an error model.
- A pattern without a stated problem.
- A design that violates a checklist item without saying how it is resolved.
- An `LLD.md` with no drawdb schema beside it when persistence changes.
- `LLD.md` untouched by a PR that changed a contract, schema, or class structure.

## Verification

- [ ] Every applicable section is filled with code-level detail; the class diagram is Mermaid, the schema is drawdb.
- [ ] The LLD shows how the design satisfies every item of the LLD design checklist (1–16).
- [ ] Every task implementing this module links to its LLD section.
- [ ] Contracts match the HLD's named APIs and the domain glossary.
- [ ] The data model and migrations satisfy `database` D4, D7, D8, D10.
- [ ] Both renderings are produced and the document is stored where Document mechanics says.
- [ ] The user has reviewed the LLD.
