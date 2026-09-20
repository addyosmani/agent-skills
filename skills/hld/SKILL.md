---
name: hld
description: What a principal engineer puts in a High-Level Design — API interface, domain models and glossary, service interactions and boundaries, tradeoffs, assumptions, goals, non-goals, diagrams, constraints, high-level observability (metrics, logs, alerts), alternatives considered, dependencies/infra, SLOs, and the LLD elements the HLD carries (important classes and interactions, DB schema, API contracts), plus scale estimations, ownership of every responsibility, and one-way doors, for a feature or a service from a reviewed PRD. Use when you write, review, or are asked for an HLD, design doc, architecture proposal, tech spec, or "how should we design X", or when an engineer has a reviewed PRD that touches more than one module or service, or introduces one, and before planning or implementation.
category: design
---

# High-Level Design

## Overview

Two altitudes, one skill. The **project** architecture in `docs/ARCHITECTURE.md` says which services exist, what each is for, and where the API reference is. A **feature or service** `HLD.md` says the boundaries, the APIs by name, the domain model, and the scale it is sized for. Anyone with this skill may write either; keep to the altitude of the document you are writing. An HLD makes parallel work possible without rework: it fixes boundaries and API names, and deliberately not internals or exact contracts, which belong to the LLD.

Roles: the **principal engineer (PE)** writes the HLD, keeps it very high level (discussing an item only if they deem fit — items can be skipped), and **calls out what is left for staff engineers to figure out**. The HLD has some elements of LLD. Every HLD, LLD, and PRD is reviewed by the user. Not every feature needs an HLD or LLD.

The template is `templates/HLD.md`; the table below is what it holds, and the process explains how to fill it.

## When to Use

- A reviewed PRD touches more than one module or service, or introduces a new one.
- A cross-service interaction must change.
- Asked for an HLD, design doc, architecture proposal, tech spec, or "how should we design X".
- NOT for a single-service change with existing APIs; update the service `HLD.md` directly in the PR.
- NOT for internals: folder layout, types, exact contracts, and patterns belong to the `lld` skill.

## HLD contents — the PE covers

| # | Item |
| --- | --- |
| 1 | **API interface** |
| 2 | **Domain models and glossary** (see `domain-modeling`) |
| 3 | **Interaction between services** |
| 4 | **Clear service boundaries** — when creating a new service or deciding where a feature should sit (bounded contexts, the project's `docs/ARCHITECTURE.md`) |
| 5 | **Tradeoffs** |
| 6 | **Assumptions** |
| 7 | **Goals** |
| 8 | **Non-goals** |
| 9 | **Diagrams** — as code: Mermaid flows, `.drawio` architecture next to `HLD.md` (`documentation-and-adrs`, W10) |
| 10 | **Constraints** |
| 11 | Separation of API models, domain/application models, and DB models so each layer can evolve independently (three layers: API, domain, DB) |
| 12 | Don't put comments in the code; put comments in the ticket and link the ticket in the code (read together with item 13: comments rare, "why" only) |
| 13 | **Dependencies / infra** |
| 14 | **SLOs** |
| 15 | **Constraints** (same as item 10) |
| 16 | **Some LLD:** (a) important classes, their interfaces and interactions among them; (b) DB schema (drawdb file next to `LLD.md`); (c) API contracts (OpenAPI) |

Tradeoffs and alternatives double as the decision record: problem, options, choice, rationale, reversibility, one-way doors. Be deliberate about DB models, main classes/interfaces, composition and inheritance, and patterns — each pattern names the problem it solves.

## Process

1. **Read** the PRD, every affected service's `HLD.md`, the project's `docs/ARCHITECTURE.md`, and `docs/DOMAIN.md`. List every entity, actor, flow, and metric the PRD implies.
2. **Goals, non-goals, assumptions, and constraints come first** (items 6–8, 10); they bound every later choice.
3. **Estimate scale.** Initially it is low. Write the numbers the design is sized for (users, requests, data), and do not solve for scale that is not established.
4. **Boundaries** (item 4): which services exist, which change, whether a new service is justified. Every responsibility has one owner. A new service needs the user's decision.
5. **Domain model and glossary** (item 2) with the `domain-modeling` skill: entities, value objects, typed ids, states as sum types, invariants. One vocabulary across services, kept in `docs/DOMAIN.md`.
6. **API interface** (item 1): which APIs exist, which services interact through them, and the gist of request and response. The actual contract is decided in the LLD and lives in OpenAPI.
7. **Interactions** (item 3) for the critical paths as Mermaid sequence diagrams, showing which service decides what. Backend owns business truth; clients render it (`coding-standards` C10).
8. **Dependencies / infra** (item 13): external services, packages, Terraform resources, CI/CD needs, data migrations.
9. **SLOs** (item 14) for the critical paths at the level the PRD justifies.
10. **Sketch observability** at high level: metrics and log points (`../../references/metrics-and-logging.md`). Detail belongs in code, not in the LLD.
11. **Hand off**: write the HLD where `../../references/documentation-map.md` says (`lld` § Document mechanics); give it to the user for review; then plan with `planning-and-task-breakdown` and `milestone-planning`, then `lld`.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll specify the internals too, to be safe." | That makes the HLD stale on day one. Internals and exact contracts belong to the LLD; the PE calls out what is left for staff engineers. |
| "Diagrams can be drawn later in a tool." | Diagrams are code, committed with the HLD (item 9). |
| "SLOs and observability are operational, not design." | They shape timeouts, idempotency, and what to measure. State them now, at high level (item 14). |
| "The interface can be defined during implementation." | Then two services implement two interfaces. Names and interactions come first (items 1, 3); the contract follows in the LLD. |
| "We may need to scale, so design for it now." | Design for the estimated scale. Record scale as a later concern. |
| "The design is obvious, skip the review." | Every HLD, LLD, and PRD is reviewed by the user. It is a rule, not a preference. |
| "Every feature needs a full HLD." | Not every feature needs an HLD or LLD, and items can be skipped when the PE deems fit. |

## Red Flags

- A responsibility with two owners or none.
- No scale estimation, no non-goals, or no one-way doors section.
- An exact contract or a folder layout in the HLD beyond item 16.
- A diagram that exists only as an image.
- An HLD treated as approved before the user reviewed it.
- An HLD that does not say what is left for staff engineers to figure out.

## Verification

- [ ] Every PRD story maps to boundaries and named APIs in the HLD.
- [ ] Every item in the contents table (1–16) is present or skipped deliberately; scale and one-way doors are present.
- [ ] The domain model is in `docs/DOMAIN.md` and consistent across services.
- [ ] Diagrams are committed as code next to the HLD.
- [ ] One-way doors are recorded in the HLD and on the ticket.
- [ ] What is left for staff engineers to figure out is called out.
- [ ] The user has reviewed the HLD.
