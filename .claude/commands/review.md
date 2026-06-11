---
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
---

Invoke the agent-skills:code-review-and-quality skill.

Review the current changes (staged or recent commits) across all five axes. For each axis, scan every changed file and report findings with severity, file path, line reference, and a concrete fix recommendation.

---

## Review Axes

### 1. Correctness
- Does the implementation match the spec or ticket?
- Are edge cases handled (empty input, null, overflow, off-by-one)?
- Are tests present and meaningful — not just happy-path?
- Are async operations, race conditions, and error paths covered?

### 2. Readability
- Are names (variables, functions, modules) self-explanatory?
- Is logic straightforward — no unnecessary cleverness?
- Are comments explaining *why*, not *what*?
- Is dead code, debug logging, or commented-out code absent?

### 3. Architecture
- Does the change follow the project's existing patterns and conventions?
- Are abstractions at the right level — not too early, not too late?
- Are boundaries clean — no leaking internals, no circular dependencies?
- Does the change belong in this layer (UI / service / data)?

### 4. Security
- Is all user input validated and sanitized at system boundaries?
- Are secrets, tokens, and credentials never hardcoded or logged?
- Is authentication and authorization checked before sensitive operations?
- Are SQL queries parameterized? Is output encoded to prevent XSS?
- Cross-reference: use the **security-and-hardening** skill for deeper analysis.

### 5. Performance
- Are there N+1 query patterns or unbounded loops?
- Are large payloads paginated or streamed?
- Are expensive operations cached where appropriate?
- Are database indexes in place for new query patterns?
- Cross-reference: use the **performance-optimization** skill for deeper analysis.

---

## Output Format

Produce a structured review in this format:

```
## Code Review Summary

### Critical  ← must fix before merge
- [file:line] Issue description → recommended fix

### Important  ← should fix, but non-blocking
- [file:line] Issue description → recommended fix

### Suggestions  ← optional improvements
- [file:line] Issue description → recommended fix

### Verdict
APPROVE / REQUEST CHANGES / NEEDS DISCUSSION
```

- Always include file and line references.
- Never flag style issues as Critical.
- If no issues found in an axis, state "No issues found" rather than omitting it.
- End with a one-line overall verdict.
