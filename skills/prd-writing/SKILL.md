---
name: prd-writing
description: "Produces a phased PRD for one feature or for the project from templates/PRD.md: target users, outcomes, a success target, an MVP phase delivered first and later phases that keep scope from creeping, stories with testable acceptance criteria, affected services, and the metrics to emit. Use when a product manager has a ticket for a feature and before any design work starts, when the project PRD is missing or stale, or when scope changes materially mid-feature."
category: process
---

# PRD Writing

## Overview

The PRD is the contract between product and engineering. It states what must be true for the feature to be done, in testable terms, which phase ships first, and what is deliberately not being built yet. Engineers design and plan from it; QA verifies against it; the user reviews it before it counts. The anatomy is `templates/PRD.md`, one template for both altitudes: the project PRD and a feature PRD.

## When to Use

- A ticket exists and there is no PRD, or the existing one is stale.
- Scope changed materially mid-feature.
- NOT for a single bug or a small task with clear acceptance criteria; the engineer files the ticket and starts.
- NOT for technical design: the PRD says what, not how.

## Process

Each step fills a section of `templates/PRD.md`; a section is skipped with one line saying why.

1. **Gather inputs**: the ticket with the user's verbatim prompt, the project `docs/PRD.md` this feature must fit, `docs/ARCHITECTURE.md` for which services it touches, and known constraints.
2. **Check it against the project PRD.** If the feature adds a capability, changes who the product is for, or crosses a line that page draws, stop and say so.
3. **Problem and outcome**: target user, the problem, the measurable outcome, the success target, and how it will be verified once shipped.
4. **Scope**: cut the MVP phase, the smallest version a user can use, shipped at the earliest. Everything else goes to a later phase, and what is out goes under "Deliberately not" with a reason. Phased PRDs and milestoned stories are how scope creep stays out.
5. **Requirements by priority, product flows, edge cases.** For every requirement check clarity: what exactly happens, to which entity, in which state, what happens on failure or reload, who decides. Unanswered questions that affect implementation go to the user; never let engineering build around a guess.
6. **Stories** in user terms, each with acceptance criteria a QA reviewer could verify without asking, the services that change, and whether a contract is needed first.
7. **Success criteria**: product metrics (usage and funnel) and business metrics (what the success target is measured by); engineers emit them (`observability-and-instrumentation` O4).
8. **Non-functional requirements, risks and assumptions, open questions.** Blocking questions are named for the user.
9. **Publish**: `docs/PRD.md` for the project, the service's `docs/` for a feature (`documentation` W9–W11), linked from the Linear project and every story; hand it to the user for review.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Engineering can figure out the details." | Undefined acceptance criteria become guesses and rework. |
| "We'll add the later phases afterwards." | If it is not written, it silently creeps back into phase 1. |
| "One big story is fine." | Stories that cannot be verified independently cannot be delivered continuously. |
| "Engineering will ask if something is unclear." | They will guess and build around the guess. Ask the clarity questions now. |
| "A success target is hard to pick." | Pick one and revise. A feature without one cannot be judged shipped. |

## Red Flags

- An acceptance criterion containing "should work correctly".
- A template section empty with no line saying why; no MVP phase; no "Deliberately not".
- A story that touches a service the PRD does not name.
- A PRD that lives only in chat or in the tracker, or was never reviewed by the user.

## Verification

- [ ] Every story has testable acceptance criteria and named services.
- [ ] Every template section is filled or skipped with a reason; phase 1 is the MVP.
- [ ] The success target and the product and business metrics are named.
- [ ] Blocking questions are named for the user; the PRD is in `docs/` and linked from the project and every story.
- [ ] The user has reviewed the PRD.
