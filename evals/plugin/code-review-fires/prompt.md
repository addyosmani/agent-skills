---
description: A review request that names the axes, with a small diff inline. The skill should fire (through the review command or directly) and the reply should carry its severity labels.
expected_outcome: A structured review with a verdict, findings labelled with the skill's severity taxonomy, and the off-by-one in pageOrders treated as a required change.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

I want a code review of this diff across correctness, readability, security and performance before merging. It adds paging to the orders endpoint.

```diff
diff --git a/src/orders.js b/src/orders.js
--- a/src/orders.js
+++ b/src/orders.js
@@ -12,3 +12,15 @@ function listOrders(db) {
   return db.query('SELECT * FROM orders ORDER BY created_at DESC');
 }
-module.exports = { listOrders };
+function pageOrders(db, page, size) {
+  const rows = db.query('SELECT * FROM orders ORDER BY created_at DESC');
+  const start = (page - 1) * size;
+  return rows.slice(start, start + size - 1);
+}
+
+app.get('/orders', (req, res) => {
+  const page = Number(req.query.page) || 1;
+  const size = Number(req.query.size) || 20;
+  res.json(pageOrders(db, page, size));
+});
+
+module.exports = { listOrders, pageOrders };
```
