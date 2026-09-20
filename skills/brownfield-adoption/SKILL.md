---
name: brownfield-adoption
description: "Brings an existing codebase under the conventions in three passes: know it (inventory, as-is HLD, LLD, and schema per service, docs moved not deleted, a baseline that must stay green), judge it (a conformance table with one row per convention, and a verdict on whether service and type boundaries exist), and change it top-down from the outside in: contracts for every consumed API, service boundaries, a backend-driven client one API at a time, then each insulated service refactored inside (domain types, models layered, defensive logic to the edges, feature-first folders), and a final pass that makes the docs current. Use when the brain is first added to a repository that already has code, or when existing code has never been checked against the conventions."
category: process
---

# Brownfield Adoption

## Overview

An existing codebase is adopted in three passes: **know it** (inventory, as-is documentation, docs moved to their locations, a baseline), **judge it** (a conformance table against every convention, and a verdict on the boundaries), **change it** (contracts first, then boundaries, then the client, then the inside of each service, then the docs). The change pass runs top-down and from the outside in: the monolith becomes modular services, the services get boundaries and contracts, the client becomes backend-driven, and only then is each service refactored inside. Every step is one API or one feature at a time, with a characterization test first and the product runnable throughout. The conventions are not overridable; the table is how the code moves toward them incrementally. No PRD: the outcome is fixed, "the code conforms with behavior unchanged".

## When to Use

- The brain has just been added to a repository with existing code.
- A service exists in code but has no `<service>/docs/`.
- Before any refactoring toward the conventions.
- NOT for greenfield features; use the normal flow (`prd-writing`, `hld`, `planning-and-task-breakdown`).

## Pass 1: know it

Read-only until step 3.

1. **Inventory.** Every deployable unit, package, and client app: entry points, build targets, Dockerfiles, CI jobs, databases, external providers. Record it in `docs/ARCHITECTURE.md` as the project structure and stack.
2. **Create the adoption project.** One Linear project per service, `Adoption: <service>`, with the milestones of pass 3 below and a first milestone `As-is documented` (`linear`).
3. **Create the docs.** `docs/` at the root and `<service>/docs/` per service from the brain's `templates/`. Fill `docs/DEVELOPMENT.md` from the commands that actually run, never invented. Move existing docs to their locations (`../../references/documentation-map.md`); never delete them; never add to a deprecated doc. Intermediate docs written during the adoption are kept the same way.
4. **Document the current state, as-is.** Per service, the engineer of the discipline writes the *current* `HLD.md`, `LLD.md`, and schema (`schema.ddb`) with the `hld` and `lld` skills, describing what the code does today including the ugly parts, with `hld.drawio` and Mermaid for the critical paths. The overall as-is architecture goes to `docs/ARCHITECTURE.md`. Every unknown is `UNKNOWN`, never guessed.
5. **Baseline verification.** Record the commands that currently pass (tests, build, start) on the `As-is documented` milestone; that is the floor no refactor may break.

## Pass 2: judge it

6. **Conformance table** per service, one row per rule in the convention skills (the prefix index is in `AGENTS.md`): rule id → followed | not followed | partial → evidence (`path:line`) → gap → blast radius. Post it on the adoption project and in the service's `docs/`.
7. **Boundaries verdict.** Answer, with evidence: Is the code modular, or one tangle? Which bounded contexts exist in fact? For every API a client or another service consumes: is there a contract (OpenAPI), is the client generated, does the client hold business rules or validation? Which service-to-service calls bypass any contract? This verdict decides how much of pass 3 applies.
8. **Hand it to the user.** Gaps that need a product or architecture decision are named for the user and, when decided, recorded as ADRs (`adrs`); the rest are ordered in pass 3.

## Pass 3: change it, top-down, outside in

Each step is a milestone of the adoption project, planned with `planning-and-task-breakdown`. Each step leaves the product runnable and the baseline green. A step that does not apply, because the verdict found it already true, is closed with the evidence.

