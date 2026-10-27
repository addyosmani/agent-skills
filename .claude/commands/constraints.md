---
description: Define and enforce this project's quality bar — interview, sane defaults, CONSTRAINTS.md
disable-model-invocation: true
---

Invoke the agent-skills:constraint-driven-development skill.

$ARGUMENTS

Default behaviour with no arguments: set up constraints for this repository.

1. **Detect first.** Read package.json / pyproject.toml / go.mod, the test runner, existing lint configs, current coverage output, CI workflows, and the agent harness in use. Report what you found, then choose the smallest set of durable enforcement rules that fit the repo.

2. **Interview, at most four questions.** One at a time, each with your best guess and a usable default so "I don't know" still produces a working config:
   - Which dimensions beyond the floor (coverage, security, performance, accessibility, architecture)
   - Block or warn when a check fails mid-task
   - Target numbers, or measure today's values and hold them
   - Slowest check tolerated before handing work back

3. **Write CONSTRAINTS.md** at the repo root with a Floor section, enforced numbers, measured-only metrics with today's values, and an exceptions table with owners and expiry dates. Every number must be justified by the repo's current measured baseline or a clear product requirement.

4. **Install what each picked dimension needs.** A dimension with a number and no tool behind it is an aspiration. Use the de facto tool so existing config keeps working: Semgrep for code scanning, ESLint/Prettier/ruff/black for format/lint, pytest/vitest/jest for unit tests, and whatever the repo already uses for coverage.

5. **Place each check by cost.** Types, lint and secrets in the edit loop (seconds). Related tests and changed-line coverage at task end (under 90s). Everything else at review or in CI. Scope checks around the changed files whenever possible.

6. **Point the agent at it.** Add a line to CLAUDE.md telling agents to read CONSTRAINTS.md and never weaken it to make a change pass.

7. **Verify.** Run the constraints against the current branch. If anything fails that the user disagrees with, fix the constraint now rather than leaving a gate people will learn to ignore.

Sub-commands:
- `/constraints check` — run the current constraints against this branch and report
- `/constraints guard` — inspect the diff for a weakened bar: lowered thresholds, skipped or deleted tests, new suppression comments, unfinished stubs, new exceptions
- `/constraints ratchet` — record today's measured values as the floor that must not fall
