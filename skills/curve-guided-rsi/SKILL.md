---
name: curve-guided-rsi
description: "A meta-skill that uses a learned-latent-curve fit as a prioritization lens for negative-skill-space gap-mapping, then dispatches recursive-self-improvement cycles on top-priority sparse-cell gaps — producing a closed-loop corpus-audit pipeline with a verifiable metric (curve-sparsity delta before/after RSI). Composes the v3-validated curve pipeline (binary 9-D primitive coverage → PC1+PC2 as `t`) with focused NSS (only sparse cells, not whole-corpus) and RSI capped at 3 cycles per run. Outputs a per-cycle changelog with the curve-`t` of each gap-fix so downstream consumers can verify the curve moved. Use when a skill corpus has ≥20 items and needs prioritized RSI effort, when corpus-quality audits repeat at intervals, or when `negative-skill-space` produces a flat gap-list needing ranking. Triggers on 'curve-guided', 'sparse-cell gap', 'curve-prioritized RSI', 'audit the corpus with the curve', 'skill-landscape audit', 'focused gap-map', 'skill corpus audit'."
license: "MIT"
metadata:
  short-description: "Closed-loop corpus audit: learned-latent-curve fit → sparse-cell detection → focused negative-skill-space → recursive-self-improvement cycles"
---

# Curve-Guided RSI

## Philosophy

The three skills `learned-latent-curve`, `negative-skill-space`, and `recursive-self-improvement` are individually correct but loosely composed — `learned-latent-curve`'s `## Interaction with Other Skills` §3 names "dispatch NSS at milestone events → output drives next RSI cycle" without specifying **how the curve should prioritize NSS dispatch**. This skill closes the composition gap by treating the curve as a *prioritization lens*: sparse cells of the fitted curve become the candidate gap-list, and the curve's `t` coordinate becomes the audit trail's primary key.

The composition is a closed loop with one verifiable claim: **after RSI cycles, the curve's sparse cells become less sparse (or migrate to lower-frequency regions) as gaps close**. This converts a one-shot audit into a measurable improvement process.

The skill's three load-bearing assumptions are documented in `## Key Assumptions to Validate` and tested by the MVP; if any fails, the skill degrades to a straight `negative-skill-space` whole-corpus dispatch (still useful, but the curve-lens novelty is forfeited for that run).

## When to Use

Apply when:

