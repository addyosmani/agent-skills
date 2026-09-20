---
name: deprecation-migration
description: The mandatory procedure for large-scale deprecation, rewrites, or migrations — build the new flow in parallel, freeze and mark the old flow deprecated, test, switch, delete the old flow, then migrate data; never edit the old flow in place, keep it working until the switch, and record any human override. Load whenever you replace an existing feature, service, schema, or flow; rename or restructure something in use; or the user says "migrate", "deprecate", "rewrite", "replace the old X", or "v2".
---

# Large-scale deprecation / migration

This is the only sanctioned way to replace a flow that is in use.

## The sequence

| Step | Rule |
| --- | --- |
| 1 | **Create the new flow in parallel** (new parallel features). |
| 2 | **Mark the old code and flow as deprecated.** |
| 3 | **Don't allow adding anything new to the old flow** — it is frozen. |
| 4 | **Test the new flow.** |
| 5 | **Switch to the new flow.** |
| 6 | **Delete the old flow.** |
| 7 | **Migrate old data.** |

## Invariants throughout

| Rule |
| --- |
| **Don't edit the old flow in place.** |
| **The old flow is kept working as you make new changes**, until the switch. |
| **A human can override the above migration plan** — only on an explicit user instruction, recorded in `self-improvement.md` and noted on the ticket. |

## How this fits the other rules

- The new flow ships behind a feature flag or without an entry point until step 5 (`continuous-delivery` L5).
- Schema changes stay backward compatible for one release with rollback (`database` D4); where slicing is impossible, say so on the ticket (`continuous-delivery` L8).
- Touching existing code stays backward compatible (`coding-standards` C13); the freeze in step 3 is what makes that cheap.
- Each step is its own small, working commit and PR (`commits-and-pull-requests` P1, P11).
