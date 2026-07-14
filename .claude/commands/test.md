---
description: Write tests and implement test-first — use RED-GREEN-REFACTOR or the Prove-It bug-fix pattern
---

Invoke the agent-skills:test-driven-development skill.

If the request is only to execute or summarize existing tests, invoke the agent-skills:tests skill instead and stop this implementation workflow. Do not edit code for a run-only request.

For a non-trivial change or uncertain coverage, invoke the `test-engineer` persona once when available to produce the initial coverage analysis and Test Planner. Keep implementation and execution in the main context. Otherwise, produce the planner directly.

Before writing tests:
0. Produce a Test Planner with test basis/oracle, changed surfaces, affected contracts, primary layer, adjacent layers, case-design technique, quality concerns, skipped layers with reasons, and existing commands to run.

For new features:
1. Write tests that describe the expected behavior (they should FAIL)
2. Implement the code to make them pass
3. Refactor while keeping tests green

For bug fixes (Prove-It pattern):
1. Write a test that reproduces the bug (must FAIL)
2. Confirm the test fails
3. Implement the fix
4. Confirm the test passes
5. Run the affected suites and project-required regression gates using discovered commands

For browser-related issues, also invoke agent-skills:browser-testing-with-devtools to verify with Chrome DevTools MCP.
