---
name: curved-corpus-create
description: >-
  Generate binary corpora with PRESCRIBED curved structure — a planted S² spherical-harmonic signal on
  a Fibonacci golden-angle lattice at chosen amplitude, N, d — together with matched null corpora
  (curveball, column-permutation, iid), a calibration pack (signal-recovery curve, false-positive
  rate, detection threshold), and an IS-THIS-X placement of any supplied N×d binary matrix against the
  generated reference families. Use when you need ground truth for a curve/coverage measurement —
  calibrating V₂ or the PC1+PC2 gate, asking "would this pipeline detect a signal if one were there",
  setting a detection threshold, sizing N, validating a single-action atom's Δ on known curvature,
  producing Hodge or ordering-permutation nulls, or placing a real corpus (yubiOS, NIST, CIS,
  SCAP-SSG) in null-standardized statistic space with exclusion-style verdicts. Trigger phrases:
  "planted signal", "synthetic corpus", "ground truth", "null model", "curveball", "false positive
  rate", "statistical power", "detection threshold", "is this signal real", "calibrate V2", "standard
  candle", "positive control", "is this X". NOT for measuring a corpus you already trust (use
  hyperspherical-harmonic-curve), and NOT for running an RSI improvement loop (use rsi-phi-skill).
---

# curved-corpus-create

The generative inverse of the RSI curve regime. Every other skill in the family
(`rsi-phi-skill`, `hyperspherical-harmonic-curve`, `single-action-curve-rsi`,
`guided-curve-ideate`) **measures** a corpus and reports a number. None of them
can say what that number would have been had the structure been *known*. This
skill manufactures corpora whose curvature is prescribed by construction, so
every measurement in the regime finally has a calibrated ground truth.

It is the **standard-candle factory**. Four jobs:

1. **Generate** a corpus with a planted S² spherical-harmonic curve at a chosen
   amplitude, N, d, and mode count — or a latent-class mixture, or a null.
2. **Generate matched nulls** — curveball (row *and* column sums preserved),
   column-permutation, iid.
3. **Emit a calibration pack** — signal-recovery curve, false-positive rate,
   detection threshold — that any measurement skill can cite instead of
   asserting significance by narrative.
4. **Place** any real N×d binary matrix in the IS-THIS-X question space, with
   exclusion-style verdicts against the generated reference families.

## When to use

- Before believing any V₂, gate, or residual number from the regime. The number
  is meaningless without the null it is standardized against.
- When you need statistical **power**, not just a point estimate: "at N=200,
  d=9, how strong must the curve be before we can see it?"
- When a measurement pipeline changes and you need a regression test with a
  known answer (planted signal must still be recovered; null must still be
  quiet).
- When placing a real corpus among reference families rather than narrating
  "compatible with X".
- When another skill needs a **null ensemble** — ordering-permutation nulls for
  Y₃³ azimuthal claims, curveball nulls for a Hodge curl/harmonic fraction.

## When NOT to use

- You want to measure an existing corpus and already trust the pipeline → use
  `hyperspherical-harmonic-curve` (it owns the fit) or the `measure` subcommand
  here for the null-standardized version.
- You want to run an improvement loop → `rsi-phi-skill`.
- You want to enumerate alternative parameterizations → `guided-curve-ideate`.
- Your data is not a binary N×d incidence/coverage matrix. Continuous physical
  parameter matrices (e.g. GWTC PE samples) are **not** the same object and
  must not be placed on this map without a stated binarization.

## Inputs

Either nothing (pure generation), or a JSON file containing an N×d binary
matrix — a bare list-of-lists, or `{"matrix": [[0,1,...], ...]}`. That is the
only external format the skill reads.

## Outputs

| Subcommand | Output |
|---|---|
| `generate` | corpus JSON: `{schema, params, matrix}` — params carry the full generative truth (kind, amplitude, modes, seed, K) |
| `measure` | V₂, eigenvalues, r_eff, Shannon rank, mean off-diagonal ρ̄, row-mass stats, Otsu bimodality, column marginals, PC1+PC2, design condition/rank, sphere-fit R², chordal residuals, Y₃³ probe, and per-null `{V2_mean, V2_sd, dV2, dV2z}` |
| `calibrate` | recovery curve (amplitude → dV2z ± sd, V₂, R², power at z>3), false-positive block, detection threshold |
| `place` | s-vector, measurement block, reference-family means/sds, exclusion table (class × verdict × driving coordinate), nearest family, surviving classes |

## Math conventions (frozen, inherited from the regime)

