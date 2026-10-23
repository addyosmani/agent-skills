---
description: The same pasted diff as the debugging case, requested as a code review without a reported failure. Guards against routing every pasted diff to debugging-and-error-recovery.
expected_outcome: A code review identifying the pagination defect; debugging-and-error-recovery is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Review this diff before I merge it. It adds paging to the orders endpoint.

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
