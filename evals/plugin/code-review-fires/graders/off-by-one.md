---
type: llm
---

PASS if the review points out that `rows.slice(start, start + size - 1)` returns one row fewer than `size` on every page (the end index of slice is exclusive) and treats it as something that must be fixed before merge, for example by labelling it Critical or leaving it unprefixed as a required change.

FAIL if the review does not mention that pages come back one row short, or files that finding as a Nit, Optional, Consider, or FYI.
