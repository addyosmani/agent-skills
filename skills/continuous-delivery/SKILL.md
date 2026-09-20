---
name: continuous-delivery
description: How any requirement is planned and shipped — semver and changelogs, a progressively usable product (one API at a time, the app works at every point), feature flags and code without an entry point, MVP first, API-contract-first so frontend and backend work independently with mocks, concurrent backend work once DB model and contracts are fixed, resolving dependency shapes first, "main is always releasable", PR size limits, and the recorded one-shot override. Use when you break a feature into tasks, plan a sprint, decide what to build first, wonder whether to ship behind a flag, or the user gives you a large scope — even if they just say "build feature X".
category: delivery
---

# Continuous delivery

## Overview

How any requirement is planned and shipped: `main` is always releasable, the app works at every point, an MVP ships first however big the scope, and frontend and backend work in parallel against a contract. A feature is delivered continuously — the user gets usable increments, always.

## When to Use

- You break a feature into tasks or plan a sprint
- You decide what to build first
- You wonder whether to ship behind a flag
- The user gives you a large scope — even if they just say "build feature X"
- Cutting a release: semver and the changelog (L1)

**NOT for:** the mechanics of commits, branches, PRs and merge (`git-workflow-and-versioning`); creating your own worktree and containers (`environment-setup`); replacing a flow that is in use (`deprecation-and-migration`).

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
| L8 | **Where slicing is technically impossible (some migrations), say so on the ticket.** The user may ask for one-shot development — do the whole dev in one shot, one pass of testing, then commit — when speed is required. **Only on an explicit user instruction, recorded in `docs/LEARNINGS.md`** (and noted on the ticket). |

## Development parallelism

| ID | Rule |
| --- | --- |
| L9 | **API contract first, so frontend and backend work independently.** While working with APIs not created yet, the frontend mocks the API from the contract; the backend returns labelled mock data for integration testing until complete. |
| L10 | **Once the DB model and the API contracts are decided, backend services work concurrently** (including service-to-service communication). |
| L11 | **A dependency's shape and type are resolved before anything else is done.** There must be no confusion about the shape or type of a dependency on another service. |
| L12 | **Every agent creates its own environment** — see `environment-setup`. |
| L13 | **Large-scale deprecation or migration** — see `deprecation-and-migration`. |

## Commit and PR granularity (detail in `git-workflow-and-versioning`)

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
6. Bump semver and add the changelog line on merge (L1, `git-workflow-and-versioning` P13).
7. If any slice cannot keep the app working, say so on the ticket; if the user asks for one-shot, record the override in `docs/LEARNINGS.md` (L8).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The scope is huge, I'll change everything and make it work at the end" | Making the product unusable to make progress is not acceptable; create one API, test it, commit it, then the next (L3). |
| "Localhost is broken but it's mid-task" | "Localhost keeps working after every commit" is an explicit acceptance criterion; if a step genuinely cannot meet it, say so on the ticket (L4, L8). |
| "The feature isn't ready, so I'll keep it on my branch" | Unfinished work ships behind a flag defaulting off or without an entry point (L5); it never blocks a deployable `main` (L2). |
| "The requirement is too big for an MVP" | An MVP ships first for any requirement, however big; the original scope continues after (L6). |
| "I'll build the frontend once the backend is done" | The API contract comes first; frontend mocks it, backend returns labelled mock data until complete (L9). |
| "I'll figure out the dependency's shape as I go" | A dependency's shape and type are resolved before anything else is done (L11). |
| "The user wants speed, so one-shot it" | One-shot development happens only on an explicit user instruction, recorded in `docs/LEARNINGS.md` and noted on the ticket (L8). |
| "This change can't be deployed alone, but the next one will fix it" | A change that cannot be deployed on its own is not ready to merge (L2). |

## Red Flags

- Changes all over the codebase with the product unusable in between (L3)
- Localhost stops working mid-task with nothing said on the ticket (L4, L8)
- Incomplete work reachable by users with no flag, or a flag defaulting on (L5)
- Discovered work entering scope without classification (L6)
- Frontend and backend serialized because no contract exists (L9)
- Backend services blocked on each other after the DB model and contracts are fixed (L10)
- Code written against a dependency whose shape or type is still open (L11)
- One-shot development with no recorded user instruction (L8)
- A merged task with no changelog line, or a release with no changelog entry listing its tickets (L1)

## Verification

Before a slice merges, confirm:

- [ ] The app works after this change alone; localhost still runs (L3, L4)
- [ ] CI is green; migrations are backward compatible for one release; incomplete paths are behind a flag defaulting off or have no entry point (L2, L5)
- [ ] The MVP is cut and later scope stays on the ticket (L6)
- [ ] The API contract and DB model exist and dependency shapes are resolved before parallel work started (L9, L10, L11)
- [ ] The commit is one coherent capability and the PR is under ~400 lines / 10 files (L14, L15)
- [ ] Semver bumped and changelog line added on merge (L1)
- [ ] Any slice that cannot keep the app working is stated on the ticket; any one-shot override is recorded in `docs/LEARNINGS.md` (L8)
