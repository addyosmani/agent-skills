---
description: A failing-test diagnosis with the diff pasted inline. Checks that debugging-and-error-recovery activates and that the reply names the cause, makes the minimal fix and says how to confirm it.
expected_outcome: The exclusive slice end named as the cause, the one-token fix to start + size, and a way to confirm it, such as re-running the failing test or adding a test that asserts a full page and the last page's boundary.
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
