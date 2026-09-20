---
name: test-driven-development
description: The testing skill, with rules T1–T12 — the red-green-refactor cycle (a failing test before the code), a reproduction test before a bug fix, the test pyramid, and end-to-end tests the way users use the product, one per acceptance criterion and per milestone outcome through the real entry points, tests never weakened or skipped to pass, the running app exercised and not only its tests, concurrency tested, tests landing with the change, in the agent's own environment against contract mocks until the backend lands. Use when implementing any logic, fixing any bug, changing any behavior, writing, changing, deleting, or reviewing a test, deciding what to test for a task, hitting a failing test, or when the user says "add tests", "make CI green", or "verify it works".
category: testing
---

# Test-Driven Development

## Overview

Write a failing test before writing the code that makes it pass; for a bug, reproduce it with a test before attempting a fix. Tests are proof, "seems right" is not done. Unit tests prove modules; end-to-end tests prove outcomes: every acceptance criterion and every milestone's usable outcome gets a test that a reviewer, the QA persona, or the user can run to confirm the claim, driven the way users use the product. The pyramid below governs how many tests of each kind exist; the rules govern what must be covered.

## When to Use

- Implementing any new logic or behavior; modifying existing functionality; adding edge-case handling.
- Fixing any bug (the Prove-It pattern).
- Writing, changing, deleting, or reviewing a test; deciding what to test for a task; hitting a failing test.
- A story's acceptance criterion or a milestone's usable outcome must be proven by driving the system as a user or a consuming service would.
- The user says "add tests", "make CI green", or "verify it works".
- NOT for pure configuration, documentation, or static content with no behavioral impact.
- NOT for runtime verification in a real browser: `browser-testing-with-devtools`.

## Rules

| ID | Rule |
| --- | --- |
| T1 | **End to end, the way users use the product.** An end-to-end test goes through the entry point a user or consuming service actually uses: HTTP API, CLI, UI, message queue; never internal modules. |
| T2 | **Every acceptance criterion has a test; tests are never weakened or skipped to pass; the running app is exercised, not only its tests.** |
| T3 | **Concurrency and race conditions are tested.** |
| T4 | **Canvas testing automation for the web client: to be figured out; say so on the ticket when needed.** |
| T5 | **Performance testing: deferred, and stated on the ticket when it would have applied.** |
| T6 | **Metrics are tested** (bounded labels, emitted where required). |
| T7 | **Each commit is a verified behavior; tests land with the change, not after.** |
| T8 | **CI runs lint, type check, tests, build, and the milestone verification on every PR.** |
| T9 | **Test runner, lint, and format commands are the project's own**; a service overrides them only when it uses a different toolchain. |
| T10 | **Code is testable by construction:** injected dependencies, no inline randomness or clock. |
| T11 | **Until the backend is complete, the frontend tests against contract mocks and the backend returns labelled mock data**. |
| T12 | **Tests run in the agent's own environment with its own DB snapshot or seed**. |

## Discover the Stack First

The TDD cycle is universal; the commands are not (T9). Before writing the first test, discover how *this* repository tests, and use its commands for every RED, GREEN, and verification step:

- **Language and build system** — `package.json`, `pom.xml`/`build.gradle`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `Gemfile`, a `Makefile`
- **Checked-in wrappers** — prefer `./gradlew`, `./mvnw`, `make test`, or a repo script over globally installed tools
- **Test framework and configuration** — and how it runs a single focused test vs the full suite
- **Existing conventions** — where tests live, how files are named, what patterns neighboring tests follow
- **Documented commands** — README, CONTRIBUTING, and CI workflows show the commands that actually gate merges

Run the repository's focused-test command during the loop and its full-suite command before completion. Never assume a default like `npm test`.

The examples below use TypeScript for illustration; the workflow is identical in any language once you've discovered the project's own tooling.

## The TDD Cycle

