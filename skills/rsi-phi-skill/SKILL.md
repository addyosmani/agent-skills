---
name: rsi-phi-skill
description: "Recursive self-improvement on the Fibonacci sphere — uses Vogel's golden-angle sphere sampling (i = t, so the Fibonacci index IS the parameter) and the native Y_3^3 = K sin³θ · cos(3φ) real spherical harmonic as the basis, extended to higher SH degree/order (ℓ=128/m=256 or vice-versa) for 384 symmetric azimuthal lobes. Deep-research subagents per cycle. Bounded hyper-sphere RSI loop, like recursive-self-improvement but on the Riemann-sphere parameter manifold instead of the flat [0,1]² line. Use when you want RSI on a manifold-shaped corpus (skill files, refs/, deep-research outputs) where the parameter t is naturally an azimuthal index, not a linear progress bar; when you need the basis itself to expose its 3-fold (or 384-fold) azimuthal structure on the sphere; or any time 'phi-indexed RSI', 'Fibonacci sphere skill corpus', 'sphere-aware recursive improvement', 'azimuthal lobe primitive', or 'phi-skill cycle' comes up. NOT for: flat-[0,1]² RSI (use recursive-self-improvement directly), single-file atom RSI (use single-action-curve-rsi), or non-recursive audits (use negative-skill-space)."
license: "MIT"
metadata:
  short-description: "Phi-indexed RSI on the Fibonacci sphere (i=t, Y_3^3 + 384 lobes)"
---

# RSI-Phi Skill

A **Fibonacci-sphere variant** of `recursive-self-improvement`. The standard RSI loop fits a curve on the flat `[0,1]²` parameter manifold; this skill fits the same loop on the **Riemann sphere** `S²` sampled by Vogel's golden-angle Fibonacci scheme, with the native `Y_3^3(θ,φ) = K sin³θ · cos(3φ)` real spherical harmonic as the per-item basis, extended to `(ℓ=128, m=256)` (and the reverse) for **384 symmetric azimuthal lobes**.

The two design moves that make this different from `recursive-self-improvement`:

1. **Fibonacci index `i` plays the role of `t`.** Because `φ_i = 2π·i/φ_golden` and `cos θ_i = 1 - (2i+1)/N` are closed-form in `i`, no lookup table is needed — the corpus item at position `i` IS the parameter point on the sphere. This collapses `i → (θ, φ)` into `O(1)`.
2. **Native basis `Y_3^3`, extended to `(ℓ, m)` with 384 azimuthal lobes.** `cos(3φ)` is the 3-fold azimuthal probe; `cos(384φ)` = 384-fold (384 = 2⁷·3) is the high-resolution extension that still keeps the `sin³θ` polar factor. The skill's basis is `sin³θ · cos(mφ)` with `m ∈ {3, 128, 256, 384}` — the user tests BOTH orderings `(ℓ=128, m=256)` AND `(ℓ=256, m=128)` and reports which passes the gate.

The corpus scope matches `recursive-self-improvement`: any `SKILL.md` (one corpus item per skill) OR a `refs/*.md` corpus (one item per deep-research file). The bounded cycle cap is 3 (3-cycle RSI default), fresh-context subagent per cycle in self-mode.

## When to use

- You want RSI on a corpus where the items have a **natural azimuthal ordering** (time-stamped docs, ordered refs/, versioned SKILL.md files) and the flat `[0,1]²` line is the wrong shape.
- You want the **basis itself** to expose an azimuthal structure (3-fold, 384-fold) so the sparse-cell detection picks up phase coherence, not just scalar saturation.
- You want to compare **two parameterizations** (`(ℓ=128, m=256)` vs `(ℓ=256, m=128)`) on the same corpus to learn which direction of the SH degree-order trade-off wins for the corpus.
- You want **deep-research per cycle** as the cycle's hypothesis-proposal step — the cycle is not just gap-map → edit, it's gap-map → deep-research-subagent → edit.

## When NOT to use

- The corpus is `1-D` (time series, version sequences) and `t` doesn't have azimuthal structure. → use `recursive-self-improvement` (flat-line default).
- One file, one edit, one geodesic delta. → use `single-action-curve-rsi` (atomic atom).
- You don't want a recursive loop at all — just an NSS sweep. → use `negative-skill-space`.
- The corpus has non-orientable topology or a non-trivial fundamental group. The Fibonacci sphere is `S²`, hard-coded.

## The math — 3-equation Fibonacci-sphere block

For `N` corpus items indexed by `i = 0, 1, …, N-1`:

