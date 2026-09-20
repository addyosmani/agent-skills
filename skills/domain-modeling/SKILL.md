---
name: domain-modeling
description: Domain-driven design rules for modelling any service — services as bounded contexts, no raw ids (wrap uuids and identifiers in domain id types), entities, value objects, aggregates, domain events, sum and product types, and a domain glossary, plus invariants, contracts between parts, aggregate-level validation with structured errors, and a single source of truth for each contract, in any language. Use when you define or change a domain model, an identifier type, an entity or aggregate, an event, or decide which service a feature belongs to — even when the user just says "add a User type" or "model orders"; when an engineer defines the shared model in an HLD or in DOMAIN.md, implements or extends a module's domain types, or when a bug traces back to an ambiguous concept, a stringly typed API, or an impossible state.
category: design
---

# Domain Modeling

## Overview

Domain-driven design is mandatory. It is how the codebase expresses the core philosophy of making illegal states unrepresentable (`coding-standards` C2, C23). Domain concepts become types, and types become the contract between everyone working on the feature, so a reader and a type checker can answer "what is this, what does it accept, what does it produce, what is invalid, and where exactly did it fail" without reverse-engineering dictionaries, strings, and conditionals.

The ideas here are language- and domain-neutral. A full worked example in Python for a workflow-graph domain is in `references/typed-workflow-domain-python.md`; use it for mechanics, not as the rule.

## When to Use

- Defining or changing a domain model, an identifier type, an entity or aggregate, an event, or deciding which service a feature belongs to.
- Writing the shared model section of an HLD (`hld` item 2).
- Implementing or extending domain types in a service, especially in a foundation task.
- A bug traces back to an ambiguous concept, a raw string standing in for a type, or an impossible state.
- Designing contracts between parts (ports, handlers, executors, adapters) or validating an aggregate (a graph, a workflow, an order with lines).
- NOT for UI view models or transport DTOs in isolation; model them as translations of the domain model.

## Rules

| ID | Rule |
| --- | --- |
| DD1 | **A service is a domain with a well-defined bounded context.** Service boundaries come from the domain, not from technology. |
| DD2 | **Don't use raw ids. Wrap them in domain ids.** Use domain models (branded / typed identifiers) for uuids. |
| DD3 | **Define entities, value objects, aggregates, domain events, bounded contexts**, etc. |
| DD4 | **Deliberate on domain models** using sum types and product types so that variants and combinations are explicit. |
| DD5 | Be deliberate about DB models, main classes and interfaces, composition and inheritance, and patterns; every pattern names its problem. |
| DD6 | Domain model is separate from API model and DB model, translated explicitly (`coding-standards` C9). |
| DD7 | The HLD names the **domain models and glossary**; use the glossary's terms in code. |
| DD8 | No strings for closed sets; enums; typed ids; illegal states unrepresentable (`coding-standards` C1, C2). |

## How to apply

1. **Name the bounded context** before writing code. If the feature does not fit an existing service's context, say so and ask.
2. **Identifiers:** every id is a distinct type (`OrderId`, not `string`/`uuid`). Constructing one from a raw value happens once, at the edge, with validation.
3. **Value objects** for anything with rules (money, email, quantity). **Entities** for things with identity and lifecycle. **Aggregates** own consistency boundaries; only the aggregate root is referenced from outside.
4. **Domain events** are typed and named in the past tense; they are the sanctioned way for contexts to talk without sharing models.
5. **Errors** are domain objects too (`coding-standards` C15, C3).
6. **Closed sets** (statuses, kinds, roles) are enums or literal unions; variants are discriminated unions / sum types; never a `string` field with a comment.

## Principles

1. **Model the domain, not the storage or wire format.** JSON, rows, and maps are never the primary model (DD6).
2. **Explicit types over stringly typed APIs** (`coding-standards` C1; DD2, DD8). A type alias that erases the distinction (`Image = string`) is not a type; use nominal or branded types.
3. **Separate three things**: the domain value (what flows), the contract (what a part accepts or produces), and the runtime instance. Name each.
4. **Make illegal states unrepresentable** (`coding-standards` C2; DD4, DD8). Never a set of boolean flags or a struct of nullable fields where variants belong.
5. **An unavoidable defensive check becomes a domain object** (`coding-standards` C3): `ExpiredToken`, `OverdrawnAccount`, explicit and typed.
6. **Discriminators for polymorphic serialized values.** A tagged union with a stable wire identifier; never a class or type name as the persistent identifier, because names change in refactors and wire ids are contract.
7. **Contracts are part of the type.** A part's named, typed inputs and outputs are on the part itself; references point at the precise thing (the port, not just the node). Return the narrowest correct type. Use typed named records for input and output sets, not maps with known keys. `Any`, `object`, and unbounded maps are escape hatches, isolated at a boundary and documented.
8. **One source of truth per contract.** Parsing, validation, dispatch, UI schema, and serialization derive from one specification object; a registry or dispatch map is never the domain model. But do not over-abstract before repeated structure exists: start with the handful of concrete types the domain has.
9. **Aggregate-level invariants are their own validation layer.** Field validation cannot see cross-object rules (references exist, types are compatible, required inputs are wired, no structural cycles where a DAG is required). Validate them explicitly, in a deterministic order from structural to semantic, collect independent errors instead of stopping at the first, and keep the algorithm independent of the validation framework so it can be reused by tests, tools, and editors.
10. **Errors are first-class domain citizens** (`coding-standards` C15, C16), structured and actionable. Every error carries a location that identifies the offending object (`connections[2]`, `nodes[4].scale`), says what is wrong, what was expected, what was received, and how to fix it. Report the full path of a cycle and the edge that closes it, not "cycle detected". Never wrap a domain error in a generic exception that loses this.
11. **Invariants live near the thing they constrain.** An entity rule on the entity, an aggregate rule in aggregate validation, an execution rule in the execution layer; never one giant validator.
12. **Small typed dispatch, not giant conditionals.** Node-, kind-, or variant-specific behavior lives in typed handlers selected by the discriminator; as variants grow, move to declarative registration from the single source of truth.
13. **Structural cycles are not runtime loops.** Retry, iteration, map, conditional execution are explicit control-flow constructs, never arbitrary cycles in a definition that is supposed to be a DAG.
14. **Domain metadata is immutable, names are domain names, aliases clarify.** Freeze specifications and port descriptors; name things `source_port` and `workflow_definition`, not `data`, `item`, `payload`; an alias must add meaning, never hide it.

