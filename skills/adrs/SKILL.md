---
name: adrs
description: How an architectural decision worth preserving is recorded as an Architecture Decision Record — which decisions qualify (one-way doors, service boundaries, technology, platform, tooling, and infrastructure choices, scale infrastructure), matching the project's existing ADR convention first, the problem, options, choice, rationale, reversibility anatomy from templates/ADR.md, linking the ADR from the HLD or ticket that made the decision, and the proposed, accepted, superseded lifecycle. Use when asked for an ADR, when an HLD names a one-way door or chooses between alternatives, when a framework, library, hosting, CI, auth, or database choice is made, or when a rule requires a current requirement recorded in an ADR. NOT for the design itself, which is the HLD or LLD, or for a choice the ticket and commit message carry.
category: design
---

# Architecture Decision Records

## Overview

Architectural decisions worth preserving are recorded as ADRs: one decision per record, with the problem, the options and why each was rejected, the choice, the rationale, and how reversible it is. The design that made the decision (an HLD, an LLD, a ticket) links the ADR; it does not restate the options and rationale. Years later the ADR answers "why is it like this and what else was considered" without archaeology.

## When to Use

- Asked for an ADR, or to record a decision as one.
- An HLD names a one-way door, chooses between alternatives, or draws a service boundary that was not obvious (the HLD tradeoffs or one-way doors link the ADR).
- A framework, language, major library, ORM, hosting platform, CI system, auth provider, or database engine is chosen.
- Scale infrastructure is added: sharding, caches, read replicas (`database` D11 requires the ADR); a deviation from the stack recorded in `docs/ARCHITECTURE.md`.
- A process or tooling decision that is expensive to reverse.
- NOT for the design itself: boundaries, APIs, the domain model, the data model, and patterns are described in the HLD and LLD; the ADR records only the decision among alternatives.
- NOT for a choice the ticket and the commit message carry (`documentation` W1).

## Match the existing convention first

Before creating an ADR, look for an established convention: existing ADRs, project instructions, ADR tooling such as an `.adr-dir` file or `adr-tools`. An established convention overrides the defaults below. Match:

- **Location and format**: the existing directory, file extension, and markup.
- **Numbering and naming**: continue the existing sequence and filename pattern; never restart at 001 or introduce a second scheme.
- **Section headings**: reuse the project's heading set rather than the template's.

If the evidence conflicts, surface the conflict instead of silently adding another scheme. Apply the default only when no convention can be established.

## Process

1. **Check it qualifies**: a decision among alternatives that would be expensive to reverse or that others will ask about. If the ticket carries it, stop.
2. **Match the convention** (above). Default: `docs/decisions/NNNN-<slug>.md` for the project, `<service>/docs/decisions/` for a decision local to one service, sequential numbering, one decision per file.
3. **Write it from `templates/ADR.md`**: status, date, problem, options with why each was rejected, choice, rationale, reversibility (two-way door and how it is undone, or one-way door and why). Present tense, describing the state it creates, so it stays true after the change lands.
4. **Link it** from the HLD's tradeoffs, the LLD, or the ticket that made the decision, and add it to the document index (`documentation` W8).
5. **User review** when the decision is a one-way door; otherwise it is accepted with the PR that lands it.

## Lifecycle

```
Proposed → Accepted → (Superseded or Deprecated)
```

- Never delete or rewrite an accepted ADR; it is history.
- When a decision changes, write a new ADR that references and supersedes the old one, and mark the old one superseded.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "ADRs are overhead." | A ten-minute ADR prevents a two-hour debate about the same decision six months later. |
| "The HLD already explains the tradeoffs; the ADR is a duplicate." | The HLD describes the design and links the ADR; the options, rejections, and rationale live only in the ADR. |
| "I'll use my template, theirs is inconsistent." | Two schemes in one repository is worse than one imperfect scheme. Match the convention. |
| "I'll edit the old ADR to reflect the new decision." | The old one is history. Write a new ADR that supersedes it. |
| "We know why we chose it; the options don't matter." | The rejected options are what stop the decision being relitigated. Record them. |

## Red Flags

- A one-way door, a technology choice, or scale infrastructure with no ADR.
- An HLD that restates options and rationale instead of linking the ADR; an ADR that describes the design instead of the decision.
- An ADR that names a choice with no problem, options, rationale, or reversibility.
- A second numbering scheme or location next to an existing one.
- An old ADR edited in place, or deleted.
- An ADR in a cloud tool instead of the repository (`documentation` W9).

## Verification

- [ ] The decision qualifies: alternatives existed and reversing it would be expensive, or a rule required the ADR.
- [ ] The existing convention was searched for and matched, or its absence stated.
- [ ] Problem, options with rejections, choice, rationale, and reversibility are all present and distinct; status and date are set.
- [ ] The HLD, LLD, or ticket that made the decision links the ADR; the ADR is in the document index.
- [ ] A superseded ADR is marked and linked from its successor.
