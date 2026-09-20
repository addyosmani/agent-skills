# <feature or service> High-Level Design

Anyone with the `hld` skill may edit. Reviewed by the user before it counts. Diagrams as code: `hld.drawio` for architecture, Mermaid for flows, next to this file. Skip a section with one line saying why.

- PRD: <link> · Status: DRAFT | APPROVED

## Goals

## Non-goals

## Assumptions

## Constraints

## Scale estimations

Initially low. State the numbers the design is sized for; do not solve for scale that is not established.

## Domain model and glossary

| Term | Definition | Type (entity / value / sum type) | Typed id |
|---|---|---|---|

## API interfaces

Names, which services interact, and the basic request and response shapes. The actual contract is decided in the LLD and lives in OpenAPI.

| API | From → to | Request (gist) | Response (gist) |
|---|---|---|---|

## Interactions

```mermaid
sequenceDiagram
```

## Tradeoffs and alternatives considered

| Decision | Options | Choice | Why | Reversible |
|---|---|---|---|---|

## Dependencies and infra

## SLOs

| Path | Availability | Latency (p95) | Correctness |
|---|---|---|---|

## Observability (high level)

- Metrics:
- Logs:

## One-way doors

## Open questions
