---
name: hld
description: "Produces a high-level design for a feature or a service from a reviewed PRD: goals and non-goals, assumptions, constraints, scale estimations, domain model and glossary, API interfaces as names, interactions, and request and response gists, interactions between services, tradeoffs, alternatives, dependencies and infra, SLOs, high-level observability, diagrams as code, and one-way doors. Use when an engineer has a reviewed PRD that touches more than one module or service, or introduces one, and before planning or implementation."
category: design
---

# High-Level Design

## Overview

Two altitudes, one skill. The **project** architecture in `docs/ARCHITECTURE.md` says which services exist, what each is for, and where the API reference is. A **feature or service** `HLD.md` says the boundaries, the APIs by name, the domain model, and the scale it is sized for. Anyone with this skill may write either; keep to the altitude of the document you are writing. An HLD makes parallel work possible without rework: it fixes boundaries and API names, and deliberately not internals or exact contracts, which belong to the LLD.

The template is `templates/HLD.md`; the sections below explain how to fill it.

## When to Use

- A reviewed PRD touches more than one module or service, or introduces a new one.
- A cross-service interaction must change.
- NOT for a single-service change with existing APIs; update the service `HLD.md` directly in the PR.
- NOT for internals: folder layout, types, exact contracts, and patterns belong to the `lld` skill.

## Process

1. **Read** the PRD, every affected service's `HLD.md`, `CONVENTIONS.md`, and `docs/DOMAIN.md`. List every entity, actor, flow, and metric the PRD implies.
2. **State goals, non-goals, assumptions, and constraints** first; they bound every later choice.
3. **Estimate scale.** Initially it is low. Write the numbers the design is sized for (users, requests, data), and do not solve for scale that is not established.
4. **Draw the boundaries**: which services exist, which change, whether a new service is justified. Every responsibility has one owner. A new service needs the user's decision.
5. **Define the domain model and glossary** with the `domain-modeling` skill: entities, value objects, typed ids, states as sum types, invariants. One vocabulary across services, kept in `docs/DOMAIN.md`.
6. **Name the API interfaces**: which APIs exist, which services interact through them, and the gist of request and response. The actual contract is decided in the LLD and lives in OpenAPI.
7. **Describe interactions** for the critical paths as Mermaid sequence diagrams, showing which service decides what. Backend owns business truth; clients render it.
8. **Record tradeoffs and alternatives**: options, choice, rationale, reversibility. Name one-way doors.
9. **List dependencies and infra**: external services, packages, Terraform resources, CI/CD needs, data migrations.
10. **Set SLOs** for the critical paths at the level the PRD justifies.
11. **Sketch observability** at high level: metrics and log points (`../../references/metrics-and-logging.md`). Detail belongs in code, not in the LLD.
12. **Diagrams as code**: `.drawio` for architecture next to the HLD, Mermaid in the markdown. Committed and reviewed like code.
13. **Hand off**: write the HLD where `../../references/documentation-map.md` says; give it to the user for review; then plan with `planning-and-task-breakdown` and `milestone-planning`, then `lld`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll specify the internals too, to be safe." | That makes the HLD stale on day one. Internals and exact contracts belong to the LLD. |
| "Diagrams can be drawn later in a tool." | Diagrams are code, committed with the HLD. |
| "SLOs and observability are operational, not design." | They shape timeouts, idempotency, and what to measure. State them now, at high level. |
| "The interface can be defined during implementation." | Then two services implement two interfaces. Names and interactions come first; the contract follows in the LLD. |
| "We may need to scale, so design for it now." | Design for the estimated scale. Record scale as a later concern. |
| "The design is obvious, skip the review." | The user reviews every HLD. It is a rule, not a preference. |

## Red Flags

- A responsibility with two owners or none.
- No scale estimation, no non-goals, or no one-way doors section.
- An exact contract or a folder layout in the HLD.
- A diagram that exists only as an image.
- An HLD treated as approved before the user reviewed it.

## Verification

- [ ] Every PRD story maps to boundaries and named APIs in the HLD.
- [ ] Goals, non-goals, assumptions, constraints, scale, tradeoffs, alternatives, dependencies, SLOs, and observability are present or skipped with a reason.
- [ ] The domain model is in `docs/DOMAIN.md` and consistent across services.
- [ ] Diagrams are committed as code next to the HLD.
- [ ] One-way doors are recorded in the HLD and on the ticket.
- [ ] The user has reviewed the HLD.
