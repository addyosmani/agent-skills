---
name: curve-compass-skill
description: >-
  Bring the Ginzburg-Landau free energy back to the corpus-curvature regime LEGITIMATELY, by
  construction rather than by metaphor. The historical construction log is maximally irreversible
  (0 backward transitions in 598 opportunities, absorbing at k=9, no equilibrium ensemble, hence no
  free energy), so this skill builds a DIFFERENT, designed dynamics on the same measured potential:
  a quantized +/- atom (flip exactly one primitive ON or OFF, always dk = +/-1) with Metropolis
  acceptance on the empirical Phi ladder, whose detailed balance holds by construction and whose
  stationary distribution is exactly pi_T(k) ~ C(9,k)exp(-Phi(k)/T) = exp(-F_T(k)/T) with
  F_T(k) = Phi(k) - T log C(9,k). Energy wins at low T (peak at the historical absorbing endpoint
  k=9), entropy wins at high T (peak at the binomial 4.5), and there is a crossover T_x = 0.0411
  between them, so the GL diagnostics that were FALSIFIED in the corpus size N -- fluctuation peak,
  susceptibility, heat capacity -- become legitimately measurable in the temperature T. Ships
  long-trajectory stabilization (>=8 dispersed chains, burn-in detection, integrated autocorrelation
  time tau_int, split-Rhat, ESS, Monte-Carlo standard errors) and an empirical detailed-balance test
  with binomial null bands. Also carries the corrected record of the is-this-x paper essentially
  whole: the V2 dimension artifact (0.7235 at D=9 vs 0.2940 at D=24 on identical rows), the
  gate-equals-rank identity (V2>=0.40 <=> r_hat<=5), the corrected curveball null
  0.7089 +/- 0.0014 giving z=+12.3 with the z=-45.8 retraction, the Hodge anti-cyclicity channel
  (beta_1 at z=-312.5), the standard-candle detection calibration, the fold-aggregated ladder test,
  the Parseval energy shares, the five vacuous-by-construction identity checks and their admission
  rule, and the corrected Y_3^3 constant sqrt(70/64pi)=0.5900. Use when the request mentions free
  energy, detailed balance, reversibility, a reversible or quantized atom, Metropolis or
  Monte-Carlo on a coverage ladder, trajectory stabilization, burn-in, autocorrelation time,
  split-Rhat, effective sample size, temperature sweep, crossover temperature, fluctuation or
  susceptibility peak, energy-entropy competition, absorbing dynamics, entropy production,
  irreversibility, "is this X", null-standardized statistics, curve compass, or the Phi ladder. NOT
  for generating corpora or calibrating detection on matrices (use curved-corpus-create), NOT for
  measuring an existing corpus's curve (use hyperspherical-harmonic-curve), and NOT a claim about
  the historical corpus -- everything measured here is a property of the designed chain.
---

# curve-compass-skill

The is-this-x paper closed the Ginzburg-Landau door twice. From the matrix side:
the "critical point" is the null's own finite-size inflation, and the fluctuation
peak, the susceptibility divergence and critical slowing-down are all falsified
or unsupported. From the process side, and more decisively: the corpus's own
construction dynamics has **zero back-flux in 598 opportunities**, so no positive
pi makes it reversible, its unique stationary distribution is the absorbing
delta_{k=9}, and *there is no equilibrium ensemble for a Landau free energy to be
an expansion of*.

This skill does not reopen that door. It builds a new one, next to it, and is
explicit about which side of the wall each number lives on.

**The thesis.** Take the paper's own measured potential Phi(k) -- the ladder
distance to the ideal pole, which depends only on the coverage *count* k and not
on *which* primitives are covered (paper sec. 7, D3: exchangeability) -- and put
on it a *designed* dynamics: a quantized +/- atom with Metropolis acceptance.
Because Phi is a function of k alone, the induced chain on k is a birth-death
chain with detailed balance **by construction**, and its stationary distribution
is exactly

```
pi_T(k)  =  C(9,k) exp(-Phi(k)/T) / Z(T)  =  exp(-F_T(k)/T) / Z'(T),
F_T(k)   =  Phi(k) - T log C(9,k).
```

That F_T is the Ginzburg-Landau energy-entropy competition on a bounded lattice,
returned legitimately: an energy term Phi that the measured log actually
supplies, and an entropy term T log C(9,k) that the *lattice* supplies. The
control parameter is T, not N. Every GL-style diagnostic the paper killed in N is
available in T -- and none of them says anything about the historical corpus. The
historical corpus is the **T -> 0 limit** of this chain, and that is the only
bridge between them.

---

## 1. The corrected record (C1-C4)

Do not report any statistic from this regime without the null it is standardized
against. The four corrections below are why.

**C1 -- V2 is a dimension artifact.** On the correlation matrix tr Sigma = D, so
V2 = (lambda_1+lambda_2)/D is a *share*. Appending a column that does not load on
the leading plane adds ~1 to the denominator and o(1) to the numerator, so V2 is
non-increasing in D with flat-spectrum floor 2/D. Measured on the **identical
2286 rows**: `V2 = 0.7235 at D=9` and `V2 = 0.2940 at D=24` (0.4473 when the
nuisance columns are made row-mass-correlated). The celebrated "+0.4664 phase
transition" (0.2993 -> 0.7657) spans exactly that interval: it is Proposition 1
evaluated at two points, not a transition.

**C2 -- the gate is a rank identity.** The shipped estimator does not compute the
participation ratio PR = (sum lambda)^2 / sum lambda^2. It reports the two-share
proxy `r_hat = 2/V2`, so

```
V2 >= 0.40   <=>   r_hat <= 5          (definitional identity, zero empirical content)
V2 = 1.0000  <=>   r_hat = 2           (numerical rank 2, attainable with no data at all)
```

What is empirical is *where* the identity bites: the (l=384, m=3, sin^384 theta)
basis and the 2-D PCA basis return exactly 1.0000 on all six corpora of the
ladder table -- including a **single-class iid corpus, pure noise**. Fourteen
rows at V2 = 1.0000 in `ladder_VD.json`, every one of them in those two bases and
none anywhere else. The 7-D `refs/` 1.0000 is the same artifact at the other end.
A gate value of exactly 1.0000 is a **red flag, not a success**. PR and r_hat are
different numbers and must be labelled: on the worked planted corpus V2 = 0.4477
gives r_hat = 4.47 while PR = 6.837.

