---
description: A failing-test diagnosis with the diff pasted inline. Checks that debugging-and-error-recovery activates and ties its diagnosis to a reproduction and a regression guard.
expected_outcome: An explanation of the exclusive slice end, a concrete reproduction of the missing row, and a minimal correction with a regression check and verification guidance.
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