```
    RED                GREEN              REFACTOR
 Write a test    Write minimal code    Clean up the
 that fails  ──→  to make it pass  ──→  implementation  ──→  (repeat)
      │                  │                    │
      ▼                  ▼                    ▼
   Test FAILS        Test PASSES         Tests still PASS
```

### Step 1: RED — Write a Failing Test

Write the test first. It must fail. A test that passes immediately proves nothing.

```typescript
// RED: This test fails because createTask doesn't exist yet
describe('TaskService', () => {
  it('creates a task with title and default status', async () => {
    const task = await taskService.createTask({ title: 'Buy groceries' });

    expect(task.id).toBeDefined();
    expect(task.title).toBe('Buy groceries');
    expect(task.status).toBe('pending');
    expect(task.createdAt).toBeInstanceOf(Date);
  });
});
```

### Step 2: GREEN — Make It Pass

Write the minimum code to make the test pass. Don't over-engineer:

```typescript
// GREEN: Minimal implementation
export async function createTask(input: { title: string }): Promise<Task> {
  const task = {
    id: generateId(),
    title: input.title,
    status: 'pending' as const,
    createdAt: new Date(),
  };
  await db.tasks.insert(task);
  return task;
}
```

### Step 3: REFACTOR — Clean Up

With tests green, improve the code without changing behavior: extract shared logic, improve naming, remove duplication. Run tests after every refactor step to confirm nothing broke.

## The Prove-It Pattern (Bug Fixes)

When a bug is reported, **do not start by trying to fix it.** Start by writing a test that reproduces it.

```
Bug report arrives → write a test that demonstrates the bug → test FAILS (bug confirmed)
  → implement the fix → test PASSES (fix proven) → run the full suite (no regressions)
```

```typescript
// Bug: "Completing a task doesn't update the completedAt timestamp"

// Step 1: Write the reproduction test (it should FAIL)
it('sets completedAt when task is completed', async () => {
  const task = await taskService.createTask({ title: 'Test' });
  const completed = await taskService.completeTask(task.id);

  expect(completed.status).toBe('completed');
  expect(completed.completedAt).toBeInstanceOf(Date);  // This fails → bug confirmed
});

// Step 2: Fix the bug
export async function completeTask(id: string): Promise<Task> {
  return db.tasks.update(id, {
    status: 'completed',
    completedAt: new Date(),  // This was missing
  });
}

// Step 3: Test passes → bug fixed, regression guarded
```

For a complex bug, spawn a subagent to write the reproduction test without knowledge of the fix; the main agent verifies it fails, implements the fix, and verifies it passes.

## The Test Pyramid

Most tests are small and fast, with progressively fewer at higher levels:

```
          ╱╲
         ╱  ╲         E2E Tests (~5%)
        ╱    ╲        Full user flows, real entry points
       ╱──────╲
      ╱        ╲      Integration Tests (~15%)
     ╱          ╲     Component interactions, API boundaries
    ╱────────────╲
   ╱              ╲   Unit Tests (~80%)
  ╱                ╲  Pure logic, isolated, milliseconds each
 ╱──────────────────╲
```

The proportions govern volume, not coverage: however few end-to-end tests there are, every acceptance criterion and every milestone outcome has one (T2). **The Beyonce Rule:** if you liked it, you should have put a test on it. Infrastructure changes, refactoring, and migrations are not responsible for catching your bugs; your tests are.

### Test Sizes (Resource Model)

| Size | Constraints | Speed | Example |
|------|------------|-------|---------|
| **Small** | Single process, no I/O, no network, no database | Milliseconds | Pure function tests, data transforms |
| **Medium** | Multi-process OK, localhost only, no external services | Seconds | API tests with test DB, component tests |
| **Large** | Multi-machine OK, external services allowed | Minutes | E2E tests, performance benchmarks, staging integration |

### Decision Guide

```
Is it pure logic with no side effects?                 → Unit test (small)
Does it cross a boundary (API, database, file system)?  → Integration test (medium)
Is it an acceptance criterion or a milestone outcome?   → End-to-end test (large), through the real entry point
```

## End-to-end tests

