---
name: coding-standards
description: The rules for good, maintainable code in any language, each with an id (C1–C23) that designs, reviews, and other skills cite — typing (no raw strings, enums and typed ids, illegal states unrepresentable, typed inputs at the edges, strict per-language typing), layered API/domain/DB models, validation and defensive code at the edges only, errors as first-class domain citizens that fail loudly, low cyclomatic complexity, composition over inheritance, injected dependencies, rare "why" comments linked to tickets, backward compatibility, generated and vendor files untouched, no secrets in source. Use when writing, refactoring, or reviewing ANY code in any language, even a "quick fix" or a one-line change, or when a review or design cites a C rule by id.
category: coding
---

# Coding standards

## Overview

The rules every line of code in the project follows, each with an id (C1–C23) that other skills, references, and reviews point at. Apply every rule.

`domain-modeling` is the subset of these standards that decides what a domain concept is. When a rule here says "typed id", "enum", "sum type", or "domain object", that skill says how to find the concept, what kind it is, and what it must always satisfy.

## When to Use

- Before writing, refactoring, or reviewing ANY code in any language, even for a "quick fix" or a one-line change.
- When a review, an LLD (`lld`), or a domain model (`domain-modeling`) cites a C rule by id.
- NOT for deciding the domain concepts themselves: bounded contexts, entities, aggregates, events, invariants, and the glossary are `domain-modeling` (C23).

## Typing

| ID | Rule |
| --- | --- |
| C1 | **No raw strings for closed sets or identifiers, no opaque objects; everything typed.** A closed set is an enum; an identifier is a typed id. Which sets and ids the domain has is `domain-modeling` DD2, DD4. |
| C2 | **Make illegal states unrepresentable:** sum and product types and typed ids in place of boolean-flag combinations, nullable-everything structs, and runtime guards. |
| C3 | **A defensive check that cannot be avoided becomes a first-class domain object with an explicit error** (`ExpiredToken`, `OverdrawnAccount`), so the failure is explicit, not implicit. Why it is a domain concept: `domain-modeling` DD9. |
| C4 | **External inputs are typed at the edges.** Strong types at every boundary (API, persistence, external providers); no untyped boundary. |
| C5 | **JSON is typed at every boundary** (a schema per JSON shape; never "type json"). |
| C6 | **Pay cost at compile or build time instead of run time:** types, code generation, and static checks over runtime checks and defensive branches. |
| C7 | **Per-language strictness.** TypeScript `strict`, no `any`, schemas validated at every I/O boundary. Go: no `interface{}` at boundaries. Python: full type hints, Pydantic at I/O, `Protocol` or ABC for ports. Which construct expresses a closed set, a variant, or an id in each language: the mapping table in `domain-modeling`. |
| C8 | **A linter and a static type checker run on backend and frontend.** TypeScript for the frontend. |

## Models and boundaries

| ID | Rule |
| --- | --- |
| C9 | **API model, domain model, and DB model are separate, translated explicitly**, so each layer evolves independently; persistence models never leak into public APIs. Three layers; a separate application-model layer only as a recorded decision. |
| C10 | **Business validation happens in the backend only, at its edges** (API, database, event store, external providers). Clients render business truth; they never validate business rules. |
| C11 | **Defensive code at the edges only, never in business logic.** Validate at API, persistence, deserialization, and external-provider boundaries; business logic carries zero to minimal defensive noise. |
| C12 | **A generated, typed backend client — deferred for now.** Target design: OpenAPI generates well-typed clients; hand-written clients are not allowed; the client SDK lives at the repository root, outside the service folder; each service maintains its SDK and a dependent service calls through it; a generator per language only when required. Until the user takes this up, do not build the generator or `packages/api-client`; keep every call typed by hand against the OpenAPI contract. |
| C13 | **Backward compatible when touching existing code.** |
| C14 | **Never modify generated or vendor files.** Change the generator or the source. |

