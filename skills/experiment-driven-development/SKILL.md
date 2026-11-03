---
name: experiment-driven-development
description: Decides whether a change to a threshold, heuristic, scoring or ranking rule, model, or other decision logic actually beats what runs today, with a result that survives held-out data and an honest error bar. Use when tuning a threshold or parameter and picking the best value, comparing a candidate algorithm or model against the current one, judging a backtest, offline evaluation or A/B experiment before shipping it, or asked whether a measured improvement is real or statistically significant. Applies even when the results are pasted inline and the improvement looks obvious.
---

# Experiment-Driven Development

## Overview

A plausible backtest is easy; a correct one is not. The difference is usually a leak nobody noticed, a parameter tuned on the data that scores it, a margin with no interval, or a baseline that isn't what production actually runs. Experiment-driven development treats every "the new rule is better" as a hypothesis to refute: measured against the incumbent, pre-registered, confirmed once on data the tuning never touched, and reported with its uncertainty and its losses.

The question is never "is the candidate good?" It is **"does it beat the incumbent, by how much, with what confidence, and what gets worse?"**

## When to Use

- Changing a threshold, weight, window, rate limit, retry policy, alert rule, ranking or scoring function, fraud/spam rule, recommender, or ML model that already runs in production
- Reading a backtest, offline evaluation, notebook, or A/B test result before acting on it, including someone else's
- Picking "the best" value from a sweep or grid
- Someone claims an improvement in percent and asks whether to ship

**When NOT to use:**

- Descriptive questions ("what's the p95 latency", "how many nulls in this column"): answer them directly
- Speed of code paths: use `performance-optimization`, which owns profiling and benchmarks
- Correctness of logic with a known right answer: use `test-driven-development`
- No incumbent and nothing to compare against yet: build the first version, then come back when you want to change it

If the answer won't move a threshold, a rule, or a ship decision, say you skipped the process and why.

## The Process

Copy this checklist:

```
Experiment:
- [ ] Step 1: FRAME — incumbent with its real config, failure cases, one hypothesis, minimal candidate
- [ ] Step 2: PRE-REGISTER — metric, guardrails, minimum effect, refutation, written before any number
- [ ] Step 3: HARNESS — production code, causal inputs, fidelity + placebo + planted-leak controls pass
- [ ] Step 4: EXPLORE — tune on development data only, count every variant tried
- [ ] Step 5: CONFIRM — one held-out pass, interval over the independent unit, per-case losses
- [ ] Step 6: RED-TEAM — fresh-context reviewer tries to refute the claim
- [ ] Step 7: DECIDE — ship or not, rollout path, a dated prediction to check in production
```

### Step 1: FRAME — the incumbent is the yardstick

Everything is a difference against the current system, run with the configuration production **actually uses**. Read the deployed config, environment, feature flags, or logged decisions; never trust a code default or a preset. A win over the wrong baseline is no win.

Then find where the incumbent fails, with real cases from the data. Write two to four competing explanations for those failures and drop the ones the cases already refute. The candidate is the **smallest change that tests one surviving explanation**. A candidate that bundles several mechanisms needs an ablation later: each mechanism must earn its place on its own.

### Step 2: PRE-REGISTER — freeze the question before computing

Before the first number, write `EXPERIMENT.md`:

```markdown
# Question
<one sentence: does X beat the incumbent at Y?>

## Incumbent
<what runs today, with the exact config and where you read it>

## Decision metric
<one primary metric, the unit it is computed over, and the minimum effect worth shipping>

## Guardrails
<what must not get worse, as invariants checked on every run>

## Refutation
<the result that would make you drop the candidate>

## Data
<period, population, development vs held-out split, and why the split is honest>

## Not doing
<scope you are deliberately leaving out>
```

Confirm it with the user if they are reachable: what decision this changes, and what a miss costs. Anything you change later goes in a **Deviations** section with the reason, plus the result under the original plan. A question tuned until it says yes is not an experiment.

