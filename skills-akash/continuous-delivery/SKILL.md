---
name: continuous-delivery
description: How any requirement is planned and shipped — semver and changelogs, a progressively usable product (one API at a time, the app works at every point), feature flags and code without an entry point, MVP first, API-contract-first so frontend and backend work independently with mocks, concurrent backend work once DB model and contracts are fixed, resolving dependency shapes first, "main is always releasable", PR size limits, and the recorded one-shot override. Load whenever you break a feature into tasks, plan a sprint, decide what to build first, wonder whether to ship behind a flag, or the user gives you a large scope — even if they just say "build feature X".
---

# Continuous delivery

## Releases

| ID | Rule |
| --- | --- |
| L1 | **Semver, and a changelog.** Publish a changelog and follow semver for releases. A changelog is maintained globally and per service; every merged task adds a line; every release publishes a changelog entry that lists its tickets. |
| L2 | **Every merged change is deployable. `main` is always releasable:** CI is green, migrations are backward compatible for one release, and anything incomplete is behind a flag that defaults off. A change that cannot be deployed on its own is not ready to merge. |

## Progressively usable product

| ID | Rule |
| --- | --- |
| L3 | **A progressively usable product: the app works at every point.** Instead of creating everything in one shot, create one API, test it, commit it, then the next. Never make the product unusable to make progress. If you get a very large scope, making changes all over the place and making the product unusable as a result is not acceptable. Always make sure any change you make works; break tasks so that at every point the app is working. |
| L4 | This rule has historically **not been followed** (localhost stopped working mid-task). Treat "localhost keeps working after every commit" as an explicit acceptance criterion; if it is genuinely infeasible for a step, say so on the ticket (L8). |
| L5 | **Feature flags, and code without an entry point, for what is not ready.** Flags default off. |
| L6 | **An MVP ships first for any requirement, however big; the original scope continues after.** Discovered work is classified before it enters scope; only MVP requirements and MVP blockers enter automatically (see `project-management`, M11). |
| L7 | A feature is delivered continuously: stories and sprints are cut so the user gets usable increments, always. When a feature request comes, delivering it continuously to the user is the top priority. |
| L8 | **Where slicing is technically impossible (some migrations), say so on the ticket.** The user may ask for one-shot development — do the whole dev in one shot, one pass of testing, then commit — when speed is required. **Only on an explicit user instruction, recorded in `self-improvement.md`** (and noted on the ticket). |

## Development parallelism

| ID | Rule |
| --- | --- |
| L9 | **API contract first, so frontend and backend work independently.** While working with APIs not created yet, the frontend mocks the API from the contract; the backend returns labelled mock data for integration testing until complete. |
| L10 | **Once the DB model and the API contracts are decided, backend services work concurrently** (including service-to-service communication). |
| L11 | **A dependency's shape and type are resolved before anything else is done.** There must be no confusion about the shape or type of a dependency on another service. |
| L12 | **Every agent creates its own environment** — see `agent-environment-setup`. |
| L13 | **Large-scale deprecation or migration** — see `deprecation-migration`. |

## Commit and PR granularity (detail in `commits-and-pull-requests`)

| ID | Rule |
| --- | --- |
| L14 | Commits are small, working changes: one coherent capability, contract, or verified behavior per commit; never "implement entire X". Every commit is usable or at least does not break the app. |
| L15 | A PR is never held open to grow. Open it when the first verifiable slice is ready; split at roughly 400 changed lines or 10 files — land the mechanical part, the contract, or the flagged-off skeleton first. A long-lived branch is a merge conflict accruing interest. |

## Planning recipe for a large scope

1. Write the API contract (OpenAPI) and the DB model; get the dependency shapes resolved (L9, L10, L11).
2. Cut the MVP; everything else stays in the ticket as later scope (L6).
3. Order the slices so each leaves the app working; put unfinished paths behind a flag or leave them without an entry point (L3, L5).
4. Frontend proceeds against the contract with mocks; backend returns labelled mock data until real (L9).
5. One API: implement, test, commit, PR (L3, L14, L15).
6. Bump semver and add the changelog line on merge (L1, `commits-and-pull-requests` P13).
7. If any slice cannot keep the app working, say so on the ticket; if the user asks for one-shot, record the override in `self-improvement.md` (L8).
