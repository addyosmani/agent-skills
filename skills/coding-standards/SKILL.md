---
name: coding-standards
description: Coding rules for all backend, web, and mobile code — no raw strings or opaque objects, everything typed, illegal states unrepresentable, typed inputs at the edges, separated API/application/domain/DB models, generated typed clients and where the SDK lives, compile-time over runtime cost, errors as first-class domain citizens, fail loudly, low cyclomatic complexity, defensive code at edges only, rare "why" comments linked to tickets, testable-by-construction dependency injection, composition over inheritance, backward compatibility, never editing generated or vendor files, no secrets in source, and per-language strict typing detail. Use when writing, refactoring, or reviewing ANY code in any language, even for a "quick fix" or a one-line change.
category: coding
---

# Coding standards

## Overview

The rules every line of code in the project follows, each with an ID (C1–C23) that other skills, references, and reviews point at. Apply every rule.

## When to Use

- Before writing, refactoring, or reviewing ANY code in any language, even for a "quick fix" or a one-line change.
- When a review, an LLD (`lld`), or a domain model (`domain-modeling`) cites a C rule by ID.
- NOT a substitute for the domain model itself: entities, ids, aggregates, events, and bounded contexts are `domain-modeling` (C23).

## Typing

| ID | Rule |
| --- | --- |
| C1 | **No strings for closed sets or identifiers; use enums and typed ids. No opaque objects. Everything typed.** Avoid raw strings at all costs; use enums. |
| C2 | **Make illegal states unrepresentable:** enums, sum and product types, typed identifiers. |
| C3 | **A defensive check that cannot be avoided becomes a first-class domain object with an explicit error** — so the error is explicit, not implicit. |
| C4 | **External inputs are typed at the edges.** Strong types at every boundary (API, persistence, external providers); types express domain concepts and API contracts; no untyped boundaries. Strong typing according to the domain model. |
| C5 | **JSON is typed at every boundary** (JSON Schema for typed JSON; "type json"). |
| C6 | **Pay cost at compile/build time instead of run time:** types, code generation, and static checks over runtime checks and defensive branches. |
| C7 | **Per-language strictness.** TypeScript strict: no `any`, enums or literal unions for closed sets, discriminated unions for variants, branded identifiers, schemas validated at every I/O boundary. Go: typed identifiers, typed constants, no `interface{}` at boundaries. Python: full type hints, Pydantic at I/O, `Enum`/`Literal` for closed sets, `Protocol`/ABC for ports. |
| C8 | A linter and a static type checker run on backend and frontend. TypeScript for the frontend. |

## Models and boundaries

| ID | Rule |
| --- | --- |
| C9 | **API model, domain model, and DB model are separate, translated explicitly**, so each layer can evolve independently; persistence models never leak into public APIs. **Three layers** (no separate application-model layer by default; if one is needed it is a recorded decision). |
| C10 | **Validation happens in the backend only, at its edges** (API, database, event store, external providers). Clients never validate business rules. |
| C11 | **Defensive code at the edges only, never in business logic.** Validate at API, database, persistence, deserialization, and external-provider boundaries; business logic carries zero to minimal defensive noise. |
| C12 | **A generated, typed backend client — deferred for now.** Target design: OpenAPI generates well-typed clients; hand-written clients are not allowed; the client SDK lives at the repository root, outside the service folder; each service maintains its SDK and a dependent service calls through it; a generator per language only when required (never beforehand). Until the user takes this up, do not build the generator or `packages/api-client`; keep every call typed by hand against the OpenAPI contract. |
| C13 | **Backward compatible when touching existing code.** |
| C14 | **Never modify generated or vendor files.** |

C11 in practice: static types keep developers honest inside the code; runtime validation guards data that arrives from outside (HTTP, database, queue, files, users). Do not expect the type checker to validate external data, and do not use runtime checks as a substitute for good types inside. Generic parameters are erased or unreliable at runtime in most languages: keep explicit runtime type metadata next to the static type when runtime dispatch needs it.