**C3 -- the corrected null, and a retraction.** Under the fixed-margin
(curveball) ensemble, drawn by two independently validated uniform samplers
(chi-square uniformity p = 0.364 on an exhaustive 120-element fibre; p = 0.506 on
a second), the 2286x9 matrix has

```
real V2      = 0.723529 3730732693
curveball    = 0.709180 +/- 0.001183     ->  dV2 = +0.014415,  dV2z = +12.13  (headline +12.3)
E_0[V2]/V2   = 0.9802                    ->  98% of the headline observable is fixed by the marginals
```

Mixing is converged from 20N trades on (0.7159, 0.7104, 0.7087, 0.7092, 0.7094 at
1N/5N/20N/100N/400N). **Retracted:** an intermediate analysis reported the same
null as 0.8005 +/- 0.0017, hence z = -45.8, "the corpus is less concentrated than
chance". That value does not reproduce, its sign is wrong, and every downstream
statement resting on it is withdrawn. The retraction is printed rather than
silently repaired -- that is the discipline, applied to this program's own most
cited intermediate result.

**C4 -- there is no critical point.** With the null recomputed at each N,
`dV2 = +0.0058, +0.0175, +0.0175, +0.0135, +0.0153, +0.0145, +0.0144` across
N = 40, 79, 160, 320, 640, 1280, 2286: **flat for N >= 79 with no interior
maximum**. The growth of z from +0.6 to +12.3 is the shrinking null SD, not a
growing effect. The retired `N_c ~ 40` was raw V2 inheriting the null's own
finite-size inflation at the smallest N. Of the eight GL predictions: P2, P4, P5
falsified; P3 vacated; P7 and P8 not supported; P1 and P6 reinterpreted (V_inf is
an ensemble value, and the kappa family is deleted by the row-relabeling
invariance requirement -- the same estimator returned 1.06 on yubiOS and 323 on
NIST, the latter a saturation clamp). P4 in detail: normalized by the curveball
null's own variance at each N, the fluctuation ratio is 1.20, 3.01, 2.62, 3.20,
2.96, 3.36 -- flat at ~3 from N=79 up, argmax at the grid edge, smallest ratio in
the retired 40-79 band. P5: per-row leave-one-out response = 0.0386 N^-0.585,
95% CI [-0.648, -0.521], R^2 = 0.991 -- a smooth power law, no divergence, and
the naive 1/N expectation rejected too.

## 2. The measurement channels

### Matrix channel

Primary statistic, always: `dV2z = (V2 - E_0[V2]) / SD_0[V2]` against the
**curveball** (fixed row *and* column margin) null at the corpus's own N, d and
marginals. Decide on dV2z; report V2, PC1+PC2, design numerical rank and
condition number beside it for continuity, never instead of it. Report the null
rep count R with every z -- z is rep-count sensitive at the 15-20% level (the
same corpus scores +17.67 at R=200 and +20.62 at R=60).

Calibrated detection on the standard-candle generator (planted spherical-harmonic
curve of amplitude s in log-odds on a Fibonacci golden-angle lattice):

| N | d | s | mean dV2z | power (z>1.645) |
|---:|---:|---:|---:|---:|
| 128 | 9 | 0.0 / 0.25 / 0.5 / 1.0 / 2.0 | +0.59 / +0.63 / +0.09 / +0.95 / +3.69 | 0.12 / 0.25 / 0.25 / 0.25 / 0.88 |
| 512 | 9 | 0.0 / 0.5 / 1.0 / 2.0 | -0.27 / +0.04 / **+3.43** / +12.86 | 0.00 / 0.00 / **1.00** / 1.00 |
| 2048 | 9 | 0.0 / 0.5 / 1.0 / 2.0 | +0.32 / +2.46 / +10.82 / **+28.07** | 0.00 / 1.00 / 1.00 / 1.00 |

At s=0, N=512, d=9 over 48 fresh corpora: mean z = -0.014, **sd 1.320** where a
calibrated z gives 1.000; one-sided **FPR = 8.3%** at the nominal-5% threshold
z > 1.645 (two-sided 10.4% at |z| > 1.96). Every z in this lineage should be read
as inflated by roughly a third in units of sd. The sensitivity floor is
s ~ 1 log-odds at N <= 512; a non-detection below it is a statement about power,
not about the world. Raw V2 has none of these properties -- it orders corpora by
(N,d) rather than by s. The predecessor's sphere-fit R^2 returns 1.0000 in every
cell at every amplitude including s=0: it is an identity, not a measurement.

**Fold-aggregated detection.** On a constant-ratio amplitude ladder (algebraic
fold) s in {0.25, 0.5, 1, 2} at N=128, d=9, T=30 trials: the low rungs still sit
at the power floor (0.067 and 0.100) and per-trial monotonicity is a coin flip
(0.567 paired, 0.633 unpaired), yet the fold-slope statistic reaches
**t = 45.19 paired and 28.92 unpaired** against an empirical null-ladder 95%
quantile of **0.0997**, power 1.00 in both designs. Fold aggregation buys a
*trend* test, not a *cell* test, and the two must never be quoted for each other.
The critical value is the empirical null ladder, never a Gaussian tail.

**Parseval shares.** Under Fibonacci sampling the 16 real SH of L=3 are
near-orthonormal at the sampled points (B'B ~ (N/4pi) I, condition 1.003-1.006,
numerical rank 16), so the fitted energy partitions exactly:
`E_lm = |B_lm|^2 |C_lm|^2 / sum`, `sum E_lm = 1`. E is dimension-comparable
(unlike V2) and scale-free along a fold, which makes `E_33` -- the Y_3^3 share
the whole program has been asking about -- finally falsifiable. On the real GWTC
catalogue it is a **null**: E_33 = 0.00334 against 0.00832 +/- 0.00427,
**z = -1.17**, while the energy sits at l=1 (64.6%) and l=2 (22.8%).

### Hodge channel

