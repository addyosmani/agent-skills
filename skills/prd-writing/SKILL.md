---
name: prd-writing
description: "Produces a phased PRD for one feature: target users, outcomes, a success target, an MVP phase delivered first and later phases that keep scope from creeping, stories with testable acceptance criteria, affected services, and the metrics to emit. Use when a product manager has a ticket for a feature and before any design work starts."
category: process
---

# PRD Writing

## Overview

The PRD is the contract between product and engineering. It states what must be true for the feature to be done, in testable terms, which phase ships first, and what is deliberately not being built yet. Engineers design and plan from it; QA verifies against it; the user reviews it before it counts. The project-level template is `templates/PRD.md`.

## When to Use

- A ticket exists and there is no PRD, or the existing one is stale.
- Scope changed materially mid-feature.
- NOT for a single bug or a small task with clear acceptance criteria; the engineer files the ticket and starts.
- NOT for technical design: the PRD says what, not how.

## Process

1. **Gather inputs**: the ticket with the user's verbatim prompt, the project `docs/PRD.md` this feature must fit, `docs/ARCHITECTURE.md` for which services it touches, and known constraints.
2. **Check it against the project PRD.** If the feature adds a capability, changes who the product is for, or crosses a line that page draws, stop and say so.
3. **Define the outcome**: target user, the problem, the measurable outcome, the **success target**, and how it will be verified once shipped.
4. **Cut the MVP phase**: the smallest version a user can use, shipped at the earliest. Everything else goes to a later phase with a reason. Phased PRDs and milestoned stories are how scope creep stays out.
5. **Check requirement clarity.** For every story: what exactly happens, to which entity, in which state, what happens on failure or reload, who decides. Unanswered questions that affect implementation go to the user; never let engineering build around a guess.
6. **Write stories** in user terms, each with acceptance criteria a QA reviewer could verify without asking.
7. **Map to services**: which services change per story; flag stories that need a contract first.
8. **Name the metrics**: product metrics (usage and funnel) and business metrics (what the success target is measured by); engineers emit them.
9. **List risks, assumptions, and open questions.** Blocking questions are named for the user.
10. **Publish**: the PRD in the tracker project description, linked from every story; hand it to the user for review.

## PRD template

```markdown
# PRD: <feature>
- Ticket: <id> · Version: <n> · Date:

## Problem and outcome
- Target user:
- Problem:
- Outcome (measurable):
- Success target:
- How we will verify after shipping:

## Scope of the PRD
| Phase | Covers | Not in this phase |
|---|---|---|
### Not doing

## Feature requirements, by priority
| Priority (P0 / P1 / P2) | Requirement | Phase |
|---|---|---|

## Product flows
<one flow per user goal; Mermaid where it helps>

## Edge cases
| Situation | Expected behaviour |
|---|---|

## Stories
### S1: <title>
- As a <user>, I want <capability> so that <outcome>.
- Acceptance criteria:
  - [ ] <testable statement>
- Services: <names>
- Contract needed first: yes | no

## Success criteria
| Metric | Target | How measured |
|---|---|---|
- Product metrics:
- Business metrics:

## Non-functional requirements
- Security required for this feature (only if security-sensitive):
- Scale actually needed now:
- Compliance / data handling:

## Risks and assumptions

## Open questions
| Question | Blocking | Owner |
|---|---|---|
```

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
- No MVP phase, no priorities, no edge cases, no "Not doing", or no success criteria.
- A story that touches a service the PRD does not name.
- A PRD that lives only in chat, or was never reviewed by the user.

## Verification

- [ ] Every story has testable acceptance criteria and named services.
- [ ] Scope by phase, the priority-ordered requirements, product flows, edge cases, and "Not doing" are filled or explicitly "none".
- [ ] The success target and the product and business metrics are named.
- [ ] Blocking questions are named for the user; the PRD is linked from the project and every story.
- [ ] The user has reviewed the PRD.
