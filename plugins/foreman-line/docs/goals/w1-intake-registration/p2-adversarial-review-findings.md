# W1-P2 Adversarial Review — findings + coordinator triage (2026-07-22)

Single independent frontier review (standard-risk parcel, D6), fresh session, zero builder context; reproduced the deterministic pass (tsc 0, 47/47, biome 0) and probed hostile inputs live (traversal slugs, hostile frontmatter, duplicate stems, epic-key collision, projected-artifact re-selection, 200k-char ReDoS probes). Verdict: **SHIP WITH FOLLOW-UPS**, no blockers. All four spec-mandated focus questions PASS against source.

## Findings

| # | Severity | Finding |
|---|---|---|
| F1 | MINOR | No path containment on caller-supplied `slug` (`writeProjectedArtifact('../../evil')` escapes `active/`) or on `parcelSpecRef` resolution (a `../` ref reads frontmatter outside the repo layout). Unreachable via the `writeProjectedResult` wrapper (basename-derived slug), but the amendment exports `slug` first-class and W1-P3 wires a CLI over this surface. |
| F2 | MINOR | Frozen-surface / root-package / no-shaping-mod tests diff against HEAD, not merge-base — a committed frozen change would pass silently (actual branch state verified clean vs merge-base by the reviewer). |
| F3 | INFO | Direct `projectShapingResult` call with schema-invalid input surfaces a raw Node error pre-validation (contract routes input through the validating reader; throws safely). |
| F4 | INFO | AC10 test proves JSON round-trip stability per the AC's literal wording; RFC 8785 sort/hash is W1-P3's job. |

## Coordinator triage

| # | Disposition | Ruling |
|---|---|---|
| F1 | **fix (rework item 1)** | Same hazard class as W1-P1's convergent sessionSlug finding (ruled MAJOR there); fix before W1-P3 builds a CLI on this surface. Reject `slug` containing path separators or `..` (uniform clear error); resolve each `parcelSpecRef` with a containment check under `repoRoot` (refuse refs escaping it). Rejecting tests for both. |
| F2 | **fix (rework item 2)** | Cheap robustness: point the three no-modification tests at the merge-base (`git diff $(git merge-base HEAD origin/main) --stat`) instead of HEAD. |
| F3 | **informational** | Contract is reader-first; safe throw. No action. |
| F4 | **informational** | Matches AC wording; P3 owns canonical hashing. No action. |

Rework tripwire: completion-claim test count must EXCEED 47.
