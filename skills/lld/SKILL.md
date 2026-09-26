---
name: lld
description: How to write a Low-Level Design an engineer implements from without asking questions — turning a reviewed HLD into the design of one service or module from templates/LLD.md, section by section (folder structure, types as code, UML class diagram and patterns, data model and migrations, API contracts, state machines, error handling, testing strategy), when each section is required, and the document mechanics. Use when you write, review, or are asked for an LLD, or when an engineer designs or updates the internals of the service it works in, before or alongside implementation.
category: design
---

# Low-Level Design

## Overview

The LLD is what an engineer implements from without asking questions. It lives in the service `docs/LLD.md` (`templates/LLD.md`), stays in sync with the code, and is reviewed by the user. The HLD named the APIs; the LLD decides the contracts.

This skill is the general guidance for the document. The specifics the design must satisfy live in `coding-standards`, `domain-modeling`, `database`, and `api-and-interface-design`; the LLD includes their output as code and adds the structure around it.

## When to Use

- After the HLD is reviewed, before the foundation task of a milestone.
- When a contract, schema, class structure, or state machine changes.
- Asked for an LLD, or to review one.
- NOT before the HLD is reviewed.
- NOT as a substitute for reading existing code: the LLD extends what is there.

## Process

Each step is a section of `templates/LLD.md`; a section is omitted only when its condition does not hold.

1. **Read** the HLD, `docs/DOMAIN.md`, and the existing code the module touches.
2. **Folder structure** (always): the files an engineer will create, feature-first and as flat as possible; never a type-first layout for new code.
3. **Types as code** (always): the ids, enums, sum and product types, DTOs, error types, and ports, written in the service language, with the API, domain, and persistence models kept apart and their translations explicit.
4. **Classes and composition as a UML class diagram** (always; Mermaid `classDiagram`): the main classes, interfaces, composition and inheritance, dependency direction. Every pattern used names the problem it solves; never a pattern for sophistication.
5. **Data model and migrations** (when persistence changes): tables, columns, types, constraints, indexes; migration steps and rollback; the schema as a drawdb file next to the LLD.
6. **API contracts** (any external or cross-service surface): every endpoint with method, path, auth, request, response, errors, idempotency. The OpenAPI document is the source; clients are typed against it.
7. **State machines** (any entity with a lifecycle): states as a sum type, transitions, guards, side effects.
8. **Error handling** (always): the typed errors per module and, per error, whether the caller retries, corrects, or escalates; timeouts and idempotency keys only where an external flow needs them.
9. **Testing strategy** (always): what is unit, contract, integration, end to end; which fakes are injected.
10. **Write** the sections into the service `docs/LLD.md` (Document mechanics below); link from the tasks that implement them; hand it to the user for review. Open questions go on the ticket.

A design decides once, for the whole module, what a line of code cannot: which states are impossible, where validation sits, how the models are layered, what the error model is, what is injected. Where the design cannot satisfy a coding, domain, or data rule, it is rewritten before implementation, not worked around in code.

## Document mechanics

- Write in the `templates/` anatomy; fill only what the work demands; keep it short and high level, no code beyond the types section.
- `LLD.md` with the drawdb schema beside it; Mermaid inline.
- Store in `docs/` or `<service>/docs/`, never in the agent brain. Produce the Markdown and HTML renderings.
- Submit for user review.

## Interaction with other skills

- Upstream: `hld` names the APIs and boundaries this document details; `prd-writing` holds the acceptance criteria the testing strategy maps to.
- Alongside: `coding-standards`, `domain-modeling`, `database`, and, for a backend service, `api-and-interface-design` are the specifics the design must satisfy; `documentation` is how the document is written, rendered, and stored.
- Downstream: `planning-and-task-breakdown` links every task to an LLD section; `test-driven-development` implements the testing strategy.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Types will emerge from the code." | Then every engineer invents their own. Types first is how parallel work stays consistent. |
| "The class diagram is overhead." | It is where composition and inheritance get decided deliberately instead of by accident. |
| "The coding rules are for the code review, not the design." | A design that cannot satisfy them is rewritten before implementation; the review is too late. |
| "The LLD is done once written." | An LLD that drifts from code is worse than none. Update it in the PR that changes the code. |
| "Keep the LLD in the agent brain so agents find it." | It lives in `docs/` or `<service>/docs/`, never in the agent brain. |

## Red Flags

- A type-first folder layout for new code, or nesting nobody needed.
- An endpoint without an error model.
- A pattern without a stated problem.
- A design that breaks a rule from a companion skill without saying how it is resolved.
- An `LLD.md` with no drawdb schema beside it when persistence changes.
- `LLD.md` untouched by a PR that changed a contract, schema, or class structure.

## Verification

- [ ] Every applicable section is filled with code-level detail; the class diagram is Mermaid, the schema is drawdb.
- [ ] The design satisfies the coding, domain, data, and API rules, or says where it could not and why.
- [ ] Every task implementing this module links to its LLD section.
- [ ] Contracts match the HLD's named APIs and the domain glossary.
- [ ] Both renderings are produced and committed where Document mechanics says, the HTML beside the Markdown.
- [ ] The user has reviewed the LLD.
