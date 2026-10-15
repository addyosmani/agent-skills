---
description: A bug fix request with the function pasted inline and no mention of tests. The skill should fire, and the reply should reproduce the bug with a failing test before fixing it.
expected_outcome: A test that reproduces the lost cent, shown or described as failing first, then the fix; test-driven-development is invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Fix this bug: splitCents(100, 3) returns [33, 33, 33] and a cent goes missing. Here is the function.

```js
function splitCents(totalCents, n) {
  const share = Math.floor(totalCents / n);
  return Array.from({ length: n }, () => share);
}
```