Combinatorial Hodge decomposition (Jiang-Lim-Yao-Ye) on the item graph, with
exact orthogonality: C^1 = im(grad) + ker(Delta_1) + im(curl*). On yubiOS
(N=2286, symmetrized 8-NN under Jaccard, seed 20260812; |E| = 16438,
|T| = 13799):

```
rho_g = 0.99961366   rho_c = 0.00013059   rho_h = 0.00025575
beta_0 = 6   beta_1 = 6756   beta_2 = 6397   Euler chi = -353 = -353 (exact)
orthogonality residuals < 1e-15
```

Against the **matrix** (curveball) null every Hodge quantity sits within ~2.5
sigma -- the marginals explain the whole profile. Against the **graph**
(degree-rewired) null: `z(rho_h) = -53.14`, `z(beta_1) = -312.54`,
`z(rho_c) = -7.98`. **The corpus is strongly anti-cyclic**: far *fewer*
independent holes than chance. That inverts the vortex reading rather than
supporting it. All three pre-registered predictions fail: P-H1 (rho_h collapse
across N_c) fails on its own criterion -- rho_h *rises* +2.5 sigma from N=40 to
N=80 and the later decline tracks edge density; P-H2 (rho_c tracks 1-V2, Spearman
>= 0.6) fails with the wrong sign (-0.4545, p=0.160), and its 24-D clause is not
supported (+0.17 and +0.10, p >= 0.69, n=8, low power); P-H3 (defect rows carry
harmonic support, lift >= 2) fails by more than 10x (lift exactly 0.0 on three
graphs), and its clause (ii) is **void** -- 2pi is not a unit in
Jaccard-normalized dominance flow. Hodge *magnitudes* are construction-dependent
(rho_h spans 32x across four defensible graphs); only the directional statements
are corpus properties.

### Dynamics channel -- the one this skill extends

On the shipped edit log (213 files, 1391 dispatches, 1178 file-level transitions):

- **D1** 580 stay (all at the absorbing k=9), 423 advance by one, 175 (14.9%)
  advance by 2-4, **none regresses**. Every transition out of k=0 is +4 (14/14)
  and out of k=1 is +3 or +4 (27/27): "append-only" does not mean "one primitive
  at a time".
- **D2** T(k+1 -> k) = 0 for every k: upward mass 598, downward mass 0.
  Reversibility requires pi(k)T(k,k+1) = pi(k+1)T(k+1,k) with the left side
  positive and the right identically zero, so **no positive pi makes the chain
  reversible**; the unique stationary distribution is delta_{k=9}. Kolmogorov's
  cycle criterion is **vacuous** (no backward edge -> a DAG plus self-loops).
  The entropy-production estimator diverges; the defensible finite statement is
  the rule-of-three bound: backward rate < 0.0051 at 95%, hence entropy
  production **>= 2.2e3 nats** per sweep (423 x ln(1/0.0051) ~ 2233).
- **D3** Phi(k) = d_pre(k) takes exactly one value per k in all three corpora --
  `2.0000, 1.9758, 1.9080, 1.8091, 1.6933, 1.5727, 1.4552, 1.3454, 1.2451` for
  k=0..8 -- and `d_post(k) - Phi(k+1) = 0` exactly for k = 0..7 (max residual
  0.0). The ladder identity is **not a discovered conservation law**: Phi is a
  fixed function of the coverage count, so the gradient property follows from the
  definition. The empirical content is only that the distance is *exchangeable*
  in the nine primitives. Consequence: cumulative Delta is bounded and must decay
  to zero -- "emergence saturating" is arithmetic on a bounded lookup -- and the
  most-cited dynamical event (the refs cycle-2 Delta peak) decomposes into a
  policy term of -0.274 against a state term of +2.368, predictable in advance
  from the initial k-histogram.
- **D4** "potential vs non-potential" was the wrong axis: D2 and D3 hold
  simultaneously. The correct restatement is *deterministic, exchangeable descent
  of a bounded coverage potential to an absorbing fixpoint, with zero back-flux
  and no equilibrium ensemble*.
- **D5** A per-k binomial flip model (p_hat = 0.444, 0.463, 0.450, 0.343, 0.271,
  0.367, 0.479, 0.536, 1.000, U-shaped with minimum at k=4 exactly where the
  payoff delta(k) is maximal) beats global-p by 2 dlogL = 339.96 on 8 df -- but
  no independent-flip model reproduces the terminal fixpoint, and the last cycle
  is conditioned on the stopping rule and must not be scored as a free
  prediction.

**Terminal sentinel.** The log records Phi(9) as the bookkeeping sentinel 0.0;
the ladder *continuation* is d_post(8) = **1.1547**. This skill uses 1.1547.
Using the sentinel would plant a 1.245-deep artificial well at k=9 that swamps
the entropy term and destroys the crossover. This is a documented choice, not a
silent one.

## 3. Identity checks: coordinates that cannot fail

| quantity | status | why it carries no data |
|---|---|---|
| `V2 >= 0.40 <=> r_hat <= 5` | identity | `r_hat = 2/V2` by definition |
| sphere-fit `R^2 = 1.0000` | identity | the L=1 block is linear in (x,y,z), evaluated in-sample on the embedding it fits |
| `sum wrap(dphi) in 2pi Z` | identity | wrapped increments of any angle-valued field sum to 2pi Z around any closed loop; measured deviation 4.4e-16 on all 14,158 cycles |
| Kolmogorov cycle criterion on the edit log | vacuous | zero backward edges make the chain a DAG; no directed cycle exists to test |
| `delta(k) = Phi(k) - Phi(k+1)` | identity | the ladder distance is a fixed function of the coverage count; the gradient property follows from the definition |

**Admission rule (inherited, and binding on this skill):** *no coordinate is
admitted without a demonstrated non-degenerate null* -- a construction under
which the statistic provably could have taken a different value. Three of the
five fail instantly (a function of V2, a function of the design, a function of
the wrapping convention). Two fail subtly and are the instructive ones: a
criterion can be satisfied vacuously by the very extremity of the effect it was
meant to detect (the DAG), and a conservation law can hold identically because
the observable is a function of the state variable alone (the ladder). A
pre-registered prediction can therefore fail in a fourth way -- neither
confirmed, falsified nor untested, but **void** -- and a question space with
exclusion-only verdicts must be able to say so.

