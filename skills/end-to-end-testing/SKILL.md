---
name: end-to-end-testing
description: Writes and runs end-to-end tests that exercise a user-observable outcome through the real entry points of the system, with deterministic fixtures and clear failure output. Use when a milestone's usable outcome or a story's acceptance criterion can only be proven by driving the system as a user or a consuming service would.
category: testing
---

# End-to-End Testing

## Overview

Unit tests prove modules; end-to-end tests prove outcomes. Each milestone's usable outcome gets at least one end-to-end test that a reviewer, QA persona, or the user can run to confirm the claim.

## When to Use

- A story's acceptance criterion describes user-visible behavior across layers.
- A milestone verification command needs to prove the usable outcome.
- A bug escaped unit tests because it lived between components.
- NOT as a replacement for unit and contract tests; use the `test-driven-development` skill for those.
- NOT for exhaustive input coverage; that belongs in unit tests.

## Process

1. **Pick the entry point** a user or consuming service actually uses: HTTP API, CLI, UI, message queue. Never call internals.
2. **Write the scenario** from the acceptance criterion: setup, action, observable result. One scenario per criterion.
3. **Make it deterministic**: seeded fixtures, fake clocks, stubbed external providers behind the same interface production uses, isolated data per test.
4. **Assert on outcomes**, not implementation: response body and status, persisted state via the public read path, emitted events, rendered UI text.
5. **Make failures readable**: the assertion message names the criterion and prints the relevant response or state.
6. **Wire it into verification**: add the command to the milestone record and the service `CONVENTIONS.md` commands table; it must run locally and in CI.
7. **Run it before reporting**: paste the command and result into the report's Verified section.

## Scenario template

```text
Scenario: <acceptance criterion, verbatim>
  Given <fixture / state>
  When  <action through the entry point>
  Then  <observable result>
  And   <persisted / emitted side effect, via public read path>
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Unit tests cover it." | They cover the pieces. The outcome is the integration of the pieces. |
| "It's slow, we'll run it sometimes." | A test that does not run in verification proves nothing. Keep it fast by scoping, not by skipping. |
| "I'll hit the real external API." | Then the test is flaky and costs money. Stub behind the production interface. |
| "Asserting on the DB row directly is easier." | It couples the test to storage. Read through the public path the product uses. |

## Red Flags

- An end-to-end test that imports internal modules.
- Shared mutable fixtures between scenarios.
- A milestone marked verified with no runnable end-to-end command.
- Assertions on implementation details (private fields, internal calls).

## Verification

- [ ] Every acceptance criterion with user-visible behavior has one scenario.
- [ ] Tests are deterministic across three consecutive runs.
- [ ] The command is in the milestone record and runs in CI.
- [ ] The report's Verified section quotes the command and result.