9. **Contracts first, so each part can move independently.** For every API a client or another service consumes, derive the contract from current behavior: an OpenAPI document that describes what the API does today, ugly parts included. The contract is the source; consumers build against it, with mocks where needed (`development-setup`). Nothing else in pass 3 starts on a boundary that has no contract.
10. **Service boundaries.** If the code is not modular, decide the bounded contexts with `domain-modeling` and carve the services along them: one folder per service, its own tables, its own contract. Services talk only through contracts; every bypassing call is replaced by a contract call, one at a time. A live flow that must be replaced follows `deprecation-and-migration`.
11. **A backend-driven client.** If the web or mobile client holds business rules, validation, or decisions, the backend owns them: define the API the client needs (contract first), have the backend return labelled mock data from the contract, move the client onto it, then make the backend real. One API at a time: move it, test it, move the next. Never a sweep across the client.
12. **Inside each service, now insulated.** With contracts on every edge, each service is refactored on its own, top-down: the API layer first (typed inputs at the edge, validation and defensive code moved to the API and persistence boundaries), then the models (API, domain, and DB models separated and translated), then the domain (`domain-modeling`: the glossary, typed ids, sum types, invariants, errors as domain objects), then the business logic freed of defensive noise, then feature-first folders and named patterns, then metrics and logging. `coding-standards` and `database` are the rules; the conformance table rows are the tasks.
13. **The docs pass, at the end.** Make every document current: remove the knowledge that is no longer true, collapse duplicates into the document that owns the topic, add what the adoption created (contracts, boundaries, the domain glossary, ADRs). The as-is documents become the current ones; superseded ones move under a historical section of the index, never deleted (`documentation`).

Every task in every step: a small PR, a characterization test written first (`test-driven-development`) that pins current behavior, then the change, then the same test green, then the row closed with a status update on its issue.

## Adoption record

Posted on the adoption project and kept current at every milestone close.

```markdown
## Adoption: <service>
- Baseline verification: `<commands>` → green at <commit>
- As-is docs: HLD.md, LLD.md, schema.ddb, hld.drawio → DONE | PARTIAL (UNKNOWNs: <n>)
- Conformance: <followed>/<total> conventions; <n> gaps (blocker: <n>, high: <n>)
- Boundaries verdict: modular yes | no · contracts <n>/<m> APIs · client holds rules yes | no
- Milestones: contracts → boundaries → backend-driven client → inside the service → docs pass; current: <name>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We know the code, skip the as-is docs." | The next agent does not. Undocumented code cannot be refactored safely or reviewed against a design. |
| "Refactor everything in one branch." | The product must stay runnable. One API or feature per PR, characterization test first. |
| "Start with the domain types, that's where the value is." | Types inside a service with no contract on its edge get rewritten when the boundary moves. Contracts, then boundaries, then the inside. |
| "The client already validates, leave it." | Business truth in a client is a rule broken on every screen. Give the client the API it needs and move one call at a time. |
| "The old client works, generating one is churn." | Hand-written clients are where invalid requests come from. The contract comes first; generation follows it. |
| "Fix the folder layout first, it's mechanical." | Moving untyped code gives typed-looking folders with the same bugs. Contracts and types first, then moves. |
| "Guess what that module does." | Write `UNKNOWN` and an issue. A guessed HLD is worse than none. |
| "Delete the old docs, they're wrong." | Move them. They are evidence of what was intended; deprecation means frozen, not gone. The docs pass at the end decides what is current. |
| "We need a PRD for the adoption." | The outcome is fixed: conform with behavior unchanged. The conformance table and the boundaries verdict are the requirements. |

## Red Flags

- A service in code with no `<service>/docs/` folder.
- A conformance table with rows missing, or a row without evidence; no boundaries verdict.
- A refactor inside a service whose consumed APIs have no contract yet.
- A client change that moves several APIs at once.
- A refactor PR without a characterization test.
- An as-is HLD that describes the desired design instead of the current one.
- An existing doc deleted, or a deprecated doc still being appended to; an adoption finished without the docs pass.
- Baseline verification red after a refactor merge.

## Verification

- [ ] Every service has an adoption project, `<service>/docs/`, and a recorded baseline verification.
- [ ] As-is HLD, LLD, and schema exist per service and overall, with unknowns marked.
- [ ] The conformance table covers every convention with evidence; the boundaries verdict is written; the user has seen both.
- [ ] Every consumed API has a contract before any boundary or client work on it starts; the client is backend-driven before the inside of a service is refactored.
- [ ] Every refactor task has a characterization test and the baseline stays green.
- [ ] Existing docs were moved, not deleted; the docs pass at the end left every document current and every superseded one under history.