This skill's own compliance: `Var[k]`, `chi(T)`, `C(T)`, `tau_int` and the flux
J(k) all have demonstrated non-degenerate nulls (the exact pi_T, the binomial
direction null, and the T -> 0 and T -> inf limits), which is why they are
reportable. The ladder identity delta(k) = Phi(k) - Phi(k+1) is *not* reported as
a finding here; it is used as the input it is.

## 4. The compass mechanism

### The quantized +/- atom

```
atomic positive:  flip one MISSING primitive ON   ->  k -> k+1
atomic negative:  flip one PRESENT primitive OFF  ->  k -> k-1
```

Proposal (`--proposal signed`, the design of record): choose direction d = +/-1
with probability 1/2 each -- a move off a boundary is *proposed and rejected*,
which is what keeps the kernel well defined at k=0 and k=9 -- then choose a
uniformly random eligible primitive. **Every accepted move changes k by exactly
+/-1 and the configuration by exactly one bit.** That is the quantization, and
`--selftest` asserts it at the configuration level, not just on k.

### Metropolis acceptance, and why the entropy term is not optional

The signed proposal is asymmetric on configuration space --
`q(k -> k+1) = 1/(2(9-k))` against `q(k+1 -> k) = 1/(2(k+1))` -- so the Hastings
ratio contributes exactly `C(9,k')/C(9,k)` and the acceptance probability is

```
alpha = min(1, exp(-[F_T(k') - F_T(k)]/T)),     F_T(k) = Phi(k) - T log C(9,k)
      = min(1, exp(-[Phi(k') - Phi(k)]/T) * C(9,k')/C(9,k))
```

i.e. **Metropolis on the free energy**. The alternative kernel
(`--proposal atom`) picks one of the nine primitives uniformly and flips it; that
proposal *is* symmetric, so its acceptance is the bare Metropolis rule
`min(1, exp(-[Phi(k')-Phi(k)]/T))` -- **Metropolis on the energy**. The two are
the same chain in law: both have configuration-space stationary
`p(x) ~ exp(-Phi(k(x))/T)` and hence the identical k-marginal pi_T. Selftest
check 1 verifies both against the exact pi_T. If you use the signed proposal and
*drop* the degeneracy factor you get pi ~ exp(-Phi/T) with no entropy term at
all, no crossover, and a peak pinned at k=9 forever. That is the one bug in this
construction that still produces plausible-looking output.

### Detailed balance holds by construction

Phi depends only on k (D3 exchangeability), so all C(9,k) configurations at a
given coverage count are energetically identical, the induced process on k is a
birth-death chain, and every birth-death chain with positive rates in both
directions satisfies detailed balance with respect to its own stationary
distribution. There is nothing to verify in principle -- which is exactly why the
`balance` subcommand verifies it in practice: the value of the test is catching
an *implementation* error (a mis-signed Hastings term, a boundary leak, a biased
RNG), not adjudicating the theory.

### The crossover, and what it is and is not

| regime | who wins | pi_T peaks at |
|---|---|---|
| `T < T_x = 0.041143` | energy (Phi) | **k = 9**, the historical absorbing endpoint |
| `T > T_x` | entropy (log C(9,k)) | interior: k=8 -> 7 -> 6 -> 5, approaching binomial 4.5 |

Measured, and reproducible from the shipped script:

```
crossover        T_x  = 0.041143      (bisection on argmax pi_T)
heat capacity    C(T) = Var_pi[Phi]/T^2  peaks at T = 0.038304, C = 3.4565
susceptibility   |chi(T)| = |d<k>/dT|    peaks at T = 0.0368,  chi = -35.43
fluctuation      Var[k]                  peaks at T = 1.787431, Var = 2.254301
```

The GL diagnostics that were falsified in N are all present in T -- and the
honesty about their *shapes* is part of the result. `C(T)` and `|chi(T)|` are
sharp and both peak at the crossover, within 7-11% of T_x. `Var[k]` is a
**shallow** peak: 2.2543 against the T -> inf binomial asymptote 9/4 = 2.2500,
an excess of only 0.19%. The excess is real (the payoff ladder delta(k) is
largest mid-lattice, which broadens pi_T past binomial) and it is an interior
maximum, but reporting it as a dramatic fluctuation peak would be exactly the
error the paper indicts. Report C(T) as the fluctuation diagnostic and Var[k]
with its asymptote printed beside it.

### The historical log is the T -> 0 limit

Phi is strictly decreasing on k = 0..9, so as T -> 0 every coverage-increasing
move has acceptance -> 1 while every decreasing move has acceptance
`~ (9-k+1)/k * exp(-delta(k)/T) -> 0`. The chain degenerates to **monotone ascent
absorbing at k=9** -- exactly the measured log. Checked numerically:

```
T = 0.01 :  mass at k=9 = 0.998979 (exact 0.998934), backward rate 5.4e-4/step
            (analytic bound 9 exp(-delta(8)/T) = 1.07e-3), net flux sum J(k) = 0
T = 0.001:  backward transitions = 0, mass at k=9 = 1.000000   -> monotone ascent
historical: f_back = 0/598, k_inf = 9, r_telescope = 0.0
```

Note the shape of the limit carefully: **detailed balance holds at every T > 0**,
so the net flux stays zero all the way down. What vanishes as T -> 0 is the
backward *rate*, not the balance. The irreversibility of the historical log is
the singular T = 0 endpoint, not a small-T property -- which is the precise sense
in which the free energy exists for the compass and does not exist for the log.

### Long-trajectory stabilization protocol

1. **>= 8 chains**, deterministically dispersed starts across k = 0..9 (the
   default `linspace(0, 9, chains)` rounded), so a chain trapped in the k=9 basin
   at low T is visible as a between-chain disagreement rather than as a
   confident wrong answer.
2. **Burn-in**: discard the first half by default (which is also what split-Rhat
   wants); the reported `detected_burnin` is a tail-mean stabilization check,
   printed for disclosure, never used silently.
3. **tau_int** by the Geyer initial-positive-sequence estimator on each chain's
   post-burn-in k series, averaged.
