---
name: curved-corpus-create
description: >-
  Generate binary corpora with PRESCRIBED curved structure (planted real spherical-harmonic signal on a Fibonacci golden-angle S^2 lattice), matched null corpora (curveball / column-permutation / iid), a calibration pack (signal-recovery curve, false-positive rate, detection threshold), and an IS-THIS-X placement. v1.1.0 adds -L/--lens mode that emits each measurement and each suggested improvement as a guided-curve-ideate-format new idea (per cycle-34 L141-L146): hypothesis + method + parameters + delta + verdict + score + caveat. v1.1.0 also emits lens-format calibration packs -- each amplitude becomes a lens with measured power, FPR, dV2z, and an honest verdict, NOT a flat table. Use when you need ground truth for a curve/coverage measurement, calibrating V2 or PC1+PC2 gate, asking "would this pipeline detect a signal if one were there", setting a detection threshold, sizing N, validating atom delta on known curvature, producing null ensembles, lens-format patch generation, hypothesis-driven improvement, or placing a real corpus (yubiOS, NIST, CIS, SCAP-SSG) in null-standardized statistic space with exclusion-style verdicts. Trigger phrases: planted signal, synthetic corpus, ground truth, null model, curveball, false positive rate, statistical power, detection threshold, is this signal real, calibrate V2, standard candle, positive control, is this X, lens-format patches, new ideas scheme. NOT for measuring a corpus you already trust (use hyperspherical-harmonic-curve), NOT for running an RSI improvement loop (use rsi-phi-skill), and NOT for lens-format RSI patches (use curve-compass-skill).
---

# curved-corpus-create

The generative inverse of the RSI curve regime. Every other skill in the
family (rsi-phi-skill, hyperspherical-harmonic-curve,
single-action-curve-rsi, guided-curve-ideate) **measures** a corpus
and reports a number. None of them can say what that number would
have been had the structure been *known*. This skill manufactures
corpora whose curvature is prescribed by construction, so every
measurement in the regime finally has a calibrated ground truth.

It is the **standard-candle factory**. Four jobs:

1. **Generate** a corpus with a planted S^2 spherical-harmonic curve at
   a chosen amplitude, N, d, and mode count.
2. **Generate matched nulls** -- curveball (row *and* column sums
   preserved), column-permutation, iid.
3. **Emit a calibration pack** -- signal-recovery curve,
   false-positive rate, detection threshold.
4. **Place** any real N x d binary matrix in the IS-THIS-X question
   space, with exclusion-style verdicts.

## v1.1.0 -- lens-format calibration + lens-format patches