C4 and C11 together: static types keep developers honest inside the code; runtime validation guards data that arrives from outside (HTTP, database, queue, files, users). The type checker does not validate external data, and runtime checks are no substitute for good types inside. Generic parameters are erased or unreliable at runtime in most languages: keep explicit runtime type metadata next to the static type where runtime dispatch needs it.

## Errors

| ID | Rule |
| --- | --- |
| C15 | **Errors are first-class citizens of the domain. Fail loudly; never swallow errors.** |
| C16 | **A typed error union per module.** Override: a service that exposes a protocol uses that protocol's error model. |

## Shape of the code

| ID | Rule |
| --- | --- |
| C17 | **Low cyclomatic complexity.** Small functions, early returns, exhaustive `switch` over sum types; code reads as flat as possible, without misdirection. |
| C18 | **Composition over inheritance.** Behavior contracts are structural interfaces or protocols; a base class only for genuinely shared state or lifecycle. |
| C19 | **Testable by construction:** dependencies are injected as abstractions, never constructed inline; no inline `random()` or `time.now()`; environment reads go through injected providers. |
| C20 | **No silent creep:** no automatic retries, queues, caches, or elaborate coordination unless data makes the case. |

## Comments

| ID | Rule |
| --- | --- |
| C21 | **Comments are rare and explain the *why*** (product or business reasoning), never the *what*; what the code does is self-explanatory. The reasoning lives in the ticket, and the ticket id lives in the code. |

## Secrets

| ID | Rule |
| --- | --- |
| C22 | **No secrets in source, fixtures, logs, or tracker comments.** |

## Domain-driven design

| ID | Rule |
| --- | --- |
| C23 | **Use domain-driven design.** A service is a bounded context; ids, entities, value objects, aggregates, and domain events are modelled before they are coded. The rules and the process are `domain-modeling`. |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a one-line fix, the standards don't apply." | They apply to ANY code, even a one-line change. |
| "It's only ever one of three values, a string is fine." | Three values is a closed set. Enum or typed id (C1). |
| "A quick null check here is harmless." | Defense in business logic hides an illegal state. Make it unrepresentable (C2) or a domain object (C3); validate at the edge (C11). |
| "The type checker validates the input." | It validates code, not data. External data is parsed at the edge (C4). |
| "The frontend already validates it." | Clients never validate business rules (C10). |
| "One model for API, domain, and DB saves code." | It couples the client to the storage schema; every change becomes a migration and an API break (C9). |
| "Catch it and log it, we don't want to crash." | Fail loudly; never swallow errors (C15). |
| "A retry loop makes it robust." | Not without data behind it (C20). |
| "I'll add a comment explaining what this does." | Then the code is not self-explanatory. Fix the code; a why goes in the ticket, the ticket id in the code (C21). |
| "I'll just patch the generated file." | Change the generator or source (C14). |
| "`Date.now()` inline is simpler than injecting a clock." | And untestable. Inject it (C19). |

## Red Flags

- A string literal that names a state, kind, or id; an `any`, `interface{}`, or untyped dict at a boundary (C1, C4, C7).
- An `if` guarding something a type could forbid; defensive branches inside business logic (C2, C6, C11).
- A persistence model in an API response; a client validating a business rule (C9, C10).
- A hand-written client SDK or a `packages/api-client` generator built before the user took it up (C12).
- An error caught and ignored, or wrapped in a generic exception (C15, C16).
- `new Dependency()`, `random()`, `Date.now()`, or an environment read inside logic (C19).
- A retry, queue, or cache with no data behind it (C20).
- A comment that narrates the code; a "why" with no ticket id (C21).
- A diff that touches a generated or vendored file (C14).
- A secret in source, a fixture, a log line, or a tracker comment (C22).

## Verification

Before you commit, every red flag above is absent from the diff, and:

- [ ] The linter and type checker pass with no suppressions added (C7, C8).
- [ ] Every new type, id, and error names a concept from the domain glossary (C1, C3, C23; `domain-modeling` DD6).
- [ ] Existing callers still work (C13).
