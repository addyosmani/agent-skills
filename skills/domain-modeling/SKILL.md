---
name: domain-modeling
description: Domain-driven design for any service, the subset of coding-standards that decides what a domain concept is before it is coded — services as bounded contexts, typed domain ids instead of raw uuids, entities, value objects, aggregates, domain events, sum and product types, the glossary, contracts between parts with one source of truth, invariants and aggregate-level validation with located structured errors, stable wire ids, typed dispatch — with rule ids DD1–DD13 and a process from the nouns in a PRD to typed code in any language. Use when you define or change a domain model, an identifier type, an entity or aggregate, an event, or decide which service a feature belongs to — even when the user just says "add a User type" or "model orders"; when an HLD or DOMAIN.md needs the shared model; when a coding-standards rule turns something into a domain concept and you must decide what it is; or when a bug traces back to an ambiguous concept, a stringly typed API, or an impossible state.
category: design
---

# Domain Modeling

## Overview

Domain-driven design is mandatory (`coding-standards` C23). `coding-standards` says a closed set is an enum, an id is a typed id, an unavoidable check is a domain object, and an error is a domain citizen (C1, C2, C3, C15). This skill is how those concepts are found and shaped: which service owns them, what kind each one is, what it must always satisfy, and how the parts contract with each other, so a reader and a type checker can answer "what is this, what does it accept, what does it produce, what is invalid, and where exactly did it fail" without reverse-engineering dictionaries, strings, and conditionals.

The rules are language- and domain-neutral. A full worked example in Python for a workflow-graph domain is in `references/typed-workflow-domain-python.md`; use it for mechanics, not as the rule.

## When to Use

- Defining or changing a domain model, an identifier type, an entity or aggregate, an event, or deciding which service a feature belongs to.
- Writing the shared model section of an HLD (`hld` item 2) or `docs/DOMAIN.md`; writing the domain types section of an LLD (`lld`).
- Implementing or extending domain types in a service, especially in a foundation task.
- A `coding-standards` rule (C1, C3, C23) makes something a domain concept and the concept needs a name, a kind, and invariants.
- A bug traces back to an ambiguous concept, a raw string standing in for a type, or an impossible state.
- NOT for the coding rules themselves (typing, edges, errors, testability): `coding-standards`.
- NOT for UI view models or transport DTOs in isolation; model them as translations of the domain model (`coding-standards` C9).

## Rules