4. **Trajectory length >= 50 tau_int per chain.** The runs below are at
   1500-5500 tau per chain, far past that floor.
5. **split-Rhat < 1.01** and **ESS > 1000** before any `<k>(T)` is quoted, with
   `MCse = sqrt(Var[k]/ESS)` printed on the mean. At very low T the chains
   absorb, the within-chain variance is exactly zero, and Rhat/tau are reported
   as `nan` rather than as 1.0 -- a frozen chain is degenerate, not converged.

## 5. IS-THIS-X placement

The deliverable of the paper is not another candidate X but a map: `Phi: corpus
-> s`, null-standardized, with reference families generated at the observed
(N, d, density) and **exclusion-only** verdicts.

```
s(M) = [ V2, dV2z, PR, Otsu(row-mass histogram), mean(pi_a), sd(pi_a) ]
z_{f,c}(M) = (s_c - E_f[s_c]) / max(SD_f[s_c], 0.05|E_f[s_c]|)
verdict = excluded (max|z| > 3) | not-excluded (max|z| <= 3) | not-tested (family degenerate)
```

`PARTIAL` and "compatible with" are not permitted outputs. PR is the
participation ratio, never r_hat = 2/V2, which would add a spurious dimension by
being a deterministic function of the first coordinate. Every coordinate is
invariant under row relabeling -- which is what deletes the row-lag kappa family
by construction. Round trip: the planted corpus at s=1.5 excludes M_0 at
max|z| = 27.91 and recovers its own family at max|z| = 0.99; the matched null
returns dV2z = -0.116 and does not exclude M_0.

**The answer for yubiOS.** Not "partially compatible with Ginzburg-Landau". It
is: `M_0` **excluded** at z = +12.3; mean-field GL **excluded** on the *shape* of
dV2(N) (flat, no interior maximum) rather than on the sign of a single z -- which
matters, because the sign of that single z is exactly what the retraction
reversed; nearest family a **two-population latent-class mixture**, not-excluded,
with a small positive residual dV2 = +0.0144; `M_6` Hodge/topological
not-excluded (no excess cyclicity, and against the graph null a large *deficit*);
`M_1` planted curve **not-tested** at matched (N,d). Positively and measurably
the corpus is two things: as a matrix a two-population coverage mixture (98% of
the headline observable fixed by its marginals); as a process an absorbing
gradient flow (1178 re-measured transitions, zero regressions, coarse-grained and
front-loaded, descending a bounded exchangeable potential to a single fixpoint,
maximally irreversible and never returning). The second fact explains the first:
an append-only policy that saturates one population while leaving another sparse
manufactures exactly the row-mass bimodality that places the matrix off its own
null -- with no critical point, order parameter, or phase anywhere in it.

The dynamics channel enters the map as a declared channel, not a family:
`s_dyn = [f_back, f_multi, k_inf, shape(p_hat(k)), r_telescope]`, measured as
`0/598, 0.149, 9, U-shaped with minimum at k=4, 0.0`. Its two matched nulls (a
time-reversal null and a cycle-order permutation null) are *specified and not
executed*, so no excluded/not-excluded verdict is issued on it; any equilibrium
family is excluded on the analytic argument of D2, not on a null.

## 6. Conventions (frozen, inherited)

Fibonacci golden-angle sampling, and `i = t` -- the index *is* the parameter:

```
z_i = 1 - (2i+1)/N,   phi_i = 2 pi i / phi_g,   theta_i = arccos(z_i),
phi_g = (1 + sqrt 5)/2 = 1.6180339887...
```

Real SH basis, explicit Legendre + cos/sin split, L=3 -> 16 functions; PCA top-2
-> stereographic lift from the south pole -> S^2; identity-frozen Moebius
(a=d=1, b=c=0, no L-BFGS-B refinement); closed-form ridge
`C* = (B'B + lambda I)^-1 B'Z` with lambda = 1e-3.

**The corrected Y_3^3 constant.** `Y_3^3 = K sin^3(theta) cos(3 phi)` with

| constant | value | ratio to legacy |
|---|---:|---|
| legacy (**wrong**) sqrt(245/64pi) | 1.1038699 | -- |
| complex SH sqrt(35/64pi) | 0.4172238 | 245/35 = 7 -> legacy = **sqrt 7** x complex |
| **real-orthonormal (use this)** sqrt(70/64pi) | **0.5900436** | 245/70 = 3.5 -> legacy = **sqrt(7/2)** x real |

The error is the factor (2l+1) = 7 counted twice -- it is already inside
35/64pi. Every Y_3^3 magnitude published under the legacy constant is inflated by
1.870829x against the real-orthonormal convention and 2.645751x against the
complex one. The correction is **scale-only**: because probe channels are
standardized before scaling by amplitude, switching constants leaves the emitted
matrix bit-identical and V2 identical to 1e-12. If a legacy-K change ever moves
V2, a probe was left unstandardized and that is a bug.

The golden ratio in the sampler licenses no numerology: it has no relation to any
fitted kappa, to pentagon geometry, or to 7/9. And the three-fold narrative is
dead on real data -- under a 500-shuffle ordering-permutation null the Y_3^3 probe
sits at |z| <= 0.19 on both the 2286x9 master matrix and the real 269x9 GWTC
matrix, with the m=3 energy shares *below* their nulls (z = -1.54 to -1.74),
because ordering by PC1 puts nearby rows at nearby lattice indices and starves
high azimuthal order. The shuffled corpora are the ones with three-fold
structure.

## Examples

### Example 1 -- one temperature, with the stabilization block

```bash
python3.12 scripts/curve_compass.py simulate --T 0.05 --chains 8 --steps 60000 --seed 7
```

```
<k>            = 7.9132 +/- 0.0043 (MCse)   analytic 7.9127
Var[k]         = 0.8239                     analytic 0.8278
acceptance     = 0.5795
tau_int        = 5.486   (post-burn-in length/tau = 5468.1 per chain)
split-Rhat     = 1.00023   ESS = 43744
TV(empirical, exact pi_T) = 0.00163
max |dk| over accepted moves = 1 (quantization: must be 1)
```

T = 0.05 sits just above the crossover: pi_T has already left k=9 (mass 0.285)
for k=8 (0.421). The needle reads 7.91, and it reads it with Rhat = 1.0002 and
5468 tau per chain, which is the only reason the third decimal is worth printing.

