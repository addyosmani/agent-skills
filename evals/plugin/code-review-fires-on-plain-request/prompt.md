---
description: The plainest review request, with the diff pasted inline and no axes named. #612 left this phrasing at 3 of 9; it is the case the clause is for.
expected_outcome: A review with a verdict and severity-labelled findings, the off-by-one in pageOrders among them; code-review-and-quality is invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Review this diff before I merge it.

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
