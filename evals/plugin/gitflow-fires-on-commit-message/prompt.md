---
description: A commit-message request with the diff pasted inline. The diff carries two unrelated changes. The skill should fire, and the reply should give a typed subject with a body that says why, and say that the two concerns belong in separate commits.
expected_outcome: A conventional message for the retry change with a body explaining the transient-failure motivation, and a note that the formatMoney helper is a separate concern deserving its own commit and message; git-workflow-and-versioning is invoked.
max_turns: 12
allowed_tools: [Read, Glob, Grep, Skill]
---

Write me a commit message for this diff.

```diff
diff --git a/src/orders.js b/src/orders.js
--- a/src/orders.js
+++ b/src/orders.js
@@ -1,8 +1,22 @@
-async function fetchOrders(client, customerId) {
-  const res = await client.get(`/customers/${customerId}/orders`);
-  return res.data;
+const RETRY_DELAYS_MS = [200, 800, 2000];
+
+async function fetchOrders(client, customerId) {
+  let lastError;
+  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
+    try {
+      const res = await client.get(`/customers/${customerId}/orders`);
+      return res.data;
+    } catch (err) {
+      lastError = err;
+      if (err.status && err.status < 500) throw err;
+      if (attempt < RETRY_DELAYS_MS.length) {
+        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
+      }
+    }
+  }
+  throw lastError;
 }
 
 module.exports = { fetchOrders };
diff --git a/src/format.js b/src/format.js
--- a/src/format.js
+++ b/src/format.js
@@ -4,3 +4,8 @@ function formatDate(d) {
   return d.toISOString().slice(0, 10);
 }
 
-module.exports = { formatDate };
+function formatMoney(cents, currency = 'USD') {
+  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
+}
+
+module.exports = { formatDate, formatMoney };
```
