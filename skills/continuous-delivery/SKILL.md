---
name: continuous-delivery
description: How any requirement is planned and shipped, with rule ids L1–L6 — semver and changelogs, "main is always releasable", a progressively usable product (one API at a time, the app works at every point, localhost keeps working after every commit), feature flags and code without an entry point for what is not ready, MVP first however big the scope, and the recorded one-shot override when slicing is impossible. Use when you break a feature into tasks, plan a sprint, decide what to build first, wonder whether to ship behind a flag, cut a release, or the user gives you a large scope — even if they just say "build feature X".
category: delivery
---

# Continuous delivery

## Overview

How any requirement is planned and shipped: `main` is always releasable, the app works at every point, and an MVP ships first however big the scope. The user gets usable increments, always.

## When to Use

- You break a feature into tasks or plan a sprint.
- You decide what to build first.
- You wonder whether to ship behind a flag.
- The user gives you a large scope, even if they just say "build feature X".
- Cutting a release: semver and the changelog (L1).
- NOT for the mechanics of commits, branches, PR size, and merge (`git-workflow-and-versioning` P1, P2, P11); the agent's environment and how parallel work is set up (`development-setup`); replacing a flow that is in use (`deprecation-and-migration`).

## Rules

| ID | Rule |
| --- | --- |
| L1 | **Semver, and a changelog.** A changelog is maintained globally and per service; every merged task adds a line; every release publishes a changelog entry that lists its tickets. |
| L2 | **Every merged change is deployable; `main` is always releasable:** CI is green, migrations are backward compatible for one release, and anything incomplete is behind a flag that defaults off. A change that cannot be deployed on its own is not ready to merge. |
| L3 | **A progressively usable product: the app works at every point.** Create one API, test it, commit it, then the next; never make the product unusable to make progress, however large the scope. Stories and sprints are cut so the user gets usable increments. "Localhost keeps working after every commit" is an explicit acceptance criterion on every task, because historically it was not met. |
| L4 | **Feature flags, and code without an entry point, for what is not ready.** Flags default off. |
| L5 | **An MVP ships first for any requirement, however big; the original scope continues after.** Discovered work is classified before it enters scope; only MVP requirements and MVP blockers enter automatically (`project-management` M11). |
| L6 | **Where slicing is technically impossible (some migrations), say so on the ticket.** The user may ask for one-shot development, the whole change in one pass with one round of testing, when speed is required: only on an explicit user instruction, recorded in `docs/LEARNINGS.md` and noted on the ticket. |

## Planning recipe for a large scope

1. Get the API contract, the DB model, and every dependency's shape resolved before parallel work starts (`development-setup` DS7–DS9).
2. Cut the MVP; everything else stays on the ticket as later scope (L5).
3. Order the slices so each leaves the app working; put unfinished paths behind a flag or leave them without an entry point (L3, L4).
4. One API at a time: implement, test, commit, PR (L3; commit and PR size per `git-workflow-and-versioning` P2, P11).
5. Bump semver and add the changelog line on merge (L1).
6. If a slice cannot keep the app working, say so on the ticket; if the user asks for one-shot, record the override in `docs/LEARNINGS.md` (L6).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The scope is huge, I'll change everything and make it work at the end." | One API, tested, committed, then the next; the product is never unusable in between (L3). |
| "Localhost is broken but it's mid-task." | Localhost working after every commit is an acceptance criterion; if a step genuinely cannot meet it, say so on the ticket (L3, L6). |
| "The feature isn't ready, so I'll keep it on my branch." | Unfinished work ships behind a flag defaulting off or without an entry point (L4); it never blocks a deployable `main` (L2). |
| "The requirement is too big for an MVP." | An MVP ships first for any requirement, however big (L5). |
| "The user wants speed, so one-shot it." | Only on an explicit user instruction, recorded in `docs/LEARNINGS.md` and on the ticket (L6). |
| "This change can't be deployed alone, but the next one will fix it." | Then it is not ready to merge (L2). |

## Red Flags

- Changes all over the codebase with the product unusable in between; localhost stops working mid-task with nothing said on the ticket (L3, L6).
- Incomplete work reachable by users with no flag, or a flag defaulting on (L4).
- Discovered work entering scope without classification (L5).
- One-shot development with no recorded user instruction (L6).
- A merged task with no changelog line, or a release with no changelog entry listing its tickets (L1).

## Verification

Before a slice merges, confirm:

- [ ] The app works after this change alone; localhost still runs (L3).
- [ ] CI is green; migrations are backward compatible for one release; incomplete paths are behind a flag defaulting off or have no entry point (L2, L4).
- [ ] The MVP is cut and later scope stays on the ticket (L5).
- [ ] Semver bumped and changelog line added on merge (L1).
- [ ] Any slice that cannot keep the app working is stated on the ticket; any one-shot override is recorded in `docs/LEARNINGS.md` (L6).