## Errors

| ID | Rule |
| --- | --- |
| C15 | **Errors are first-class citizens of the domain. Fail loudly; never swallow errors.** |
| C16 | **Error model:** a typed error union per module. Override: the service exposes a protocol with its own error model. |

## Shape of the code

| ID | Rule |
| --- | --- |
| C17 | **Low cyclomatic complexity.** Code reads as flat as possible; avoid unnecessary misdirection. Don't favor high cyclomatic complexity. |
| C18 | **Composition over inheritance.** |
| C19 | **Testable by construction:** dependencies are injected, never constructed inline (don't inject concrete dependencies directly); no inline `random()` or `time()`/`time.now()`; environment reads go through injected providers. |
| C20 | No silent creep: no automatic retries, queues, caches, or elaborate coordination unless data makes the case. |

C17 in practice: small functions, early returns, exhaustive `switch` over sum types. C18 in practice: behavior contracts are structural; inheritance is for shared implementation only. Prefer interfaces or protocols that implementations satisfy without inheriting; use base classes when there is genuinely shared state or lifecycle.

## Comments

| ID | Rule |
| --- | --- |
| C21 | **Comments are rare and explain the *why*** (product or business reasoning), never the *what* — what the code does should be self-explanatory. The reasoning lives in the ticket, and the ticket id lives in the code. |

## Secrets

| ID | Rule |
| --- | --- |
| C22 | **No secrets in source, fixtures, logs, or tracker comments.** |

## Domain-driven design

| ID | Rule |
| --- | --- |
| C23 | **Use domain-driven design:** no raw ids, wrap them in domain ids; define entities, value objects, aggregates, domain events, bounded contexts. Full detail in `domain-modeling`. |

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a one-line fix, the standards don't apply." | They apply to ANY code, even a "quick fix" or a one-line change. |
| "It's only ever one of three values, a string is fine." | Three values is a closed set. Enum or typed id (C1). |
| "A quick null check here is harmless." | Defense in business logic hides an illegal state. Make it unrepresentable (C2) or a domain object (C3); validate at the edge (C11). |
| "The type checker validates the input." | It validates code, not data. External data is parsed at the edge; the two are different problems (C4, C11). |
| "The frontend already validates it." | Clients never validate business rules. Validation happens in the backend only, at its edges (C10). |
| "One model for API, domain, and DB saves code." | It couples the client to the storage schema; every change becomes a migration and an API break. Three layers, translated explicitly (C9). |
| "The client can compute eligibility." | Business truth lives on the backend. Clients render it (C10). |
| "Catch it and log it, we don't want to crash." | Fail loudly; never swallow errors (C15). |
| "A retry loop makes it robust." | No automatic retries, queues, or caches unless data makes the case (C20). |
| "I'll add a comment explaining what this does." | What the code does should be self-explanatory. Comments explain the why; the reasoning is on the ticket, the ticket id in the code (C21). |
| "I'll just patch the generated file." | Never modify generated or vendor files; change the generator or source (C14). |
| "`Date.now()` inline is simpler than injecting a clock." | Then the code is untestable by construction. Inject it (C19). |

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

Checklist before you commit:

- [ ] Any string literal that names a state, kind, or id? Replace with enum / typed id (C1).
- [ ] Any `if` guarding something a type could forbid? Move it into the type (C2, C6).
- [ ] Any validation inside domain logic? Move it to the edge (C11, C10).
- [ ] Any error caught and ignored? Surface it as a domain error (C15).
- [ ] Any `new Dependency()`, `random()`, `Date.now()` inside logic? Inject it (C19).
- [ ] Any comment explaining *what*? Delete it. Any *why*? Put the reasoning in the ticket, the ticket id in the code (C21).
- [ ] Any change to a generated or vendored file? Revert and change the generator/source instead (C14).
- [ ] Any secret in the diff, fixture, or log line? Remove it (C22).
