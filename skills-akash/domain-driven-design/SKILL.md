---
name: domain-driven-design
description: Domain-driven design rules for modelling any service — services as bounded contexts, no raw ids (wrap uuids and identifiers in domain id types), entities, value objects, aggregates, domain events, sum and product types, and a domain glossary. Load whenever you define or change a domain model, an identifier type, an entity or aggregate, an event, or decide which service a feature belongs to — even when the user just says "add a User type" or "model orders".
---

# Domain-driven design

Domain-driven design is mandatory. It is how the codebase expresses the core philosophy of making illegal states unrepresentable.

## Rules

| ID | Rule |
| --- | --- |
| DD1 | **A service is a domain with a well-defined bounded context.** Service boundaries come from the domain, not from technology. |
| DD2 | **Don't use raw ids. Wrap them in domain ids.** Use domain models (branded / typed identifiers) for uuids. |
| DD3 | **Define entities, value objects, aggregates, domain events, bounded contexts**, etc. |
| DD4 | **Deliberate on domain models** using sum types and product types so that variants and combinations are explicit. |
| DD5 | Be deliberate about DB models, main classes and interfaces, composition and inheritance, and patterns; every pattern names its problem. |
| DD6 | Domain model is separate from API model and DB model, translated explicitly. |
| DD7 | The HLD names the **domain models and glossary**; use the glossary's terms in code. |
| DD8 | No strings for closed sets; enums; typed ids; illegal states unrepresentable. |

## How to apply

1. **Name the bounded context** before writing code. If the feature does not fit an existing service's context, say so and ask.
2. **Identifiers:** every id is a distinct type (`OrderId`, not `string`/`uuid`). Constructing one from a raw value happens once, at the edge, with validation.
3. **Value objects** for anything with rules (money, email, quantity). **Entities** for things with identity and lifecycle. **Aggregates** own consistency boundaries; only the aggregate root is referenced from outside.
4. **Domain events** are typed and named in the past tense; they are the sanctioned way for contexts to talk without sharing models.
5. **Errors** are domain objects too (`coding-standards` C15, C3).
6. **Closed sets** (statuses, kinds, roles) are enums or literal unions; variants are discriminated unions / sum types; never a `string` field with a comment.