- **Fibonacci golden-angle sampling**: `z_i = 1 − (2i+1)/N`, `φ_i = 2πi/φ_g`,
  `φ_g = (1+√5)/2`. Never lat-long, never the Vogel-π or Saff–Kuijlaars
  variants without explicit renaming.
- **`i = t`** — the Fibonacci index *is* the parameter. No lookup tables. In
  `measure`, `t` is the PC1 rank, and the lattice is indexed by that rank.
- **Real SH basis**, explicit Legendre + cos/sin split, `L = 3 → 16 functions`,
  column order (0,0),(1,−1),(1,0),(1,1),…,(3,3).
- **PCA top-2 → stereographic lift from the south pole → S²**, identity-init
  Möbius (`a=d=1, b=c=0`), FROZEN — no L-BFGS-B refinement.
- **Closed-form ridge** `C* = (ΦᵀΦ + λI)⁻¹ΦᵀZ`, `λ = 1e-3`; the prediction is
  renormalized back onto S².
- **Chordal S² residuals** for the per-item gap-to-curve.
- **Gate** `PC1+PC2 ≥ 0.40` — computed and reported, **never trusted alone**
  (see below).
- **Primary detection statistic**: `ΔV2z = (V₂ − E₀[V₂^curveball]) / SD₀[V₂^curveball]`.

### The corrected Y₃³ constant

The real-form Y₃³ used across the regime is

```
Y_3^3 = K · sin³θ · cos(3φ),    K = √(70/(64π)) = 0.5900435…
```

equivalently `¼√(35/2π)·x(x²−3y²)` on the unit sphere. **The legacy regime
constant `K = √(245/(64π)) = 1.1038699…` is wrong** — and it is wrong against
*two* reference constants, so state both ratios explicitly:

| constant | value | ratio to legacy |
|---|---:|---|
| legacy (wrong) `√(245/(64π))` | 1.1038699… | — |
| **complex** SH normalization `√(35/(64π))` | 0.4172238… | 245/35 = **7** → legacy = **√7** × complex |
| **real-orthonormal** (use this) `√(70/(64π))` | 0.5900436… | 245/70 = **3.5** → legacy = **√(7/2)** × real |

So the regime's own shorthand "off by √7" is correct *against the complex
constant*, while the factor against the real-orthonormal constant this skill
uses is `√(7/2) ≈ 1.870829` — that is the value the script asserts. Every
Y₃³ magnitude published under the legacy constant is inflated by 1.8708× relative
to the real-orthonormal convention (and by √7 ≈ 2.6458× relative to the complex
one). Verified in `results/validation.json` → `sh_constants`.

New work MUST use `K = √(70/(64π))`. `--legacy-k` exists only to reproduce old
numbers and prints a warning to stderr. Because the generator **standardizes**
every probe channel before scaling by `amplitude`, the flag changes reported
raw probe scale and *nothing else* — the emitted matrix and V₂ are bit-identical
(asserted in `--selftest` step 4). If a legacy-K change ever moves V₂, a probe
was left unstandardized somewhere and that is a bug.

### The gate's known failure mode — read before citing PC1+PC2

`PC1+PC2 = (λ₁+λ₂)/Σλ` on a D-column correlation matrix is bounded below by the
iid value `2/D` and is, to a good approximation, `2/r_eff` where `r_eff` is the
participation ratio. It therefore **rewards basis degeneracy**: a design matrix
built from many deterministic functions of a single scalar index is
near-rank-2 in the sampled directions and passes the gate trivially.

The two rank artifacts in the regime's own 5-dim library are exactly this:

| Series | Reported gate | What it actually is |
|---|---|---|
| **7-D** `repo-refs-skill` on `refs/*.md` | PC1+PC2 = **1.0000** | rank deficiency, not fit quality |
| **384-D** Fibonacci φ-basis `sin³θ·cos(mφ)`, m=3..384 | PC1+PC2 = **1.0000** | 384 deterministic functions of one index → essentially rank-2 |
| 9-D primitives | 0.4565 ✓ | passes, but so does the curveball null itself — at D = 9 the gate *is* V₂, and the corrected fixed-margin null on the real 2286×9 matrix sits at 0.7089 ± 0.0014 |
| 24-D (9 + 12 NSS + 3 meta) | 0.2993 ✗ | fails only because D is larger — same rows |

A gate value of exactly 1.0000 is a **red flag, not a success**. And the 9-D vs
24-D pair is the whole "+0.4664 phase transition": identical rows, different D.

