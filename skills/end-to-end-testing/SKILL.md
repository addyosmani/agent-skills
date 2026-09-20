---
name: end-to-end-testing
description: Testing rules — end-to-end tests the way users use the product, a test for every acceptance criterion, tests never weakened or skipped to pass, exercising the running app and not only its tests, concurrency and race-condition tests, canvas testing automation for the web client (to be figured out), performance testing deferred, and metrics tested; writes and runs end-to-end tests that exercise a user-observable outcome through the real entry points of the system, with deterministic fixtures and clear failure output. Use when you write, change, delete, or review a test, decide what to test for a task, hit a failing test, or the user says "make CI green", "add tests", or "verify it works", or when a milestone's usable outcome or a story's acceptance criterion can only be proven by driving the system as a user or a consuming service would.
category: testing
---

# End-to-End Testing

## Overview

**End to end, the way users use the product** (T1). Unit tests prove modules; end-to-end tests prove outcomes. Each milestone's usable outcome gets at least one end-to-end test that a reviewer, QA persona, or the user can run to confirm the claim.

## When to Use

- You write, change, delete, or review a test.
- You decide what to test for a task.
- You hit a failing test.
- The user says "make CI green", "add tests", or "verify it works".
- A story's acceptance criterion describes user-visible behavior across layers.
- A milestone verification command needs to prove the usable outcome.
- A bug escaped unit tests because it lived between components.
- NOT as a replacement for unit and contract tests; use the `test-driven-development` skill for those.
- NOT for exhaustive input coverage; that belongs in unit tests.

## Rules

| ID | Rule |
| --- | --- |
| T1 | **End to end, the way users use the product.** |
| T2 | **Every acceptance criterion has a test; tests are never weakened (or skipped) to pass / to get green; the running app is exercised, not only its tests.** Every task has tests mapped to its acceptance criteria. |
| T3 | **Concurrency and race conditions** are tested. |
| T4 | **Canvas testing automation for the web client** (for the frontend agent): **to be figured out; say so when needed.** |
| T5 | **Performance testing: deferred** (for now). |
| T6 | Metrics are tested (bounded labels, emitted where required) — see `observability-and-instrumentation`. |
| T7 | Each commit is a verified behavior; tests land with the change, not after. |
| T8 | CI runs lint, type check, tests, build, and the milestone verification on every PR. |
| T9 | Test runner, lint, and format commands: project default; override when the service uses a different toolchain. |
| T10 | Code is testable by construction: injected dependencies, no inline `random()`/`time()` (`coding-standards`). |
| T11 | Until the backend is complete, the frontend tests against contract mocks and the backend returns labelled mock data for integration testing (`continuous-delivery`). |
| T12 | Tests run in the agent's own environment with its own DB snapshot/seed (`agent-environment-setup`). |

## Process

1. **Pick the entry point** a user or consuming service actually uses: HTTP API, CLI, UI, message queue. Never call internals (T1).
2. **Write the scenario** from the acceptance criterion: setup, action, observable result. One scenario per criterion (T2).
3. **Make it deterministic**: seeded fixtures, fake clocks, stubbed external providers behind the same interface production uses, isolated data per test (T10, T12).
4. **Assert on outcomes**, not implementation: response body and status, persisted state via the public read path, emitted events, rendered UI text.
5. **Make failures readable**: the assertion message names the criterion and prints the relevant response or state.
6. **Wire it into verification**: add the command to the milestone record and the service `docs/DEVELOPMENT.md` commands table; it must run locally and in CI (T8, T9).
7. **Run it before reporting**: paste the command and result into the report's Verified section.

## Scenario template

```text
Scenario: <acceptance criterion, verbatim>
  Given <fixture / state>
  When  <action through the entry point>
  Then  <observable result>
  And   <persisted / emitted side effect, via public read path>
```

## When a test fails

1. The test is the specification of an acceptance criterion; fix the code, not the assertion (T2).
2. If the criterion itself is wrong, change the ticket first, then the test, and say so in the commit (`project-management` M3).
3. Never `skip`, `xfail`, loosen a matcher, or widen a timeout just to pass (T2).

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Unit tests cover it." | They cover the pieces. The outcome is the integration of the pieces. |
| "The tests pass, no need to run the app." | The running app is exercised, not only its tests (T2). |
| "It's slow, we'll run it sometimes." | A test that does not run in verification proves nothing. Keep it fast by scoping, not by skipping. |
| "Loosening the matcher gets CI green faster." | Tests are never weakened or skipped to pass; fix the code, not the assertion (T2). |
| "I'll add the tests in a follow-up commit." | Each commit is a verified behavior; tests land with the change, not after (T7). |
| "Race conditions are too hard to test." | Concurrency and race conditions are tested (T3). |
| "I'll hit the real external API." | Then the test is flaky and costs money. Stub behind the production interface. |
| "Asserting on the DB row directly is easier." | It couples the test to storage. Read through the public path the product uses. |

## Red Flags

- An end-to-end test that imports internal modules.
- A `skip`, `xfail`, loosened matcher, or widened timeout added to get green (T2).
- An acceptance criterion with no test mapped to it (T2).
- A commit whose tests arrive in a later commit (T7).
- Shared mutable fixtures between scenarios.
- A milestone marked verified with no runnable end-to-end command.
- Assertions on implementation details (private fields, internal calls).
- Canvas automation or performance testing silently omitted instead of stated as deferred on the ticket (T4, T5).

## Verification

What "done" means:

- [ ] Acceptance-criterion tests pass in CI (T2, T8).
- [ ] You ran the app (localhost / device) and used the feature as a user would (T1, T2).
- [ ] Race-prone paths (double submit, concurrent writes) have a test (T3).
- [ ] Anything deferred (canvas automation, perf) is stated on the ticket (T4, T5, `project-management` M3).
- [ ] Tests are deterministic across three consecutive runs.
- [ ] The command is in the milestone record and runs in CI.
- [ ] The report's Verified section quotes the command and result.
