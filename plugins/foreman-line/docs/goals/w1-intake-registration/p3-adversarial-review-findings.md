# W1-P3 Adversarial Review — findings + coordinator triage (2026-07-22)

Single independent frontier review (D6), fresh session, zero builder context; reproduced the deterministic pass (tsc 0, 46/46, biome 0), verified the vendored canonicalizer byte-identical to the pcc authority and hostile-probed both (unicode keys, lone surrogates, hostile numbers, 2MB strings), drove the CLI as a subprocess through every bypass attempt (pipes, --yes/--force, CI/FORCE env vars — all refused exit 2, zero bytes written), and verified the frozen parity vector on disk. Verdict: **SHIP WITH FOLLOW-UPS**, no blockers. All four mandated focus questions PASS — including human-gate integrity, the parcel's reason to exist (single call site for mint+write, gated TTY-then-confirmation).

## Findings

| # | Severity | Finding |
|---|---|---|
| F1 | MINOR | `approvalRecordPath`/`rejectionRecordPath` build write paths from `slug` with no containment check — `'../../../../evil'` escapes `active/`. Bounded (suffix-constrained, receipt locator UUID-safe, approve needs a human to type the traversal), but `reject` is non-TTY and rejection writes don't refuse-to-overwrite. |
| F2 | MINOR | Genesis receipt is written before the approval record with no cleanup pairing — a record-write failure orphans a receipt (harmless: P4 keys off the record). |
| F3 | INFO | Recursive canonicalize stack-overflows at ~10k nesting — shared identically with the pcc authority; unreachable via the schema-validated CLI path; fails closed. |
| F4 | INFO | Number encoding follows JSON.stringify, not strict JCS — matches the authority exactly; parity vector passes. |
| F5 | INFO | `ajv` used only transitively via imported readers; dep set spec-mandated and machine-enforced. |

## Coordinator triage

| # | Disposition | Ruling |
|---|---|---|
| F1 | **fix (rework item 1)** | Third occurrence of the slug-containment class in this goal (W1-P1 sessionSlug, W1-P2 slug/specRef) — fix on sight. Validate `slug` against `^[a-z0-9-]+$` (linear-time; mirroring receipts' slugify) before any record-path construction, uniform clear error; rejecting tests (traversal, separators, uppercase) for both approval and rejection paths. |
| F2 | **fix (rework item 2)** | Cheap ordering fix: write the approval record BEFORE minting/writing the receipt, or wrap the pair so a failure of the second cleans up the first; a test asserting no orphaned receipt on a forced record-write failure. |
| F3 | **accept-as-documented** | Authority-identical behavior; fails closed; unreachable via CLI. |
| F4 | **accept-as-documented** | Authority-identical; vector-pinned. |
| F5 | **informational** | Compliant. |

Rework tripwire: completion-claim test count must EXCEED 46.