### Step 3: HARNESS — measure the real system on what it could have known

Run the production decision code, not a reimplementation of it; build only the candidate on top. Feed it inputs that hold **only what each decision could see at its moment**:

- Rolling statistics, normalizers, and encoders computed from the past only (no centered windows, no fit on the whole series)
- Data used as of when it was published, not when it was final (late-arriving rows, revised values, forecast vintages)
- Labels and features that don't encode the outcome
- Time boundaries in the right timezone, with daylight-saving days handled

Before scoring any candidate, prove the harness can be trusted:

| Control | Passes when |
|---|---|
| Fidelity | The harness reproduces the incumbent's real past decisions (or the gap is measured and reported) |
| Placebo | A change that should do nothing scores zero within the interval |
| Planted leak | A deliberately leaky variant scores suspiciously well, and a known-worse candidate loses |
| Neutral setting | The candidate with its feature off decides exactly like the incumbent |

A harness that fails any of these measures itself, not the system.

### Step 4: EXPLORE — tune freely, but only on development data

Iterate on the development split. Keep the loop fast and deterministic (fixed seeds, small subset) and **count every variant you try**: each grid cell is another comparison, and the best of many wins on noise.

### Step 5: CONFIRM — one pass, held-out, with uncertainty

Run the frozen candidate **once** on held-out data with the pre-registered metric. That number is the result; the development number is not.

**Find the independent unit.** Rows are rarely independent: a minute, request, or tick is correlated with its neighbours. The unit is usually an incident, a user, a day, a session, or a site. Compute the interval over that unit by bootstrap or permutation:

```python
import random
def bootstrap_ci(per_unit_deltas, n=10_000, seed=0):
    rng = random.Random(seed)
    k = len(per_unit_deltas)
    means = sorted(sum(rng.choices(per_unit_deltas, k=k)) / k for _ in range(n))
    return means[int(0.025 * n)], means[int(0.975 * n)]
```

If the sign doesn't survive the interval, there is no result. When data is too scarce for a meaningful held-out set, cross-validate over the independent unit instead (folds by day or incident, never random rows; forward-chained when neighbours depend on each other) and **redo the tuning inside each fold**. Report the spread across folds, not just the mean.

Then report:

- The headline delta with its interval, in the unit you pre-registered
- Every guardrail, recomputed independently
- A **per-case diff**: every case where the candidate decided differently, and the cases where it loses to the incumbent. A candidate that wins on average but loses the expensive cases doesn't win.
- If the candidate outputs a probability: its calibration (reliability by bin), not just its ranking

**Online A/B tests** add their own checks: sample-ratio mismatch first, one primary metric, no stopping early on a peek unless the test was designed for sequential looks, and the unit of randomization is the unit of analysis.

### Step 6: RED-TEAM — let someone try to refute it

Use the fresh-context reviewer mechanism in `doubt-driven-development`. The CONTRACT is `EXPERIMENT.md`, the ARTIFACT is the code, data, and results table; pass neither your conclusion nor your reasoning. Use this prompt:

```
Adversarial statistical review. Assume any improvement in these results is
a false positive and try to make that stick. Check:
- Temporal: could each decision see only the past? Look-ahead, publication
  lag, leaky normalization, regime dependence.
- Inference: effective n in independent units, tuned on the scoring data,
  interval present and sign survives it, calibration, seed sensitivity.
- Decision: metric vs real objective, where it loses to the incumbent,
  asymmetric costs, inert mechanisms, incumbent run with its real config.
Report only threats you tried to refute and could not. Re-run what you can.
CONTRACT: <EXPERIMENT.md>
ARTIFACT: <code, data, results table>
```

A surviving threat sends you back to Step 3–5. Findings are claims to verify, not a to-do list. Stop after three review cycles; if threats still survive, the result isn't ready, so take it to the user rather than grinding a fourth.

### Step 7: DECIDE — and close the loop