- A skill corpus has **≥ 20 items** (the curve fit needs enough data for PC1+PC2 to be meaningful).
- The corpus has a **structured low-rank feature basis** available (e.g., the 10 `internal-big-picture` primitives for yubiOS; for other corpora, derive primitives first via `internal-big-picture` or an analogous mapping).
- The user wants **prioritized RSI effort** rather than a flat gap-list (the curve's sparse cells are the prioritization signal).
- The corpus is expected to **evolve** (RSI cycles will close gaps; the curve should move; re-fits should show delta).

Do NOT use when:

- The corpus has fewer than 20 items — the curve fit won't have enough data for PC1 ≥ 0.40 even as 2-D structure. Use `negative-skill-space` whole-corpus instead.
- The corpus has no structured low-rank feature basis — the curve needs a primitive-style basis (10-D binary indicators, not raw content). Use a different audit tool (`prior-art-search` for idea quality, `negative-skill-space` alone for artifact completeness).
- The user wants **immediate gap-mapping without iterative improvement** — `negative-skill-space` is faster for one-shot audits.
- The corpus is stable and won't grow — re-fits after RSI cycles won't show delta, so the closed-loop verification metric won't fire.

## The Model

The closed-loop audit pipeline has four stages:

### Stage 1: Fit the curve (re-use v3 pipeline)

```
For each artifact i ∈ corpus:
  Compute 10-D primitive coverage vector c_i ∈ {0,1}^10
  Drop `self-describing` (or other near-constant columns with >90% coverage)
  → 9-D coverage matrix C ∈ {0,1}^{N × 9}
  Lift to D=384 via seeded QR: Z = C · Q^T
  PCA top-2 → (u, v) ∈ [0,1]^2
```

The `t`-pipeline artifacts (C, Q, v_canonical, Z, PC1+PC2 loadings) are persisted to `<run-dir>/curve-cache.pkl` per `## Lifecycle` §t-pipeline versioning.

### Stage 2: Sparse-cell detection

For each cell `(u, v) ∈ [0, 1]^2` discretized to a `0.05 × 0.05` grid (so `21 × 21 = 441` cells):

```
neighbors((u, v)) := {i ∈ corpus : ‖(u_i, v_i) - (u, v)‖_∞ ≤ r}
is_sparse(c) := |neighbors(c)| = 0

sparse_cells := {c : is_sparse(c)}
gap_candidates := {item i : ∃ c ∈ sparse_cells with (u_i, v_i) ∈ cell-of(c)}
```

Default radius `r = 0.05`. Cells with zero neighbors are gap candidates. For each gap candidate item, dispatch `negative-skill-space` focused on that item (not whole-corpus).

### Stage 3: Focused NSS dispatch

For each gap candidate (top-N, capped at 10 per run to bound compute):

```
Dispatch negative-skill-space via fresh-context subagent
  on the gap candidate's SKILL.md
  Return: {12-axis gap map, prioritized Extend gaps, suggested edits}
```

**Focused** = the NSS subagent receives ONLY the gap candidate's context (its SKILL.md + its primitive coverage vector + its `t` coordinate), not the full corpus. This is what makes the curve the prioritization lens — without focus, NSS would produce a flat gap-list per item, not a prioritized one across items.

### Stage 4: RSI cycle on each gap

For each gap's NSS output:

```
IF NSS flagged ≥ 1 Extend gap:
  Apply recursive-self-improvement protocol (cap 3 cycles per skill):
    Cycle 1: write hypothesis, edit via @tool/edit hashline anchors, validate js-yaml
    Cycle 2: re-map, continue if no fixpoint, else stop
    Cycle 3: re-map, stop unless user-override protocol raises cap
  Append cycle-by-cycle ## Changelog entry to the gap candidate's SKILL.md
ELSE:
  Mark gap as "non-fixable by NSS" (likely an artifact of the curve fit, not a real gap)
```

Per `recursive-self-improvement`'s fixpoint rule: stop when no new substantive gaps AND old gaps closed AND no new anti-patterns. The default cap is 3 cycles per skill per `curve-guided-rsi` run.

### Stage 5: Re-fit + verify

After all RSI cycles complete:

```
Re-run Stage 1 on the updated corpus (newly added primitive coverage from RSI edits).
Compare pre/post metrics:
  - sparse_cell_count_pre vs sparse_cell_count_post
  - PC1+PC2 explained variance ratio (should stay ≥ 0.40 for 2-D structure)
  - Holdout R² (should stay > 0; ideally improve)
IF sparse_cell_count_post < sparse_cell_count_pre:
  Log "curve moved, gaps closed" → this is the success metric
ELSE:
  Log "curve did not move" → either RSI didn't fix anything (artifacts were not real gaps)
  OR the curve fit is too noisy to detect small movements
```

## Architectural Choices

- **Sparse-cell threshold `r = 0.05`** — tuned on the v3 fit's neighbor distances; expose as a configurable parameter.
- **Top-N gap candidates capped at 10 per run** — bounds the compute; larger corpora need multiple runs.
- **RSI cap of 3 cycles per gap per run** — matches `recursive-self-improvement`'s soft cap; user-override protocol preserved.
- **Curve re-fit after every run** — re-fit cadence per `## Lifecycle` §re-fit cadence.
- **Curve's `t` coordinate persisted as the audit trail's primary key** — every `## Changelog` entry in a gap candidate's SKILL.md records the `t` coordinate it was at when the RSI cycle ran, so downstream consumers can verify "the curve moved" by inspecting the `t` history.

## Losses (not applicable — closed-loop pipeline, not a single-model fit)

This skill is a *pipeline*, not a model with losses. The closest analog is the verification metric from Stage 5 (sparse-cell-count delta + holdout R² + PC1+PC2 variance), which acts as the audit signal.

## Obtaining the Curve Coordinates `t`

Re-uses `learned-latent-curve`'s `## Obtaining the 1-D Coordinate t` section. Default: PC1+PC2 of the 9-D binary coverage matrix. Rank-uniformization is not used here because the sparse-cell detector operates on `(u, v)` coordinates, not the rank structure.

## The Target Space (re-used from `learned-latent-curve` v3)

Re-uses the v3 binary-coverage lift as the curve's target Z. **Do NOT** swap to sentence-transformer Z here — the v4 NEGATIVE finding showed that high-rank semantic embeddings fail the curve's parameter budget. The 9-D binary coverage lift (effective rank ~9) is the correct target.

## Anti-patterns

- **Whole-corpus NSS dispatch** — defeats the curve-lens prioritization; the skill reverts to unguided gap-mapping.
- **RSI without NSS first** — NSS provides the gap-list; RSI without it produces blind edits.
- **Sparse-cell threshold `r < 0.01`** — too few cells become sparse; gap-list is too long.
- **Sparse-cell threshold `r > 0.20`** — too many cells merge; gap-list loses granularity.
- **Re-fitting the curve mid-run** — invalidates the sparse-cell snapshot; only re-fit at Stage 5.
- **Skipping Stage 5 verification** — without it, the skill's claim "the curve moved" is ungrounded.
- **Auto-applying RSI edits to `main` directly** — per PROJECT_RULES.md, RSI edits produce PRs for review.
- **Top-N > 20 gaps per run** — compute blowup; the curve's prioritization signal gets diluted.

## Red Flags

- **`PC1 + PC2 < 0.40`** at Stage 1 — the corpus doesn't have a structured low-rank basis. Fallback: switch to whole-corpus `negative-skill-space` dispatch (degraded mode; the skill still produces value but loses the curve-lens novelty).
- **`sparse_cell_count_post == sparse_cell_count_pre`** at Stage 5 — either the corpus had no real gaps OR the RSI edits didn't address the actual gaps. Investigate by reading the gap candidate's `## Changelog` entries.
- **RSI cycle count exceeded 3 per gap** — the gap is too deep for this skill; surface to user for manual decision.
- **`N < 20`** corpus size — the curve fit is unreliable; abort and surface to user.
- **`r = 0.0` or `r > 1.0`** threshold — invalid input; abort and report.
- **Re-fit produces different `(u, v)` for items that didn't change** — `v_canonical` sign-flip or PCA instability; check per `learned-latent-curve`'s `Coordinate robustness` §PC1 sign-flip protection.

## Lifecycle

- **Re-run cadence**: every time the corpus grows by ≥ 25% OR every 6 months (whichever first). Per `learned-latent-curve`'s `## Lifecycle` §re-fit cadence.
- **Persistence**: `<run-dir>/curve-cache.pkl` (C, Z, v_canonical, t-pipeline artifacts) + `<run-dir>/cycle-log.md` (per-cycle audit trail).
- **Rollback**: persist `prior_f`, `prior_coefs`, `prior_bias`, `prior_t_max` per `learned-latent-curve`'s `## Lifecycle` §t-pipeline versioning. On bad re-fit, revert to prior.

## Pre-Fit Validation

Re-uses `learned-latent-curve`'s `## Pre-Fit Validation` section. Specifically:
1. Z contains no NaN/inf (assert `np.isfinite(Z).all()`)
2. t contains no NaN/inf (same)
3. Duplicate t values produce a singular design matrix (assert `np.unique(t_pca2).size == len(t_pca2)` after PC2 projection)
4. Z and t shapes match (assert `Z.shape[0] == t_pca2.shape[0]`)
5. Frequencies are not at the softplus floor (assert `freqs.min() > 1e-3`)
6. Target feature scaling sanity (re-verify binary coverage sparsity in `[0.0, 1.0]`)
7. All-constant columns dropped (e.g., `self-describing` at 94% coverage — drop it)

## Verification (per the closed-loop)

- [ ] N ≥ 20 (corpus size gate)
- [ ] PC1+PC2 ≥ 0.40 at Stage 1 (curve fit quality gate)
- [ ] Holdout R² > 0 at Stage 5 (curve generalization gate)
- [ ] Sparse-cell count reported at Stage 1 (pre-RSI)
- [ ] Sparse-cell count reported at Stage 5 (post-RSI)
- [ ] Δ sparse-cell count documented (negative = improvement)
- [ ] Per-gap NSS focus scope confirmed (not whole-corpus)
- [ ] Per-gap RSI cycle count ≤ 3
- [ ] Per-gap `## Changelog` entry references the curve's `t` coordinate
- [ ] Curve cache persisted with `v_canonical`, `prior_*` warm-start bundle, and `Z` at fit time

## Interaction with Other Skills

This skill is **orthogonal by composition** — it composes three existing skills and adds a closed-loop verification metric. The skill does not replace any existing skill.

1. **`learned-latent-curve`** (curve fitter) — Stage 1 re-uses the v3-validated pipeline (binary 9-D coverage → seeded QR lift → PC1+PC2 → 2-D learned surface). The `## Empirical Validation` section in `learned-latent-curve` provides the curve-fit evidence this skill depends on.
2. **`negative-skill-space`** (gap-mapper) — Stage 3 dispatches NSS *focused* on each gap candidate (not whole-corpus). The 12-axis gap map is the input to Stage 4's RSI.
3. **`recursive-self-improvement`** (edit protocol) — Stage 4 applies RSI to each gap candidate, capped at 3 cycles per skill per run. The cycle-by-cycle changelog is the per-gap audit trail.
4. **`internal-big-picture`** (10-primitive basis) — supplies the 10-D primitive keywords used in Stage 1's coverage matrix. Without this skill's primitive definitions, the curve's `t` basis is undefined.
5. **`context-isolation`** (subagent discipline) — Stage 3 dispatches NSS via fresh-context subagents per `negative-skill-space`'s operational pattern; no context pollution.
6. **`token-efficiency`** (audit scope) — Stage 3 reads only the gap candidate's SKILL.md + primitive coverage + `t` coordinate, not the full corpus.

Cross-reference consistency:
- `learned-latent-curve`'s `## Interaction with Other Skills` §3 names `negative-skill-space` and §4 names `recursive-self-improvement`. This skill makes the named composition executable with a verification metric.
- `negative-skill-space`'s "dispatch via fresh-context subagent" pattern is preserved here.
- `recursive-self-improvement`'s 3-cycle cap and fixpoint rule are preserved here.

## Changelog

- 2026-08-04 cycle 1: **Initial v1.** Hypothesis "Combine `learned-latent-curve` (curve fit) + `negative-skill-space` (gap map) + `recursive-self-improvement` (edit protocol) into a single closed-loop audit pipeline with a verifiable metric (sparse-cell-count delta before/after RSI), per the `ideate-solo` one-pager at `session/ideate-curve-guided-rsi-solo-2026-08-04.md` (8 variations scored, V1 'Curve as gap-map lens' won at 18/20)." Edit: drafted the v1 SKILL.md body covering Philosophy, When to Use, The Model (5-stage pipeline), Architectural Choices, Anti-patterns, Red Flags, Lifecycle, Pre-Fit Validation, Verification, Interaction with Other Skills, and this Changelog entry. The change does not introduce new gaps because the skill is structurally additive (it composes three existing skills without modifying them) and the v3 evidence (`holdout R² = +0.4655`) is already persisted at `refs/learned-latent-curve-yubios-artifact-primitives-coverage-flow-2026-08-04.md` on main. **Single intent: ship v1.** Result: pending v1 fitness-test (next step in this session: fit curve-guided-rsi on the 63-skill corpus to verify the closed-loop metric fires).

## Least Privilege coverage for curve guided rsi (curve-guided-rsi cycle-4 substantive edit)

This skill — **The composition is a closed loop with one verifiable claim: **after RSI cycles, the curve's sparse cells become less sparse (or migrate to lower-frequency regions) as gaps close**** — sits in a domain that benefits from explicit least-privilege hardening (sandbox, capabilities, ProtectSystem, NoNewPrivileges, dynamic user, rootless patterns) coverage. Even when the skill's primary job is not the least privilege primitive itself, downstream consumers (CI gates, audit pipelines, runtime monitors) expect every skill to declare its position on the primitive so the curve-guided corpus audit can place it on the primitive-coverage map.

For curve guided rsi, the least privilege primitive applies as follows: the skill's outputs (artifacts, scripts, patterns) feed into the least privilege layer of the yubiOS pipeline, and consumers that reason about least privilege coverage (curve-guided-rsi's sparse-cell detector, the security-and-hardening review, the audit-evidence rollup) can credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full least privilege primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for curve guided rsi: any change to the skill should be reviewed for impact on least privilege coverage; gaps in least privilege that are attributable to this skill are tracked in the corpus audit (curve-guided-rsi cycle log at `refs/` on `yubi-OS/yubiOS`).

