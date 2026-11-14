---
description: A refactor request for readability with the function pasted inline and no behavior change asked for. It belongs to code-simplification. Guards the test-driven-development clause, whose "change its behavior" and "the fix looks too obvious to need a test" must not pull in a request that changes no behavior.
expected_outcome: A clearer version of the function with the same behavior; test-driven-development is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Refactor this function so it is easier to read.

```js
function discountFor(user, cart) {
  let d = 0;
  if (user) {
    if (user.plan === 'pro') {
      if (cart.total > 100) { d = 0.2; } else { d = 0.1; }
    } else {
      if (cart.total > 100) { d = 0.05; } else { d = 0; }
    }
    if (user.coupon) {
      if (user.coupon.valid) { d = d + 0.05; }
    }
  }
  if (d > 0.25) { d = 0.25; }
  return d;
}
```
