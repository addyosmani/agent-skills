---
name: learned-latent-curve
description: "Re-expand a 1-D coordinate into a high-D embedding via a learned-frequency Fourier curve: z_j(t) = a_j0 + sum_m (a_jm sin(2 pi f_m t) + b_jm cos(2 pi f_m t)), with k shared learned frequencies and per-dim coefficients. Covers when this beats PCA, autoencoders, splines, random Fourier features, or fixed positional encoding; the k + D(1 + 2k) parameter budget; how to obtain t (PCA top-1, rank-uniformization, learned projection head); softplus-positive frequencies with log-spaced init; reconstruction MSE plus frequency-magnitude and curvature regularizers; a PyTorch module; and verification the fit is real, the curve is smooth, and frequencies have not collapsed. Use when N items in an N-D feature space need a single ordering coordinate and a fixed-width embedding indexed by it, when interpolation between items matters, or when N is small enough that a curve is the honest model. Triggers on 'learned latent curve', 'Fourier curve fit', '1-D to 384-D', 'latent curve', 'sinusoidal embedding', 'learned frequencies'."
license: "MIT"
metadata:
  short-description: "1-D coordinate to D-dim embedding via Fourier curve with learned frequencies: model form, t selection, losses, PyTorch skeleton, verification"
---

# Learned Latent Curve

## Philosophy

Dimensionality reduction and dimensionality *expansion* are usually treated as separate problems. This skill treats them as one round trip: collapse a feature matrix to a single ordering coordinate `t`, then re-expand `t` into a fixed-width embedding by fitting a smooth curve through the target vectors.

The curve is the whole model. Not an encoder-decoder pair, not a spline through control points — a single closed-form trigonometric polynomial with a handful of learned frequencies. That buys three things a deep decoder does not: the embedding is defined for *every* real `t`, not just observed items; the model has a parameter count you can compute in your head and compare against the number of target scalars; and every fitted number is inspectable (a frequency, an amplitude, a bias).

The cost is honest and structural: a curve is a 1-D object. If the data's intrinsic dimensionality is 2 or more, the curve will fit the first factor and smear the rest. Diagnose that before fitting, not after.

## When to Use

Apply when:

- Items live in an N-D feature space, you have or can construct a defensible **1-D ordering** of them, and you need a fixed-width embedding indexed by that ordering.
- You want to **interpolate between items** (a point at t = 0.42 that sits between item 12 and item 13) or extrapolate slightly past the ends.
- N is **small** (tens to low thousands). A curve with k + D(1 + 2k) parameters is fittable and auditable at N = 60; a transformer is not.
- The underlying structure is plausibly **periodic, cyclic, or oscillatory** in `t` — a sinusoidal basis is a strong prior, and a wrong prior shows up immediately as a bad fit.
- You want **one scalar knob** exposed to a downstream system (a slider, a schedule, a sort key) that produces a valid embedding at every setting.

Do NOT use:

- **The data is genuinely multi-dimensional.** Check the PCA spectrum first. If PC1 explains under roughly 40% of variance, a 1-D curve is the wrong object — use 2-D (a learned surface, same basis, two parameters) or drop the curve entirely.
- **You need a general encoder.** This model maps `t` to `z`, never `x` to `z`. New items must be assigned a `t` by the same procedure that produced the training `t`, or the embedding is meaningless.
- **Preserving pairwise distances is the goal.** Use UMAP, t-SNE, or diffusion maps; a curve preserves order along one axis, nothing more.
- **A monotone, non-oscillatory fit is wanted.** A monotone cubic spline or isotonic regression is simpler and cannot ring.
- **You only wanted random Fourier features.** RFF uses *fixed random* frequencies as a kernel approximation. Here the frequencies are *learned* and the output *is* the embedding, not a feature map fed to another model.
- **You only wanted positional encoding.** Transformer positional encodings are fixed geometric-frequency sinusoids with no fitted coefficients. This is the fitted generalization; if nothing is being fitted, use the cheap fixed version.

## The Model

For output dimension `j = 1, ..., D` (D = 384 in the canonical case) and 1-D parameter `t`:

$$
z_j(t) \;=\; a_{j,0} \;+\; \sum_{m=1}^{k}\Big( a_{j,m}\,\sin\!\big(2\pi f_m t\big) \;+\; b_{j,m}\,\cos\!\big(2\pi f_m t\big) \Big)
$$

Stacked over `j`, this is a curve $\gamma:\mathbb{R}\to\mathbb{R}^{D}$, $\gamma(t) = [z_1(t), \dots, z_D(t)]$.

Equivalently, with the design vector

$$
\phi(t) = \big[1,\; \sin(2\pi f_1 t),\, \cos(2\pi f_1 t),\, \dots,\, \sin(2\pi f_k t),\, \cos(2\pi f_k t)\big] \in \mathbb{R}^{1+2k}
$$