| ID | Rule |
| --- | --- |
| DD1 | **A service is a domain with a well-defined bounded context.** Service boundaries come from the domain, not from technology. A feature that fits no existing context is raised, not squeezed in. |
| DD2 | **No raw ids.** Every id is a distinct domain type (`OrderId`, not `string` or `uuid`), constructed once, at the edge, with validation. A type alias that erases the distinction (`Image = string`) is not a type; use nominal or branded types. |
| DD3 | **Every concept is classified:** entity (identity and lifecycle), value object (compared by value, carries its rules: money, email, quantity), aggregate root (owns the consistency of a cluster; the only thing referenced from outside), domain event (something that happened, past tense, the sanctioned way contexts talk without sharing models), policy (a rule that decides), contract (what a part accepts or produces). |
| DD4 | **Variants and combinations are explicit sum and product types.** Model the domain, not the storage or wire format: JSON, rows, and maps are never the primary model. |
| DD5 | **Every pattern names its problem.** Factory, registry, adapter, repository, compose: each is chosen for a stated problem, never for sophistication, and never before repeated structure exists. |
| DD6 | **The glossary is the vocabulary.** The HLD names the domain models and glossary (`docs/DOMAIN.md`); code uses its terms. Names are domain names (`source_port`, `workflow_definition`, not `data`, `item`, `payload`); an alias must add meaning, never hide it. |
| DD7 | **Contracts are part of the type.** A part's named, typed inputs and outputs live on the part itself; references point at the precise thing (the port, not just the node); return the narrowest correct type; named typed records instead of maps with known keys. Keep the domain value (what flows), the contract (what a part accepts or produces), and the runtime instance distinct and named. `Any`, `object`, and unbounded maps are escape hatches, isolated at a boundary and documented. |
| DD8 | **One source of truth per contract.** Parsing, validation, dispatch, UI schema, and serialization derive from one frozen specification object; a registry or dispatch map is never the domain model. |
| DD9 | **Invariants live near the thing they constrain.** An entity rule on the entity, an aggregate rule in aggregate validation, an execution rule in the execution layer; each becomes a type, a constructor guard, or an aggregate validator, and a test. This is where an unavoidable check becomes a domain object (`coding-standards` C3). |
| DD10 | **Aggregate-level invariants are their own validation layer.** Field validation cannot see cross-object rules (references exist, types are compatible, required inputs are wired, no structural cycles where a DAG is required). Validate them explicitly, in a deterministic order from structural to semantic, collect independent errors instead of stopping at the first, and keep the algorithm independent of the validation framework so tests, tools, and editors reuse it. |
| DD11 | **A domain error carries a location** that identifies the offending object (`connections[2]`, `nodes[4].scale`), what is wrong, what was expected, what was received, and how to fix it. Report the full path of a cycle and the edge that closes it, never "cycle detected". Never wrap it in a generic exception that loses this (`coding-standards` C15, C16). |
| DD12 | **Polymorphic serialized values carry a stable wire identifier** in a tagged union; never a class or type name, because names change in refactors and wire ids are contract. |
| DD13 | **Small typed dispatch, not giant conditionals.** Variant-specific behavior lives in typed handlers selected by the discriminator; as variants grow, move to declarative registration from the specification object (DD8). Structural cycles are not runtime loops: retry, iteration, map, and conditional execution are explicit control-flow constructs, never arbitrary cycles in a definition that is supposed to be a DAG. |

## Process

1. **Name the bounded context** (DD1) before writing code. If the feature fits none, say so and ask.
2. **Extract the language**: every noun and verb in the PRD and existing docs. Merge synonyms; split homonyms. Record the glossary in the HLD or `docs/DOMAIN.md` (DD6).
3. **Classify each concept** (DD3).
4. **Define identities** (DD2): a typed id per entity; who generates it; whether it is exposed externally; the stable wire id for each polymorphic kind (DD12).
5. **Write invariants** per entity and aggregate (DD9): the rules that must always hold, and for each, whether a type, a constructor guard, or an aggregate validator enforces it.
6. **Define contracts** (DD7): for each part, its named typed inputs and outputs and what references it accepts; the single specification object other layers derive from (DD8).
7. **Separate layers** per `coding-standards` C9 and write the explicit translations; collapse layers only when they are genuinely identical, and record that decision.
8. **Design aggregate validation** (DD10): the ordered list of cross-object checks, the error shape with locations (DD11), and the reusable algorithms behind it.
9. **Write the types** in the service language with the strictness `coding-standards` C7 requires, using the mapping below. Put them in the LLD and in code in the foundation task.
10. **Prove it**: one test per invariant, per aggregate check (valid and invalid, including every shape of structural error), per error location and message.

## Mapping the ideas to a language

| Idea | TypeScript | Python | Go |
|---|---|---|---|
| Sum type / variants | discriminated union with a literal tag | `Literal`-tagged classes in a `Union` with a discriminator (Pydantic) | sealed interface with a marker method and a `switch` on concrete types |
| Product type | `interface` / `type` with required fields | dataclass or Pydantic model | struct |
| Closed set | string-literal union or `enum` | `Enum` / `Literal` | named type with typed constants |
| Typed identifier | branded type (`string & { __brand: 'OrderId' }`) | `NewType` or a small value class | named type (`type OrderId string`) with a constructor |
| Behavior contract | `interface` (structural) | `Protocol` (structural) | `interface` (structural) |
| Named typed input/output set | object type | `TypedDict` | struct |
| Runtime type metadata alongside erased generics | a descriptor object with the tag and a validator | a frozen descriptor with `type_id` and the class | a descriptor with the tag and a decode function |
| Immutable metadata | `readonly` / `as const` | `@dataclass(frozen=True)`, `Final` | unexported fields + constructor functions |
| Structured error with location | error object `{ path, message, expected, received }` | validation error with `loc` | error type with a path field, wrapped, never flattened |

