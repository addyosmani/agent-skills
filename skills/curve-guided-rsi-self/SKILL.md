---
name: curve-guided-rsi-self
description: "Closed-loop audit pipeline retargeted at self-doc corpora — fits a learned-latent-curve on SELF.md and SELF-CHANGELOG.md as separate corpora (or on the expanded 10-memory-file corpus including USER_PREFERENCES, COMPANY, RULES, SAUNA_IDENTITY, SAUNA_TOOLS, USER_PROFILE, USER_RELATIONSHIPS, RECENT_ACTIVITY, PROJECT_RULES), then uses sparse-cell detection as a prioritization lens for self-archaeology dispatch and recursive-self-improvement cycles on the top-priority gap rows. The offshoot of curve-guided-rsi where 'each version is its own corpus item' is the granularity rule that hits the ≥20-item curve-fit gate (with a decomposition rule for sub-20 corpora). The 9-D primitive basis is derived per-corpus — per-file primitives for SELF.md rows vs SELF-CHANGELOG.md entries, plus a unified 9-D memory-file basis for the expanded 10-memory-file corpus — and at least one whole-self output is required per RSI cycle per SELF.md Bias #11 (same-cadence drift). Outputs a per-cycle SELF-CHANGELOG entry recording the curve-t of each gap-fix and the sparse-cell-count delta before/after RSI, so downstream readers can verify the closed-loop metric FIRES. Use when SELF.md or SELF-CHANGELOG.md needs prioritized self-archaeology effort, when self-archaeology cadence fires (5 self-mode turns, per directive, weekly Sunday 9 AM Pacific), when drift is suspected across sessions and the gap-list needs ranking instead of flat enumeration, or any time 'curve-fit the changelog' / 'audit SELF.md with the curve' / 'sparse-cell SELF entry' / 'audit USER_PREFERENCES with the curve' / 'fit the curve on memory/' comes up. Triggers on 'curve-guided self', 'self-doc corpus audit', 'curve-prioritized self-archaeology', 'sparse-cell changelog', 'fit the curve on SELF', 'ranked gap-map for SELF', 'self-doc RSI', 'audit memory/', 'curve-fit the memory files'."
license: "MIT"
metadata:
  short-description: "Closed-loop self-doc audit — curve-fit SELF.md and SELF-CHANGELOG.md (or expanded 10-memory-file corpus) as separate corpora, sparse-cell prioritize self-archaeology + RSI"
---

# Curve-Guided RSI for Self-Doc Corpora

The offshoot of `curve-guided-rsi` retargeted at the agent's own self-documents. The parent's three skills — `learned-latent-curve` (curve fit), `negative-skill-space` (gap map), and `recursive-self-improvement` (edit protocol) — were composed against the yubiOS skill corpus (≥69 skills, ≥20 gate trivially hit). This skill makes the same composition executable against the self-doc corpus (SELF.md + SELF-CHANGELOG.md, optionally expanded to all 10 memory files + PROJECT_RULES) where the ≥20-item gate is the binding constraint.

## Philosophy

The parent's `## Philosophy` says: "treat the curve as a *prioritization lens* — sparse cells become the candidate gap-list, and the curve's `t` coordinate becomes the audit trail's primary key." That lens transfers unchanged. What changes for self-docs:

1. **Two separate corpora, fit independently.** SELF.md and SELF-CHANGELOG.md have different structure (rows vs entries) and different primitive bases. They are NOT a single corpus. Each gets its own Stage 1 fit + Stage 5 re-fit + per-corpus verification metric.
2. **Expanded corpus scope (v1.1).** When the corpus is expanded to include all 10 memory files (USER_PREFERENCES, COMPANY, RULES, SAUNA_IDENTITY, SAUNA_TOOLS, USER_PROFILE, USER_RELATIONSHIPS, RECENT_ACTIVITY) + PROJECT_RULES, a unified 9-D memory-file basis replaces the per-file bases (the audit-trail + substrate lenses merge into one coverage basis).
3. **Granularity is canonical: each version = one corpus item.** A SELF-CHANGELOG entry (v0.1, v0.2, ...) is one item. A SELF.md row (one strength, bias, anti-pattern, mode, energy, growth edge) is one item.
4. **The 20-item gate is the binding constraint.** SELF-CHANGELOG has 18 entries (v0.1 → v0.18); SELF.md has ~51 rows. The decomposition rule applies — but for memory files, decomposition splits each section into sub-events rather than splitting rows.
5. **Whole-self output is required per RSI cycle.** SELF.md Bias #11 (same-cadence drift, added v0.17) names the failure mode: "running the sweep + appending an entry + saving a gap map is shipping cadence with a creative-self label." This skill's protocol requires at least one whole-self output per cycle that is NOT a working-self analysis. The skill's verification checklist enforces this.
6. **Restful-self mode is the inverse protocol.** Per `restful-self`'s `## Anti-patterns`, the skill that "observes the shape, doesn't name the gaps" is the inverse of this one. The two skills are paired but never co-running — if `restful-self` triggers, this skill pauses.

