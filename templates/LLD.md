# <feature or service> Low-Level Design

Written with the `lld` skill. Reviewed by the user before it counts. Updated by the PR that changes a contract, schema, or type. Skip a section with one line saying why.

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

<the patterns used and the problem each solves>

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

| Error | Caller retries / corrects / escalates | Timeout / idempotency key |
|---|---|---|

## Testing strategy

| Level | What | Fakes injected |
|---|---|---|

## Open questions