## Model record

```markdown
### <Entity or contract>
- Kind: entity | value object | aggregate root | event | policy | contract
- Identity: <typed id, generator, exposure> · Wire id: <stable tag>
- Fields: <name: type> (closed sets as enums or sum types; no nullable-everything)
- Invariants:
  - <rule> → enforced by <type | constructor | aggregate validator>
- Inputs / outputs (contracts): <name: type>
- Owned by: <service>
- Translations: API ↔ domain ↔ persistence (which fields differ)
- Aggregate checks it participates in: <ordered list>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "This feature can go in whichever service is convenient." | Service boundaries come from the domain. Name the bounded context first; if it fits none, say so and ask (DD1). |
| "A uuid is already unique, wrapping it is ceremony." | A raw id admits any uuid anywhere. Wrap it in a domain id, constructed once at the edge (DD2). |
| "A map of string to value is flexible." | It loses which key carries which type. A named typed record keeps the relationship (DD7). |
| "Invariants are enforced in the service layer." | Then every caller must remember. Enforce in the type or constructor; aggregate rules in one explicit validator (DD9, DD10). |
| "The generic parameter tells us the type at runtime." | In most languages it is erased or unreliable. Keep explicit runtime metadata next to the static type (DD12; `coding-standards` C4). |
| "The registry is the model." | A dispatch map loses inputs, outputs, and schema. Derive the registry from a specification object (DD8). |
| "'Cycle detected' is enough." | Nobody can fix that. Report the full path, the closing edge, and the location (DD11). |
| "Abstract now, it will scale." | Three variants do not justify factories of factories. Every pattern names its problem, after repetition is real (DD5). |

## Red Flags

- A feature placed in a service whose bounded context it does not fit (DD1).
- A type alias to a primitive standing in for a domain concept (DD2).
- Boolean flag combinations or nullable-everything structs where a sum type belongs (DD4).
- Code that uses a term the glossary does not; a field called `data`, `item`, or `payload` (DD6).
- `Any`, `object`, or `map[string]any` in a domain signature; a return type wider than the contract (DD7).
- Contracts duplicated across node, executor, and UI schema that can drift (DD8).
- An entity with no invariants listed (DD9).
- An aggregate validator that stops at the first error, has no locations, or is welded to the validation framework (DD10, DD11).
- A type or class name used as a persistent wire identifier (DD12).
- A giant conditional dispatching on a string; runtime code comparing class names or peeking into serialized dictionaries (DD13).

## Verification

- [ ] The bounded context is named and the feature fits it, or the mismatch was raised (DD1).
- [ ] Every concept in the glossary has a model record and a type in code; code uses the glossary's terms; every polymorphic kind has a stable wire id (DD3, DD6, DD12).
- [ ] Every id is a distinct domain type, constructed once at the edge (DD2).
- [ ] Every invariant and aggregate check has a test, including every shape of structural error the domain can produce (DD9, DD10).
- [ ] Layer translations are explicit or the collapse is recorded in the LLD (`coding-standards` C9).
- [ ] Contracts have one source of truth; no registry or dispatch map is the model (DD8).
- [ ] Aggregate errors carry locations and actionable messages; algorithms are testable without the validation framework (DD10, DD11).
- [ ] No `Any`/`object`/unbounded map in domain signatures without a documented boundary reason (DD7).
- [ ] Types match the HLD key interfaces.