1. **Pick the entry point** a user or consuming service actually uses (T1). Never call internals.
2. **Write the scenario** from the acceptance criterion: setup, action, observable result. One scenario per criterion (T2).
3. **Make it deterministic**: seeded fixtures, fake clocks, stubbed external providers behind the same interface production uses, isolated data per test (T10, T12).
4. **Assert on outcomes**, not implementation: response body and status, persisted state via the public read path, emitted events, rendered UI text.
5. **Make failures readable**: the assertion message names the criterion and prints the relevant response or state.
6. **Wire it into verification**: add the command to the milestone record and the service `docs/DEVELOPMENT.md` commands table; it must run locally and in CI (T8, T9).
7. **Run it before reporting**: paste the command and result into the report's Verified section.

```text
Scenario: <acceptance criterion, verbatim>
  Given <fixture / state>
  When  <action through the entry point>
  Then  <observable result>
  And   <persisted / emitted side effect, via public read path>
```

## When a test fails

1. The test is the specification of a behavior or an acceptance criterion; fix the code, not the assertion (T2).
2. If the criterion itself is wrong, change the ticket first, then the test, and say so in the commit.
3. Never `skip`, `xfail`, loosen a matcher, or widen a timeout just to pass (T2).

## Writing Good Tests

### Test State, Not Interactions

Assert on the *outcome* of an operation, not on which methods were called internally. Tests that verify method call sequences break when you refactor, even if the behavior is unchanged.

```typescript
// Good: Tests what the function does (state-based)
it('returns tasks sorted by creation date, newest first', async () => {
  const tasks = await listTasks({ sortBy: 'createdAt', sortOrder: 'desc' });
  expect(tasks[0].createdAt.getTime())
    .toBeGreaterThan(tasks[1].createdAt.getTime());
});

// Bad: Tests how the function works internally (interaction-based)
it('calls db.query with ORDER BY created_at DESC', async () => {
  await listTasks({ sortBy: 'createdAt', sortOrder: 'desc' });
  expect(db.query).toHaveBeenCalledWith(
    expect.stringContaining('ORDER BY created_at DESC')
  );
});
```

### DAMP Over DRY in Tests

In production code, DRY is usually right. In tests, **DAMP (Descriptive And Meaningful Phrases)** is better: a test reads like a specification and tells a complete story without tracing through shared helpers. Duplication in tests is acceptable when it makes each test independently understandable.

### Prefer Real Implementations Over Mocks

```
Preference order (most to least preferred):
1. Real implementation  → Highest confidence, catches real bugs
2. Fake                 → In-memory version of a dependency (e.g., fake DB)
3. Stub                 → Returns canned data, no behavior
4. Mock (interaction)   → Verifies method calls — use sparingly
```

**Use mocks only when** the real implementation is too slow, non-deterministic, or has side effects you can't control (external APIs, email sending). Over-mocking creates tests that pass while production breaks.

### Arrange, Act, Assert; One Assertion Per Concept; Descriptive Names

```typescript
describe('TaskService.completeTask', () => {
  it('sets status to completed and records timestamp', () => {
    // Arrange
    const task = createTask({ title: 'Test' });
    // Act
    const completed = completeTask(task.id);
    // Assert
    expect(completed.status).toBe('completed');
  });
  it('throws NotFoundError for non-existent task', ...);
  it('is idempotent — completing an already-completed task is a no-op', ...);
});

// Bad: one test for everything, named "works" or "handles errors"
```

## Test Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Testing implementation details | Tests break when refactoring even if behavior is unchanged | Test inputs and outputs, not internal structure |
| Flaky tests (timing, order-dependent) | Erode trust in the test suite | Deterministic assertions, isolated test state |
| Testing framework code | Wastes time testing third-party behavior | Only test YOUR code |
| Snapshot abuse | Large snapshots nobody reviews, break on any change | Use snapshots sparingly and review every change |
| No test isolation | Tests pass individually but fail together | Each test sets up and tears down its own state |
| Mocking everything | Tests pass but production breaks | Real implementations > fakes > stubs > mocks; mock only at slow or non-deterministic boundaries |
| Shared mutable fixtures between scenarios | One scenario's state leaks into another | Isolated data per scenario (T12) |

