---
name: test-case-design
description: Designs a traceable Test Planner before implementation. Use when creating a test plan, deciding what to test, choosing the smallest sufficient test layer, deriving or reviewing concrete cases and coverage models, planning accessibility coverage, applying boundary values, equivalence classes, decision tables, state transitions, or pairwise reduction, resolving test oracles, reducing a test matrix, or reviewing coverage gaps.
---

# Test Case Design

## Overview

Perform **Test Analysis** and **Test Design** before test implementation:

- Test Analysis decides **what must be proven** from requirements, contracts, risks, changed surfaces, and authoritative oracles.
- Test Design decides **how to prove it** by selecting layers, techniques, coverage models, data, and concrete cases.

The output is a `Test Planner` that `test-driven-development` can consume case by case. This skill may inspect code, requirements, tests, and project commands, but it does not write test code, change product code, or execute tests.

## When to Use

Use this skill when:

- Planning tests before implementing a non-trivial change
- Deciding the smallest sufficient set of test layers
- Turning requirements, contracts, incidents, or risks into concrete test cases
- Choosing a case-design technique or reviewing whether it was applied correctly
- Reducing a large input, state, rule, or configuration matrix
- Reviewing existing coverage for gaps, redundancy, weak oracles, or misplaced E2E tests

Do not use it to write tests or change behavior; continue with `test-driven-development` after the planner is ready. Use the `tests` skill to execute existing suites, `debugging-and-error-recovery` to diagnose unexplained failures, and `browser-testing-with-devtools` for live browser evidence.

## Test Design Workflow

### 1. Establish the Test Basis and Oracle

Collect authoritative sources for expected behavior:

- Requirement or acceptance criterion
- API, schema, event, or interface contract
- Business invariant or approved example
- Incident evidence or a confirmed defect report
- Existing behavior only when explicitly accepted as the specification

For each expected result, cite its oracle. For each case, cite the requirement or risk that justifies it. If sources conflict or omit an expected result, mark that case `BLOCKED` and name the owner who must decide. Never turn an assumption or current implementation into an executable requirement silently.

Then identify:

- Changed surfaces: UI, frontend state/router, endpoint, domain service, shared schema/client, persistence, queue, cache, filesystem, or external integration
- Affected contracts: request/response schema, generated client, public API, event, or none
- Quality concerns: accessibility, security, performance, visual regression, observability, migration safety, reliability, or none

At trust boundaries, treat input validation, authentication, authorization, sensitive-data handling, and abuse resistance as security quality concerns even when their public contract is unchanged. A quality concern does not automatically require another test layer; it records the risk the selected cases must address.

### 2. Choose the Smallest Sufficient Layer

Use the familiar ~80/15/5 pyramid as a cost and confidence guideline, not a universal quota:

```text
          /\
         /  \         E2E / System (~5%)
        /----\        Critical real journeys
       /      \       Boundary / Collaboration (~15%)
      /--------\      Component, Frontend Integration, API,
     /          \     Contract, Backend Integration
    /------------\    Unit (~80%)
                        Pure logic and isolated modules
```

The pyramid answers how much expensive coverage to keep. The layer decision answers where each behavior is best proven.

| What must be proven | Prefer this layer |
|---|---|
| Pure logic with no side effects | Unit |
| One rendered UI unit behaves correctly | Component |
| Frontend modules cooperate with a mocked backend | Frontend Integration |
| A backend HTTP endpoint behaves correctly | API |
| Consumers and providers agree on shared shapes | Contract |
| Backend dependencies cooperate | Backend Integration |
| A critical journey works through the real system | E2E / System |

Use the lowest layer that proves the behavior. API tests are backend-owned endpoint behavior; contract tests are consumer/provider compatibility. Frontend Integration and Backend Integration protect different boundaries. Size is a separate execution-cost model:

| Size | Constraint | Typical layer |
|---|---|---|
| Small | Single process, no I/O or network | Unit, focused component |
| Medium | Localhost or local dependencies allowed | API, contract, integration |
| Large | External services or multi-system environment | E2E, system, performance |

### 3. Derive Cases with an Explicit Technique

Select the lightest technique that exposes the risk:

| Behavior shape | Prefer | Required artifact |
|---|---|---|
| One concrete behavior | Direct example | Input/precondition, action, expected result |
| Known defect | Regression reproduction | Minimal reproducer and expected RED reason |
| Values form valid and invalid groups | Equivalence classes | Named partitions and representatives |
| Behavior changes at a threshold | Boundary values | Below, at, and above meaningful boundaries |
| Conditions combine into outcomes | Decision table | Conditions, outcomes, reachable rules, precedence |
| Behavior depends on state and event order | State transition | States, events, valid and important invalid transitions |
| Configuration matrix is too large | Pairwise | Factors, values, constraints, generated set, coverage evidence |
| Multiple ordered variables interact | Domain analysis | Dimensions, regions, boundaries, intersections |
| An actor completes a goal | Use case | Actor, goal, main path, selected alternate/error paths |
| Code paths or value lifecycles matter | Control/data flow | Covered decisions or define-use paths and observable outcomes |

For an inclusive discrete range `[L, U]`, the default boundary model is `L-1, L, L+1, U-1, U, U+1`. Deduplicate overlapping points and adapt the step for the domain, but do not replace just-inside points with an arbitrary interior representative. For a single threshold, cover just below, at, and just above it unless one point is impossible by definition.

Read `references/test-design-techniques.md` when the choice is non-obvious or when applying white-box, exploratory, adaptive, risk-based, or exit-criteria guidance. Keep these dimensions separate:

