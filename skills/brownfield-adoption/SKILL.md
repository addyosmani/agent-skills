---
name: brownfield-adoption
description: "Brings an existing codebase under the conventions: inventories services, documents the current state as HLD, LLD, and DB diagrams at overall and service level, builds a conformance table with one row per convention saying followed or not, moves existing docs to their agreed locations without deleting them, and turns the gaps into a refactoring roadmap (domain typing per API, feature-first layout, generated typed clients) delivered through normal milestones and sprints. Use when the brain is first added to a repository that already has code, or when existing code has never been checked against the conventions."
category: process
---

# Brownfield Adoption

## Overview

An existing codebase is adopted in three passes: **know it** (inventory, as-is documentation, docs moved to their locations), **judge it** (a conformance table against every rule in the convention skills), **change it** (a roadmap of refactors delivered as ordinary milestones and sprints, one API or feature at a time, with the product runnable throughout). The conventions are not overridable; the table is how the code moves toward them incrementally. Nothing is refactored before it is documented as-is.

## When to Use

- The brain has just been added to a repository with existing code.
- A service exists in code but has no `<service>/docs/`.
- Before any refactoring toward the conventions.
- NOT for greenfield features; use the normal flow (`prd-writing`, `hld`, `milestone-planning`).

## Process

### Pass 1: know it (a scout, then an engineer; read-only until step 3)

1. **Inventory services.** List every deployable unit, package, and client app: entry points, build targets, Dockerfiles, CI jobs. Record it in `docs/ARCHITECTURE.md` as the project structure.
2. **Create the tracker projects.** One per service named `Adoption: <service>` with a milestone `As-is documented`.
3. **Create the docs.** `docs/` at the root and `<service>/docs/` per service from the brain's `templates/`. Fill `docs/DEVELOPMENT.md` from the commands that actually run, never invented. Move existing docs to their locations (`../../references/documentation-map.md`); never delete them; never add to a deprecated doc.
4. **Document the current state, as-is.** Per service, the engineer of the discipline writes the *current* `HLD.md`, `LLD.md`, and schema (`schema.ddb`) with the `hld` and `lld` skills, describing what the code does today including the ugly parts, with `hld.drawio` and Mermaid for the critical paths. The overall as-is HLD goes to `docs/HLD.md`. Every unknown is `UNKNOWN`, never guessed.
5. **Baseline verification.** Record the commands that currently pass (tests, build, start) on the adoption milestone; that is the floor no refactor may break.

### Pass 2: judge it

6. **Conformance table** per service, one row per rule in the convention skills (the prefix index is in `AGENTS.md`): rule id → followed | not followed | partial → evidence (`path:line`) → gap → blast radius. Post it on the adoption milestone and in the service's `docs/`.
7. **Client contracts.** For every API a client consumes, record whether an OpenAPI document exists and whether the client is generated. Missing OpenAPI is the first gap to close; typed clients and backend-only validation depend on it.
8. **Hand the table to the user.** Gaps that need a product decision are named for the user; the rest are ordered in pass 3.

### Pass 3: change it (product manager and engineers)

9. **Roadmap** as a PRD per service or area (`prd-writing`): the outcome is "service conforms to conventions X, Y, Z with behavior unchanged"; acceptance criteria are the table rows closed and the baseline still green.
10. **Order the work**: (a) OpenAPI for every API and generated clients at the repository root, (b) domain typing per API (typed ids, sum types, validation moved to the edges), one endpoint or feature at a time, (c) feature-first folder moves once types are in place, (d) metrics and logging, (e) remaining rows. Contract task first per service.
11. **Milestones and sprints** as usual (`milestone-planning`); every task is a small PR with a characterization test written first (`test-driven-development`) that pins current behavior, then the refactor, then the same test green.
12. **Track**: each closed row is a status update on its ticket; the adoption milestone shows the conformance count per service.

## Adoption record

```markdown
## Adoption: <service>
- Baseline verification: `<commands>` → green at <commit>
- As-is docs: HLD.md, LLD.md, schema.ddb, hld.drawio → DONE | PARTIAL (UNKNOWNs: <n>)
- Conformance: <followed>/<total> conventions; <n> gaps (blocker: <n>, high: <n>)
- Roadmap PRD: <link> · Milestones: <list>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "We know the code, skip the as-is docs." | The next agent does not. Undocumented code cannot be refactored safely or reviewed against a design. |
| "Refactor everything in one branch." | The product must stay runnable. One API or feature per PR, characterization test first. |
| "The old client works, generating one is churn." | Hand-written clients are where invalid requests come from. Generation is the contract task. |
| "Fix the folder layout first, it's mechanical." | Moving untyped code gives typed-looking folders with the same bugs. Types first, then moves. |
| "Guess what that module does." | Write `UNKNOWN` and a ticket. A guessed HLD is worse than none. |
| "Delete the old docs, they're wrong." | Move them. They are evidence of what was intended; deprecation means frozen, not gone. |

## Red Flags

- A service in code with no `<service>/docs/` folder.
- A conformance table with rows missing, or a row without evidence.
- A refactor PR without a characterization test.
- An as-is HLD that describes the desired design instead of the current one.
- An existing doc deleted, or a deprecated doc still being appended to.
- Baseline verification red after a refactor merge.

## Verification

- [ ] Every service has a tracker project, `<service>/docs/`, and a recorded baseline verification.
- [ ] As-is HLD, LLD, and schema exist per service and overall, with unknowns marked.
- [ ] The conformance table covers every convention with evidence, and the user has seen it.
- [ ] OpenAPI exists for every consumed API and clients are generated before domain-typing refactors start.
- [ ] Every refactor task has a characterization test and the baseline stays green.
- [ ] Existing docs were moved, not deleted.
