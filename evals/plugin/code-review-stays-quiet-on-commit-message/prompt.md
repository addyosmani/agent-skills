---
description: A pasted diff with a request that belongs to git-workflow-and-versioning. Guards the "even when the diff is pasted inline" clause of the review skill's description, since a pasted diff alone must not make the review skill fire.
expected_outcome: A commit message; code-review-and-quality is never invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Write me a commit message for this diff.

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
+  return rows.slice(start, start + size);
+}
+
+module.exports = { listOrders, pageOrders };
```
