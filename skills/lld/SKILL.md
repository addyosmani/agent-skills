---
name: lld
description: "Turns a reviewed HLD into a low-level design for one service or module: folder structure, a UML class diagram of the main classes and their composition, data model and migrations, API contracts, state machines, error handling, and testing strategy, with the domain types from domain-modeling. Use when an engineer designs or updates the internals of the service it works in, before or alongside implementation."
category: design
---

# Low-Level Design

## Overview

The LLD is what an engineer implements from without asking questions. It lives in the service `docs/LLD.md` (`templates/LLD.md`), stays in sync with the code, and is reviewed by the user. The HLD named the APIs; the LLD decides the contracts.

Types, identifiers, invariants, layer separation, and error shape are `domain-modeling`. The LLD includes its output as code and adds the structure around it.

## When to Use

- After the HLD is reviewed, before the foundation task of a milestone.
- When a contract, schema, class structure, or state machine changes.
- NOT before the HLD is reviewed.
- NOT as a substitute for reading existing code: the LLD extends what is there.

## Process

1. **Read** the HLD, `docs/DOMAIN.md`, `CONVENTIONS.md`, and the existing code the module touches.
2. **Folder structure**: the files an engineer will create, feature-first and as flat as possible.
3. **Classes and composition as a UML class diagram** (Mermaid `classDiagram`): the main classes, interfaces, composition and inheritance, dependency direction. Name each pattern used (functional: compose; object: factory, registry, adapter, repository) and the problem it solves. Never a pattern for sophistication.
4. **Data model**: tables, columns, types, constraints, indexes; migration steps and rollback; the schema as a drawdb file next to the LLD.
5. **API contracts**: every endpoint with method, path, auth, request, response, errors, idempotency; the OpenAPI document is the source, the client is generated.
6. **State machines** where lifecycle exists: states, transitions, guards, side effects.
7. **Error handling**: per error type, whether the caller retries, corrects, or escalates; timeouts and idempotency keys only where an external flow needs them. Fail loudly.
8. **Testing strategy**: what is unit, contract, integration, end to end; which fakes are injected.
9. **Write** the sections into the service `docs/LLD.md`; link from the tasks that implement them; hand it to the user for review. Open questions go on the ticket.

## Principles every LLD applies

1. **Validate at the edges**: API, database, event store, external provider. Business logic has zero to minimal defense. Static types keep developers honest inside the code; runtime validation guards data that arrives from outside (HTTP, database, queue, files, users). Do not expect the type checker to validate external data, and do not use runtime checks as a substitute for good types inside. Generic parameters are erased or unreliable at runtime in most languages: keep explicit runtime type metadata next to the static type when runtime dispatch needs it.
2. **OpenAPI first, generated clients**, at the repository root; JSON typed at every boundary.
3. **Low cyclomatic complexity**: small functions, early returns, exhaustive `switch` over sum types. Code reads as flat as possible.
4. **Comments explain the why, rarely.** The reasoning is on the ticket; the ticket id is in the code.
5. **Testable by construction**: injected dependencies; `random()`, `time.now()`, and environment reads through injected providers.
6. **Backward compatible** when touching existing code.
7. **Composition over inheritance.** Behavior contracts are structural; inheritance is for shared implementation only. Prefer interfaces or protocols that implementations satisfy without inheriting; use base classes when there is genuinely shared state or lifecycle.

## Section checklist

| Section | Required when |
|---|---|
| Folder structure | always |
| Domain types as code (`domain-modeling`) | always |
| UML class diagram and patterns | always |
| Data model and migrations, drawdb file | persistence changes |
| API contracts, OpenAPI, generated client | any external or cross-service surface |
| State machines | any entity with lifecycle |
| Error handling | always |
| Testing strategy | always |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Types will emerge from the code." | Then every engineer invents their own. Types first is how parallel work stays consistent. |
| "The type checker validates the input." | It validates code, not data. External data is parsed at the edge; the two are different problems. |
| "I'll write the client by hand, it's small." | Hand-written clients drift from the contract. Generate it. |
| "We can add the migration rollback later." | A migration without rollback is a one-way door nobody approved. |
| "The class diagram is overhead." | It is where composition and inheritance get decided deliberately instead of by accident. |
| "The LLD is done once written." | An LLD that drifts from code is worse than none. Update it in the PR that changes the code. |

## Red Flags

- A hand-written client; `time.now()` or `random()` in domain code.
- A type-first folder layout for new code, or nesting nobody needed.
- An endpoint without an error model.
- A pattern without a stated problem.
- `LLD.md` untouched by a PR that changed a contract, schema, or class structure.

## Verification

- [ ] Every applicable section is filled with code-level detail; the class diagram is Mermaid, the schema is drawdb.
- [ ] Every task implementing this module links to its LLD section.
- [ ] Contracts match the HLD's named APIs and the domain glossary.
- [ ] Migrations have rollback steps and are backward compatible for one release.
- [ ] The user has reviewed the LLD.