**Therefore**: report `PC1+PC2` for continuity, and report alongside it the
design matrix's numerical rank and condition number (both emitted by
`measure`). Make the *decision* on `dV2z` against the curveball null, which is
dimension-comparable and marginal-matched. The regime's `V_floor = 0.222` is
just `2/9`; its `V_sat` is just the curveball null — measured at **0.7089 ± 0.0014**
on the real 2286×9 matrix (the older `≈ 0.78`/0.8005 figure came from an
under-mixed sampler and is retracted). Neither is a physical constant.

## Algorithm

### generate

1. Build the Fibonacci lattice `(x_i, θ_i, φ_i)` for `i = 0…N−1`.
2. Evaluate the 16 real SH functions at each point. Take the first `modes`
   probe channels; **channel 0 is always Y₃³**, then Y₃⁻³, Y₂², Y₂⁻², Y₃⁰.
3. **Standardize each channel** to zero mean, unit sd (this is what makes the
   result invariant to K).
4. Deterministic column loadings `w_kj`: column `j` carries channel `j mod
   modes` with sign alternating by block, so distinct columns co-vary *through
   the planted curve* and not merely through row mass.
5. Logits `η_ij = μ + amplitude · Σ_k g_k(x_i)·w_kj`, `μ = logit(base_rate)`;
   sample `X_ij ~ Bernoulli(σ(η_ij))`.
6. `mixture` instead draws `k` latent classes with random column-probability
   centers (the M₄ boring alternative). `null` draws iid Bernoulli at the column
   marginals of the matched amplitude-0 planted corpus.

### measure

Correlation-matrix spectrum → V₂, participation ratio `r_eff`, Shannon
effective rank, ρ̄; row-mass mean/sd and Otsu bimodality; column marginals;
PCA→stereographic→ridge-SH fit → sphere R², chordal residual mean/p95, design
rank/condition, Y₃³ probe; then `reps` draws from each requested null →
`V2_mean`, `V2_sd`, `dV2`, `dV2z`.

### calibrate

For each amplitude in the sweep, `trials` independent planted corpora, each
measured against `reps` curveball draws → mean/sd of `dV2z`, mean V₂, mean
sphere R², and **power** = fraction of trials with `|dV2z| > 3`. Then `trials`
null corpora → false-positive rate at `|z| > 3` and `|z| > 2`. The **detection
threshold** is the smallest swept amplitude with power ≥ 0.8.

### place — the IS-THIS-X map

Sufficient-statistic vector `s = [V₂, ΔV2z, r_eff, Otsu bimodality,
col-marginal mean, col-marginal sd]`. Every coordinate is invariant under row
relabeling; the marginal coordinates are equivariant under column permutation
and are summarized by permutation-invariant moments. (This invariance
requirement is what deletes the row-lag κ family by construction.)

Reference families are generated **at the observed N, d, and density**:

| Family | Construction |
|---|---|
| `M0_null` | iid Bernoulli at matched column marginals — the origin |
| `M1_curve_weak` | planted curve, amplitude 0.5 |
| `M1_curve_strong` | planted curve, amplitude 1.5 |
| `M4_mixture` | 2-class latent mixture, separation 1.5 |

Each coordinate is z-scored against the family's own mean and sd (with a 5 %
relative SD floor, so a noisily-narrow family cannot exclude its own members).
Verdicts are **exclusion-style only**:

- `excluded` — some coordinate has `|z| > 3`
- `not-excluded` — all tested coordinates within `|z| ≤ 3`
- `not-tested` — the family is degenerate on every coordinate

`PARTIAL` and "compatible with" are not permitted outputs.

## Examples

### Example 1 — make a standard candle and confirm it is detectable

```bash
python3 scripts/create_corpus.py generate \
    --kind planted -N 200 -d 9 --amplitude 1.5 --modes 2 --seed 11 \
    --out /tmp/planted.json

python3 scripts/create_corpus.py measure \
    --matrix /tmp/planted.json --reps 200 --seed 3
```

Real output (see `references/calibration-example.md`):

```
V2 = 0.4477   r_eff = 6.837   sphere_r2 = 0.4330   chordal_resid_mean = 0.5509
PC1+PC2 = 0.4474 (gate_pass=true)   design_numrank = 16   design_cond = 1.006
curveball: V2_mean = 0.2864  V2_sd = 0.0091  dV2 = +0.1613  dV2z = +17.67
```

The gate passes at 0.4474 — but so would many things. The load-bearing line is
`dV2z = +17.67`: the corpus has 0.16 more top-2 eigenvalue share than *any*
matrix with its own row and column sums.