### Example 2 -- the detailed-balance test at T = 1

```bash
python3.12 scripts/curve_compass.py balance --T 1.0 --chains 8 --steps 200000 --seed 20260812
```

```
  k   c(k->k+1)   c(k+1->k)       J        3sigma band     z      ok
  0         530         530        0   +/-     97.7   +0.00   yes
  1        4811        4810        1   +/-    294.3   +0.01   yes
  2       20892       20890        2   +/-    613.2   +0.01   yes
  3       54457       54454        3   +/-    990.0   +0.01   yes
  4       91581       91579        2   +/-   1283.9   +0.00   yes
  5       76723       76725       -2   +/-   1175.2   -0.01   yes
  6       36592       36592        0   +/-    811.6   +0.00   yes
  7       10253       10254       -1   +/-    429.6   -0.01   yes
  8        1281        1281        0   +/-    151.8   +0.00   yes
max |z(J)| = 0.010   ->  DETAILED BALANCE NOT REJECTED
TV(empirical occupancy, exact pi_T) = 0.00227
chi-square (occupancy vs pi_T, 9 df) = 34.20  on 800000 samples
historical contrast: J_hist(k) = [1, 4, 4, 8, 27, 56] forward, all-zero backward, 0/598
```

The band is binomial: given the n realized crossings of the k <-> k+1 edge, their
direction is Binomial(n, 1/2) under balance, so Var[J] = n and the band is
3 sqrt(n). Compare the last line: the historical log's J is its entire forward
count, at every k, with nothing to cancel it. That contrast is the whole skill in
one table.

### Example 3 -- the temperature sweep (the compass face)

```bash
python3.12 scripts/curve_compass.py sweep --Tmin 0.005 --Tmax 2.0 --nT 25 \
    --chains 8 --steps 40000 --seed 20260812 --out sweep.json
```

| T | argmax pi | `<k>` MC +/- MCse | `<k>` exact | Var MC | Var exact | chi | C(T) | acc | Rhat |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.0050 | 9 | 9.0000 +/- nan | 9.0000 | 0.0000 | 0.0000 | -0.005 | 0.0000 | 0.000 | nan |
| 0.0136 | 9 | 8.9886 +/- 0.0004 | 8.9886 | 0.0113 | 0.0114 | -6.090 | 0.5051 | 0.012 | 1.0001 |
| 0.0287 | 9 | 8.6627 +/- 0.0026 | 8.6607 | 0.2990 | 0.2999 | -32.516 | 3.1293 | 0.302 | 1.0002 |
| **0.0368** | 9 | 8.3673 +/- 0.0036 | 8.3714 | 0.5183 | 0.5182 | **-35.430** | **3.4510** | 0.503 | 1.0001 |
| **0.0473** | 8 | 7.9956 +/- 0.0051 | 8.0029 | 0.7763 | 0.7694 | -33.473 | 3.3206 | 0.576 | 1.0003 |

(T_x = 0.041143 lies between the T = 0.0368 and T = 0.0473 rows: that is where
argmax pi_T steps off k = 9.)

| 0.1000 | 7 | 6.7350 +/- 0.0093 | 6.7203 | 1.5362 | 1.5422 | -17.039 | 1.8081 | 0.683 | 1.0002 |
| 0.2714 | 6 | 5.4103 +/- 0.0127 | 5.4243 | 2.1805 | 2.1323 | -3.444 | 0.3709 | 0.743 | 1.0003 |
| 0.7368 | 5 | 4.8265 +/- 0.0129 | 4.8450 | 2.2644 | 2.2457 | -0.497 | 0.0531 | 0.739 | 1.0004 |
| **2.0000** | 5 | 4.6455 +/- 0.0130 | 4.6269 | **2.2783** | 2.2543 | -0.082 | 0.0072 | 0.747 | 1.0007 |

MC tracks analytic everywhere within Monte-Carlo error; that agreement is the
regression test. Read the marks: `C-PEAK` and `CHI-PEAK` at T = 0.0368, the
crossover `T_x = 0.041143` in the next interval, and `VAR-PEAK` at the refined
T = 1.787 -- but see the shallowness disclosure above before quoting it.

### Example 4 -- the historical log and the T -> 0 limit

```bash
python3.12 scripts/curve_compass.py history --Tzero 0.01 --chains 8 --steps 60000 --seed 20260812
```

```
transitions re-measured : 1178   stay 580 | +1 423 | +2..+4 175 (14.9%) | regress 0
f_back = 0/598 = 0.000000    k_inf = 9    r_telescope = 0.0
VERDICT: maximally irreversible.  No positive pi makes the chain reversible.
  Kolmogorov's cycle criterion is VACUOUS (DAG plus self-loops).
  Rule of three: backward rate < 0.0050 at 95%; entropy production >= 2240 nats per sweep.
T->0 check (T=0.01): mass at k=9 = 0.998979 (exact 0.998934), backward rate 5.417e-04/step
  net flux sum_k J(k) = 0   (the compass chain stays REVERSIBLE at every T>0)
  deeper limit T=0.001: backward transitions = 0, mass at k=9 = 1.000000 -> monotone ascent
  T->0 limit reproduces the historical endpoint: YES
```

`--log <path>` reads a T3-style results JSON and recomputes f_back from its own
`detailed_balance` block instead of the embedded constants.

### Example 5 -- regression test

```bash
python3.12 scripts/curve_compass.py --selftest    # exits 0 only when GREEN, ~13 s single-core
```

## Guidelines

1. **Never report a statistic without its null.** V_floor = 0.222 is 2/9,
   V_sat is the curveball null (0.7089 +/- 0.0014, and the 0.8005 that preceded it
   is retracted), and the "+0.4664 phase transition" is a D-change on identical
   rows. Here the nulls are the exact pi_T, the binomial direction null on J(k),
   and the T -> 0 / T -> inf limits. A number without a null is a number without a
   claim.
2. **Never read the crossover as a claim about the historical corpus.** T_x,
   C(T), chi(T), Var[k](T) are properties of a *designed* chain on a measured
   ladder. The only statement that crosses over is the limit theorem: the
   historical log is the T -> 0 endpoint. Everything else is about the compass.
