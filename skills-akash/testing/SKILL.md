---
name: testing
description: Testing rules — end-to-end tests the way users use the product, a test for every acceptance criterion, tests never weakened or skipped to pass, exercising the running app and not only its tests, concurrency and race-condition tests, canvas testing automation for the web client (to be figured out), performance testing deferred, and metrics tested. Load whenever you write, change, delete, or review a test, decide what to test for a task, hit a failing test, or the user says "make CI green", "add tests", or "verify it works".
---

# Testing

| ID | Rule |
| --- | --- |
| T1 | **End to end, the way users use the product.** |
| T2 | **Every acceptance criterion has a test; tests are never weakened (or skipped) to pass / to get green; the running app is exercised, not only its tests.** Every task has tests mapped to its acceptance criteria. |
| T3 | **Concurrency and race conditions** are tested. |
| T4 | **Canvas testing automation for the web client** (for the frontend agent): **to be figured out; say so when needed.** |
| T5 | **Performance testing: deferred** (for now). |
| T6 | Metrics are tested (bounded labels, emitted where required) — see `observability`. |
| T7 | Each commit is a verified behavior; tests land with the change, not after. |
| T8 | CI runs lint, type check, tests, build, and the milestone verification on every PR. |
| T9 | Test runner, lint, and format commands: project default; override when the service uses a different toolchain. |
| T10 | Code is testable by construction: injected dependencies, no inline `random()`/`time()` (`coding-standards`). |
| T11 | Until the backend is complete, the frontend tests against contract mocks and the backend returns labelled mock data for integration testing (`continuous-delivery`). |
| T12 | Tests run in the agent's own environment with its own DB snapshot/seed (`agent-environment-setup`). |

## When a test fails

1. The test is the specification of an acceptance criterion; fix the code, not the assertion (T2).
2. If the criterion itself is wrong, change the ticket first, then the test, and say so in the commit (`project-management` M3).
3. Never `skip`, `xfail`, loosen a matcher, or widen a timeout just to pass (T2).

## What "done" means

- Acceptance-criterion tests pass in CI (T2, T8).
- You ran the app (localhost / device) and used the feature as a user would (T1, T2).
- Race-prone paths (double submit, concurrent writes) have a test (T3).
- Anything deferred (canvas automation, perf) is stated on the ticket (T4, T5, `project-management` M3).