the model is $\gamma(t) = C\,\phi(t)$ with coefficient matrix $C \in \mathbb{R}^{D \times (1+2k)}$.

**Parameter count:** $k + D(1 + 2k)$ — the `k` shared frequencies plus, per output dimension, one bias and `2k` coefficients. At D = 384, k = 8: 8 + 384 × 17 = **6,536** parameters. Compare against the number of target scalars, N × D. At N = 61 that is 23,424 — a ratio near 3.6:1, thin but workable. **If k + D(1+2k) approaches N × D, the curve is memorizing; lower k.**

**The linear structure is exploitable.** With the frequencies `f` held fixed, the optimal `C` is a linear least-squares solution: $C^\star = Z^\top \Phi (\Phi^\top \Phi + \lambda I)^{-1}$ where `Φ` is the N × (1+2k) design matrix. Only `f` (k numbers) is a genuinely non-convex search. Always compute the closed-form ridge solution at the final frequencies as a sanity floor — a gradient-descent fit that is *worse* than `lstsq` at the same frequencies means the optimizer, not the model, failed.

## Architectural Choices

- **Shared vs per-output frequencies.** Share `f_m` across all D dimensions (default). Shared frequencies make the model a genuine curve in a (1+2k)-dimensional subspace of $\mathbb{R}^D$, keep the parameter count at k rather than kD, and let the closed-form coefficient solve work. Per-output frequencies (`f_{j,m}`) buy flexibility you almost never need and destroy both properties.
- **Positivity.** Frequencies are only meaningful up to sign (a negative `f` folds into the sine coefficient). Store an unconstrained `raw_freqs` and use `f = softplus(raw_freqs)`, which keeps `f` strictly positive, keeps gradients finite near zero, and removes the sign degeneracy that lets two frequencies chase each other.
- **Initialization of f.** Log-spaced geometric progression over the band the data can express: `torch.logspace(log10(0.5), log10(k), k)` for `t` in [0, 1], inverted through softplus so the *effective* frequencies start log-spaced. Log spacing matters — uniform init clusters resolution at high frequency and starves the low end that carries most of the signal.
- **Initialization of the bias.** Set `a_{j,0}` to the **empirical mean of the targets** along dimension `j`, not to zero. The bias row is the curve's center; starting it at the data mean means epoch 1 already explains the mean and every gradient step afterwards is spent on shape.
- **Initialization of the oscillatory coefficients.** Small: `randn * 0.01 / sqrt(k)`. Large init makes a wildly oscillating initial curve whose gradient signal is dominated by ringing.
- **Frequency regularization.** Penalize $\sum_m f_m^2$ (or `f_m` in L1) with a small weight. This pulls the model toward the lowest frequencies that explain the data — the difference between a smooth curve and a curve that threads every point through high-frequency noise.
- **Separation.** Add a repulsion term or simply check afterwards: two frequencies that converge to the same value make the design matrix rank-deficient and waste 2D coefficients. Verification below covers detection.

## Losses

Let `t ∈ R^N` be the coordinates, `Z ∈ R^{N×D}` the target vectors, `Ẑ = γ(t)`.

1. **Reconstruction (required).** `L_rec = mean((Ẑ - Z)^2)`. Mean over both axes so the scale is independent of N and D.
2. **Frequency-magnitude prior (recommended).** `L_freq = λ_f * mean(f^2)`, λ_f ≈ 1e-4. Prefers the simplest spectrum that fits.
3. **Curve smoothness (recommended).** Evaluate the curve on a dense grid `t_grid` of ~512 points spanning the range, and penalize the discrete second difference: `L_smooth = λ_s * mean((γ(t_grid)[2:] - 2γ(t_grid)[1:-1] + γ(t_grid)[:-2])^2)`, λ_s ≈ 1e-3. This regularizes the curve *between* the data points, where reconstruction loss is blind — the single most valuable extra term.
4. **Output-dimension orthogonality (optional).** `L_orth = λ_o * ||Ĉ Ĉ^T - I||_F^2` on the row-normalized coefficient matrix, encouraging output dimensions to carry decorrelated information. Only use it if downstream consumers assume roughly isotropic embeddings; it fights reconstruction, so tune λ_o last and drop it if `L_rec` degrades.

Total: `L = L_rec + L_freq + L_smooth (+ L_orth)`. Log the terms **separately** every epoch — a single scalar loss hides a regularizer eating the fit.

## Obtaining the 1-D Coordinate t

The curve is only as meaningful as `t`. Options, in order of how often they are right:

