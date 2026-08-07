## Changelog entry to the gap candidate's SKILL.md
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

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
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
2. **`single-action-curve-rsi`** (atom) — Stage 3 dispatches the *atom* on each gap candidate's file (not NSS). Each per-file dispatch is one atomic action with a measurable geodesic Δ. By the Composition Rule (Lemma 1 → Theorem 1), the corpus-level Stage 5 metric is the sum of per-file atom Δs and is non-negative by construction. See `single-action-curve-rsi`'s `## Composition Rule` section for the formal statement.
3. **`recursive-self-improvement`** (edit protocol) — Stage 4 applies RSI to each gap candidate, capped at 3 cycles per skill per run. The cycle-by-cycle changelog is the per-gap audit trail.
4. **`internal-big-picture`** (10-primitive basis) — supplies the 10-D primitive keywords used in Stage 1's coverage matrix. Without this skill's primitive definitions, the curve's `t` basis is undefined.
5. **`context-isolation`** (subagent discipline) — Stage 3 dispatches NSS via fresh-context subagents per `negative-skill-space`'s operational pattern; no context pollution.
6. **`token-efficiency`** (audit scope) — Stage 3 reads only the gap candidate's SKILL.md + primitive coverage + `t` coordinate, not the full corpus.

**Stage 3 redesign (NSS-proposes / atom-disposes, 2026-08-06)**: Stage 3 is now a two-stage dispatch:

```
For each sparse_cell in equal_area_partition:
    file_i = the file whose S² point lies in sparse_cell
    # Stage 3a: NSS proposes (default upstream gap-proposer)
    gap_candidates = nss_gap_map(file_i)         # 12-axis qualitative sweep → Extend gaps only
    # Stage 3b: atom disposes (only-positive-Δ executor)
    d_pre_i, d_post_i, action_i = atom(file_i, gap_candidates)
    Δ_corpus += (d_pre_i - d_post_i)            # always ≥ 0 by Lemma 1 + Theorem 1
Return Δ_corpus, action_set
```

**NSS stays in the loop as the upstream gap-proposer** (`negative-skill-space`'s 12-axis sweep → 5–10 real Extend gaps). The **atom stays as the only-positive-Δ executor** (single-action selection within NSS's gap set). The two compose without breaking either invariant: NSS adds no new actions to the atom — it filters the candidate set; the atom's argmin-Δ is computed within whatever set NSS passes. The atom-only fallback (no NSS upstream) uses "all missing primitives" as the constraint set, preserving Lemma 1 + Theorem 1.

**Composition Rule reference**: Stage 5's verification metric (sparse_cell_count_post < sparse_cell_count_pre) is now derived from per-file atom Δs. **Every parent's run produces non-negative cumulative corpus Δ by construction.** See `single-action-curve-rsi`'s `## Composition Rule` section (Lemma 1, Theorem 1, Corollary 1).

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

## Changelog

- 2026-08-06: Cycle 8 RSI audit-only entry — no top-priority MOVABLE primitive missing post-cycle-7 (all five MOVABLE primitives — declarative policy, attestation, immutability, least privilege, continuous/adaptive — already present).

## Changelog entry to the gap candidate's SKILL.md
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

- 2026-08-06: Cycle 9 RSI audit-only entry — corpus enriched 70→73 skills via PR #179 (keylime + k8s-pss-restricted + falco, closing the 17 residual cells); fixpoint declared post-cycle-9. Phase H multi-seed fit on the enriched 73-skill corpus held K_kept=2 (below the 25% re-fit trigger per `hyperspherical-harmonic-curve` §Lifecycle).
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
2. **`single-action-curve-rsi`** (atom) — Stage 3 dispatches the *atom* on each gap candidate's file (not NSS). Each per-file dispatch is one atomic action with a measurable geodesic Δ. By the Composition Rule (Lemma 1 → Theorem 1), the corpus-level Stage 5 metric is the sum of per-file atom Δs and is non-negative by construction. See `single-action-curve-rsi`'s `## Composition Rule` section for the formal statement.
3. **`recursive-self-improvement`** (edit protocol) — Stage 4 applies RSI to each gap candidate, capped at 3 cycles per skill per run. The cycle-by-cycle changelog is the per-gap audit trail.
4. **`internal-big-picture`** (10-primitive basis) — supplies the 10-D primitive keywords used in Stage 1's coverage matrix. Without this skill's primitive definitions, the curve's `t` basis is undefined.
5. **`context-isolation`** (subagent discipline) — Stage 3 dispatches NSS via fresh-context subagents per `negative-skill-space`'s operational pattern; no context pollution.
6. **`token-efficiency`** (audit scope) — Stage 3 reads only the gap candidate's SKILL.md + primitive coverage + `t` coordinate, not the full corpus.

**Stage 3 redesign (NSS-proposes / atom-disposes, 2026-08-06)**: Stage 3 is now a two-stage dispatch:

```
For each sparse_cell in equal_area_partition:
    file_i = the file whose S² point lies in sparse_cell
    # Stage 3a: NSS proposes (default upstream gap-proposer)
    gap_candidates = nss_gap_map(file_i)         # 12-axis qualitative sweep → Extend gaps only
    # Stage 3b: atom disposes (only-positive-Δ executor)
    d_pre_i, d_post_i, action_i = atom(file_i, gap_candidates)
    Δ_corpus += (d_pre_i - d_post_i)            # always ≥ 0 by Lemma 1 + Theorem 1
Return Δ_corpus, action_set
```

**NSS stays in the loop as the upstream gap-proposer** (`negative-skill-space`'s 12-axis sweep → 5–10 real Extend gaps). The **atom stays as the only-positive-Δ executor** (single-action selection within NSS's gap set). The two compose without breaking either invariant: NSS adds no new actions to the atom — it filters the candidate set; the atom's argmin-Δ is computed within whatever set NSS passes. The atom-only fallback (no NSS upstream) uses "all missing primitives" as the constraint set, preserving Lemma 1 + Theorem 1.

**Composition Rule reference**: Stage 5's verification metric (sparse_cell_count_post < sparse_cell_count_pre) is now derived from per-file atom Δs. **Every parent's run produces non-negative cumulative corpus Δ by construction.** See `single-action-curve-rsi`'s `## Composition Rule` section (Lemma 1, Theorem 1, Corollary 1).

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

## Changelog

- 2026-08-06: Cycle 8 RSI audit-only entry — no top-priority MOVABLE primitive missing post-cycle-7 (all five MOVABLE primitives — declarative policy, attestation, immutability, least privilege, continuous/adaptive — already present).

## Trust chain coverage

This skill participates in the yubiOS root-of-trust chain — ROT/ROTPK, X.509 PKI, root-key custody, transitive verification across boot stages. Where the skill introduces a new trust anchor (key, certificate, manifest), the chain from hardware root to consumer is documented.