Write the decision next to `EXPERIMENT.md`: ship or not, behind which flag, whether it goes first in shadow or log-only mode, and a **prediction for production** ("we expect X ± Y, check on <date>"). Include a reproduce command that regenerates the headline from clean, and run it once.

A negative or inconclusive result is a result. Record it so nobody re-runs it blind, and if the candidate can't be told apart from the incumbent within noise, the simpler one wins.

## Reviewing Someone Else's Result

When handed a finished backtest, notebook, or A/B readout, skip to the questions that kill most false positives, in this order:

1. Is the baseline the incumbent with its production config?
2. Could any input see the future (centered windows, whole-series normalization, final instead of as-published data)?
3. Was the headline scored on the same data the parameters were tuned on?
4. What is the independent unit, how many are there, and where is the interval?
5. Which guardrail got worse, and which cases does the candidate lose?

Re-run the result after fixing each flaw you find; report the corrected number, not just the list of flaws. On this path, the Verification items that apply are the baseline, held-out, interval, guardrail, and losses checks; the rest belong to running your own experiment.

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "The improvement is big, it must be real" | Big effects are where leaks hide. A 30% jump from a small change is a reason to look for look-ahead first. |
| "The code default is close enough to what prod runs" | Then the gap is an error bar on every result. Read the deployed config. |
| "The held-out set is small, I'll score on everything" | Then the headline is a development number. Report the small held-out result with its wide interval. |
| "One more grid cell" | Each cell is another comparison. Count them, and confirm the winner on held-out data. |
| "The interval is wide but the sign is positive" | A sign inside the interval is no result. |
| "We have 50,000 rows, that's plenty" | Count independent units. Fifty thousand minutes over twelve incidents is twelve observations. |
| "This mechanism probably helps a bit" | Without an ablation showing it moves the outcome, it is complexity with no evidence. |
| "The plan was slightly wrong, I'll adjust it" | Fine, in Deviations, with the reason and the result under the original plan too. |
| "We need to ship today" | Shipping a leak is slower than a held-out pass. Ship the incumbent today and the candidate in shadow mode. |

## Red Flags

- A headline number with no interval, or an interval computed over rows
- The best cell of a sweep reported as the expected production result
- The baseline built from a code default, a preset, or "the old version" without checking what is deployed
- Rolling or normalizing functions with centered windows or fit on the whole series
- Only the average reported; no per-case diff, no list of losses
- `EXPERIMENT.md` written, or edited, after the results came in
- A guardrail mentioned in the plan but not recomputed in the result
- Every variant tried scores better than the incumbent (the harness is probably leaking)

## Interaction with Other Skills

- **`doubt-driven-development`**: supplies the fresh-context reviewer mechanism for Step 6. This skill supplies the statistical lenses.
- **`performance-optimization`**: owns speed and resource benchmarks. Use this skill when the question is whether a decision got better, not whether code got faster.
- **`test-driven-development`**: the invariants from `EXPERIMENT.md` (guardrails, the neutral setting matching the incumbent, valid ranges) become tests on the production code when the candidate ships.
- **`shipping-and-launch`**: owns the rollout. This skill hands it the flag, the shadow-mode plan, and the dated prediction.

## Verification

- [ ] `EXPERIMENT.md` exists and predates the first result (or its changes are listed under Deviations)
- [ ] The incumbent ran with the configuration production uses, and the source of that config is cited
- [ ] Fidelity, placebo, planted-leak, and neutral-setting controls ran, with their outputs shown
- [ ] The headline comes from held-out data (or per-fold tuning), not from the development split
- [ ] The interval is computed over the independent unit, and the unit and its count are stated
- [ ] Every guardrail is recomputed and reported
- [ ] Cases where the candidate loses to the incumbent are listed
- [ ] A fresh-context reviewer, given `EXPERIMENT.md` and the artifact but not the conclusion, attempted to refute the result, and surviving threats were addressed
- [ ] The decision states ship or not, the rollout path, and a dated production prediction
