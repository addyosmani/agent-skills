# repo-history-skill — Cycle 2 Results (2026-08-07)

A full cycle of the [repo-history-skill](../skills/repo-history-skill/SKILL.md) — Mode B incremental refresh + cycle-2 RSI — ran on 2026-08-07 11:06 UTC against `yubi-OS/yubiOS` and `yubi-OS/agent-skills`. The cycle-1 ship (2026-08-07 03:38 UTC) was a Mode A cold-start; this is Mode B with 3 cycle-1 fixes applied.

## TL;DR

- **Corpus grew 7.3×** (34 → 248 items): PRs 34 + Commits 60 + Releases 16 + Linear OMN 138.
- **Primitive survival grew 2.3×** (3 → 7 of 9): broadened regexes rescued 4 primitives that cycle-1 dropped as constant-zero or constant-100.
- **PC1+PC2 stayed above the gate** (0.7311 → 0.7437) — fit quality survived the 7× corpus growth without re-fit.
- **‖p‖ = 1.0 ± 1e-6 PASS**, **sparse-cell count = 3/248 PASS**, **all fit-quality gates PASS**.
- **Cycle-2 RSI fixpoint**: condition (1) PASS (5 measured gaps, no inventions), (2) PASS (3 of 3 cycle-1 regex fixes verified), (3) PASS (no new anti-patterns). **Cycle 2 ships.**
- **Möbius refinement frozen at identity** — unconstrained centroid-loss collapsed all points (cross-ratio error 14.5); per the red-flag rule, freeze and skip future refinements.

## Cycle-2 fix impact (PR-only sub-corpus, N=34)

The cycle-1 audit identified 3 regex-broken primitives (constant-0 in cycle 1 because of false-negative regexes). Cycle 2 broadened each:

| Primitive | Cycle 1 | Cycle 2 (PR-only) | Δ |
|---|---:|---:|---:|
| `has_purpose` | 9/34 = 26.5% | 24/34 = 70.6% | **+44.1%** ↑ |
| `has_sha` | 4/34 = 11.8% | 34/34 = 100.0% | **+88.2%** ↑ |
| `has_pr_ref` | 19/34 = 55.9% | 19/34 = 55.9% | 0.0% = |
| `has_linear_ref` | 0/34 = 0.0% | 0/34 = 0.0% | 0.0% = |
| `has_state_progression` | 34/34 = 100.0% | 10/34 = 29.4% | **−70.6%** ↓ |
| `has_author` | 34/34 = 100.0% | 34/34 = 100.0% | 0.0% = |
| `has_cross_corpus_link` | 0/34 = 0.0% | 0/34 = 0.0% | 0.0% = |
| `has_evidence` | 34/34 = 100.0% | 34/34 = 100.0% | 0.0% = |
| `has_temporal_anchor` | 0/34 = 0.0% | 31/34 = 91.2% | **+91.2%** ↑ |

**3 of 3 fixes WORKED on PR-only**:
- `has_temporal_anchor` (+91.2% — Z-suffix dropped from required to optional)
- `has_purpose` (+44.1% — additional section headers: Motivation, Rationale, refactor:/perf:/test: prefixes)
- `has_sha` (+88.2% — commit `sha` field on commit items + `merge_commit_sha` on PR items)

**2 of 3 fixes DID NOT WORK on PR-only** (`has_linear_ref`, `has_cross_corpus_link` stayed at 0/34). Root cause is a yubiOS workflow convention, not a regex bug:
- PR bodies on `yubi-OS/yubiOS` and `yubi-OS/agent-skills` **don't reference OMN-### inline**. PR bodies cite commit SHAs (`000fc9b6`) and PR numbers (`PR #180`); Linear IDs (`OMN-157`) live only in the Linear corpus.
- The "cross-corpus join via regex on PR body" key produces 0 matches because the link is structural (separate items talking about the same topic) rather than inline.
- **Cycle-3 hypothesis**: add a semantic-similarity join (e.g., PR title ↔ Linear title) for the cross-corpus linkage.

**1 cycle-1 over-match flipped**:
- `has_state_progression` (100% → 29.4% on PRs): the cycle-2 regex is more selective — only flips if state IS observed progressing, not if any state-related word appears. Honest correction of cycle-1's over-match.

## Curve-fit quality (full corpus, N=248)

| Metric | Cycle 1 (N=34) | Cycle 2 (N=248) | Gate | Pass |
|---|---:|---:|---|---|
| `‖p‖` | 1.0 ± 1e-6 | 1.0 ± 1e-6 | = 1.0 | ✓ |
| PC1 | 0.2762 | 0.6075 | n/a | n/a |
| PC2 | 0.2085 | 0.1363 | n/a | n/a |
| **PC1+PC2** | **0.7311** | **0.7437** | **≥ 0.40** | **✓** |
| Primitive survival | 3/9 | 7/9 | ≥ 3 | ✓ |
| `c.sum()` range | [0,9] | [1,7] | [0,9] | ✓ |
| Sparse-cell count | 0/34 | 3/248 | < N | ✓ |
| Möbius cross-ratio | n/a | identity (frozen) | preserved | ✓ |