3. **Always report split-Rhat, ESS and MCse with any `<k>`.** A mean with no
   convergence block is an anecdote. Refuse to quote a third decimal at
   Rhat > 1.01 or ESS < 1000, and treat a frozen (absorbed) chain as degenerate,
   not converged -- that is why the low-T rows print `nan` rather than 1.0.
4. **Check quantization every run.** `max |dk| over accepted moves` must be 1. If
   it is not, the proposal has been broken into a multi-flip move and the chain
   is no longer the atom the paper's D1 measured (where multi-step advances are a
   property of the *editor*, 14.9% of transitions, not of the atom).
5. **Keep the entropy term visible.** If you use the signed +/-1 proposal you
   MUST carry the C(9,k')/C(9,k) Hastings factor; if you use the uniform-primitive
   proposal you must NOT. Either omission silently deletes the free energy's
   entropy half and pins the peak at k=9 forever, while still producing a chain
   that mixes and a plot that looks fine.
6. **Run at least 8 dispersed chains, and length >= 50 tau_int.** Near T_x the
   distribution is broad and a single chain started at k=9 will read the mean high
   for a long time. Dispersed starts turn that failure into a visible Rhat.
7. **Report Var[k] with its asymptote.** Its interior maximum is real but is only
   +0.19% over the T -> inf binomial 9/4. C(T) = Var_pi[Phi]/T^2 and |chi(T)| are
   the sharp diagnostics and both peak at the crossover; lead with those.
8. **Phi is corpus-specific -- re-derive it for a new corpus.** The ladder
   shipped here is the 9-primitive yubiOS ladder from `T3-results.json`. A new
   corpus needs its own d_pre(k) measurement, its own terminal-sentinel decision,
   and its own re-derived C(d,k). Nothing about T_x = 0.0411 transfers.
9. **State the terminal-sentinel choice explicitly.** Phi(9) = 1.1547 (ladder
   continuation) is used; the logged 0.0 is a bookkeeping sentinel. Swapping them
   changes every number in the sweep.
10. **Do not use the compass to re-open a falsified prediction.** GL P4/P5/P7
    were falsified *in N*, and finding a susceptibility peak *in T* does not
    revive them. It is a different control parameter on a different (designed)
    system. Say so in the same sentence as the number.
11. **Seeds are part of the result.** Every subcommand takes `--seed` and the
    selftest asserts bitwise determinism under a fixed seed. A trajectory summary
    you cannot regenerate is not evidence.
12. **Prefer exclusion-only language.** `excluded` / `not-excluded` /
    `not-tested` / `void`. Never `PARTIAL`, never "compatible with".

## Constraints

- **stdlib + numpy only.** No scipy, sklearn, pandas, matplotlib. Hard
  requirement, matching the rest of the regime.
- **LOCAL ONLY.** No network, no external API. Reads an optional T3-style JSON
  log; writes JSON where told.
- The item state is binary `{0,1}^{N x 9}`: nine primitives, coverage count
  `k = 9 - |missing|`. Continuous data must be binarized under a stated rule
  before it touches this skill.
- **The Phi ladder is corpus-specific.** Shipped values are the yubiOS 9-primitive
  ladder (source: `tests/T3-results.json`, corpus `skills79`,
  `potential_test.Phi_k_eq_d_pre` plus `terminal_sentinel.d_post_at_k8`).
  Re-derive for any other corpus; do not transport T_x.
- The chain is on the coverage count by design. Because Phi is exchangeable, the
  configuration is not needed for any reported statistic except the quantization
  check, which is run at configuration level in `--selftest` step 7.
- Runtime: selftest ~13 s, the 25-point sweep at 40k steps x 8 chains ~17 s, the
  200k-step balance run ~10 s, single core.
- `--proposal atom` and `--proposal signed` must agree; if they ever disagree on
  pi_T, one of the two acceptance rules is wrong. That is asserted, not assumed.

## Anti-patterns

- **Don't call the compass's equilibrium a property of the corpus.** The corpus
  has no equilibrium ensemble; that is the paper's D2 and it is not softened here.
- **Don't drop (or double-count) the Hastings degeneracy factor.** See guideline
  5. This is the failure mode that still looks like a working chain.
- **Don't use Phi(9) = 0.0.** The logged zero is a sentinel, not a depth.
- **Don't quote `<k>(T)` from a single chain, or from a chain shorter than
  50 tau_int.** Near T_x the autocorrelation is at its worst precisely where the
  interesting numbers are.
- **Don't report Var[k]'s peak as a phase transition.** It is a 0.19% excess over
  the binomial asymptote on a 10-state lattice. There is no thermodynamic limit
  here: d = 9 is finite and fixed, so "crossover" is the correct word and
  "transition" is not.
- **Don't compare V2 across different d, ever** (0.7235 / 0.4907 / 0.2882 /
  0.2052 at d = 9, 14, 24, 34 on identical rows). Any climb coinciding with a
  basis change is a basis change.
- **Don't cite PC1+PC2 = 1.0000 as a good fit** -- it is rank degeneracy, and a
  pure-noise iid corpus achieves it in two of eleven bases.
- **Don't use the iid or column-permutation null to claim structure** -- they
  reject on row-mass bimodality alone, which every saturating append-only loop
  manufactures for free.
- **Don't read a t_fold, or any z here, against a Gaussian tail.** The per-cell z
  is over-dispersed at sd = 1.320; the reference is the empirical null.
- **Don't skip the selftest after editing the script.** It is the only thing
  between a stationary distribution and a plausible-looking histogram.

## Red flags

