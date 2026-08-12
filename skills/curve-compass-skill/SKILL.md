---
name: curve-compass-skill
description: >-
  Reversible quantized-atom dynamics on the empirical Phi ladder (skills79, d=9), with curated -L/--lens mode that emits each improvement as a guided-curve-ideate-format new idea: hypothesis + method + parameters + Δ + verdict + score. The historical corpus dynamics (is-this-x paper sec. 7) is maximally irreversible, so this skill builds a designed chain on the same measured potential Phi(k) where detailed balance holds by construction and the Ginzburg-Landau free energy returns legitimately. Crossover T_x = 0.041143 with C-PEAK at T=0.038304. v1.1.0 adds lens-format patch generation -- each suggested file edit is a measurable experiment with concrete hypothesis, method, parameters, observed delta, and honest verdict, NOT a templated section. Use when the request mentions free energy, detailed balance, reversibility, quantized atom, Metropolis or Monte-Carlo on a coverage ladder, trajectory stabilization, burn-in, autocorrelation time, split-Rhat, effective sample size, temperature sweep, crossover temperature, fluctuation or susceptibility peak, energy-entropy competition, absorbing dynamics, entropy production, irreversibility, new ideas scheme, lens-format patches, hypothesis-driven improvement, guided-curve-ideate integration, "is this X", null-standardized statistics, curve compass, or Phi ladder. NOT for generating corpora or calibrating detection on matrices (use curved-corpus-create), NOT for measuring an existing corpus's curve (use hyperspherical-harmonic-curve), and NOT a claim about the historical corpus -- everything measured here is a property of the designed chain.
---

# curve-compass-skill

The is-this-x paper closed the Ginzburg-Landau door twice. From the matrix
side: the "critical point" is the null's own finite-size inflation, and the
fluctuation peak, the susceptibility divergence and critical slowing-down
are all falsified or unsupported. From the process side, and more
decisively: the corpus's own construction dynamics has **zero back-flux
in 598 opportunities**, so no positive pi makes it reversible, its
unique stationary distribution is the absorbing delta_{k=9}, and *there
is no equilibrium ensemble for a Landau free energy to be an expansion
of*.

This skill does not reopen that door. It builds a new one, next to it,
and is explicit about which side of the wall each number lives on.

**The thesis.** Take the paper's own measured potential Phi(k), and put
on it a designed dynamics: a quantized +/- atom with Metropolis
acceptance. Because Phi is a function of k alone (D3: exchangeability),
the induced chain on k is a birth-death chain with detailed balance by
construction, and its stationary distribution is exactly

```
pi_T(k)  =  C(9,k) exp(-Phi(k)/T) / Z(T)  =  exp(-F_T(k)/T) / Z'(T),
F_T(k)   =  Phi(k) - T log C(9,k).
```

That F_T is the Ginzburg-Landau energy-entropy competition on a bounded
lattice, returned legitimately.

## v1.1.0 -- lens-format patches

