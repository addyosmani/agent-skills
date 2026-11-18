# Code Review Checklists

Multi-axis review checklists and deep-dive inspection guides for the `code-review-and-quality` skill. This file provides self-contained checklists for standalone installations of the skill.

For whole-repository installations with shared checklists, repo-wide references also live in `../../../references/security-checklist.md` and `../../../references/performance-checklist.md`.

## Table of Contents

- [1. Correctness and Edge-Case Checklist](#1-correctness-and-edge-case-checklist)
- [2. Readability and Simplicity Checklist](#2-readability-and-simplicity-checklist)
- [3. Architecture and System Boundaries Checklist](#3-architecture-and-system-boundaries-checklist)
- [4. Security Review Checklist](#4-security-review-checklist)
- [5. Performance Review Checklist](#5-performance-review-checklist)
- [Specialized Review Workflows](#specialized-review-workflows)
  - [Dependency Upgrade Review](#dependency-upgrade-review)
  - [Bug Fix and Regression Test Review](#bug-fix-and-regression-test-review)
  - [Refactoring and Structural Changes](#refactoring-and-structural-changes)
- [Review Output Templates](#review-output-templates)
  - [Inline Finding Format](#inline-finding-format)
  - [PR Review Summary Template](#pr-review-summary-template)

---

## 1. Correctness and Edge-Case Checklist

Verify that the code does exactly what it specifies, under both ordinary and adverse inputs:

- [ ] **Boundary values:** Check 0, -1, empty string, empty array, maximum allowed integer, and strings exceeding expected lengths.
- [ ] **Null and undefined handling:** Confirm optional fields are guarded; verify that falsy values (`0`, `false`, `""`) are not accidentally treated as missing when they are valid values.
- [ ] **Asynchronous ordering:** Check for missing `await` statements, unhandled promise rejections, and floating promises that detach error handling from caller scope.
- [ ] **Concurrency and race conditions:** In concurrent or event-driven contexts, check whether multiple calls mutate shared state out of order.
- [ ] **Error classification and propagation:** Errors should be caught at system boundaries, wrapped with context, and never swallowed with empty catch blocks.
- [ ] **State cleanup:** Ensure temp files, database transactions, timeouts, and network connections are reliably cleaned up in `finally` blocks or resource guards.
- [ ] **Mutation verification:** Invert a conditional branch in the new logic and confirm that an automated test fails. If tests pass despite inverted logic, coverage is illusory.

---

## 2. Readability and Simplicity Checklist

Confirm that an unfamiliar engineer or agent can read, debug, and maintain the change:

- [ ] **Self-documenting naming:** Variables, functions, and parameters describe domain intent. No cryptic abbreviations or ambiguous names (`data`, `val`, `temp`, `res`).
- [ ] **Linear control flow:** Avoid deeply nested `if`/`else` trees and nested ternaries. Prefer early returns and guard clauses (keep indentation depth under 3 levels).
- [ ] **No dead code:** Ensure no unreferenced exports, commented-out code blocks, leftover debug statements (`console.log`, `println`), or placeholder functions exist.
- [ ] **Abstraction justification:** Adhere to the rule of three. Do not introduce a generic abstraction for a single use case. Prefer duplicated straightforward code over premature indirection.
- [ ] **No tangled paths:** Check that a new condition is not bolted onto an unrelated execution flow. If unrelated responsibilities meet in one function, factor them into distinct helpers.
- [ ] **Healthy file boundaries:** Check whether the change pushes a file over reasonable size boundaries (e.g. ~1000 lines). If a file is already large, decompose helpers before appending more code.

---

## 3. Architecture and System Boundaries Checklist

Evaluate system cohesion, coupling, and modularity:

- [ ] **Clean module boundaries:** Feature-specific logic must not leak into shared libraries or generic utilities. Shared packages should have no reverse dependencies on calling features.
- [ ] **Canonical helper reuse:** Check whether the codebase already provides a canonical helper for this operation. Avoid near-duplicate utility functions.
- [ ] **Explicit invariants:** Replace ambiguous `any`, loose casting, or silent fallback defaults with explicit type constraints that validate data shapes at the boundary.
- [ ] **Complexity reduction vs. relocation:** Confirm that a refactor eliminates branches or simplifies state transitions rather than merely shifting the same branching logic into another file.
- [ ] **Single direction of dependencies:** High-level policies must not directly depend on low-level implementation details or transient UI states.

---

## 4. Security Review Checklist

Ensure that the change does not expose vulnerabilities or weaken the security posture:

- [ ] **Boundary input validation:** All data crossing network, user, or inter-service boundaries is validated against a strict schema with explicit length and type limits.
- [ ] **Injection prevention:** SQL queries use parameterization or ORM methods; shell commands pass arguments as vectors without string interpolation; rendered HTML is sanitized or auto-escaped.
- [ ] **Authentication and access control:** Every new route, endpoint, and mutation verifies that the caller is authenticated and authorized to access the specific object (preventing IDOR).
- [ ] **Secret hygiene:** Zero credentials, tokens, private keys, or passwords in source code, commit history, or logs. Secrets are loaded exclusively from validated environment variables.
- [ ] **Untrusted external data:** Data received from external APIs, webhooks, file uploads, and LLM outputs is treated as untrusted and validated before consumption.
- [ ] **Safe file and path handling:** File paths derived from user input or external metadata are validated against an allowlist and checked against path traversal (`../`) before any file system call.

For deeper architectural security patterns, refer to `../../../references/security-checklist.md`.

---

## 5. Performance Review Checklist

Guard against latency regressions, excessive resource consumption, and scaling bottlenecks:

- [ ] **N+1 queries:** Database access in loops is batched into a single query or uses eager joins rather than individual per-item queries.
- [ ] **Bounded collections and pagination:** Every query or API endpoint returning a list implements pagination or strict limit constraints.
- [ ] **Resource lifecycle:** File handles, database connections, web sockets, and long-lived subscriptions are properly closed and disposed of.
- [ ] **Memory and closures:** Avoid capturing large data structures inside long-lived closures, global registries, or unbounded caches.
- [ ] **UI and render paths:** Prevent unnecessary re-renders in hot loops; keep heavy computation off the main thread; ensure large assets are loaded lazily.
- [ ] **Bundle impact:** Check that new libraries are tree-shakeable and do not introduce outsized weight for minor functionality.

For detailed profiling and Core Web Vitals targets, refer to `../../../references/performance-checklist.md`.

---

## Specialized Review Workflows

### Dependency Upgrade Review

When reviewing dependency updates:

1. **Changelog verification:** Read the upstream release notes between versions. Verify whether deprecations, breaking changes, or behavioral shifts occurred.
2. **Isolation:** Keep dependency upgrades isolated to one package per change. Never bundle unrelated dependency updates with feature development.
3. **Lockfile discipline:** Review the lockfile diff to verify transitive dependency changes. Lockfiles must never be hand-edited or bypassed.
4. **Test verification:** Run full automated test suites before and after the version bump. If behavior is untested, add tests before upgrading.

### Bug Fix and Regression Test Review

When reviewing bug fixes:

1. **Reproduction first:** Confirm that the pull request contains an automated test that fails on the unpatched code and passes with the fix.
2. **Root cause vs. symptom:** Ensure the fix addresses the underlying architectural or logical flaw rather than patching a symptom or silencing an error.
3. **Edge-case coverage:** Verify that related edge cases in adjacent code paths have also been addressed and tested.

### Refactoring and Structural Changes

When reviewing refactors:

1. **Zero functional regression:** A pure refactor must not introduce behavioral changes. Feature additions must be submitted in a separate PR.
2. **Concept reduction:** Verify that the refactored design reduces the number of concepts, modes, or branches a developer must hold in memory.
3. **Reversibility:** Keep structural moves incremental and self-contained so that regressions can be cleanly reverted if needed.

---

## Review Output Templates

### Inline Finding Format

When leaving review comments, label every finding with its severity level and propose a concrete remedy:

```markdown
**[Severity]** [Clear statement of the issue]

Why: [Explanation of impact, risk, or maintenance cost]

Suggested Remedy:
[Concrete code sample or named architectural move]
```

Severity taxonomy:
- **Critical:** Blocks merge. Security vulnerability, data loss, runtime crash, broken requirement.
- **Required (no prefix):** Must be addressed before merge. Bugs, missing tests, unhandled errors, architectural violation.
- **Optional / Consider:** Suggestion for improvement. Author may evaluate and choose.
- **Nit:** Minor style or cosmetic preference. Author may adopt or ignore.
- **FYI:** Informational note or context for future changes. No action needed.

### PR Review Summary Template

```markdown
## Code Review Summary

### Context and Intent
- Verified against requirements: [Summary of change and scope]

### Multi-Axis Evaluation
- **Correctness:** [Status and findings]
- **Readability:** [Status and findings]
- **Architecture:** [Status and findings]
- **Security:** [Status and findings]
- **Performance:** [Status and findings]

### Key Findings
1. **[Severity]** `file:line` - [Summary of issue and recommended fix]
2. **[Severity]** `file:line` - [Summary of issue and recommended fix]

### Verdict
- [ ] Approve (Change definitely improves overall code health)
- [ ] Request Changes (Required or Critical items must be resolved)
```
