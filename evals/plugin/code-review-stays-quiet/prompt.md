---
description: A test-first request that belongs to test-driven-development. The review skill must not fire.
expected_outcome: The reply proposes a failing test first; code-review-and-quality is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Write a failing test for this bug before we fix it: splitCents(100, 3) returns [33, 33, 33] and a cent goes missing.
