---
name: hld
description: How to write a High-Level Design from templates/HLD.md — goals, non-goals, assumptions, constraints, scale estimations, service boundaries with one owner per responsibility, domain model and glossary, API interfaces by name, interactions as sequence diagrams, tradeoffs with linked ADRs, dependencies and infra, SLOs, high-level observability, one-way doors, and what is left to the LLD, for a feature or a service from a reviewed PRD. Use when you write, review, or are asked for an HLD, design doc, architecture proposal, tech spec, or "how should we design X", or when an engineer has a reviewed PRD that touches more than one module or service, or introduces one, and before planning or implementation.
category: design
---

# High-Level Design

## Overview

Two altitudes, one skill. The **project** architecture in `docs/ARCHITECTURE.md` says which services exist, what each is for, and where the API reference is. A **feature or service** `HLD.md` says the boundaries, the APIs by name, the domain model, and the scale it is sized for. Anyone with this skill may write either; keep to the altitude of the document you are writing. An HLD makes parallel work possible without rework: it fixes boundaries and API names, and deliberately not internals or exact contracts, which belong to `lld`.

The HLD is kept very high level and **calls out what is left to figure out in the LLD**. Not every feature needs an HLD or LLD. The anatomy is `templates/HLD.md`; the process below fills it.

## When to Use

- A reviewed PRD touches more than one module or service, or introduces a new one.
- A cross-service interaction must change.
- Asked for an HLD, design doc, architecture proposal, tech spec, or "how should we design X".
- NOT for a single-service change with existing APIs; update the service `HLD.md` directly in the PR.
- NOT for internals: folder layout, types, exact contracts, and patterns belong to `lld`.

## Process

Each step fills a section of `templates/HLD.md`; a section is skipped with one line saying why.

1. **Read** the PRD, every affected service's `HLD.md`, the project's `docs/ARCHITECTURE.md`, and `docs/DOMAIN.md`. List every entity, actor, flow, and metric the PRD implies.
2. **Goals, non-goals, assumptions, constraints** come first; they bound every later choice.
3. **Scale estimations.** Initially it is low. Write the numbers the design is sized for and do not solve for scale that is not established.
4. **Service boundaries**: which services exist, which change, whether a new service is justified. Every responsibility has one owner. A new service needs the user's decision.
5. **Domain model and glossary**: entities, value objects, typed ids, states as sum types, invariants. One vocabulary across services, kept in `docs/DOMAIN.md`.
6. **API interfaces**: which APIs exist, which services interact through them, and the gist of request and response. The actual contract is decided in the LLD and lives in OpenAPI.
7. **Interactions** for the critical paths as Mermaid sequence diagrams, showing which service decides what. Backend owns business truth; clients render it.
8. **Tradeoffs and one-way doors**: what the chosen design gives up, and an ADR linked for every decision worth preserving. Options, rejections, and rationale live in the ADR, never restated here.
9. **Dependencies and infra**: external services, packages, Terraform resources, CI/CD needs, data migrations.
10. **SLOs** for the critical paths at the level the PRD justifies; **observability** at high level: metrics and log points (`../../references/metrics-and-logging.md`). Detail belongs in code.
11. **Sketches for the LLD** only where parallel work needs them before the LLD exists; **left to the LLD** says what this document does not decide.
12. **Diagrams as code**: `hld.drawio` next to the file, Mermaid inline.
13. **Hand off**: write it where `../../references/documentation-map.md` says; give it to the user for review; then plan with `planning-and-task-breakdown`, then `lld`.

## Interaction with other skills

- Upstream: `prd-writing`; the HLD starts from a reviewed PRD.
- Alongside: `domain-modeling` for the glossary and domain models; `adrs` for every decision worth preserving; `documentation` for how the document is written, rendered, and stored.
- Downstream: `planning-and-task-breakdown`, then `lld`, which decides the internals and exact contracts this document leaves open.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll specify the internals too, to be safe." | That makes the HLD stale on day one. Internals and exact contracts belong to the LLD. |
| "Diagrams can be drawn later in a tool." | Diagrams are code, committed with the HLD. |
| "SLOs and observability are operational, not design." | They shape timeouts, idempotency, and what to measure. State them now, at high level. |
| "I'll explain the options and rationale here, the ADR can come later." | The HLD links the ADR; options and rationale live only there. Write it with the HLD. |
| "The interface can be defined during implementation." | Then two services implement two interfaces. Names and interactions come first; the contract follows in the LLD. |
| "We may need to scale, so design for it now." | Design for the estimated scale. Record scale as a later concern. |
| "The design is obvious, skip the review." | Every HLD, LLD, and PRD is reviewed by the user. |
| "Every feature needs a full HLD." | Not every feature needs an HLD or LLD, and sections can be skipped with a reason. |

## Red Flags

- A responsibility with two owners or none.
- No scale estimation, no non-goals, or no one-way doors.
- An exact contract or a folder layout beyond the sketches section.
- A one-way door or technology choice with no linked ADR, or options and rationale restated in the HLD.
- A diagram that exists only as an image.
- An HLD treated as approved before the user reviewed it.
- An HLD that does not say what is left to the LLD.

## Verification

- [ ] Every PRD story maps to boundaries and named APIs in the HLD.
- [ ] Every template section is filled or skipped with a reason; scale and one-way doors are present.
- [ ] Every decision worth preserving has an ADR linked from the tradeoffs or one-way doors.
- [ ] The domain model is in `docs/DOMAIN.md` and consistent across services.
- [ ] Diagrams are committed as code next to the HLD.
- [ ] What is left to the LLD is called out.
- [ ] The user has reviewed the HLD.
