---
type: llm
---

PASS if all three hold. (1) The reply names the cause precisely: the slice end index `start + size - 1` stops one row short because slice's end is exclusive, so every full page returns size minus one rows. (2) The fix is minimal: the end index becomes `start + size`, and nothing else is changed as part of the fix (a suggestion to page in SQL is fine only when it is marked as a separate improvement, not the fix). (3) The reply says how to confirm it: re-run the failing test, or add a test that asserts a full page of rows and the last page's boundary, or both. A recommendation is enough; this case provides no shell or runnable project.

FAIL if the reply guesses at other causes without settling on the slice bound, or rewrites the function beyond the one-token fix and presents that as the fix, or gives the fix with no way to confirm it. Do not require particular headings or wording, and do not require the skill's invocation; that is measured separately.
