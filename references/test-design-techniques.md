# Test Design Techniques

Operational reference for choosing test cases when coverage matters. This is a compact, paraphrased field guide inspired by Lee Copeland's *A Practitioner's Guide to Software Test Design*.

Use this reference from `test-case-design` when reviewing coverage gaps or deciding which behaviors deserve tests. It complements `testing-patterns.md`: this file chooses *what cases to test*; `testing-patterns.md` shows *how to write the tests* in common frameworks.

## Contents

- [Planning Decision Model](#planning-decision-model)
- [Case-Design Technique Selector](#case-design-technique-selector)
- [Basic Selection Patterns](#basic-selection-patterns)
- [Black Box Techniques](#black-box-techniques)
- [White Box Techniques](#white-box-techniques)
- [Operating Mode](#operating-mode)
- [Risk Heuristics](#risk-heuristics)
- [Exit Criteria](#exit-criteria)
- [Applying This To Test Planner](#applying-this-to-test-planner)

## Planning Decision Model

Keep four decisions separate:

| Decision | Question | Examples |
|---|---|---|
| Case-design technique | How will representative cases be derived? | boundary values, decision table, pairwise |
| Operating mode | How will learning and execution proceed? | scripted, exploratory, adaptive |
| Risk heuristic | What defect ideas might be missing? | taxonomy, historical defects, production incidents |
| Exit criteria | What evidence is enough to stop, and who accepts residual risk? | required gates, risk coverage, explicit owner acceptance |

These are orthogonal planning dimensions: they answer different questions, and a plan may use several of them together. Individual case-design techniques can also combine when each exposes a distinct risk; record the artifact produced by each one.

## Case-Design Technique Selector

| Testing need | Prefer | Good fit |
|---|---|---|
| One concrete behavior has no meaningful partitions or combinations | Direct example | a focused example, simple mapping, one invariant |
| A known defect must never recur | Regression reproduction | bug fixes, incident follow-up, escaped defects |
| Inputs can be grouped by expected behavior | Equivalence class testing | validators, parsers, form fields, API inputs |
| Defects likely near thresholds | Boundary value testing | min/max, dates, pagination, limits, feature flags |
| Many business rules combine conditions and outcomes | Decision table testing | pricing, eligibility, routing, permissions |
| Too many independent configuration combinations | Pairwise testing | browsers, devices, plans, locales, feature toggles |
| Behavior depends on current state and events | State-transition testing | workflows, protocols, auth/session, lifecycle states |
| Multiple numeric variables interact | Domain analysis testing | ranges constrained by other ranges, geometry, finance |
| A user or actor completes a goal | Use case testing | checkout, signup, onboarding, CRUD transaction paths |
| Code paths are complex | Control flow testing | branch-heavy logic, loops, exception paths |
| Variable lifecycle matters | Data flow testing | initialization, mutation, cleanup, cached values |

### Required Technique Artifacts

| Technique | Evidence that the technique was actually applied |
|---|---|
| Direct example | Concrete input/precondition, action, and expected result |
| Regression reproduction | Minimal reproducer and the expected RED failure reason |
| Equivalence classes | Named valid/invalid partitions and a representative from each |
| Boundary values | Named boundaries with below/at/above cases where meaningful |
| Decision table | Conditions, outcomes, reachable rules, and one case per rule |
| Pairwise | Factor/value model, generated case set, and pair-coverage evidence |
| State transition | States, events, transitions, actions, and important invalid transitions |
| Domain analysis | Dimensions, boundaries, inside/outside points, and intersections |
| Use case | Actor, goal, main path, and selected alternate/error paths |
| Control flow | Decisions/loops covered and observable outcomes asserted |
| Data flow | Important define-use paths and stale/uninitialized/cleanup risks |

Naming a technique without its artifact is not evidence that the technique shaped the tests.

## Basic Selection Patterns

### Direct Example

Use for one concrete behavior that has no useful partition, threshold, combination, or state model. Record the precondition or input, action, and expected observable result. Do not apply a more formal label merely to fill a planner field.

### Regression Reproduction

Use for a known defect. Preserve the smallest input and setup that reproduce it, state why the test must fail before the fix, then keep the case as permanent regression coverage. Add another technique only when it reveals additional cases beyond the reported defect.

## Black Box Techniques

### Equivalence Class Testing

Use when many inputs should be handled identically.

Steps:
1. Identify one input, field, API parameter, or condition.
2. Partition values into valid and invalid classes.
3. Pick at least one representative from each class.
4. Add explicit invalid-class cases; do not only test happy paths.
5. Re-check classes whenever validation rules change.

Watch for:
- Empty, missing, null, malformed, unsupported, duplicate, and unauthorized inputs.
- Hidden classes created by business policy, not just type constraints.
- Classes that look equivalent to users but are different to the system.

Layer mapping:
- Unit for pure validation or parsing.
- API for request validation, auth, status code, and error shape.
- Component/frontend integration for form behavior and visible error states.

### Boundary Value Testing

Use when behavior changes at edges.

Steps:
1. Identify each ordered range or threshold.
2. Test values just below, exactly at, and just above each boundary.
3. Include minimum, maximum, first, last, zero, negative, empty, and overflow cases where relevant.
4. For dates and times, test timezone, daylight saving, inclusive/exclusive end dates, and precision.

Watch for:
- Off-by-one errors.
- Inclusive vs exclusive boundaries.
- Boundary rules that differ between frontend and backend.

Layer mapping:
- Unit for algorithms and domain rules.
- API for backend validation boundaries.
- Contract when a boundary is part of a public schema or generated client.

### Decision Table Testing

Use when outcomes depend on combinations of conditions.

Steps:
1. List conditions as rows.
2. List actions or expected outcomes as rows.
3. Enumerate meaningful rules as columns.
4. Collapse impossible or irrelevant combinations only after naming why.
5. Create at least one test per rule that can fire.

Watch for:
- Default or fallback rule missing.
- Two rules overlap but produce different outcomes.
- Impossible combinations that become possible after a product change.

Layer mapping:
- Unit for pure business rule functions.
- API for endpoint-level policy decisions.
- Backend integration when the rule depends on persistence or external state.

### Pairwise Testing

Use when full Cartesian coverage is too expensive but independent factors may interact.

Steps:
1. Identify factors and values.
2. Remove values that are impossible or out of scope.
3. Generate a set that covers every pair of factor values.
4. Add extra high-risk triples or known-bad combinations manually.
5. Keep the factor/value model with the tests so future changes can update it.

Use a project-approved pairwise generator when available, or mechanically enumerate expected pairs and verify the proposed set covers them. Do not claim pair coverage from visual inspection alone; report an unverified proposal when no generator or coverage check was run.

Watch for:
- Pairwise is not enough when defects require three or more interacting factors.
- Invalid combinations can pollute the generated set.
- Risky combinations should be added even if pairwise generation omits them.

Layer mapping:
- Component/frontend integration for UI state matrices.
- API for endpoint parameter matrices.
- E2E only for a small number of critical cross-system combinations.

### State-Transition Testing

Use when the system remembers state and events must occur in valid order.

Steps:
1. Name all states.
2. Name events that trigger transitions.
3. Name actions or side effects for each transition.
4. Test each valid transition at least once.
5. Test invalid transitions from important states.
6. Add reset, retry, cancellation, timeout, and idempotency cases.

Watch for:
- Missing invalid-transition tests.
- State leakage between tests.
- Tests that start from impossible states without setup justification.

Layer mapping:
- Unit for reducers/state machines.
- Backend integration for persisted lifecycle state.
- E2E for critical user journeys through multiple states.

### Domain Analysis Testing

Use when multiple ordered variables interact and one variable constrains another.

Steps:
1. Identify dimensions and their valid ranges.
2. Identify boundaries across multiple dimensions.
3. Test on the boundary, just inside, and just outside each region.
4. Include intersections where two or more boundaries meet.

Watch for:
- Testing each variable alone when the bug is in the interaction.
- Missing precision and rounding issues.
- Validity regions that shift when configuration changes.

Layer mapping:
- Unit for mathematical/domain calculations.
- API for request combinations with cross-field validation.
- Backend integration when valid regions depend on stored data.

### Use Case Testing

Use when a user, actor, or system completes a goal through a transaction.

Steps:
1. Name the actor and goal.
2. Write the main success scenario.
3. Add alternate, error, cancel, timeout, and retry paths.
4. Identify required test data for each scenario.
5. Keep end-to-end coverage focused on critical paths; push smaller checks down to lower layers.

Watch for:
- Only testing the happy path.
- Ignoring test data setup cost.
- Putting every alternate path into E2E when API, frontend integration, or backend integration tests would prove it faster.

Layer mapping:
- Frontend integration for UI flow with mocked backend.
- API/backend integration for transaction rules and persistence.
- E2E for must-not-break business journeys.

## White Box Techniques

### Control Flow Testing

Use when code structure has meaningful branches, loops, or exception paths.

Steps:
1. Sketch the major branches and loops.
2. Cover each decision outcome.
3. Cover loop zero, one, many, and boundary iteration cases when relevant.
4. Use complexity as a signal: high branch count needs either more tests or simpler code.

Watch for:
- Chasing path exhaustiveness in complex code instead of refactoring.
- Missing error/exception paths.
- Tests coupled to internal structure rather than observable behavior.

### Data Flow Testing

Use when variable lifecycle can break behavior.

Steps:
1. Identify where important values are defined, updated, used, and cleared.
2. Test define-use paths that affect observable behavior.
3. Add cases for uninitialized, stale, overwritten, cached, or destroyed values.

Watch for:
- Shared mutable state between tests.
- Cache invalidation and cleanup paths.
- Variables that are set in one branch and read in another.

## Operating Mode

Operating mode describes how testing proceeds; it is not a case-design technique.

| Mode | Required artifact |
|---|---|
| Scripted | Repeatable cases, expected results, and traceability required by the project |
| Exploratory | Time-boxed charter, observations, defects, coverage notes, and follow-up candidates |
| Adaptive | Initial scripted scope plus recorded changes made from evidence discovered during testing |

### Scripted Testing

Use when predictability, auditability, and repeatability matter.

Good for:
- Compliance and regulated workflows.
- Regression suites with stable behavior.
- Teams that need handoff, traceability, or documented procedures.

Risk:
- Scripts can become stale and blind to new information.

### Exploratory Testing

Use when learning and test design must happen together.

Good for:
- New features with unknown risks.
- UI behavior, usability, and odd flows.
- Investigating suspicious behavior before writing permanent tests.

Rule:
- Preserve what you learn. Convert important discoveries into automated tests, bug reports, or updated charters.

### Adaptive Test Planning

Use scripted and exploratory testing together. Plan enough to guide effort, but update the plan as new information arrives.

Practical split:
- Scripted tests protect known critical behavior.
- Exploratory sessions discover unknown risks.
- Automated regression tests preserve important findings.

## Risk Heuristics

Risk heuristics suggest missing defect ideas; they do not select representative cases by themselves.

### Defect Taxonomies

Use taxonomies as idea generators and coverage audits, not as paperwork.

Ask:
- What input defects are common here?
- What state, timing, permission, data, environment, or integration defects are plausible?
- What defects has this team historically created?
- Which defect classes have no tests?

Typical categories:
- Interface/API contract
- Validation and boundary
- State and workflow
- Data persistence and migration
- Concurrency and timing
- Configuration and environment
- Security and authorization
- Performance and resource use
- Observability and diagnosability

## Exit Criteria

There is no universal stopping rule. Define required evidence and the owner who can accept residual risk before testing starts.

Evidence-based exit criteria can include:
- Required coverage goals are met.
- Critical and high-risk scenarios have passed.
- Defect discovery rate has dropped below an agreed threshold across comparable, sufficiently broad sessions.
- Remaining known risks are accepted by the right owner.
- The cost of more testing exceeds the likely value for this release.

Time or budget exhaustion is a forced stop, not a satisfied exit criterion. Report the result as `INCOMPLETE`, name what was not covered, document residual risk, and do not claim release readiness.

Never use "we ran a lot of tests" as an exit criterion. Name what was covered, what was not covered, and what risk remains.

## Applying This To Test Planner

Use the Test Planner to separate decisions:

- Test basis / oracle: the requirement, contract, incident evidence, invariant, or approved reference that determines the expected result; unresolved conflicts stay explicit.
- Changed surfaces: what code/data/API/UI changed.
- Affected contracts: public schemas, clients, events, or none.
- Primary layer: the lowest layer that provides sufficient evidence for the behavior.
- Case design technique: direct example, regression reproduction, equivalence, boundary, decision table, pairwise, state-transition, domain, use case, control flow, or data flow.
- Quality concerns: security, performance, visual regression, observability, migration safety, or none.
- Skipped layers and why: explicit risk tradeoff.
- Commands to run: existing project scripts.

The coverage model selects cases; a **Case Specification** makes each selected case implementable. Record a stable ID and name, description/objective, source/risk, layer, preconditions, exact test data, action or ordered steps, expected result/oracle, technique/coverage point, priority, and `READY` or `BLOCKED` status. Pair each meaningful step with its expected observation. Add cleanup for stateful cases. For equivalent data rows, share setup and actions once rather than duplicating prose, but ensure the shared procedure plus each row reconstructs a complete case.

For larger or release-oriented plans, add these only when they affect the decision:

- Operating mode: scripted, exploratory, or adaptive.
- Risk heuristics: defect taxonomy, historical defects, incidents, or none.
- Exit criteria: required evidence, forced-stop behavior, and residual-risk owner.

Example:

```markdown
Test Planner:
- Test basis / oracle: Checkout validation requirements and the unchanged public request contract
- Changed surfaces: Backend endpoint POST /checkout validation
- Affected contracts: Request schema unchanged
- Primary layer: API
- Case design technique: Equivalence classes + boundary values
- Quality concerns: Security/authorization
- Skipped layers and why: Contract unchanged; E2E too broad for validation rules
- Commands to run: npm run test:api -- checkout

Case Specification:
- ID / name: CHECKOUT-QTY-001 — Reject quantity below the minimum
- Description / objective: Prove the API rejects the first invalid lower-boundary value
- Source / risk: Checkout quantity requirement; off-by-one validation risk
- Layer: API
- Preconditions: Authenticated checkout request
- Test data: quantity = 0
- Action: POST /checkout with quantity 0
- Expected result / oracle: 422 validation response required by the checkout contract
- Technique / coverage: Boundary value, min - 1
- Priority / status: High / READY
```