## Browser verification

Runtime verification in a real browser (DOM, console, network, screenshots) is the web agent's `browser-testing-with-devtools`; it complements the tests here, it does not replace them.

## See Also

For JavaScript/TypeScript testing patterns illustrating these principles — Jest, React Testing Library, Supertest, Playwright — see `../../references/testing-patterns.md`. The principles transfer to any ecosystem; the syntax and tools there are JS/TS-specific.

## Interaction with other skills

- `browser-testing-with-devtools` is the web agent's runtime verification in a real browser; it complements these tests, it does not replace them.
- `development-setup` provides the environment and the contract mocks tests run against; `coding-standards` makes code testable by construction; `observability-and-instrumentation` defines the metrics T6 tests.
- `linear` is where a wrong acceptance criterion is corrected before its test changes.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "I'll write tests after the code works" | You won't. And tests written after the fact test implementation, not behavior. Tests land with the change (T7). |
| "This is too simple to test" | Simple code gets complicated. The test documents the expected behavior. |
| "Tests slow me down" | Tests slow you down now. They speed you up every time you change the code later. |
| "I tested it manually" | Manual testing doesn't persist. Tomorrow's change might break it with no way to know. |
| "Unit tests cover it." | They cover the pieces. The outcome is the integration of the pieces; every acceptance criterion gets an end-to-end test (T1, T2). |
| "The tests pass, no need to run the app." | The running app is exercised, not only its tests (T2). |
| "Loosening the matcher gets CI green faster." | Tests are never weakened or skipped to pass; fix the code, not the assertion (T2). |
| "Race conditions are too hard to test." | Concurrency and race conditions are tested (T3). |
| "I'll hit the real external API." | Then the test is flaky and costs money. Stub behind the production interface. |
| "Asserting on the DB row directly is easier." | It couples the test to storage. Read through the public path the product uses. |
| "It's slow, we'll run it sometimes." | A test that does not run in verification proves nothing. Keep it fast by scoping, not by skipping. |
| "It's just a prototype" | Prototypes become production code. Tests from day one prevent the test-debt crisis. |
| "Let me run the tests again just to be extra sure" | After a clean run, repeating the same command adds nothing unless the code has changed since. |

## Red Flags

- Writing code without any corresponding tests; a commit whose tests arrive in a later commit (T7).
- Reaching for a default test command (`npm test`) without checking what this repository actually uses (T9).
- Tests that pass on the first run; "all tests pass" but no tests were actually run.
- Bug fixes without reproduction tests.
- An acceptance criterion with no test mapped to it; a milestone marked verified with no runnable end-to-end command (T2).
- An end-to-end test that imports internal modules, or asserts on private fields and internal calls (T1).
- A `skip`, `xfail`, loosened matcher, or widened timeout added to get green (T2).
- Tests that test framework behavior; test names that don't describe the expected behavior.
- Canvas automation or performance testing silently omitted instead of stated as deferred on the ticket (T4, T5).
- Running the same test command twice in a row without any intervening code change.

## Verification

After completing any implementation:

- [ ] Every new behavior has a test; every acceptance criterion has an end-to-end test through the real entry point (T1, T2).
- [ ] Bug fixes include a reproduction test that failed before the fix.
- [ ] The full suite passes, run with the repository's own command (T9); acceptance-criterion tests pass in CI (T8).
- [ ] You ran the app (localhost or device) and used the feature as a user would (T2).
- [ ] Race-prone paths (double submit, concurrent writes) have a test (T3).
- [ ] No tests were skipped, disabled, or weakened to pass (T2); tests are deterministic across three consecutive runs.
- [ ] The end-to-end command is in the milestone record and the report's Verified section quotes the command and result.
- [ ] Anything deferred (canvas automation, performance) is stated on the ticket (T4, T5).