The first real-world use (cycle 1, PR #202, 2026-08-12) shipped a
calibration pack as a flat table. Jenny declined the merge: the
output was too structured to produce the needed dynamics.

**v1.1.0 changes the output format.** Every measurement and every
suggested improvement is now a guided-curve-ideate-format new idea
(per cycle-34 SKILL.md and cycle-34 new-ideas-cycle34.md/json):

```
L<N> -- <short-name>
  hypothesis:  <a testable claim>
  method:      <how the test runs>
  parameters:  {amplitude, N, d, modes, reps, seed}
  delta:       {dV2z, power, FPR, R^2, ...} with units
  verdict:     YES | PARTIAL | NO
  score:       0-50 (rank against the lens pool)
  caveat:      <what the experiment did NOT measure>
```

This mirrors the cycle-34 L141-L146 outputs (PC1+PC2 on GWTC = 0.4003
PARTIAL; SCAP SSG PC2 anti-emerges PARTIAL; etc.). Each lens is a
concrete experiment with measurable dynamics.

## When to use

- Before believing any V2, gate, or residual number from the regime.
  The number is meaningless without the null it is standardized
  against.
- When you need statistical **power**, not just a point estimate.
- When a measurement pipeline changes and you need a regression test
  with a known answer.
- When placing a real corpus among reference families rather than
  narrating "compatible with X".
- When you need lens-format patch generation -- each suggested
  improvement is a measurable experiment with hypothesis + delta +
  verdict.

## When NOT to use

- You want to measure an existing corpus and already trust the
  pipeline -- use `hyperspherical-harmonic-curve` or the `measure`
  subcommand here for the null-standardized version.
- You want to run an improvement loop -- `rsi-phi-skill`.
- You want lens-format RSI patches specifically (suggested file edits
  as experiments) -- use `curve-compass-skill`'s `lens` subcommand.
- Your data is not a binary N x d incidence/coverage matrix.

## Inputs

Either nothing (pure generation), or a JSON file containing an N x d
binary matrix -- a bare list-of-lists, or `{"matrix": [[0,1,...], ...]}`.

## Outputs

| Subcommand | Output |
|---|---|
| `generate` | corpus JSON: `{schema, params, matrix}` -- params carry the full generative truth (kind, amplitude, modes, seed, K) |
| `measure` | V2, eigenvalues, r_eff, Shannon rank, mean off-diagonal rho, row-mass stats, Otsu bimodality, column marginals, PC1+PC2, design condition/rank, sphere-fit R^2, chordal residuals, Y_3^3 probe, and per-null {V2_mean, V2_sd, dV2, dV2z} |
| `calibrate` | **lens-format** calibration pack (v1.1.0): one lens per amplitude with hypothesis + method + parameters + delta + verdict + score + caveat. |
| `place` | lens-format IS-THIS-X placement (v1.1.0): one lens per class with hypothesis + method + parameters + delta + verdict + score + caveat. |
| `lens` | **NEW in v1.1.0** -- emits a lens pool that drives the patch generator: each file gets a lens with hypothesis + method + parameters + delta (the measured coverage) + verdict (YES/PARTIAL/NO based on coverage level) + score (0-50 rank) + caveat. |

## Math conventions (frozen, inherited from the regime)

- **Fibonacci golden-angle sampling**: `z_i = 1 - (2i+1)/N`,
  `phi_i = 2 pi i / phi_g`, `phi_g = (1+sqrt 5)/2`.
- **`i = t`** -- the Fibonacci index *is* the parameter.
- **Real SH basis**, explicit Legendre + cos/sin split, `L = 3 -> 16
  functions`, column order (0,0),(1,-1),(1,0),(1,1),...,(3,3).
- **PCA top-2 -> stereographic lift from the south pole -> S^2**,
  identity-init Mobius (a=d=1, b=c=0), FROZEN.
- **Closed-form ridge** `C* = (Phi^T Phi + lambda I)^-1 Phi^T Z`,
  `lambda = 1e-3`.
- **Chordal S^2 residuals** for the per-item gap-to-curve.
- **Gate** `PC1+PC2 >= 0.40` -- REPORTED, NEVER TRUSTED ALONE.
- **Primary statistic**: `dV2z = (V2 - E_0[V2_curveball]) /
  SD_0[V2_curveball]`.
- **Y_3^3 constant**: `K = sqrt(70/(64 pi)) = 0.5900435...` (CORRECTED).

### The corrected Y_3^3 constant

The real-form Y_3^3 used across the regime is `Y_3^3 = K sin^3(theta)
cos(3 phi)`, `K = sqrt(70/(64 pi)) = 0.5900435...` (real-orthonormal).
Legacy K = sqrt(245/(64 pi)) = 1.1038699... is WRONG; legacy =
sqrt(7/2) x real. New work MUST use the real-orthonormal K.

## Algorithm

### generate

1. Build the Fibonacci lattice `(x_i, theta_i, phi_i)` for `i = 0..N-1`.
2. Evaluate the 16 real SH functions at each point. Take the first
   `modes` probe channels; channel 0 is always Y_3^3.
3. **Standardize each channel** to zero mean, unit sd.
4. Deterministic column loadings `w_kj`.
5. Logits `eta_ij = mu + amplitude * sum_k g_k(x_i) * w_kj`, `mu =
   logit(base_rate)`; sample `X_ij ~ Bernoulli(sigma(eta_ij))`.

### measure

Correlation-matrix spectrum -> V2, participation ratio `r_eff`,
Shannon effective rank, rho; row-mass mean/sd and Otsu bimodality;
column marginals; PCA -> stereographic -> ridge-SH fit -> sphere R^2,
chordal residual mean/p95, design rank/condition, Y_3^3 probe; then
`reps` draws from each requested null -> `V2_mean`, `V2_sd`, `dV2`,
`dV2z`.

### calibrate (lens-format in v1.1.0)

For each amplitude in the sweep, `trials` independent planted
corpora, each measured against `reps` curveball draws -> one **lens**
per amplitude with:

- hypothesis: "amplitude >= A produces |dV2z| > 3 at the specified N"
- method: "trials independent planted corpora measured against reps
  curveball draws"
- parameters: {amplitude, N, d, modes, trials, reps, seed}
- delta: {mean_dV2z, sd_dV2z, mean_V2, mean_R2, power_at_z_3,
  FPR_at_z_3, FPR_at_z_2}
- verdict: YES (power >= 0.8 and FPR_at_z_3 < 0.05) | PARTIAL (power >=
  0.5 but FPR fails or power < 0.8) | NO (power < 0.5)
- score: 0-50 (50 = full pass, 0 = degenerate)
- caveat: "amplitude ladder is per the specified sweep; the
  per-trial sd may exceed the per-step amplitude difference"

The **detection threshold** is the smallest swept amplitude with
YES verdict. Power and FPR are lens-level, never aggregated.

### lens (NEW in v1.1.0)

Reads a corpus JSON (built externally) and emits a lens pool that
drives the patch generator:

```
python3.12 scripts/create_corpus.py lens \
    --corpus cycle2/corpus.json --out cycle2/lenses.json
```

Output schema:

```json
{
  "lens_pool": [
    {
      "lens": "L147",
      "file": "docs/AGENTS.md",
      "hypothesis": "AGENTS.md covers all 9 primitives in the internal-big-picture basis",
      "method": "9-D primitive binarization + chordal distance to ideal pole",
      "parameters": {"basis": "internal-big-picture", "d": 9, "seed": 20260812},
      "delta": {"k": 9, "missing_primitives": [], "chordal_resid": 0.0},
      "verdict": "YES",
      "score": 50,
      "caveat": "binarization is heuristic"
    }
  ]
}
```

Verdict rule: YES if k = d (all primitives covered), PARTIAL if
d/2 <= k < d, NO if k < d/2. Score = round(50 * k/d).

### place (lens-format in v1.1.0)

Lens-format IS-THIS-X placement -- one lens per class with
hypothesis (the class identity), method (the reference family
construction), parameters (N, d, density, trials, reps, seed),
delta (the per-coordinate z-scores), verdict (excluded /
not-excluded / not-tested), score (0-50), caveat.

## Examples

### Example 1 -- make a standard candle and confirm it is detectable

```bash
python3 scripts/create_corpus.py generate \
    --kind planted -N 200 -d 9 --amplitude 1.5 --modes 2 --seed 11 \
    --out /tmp/planted.json

python3 scripts/create_corpus.py measure \
    --matrix /tmp/planted.json --reps 200 --seed 3
```

```
V2 = 0.4477   r_eff = 6.837   sphere_r2 = 0.4330   chordal_resid_mean = 0.5509
PC1+PC2 = 0.4474 (gate_pass=true)   design_numrank = 16   design_cond = 1.006
curveball: V2_mean = 0.2864  V2_sd = 0.0091  dV2 = +0.1613  dV2z = +17.67
```

### Example 2 -- a null corpus must stay quiet

```bash
python3 scripts/create_corpus.py generate --kind null -N 200 -d 9 --seed 12 \
    --out /tmp/null.json
python3 scripts/create_corpus.py measure --matrix /tmp/null.json --reps 80
```

`V2 = 0.2850`, `dV2z = -0.116`.

### Example 3 -- lens-format calibration pack (v1.1.0)

```bash
python3 scripts/create_corpus.py calibrate -N 200 -d 9 --modes 2 \
    --amplitudes 0,0.25,0.5,0.75,1.0,1.5,2.0 --trials 8 --reps 60 --seed 0 \
    --out calibration-lens.json
```

Output (lens-format, one lens per amplitude):

```json
{
  "calibration_lenses": [
    {
      "lens": "L_cal_0.00",
      "amplitude": 0.0,
      "hypothesis": "amplitude 0.00 yields no detection",
      "delta": {"mean_dV2z": 0.18, "power_at_z_3": 0.00},
      "verdict": "YES (null as expected)",
      "score": 50
    },
    {
      "lens": "L_cal_0.75",
      "amplitude": 0.75,
      "hypothesis": "amplitude 0.75 yields power >= 0.8",
      "delta": {"mean_dV2z": 5.49, "power_at_z_3": 1.00},
      "verdict": "YES",
      "score": 50
    },
    {
      "lens": "L_cal_0.50",
      "amplitude": 0.50,
      "hypothesis": "amplitude 0.50 yields power >= 0.5",
      "delta": {"mean_dV2z": 1.50, "power_at_z_3": 0.12},
      "verdict": "NO",
      "score": 16
    }
  ],
  "detection_threshold": 0.75,
  "FPR_at_z_3": 0.00,
  "FPR_at_z_2": 0.125
}
```

The detection threshold is the smallest amplitude with verdict=YES,
NOT a Gaussian-tail crossing.

### Example 4 -- lens-format place (v1.1.0)

```bash
python3 scripts/create_corpus.py place --matrix /tmp/planted.json \
    --trials 12 --reps 60 --seed 6
```

Output: one lens per class with verdict (excluded / not-excluded /
not-tested), score, caveat.

### Example 5 -- supply nulls to another channel

```bash
for s in $(seq 1 200); do
  python3 scripts/create_corpus.py generate --kind null -N 2286 -d 9 \
      --seed $s --out /tmp/nulls/null_$s.json
done
```

### Example 6 -- lens-format patch generator (NEW in v1.1.0)

```bash
python3 scripts/create_corpus.py lens \
    --corpus cycle2/corpus.json --out cycle2/lenses.json
```

Emits one lens per file with measured coverage delta and an honest
verdict. The lens output is the patch input: each file patch is the
lens itself (hypothesis + method + parameters + delta + verdict +
score + caveat), not a templated `## Purpose` / `## Examples`
section.

### Example 7 -- regression test in CI

```bash
python3 scripts/create_corpus.py --selftest   # exits 0 only when GREEN
```

## Guidelines

1. **Never report a raw V2, PC1+PC2, or R^2 without its null.** A
   number without a null is a number without a claim.
2. **Use the curveball null for the primary decision.**
3. **Match the null's N and d to the data.** V2 nulls relax toward
   `2/D` like Marchenko-Pastur in `D/N`; comparing a real N=40 value
   to a null computed at N=2286 manufactures a critical point that
   is not there.
4. **Pre-register the sweep.** Fix amplitudes, trials, reps, and the
   threshold before running.
5. **Report power, not just significance.** "We did not detect a
   curve" is only meaningful next to "at this N we would have
   detected amplitude >= 0.75 with probability 1.0".
6. **Treat sphere R^2 and PC1+PC2 as diagnostics, not evidence.**
7. **Keep `i = t`.** The Fibonacci index is the parameter.
8. **Any azimuthal claim needs an ordering-permutation null.**
9. **Seeds are part of the result.**
10. **Lens-format outputs only (v1.1.0).** Every measurement is a
    lens with hypothesis + method + parameters + delta + verdict +
    score + caveat. NO flat calibration tables, NO flat placement
    tables.
11. **Verdict is YES/PARTIAL/NO (three-valued), never YES/NO.** NO is
    "the experiment ran and the claim failed". PARTIAL is "the
    experiment ran but one of the criteria did not pass". YES is
    "all criteria passed".

## Constraints

- **LOCAL ONLY.** No network, no GitHub, no Linear, no external API.
- **stdlib + numpy only.** No scipy, sklearn, pandas, or matplotlib.
- The corpus format is **binary** `{0,1}^{N x d}`. Continuous data
  must be binarized with a stated rule.
- The curveball trade count defaults to `5N`; raise it for very sparse
  or very dense matrices.
- `--legacy-k` is compatibility-only and warns on stderr.
- Lens-format output (v1.1.0) carries its own experimental design;
  the lens *is* the measurement, not prose about the measurement.

## Anti-patterns

- **Don't cite PC1+PC2 = 1.0000 as a good fit.**
- **Don't compare V2 across different d.**
- **Don't use the iid or column-permutation null to claim structure.**
- **Don't tune amplitude until detection succeeds and then report
  the detection.** The sweep is the deliverable; the point estimate
  is not.
- **Don't reuse a calibration pack across N, d, base rate, or mode
  count.**
- **Don't emit `PARTIAL`.** The permitted verdicts are YES / PARTIAL /
  NO (v1.1.0). Use NO when a criterion fails, not PARTIAL.
- **Don't read curvature into a mixture.**
- **Don't skip the selftest after editing the script.**
- **Don't ship flat calibration / placement tables (v1.0.0 format).**
  Use lens format (v1.1.0).

## Red flags

| Observation | What it means |
|---|---|
| `PC1+PC2` exactly 1.0000 | rank degeneracy |
| `design_numrank` < 16 | the SH design collapsed |
| `dV2z` large under iid/colperm but ~0 under curveball | you are measuring row-mass bimodality, not structure |
| `dV2z` large and **negative** | the corpus is less concentrated than its marginals allow |
| FPR at `|z|>3` > 0.05 in the calibration pack | the null ensemble is under-mixed |
| sphere R^2 moves while `dV2z` does not | the fit is tracking the PCA embedding, not the planted signal |
| lens has `delta: {}` or `score: 0` | the experiment did not run |
| 100+ lenses all verdict=YES with score 50 | the experiment is degenerate |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `rsi-phi-skill` | supplies **calibration priors**: detection threshold, FPR, N-sizing that the loop's gate decisions should be conditioned on | curved-corpus-create -> rsi-phi-skill |
| `guided-curve-ideate` | the lens-format scheme is sourced from guided-curve-ideate cycle-34 (L141-L146). The `lens` subcommand + lens-format `calibrate` and `place` outputs use the same JSON shape: hypothesis + method + parameters + delta + verdict + score + caveat. | guided-curve-ideate -> curved-corpus-create |
| `single-action-curve-rsi` | supplies **atom delta validation on known curvature** | curved-corpus-create -> single-action-curve-rsi |
| Hodge channel (`C-hodge-pivot`) | supplies **generated corpora as Hodge nulls** | curved-corpus-create <-> Hodge channel |
| `hyperspherical-harmonic-curve` | owns the fit; this skill owns the ground truth | bidirectional |
| `curve-compass-skill` | the `lens` subcommand here supplies the patch generator; the compass's `lens` subcommand consumes it | curved-corpus-create -> curve-compass-skill |

## Self-containment

Reads: one JSON matrix file (optional). Writes: JSON where told.
Depends on: Python stdlib + numpy.

## Verification

```
python3 scripts/create_corpus.py --selftest
```

Seven blocks (unchanged from v1.0.0) plus v1.1.0 lens-format block:
6 assertions on lens output schema (lens, file, hypothesis, method,
parameters, delta, verdict, score, caveat all present; verdict in
{YES, PARTIAL, NO}; score 0-50).

## Changelog

- **1.0.0** (2026-08-12) -- initial. Establishes the generative
  inverse of the measurement family.
- **1.1.0** (2026-08-12) -- lens-format outputs. The first real-world
  use (cycle 1, PR #202) shipped flat calibration tables. Jenny
  declined the merge: the output was too structured to produce the
  needed dynamics. v1.1.0 changes the format to guided-curve-ideate
  new ideas: each measurement is a CONCRETE EXPERIMENT with
  hypothesis + method + parameters + delta + verdict + score +
  caveat. Adds `lens` subcommand, lens-format `calibrate` output,
  lens-format `place` output, 6 new selftest assertions, and the
  Composition link to `guided-curve-ideate` cycle-34. Cycle 2 PR off
  of main (different from PR #202) uses this format.

## Maintainer

Sauna, wave 2. Built against `papers/playbooks/rsi-regime.md`, the
`guided-curve-ideate` (cycle-34) and `single-action-atom` SKILL.md
exemplars, the wave-1 big-picture memo, the wave-1 Hodge pivot memo.