The first real-world use (cycle 1, PR #202, 2026-08-12) shipped 356
templated `## Purpose` / `## Examples` / ... sections across the
yubiOS repo. Jenny declined the merge: the patches were *too structured
to produce the needed dynamics*. Each patch added the same shape of
prose regardless of the file's actual content.

**v1.1.0 changes the patch format.** Every suggested file edit is now
a guided-curve-ideate-format new idea (per the cycle-34 SKILL.md and
cycle-34 new-ideas-cycle34.md/json artifacts):

```
L<N> -- <short-name>
  hypothesis:  <a testable claim about this file>
  method:      <how the test runs>
  parameters:  <inputs to the experiment>
  delta:       <measured result, with units>
  verdict:     YES | PARTIAL | NO
  score:       0-50 (rank against the lens pool)
  caveat:      <what the experiment did NOT measure>
```

The lens format mirrors the cycle-34 L141-L146 outputs and the
ses_02311d1deffe top-3-picks artifact (`new-ideas.md`, score 46/50).
Each lens is a CONCRETE EXPERIMENT with measurable dynamics, not a
generic section template.

## Lens format vs section template

| Section template (v1.0.0) | Lens format (v1.1.0) |
|---|---|
| `## Purpose` boilerplate | `hypothesis:` testable claim specific to the file |
| `## Examples` generic | `method:` how the test runs against this file |
| `## Verification` placeholder | `parameters:` exact inputs and seed |
| `## Changelog` date stamp | `delta:` measured number with units |
| `## References` footer | `verdict:` YES/PARTIAL/NO with reasoning |
| `## Anti-patterns` checklist | `score:` 0-50 rank in the lens pool |
| (no analogue) | `caveat:` what was NOT measured |

The lens is the patch; the patch is the lens. The file edit *is* the
experiment report, not prose about the file.

## 1. The corrected record (C1-C4)

Do not report any statistic from this regime without the null it is
standardized against. The four corrections below are why.

**C1 -- V2 is a dimension artifact.** On the correlation matrix tr
Sigma = D, so V2 = (lambda_1+lambda_2)/D is a *share*. Appending a
column that does not load on the leading plane adds ~1 to the
denominator and o(1) to the numerator, so V2 is non-increasing in D
with flat-spectrum floor 2/D. Measured on the identical 2286 rows:
V2 = 0.7235 at D=9 and V2 = 0.2940 at D=24.

**C2 -- the gate is a rank identity.** The shipped estimator does not
compute the participation ratio PR. It reports the two-share proxy
r_hat = 2/V2, so V2 >= 0.40 <=> r_hat <= 5 (definitional identity, zero
empirical content).

**C3 -- the corrected null, and a retraction.** Under the fixed-margin
(curveball) ensemble, drawn by two independently validated uniform
samplers, the 2286x9 matrix has real V2 = 0.7235293730732693 and
curveball = 0.709180 +/- 0.001183 -> dV2 = +0.014415, dV2z = +12.13.
Retracted: an intermediate analysis reported the same null as
0.8005 +/- 0.0017, hence z = -45.8. That value does not reproduce,
its sign is wrong, and every downstream statement resting on it is
withdrawn.

**C4 -- there is no critical point.** With the null recomputed at
each N, `dV2 = +0.0058, +0.0175, +0.0175, +0.0135, +0.0153, +0.0145,
+0.0144` across N = 40, 79, 160, 320, 640, 1280, 2286 -- flat for
N >= 79 with no interior maximum.

## 2. The measurement channels

### Matrix channel

Primary statistic, always: `dV2z = (V2 - E_0[V2]) / SD_0[V2]` against
the curveball (fixed row *and* column margin) null at the corpus's
own N, d and marginals. Decide on dV2z; report V2, PC1+PC2, design
numerical rank and condition number beside it for continuity, never
instead of it.

### Dynamics channel

On the shipped edit log (213 files, 1391 dispatches, 1178 file-level
transitions): D1 580 stay (all at the absorbing k=9), 423 advance by
one, 175 (14.9%) advance by 2-4, none regresses. D2 T(k+1 -> k) = 0
for every k. Reversibility requires pi(k)T(k,k+1) = pi(k+1)T(k+1,k)
with the left side positive and the right identically zero, so no
positive pi makes the chain reversible. D3 Phi(k) = d_pre(k) takes
exactly one value per k in all three corpora.

## 3. Identity checks: coordinates that cannot fail

| quantity | status | why it carries no data |
|---|---|---|
| `V2 >= 0.40 <=> r_hat <= 5` | identity | `r_hat = 2/V2` by definition |
| sphere-fit `R^2 = 1.0000` | identity | the L=1 block is linear in (x,y,z), evaluated in-sample on the embedding it fits |
| `sum wrap(dphi) in 2pi Z` | identity | wrapped increments of any angle-valued field sum to 2pi Z around any closed loop |
| Kolmogorov cycle criterion on the edit log | vacuous | zero backward edges make the chain a DAG; no directed cycle exists to test |
| `delta(k) = Phi(k) - Phi(k+1)` | identity | the ladder distance is a fixed function of the coverage count |

**Admission rule (inherited, and binding on this skill):** *no
coordinate is admitted without a demonstrated non-degenerate null.*

## 4. The compass mechanism

### The quantized +/- atom

```
atomic positive:  flip one MISSING primitive ON   ->  k -> k+1
atomic negative:  flip one PRESENT primitive OFF  ->  k -> k-1
```

Proposal (`--proposal signed`, the design of record): choose direction
d = +/-1 with probability 1/2 each -- a move off a boundary is proposed
and rejected -- then choose a uniformly random eligible primitive.

### Metropolis acceptance, and why the entropy term is not optional

The signed proposal is asymmetric on configuration space, so the
Hastings ratio contributes exactly C(9,k')/C(9,k) and the acceptance
is

```
alpha = min(1, exp(-[F_T(k') - F_T(k)]/T)),     F_T(k) = Phi(k) - T log C(9,k)
```

i.e. **Metropolis on the free energy**.

### The crossover

| regime | who wins | pi_T peaks at |
|---|---|---|
| `T < T_x = 0.041143` | energy (Phi) | k = 9, the historical absorbing endpoint |
| `T > T_x` | entropy (log C(9,k)) | interior, approaching binomial 4.5 |

```
crossover        T_x  = 0.041143      (bisection on argmax pi_T)
heat capacity    C(T) = Var_pi[Phi]/T^2  peaks at T = 0.038304, C = 3.4565
susceptibility   |chi(T)| = |d<k>/dT|    peaks at T = 0.0368,  chi = -35.43
fluctuation      Var[k]                  peaks at T = 1.787431, Var = 2.254301
```

## 5. Lens-format patch generation (v1.1.0)

The `lens` subcommand reads a corpus JSON and emits one lens per
file. Each lens has hypothesis + method + parameters + Δ + verdict +
score + caveat, in the cycle-34 format.

```bash
python3.12 scripts/curve_compass.py lens \
    --corpus session/rsi-compass-cycle2/corpus.json \
    --out session/rsi-compass-cycle2/lenses.json
```

Output schema:

```json
{
  "lens_pool": [
    {
      "lens": "L147",
      "file": "docs/AGENTS.md",
      "hypothesis": "AGENTS.md covers all 9 primitives in the internal-big-picture basis",
      "method": "9-D primitive binarization (purpose, examples, guidelines, constraints, verification, composition, changelog, references, anti-patterns) + chordal distance to ideal pole on Fibonacci lattice",
      "parameters": {"basis": "internal-big-picture", "d": 9, "seed": 20260812},
      "delta": {"k": 9, "missing_primitives": [], "chordal_resid": 0.0, "dV2z": null},
      "verdict": "YES",
      "score": 50,
      "caveat": "binarization is heuristic; a stricter regex pass might surface sub-primitives"
    },
    {
      "lens": "L148",
      "file": "skills/foo/SKILL.md",
      "hypothesis": "SKILL.md spec compliance with Anthropic SKILL.md Format 2.2",
      "method": "frontmatter name regex + description length 1-1024 + Examples + Guidelines sections present",
      "parameters": {"spec": "2.2", "strict": false},
      "delta": {"frontmatter_valid": true, "sections": ["Examples", "Guidelines"], "score": 47},
      "verdict": "PARTIAL",
      "score": 38,
      "caveat": "spec 2.2 strict requires Composition + Verification; not validated"
    }
  ]
}
```

The lens output is the patch input. To apply, fetch the file's
content via the Contents API, append the lens JSON as a fenced code
block under a `## New Ideas -- cycle 2` heading, and push via Git
Data API.

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

### Example 2 -- the detailed-balance test at T = 1

```bash
python3.12 scripts/curve_compass.py balance --T 1.0 --chains 8 --steps 200000 --seed 20260812
```

```
  k   c(k->k+1)   c(k+1->k)       J        3sigma band     z      ok
  0         530         530        0   +/-     97.7   +0.00   yes
  ...
max |z(J)| = 0.010   ->  DETAILED BALANCE NOT REJECTED
```

### Example 3 -- the temperature sweep (the compass face)

```bash
python3.12 scripts/curve_compass.py sweep --Tmin 0.005 --Tmax 2.0 --nT 25 \
    --chains 8 --steps 40000 --seed 20260812 --out sweep.json
```

(See full sweep table in v1.0.0 SKILL.md -- unchanged in v1.1.0.)

### Example 4 -- the historical log and the T -> 0 limit

```bash
python3.12 scripts/curve_compass.py history --Tzero 0.01 --chains 8 --steps 60000 --seed 20260812
```

### Example 5 -- lens-format patch generation (NEW in v1.1.0)

```bash
python3.12 scripts/curve_compass.py lens \
    --corpus cycle2/corpus.json --out cycle2/lenses.json
```

Output: `cycle2/lenses.json` containing one lens per file. Each lens
is a CONCRETE EXPERIMENT with hypothesis + method + parameters + delta
+ verdict + score + caveat. Top-3 picks by score:

```
L147 docs/AGENTS.md                score=50/50  YES   k=9/9 primitives covered
L148 skills/foo/SKILL.md           score=38/50  PARTIAL  spec 2.2 partial compliance
L149 scripts/bar.sh                score=22/50  NO    shellcheck fails
```

### Example 6 -- regression test

```bash
python3.12 scripts/curve_compass.py --selftest    # exits 0 only when GREEN
```

Eight blocks (unchanged from v1.0.0).

## Guidelines

1. **Never report a statistic without its null.** A number without a
   null is a number without a claim.
2. **Never read the crossover as a claim about the historical corpus.**
   T_x, C(T), chi(T), Var[k](T) are properties of a designed chain
   on a measured ladder. The historical log is the T -> 0 limit.
3. **Always report split-Rhat, ESS and MCse with any `<k>`.** A mean
   with no convergence block is an anecdote.
4. **Check quantization every run.** `max |dk| over accepted moves`
   must be 1.
5. **Keep the entropy term visible.** If you use the signed +/-1
   proposal you MUST carry the C(9,k')/C(9,k) Hastings factor.
6. **Run at least 8 dispersed chains, and length >= 50 tau_int.**
7. **Report Var[k] with its asymptote.** Its interior maximum is
   real but is only +0.19% over the T -> inf binomial 9/4.
8. **Phi is corpus-specific -- re-derive it for a new corpus.**
9. **State the terminal-sentinel choice explicitly.** Phi(9) = 1.1547
   is used; the logged 0.0 is a bookkeeping sentinel.
10. **Lens-format patches only (v1.1.0).** Every suggested file edit
    is a guided-curve-ideate-format new idea with hypothesis + method
    + parameters + delta + verdict + score + caveat. NO templated
    `## Purpose` / `## Examples` sections.
11. **Seeds are part of the result.** Every subcommand takes `--seed`.
12. **Prefer exclusion-only language.** excluded / not-excluded /
    not-tested / void. Never PARTIAL / "compatible with".

## Constraints

- **stdlib + numpy only.** No scipy, sklearn, pandas, matplotlib.
- **LOCAL ONLY.** No network, no external API.
- The item state is binary `{0,1}^{N x 9}`. Continuous data must be
  binarized under a stated rule before it touches this skill.
- The Phi ladder is corpus-specific. Re-derive for any other corpus.
- The chain is on the coverage count by design.
- Lens-format patches (v1.1.0) carry their own experimental design;
  the patch *is* the lens, not prose about the file.

## Anti-patterns

- **Don't call the compass's equilibrium a property of the corpus.**
- **Don't drop (or double-count) the Hastings degeneracy factor.**
- **Don't use Phi(9) = 0.0.** The logged zero is a sentinel, not a
  depth.
- **Don't quote `<k>(T)` from a single chain, or from a chain shorter
  than 50 tau_int.**
- **Don't report Var[k]'s peak as a phase transition.**
- **Don't compare V2 across different d, ever.**
- **Don't cite PC1+PC2 = 1.0000 as a good fit.**
- **Don't use the iid or column-permutation null to claim structure.**
- **Don't read a t_fold, or any z here, against a Gaussian tail.**
- **Don't ship templated `## Purpose` / `## Examples` patches (v1.0.0
  format).** Use lens format (v1.1.0).
- **Don't score a lens without a delta.** Score 50 means the
  experiment ran and measured the claimed delta; score 0 means the
  lens is aspirational only.

## Red flags

| Observation | What it means |
|---|---|
| `max |dk|` > 1 on accepted moves | the atom has been broken |
| empirical occupancy peaks at k=9 at every T | the entropy term is missing |
| `|z(J)|` > 3 on any k in `balance` | implementation error |
| split-Rhat > 1.01 with ESS in the tens of thousands | chains are stuck in different basins |
| lens has `delta: {}` or `score: 0` | the experiment did not run; the lens is aspirational |
| 100+ lenses all verdict=YES with score 50 | the experiment is degenerate (always passes) |

## Composition

| Skill / channel | How it composes | Direction |
|---|---|---|
| `curved-corpus-create` | supplies the matrices, the curveball/column-permutation/iid nulls, the calibration pack and the IS-THIS-X placement machinery. The compass consumes its conventions and adds the trajectory channel + lens-format patch generation. | curved-corpus-create -> curve-compass-skill |
| `guided-curve-ideate` | the lens-format scheme is sourced from guided-curve-ideate cycle-34 new-ideas-cycle34.md/json (L141-L146 structure: lens, name, status, key_result, verdict). The compass `lens` subcommand emits the same JSON shape with a hypothesis + method + parameters + delta + verdict + score + caveat per file. | guided-curve-ideate -> curve-compass-skill |
| `single-action-curve-rsi` | is the T -> 0 special case: one greedy best-flip per file per cycle, monotone, absorbing | curve-compass-skill superset of single-action-curve-rsi |
| `rsi-phi-skill` | the improvement loop that *produced* the log. The compass can supply it a principled exploration temperature (T slightly above T_x keeps the population off the absorbing state). | curve-compass-skill -> rsi-phi-skill |

## Self-containment

Reads: nothing required (the ladder and the log summary are embedded).
Optionally one T3-style results JSON via `history --log`. Optionally
a corpus JSON via `lens --corpus`.

Writes: JSON where told.

Depends on: Python 3.12 stdlib + numpy. No network, no skill registry.

## Verification

```
python3.12 scripts/curve_compass.py --selftest
```

Eight blocks (unchanged from v1.0.0), all asserted, exit 0 iff GREEN.

Plus v1.1.0 lens-format block: 6 assertions on lens output schema
(lens, file, hypothesis, method, parameters, delta, verdict, score,
caveat all present; verdict in {YES, PARTIAL, NO}; score 0-50).

## Changelog

- **1.0.0** (2026-08-12) -- initial.
- **1.1.0** (2026-08-12) -- lens-format patches. The first real-world
  use (cycle 1, PR #202) shipped templated `## Purpose` / `## Examples`
  / ... sections across the yubiOS repo. Jenny declined the merge:
  the patches were too structured to produce the needed dynamics.
  v1.1.0 changes the patch format to guided-curve-ideate-format new
  ideas: each patch is a CONCRETE EXPERIMENT with hypothesis + method
  + parameters + delta + verdict + score + caveat. Adds the `lens`
  subcommand, 6 new selftest assertions, and the Composition link to
  `guided-curve-ideate` cycle-34. Cycle 2 PR off of main (different
  from PR #202) uses this format.

## Maintainer

Sauna, wave 2. Built against `papers/is-this-x-2026-08-12.md`
(sections 3-8, and section 7 in particular), the evidence bundle's
`tests/T3-results.json`, and the `curved-corpus-create` and
`guided-curve-ideate` SKILL.md exemplars.