```latex
\begin{equation}
\phi_i = 2\pi \frac{i}{\varphi}, \qquad
\cos\theta_i = 1 - \frac{2i+1}{N}, \qquad
\varphi = \frac{1+\sqrt{5}}{2}.
\end{equation}
\begin{equation}
\Re\{Y_3^3(\theta,\phi)\} = K \sin^3\theta\,\cos(3\phi), \qquad
K = \sqrt{\frac{245}{64\pi}}.
\end{equation}
\begin{equation}
b_i = \bigl[\,\Re\{Y_{\ell_1}^{m_1}\},\; \Re\{Y_{\ell_2}^{m_2}\},\; \ldots\,\bigr]
      = \bigl[\,\sin^3\theta_i\cos(m_1\phi_i),\;\sin^3\theta_i\cos(m_2\phi_i),\;\ldots\,\bigr]
\end{equation}
```

Three roles:

1. **Fibonacci sphere sampling** (`i = t`): `θ_i` and `φ_i` are closed-form in `i`. The Fibonacci index `i` plays a dual role as the corpus index AND as the latent parameter — `t = i/N` survives unchanged.
2. **Native basis `Y_3^3`**: real form `K sin³θ cos(3φ)`, Condon-Shortley normalization, 3-fold azimuthal symmetry. The `sin³θ` factor vanishes at the poles and peaks near the equator; `cos(3φ)` folds the 3-fold structure into the embedding.
3. **Per-item basis vector `b_i`**: a 384-D vector where each component is a `sin³θ_i · cos(mφ_i)` lobe with `m` ranging over a fixed set (default: `{3, 6, 9, …, 384}` for 384 symmetric azimuthal lobes — i.e. `m = 3·k` for `k = 1, 2, …, 128`). The user can swap `m` for `(ℓ, m)` SH-pairs at `(ℓ=128, m=256)` or `(ℓ=256, m=128)` and the pipeline still works (the `sin³θ` polar factor is replaced by `sin^ℓ θ`).