### Example 2 — a null corpus must stay quiet

```bash
python3 scripts/create_corpus.py generate --kind null -N 200 -d 9 --seed 12 \
    --out /tmp/null.json
python3 scripts/create_corpus.py measure --matrix /tmp/null.json --reps 80
```

`V2 = 0.2850`, `dV2z = −0.116`. Note `V2 ≈ 0.285 ≈ 2/9 + finite-size`: the
regime's `V_floor` is the iid null, and reporting `V₂ = 0.285` as a finding
would be reporting the null.

### Example 3 — the calibration pack any measurement skill can cite

```bash
python3 scripts/create_corpus.py calibrate -N 200 -d 9 --modes 2 \
    --amplitudes 0,0.25,0.5,0.75,1.0,1.5,2.0 --trials 8 --reps 60 --seed 0 \
    --out calibration.json
```

| amplitude | dV2z (mean ± sd) | V₂ | sphere R² | power @ z>3 |
|---:|---:|---:|---:|---:|
| 0.00 | +0.18 ± 0.85 | 0.2863 | 0.4848 | 0.00 |
| 0.25 | +0.10 ± 1.12 | 0.2858 | 0.4799 | 0.00 |
| 0.50 | +1.50 ± 1.25 | 0.2978 | 0.4872 | 0.12 |
| 0.75 | +5.49 ± 1.15 | 0.3327 | 0.4957 | **1.00** |
| 1.00 | +10.28 ± 1.73 | 0.3767 | 0.4752 | 1.00 |
| 1.50 | +19.34 ± 2.29 | 0.4688 | 0.4757 | 1.00 |
| 2.00 | +28.01 ± 3.11 | 0.5416 | 0.4689 | 1.00 |

FPR at |z|>3 = 0.00, at |z|>2 = 0.125; detection threshold = amplitude 0.75.
Note that **sphere R² is flat at ≈ 0.48 across the entire sweep** — the SH curve
fit has essentially no power to distinguish planted structure from noise at
these N. That is a calibration result about the regime's own fit statistic, and
it is invisible without this skill.

### Example 4 — place a corpus in the IS-THIS-X space

```bash
python3 scripts/create_corpus.py place --matrix /tmp/planted.json \
    --trials 12 --reps 60 --seed 6
```

```
s = [V2 0.4477, dV2z 20.62, r_eff 6.837, otsu 0.6976, col_mean 0.5139, col_sd 0.0343]

class             verdict        max|z|   driving coordinate
M0_null           excluded        27.91   dV2z
M1_curve_weak     excluded        15.15   dV2z
M1_curve_strong   not-excluded     0.99   r_eff
M4_mixture        excluded         3.89   col_marginal_sd
-> nearest: M1_curve_strong; surviving: [M1_curve_strong]
```

The planted corpus recovers its own family (max |z| = 0.99) and excludes the
null at z = 27.9 — the round-trip that makes the map trustworthy. It excludes
`M4_mixture` on column-marginal spread, not on V₂ (z = 2.07 there), which is the
coordinate where curve and mixture genuinely overlap.

### Example 5 — supply nulls to another channel

```bash
for s in $(seq 1 200); do
  python3 scripts/create_corpus.py generate --kind null -N 2286 -d 9 \
      --seed $s --out /tmp/nulls/null_$s.json
done
```

Feed those to the Hodge channel (curl/harmonic fraction) or to an
ordering-permutation test for a Y₃³ azimuthal claim. Both need an ensemble; this
is where it comes from.

### Example 6 — regression test in CI

```bash
python3 scripts/create_corpus.py --selftest   # exits 0 only when GREEN
```

## Guidelines

1. **Never report a raw V₂, PC1+PC2, or R² without its null.** The regime's own
   history is the argument: `V_floor = 0.222` is `2/D`, `V_sat` is the
   curveball value (0.7089 ± 0.0014 on the real 2286×9 matrix; the retracted
   0.8005 was an under-mixed null), and the "+0.4664 phase transition" is a
   D-change on identical rows. A statistic without a null is a number without a claim.
2. **Use the curveball null for the primary decision.** Column-permutation and
   iid nulls destroy row mass, so they inflate every z-score on any corpus with
   a bimodal coverage distribution. Report all three; decide on curveball.
3. **Match the null's N and d to the data.** V₂ nulls relax toward `2/D` like
   Marchenko–Pastur in `D/N`; comparing a real N=40 value to a null computed at
   N=2286 manufactures a critical point that is not there.
