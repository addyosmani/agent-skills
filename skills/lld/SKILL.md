---
name: lld
description: How to write a Low-Level Design an engineer implements from without asking questions — turning a reviewed HLD into the design of one service or module, section by section (folder structure, domain types as code, UML class diagram and patterns, data model and migrations, API contracts, state machines, error handling, testing strategy), when each section is required, how the document shows it satisfies coding-standards, domain-modeling, and database, and the document mechanics (template, drawdb schema beside it, renderings, user review). Use when you write, review, or are asked for an LLD, or when an engineer designs or updates the internals of the service it works in, before or alongside implementation.
category: design
---

# Low-Level Design

## Overview

The LLD is what an engineer implements from without asking questions. It lives in the service `docs/LLD.md` (`templates/LLD.md`), stays in sync with the code, and is reviewed by the user (roles in `hld`). The HLD named the APIs; the LLD decides the contracts.

This skill is how to write the document. The rules the design must satisfy live elsewhere: coding rules in `coding-standards`, domain concepts in `domain-modeling`, data rules in `database`. The LLD includes their output as code and adds the structure around it.

## When to Use

- After the HLD is reviewed, before the foundation task of a milestone.
- When a contract, schema, class structure, or state machine changes.
- Asked for an LLD, or to review one.
- NOT before the HLD is reviewed.
- NOT as a substitute for reading existing code: the LLD extends what is there.

## Process

Each step is a section of `templates/LLD.md`; a section is omitted only when its condition does not hold.

1. **Read** the HLD, `docs/DOMAIN.md`, `coding-standards`, and the existing code the module touches.
2. **Folder structure** (always): the files an engineer will create, feature-first and as flat as possible; never a type-first layout for new code.
3. **Domain types as code** (always): the ids, enums, sum and product types, DTOs, error types, and ports, produced with `domain-modeling` and written in the service language.
4. **Classes and composition as a UML class diagram** (always; Mermaid `classDiagram`): the main classes, interfaces, composition and inheritance, dependency direction. Name each pattern used and the problem it solves (`domain-modeling` DD5).
5. **Data model and migrations** (when persistence changes): tables, columns, types, constraints, indexes per `database` D8, D10; migration steps and rollback per D4; the schema as a drawdb file next to the LLD per D7.
6. **API contracts** (any external or cross-service surface): every endpoint with method, path, auth, request, response, errors, idempotency; the OpenAPI document is the source; the client per `coding-standards` C12.
7. **State machines** (any entity with a lifecycle): states as a sum type, transitions, guards, side effects.
8. **Error handling** (always): the typed error union per module (`coding-standards` C16) and, per error type, whether the caller retries, corrects, or escalates; timeouts and idempotency keys only where an external flow needs them.
9. **Testing strategy** (always): what is unit, contract, integration, end to end; which fakes are injected (`coding-standards` C19).
10. **Rules satisfied**: for each rule in the table below, the section of this design that satisfies it.
11. **Write** the sections into the service `docs/LLD.md` (Document mechanics below); link from the tasks that implement them; hand it to the user for review. Open questions go on the ticket.

## Rules the design decides

A design, unlike a line of code, decides these rules once for the whole module. The template's "Rules satisfied" section says where each is satisfied; a design that cannot is rewritten before implementation.

| Decided by the design | Rule |
|---|---|
| Which states and variants exist, and which are impossible | `coding-standards` C2; `domain-modeling` DD4, DD9 |
| Where validation and defensive code sit, and what the edges are | `coding-standards` C10, C11 |
| API, domain, and DB models, and the translations between them | `coding-standards` C9 |
| The error model per module and per endpoint | `coding-standards` C16; `domain-modeling` DD11 |
| Composition, inheritance, and the patterns used | `coding-standards` C18; `domain-modeling` DD5 |
| Which dependencies are injected and faked | `coding-standards` C19 |
| The bounded context and the aggregate validation layer | `domain-modeling` DD1, DD10 |
| Schema, migrations, rollback, drawdb file | `database` D4, D7, D8, D10 |

## Document mechanics

- Write in the `templates/` anatomy; fill only what the work demands (`documentation` W2); keep it short and high level (`documentation` W4).
- `LLD.md` with the drawdb schema beside it; Mermaid inline.
- Store in `docs/` or `<service>/docs/`, never in the agent brain (`documentation` W9). Produce the Markdown and HTML renderings (`documentation` W6).
- Submit for user review (`documentation` W3).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Types will emerge from the code." | Then every engineer invents their own. Types first is how parallel work stays consistent. |
| "The class diagram is overhead." | It is where composition and inheritance get decided deliberately instead of by accident. |
| "The rules are for the code review, not the design." | The LLD shows where the design satisfies each rule it decides; a design that cannot is rewritten before implementation. |
| "The LLD is done once written." | An LLD that drifts from code is worse than none. Update it in the PR that changes the code. |
| "Keep the LLD in the agent brain so agents find it." | It lives in `docs/` or `<service>/docs/`, never in the agent brain (Document mechanics). |

## Red Flags

- A type-first folder layout for new code, or nesting nobody needed.
- An endpoint without an error model.
- A pattern without a stated problem.
- A design that violates a rule it decides without saying how it is resolved.
- An `LLD.md` with no drawdb schema beside it when persistence changes.
- `LLD.md` untouched by a PR that changed a contract, schema, or class structure.

## Verification

- [ ] Every applicable section is filled with code-level detail; the class diagram is Mermaid, the schema is drawdb.
- [ ] "Rules satisfied" names a section for every rule in the table above.
- [ ] Every task implementing this module links to its LLD section.
- [ ] Contracts match the HLD's named APIs and the domain glossary.
- [ ] Both renderings are produced and the document is stored where Document mechanics says.
- [ ] The user has reviewed the LLD.