## Process

1. **Extract the language**: list every noun and verb in the PRD and existing docs. Merge synonyms; split homonyms. Record the glossary in the HLD (DD7) or service `LLD.md`.
2. **Classify each concept**: entity (identity and lifecycle), value object (compared by value), aggregate root (owns consistency of a cluster), event (something that happened), policy (a rule that decides), contract (what a part accepts or produces).
3. **Define identities**: a typed identifier per entity (`OrderId`, not `string`); who generates it; whether it is exposed externally; the stable wire identifier for each polymorphic kind.
4. **Write invariants** per entity and aggregate: the rules that must always hold. Each becomes a constructor guard, a type, or an aggregate validator, and a test.
5. **Define contracts**: for each part, its named typed inputs and outputs, and what references it accepts. Decide the single specification object other layers derive from.
6. **Separate layers** per `coding-standards` C9: API model (what clients see), domain model (rules), persistence model (storage); an application model (use-case inputs and outputs) only as a recorded decision. Write explicit translations where the layers differ; collapse layers only when they are genuinely identical and record that decision.
7. **Design aggregate validation**: the ordered list of cross-object checks, the structured error shape with locations, and the reusable algorithms behind it.
8. **Write the types** in the service language with the strictness `coding-standards` C7 requires, using the mapping below. Put them in the LLD and in code in the foundation task.
9. **Prove it**: one test per invariant, per aggregate check (valid and invalid, including every shape of a structural error), per error location and message.

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
| "A string status field is simpler." | It admits every typo as a state. A sum type or enum costs one line (DD8). |
| "A map of string to value is flexible." | It loses which key carries which type. A named typed record keeps the relationship and gives autocomplete. |
| "One model for API, domain, and DB saves code." | It couples the client to the storage schema; every change becomes a migration and an API break. |
| "Invariants are enforced in the service layer." | Then every caller must remember. Enforce in the type or constructor; aggregate rules in one explicit validator. |
| "A quick null check here is harmless." | Defense in business logic hides an illegal state. Make it unrepresentable or a domain object. |
| "The generic parameter tells us the type at runtime." | In most languages it is erased or unreliable. Keep explicit runtime metadata next to the static type. |
| "The registry is the model." | A dispatch map loses inputs, outputs, and schema. Derive the registry from a specification object. |
| "'Cycle detected' is enough." | Nobody can fix that. Report the full path, the closing edge, and the location. |
| "Abstract now, it will scale." | Three variants do not justify factories of factories. Abstract when repetition is real. Every pattern names its problem (DD5). |

## Red Flags

- A feature placed in a service whose bounded context it does not fit (DD1).
- A free-form string for a closed set or an identifier; a type alias to a primitive standing in for a domain concept (DD2, DD8).
- Boolean flag combinations or nullable-everything structs where a sum type belongs (DD4).
- Code that uses a term the glossary does not (DD7).
- A type or class name used as a persistent wire identifier.
- `Any`, `object`, or `map[string]any` in a domain signature; a return type wider than the contract.
- Contracts duplicated across node, executor, and UI schema that can drift.
- A giant conditional dispatching on a string; runtime code comparing class names or peeking into serialized dictionaries.
- An aggregate validator that stops at the first error, has no locations, or is welded to the validation framework.
- An entity with no invariants listed; domain rules duplicated in a client; persistence fields in API responses (DD6).

## Verification

- [ ] The bounded context is named and the feature fits it, or the mismatch was raised (DD1).
- [ ] Every concept in the glossary has a model record and a type in code; code uses the glossary's terms; every polymorphic kind has a stable wire id (DD3, DD7).
- [ ] Every id is a distinct domain type, constructed once at the edge (DD2).
- [ ] Every invariant and aggregate check has a test, including every shape of structural error the domain can produce.
- [ ] Layer translations are explicit or the collapse is recorded in the LLD (DD6).
- [ ] Contracts have one source of truth; no registry or dispatch map is the model.
- [ ] Aggregate errors carry locations and actionable messages; algorithms are testable without the validation framework.
- [ ] No `Any`/`object`/unbounded map in domain signatures without a documented boundary reason.
- [ ] Types match the HLD key interfaces.