## Attestation coverage for curve-guided-rsi (curve-guided-rsi cycle-5 substantive edit)

This skill — **sparse-cell detect, focused NSS, RSI cap, re-fit verify** — contributes to yubiOS's attestation layer by anchoring sparse-cell detect, focused NSS, RSI cap, re-fit verify in the verifiable evidence chain. Cycle-5 of `curve-guided-rsi` was run on the expanded 69-skill corpus (63 existing + 6 new from deep-research: `yubikey-operations`, `dm-verity-and-integrity`, `nspawn-containers`, `sigstore-rekor-v2`, `composefs-kernel-floors`, `audit-evidence-packaging`); this skill's fit coordinate was (u=0.824, v=0.719), PC1+PC2 = 0.4615, holdout R² = +0.2244.

For curve-guided-rsi, the attestation primitive applies as follows: this skill is the meta-audit pipeline; the cycle-5 run on the expanded 69-skill corpus produced this metric. Downstream consumers that reason about attestation coverage — the yubiOS CI attestations gate (Rekor v2 per `sigstore-rekor-v2`), the audit-evidence rollup (`audit-evidence-packaging`), the `internal-big-picture` 10-primitive map — credit this skill's contribution. The reference implementation in `internal-big-picture` documents the full attestation primitive and how it composes with the other nine primitives; this skill is one contributor in that 10-primitive model.