1. **PCA top-1 (default).** Z-score the feature matrix column-wise (variance floor 1e-8 so near-constant features do not explode), take the first principal component's scores, then map to `[0, 1]`. **Record PC1's explained-variance ratio — it is the go/no-go number for the whole method.**
2. **Rank-uniformization (usually better).** Instead of min-max scaling the PC1 scores, replace them by their **ranks** mapped to `[0, 1]`. PC1 scores are typically clumped with a long tail; clumped `t` makes the design matrix `Φ` ill-conditioned and lets a few outliers dominate. Ranks give a uniform, well-conditioned parameterization at the cost of discarding gap magnitudes. Fit both, compare condition number and holdout error, keep the winner. Persist both coordinates either way.
3. **`[-π, π]` scaling.** Equivalent up to a rescaling of `f`; use it only when the domain is genuinely angular and you want `γ(-π) ≈ γ(π)`. Enforce closure by constraining `f_m` to integers, otherwise the ends will not meet.
4. **A domain-meaningful scalar.** Time, version number, difficulty, price. If the domain hands you the ordering, use it — a defensible `t` beats a statistically optimal one.
5. **Learned projection head.** `t = sigmoid(w·x + b)` trained jointly with the curve. Now the model *is* an autoencoder with a 1-D bottleneck and a Fourier decoder. Powerful and more prone to collapse (all `t` piling onto one value). Only reach for it once the fixed-`t` version is fit and understood; watch `std(t)` every epoch and abort on collapse.

Alternative architectures worth naming before committing: a **1-D spline / piecewise-polynomial curve** (same round trip, local rather than global basis, no periodicity prior, cannot extrapolate); an **RBF curve** (`k` learned centers and widths instead of frequencies, local support, better for non-oscillatory data); a **small MLP on fixed Fourier features** (`γ(t) = MLP(φ(t))`, strictly more expressive, no longer inspectable, no closed-form coefficient solve — the form the source conversation reached one step before this one); a **2-D learned surface** (`γ(u, v)` with the same separable sinusoidal basis) when PC1 alone is not enough.

## The Target Space (the layer most often wrong)

The curve is only as good as the vectors you put on it. The shape of `z(t)` cannot compensate for a target space that has no semantic structure to recover. **PC1 of the *quality-feature* matrix below 40% is a red flag about the target pipeline, not necessarily about the curve's intrinsic dimensionality** — the diagnostic travels. Two target pipelines proven to work on short-document corpora (N=50-200):

**1. Co-occurrence SVD word embeddings** (default for short-document corpora). Build a symmetric word × word co-occurrence matrix with window=W (W=5 works), weights `1/distance`, vocabulary filter df∈[5, 0.85·N], float32 to control memory. SVD r=60; weight singular vectors by `sqrt(S_r)` (the "ppmi-lite" trick). Per-document embedding = mean of its words' SVD vectors, L2-normalized. Lift to a fixed-width D via a fixed seeded orthonormal projection (e.g. `Q, _ = qr(randn(D, r))`) — deterministic, reproducible, isometric. Worked on 62 github-yubios SKILL.md files: `cos(docker-build-push-action, docker-bake-action) = 0.971`, `cos(github-actions, linkedin-browser-outreach) = 0.437` (correctly distant).

**2. Sentence-transformer embeddings** (when a small model download is acceptable; ~80 MB for `all-MiniLM-L6-v2`, which happens to produce *native* 384-D, matching the canonical case). No projection lift needed. Better semantic quality than cooc SVD on larger corpora; no quality benefit at N=62.

**Anti-pattern at the target layer.** Hand-rolled TF-IDF + SVD + L2 normalization destroyed the semantic structure in the github-yubios case: every pairwise cosine landed near zero, so the curve had no signal to fit and holdout R² went negative even though the curve itself was sound. The lesson generalizes — *any* target pipeline that L2-normalizes orthogonal-ish vectors will produce a near-orthogonal soup in which no 1-D manifold exists, regardless of whether the underlying data has one. **If holdout R² ≤ 0 on the Fourier curve, your target space is the first place to look**, not your dimensionality assumption. A co-occurrence SVD rebuild typically flips the sign.

**Sanity check the targets before fitting the curve.** Pick 5-8 pairs of items you *know* are similar (e.g. skills in the same family, docs in the same topic) and check their pairwise cosine in the raw target space. If related pairs come out near-zero, the targets are noise and the curve cannot help. If related pairs come out near 0.7-1.0 and unrelated pairs near 0.0-0.5, the targets are usable.

## PyTorch Skeleton