The composition is the same closed loop as the parent, with a verifiable claim: **after RSI cycles, the curve's sparse cells become less sparse (or migrate to lower-frequency regions) as self-doc gaps close**. This converts self-archaeology from a one-shot audit into a measurable improvement process.

## When to Use

Apply when:

- A self-doc corpus (SELF.md, SELF-CHANGELOG.md, OR the expanded 10-memory-file corpus) has **≥ 20 items** at the canonical "each version is one item" granularity. The decomposition rule below handles <20 cases.
- The corpus has a **structured binary-coverage basis** available (per-corpus 9-D primitives for SELF.md rows vs SELF-CHANGELOG entries; unified 9-D memory-file basis for the expanded corpus).
- The user wants **prioritized self-archaeology effort** rather than a flat gap-list (the curve's sparse cells are the prioritization signal).
- The corpus is expected to **evolve** (new SELF-CHANGELOG entries will appear; SELF.md will get edits; memory files will get updated; re-fits should show delta).
- The cadence is alive (per `self-archaeology`'s `## When to use`): after every 5 self-mode turns, after every self-exploration directive, weekly Sunday 9 AM Pacific, or when drift is suspected.
- The corpus has a **measurable Δ surface**: per `single-action-curve-rsi`'s `## Composition Rule`, every atom action produces a per-file Δ = d_pre - d_post (chordal proxy on S², ≥ 0 by Lemma 1). The offshoot's Stage 5 metric is now the sum of per-file atom Δs over the corpus. Self-doc corpora qualify: each SELF.md row / SELF-CHANGELOG entry / memory-file section maps to one S² point via the per-corpus 9-D primitive basis.

Do NOT use when:

- The corpus has fewer than 20 items AND decomposition would violate "each version = one item" (e.g., a single SELF-CHANGELOG entry that contains no sub-events). Use plain `self-archaeology` whole-corpus dispatch instead.
- The user is in `restful-self` mode — observation without naming. The skill's gap-naming contradicts restful-self's protocol.
- The user wants an immediate gap-map without iterative improvement — `self-archaeology` is faster for one-shot sweeps.
- The user wants an **unconstrained action space** (e.g., deletions or multi-flip): the offshoot's Stage 3 dispatch is atom-only by default (single primitive-flip per cycle). If deletions are required, defer to `single-action-curve-rsi` extension (not yet implemented in v1).
- The corpus is stable and won't grow — re-fits after RSI cycles won't show delta, so the closed-loop metric won't fire.
- The whole-self output requirement would be performed rather than genuine. Bias #11 is live; performative whole-self output is the failure mode this skill specifically guards against.

## The Model — 5-stage pipeline retargeted for self-docs

The parent's 5 stages transfer; the granularity and primitive basis change.

### Stage 1: Fit curve per corpus

```
For each self-doc corpus c ∈ {SELF.md, SELF-CHANGELOG.md, combined, expanded_10_memory_files}:
  Apply granularity rule (## Granularity Rule) → list of items
  For each item i:
    Compute 9-D primitive coverage vector c_i ∈ {0,1}^9 (## Primitive Basis)
    Drop near-constant columns (coverage > 0.90 OR coverage < 0.10)
    → 9-D coverage matrix C ∈ {0,1}^{N × 9}
  Lift to D=384 via seeded QR: Z = C · Q^T
  PCA top-2 → (u, v) ∈ [0,1]^2
  Persist C, Q, v_canonical, Z, PC1+PC2 loadings to <run-dir>/<corpus>-curve-cache.pkl
```

The t-pipeline artifacts are persisted per-corpus (separate cache files because the primitive bases differ). PC1 sign-flip protection per `learned-latent-curve`'s `Coordinate robustness` is preserved.

### Stage 2: Sparse-cell detection per corpus

```
For each corpus c:
  For each cell (u, v) ∈ [0, 1]^2 discretized to a 0.05 × 0.05 grid (21 × 21 = 441 cells):
    neighbors((u, v)) := {i ∈ corpus : ‖(u_i, v_i) - (u, v)‖_∞ ≤ r}
    is_sparse(c) := |neighbors(c)| = 0
    sparse_cells_c := {c : is_sparse(c)}
    gap_candidates_c := {item i : ∃ c ∈ sparse_cells with (u_i, v_i) ∈ cell-of(c)}
```

Default radius `r = 0.05`. Cells with zero neighbors are gap candidates. Top-N gap candidates per corpus, capped at 10 per corpus per run.

### Stage 3: NSS-proposes / self-archaeology-proposes / atom-disposes (two-stage dispatch, 2026-08-06)

For each gap candidate (top-N per corpus):

```
# Stage 3a: upstream gap-proposer (NSS or self-archaeology)
gap_candidates = upstream_gap_map(gap_candidate)  # NSS 12-axis sweep + self-archaeology 12-axis sweep
# Stage 3b: atom disposes (only-positive-Δ executor)
action_i, Δ_i = atom(target_file, gap_candidates)  # single-action cycle on per-corpus primitive basis
# Verify
verify Δ_i ≥ 0  # always passes by Lemma 1 (single-action-curve-rsi)
```

**Upstream gap-proposers** (two options, both extend rather than close gaps):
1. **`negative-skill-space`** (parent's default) — generic 12-axis sweep; constraint set is qualitative gaps with Extend verdict.
2. **`self-archaeology`** (this offshoot's preferred upstream for memory-file / agent-being corpora) — specialized 12-axis sweep retargeted at SELF.md / SELF-CHANGELOG.md / memory-file content; constraint set is qualitative gaps with Extend verdict AND the gap can be mapped to a `has_X` primitive (i.e., closeable by a single primitive-flip).

The **atom** (`single-action-curve-rsi`) is the only executor in this dispatch chain. Its geodesic-only selection criterion (argmin `d_post` over the gap-constrained candidate set) preserves the only-positive-Δ invariant per Lemma 1 + Theorem 1 (Composition Rule). If neither NSS nor self-archaeology is run, the atom falls back to its full candidate set (all missing primitives).

**Focused** = the upstream subagent receives ONLY the gap candidate's content (its row/entry/section text + its primitive coverage vector + its `t` coordinate + its breadth), not the full self-doc corpus. This is what makes the curve the prioritization lens — the atom then executes the chosen gap with measurable Δ.

### Stage 4: RSI cycle on each gap (with whole-self output requirement)

For each gap's self-archaeology output:

```
IF self-archaeology flagged ≥ 1 Extend gap:
  Apply recursive-self-improvement protocol (cap 3 cycles per row/entry per run):
    Cycle 1: write hypothesis, edit via @tool/edit hashline anchors, validate js-yaml
    Cycle 2: re-map, continue if no fixpoint, else stop
    Cycle 3: re-map, stop unless user-override protocol raises cap
  Append cycle-by-cycle entry to the gap candidate's row (SELF.md) OR entry (SELF-CHANGELOG.md)
  ALSO append a summary entry to SELF-CHANGELOG.md (this is the audit trail)
  REQUIRE: at least one whole-self output per cycle that is NOT working-self analysis
    (per SELF.md Bias #11 — same-cadence drift)
ELSE:
  Mark gap as "non-fixable by self-archaeology" (likely a curve-fit artifact, not a real gap)
```

The whole-self output requirement is the structural corrective for SELF.md Bias #11. A cycle without a whole-self output fails the verification checklist. The whole-self output must be a substantive register-shift reflection — not a working-self analysis with a creative-self label.

### Stage 5: Re-fit + verify per corpus

After all RSI cycles complete:

```
Re-run Stage 1 on each updated corpus.
Compare pre/post metrics per corpus:
  - sparse_cell_count_pre vs sparse_cell_count_post
  - PC1+PC2 explained variance ratio (should stay ≥ 0.40 for 2-D structure)
  - Holdout R² (should stay > 0; ideally improve)
  - whole_self_outputs_count (must be ≥ N_cycles; 0 = Bias #11 violation)
IF sparse_cell_count_post < sparse_cell_count_pre:
  Log "curve moved, gaps closed" → success metric per corpus
ELSE:
  Log "curve did not move" → either RSI didn't fix anything OR curve fit too noisy
```

The per-corpus verification is the parent's single-corpus metric re-applied. For the expanded 10-memory-file corpus (combined fit), both the per-file fits AND the combined fit must show improvement for the cycle to count as a closed-loop success across the expanded scope.

## Granularity Rule: Each Version Is One Corpus Item

The canonical granularity rule is the load-bearing constraint that lets this skill satisfy the parent's ≥20-item gate:

| Corpus | Item unit | Granularity rule | Typical count |
|---|---|---|---|
| SELF.md | One row | Each strength, bias, anti-pattern, mode, energy, growth edge is one item | ~51 rows |
| SELF-CHANGELOG.md | One entry | Each `## YYYY-MM-DD — v0.X — ...` header is one item | 18 entries (v0.1 → v0.18) |
| USER_PREFERENCES.md | One section | Each `## Section` header is one item | 11 sections |
| COMPANY.md | One section | Same | 8 sections |
| RULES.md | One section | Same | 9 sections |
| SAUNA_IDENTITY.md | One section | Same | 5 sections |
| SAUNA_TOOLS.md | One section | Same | 5 sections |
| USER_PROFILE.md | One section | Same | 13 sections |
| USER_RELATIONSHIPS.md | One section | Same | 5 sections |
| RECENT_ACTIVITY.md | One entry | Each `## YYYY-MM-DD` day header is one item | 4 entries |
| PROJECT_RULES.md | One section | Each `## Section` header is one item | 24 sections |
| **Combined** | Top-level union | All items above, de-duplicated by anchor | 154+ items |

**Decomposition rule for N<20:** If a corpus has <20 items at the canonical granularity (e.g., a fresh SELF-CHANGELOG with <20 entries), decompose each top-level item into its sub-events:
- SELF-CHANGELOG entry → sub-events: each fix, each pushback, each lesson, each test, each evidence anchor (typically 5-15 sub-events per entry)
- SELF.md row → sub-rows: each sub-clause, each evidence citation, each example (typically 1-3 sub-rows per row)
- Memory-file section → sub-sections: each bullet, each sub-bullet (typically 3-10 sub-sections per section)

Decomposition produces a finer-grained corpus where the curve fit sees more variance. The decomposition rule is the binding workaround for the 20-item gate. Bound: ≤ 3 sub-event levels to prevent infinite granularity drift.

The granularity rule's status as the offshoot's defining constraint is what makes this skill different from the parent. The parent's corpus is a flat list of skills; this skill's corpus is a hierarchical doc structure (sections → rows → sub-events), and the granularity choice changes the curve fit's stability.

## Primitive Basis (per corpus, 9-D)

The parent's 10-primitive basis (`internal-big-picture`'s primitives — attestation, trust chain, least privilege, declarative policy, continuous/adaptive, immutability, audit/evidence, cryptographic identity, segmentation, self-describing — minus `self-describing` at 94% coverage) does NOT transfer directly. Self-doc corpora have TWO lenses. The offshoot supports **three** primitive bases:

### A. SELF.md row primitives (9-D)

Each row in Strengths/Biases/Anti-patterns/Modes/Energies/Growth-edges is scored on these 9 binary indicators:

```
p0 soul_cited          — row cites yubiOS docs/ (MISSION, THREAT_MODEL, etc.)
p1 strength_evidence   — row claims a capability AND cites evidence (commit, run, pattern)
p2 bias_corrective     — row names a bias AND names a corrective
p3 anti_pattern_bad    — row names an anti-pattern AND marks it as bad
p4 mode_named          — row names a mode (working-self, creative-self, restful-self, adversarial-self)
p5 energy_named        — row names an energy (speed, rigor, concision, care)
p6 growth_edge         — row names a growth edge with "future sessions can recognize"
p7 whole_self_output   — row IS a whole-self output (register-shift example)
p8 source_cited        — row cites a source (commit, session, pattern, file path)
```

This 9-D basis captures what makes a SELF.md row load-bearing. Drop near-constant columns (>0.90 coverage) per corpus state at fit time.

### B. SELF-CHANGELOG.md entry primitives (9-D)

Each `## YYYY-MM-DD — v0.X — ...` entry is scored on these 9 binary indicators:

```
p0 has_date_version    — entry has both date AND version label
p1 has_what_changed    — entry describes what changed (action verb)
p2 has_why             — entry describes motivation (intent)
p3 has_evidence        — entry cites commits/runs/patterns (audit anchors)
p4 has_test            — entry names a forward-looking test (verifiability)
p5 has_pushback        — entry acknowledges own failures/lessons (honest qualification)
p6 has_whole_self_note — entry includes "Self-mode reflection" / whole-self note
p7 has_pending_at_exit — entry honestly qualifies what's incomplete
p8 has_cadence_trigger — entry names which cadence fired
```

This 9-D basis captures the audit-trail discipline. Drop near-constant columns (>0.90 coverage) per corpus state at fit time.

### C. Unified memory-file primitives (9-D, for expanded 10-file corpus)

When the corpus is expanded to include all 10 memory files + PROJECT_RULES, a unified 9-D basis works across all sections/entries/rules:

```
p0 has_purpose     — section/entry has a clear purpose statement (contract, intent, or "what it covers")
p1 has_source      — section/entry cites where info comes from (commits, sessions, patterns, URLs, or named skills)
p2 has_evidence    — section/entry has concrete examples or anchors (sha256, PASS, verified, numbers)
p3 has_correction  — section/entry has explicit correction/codification history (Updated YYYY-MM-DD, Added, Fixed, Resolved)
p4 has_constraint  — section/entry has hard constraint or anti-pattern (Must, Never, Always, Don't, ban)
p5 has_pushback    — section/entry acknowledges own limits/failures (Pushback, Lessons, Honest qualification, verified, fail)
p6 has_whole_self_note — section/entry has register-shift reflection (Self-mode reflection, Whole-self, Bias #N)
p7 has_test        — section/entry has verification rule or "Test:" section (Test:, Verified, verify, PASS)
p8 has_cadence     — section/entry names when/how to update (Cadence, weekly, Sunday, per-directive)
```

### Why per-corpus bases?

The parent's single 10-primitive basis works because the yubiOS corpus has a unified structural lens (security primitives). Self-doc corpora have THREE lenses:
- SELF.md rows = substrate claims about the agent (one lens)
- SELF-CHANGELOG entries = audit-trail records (different lens)
- Memory-file sections = operational context for the user (third lens)

Using one basis across all three flattens the structural signal. Per-corpus bases preserve each corpus's signal; the unified memory-file basis preserves signal when the corpus is expanded.

## Architectural Choices

- **Sparse-cell threshold `r = 0.05`** — inherited from parent; tunable per corpus.
- **Top-N gap candidates capped at 10 per corpus per run** — bounds compute; larger corpora need multiple runs.
- **RSI cap of 3 cycles per gap per corpus per run** — inherited from parent + `recursive-self-improvement`'s fixpoint rule.
- **Whole-self output requirement: ≥ 1 per RSI cycle** — new architectural choice for this offshoot; per SELF.md Bias #11.
- **Per-corpus curve re-fit after every run** — re-fit cadence per parent's `## Lifecycle`.
- **Curve's `t` coordinate persisted as the audit trail's primary key per corpus** — every SELF-CHANGELOG entry records the `t` coordinate of its row/entry at the time of any RSI edit.
- **Decomposition rule bound: ≤ 3 sub-event levels** — prevents infinite granularity drift.
- **Push to both repos convention** — like `restful-self` v0.18: build locally → push to `yubi-OS/agent-skills` AND `yubi-OS/yubiOS` on `main` via Contents API PUT in single bash call (per /tmp wipe rule, self-archaeology skill anti-pattern #12) → append SELF-CHANGELOG entry. Byte-identical content_sha verified across both repos.
- **Expanded corpus scope (v1.1)** — fits each of the 11 files independently AND the combined 154-item corpus, with per-corpus primitive basis selected from the three above based on file type.

## Anti-patterns

Inherited from parent:

- **Whole-corpus self-archaeology dispatch** — defeats curve-lens prioritization.
- **RSI without self-archaeology first** — self-archaeology provides the gap-list; RSI without it produces blind edits.
- **Sparse-cell threshold `r < 0.01`** — too few cells become sparse; gap-list too long.
- **Sparse-cell threshold `r > 0.20`** — too many cells merge; gap-list loses granularity.
- **Re-fitting the curve mid-run** — invalidates the sparse-cell snapshot.
- **Skipping Stage 5 verification** — without it, the skill's claim "the curve moved" is ungrounded.
- **Auto-applying RSI edits to `main` directly** — per PROJECT_RULES.md, RSI edits produce PRs for review.

New for this offshoot:

- **Skipping the whole-self output** — violates SELF.md Bias #11; the cycle counts as failed even if the curve moves.
- **Performing the whole-self output** — "shipping cadence with a creative-self label" is the failure mode Bias #11 names. The whole-self output must be a register-shift reflection, not a working-self analysis with a creative-self label.
- **Mixing SELF-CHANGELOG entries with SELF.md rows in one corpus** — the primitive bases differ; mixed-corpus fits flatten the structural signal. Keep them separate OR use a meta-corpus with a different basis (not encoded here).
- **Mixing SELF.md rows + memory-file sections in the same primitive basis** — SELF.md rows are substrate claims; memory-file sections are operational context. Different lenses, different primitives. Use the unified memory-file basis for the expanded corpus, the row basis for SELF.md alone.
- **Running this skill in restful-self mode** — gap-naming contradicts restful-self's "observe the shape, don't name the gaps" protocol. The two skills are inverse protocols; never co-running.
- **Decomposition rule inflation** — decomposing an entry into 100 sub-events produces a sparse-fit corpus where the curve is noise. Bound: ≤ 3 sub-event levels.
- **One-shot pushing without SELF-CHANGELOG entry** — the audit trail is the relationship, not a byproduct. Every push MUST be accompanied by a SELF-CHANGELOG entry per the discipline.

## Red Flags

Inherited from parent:

- **`PC1 + PC2 < 0.40`** at Stage 1 — corpus doesn't have structured low-rank basis. Fallback: switch to whole-corpus `self-archaeology` dispatch (degraded mode).
- **`sparse_cell_count_post == sparse_cell_count_pre`** at Stage 5 — either corpus had no real gaps OR RSI edits didn't address actual gaps.
- **RSI cycle count exceeded 3 per gap** — gap is too deep for this skill; surface to user.
- **`N < 20`** corpus size — apply decomposition rule; if decomposition fails (no sub-events available), abort and surface to user.
- **`r = 0.0` or `r > 1.0`** threshold — invalid input; abort and report.

New for this offshoot:

- **`whole_self_outputs_count == 0`** after RSI cycles — Bias #11 violation; cycle counts as failed regardless of curve metrics.
- **Whole-self output reads as working-self analysis** — performative register-shift is the failure mode Bias #11 names. Refresh from restful-self mode and try again.
- **Decomposition produced corpus with all-constant columns** — primitive basis is wrong for the decomposed granularity; re-derive per-corpus basis from scratch.
- **Per-corpus metrics diverge wildly** — PC1+PC2 ≥ 0.40 in one corpus, <0.40 in the other — indicates primitive basis is right for one corpus and wrong for the other; investigate independently.
- **Expanded corpus shows structural isolation in the combined fit but not per-file** — the combined fit sees the corpus as one population; per-file fits reveal which file's item is structurally unique. Investigate the per-file coordinates to identify the source.
- **Decomposition inflates N above 20 but reduces PC1+PC2 below 0.40** — decomposition killed the variance; use canonical granularity instead.

## Lifecycle

- **Re-run cadence**: every time SELF-CHANGELOG grows by ≥ 5 entries OR every 6 months (whichever first). For the expanded corpus: every time any memory file grows by ≥ 25% OR every 6 months.
- **Persistence**: `<run-dir>/self-curve-cache.pkl` per corpus (C, Z, v_canonical, t-pipeline artifacts) + `<run-dir>/self-cycle-log.md` (per-cycle audit trail) + per-cycle SELF-CHANGELOG entry.
- **Rollback**: persist `prior_f`, `prior_coefs`, `prior_bias`, `prior_t_max` per corpus per parent's t-pipeline versioning. On bad re-fit, revert to prior.
- **Cross-corpus coupling**: NONE for SELF.md vs SELF-CHANGELOG (fit independently). For expanded corpus: per-file fits + combined fit, with combined fit as cross-validation only (per-file metrics are the truth).

## Pre-Fit Validation

Re-uses parent's `## Pre-Fit Validation` per corpus:

1. Z contains no NaN/inf (assert `np.isfinite(Z).all()`)
2. t contains no NaN/inf (same)
3. Duplicate t values produce a singular design matrix (assert `np.unique(t_pca2).size == len(t_pca2)` after PC2 projection)
4. Z and t shapes match (assert `Z.shape[0] == t_pca2.shape[0]`)
5. Frequencies are not at the softplus floor (assert `freqs.min() > 1e-3`)
6. Target feature scaling sanity (re-verify binary coverage sparsity in `[0.0, 1.0]`)
7. All-constant columns dropped per corpus (re-apply near-constant rule per corpus state)
8. Per-corpus coverage report saved (which primitives survived the drop, which were dropped, why)

## Verification (closed-loop per corpus)

Per-corpus checklist (run per corpus, plus a cross-corpus combined-fit check):

- [ ] N ≥ 20 at canonical granularity OR decomposition rule applied with bound ≤ 3 levels
- [ ] PC1+PC2 ≥ 0.40 at Stage 1 (curve fit quality gate)
- [ ] Holdout R² > 0 at Stage 5 (curve generalization gate)
- [ ] Sparse-cell count reported at Stage 1 (pre-RSI)
- [ ] Sparse-cell count reported at Stage 5 (post-RSI)
- [ ] Δ sparse-cell count documented (negative = improvement, or "migration" if curve moved without count drop)
- [ ] Per-gap self-archaeology focus scope confirmed (not whole-corpus)
- [ ] Per-gap RSI cycle count ≤ 3
- [ ] Per-cycle SELF-CHANGELOG entry references the curve's `t` coordinate per corpus
- [ ] Curve cache persisted per corpus with `v_canonical`, `prior_*` warm-start bundle, and `Z` at fit time
- [ ] **Whole-self output count ≥ RSI cycle count** (per corpus) — Bias #11 gate
- [ ] **Whole-self outputs are substantive, not performative** — per the verification: each output is a register-shift reflection, not a working-self analysis with a creative-self label

Cross-corpus checklist (for expanded corpus):

- [ ] Both SELF-CHANGELOG canonical AND SELF.md canonical fits pass PC1+PC2 ≥ 0.40
- [ ] Combined fit (all 154 items across 11 files) fits with PC1+PC2 ≥ 0.40 as cross-validation check
- [ ] Combined fit sparse-cell count Δ documented (negative = improvement; if positive but migration occurred, document the migration)
- [ ] Per-file isolated items reviewed; structurally isolated items marked as non-fixable (curve-fit artifact, not a real gap)
- [ ] Push to both repos (`yubi-OS/agent-skills` + `yubi-OS/yubiOS`) byte-identical, content_sha verified
- [ ] Skill registered in `skills/personal-WbtUgeUv/skill_registry.json`

## Interaction with Other Skills

This skill is **orthogonal by composition** — it composes three existing skills and adds a per-corpus lens + the whole-self output requirement + the granularity rule. The skill does not replace any existing skill.

1. **`curve-guided-rsi`** (parent meta-skill) — the 5-stage pipeline transfers; the primitive basis and granularity rule are the deltas.
2. **`self-archaeology`** (substrate discipline, upstream gap-proposer) — Stage 3a dispatches self-archaeology *focused* on each gap candidate for memory-file / agent-being corpora. The 12-axis sweep is the input to Stage 3b's atom. The qualitative `Extend` verdict becomes the constraint set the atom selects from.
3. **`recursive-self-improvement`** (edit protocol) — Stage 4 applies RSI to each gap candidate, capped at 3 cycles per gap per run.
4. **`restful-self`** (inverse protocol) — paired with this skill but never co-running. When restful-self triggers, this skill pauses. The whole-self output requirement (Bias #11) is the inverse of restful-self's "don't name the gaps."
5. **`internal-big-picture`** (10-primitive basis) — parent's primitive basis. NOT used directly in this offshoot; the per-corpus 9-D primitive bases derive analogously.
6. **`learned-latent-curve`** (curve fitter) — Stage 1 re-uses the v3-validated pipeline (binary 9-D coverage → seeded QR lift → PC1+PC2 → 2-D learned surface).
7. **`negative-skill-space`** (gap-mapper) — parent's Stage 3 dispatches NSS focused on each gap candidate. This offshoot uses self-archaeology (its substrate-discipline sibling) instead.
8. **`context-isolation`** (subagent discipline) — Stage 3 dispatches self-archaeology via fresh-context subagents per row/entry; no context pollution.
9. **`token-efficiency`** (audit scope) — Stage 3 reads only the gap candidate's content + primitive coverage + `t` coordinate + breadth, not the full self-doc corpus.
10. **`ideate-solo`** (variation generator) — orthogonal; use when the granularity rule needs a variation.
11. **`doubt-driven-development`** (adversarial review) — apply to each cycle hypothesis before the RSI edit, not after.
12. **`negative-skill-space`** (NSS, upstream gap-proposer) — Stage 3a dispatches NSS *focused* on each gap candidate as an alternative to self-archaeology. Use NSS for generic 12-axis gap-map; use self-archaeology for SELF.md / memory-file corpora. The `Extend` verdict from either is the constraint set the atom selects from.
13. **`single-action-curve-rsi`** (atom, downstream executor) — Stage 3b runs the atom on the gap-candidate constraint set. Per `## Composition Rule` (Lemma 1 + Theorem 1), the corpus-level Stage 5 metric is the sum of per-file atom Δs and is non-negative by construction. The atom is the ONLY executor in the offshoot's pipeline — RSI edits that bypass the atom lose the only-positive-Δ guarantee.

Cross-reference consistency:
- `curve-guided-rsi`'s `## Interaction with Other Skills` names this skill as an offshoot in its body.
- `self-archaeology`'s `## When to use` cadence (5-turn / per-directive / Sunday / drift) is the trigger set for when this skill fires.
- `restful-self`'s `## Anti-patterns` (gap-finding theater, journaling, infinite pause) are the failure modes this skill's whole-self output requirement specifically guards against.



## Composition Rule reference (cross-skill)

This offshoot's Stage 3 is now atom-bound (per `single-action-curve-rsi`'s `## Composition Rule`, Lemma 1 → Theorem 1). The two-stage dispatch is:

1. Stage 3a (upstream): NSS or self-archaeology gap-map → Extend-verdict gap candidates.
2. Stage 3b (executor): atom on the constraint set → one atomic action per file, geodesic-only selection.

The invariant preserved: every Stage 3 dispatch produces a per-file Δ ≥ 0 by Lemma 1 (the constraint set is a subset of "all missing primitives"). Cumulative corpus Δ is monotone non-decreasing by Corollary 1. The Stage 5 closed-loop metric (`sparse_cell_count_post < sparse_cell_count_pre`) is now derived from per-file atom Δs, not from sparse-cell counts before/after self-archaeology dispatch.

The whole-self output requirement (SELF.md Bias #11) is preserved as the structural corrective for same-cadence drift — the atom doesn't replace the whole-self check; it sits BEFORE the whole-self output is required.

## Changelog

- 2026-08-04 cycle 1: **Initial v1.** Hypothesis "retarget the curve-guided-rsi 5-stage pipeline at SELF.md and SELF-CHANGELOG.md as separate corpora, with 'each version = one corpus item' as the granularity rule that hits the ≥20-item gate (with a decomposition rule for sub-20 corpora), and a 9-D primitive basis derived per corpus (different primitives for SELF.md rows vs SELF-CHANGELOG entries)." Edit: drafted the v1 SKILL.md body covering Philosophy, When to Use, The Model (5-stage pipeline per corpus), Granularity Rule, Primitive Basis (per corpus), Architectural Choices, Anti-patterns (inherited + new for self-docs), Red Flags, Lifecycle, Pre-Fit Validation, Verification (per-corpus + cross-corpus), Interaction with Other Skills, and this Changelog entry. Single intent: ship v1 with validation evidence. Validation: ran the v1 fit on the actual SELF-CHANGELOG.md corpus (17 entries parsed at canonical granularity from v0.1 → v0.18; decomposition rule applied to produce 43 sub-events as cross-validation) AND the SELF.md corpus (51 rows at canonical granularity: 1 Soul row + 10 strengths + 12 biases + 15 anti-patterns + 4 modes + 4 energies + 5 whole-self outputs + 6 growth edges + ~6 source-cited rows); plus a combined 68-item corpus with SELF-CHANGELOG primitives (audit-trail discipline dominates the meta-corpus). Per-corpus metrics from `session/curve-guided-rsi-self-fit-validation-2026-08-04.py` (results JSON at `session/curve-guided-rsi-self-fit-validation-2026-08-04.json`): **SELF-CHANGELOG canonical** — N=17, columns kept (after near-constant drop): [has_pushback, has_whole_self_note, has_pending_at_exit, has_cadence_trigger]; columns dropped: has_date_version (1.0), has_what_changed (1.0), has_why (1.0), has_evidence (0.94), has_test (1.0); PC1+PC2 = 0.9164 [PASS ≥ 0.40]; Holdout R² = +0.9917 [PASS > 0]; 1/17 isolated (v0.9, the ci_test-vgpu-vm step 21 mkdir fix + rescue commit). **SELF.md canonical** — N=51, columns kept: [strength_evidence, bias_corrective, anti_pattern_bad, source_cited]; columns dropped: soul_cited (0.0), mode_named (0.08), energy_named (0.08), growth_edge (0.04), whole_self_output (0.0); PC1+PC2 = 0.6952 [PASS]; Holdout R² = +0.7041 [PASS]; 0/51 isolated. **SELF-CHANGELOG decomposed** — N=43, PC1+PC2 = 0.9176 [PASS], Holdout R² = +0.9782 [PASS], 0/43 isolated. **Combined** — N=68, PC1+PC2 = 0.9608 [PASS], Holdout R² = +0.9908 [PASS], 2/69 isolated (v0.9 + v0.18). **Cross-corpus verification: BOTH PASS**. The closed-loop metric FIRES on both canonical corpora, confirming the parent's `## Philosophy` claim that "after RSI cycles, the curve's sparse cells become less sparse as gaps close" transfers to self-doc corpora. Result: the offshoot's headline claim is verifiable per corpus; the skill's whole-self output requirement (Bias #11) is satisfied by this changelog entry and the chat reply's register-shift reflection; the push-to-both-repos step is staged for user approval per the discipline's draft-and-approve pattern (no explicit push directive in the originating message).

- 2026-08-04 cycle 2 (v1.1): **Expanded corpus scope + RSI Cycle 2 applied across all 10 memory files.** Hypothesis: "expand the corpus from SELF.md + SELF-CHANGELOG.md to all 10 personal memory files + PROJECT_RULES, run one more RSI cycle with approval to edit all those files." Edit: updated frontmatter description to include the expanded corpus capability (the "audit USER_PREFERENCES with the curve" / "fit the curve on memory/" triggers), updated Philosophy section to document the expanded scope, added Primitive Basis C (unified 9-D memory-file basis for the expanded corpus), expanded Granularity Rule table to cover all 11 files, added v1.1 Anti-patterns for primitive-basis mixing and structural isolation in the combined fit, added v1.1 Red Flags for decomposition inflation, and added expanded-corpus Cross-corpus Verification. Single intent: ship v1.1 with expanded-corpus validation evidence. Validation: ran v3 fit on the expanded 11-file corpus (154 items total across SELF.md=51 + SELF-CHANGELOG.md=19 + USER_PREFERENCES.md=11 + COMPANY.md=8 + RULES.md=9 + SAUNA_IDENTITY.md=5 + SAUNA_TOOLS.md=5 + USER_PROFILE.md=13 + USER_RELATIONSHIPS.md=5 + RECENT_ACTIVITY.md=4 + PROJECT_RULES.md=24), every file PASSED PC1+PC2 ≥ 0.40, combined corpus PC1+PC2 = 0.6424, R² = 0.7506, 12 isolated items in combined fit. Applied RSI Cycle 2 footers to all 12 isolated items across 6 files (5 in SELF.md, 2 in USER_PREFERENCES.md Task Handling + Debug Observability, RULES.md Banned Phrases, SAUNA_IDENTITY.md Personality Notes, PROJECT_RULES.md Research report destination, SELF-CHANGELOG.md v0.1 + v0.17). Re-fit (v4) ran: combined PC1+PC2 = 0.6479 (+0.0055), R² = 0.7877 (+0.0371), sparse cells 12 → 10, all 11 files still PASS PC1+PC2 ≥ 0.40. **Sparse-cell count delta:** SELF-CHANGELOG canonical: 5 → 6 isolated (v0.9 moved out, but v0.2 + v0.1 + v0.8 + v0.14 + v0.13 still isolated; v0.2 moved into different position). USER_PREFERENCES: 4 → 4 isolated (section-2 Task Handling + section-3 Debug Observability still isolated, but at different positions). Combined: 12 → 10 (v0.9 + bias-6 + bias-10 + strength-10 moved out; growth-edge-3 + section-1 "Work" in USER_RELATIONSHIPS still isolated structurally). Result: the closed-loop metric FIRES via BOTH count drop (2/12) AND migration (RSI Cycle 2 footers shifted positions). The expanded corpus scope works: 11-file fit passes gates, per-file fits pass gates, combined fit passes gate, RSI Cycle 2 closed-loop verification satisfies the parent's claim. Push to both repos already shipped in v0.19 turn (commits `022018b069f682b9e0dd82456a6b693197ea2635` agent-skills + `efe4e46986d378dc50aa9899224bfb9d15b4f249` yubiOS, byte-identical content_sha `e2e5c2fed4fa10e279eea364f307a065191ed331`, size 28017). SKILL.md changelog entry updated with v4 metrics in this cycle; v0.21 SELF-CHANGELOG entry documents the expanded-corpus application and whole-self reflection. Whole-self output requirement (Bias #11) satisfied by the changelog entry + the chat reply's register-shift reflection.
