---
name: safe-refactoring
description: Guides structured, low-risk refactoring of existing code. Use when improving structure, renaming, extracting modules, or migrating internal APIs without changing intended behavior.
---

# Safe Refactoring

## Overview

Refactoring changes structure, not behavior. The fastest way to create bugs is to mix refactors with feature work or to refactor without a safety net. Keep steps small, verify continuously, and prefer mechanical transformations you can trust.

## When to Use

- Cleaning up messy modules before adding features
- Renaming, extracting functions/classes, splitting files
- Improving boundaries without changing external behavior
- Preparing a codebase for a larger change
- Reviewing a PR that claims to be "refactor only"

**Not for:** intentional behavior changes, performance rewrites without measurements, or greenfield design (use planning/spec skills).

## Core Principles

### 1. Behavior-preserving by default

If behavior must change, that is a separate commit/PR from structural cleanup.

### 2. Safety net first

- Prefer existing tests; add characterization tests when coverage is thin on the touched path.
- Use typecheckers and linters as additional nets.
- Refactor in a branch you can diff cleanly.

### 3. One transformation at a time

Examples of single steps: rename symbol, extract function, move file, inline temp, replace conditional with polymorphism. Do not combine five structural ideas in one hop.

### 4. Keep the system runnable

After each step, tests pass and the app still boots. Dead code removal comes after replacements work.

### 5. Prefer IDE/mechanical tooling

Automated renames and move-symbol tools beat hand edits for wide changes.

### 6. Leave seams, don't invent architecture mid-refactor

Improve the current design in increments. Large architectural shifts need an explicit plan and often dual-running seams.

## Recommended Sequence

1. Identify the seam and the intended end state (one paragraph).
2. Ensure tests or characterization coverage on the path.
3. Apply one mechanical transform.
4. Run tests / typecheck.
5. Repeat until the structure matches the goal.
6. Only then implement the feature or behavior change that needed the refactor.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "While I'm here I'll also fix this behavior" | That mixes concerns and makes failures ambiguous. Separate commits. |
| "No tests, but it's a simple rename" | Simple renames break stringly-typed reflection, configs, and serializers. |
| "Big bang rewrite is faster" | Almost never for working systems. Incremental wins. |
| "I'll delete the old path immediately" | Prefer temporary dual paths when callers are widespread. |

## Red Flags

- Refactor PR that also changes product behavior
- Wide renames without test or typecheck runs
- "Cleanup" that rewrites logic subtly
- No clear before/after structural goal
- Mixing formatting, dependency bumps, and logic moves in one change set

## Verification

- [ ] Stated goal is structural, not behavioral
- [ ] Tests/typecheck pass after each significant step
- [ ] Diff is reviewable (small, focused transforms)
- [ ] Behavior-preserving claim is credible from the diff
- [ ] Follow-up behavior change is separated if any