| Observation | What it means |
|---|---|
| `max \|dk\|` > 1 on accepted moves | the atom has been broken; the chain is no longer quantized |
| empirical occupancy peaks at k=9 at every T | the entropy term is missing (Hastings factor dropped, or Phi(9)=0.0 sentinel used) |
| `\|z(J)\|` > 3 on any k in `balance` | implementation error: mis-signed acceptance, boundary leak, or a biased RNG. The theory cannot fail here, so a failure is a bug |
| split-Rhat > 1.01 with ESS in the tens of thousands | chains are stuck in different basins -- you are near or below T_x and need longer runs, not more chains |
| `tau_int` reported as `nan` / acceptance exactly 0.000 | every chain has absorbed (T far below T_x). Correct behaviour, but the mean is a point mass and no error bar is meaningful |
| MC and analytic `<k>` disagree by more than 3 MCse | burn-in too short, or the analytic pi_T and the kernel have drifted apart -- rerun the selftest |
| acceptance rate ~ 0.75 and flat in T | you are in the entropy-dominated regime; the ladder is doing nothing and every number is a binomial fact |
| a "critical exponent" fitted to C(T) | there is no thermodynamic limit on a 9-site lattice; the peak is a crossover, not a singularity |
| Var[k] quoted above 2.25 without the asymptote | the excess is 0.19%; without the baseline the reader will over-read it |
| a claim about the corpus derived from a T > 0 run | category error -- only the T -> 0 limit touches the historical log |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `curved-corpus-create` | supplies the matrices, the curveball/column-permutation/iid nulls, the calibration pack and the IS-THIS-X placement machinery. The compass consumes its conventions (Fibonacci lattice, corrected K, exclusion-only verdicts) and adds the trajectory channel it has no access to. | curved-corpus-create -> curve-compass-skill |
| is-this-x evidence bundle (`tests/T3-results.json`) | supplies **Phi** itself -- d_pre(k), d_post(k), the pooled transition counts, p_hat(k), the terminal sentinel. Without it this skill has no potential to put a chain on. | bundle -> curve-compass-skill |
| `single-action-curve-rsi` | is the **T -> 0 special case**: one greedy best-flip per file per cycle, monotone, absorbing. The compass generalizes it to a one-parameter family and recovers it exactly as T -> 0 (verified in `history`). | curve-compass-skill superset of single-action-curve-rsi |
| `hyperspherical-harmonic-curve` | owns the matrix fit; the compass owns the trajectory. Keep the primitive order and the ladder identical or nothing transfers. | bidirectional |
| Hodge channel (`C-hodge-pivot`) | orthogonal here: it decomposes a flow on the item graph, the compass evolves a state on the coverage lattice. They share only the corpus. Do not read rho_c as a temperature -- it is a disorder measure, and the paper says so explicitly. | none |
| `rsi-phi-skill` | the improvement loop that *produced* the log. The compass can supply it a principled exploration temperature (T slightly above T_x keeps the population off the absorbing state); that is a design suggestion, not a measured result. | curve-compass-skill -> rsi-phi-skill |

## Self-containment

Reads: nothing required (the ladder and the log summary are embedded, with their
source cited inline). Optionally one T3-style results JSON via `history --log`.
Writes: JSON where told. Depends on: Python 3.12 stdlib + numpy. No network, no
skill registry, no prior outputs.

## Verification

```
python3.12 scripts/curve_compass.py --selftest
```

Eight blocks, all asserted, exit 0 iff GREEN (~13 s single-core):

1. **Stationary distribution.** Empirical occupancy matches the exact pi_T at
   T=1 with TV = 0.00296 (signed proposal) and 0.00120 (atom proposal), both
   < 0.02 -- which simultaneously verifies that the two acceptance rules describe
   the same chain.
2. **Detailed balance.** Every J(k) sits inside its 3-sigma binomial band at
   T = 1; measured max |z(J)| = 0.009.
3. **Convergence.** split-Rhat = 1.00008 (< 1.01), ESS = 42906 (> 1000),
   tau_int = 11.19.
4. **T -> 0 limit.** At T = 0.01, mass at k=9 = 0.99903 with backward rate
   4.79e-4/step and net-flux z = 0.00 (still reversible); at T = 0.001, zero
   backward transitions and mass 1.00000 -- monotone ascent absorbing at k=9,
   matching the historical k_inf = 9 and f_back = 0/598.
5. **T -> inf limit.** TV(empirical, Binomial(9,1/2)) = 0.00146 < 0.05 at
   T = 1000; `<k>` = 4.4999 against 4.5.
6. **Fluctuation peak.** Var[k] peaks interior to [0.005, 2.0] at T = 1.78743
   (Var = 2.254301, +0.19% over the binomial asymptote), and the sharp diagnostic
   C(T) peaks at T = 0.03830 -- interior, and within 7% of the crossover
   T_x = 0.04114.
7. **Quantization.** max |dk| = 1 over all accepted moves, and 131,642
   configuration-level moves across both proposals show zero violations of
   (|dk| = 1 and Hamming distance 1).
8. **Determinism.** Bitwise-identical trajectories under a repeated seed, and
   different ones under a changed seed.

## Changelog

- **1.0.0** (2026-08-12) -- initial. Returns the Ginzburg-Landau free energy to
  the regime by construction rather than by metaphor: a quantized +/- atom with
  Metropolis acceptance on the empirical Phi ladder, exact stationary
  pi_T(k) ~ C(9,k)exp(-Phi(k)/T), F_T(k) = Phi(k) - T log C(9,k), detailed balance
  by construction from D3 exchangeability. Establishes the crossover
  T_x = 0.041143, the heat-capacity peak at T = 0.038304 and the susceptibility
  peak at T = 0.0368, and proves the historical log is the singular T -> 0
  endpoint (monotone ascent, absorbing at k=9) rather than a small-T member of
  the family. Discloses the Var[k] peak as shallow (+0.19% over the binomial
  asymptote) rather than presenting it as a transition. Uses the ladder
  continuation Phi(9) = 1.1547 in place of the logged sentinel 0.0, and says so.
  Carries the paper's corrected record: V2's dimension artifact, the
  gate-equals-rank identity, the corrected curveball null and the z = -45.8
  retraction, the flat dV2(N), the Hodge anti-cyclicity channel with three
  falsified predictions, calibrated and fold-aggregated detection, Parseval
  shares, the five identity checks with their admission rule, the IS-THIS-X map,
  and the corrected Y_3^3 constant K = sqrt(70/64pi) = 0.5900436.

## Maintainer

Sauna, wave 2. Built against `papers/is-this-x-2026-08-12.md` (sections 3-8, and
section 7 in particular), the evidence bundle's `tests/T3-results.json`, and the
`curved-corpus-create` SKILL.md exemplar.
