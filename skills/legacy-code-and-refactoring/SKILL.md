---
name: legacy-code-and-refactoring
description: Guides safe changes to legacy code — code without tests, documentation, or anyone who remembers why it works. Use when modifying code that has no test coverage. Use when a change requires refactoring first but there's no safety net. Use when inheriting an unfamiliar codebase and the first instinct is "rewrite it".
---

# Legacy Code and Refactoring

## Overview

Legacy code is code without tests — regardless of its age. Without tests, you cannot know whether a change preserves behavior, so every edit is a gamble. This skill turns that gamble into a process: pin down current behavior first, create the seams that make the code testable, then change it in small, separately-verified steps. The cardinal rule: **never refactor and change behavior in the same step.**

## When to Use

- Modifying code that has no test coverage
- Fixing a bug in code you don't fully understand
- The task is "add feature X" but the surrounding code resists change
- Inheriting a codebase and deciding between refactor and rewrite
- Any time you catch yourself thinking "I'll just carefully edit it and hope"

**NOT for:**
- Code that is already tested and readable but over-complex — use the `code-simplification` skill
- Removing or sunsetting an entire system — use the `deprecation-and-migration` skill
- Diagnosing an active failure — use the `debugging-and-error-recovery` skill first; come back here for the fix

## Core Process

### 1. Understand before touching

Read the code and its history before editing a line:

```bash
git log --follow -20 -- path/to/file.js        # why did it change before?
git log -S "functionName" --oneline            # who calls/changed this logic?
grep -rn "functionName" --include="*.js" .     # blast radius: every caller
```

Apply Chesterton's Fence (see `code-simplification`): if you can't explain why a weird branch exists, you're not ready to delete it. Write down what you believe the code does — that belief becomes the first characterization test. For non-trivial uncertainty, run the `doubt-driven-development` skill on your reading of the code.

### 2. Pin current behavior with characterization tests

A characterization test asserts what the code **does**, not what it should do. Bugs included — today's callers may depend on them (Hyrum's Law, see `api-and-interface-design`).

```typescript
// You don't know what calculateDiscount returns for edge cases? Ask it.
test.each([
  [0, 0],
  [100, 5],
  [-50, -2.5],     // negative input "works" — pin it, flag it, don't fix it yet
  [NaN, NaN],      // surprising? Capture reality, note the question for later
])('calculateDiscount(%p) currently returns %p', (input, current) => {
  expect(calculateDiscount(input)).toBe(current);
});
```

Workflow: write the assertion with a deliberately wrong expected value → run it → copy the actual value into the test. The test suite is done when it fails if you break anything you care about. For functions with large or messy output (reports, HTML, generated files), snapshot the entire output once — a golden master — and diff against it on every change.

If you find a real bug while characterizing: pin the buggy behavior, file it, and fix it **after** the refactor, in its own commit with its own failing-test-first (`test-driven-development`).

### 3. Create a seam if the code won't go into a harness

Most legacy code can't be tested because it constructs its own dependencies — database, clock, network — deep inside. A seam is a place where you can substitute behavior without editing the logic you're trying to test. The smallest safe ones:

```typescript
// BEFORE: untestable — hidden dependencies
function generateInvoice(orderId: string) {
  const order = db.orders.find(orderId);          // real DB
  const issuedAt = new Date();                    // real clock
  /* 200 lines of pricing logic */
}

// AFTER: parameterize the dependencies, default to the old behavior.
// Existing callers unchanged; tests inject fakes.
function generateInvoice(
  orderId: string,
  deps = { findOrder: (id: string) => db.orders.find(id), now: () => new Date() },
) {
  const order = deps.findOrder(orderId);
  const issuedAt = deps.now();
  /* the 200 lines stay byte-identical */
}
```

For new logic that must live inside an untestable monster function, use **sprout**: write the new logic as a fresh, fully tested function, and add a single call to it from the legacy code. The untested surface doesn't grow.

### 4. Refactor and change behavior in separate commits

This is the rule everything else serves:

```
Commit 1: refactor   — extract function, rename, introduce seam.
                       Characterization tests pass UNCHANGED.
Commit 2: behavior   — the bug fix or feature.
                       One test changes/appears, and it changed first (red → green).
```

If a "refactor" commit requires editing a test expectation, it wasn't a refactor — stop and split it. Mixed commits are unreviewable (`code-review-and-quality` can't tell intended change from accident) and unbisectable. Keep each commit independently green (`git-workflow-and-versioning`).

### 5. Choose strangler fig over rewrite

For replacing a whole module or system, don't big-bang rewrite. Route through an interface and replace incrementally:

```
1. Put a facade in front of the legacy module (callers now hit the facade)
2. Implement one slice of behavior in the new code
3. Route that slice to the new path — feature-flagged, with a kill switch
4. Compare outputs in production (run both, log diffs) until confidence is earned
5. Repeat per slice; delete legacy code as each slice proves out (deprecation-and-migration)
```

Each step ships (`incremental-implementation`), each step is reversible, and the system never stops working. A rewrite that takes six months delivers nothing for six months and re-discovers every edge case the old code already handled.

### 6. Leave it better — within scope

Apply the boy-scout rule at the scale of the task: the code you touched ends up tested and slightly clearer. Do **not** expand into adjacent cleanup — scope discipline (see `using-agent-skills` core behaviors) applies doubly in legacy code, where every extra touched line is extra risk. Note follow-ups; don't do them now.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "It's a one-line change, I don't need tests first" | One line in untested code is where regressions live. The characterization test for that path costs ten minutes; the production incident costs days. |
| "Writing tests for bad code legitimizes it" | Characterization tests legitimize nothing — they're scaffolding that makes the bad code safe to change. Delete or rewrite them when the refactor is done. |
| "This code is impossible to test" | It's untestable *as is*. That's what seams are for — parameterize one dependency and the harness fits. "Impossible" usually means "I haven't found the seam yet". |
| "Faster to rewrite it from scratch" | The mess encodes years of edge cases you can't see. A rewrite rediscovers them one production incident at a time. Strangler fig gets you the new code without the amnesia. |
| "I'll fix this bug while I'm refactoring anyway" | Now your diff has two kinds of change and the reviewer can't tell which differences are intended. Two commits: refactor green, then fix red→green. |
| "Nobody depends on this weird behavior" | Hyrum's Law: with enough users, someone depends on every observable behavior — including the bug. Pin it first, change it deliberately, with a migration note. |
| "While I'm here, I'll clean up the whole file" | Every touched line is risk and review burden. Surgical precision: the task's scope, tested, nothing more. |

## Red Flags

- Editing untested code with no characterization test written first
- A "refactor" commit where test expectations changed
- A diff that mixes renames/extractions with logic changes
- "Improved" behavior shipped silently because the old behavior "was obviously wrong"
- A rewrite branch alive for weeks while the legacy system keeps evolving
- Tests written *after* the change, asserting whatever the new code happens to do
- Growing an already-untestable function instead of sprouting tested code beside it
- Cleanup commits touching files the task never required

## Verification

After changing legacy code, confirm:

- [ ] Characterization tests existed and passed **before** the first behavioral change
- [ ] Refactoring commits and behavior-change commits are separate, each independently green
- [ ] Any behavior change has a test that failed first (red → green evidence)
- [ ] Bugs discovered during characterization were pinned and filed, not silently fixed
- [ ] Every touched code path is covered by a test that fails if it breaks
- [ ] No changes outside the task's scope (diff reviewed for accidental cleanup)
- [ ] For strangler-fig work: old and new paths compared on real traffic, kill switch tested
