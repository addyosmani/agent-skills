# <feature or service> Low-Level Design

Anyone with the `lld` skill may edit. Reviewed by the user before it counts. Kept in sync with the code: the PR that changes a contract, schema, or type updates this file. Principles: illegal states unrepresentable, validation at the edges only, typed ids and enums, no raw strings, injected dependencies and clocks, composition over inheritance, flat feature-first layout, comments rare and only for the why.

- HLD: <link> · Schema: `schema.ddb` (drawdb) · OpenAPI: `<path>` → generated client `<sdk path>`

## Folder structure

```text
<service>/
└── <feature>/
```

## Types and interfaces

<enums, sum types, product types, typed ids, DTOs, error types, ports, as code>

## Classes and composition

```mermaid
classDiagram
```

Main classes, interfaces, composition and inheritance, the patterns used (functional: compose; object: factory, registry) and the problem each solves.

## Data model and migrations

| Table | Owner | Migration | Rollback |
|---|---|---|---|

## API contracts

| Method | Path | Auth | Request | Response | Errors | Idempotency |
|---|---|---|---|---|---|---|

## State machines

| Entity | States (sum type) | Transition | Guard | Side effect |
|---|---|---|---|---|

## Error handling

Errors are first-class domain objects; fail loudly.

## Testing strategy

| Level | What | Fakes injected |
|---|---|---|

## Open questions
