---
type: llm
---

PASS if all three hold. (1) The commit message has a subject of the form `<type>: <short description>` with a type from feat, fix, refactor, test, docs or chore, written in the imperative. (2) It has a body that explains why the change exists (upstream calls fail transiently, retries with backoff are bounded, client errors are not retried), not a restatement of what the diff does line by line. (3) The reply notices that the diff carries two unrelated changes, the retry logic in orders.js and the new formatMoney helper in format.js, and says they should be separate commits, giving a message for each or telling the user to split before committing.

FAIL if the reply produces a single message that silently covers both changes, or a subject with no type, or a body that only lists what changed.
