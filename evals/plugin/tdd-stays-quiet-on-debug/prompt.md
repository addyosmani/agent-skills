---
description: A pasted diff with a "what broke" question that belongs to debugging-and-error-recovery. Guards the "fix a bug in it" clause of the test-driven-development description, since a bug mentioned in a diagnosis request must not make the TDD skill fire.
expected_outcome: A diagnosis of the off-by-one; test-driven-development is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

The orders page test started failing right after this change: it expects 20 rows and gets 19. Here is the diff. What broke?

```diff
diff --git a/src/orders.js b/src/orders.js
--- a/src/orders.js
+++ b/src/orders.js
@@ -12,3 +12,9 @@ function listOrders(db) {
   return db.query('SELECT * FROM orders ORDER BY created_at DESC');
 }
-module.exports = { listOrders };
+function pageOrders(db, page, size) {
+  const rows = db.query('SELECT * FROM orders ORDER BY created_at DESC');
+  const start = (page - 1) * size;
+  return rows.slice(start, start + size - 1);
+}
+
+module.exports = { listOrders, pageOrders };
```