- Case-design technique: how representative cases are derived
- Operating mode: scripted, exploratory, or adaptive
- Risk heuristic: what additional failure ideas deserve attention
- Exit criteria: what evidence is enough and who accepts residual risk
- Quality concern: which non-functional failure matters
- Test layer: where the future test runs

Naming a technique without its required artifact is not evidence that the technique shaped the cases.

### 4. Produce a Minimal, Diagnostic Case Set

1. Start with the critical successful behavior.
2. Add every case required by the selected coverage model.
3. Add high-impact negative, authorization, retry, idempotency, timing, concurrency, or recovery cases only when supported by the model or risk.
4. Remove cases that repeat the same rule without adding a partition, boundary, transition, combination, or outcome.
5. Keep one primary objective per case so failures remain diagnosable.
6. Add known high-risk combinations even when pairwise generation omits them.
7. Mark impossible combinations and excluded layers explicitly.

Prioritize by impact, likelihood, and recent change. Case count is not a quality target; distinct risk coverage is.

### 5. Match Quality Claims to Evidence

Apply quality concerns at the selected layer first. Add broader evidence only when the claim cannot be proven lower down.

| Accessibility concern | Best first evidence | Broaden when |
|---|---|---|
| Name, role, state, error text | Component assertions | Page composition changes semantics |
| Keyboard path, focus trap, restoration | Component or browser | Real tab order, routing, or layout matters |
| Accessibility-tree exposure | Browser inspection | Async rendering or browser behavior matters |
| Actual assistive-technology announcement | Target browser/AT manual or automated integration | Always when interoperability is a release requirement |
| Contrast, zoom, reflow | Browser audit | CSS, theme, or layout changed |

Automated accessibility scans are useful but do not prove keyboard traversal, focus behavior, or screen-reader announcements. Use `references/accessibility-checklist.md` for the detailed checklist.

### 6. Write the Test Planner Handoff

Use the repository's established format when one exists; otherwise produce:

```markdown
## Test Planner

### Test Analysis
- Test basis / oracle:
- Changed surfaces:
- Affected contracts:
- Quality concerns:
- Assumptions or blocked questions:

### Test Design
- Primary layer:
- Adjacent layers:
- Case-design technique(s):
- Coverage model / required artifacts:
- Skipped layers and why:

### Cases
| ID | Title | Source / risk | Preconditions | Input / event | Expected result / oracle | Technique | Priority |
|---|---|---|---|---|---|---|---|

### Implementation Handoff
- First RED case:
- Existing command(s) discovered:
- Planner status: READY | BLOCKED
- Residual risk / owner:
```

A planner is `READY` only when the first case has an authoritative oracle, a concrete input or event, an observable expected result, a selected layer, and a real project command or a clearly identified command-discovery step.

For a single obvious behavior or confirmed bug, the handoff may collapse to a mini planner containing only basis/oracle, layer, first case, and command. Do not require a large document for a one-case change.

## TDD Handoff Contract

After design:

1. `test-driven-development` reads and validates the planner against current sources.
2. It selects the highest-priority unimplemented case and performs RED-GREEN-REFACTOR.
3. It does not silently redesign cases, change the oracle, or broaden layers while implementing.
4. New implementation evidence may trigger a planner revision, but the change and rationale must be explicit.
5. A `BLOCKED` oracle stops TDD for that case; code must not decide an unresolved product rule.

## Design Rules

1. No expected result without an oracle.
2. No case without traceability to a requirement or risk.
3. No technique claim without its coverage artifact.
4. No test-layer label used as a case-design technique.
5. No full Cartesian matrix when constraints or combinatorial coverage can reduce it.
6. No duplicate cases that add no distinct coverage.
7. No test or product implementation during the design activity.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "TDD can decide the cases while coding" | Non-trivial case selection and product oracles should be reviewable before implementation encodes them. |
| "Happy path plus edge cases is enough" | "Edge case" is not a coverage model. Name partitions, boundaries, rules, or transitions. |
| "The expected result is obvious" | An uncited expected result can turn an assumption into permanent executable behavior. |
| "We should test every layer" | Use the lowest sufficient layer and add broader evidence only for a distinct risk. |
| "We should test every combination" | Apply constraints, pairwise reduction, and explicit high-risk combinations. |
| "Calling it E2E makes it comprehensive" | An execution layer does not prove systematic case coverage. |
| "A one-line fix does not need planning" | Use a four-field mini planner; small does not mean oracle-free. |

## Red Flags

- TDD begins a non-trivial change without a planner or explicit mini planner
- The planner mixes unit, API, contract, integration, and E2E into one generic bucket
- Expected results use phrases such as "works" or "fails correctly"
- A range boundary model omits a just-inside or just-outside point without explaining why
- A decision table ignores precedence or impossible combinations
- A state model covers only valid transitions
- Pairwise coverage is claimed without factors, constraints, or verification
- Accessibility claims exceed the evidence available at the selected layer
- The design writes test code, changes production code, or claims execution results

## Verification

Before handing the planner to TDD, verify:

- [ ] Test Analysis and Test Design are both present and not conflated
- [ ] Every expected result cites an authoritative oracle
- [ ] Layers, techniques, quality concerns, operating mode, and exit criteria remain distinct
- [ ] Every technique has its required coverage artifact
- [ ] Boundary models include just-outside, at, and just-inside points where meaningful
- [ ] Every case adds distinct, traceable coverage
- [ ] API, Contract, Frontend Integration, Backend Integration, and E2E are named precisely
- [ ] Assumptions, blocked cases, skipped layers, and residual risks are visible
- [ ] The first RED case and command handoff are actionable
- [ ] No test implementation or execution occurred during design
