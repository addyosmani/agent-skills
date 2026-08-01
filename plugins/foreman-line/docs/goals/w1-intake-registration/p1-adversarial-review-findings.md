# W1-P1 Dual Adversarial Review — findings + coordinator triage (2026-07-22)

Two independent frontier reviews (A, B), fresh sessions, zero builder context, both reproducing the deterministic pass themselves (tsc 0, 31/31 tests, biome 0, node v24.11.1) and probing hostile inputs at the live process boundary. Both verdicts: **SHIP WITH FOLLOW-UPS**, no blockers. All five spec-mandated focus questions PASS in both reviews.

## Convergent and unique findings

| # | Reviewer(s) | Severity (A/B) | Finding |
|---|---|---|---|
| R1 | A#1 + B#1 (convergent, both live-probed) | MINOR / MAJOR | `emitShapingResult` does not sanitize `sessionSlug`; a `../` slug escapes `active/` and yields a malformed `artifactRef`. `deriveSessionSlug` is traversal-safe but the emitter neither calls it nor asserts conformance; skill/template don't instruct deriving first. |
| R2 | A#2 + B#2 (convergent, both probed) | MINOR / MINOR | Out-of-Scope non-empty check recognizes only `-`/`*` bullet lines; numbered/prose content falsely flagged empty (advisory-only, so bounded). |
| R3 | B#3 | MINOR/INFO | Body order check masked when a section is missing (missing-section error reported alone). |
| R4 | B#4 | INFO | `deriveSessionSlug` has no length cap. |
| R5 | A#3 | INFO | AC13 root-package.json test diffs against HEAD, not main (committed drift would slip the test; branch-vs-main verified clean by both reviewers). |
| R6 | A#4 | INFO | Emitter does not itself invoke the self-check pre-emission (consistent with the ratified advisory-only split; wiring lives in the skill). |
| R7 | A#5 | INFO | Untracked coordinator artifacts (build kickstarter, deterministic-pass transcript) in the worktree — to be committed deliberately as paper trail at PR assembly, not swept in. |
| R8 | B#5 | INFO (positive) | Read-boundary hostile-input hardening confirmed sound (additionalProperties, __proto__, minLength, clear errors). |

## Coordinator triage

| # | Disposition | Ruling |
|---|---|---|
| R1 | **fix (rework item 1)** | Convergent across both independent reviews and the artifact feeds W1-P3's hash chain — severity ruled at B's MAJOR. Emitter must reject any `sessionSlug` where `deriveSessionSlug(sessionSlug) !== sessionSlug`, with a clear error; rejecting tests (traversal, separators, uppercase); one-line derive-first note in SKILL.md + template. |
| R2 | **fix (rework item 2)** | Any non-blank line whose content is not literally `None` counts as Out-of-Scope content; add prose + numbered-list fixtures. |
| R3 | **accept-as-documented** | A missing section already fails the draft; masking is acceptable advisory behavior. |
| R4 | **accept-as-documented** | Caller-chosen slug; length is the caller's concern. Revisit only if a real collision with filesystem limits occurs. |
| R5 | **informational** | Branch-vs-main verified clean by both reviewers; the stronger check is the reviewer's, not the test's, by design. |
| R6 | **informational** | Matches the ratified Q4/advisory-only design. |
| R7 | **informational** | Coordinator commits the paper trail deliberately at PR assembly. |
| R8 | **informational** | Positive confirmation, no action. |

Rework tripwire: the completion claim's test count must EXCEED 31 or the claim is rejected without inspection.