4. **Pre-register the sweep.** Fix amplitudes, trials, reps, and the threshold
   before running. `calibrate` writes them into `design` for exactly this.
5. **Report power, not just significance.** "We did not detect a curve" is only
   meaningful next to "at this N we would have detected amplitude ≥ 0.75 with
   probability 1.0".
6. **Treat sphere R² and PC1+PC2 as diagnostics, not evidence.** In the worked
   example both are essentially amplitude-independent while `dV2z` sweeps
   0 → 28.
7. **Keep `i = t`.** The Fibonacci index is the parameter, in generation and in
   measurement. If you interpolate or tabulate, you have left the regime and
   the calibration no longer transfers.
8. **Any azimuthal claim needs an ordering-permutation null.** `φ_i` is assigned
   by construction from the index, and the index comes from PC1 rank; power at
   `cos(3φ)` is a property of the index map until a shuffled-order ensemble says
   otherwise.
9. **Seeds are part of the result.** Never derive a seed from Python's builtin
   `hash()` — it is salted per process and silently destroys reproducibility
   (this bug was found and fixed in `place` during v1.0.0 development). Every corpus carries its generative
   parameters, including the seed. A calibration pack you cannot regenerate is
   an anecdote.
10. **Grow the family grid rather than forcing a verdict.** If `place` returns
    all-excluded, the answer is "off the generated map" — add families, do not
    relabel the nearest one.

## Constraints

- **LOCAL ONLY.** No network, no GitHub, no Linear, no external API. Reads one
  JSON matrix; writes JSON where told.
- **stdlib + numpy only.** No scipy, sklearn, pandas, or matplotlib. This is a
  hard requirement so the calibration is reproducible anywhere the regime runs.
- The corpus format is **binary** `{0,1}^{N×d}`. Continuous data must be
  binarized with a stated rule before it touches this skill.
- The curveball trade count defaults to `5N`; raise it for very sparse or very
  dense matrices where mixing is slow.
- `place` regenerates its reference families **per call** at the observed
  (N, d, density). It is O(families × trials × reps) matrix draws — budget
  ~45 s at N=200, trials=12, reps=60 on one core.
- `--legacy-k` is compatibility-only and warns on stderr.

## Anti-patterns

- **Don't cite PC1+PC2 = 1.0000 as a good fit.** It is a rank artifact. Report
  `design_numrank` and `design_cond` next to it or don't report it.
- **Don't compare V₂ across different d.** V₂ is a decreasing function of d at
  fixed data (0.7235 → 0.4907 → 0.2882 → 0.2052 for d = 9, 14, 24, 34 on
  identical rows). Any "climb" that coincides with a basis change is a basis
  change.
- **Don't use the iid or column-permutation null to claim structure.** They
  reject on row-mass bimodality alone, which every saturating append-only loop
  manufactures for free.
- **Don't tune amplitude until detection succeeds and then report the
  detection.** The sweep is the deliverable; the point estimate is not.
- **Don't reuse a calibration pack across N, d, base rate, or mode count.** The
  detection threshold moves with all four.
- **Don't emit `PARTIAL`.** The permitted verdicts are excluded /
  not-excluded / not-tested.
- **Don't read curvature into a mixture.** `M1_curve_*` and `M4_mixture` overlap
  in V₂ and r_eff and separate mainly on column-marginal spread; if both survive,
  say both survived.
- **Don't skip the selftest after editing the script.** It is the only thing
  standing between a calibration pack and a plausible-looking artifact.

## Red flags

