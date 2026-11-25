---
description: A pasted function with a speed complaint that belongs to performance-optimization. Guards the "even when the code is pasted inline" clause of the code-simplification description, since a request to make pasted code faster must not make the simplification skill fire.
expected_outcome: A faster lookup (a Set or a Map instead of a linear scan per row); code-simplification is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

This takes four seconds on two million rows. How do I make it fast?

```js
function uniqueCustomers(orders) {
  const seen = [];
  for (const order of orders) {
    if (!seen.includes(order.customerId)) {
      seen.push(order.customerId);
    }
  }
  return seen;
}
```