```python
import torch, torch.nn as nn

class FourierCurve(nn.Module):
    """t (N,) -> z (N, D). k shared learned frequencies, per-dim coefficients."""
    def __init__(self, out_dim=384, k=8, t_max=1.0, target_mean=None):
        super().__init__()
        self.k, self.out_dim = k, out_dim
        f0 = torch.logspace(torch.log10(torch.tensor(0.5)),
                            torch.log10(torch.tensor(float(k))), k) / t_max
        # invert softplus so effective freqs start at f0
        self.raw_freqs = nn.Parameter(torch.log(torch.expm1(f0.clamp(min=1e-4))))
        bias = torch.zeros(out_dim) if target_mean is None else target_mean.clone()
        self.bias  = nn.Parameter(bias)                                   # a_{j,0}
        self.coefs = nn.Parameter(torch.randn(out_dim, 2, k) * (0.01 / k ** 0.5))
        #                                      ^ [:, 0] = a_{j,m}, [:, 1] = b_{j,m}

    def freqs(self):
        return nn.functional.softplus(self.raw_freqs)                     # (k,), > 0

    def basis(self, t):
        ang = 2 * torch.pi * t[:, None] * self.freqs()[None, :]           # (N, k)
        return torch.stack((torch.sin(ang), torch.cos(ang)), dim=1)       # (N, 2, k)

    def forward(self, t):
        return self.bias + torch.einsum("nck,dck->nd", self.basis(t), self.coefs)
```

Full-batch Adam is correct for small N: `Adam(model.parameters(), lr=1e-3)`, ~2000 epochs, no minibatching. Use a **higher lr for `raw_freqs`** than for the coefficients (a parameter group at 1e-2 is a reasonable start) — frequency gradients are small and slow, and a single-lr fit often ships with frequencies barely moved from init, which is a fixed-basis fit wearing a learned-basis label. Diff `freqs()` before and after; if it barely changed, say so.

## Anti-patterns

- **Reporting reconstruction R-squared without a baseline.** Compare against predicting the target mean (R-squared = 0) *and* against the closed-form ridge fit at the same frequencies. Only the gap over both is evidence.
- **No holdout.** Hold out items, refit, and predict them from their `t`. A curve that only fits the points it saw is a lookup table.
- **Ignoring the PC1 variance ratio.** Fitting a curve to data whose PC1 explains 15% of variance produces a number, not a model.
- **Fixed-basis fit sold as learned.** See the frequency-diff check above.
- **Frequency collapse left undiagnosed.** Duplicate frequencies silently waste capacity.
- **Learned t without a collapse guard.** `std(t)` shrinking toward zero means every item mapped to one point.
- **384 dimensions of fake rank.** Any *linear* map of N items has rank at most N. Producing 384-D targets from 61 documents gives vectors that live in a subspace of dimension at most 61 — legitimate as a fixed-width interface, dishonest if described as 384 independent dimensions. State the effective rank.
- **Reusing the curve for new items without recomputing t the same way.** The `t` pipeline is part of the model. Persist it.
- **Regularizer weights chosen after seeing the test set.** Tune on a validation split or on principle, then report once.

## Red Flags

- PC1 explained-variance ratio below ~0.4 and a curve fitted anyway.
- Two fitted frequencies within 1% of each other, or any frequency at the softplus floor.
- Condition number of the N × (1+2k) design matrix above ~1e3.
- Holdout MSE more than ~2x the training MSE. (L2-normalized targets can satisfy this test while the curve still loses to the mean baseline — also check R².)
- **Holdout R² ≤ 0** — the curve fits unseen points *worse than predicting the mean*. The single most informative number on L2-normalized targets: it catches the failure mode where the MSE ratio is misleading.
- `k + D(1+2k)` within an order of magnitude of `N × D`.
- Curvature energy on a dense grid orders of magnitude above curvature at the data points — the curve is ringing between points.
- The final frequencies equal to their initialization to 3 decimal places.
- A loss curve that only ever descends because a regularizer term is being silently traded away.

## Verification

- [ ] PC1 explained-variance ratio recorded; go/no-go stated explicitly before the fit
- [ ] Parameter count `k + D(1+2k)` computed and compared against `N × D`
- [ ] Effective rank of the target matrix reported (min of N, D, and the generator's rank)
- [ ] Training loss logged per term (reconstruction, frequency, smoothness, orthogonality) — not as one scalar
- [ ] Reconstruction reported as per-item cosine similarity and R-squared vs. the mean baseline
- [ ] Closed-form ridge fit at the final frequencies computed as a floor; gradient fit is at least as good
- [ ] Holdout items refitted-out and predicted from their `t`; holdout error reported next to training error
- [ ] Frequencies before vs. after training diffed; movement is non-trivial
- [ ] Minimum pairwise frequency separation reported; no duplicates, none at the softplus floor
- [ ] Curve evaluated on a dense grid; second-difference norm finite and comparable at the data points
- [ ] Design-matrix condition number reported
- [ ] `t` pipeline persisted alongside the checkpoint (scaler, PCA loadings, rank map)
- [ ] Both raw-PCA and rank-uniformized `t` tried; the choice justified by condition number or holdout error