The full coverage `c_i ∈ ℝ^{384}` for corpus item `i` is just the basis vector: `c_i = b_i`. Then the per-item primitive coverage (was the skill's content present at this lobe?) is a binary mask of which `m`-values are **non-zero for this item's content**. By construction every basis vector is non-zero (Fibonacci sampling never puts a point exactly on a zero of `cos(mφ)`), so the primitive coverage saturates at 384/384 for every item. **The interesting primitive is the per-item COVERAGE DELTA**: which lobes does this item's content *activate* under the SH projection?

## The pipeline (per cycle)

Per `recursive-self-improvement` §5-step shape, adapted to `S²`:

1. **Gap-map** via `negative-skill-space` (12-axis sweep) on the target SKILL.md → list of candidate edits.
2. **Hypothesis proposal** — a deep-research subagent (`parallel-deep-research`) is dispatched with the gap-map and a Fibonacci-sphere parameter `t = i/N` (the Fibonacci index is the cycle's `t`). The subagent proposes ONE single-action edit per cycle, choosing the lobe that flips the most primitive coverage in the 384-D basis.
3. **Edit** — the human-approved hypothesis is applied to the SKILL.md.
4. **Re-map** — recompute the corpus's 384-D coverage vectors under the Fibonacci-sphere basis; project to `S²` via PCA top-2 → stereographic lift; fit γ(t) on the real SH basis (L=3, 16 fns) with closed-form ridge `λ=1e-3`; compute chordal residuals per item.
5. **Fixpoint rule** — if no new gaps opened AND the cycle's edited lobe closed a prior gap AND no new anti-patterns appeared → terminate the loop. Else cycle+1 (cap 3 cycles in default mode).

## Modes

### Improvement mode (default)

Input is a Fibonacci-sphere coverage of any corpus: skill files, `refs/*.md`, or a deep-research output set. The loop closes the gaps on that target corpus. Cycle 1 is gap-closing; subsequent cycles catch edit-induced gaps.

### Self-mode

Input is the skill itself. Cycle 1 is gap-mapping (apply `negative-skill-space` to `rsi-phi-skill`); cycle 2 onward is gap-closing on the self-references the gap-map surfaces. Self-mode is more prone to self-author bias — the entity that wrote the skill is the entity reviewing it.

**Mitigation:**

- Pass each edit hypothesis through `doubt-driven-development` before editing.
- **Use a fresh-context subagent (`context-isolation`) for every cycle in self-mode, not just the gap-map step.** Cycle 2+ in main-thread context re-introduces the author bias that cycle 1 mitigated. Mandatory.
- If the re-map keeps disagreeing with the author's intuition, that's the signal the author is wrong, not the map.

## The output of a cycle

Three artifacts, like `recursive-self-improvement`:

1. **Edited SKILL.md** — the real change.
2. **One changelog line** appended to `## Changelog`.
3. **A fixpoint or "continue" verdict** — explicit, not implied.

When the loop closes:

```markdown
## Changelog
- 2026-08-07 cycle 1: Hypothesis "The native basis (ℓ=3, m=3) → (ℓ=128, m=256) lobe swap under-fills the 384-D basis; the loop only sees phase coherence in 3 lobes, not 384." Edit: added §"Per-item basis vector `b_i`" with the `(ℓ, m)` lobe enumeration. Result: re-map shows new sparse cells at `m ∈ {6, 12, …, 384}` — fixpoint not reached; cycle 2 required.
- 2026-08-07 cycle 2: Hypothesis "..." Edit: ... Result: re-map clean; fixpoint reached.
```

## Constraints (hard rules — silent substitution is forbidden)

1. **MUST** use `φ_golden = (1+√5)/2` for canonical Fibonacci indexing. Don't substitute `π` (Vogel's spiral variant) or `(1+√5)/2 · π` (Saff-Kuijlaars variant) without explicit renaming.
2. **MUST** use Condon-Shortley normalization `K = √(245/(64π))` for `Y_3^3`. Don't drop the phase; this is the standard `dlmf.nist.gov` convention.
3. **MUST NOT** swap `Y_3^3` for another `Y_ℓ^m` without re-deriving the closed-form real part. The `sin³θ · cos(3φ)` factorization is `(ℓ=3, m=3)`-specific.
4. **MUST NOT** apply the Fibonacci sphere to non-orientable surfaces or manifolds with non-trivial topology — `S²` is hard-coded in the projection `Π_{S²}(z) = z / ‖z‖`.
5. **MUST** test BOTH `(ℓ=128, m=256)` AND `(ℓ=256, m=128)` orderings in the cycle's parameterization step. The skill's gate is the higher PC1+PC2 of the two (the sparse-cell signal picks which order loses less information).
6. **MUST** use `i = t` (Fibonacci index IS the parameter), not a separate lookup table. The closed-form `cos θ_i = 1 - (2i+1)/N` and `φ_i = 2π i/φ_golden` make `i → (θ, φ)` an `O(1)` operation.
7. **NEVER** use the latitude-longitude grid as a drop-in replacement for Fibonacci sampling in this skill — the cycle's gate specifically measures the Fibonacci-vs-lat-long discrepancy.

## Cycle parameterization

| Parameter | Default | Alternate (test both) |
|---|---|---|
| N (sample count) | `len(corpus)` | `256`, `384`, `1024` |
| ℓ (degree) | 3 (native Y_3^3) | 128, 256 |
| m (order) | 3 (native Y_3^3) | 256, 128 |
| φ_golden | (1+√5)/2 | — (canonical only) |
| K (normalization) | √(245/(64π)) | — (canonical only) |
| Number of lobes | 1 (native 3-fold) | 128 (= 384 / 3), 384 |
| α (modulation amplitude) | 0 (no modulation) | 0.1, 1.0 |

For 384 lobes with `m = 3·k` for `k = 1, …, 128`: the basis is `sin³θ · cos(3kφ)` for each `k`. For 384 lobes with `(ℓ, m)` SH-pairs: 192 lobes use `(ℓ=128, m=256)`, 192 use `(ℓ=256, m=128)`.

## Sources

- **Fibonacci sphere / Vogel's spiral** — Vogel, H. (1979) "A better way to construct the sunflower head"; Saff, E.B. and Kuijlaars, A.B.J. (1997) "Distributing many points on a sphere" (Mathematical Intelligencer 19(1), 5–11).
- **Spherical harmonics** — `Y_ℓ^m` standard complex form, Condon-Shortley normalization. NIST DLMF chapter on spherical harmonics: `dlmf.nist.gov`.
- **The two y33 papers this skill is built on**:
  - `refs/y33-fibonacci-sphere-paper-method-equation-block-2026-08-07.md` — the 3-equation LaTeX block that maps the paper's latent curve `c(t)` onto `S²` via Fibonacci sampling and `Y_3^3` modulation.
  - `refs/y33-fibonacci-sphere-paper-revised-passage-2026-08-07.md` — the table-based revised passage patch for the paper's hyperspherical-harmonic section.
- **Skills (yubiOS tree)**:
  - `recursive-self-improvement` — the parent skill; this skill is a Fibonacci-sphere variant.
  - `hyperspherical-harmonic-curve` — the `S²` basis swap (this skill inherits its `S² → γ(t)` math).
  - `learned-latent-curve` — the curve fitter; the `γ(t)` closed-form ridge is the same.
  - `single-action-curve-rsi` — the atomic atom; per-cycle gap-map → hypothesis step can use it.
  - `negative-skill-space` — the 12-axis gap-mapper; cycle 1 starts here.
  - `parallel-deep-research` — per-cycle deep-research subagent.
  - `doubt-driven-development` — per-hypothesis supplement in self-mode.

## Cross-references

- **Recursive-self-improvement** (this skill's parent).
- **Curve-guided-rsi** (the bounded RSI loop this skill inherits the 3-cycle default cap from).
- **Parallel-deep-research** (per-cycle subagent dispatch).
- **Refs corpus** at `yubi-OS/yubiOS/refs/` — primary corpus this skill operates on.