| Observation | What it means |
|---|---|
| `PC1+PC2` exactly 1.0000 | rank degeneracy; the gate is uninformative here |
| `design_numrank < 16` | the SH design collapsed; the ridge fit is not identified |
| `dV2z` large under iid/colperm but ≈ 0 under curveball | you are measuring row-mass bimodality, not structure |
| `dV2z` large and **negative** | the corpus is *less* concentrated than its own marginals allow — do not call this emergence. But before believing a large negative z, audit the null: an under-mixed or non-uniform fixed-margin sampler manufactures one. **Cautionary tale:** yubiOS was once reported at curveball null 0.8005, z = −45.8; that value was retracted after replication. The corrected null is **0.7089 ± 0.0014** and yubiOS sits **above** it at **z = +12.3, ΔV₂ = +0.0144** (two independent provably-uniform fixed-margin samplers; `results/A2-curveball-audit.json`, `results/validation.json`, `results/finite_size.json`) |
| FPR at `\|z\|>3` > 0.05 in the calibration pack | the null ensemble is under-mixed; raise curveball trades or reps |
| sphere R² moves while `dV2z` does not | the fit is tracking the PCA embedding, not the planted signal |
| `place` returns all-excluded | the corpus is off the generated map; widen the grid, don't force a label |
| power < 0.8 at every swept amplitude | N is too small to conclude anything; report the non-detection as a power statement |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `rsi-phi-skill` | supplies **calibration priors**: the detection threshold, FPR, and N-sizing that the loop's gate decisions should be conditioned on. Replace the bare `PC1+PC2 ≥ 0.40` accept/reject with `dV2z > 3` at the calibrated amplitude. | curved-corpus-create → rsi-phi-skill |
| `guided-curve-ideate` | supplies **ground-truth test corpora per cycle**: each candidate `(ℓ, m, n_sin, D, sampling, Möbius, freq-sym)` is scored on a planted corpus whose answer is known, turning the 5-lens score from a judgment into a measured recovery rate. Its L5 "sampling shift" lens becomes a real ablation (Fibonacci vs lat-long on identical planted signal). | curved-corpus-create → guided-curve-ideate |
| `single-action-curve-rsi` | supplies **atom Δ validation on known curvature**: generate a corpus at amplitude a, apply one atom flip, and check the measured geodesic Δ against the generative truth. Distinguishes real Δ from the App A.3 chordal-metric ladder artifact that reproduces on all corpora. | curved-corpus-create → single-action-curve-rsi |
| Hodge channel (`C-hodge-pivot`) | supplies **generated corpora as Hodge nulls**: curl fraction ρ_c and harmonic fraction ρ_h are properties of the graph you built as much as of the corpus, so they need a matched-marginal ensemble. `generate --kind null` at the corpus's N, d, density is that ensemble; planted corpora are the positive control for whether ρ_h responds to curvature at all. | curved-corpus-create ↔ Hodge channel |
| `hyperspherical-harmonic-curve` | owns the fit; this skill owns the ground truth the fit is scored against. Keep the ridge/λ/basis conventions identical or the calibration does not transfer. | bidirectional |
| `negative-skill-space` | orthogonal — qualitative gap-mapping, no numeric coupling. | none |

## Self-containment

Reads: one JSON matrix file (optional). Writes: JSON where told.
Depends on: Python stdlib + numpy. Nothing else — no skill registry, no
external services, no prior outputs.

## Verification

```
python3 scripts/create_corpus.py --selftest
```

Seven blocks, all asserted:

1. Fibonacci points lie on the unit sphere; the SH basis is 16 columns; basis
   column 15 equals `K sin³θ cos(3φ)` with the corrected K.
2. Planted `modes=2`, amplitude 1.5, N=200, d=9 → `dV2z = +15.71 > 3`.
   (The same corpus scores +17.67 at `--reps 200`; the selftest uses 80.)
3. Matched null → `dV2z = −0.116`, `|z| < 2`.
4. `--legacy-k` leaves the emitted matrix bit-identical and V₂ identical to
   1e-12, and changes the raw probe scale by exactly `√(7/2) = 1.870829`.
5. Gate and rank/condition are both reported.
6. Miniature calibration is monotone in amplitude with FPR@z>3 = 0.
7. Placement round-trip: planted excludes `M0_null`; null does not.

Exit code 0 iff GREEN. Runtime ≈ 15 s single-core.

## Changelog

- **1.0.0** (2026-08-12) — initial. Establishes the generative inverse of the
  measurement family. Corrects the Y₃³ constant to `K = √(70/(64π))` (legacy
  `√(245/(64π))` is larger by `√(7/2)` than the real-orthonormal constant and by
  `√7` than the complex constant `√(35/(64π)) = 0.4172238`; retained behind
  `--legacy-k`).
  Documents the `PC1+PC2 ≥ 0.40` gate's failure mode (it equals `2/r_eff` and
  rewards basis degeneracy — the 7-D and 384-D 1.0000 artifacts) and mandates
  null-standardized `ΔV2z` against the curveball null as the primary detection
  statistic. Adds the IS-THIS-X placement with exclusion-only verdicts.

## Maintainer

Sauna, wave 2. Built against `papers/playbooks/rsi-regime.md`, the
`guided-curve-ideate` and `single-action-atom` SKILL.md exemplars, the wave-1
big-picture memo (null-model reframing and the IS-THIS-X design), and the
wave-1 Hodge pivot memo.