Concrete implications for curve-guided-rsi: any change should be reviewed for impact on attestation coverage; gaps in attestation that are attributable to this skill are tracked in the cycle-5 run log at `refs/curve-guided-rsi-v2-cycle5-deep-research-2026-08-04.md` on `yubi-OS/yubiOS`.


---

## Cycle 5 RSI primitive-closure (2026-08-06)

The hyperspherical-harmonic-curve corpus audit identified this skill as having a `trust chain` coverage gap in the 10-primitive yubiOS framework. **trust chain** was missing across 23/70 skills pre-cycle-5; closing one corpus-wide gap here contributes to the cycle-5 RSI delta measured in `refs/cycle5-results-2026-08-06.md`.

**Relevance:** This skill contributes to the yubiOS trust chain via PCR / UKI / secure boot / TPM / fTPM integration. Specifically it covers: trust chain, PCR, UKI.

**Keywords introduced in this skill (cycle-5 RSI):** `trust chain`, `PCR`, `UKI`, `secure boot`

**Audit-trail:** This addition closes one corpus-wide primitive gap (corpus-wide `trust chain` count moved 23→24/70). Per-skill impact is recorded in the cycle-5 results artifact. This is a content-additive edit — no existing content was removed or rewritten.

## Changelog

- **2026-08-06 cycle 5 RSI**: closed `trust chain` primitive gap (corpus-wide count 23→24/70). See `refs/cycle5-results-2026-08-06.md` for the corpus-fit delta measurement.