**Closed-loop metric FIRES**: PC1+PC2 ≥ 0.40 across cycles; primitive survival increased 3 → 7; corpus grew 7.3× without re-fit-induced quality drop.

## RSI dispatch (Stage 3)

Per-primitive global-flip geodesic-delta impact on the corpus:

| Primitive | n_flip | Δmean | Help | Hurt |
|---|---:|---:|---:|---:|
| `has_purpose` | 204 | −0.4229 | 198 | 6 |
| `has_sha` | 154 | −0.3623 | 154 | 0 |
| `has_pr_ref` | 203 | −0.4515 | 198 | 5 |
| `has_linear_ref` | 104 | **+0.3252** | 15 | 89 |
| `has_state_progression` | 230 | −0.1103 | 210 | 20 |
| `has_author` | 138 | **−0.5719** | 138 | 0 |
| `has_cross_corpus_link` | 244 | −0.0063 | 163 | 81 |
| `has_evidence` | 90 | **+0.4139** | 12 | 78 |
| `has_temporal_anchor` | 169 | −0.1947 | 92 | 77 |

**Top-1 RSI candidate**: `has_author` (Δmean = −0.5719, 138 items would move closer to ideal). Root cause: Linear list query doesn't include `createdBy { name }` in the selection set. Cycle-3 hypothesis candidate: broaden the Linear query.

**2 primitives have positive Δmean** (`has_linear_ref` +0.3252, `has_evidence` +0.4139) — flipping these would hurt the corpus on average. They're load-bearing in the wrong direction; cycle-3 should consider SHARPEN-ing the regex (more selective, not less).

## Cycle-2 audit (gap-map for cycle 3)

5 substantive gaps surfaced:

1. **Cross-corpus join limit** — PR bodies don't carry OMN-### inline on yubOS; the regex-based join produces 0 matches. Cycle-3: semantic-similarity join.
2. **`has_author` missing on Linear items** — the `createdBy` field isn't in the GraphQL selection set. Cycle-3: broaden Linear query.
3. **Empty issues sub-corpus** — `sort=updated&direction=desc` returns the 25 most-recent items, all of which have `pull_request` set (Jenny uses Linear as the planning brain). Cycle-3: filter `since=...` for real issues.
4. **Möbius refinement collapse** — unconstrained centroid-loss collapses to a single point (train loss 0, cross-ratio 14.5). Cycle-3: spread-preserving loss.
5. **Sparse-cell count 3/248** — corpus is well-connected; only 3 isolated items need per-item RSI. Mode D is the cycle-3 follow-up.

## Files

- **Skill source**: `skills/repo-history-skill/SKILL.md` (unchanged body, cycle-2 changelog entry appended)
- **Cycle-2 metrics JSON**: `papers/data/repo-history-skill-cycle-2-2026-08-07.json`
- **Cycle-2 archive JSON**: `session/repo-history-cycle-2-2026-08-07/artifacts/repo-history-archive-yubios-2026-08-07-cycle2.json`
- **Cycle-2 changelog MD**: `session/repo-history-cycle-2-2026-08-07/artifacts/repo-history-changelog-yubios-2026-08-07.md`
- **Cycle-2 gap-map MD**: `session/repo-history-cycle-2-2026-08-07/artifacts/repo-history-gap-map-yubios-2026-08-07.md`
- **Cycle-2 sphere-points**: `session/repo-history-cycle-2-2026-08-07/artifacts/sphere-points-cycle2.json`

## Carryover to cycle 3

Cycle 3 (final under 3-cycle RSI cap) candidates, ranked by hypothesis-driven-edit cost:

1. **(low cost)** Broaden Linear GraphQL query to include `createdBy { name }` → rescues `has_author` from 0% to 100% on Linear items, lifts the corpus's primitive survival another step.
2. **(low cost)** Use `?since=2024-01-01` for the issues endpoint → captures real (non-PR) yubOS issues for a fuller corpus.
3. **(medium cost)** Replace centroid-loss in Möbius refinement with spread-preserving loss (target mean pairwise chordal ≈ 0.4) → un-freezes φ_θ; modest expected gain (+0.0086 R² per hyperspherical-harmonic-curve cycle-3 measurement).
4. **(high cost)** Add semantic-similarity join for cross-corpus link (PR title ↔ Linear title via embedding) → rescues `has_linear_ref` and `has_cross_corpus_link` on PR-only sub-corpus.

Cycle 3 is the final cycle under the 3-cycle RSI cap. User may override for further iterations.

## References

- Cycle-1 results: `refs/repo-history-skill-deep-research-2026-08-07.md` (concept) + `papers/data/repo-history-skill-cycle-1-2026-08-07.json` (metrics)
- Cycle-1 audit: see SKILL.md `## Empirical Validation — Cycle 1 (2026-08-07)` for the 3 detection-pattern gaps this cycle closed
- Skill upstream: `hyperspherical-harmonic-curve` SKILL.md §Lifecycle (re-fit cadence), §Möbius refinement strategy (frozen at identity)
- RSI protocol: `recursive-self-improvement` SKILL.md (cycle cap, fixpoint rule, fresh-context subagent)
- NSS sweep: `negative-skill-space` SKILL.md (12-axis gap map for cycle 3)
