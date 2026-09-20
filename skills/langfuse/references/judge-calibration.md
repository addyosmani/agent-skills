---
name: langfuse-judge-calibration
description: Calibrate and validate LLM-as-a-Judge evaluators against dataset ground truth. Runs the judge prompt as a Langfuse dataset experiment, compares judge outputs with dataset item expected outputs, and reports simple accuracy or advanced confusion-matrix metrics. Use this guide whenever a user asks if their LLM judge is actually useful, aligned with human judgment, or safe to trust for monitoring decisions.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_SCRIPT
---

# Judge Calibration (LLM-as-a-Judge)

## Goal

Validate judge outputs against human labels using the smallest reliable workflow
for the user's goal.

Default to a **Langfuse dataset experiment** when the user has a Langfuse
dataset or wants results in the Langfuse Experiments UI.

Default to **simple calibration** unless the user asks for deeper metrics,
split-based validation, thresholding, or production automation.

## 1) Choose the calibration mode

### Simple calibration

Use this when the user wants a quick answer like "does this judge basically
match human labels?" or explicitly asks for accuracy only.

- No train/dev/test split is required.
- Compute `exact_match` for each valid row.
- Report valid sample size, invalid-label count, accuracy, and a short
  recommendation.
- Do not include Precision/Recall/F1, TPR/TNR, denominator notes, or top failure
  direction unless the user asks for advanced metrics.

### Advanced calibration

Use this when the user asks for confusion matrix metrics, thresholds,
production monitoring, high-stakes automation, or train/test-style validation.

- If split labels exist, keep train/dev/test separate.
- If no split exists, compute metrics on the provided rows and state that this is
  not a held-out final quality claim.
- Compute TP/FP/FN/TN and derived metrics.
- Use `references/error-analysis.md` for qualitative diagnosis of disagreements.

## 2) Primary workflow

1. Confirm the dataset name, ground-truth label location in `expectedOutput`,
   judge prompt name/version, judge model, and label vocabulary.
2. Choose simple or advanced mode. If ambiguous, use simple mode.
3. Run the judge prompt against each dataset item input as a Langfuse experiment.
4. Compare the judge output to `item.expected_output` in evaluator functions.
5. Return the matching report format from section 7.

## 3) Langfuse experiment workflow

Use the SDK experiment runner as the default implementation. A Langfuse-hosted
dataset automatically creates a dataset run that can be inspected and compared
in the Langfuse UI.

Before implementing, you **must** retrieve the current experiment SDK
documentation from the Langfuse docs — do not rely on memory, the SDK changes
frequently. Fetch these pages (see SKILL.md section 2 for retrieval methods):

- [Experiments via SDK](https://langfuse.com/docs/evaluation/experiments/experiments-via-sdk) — primary reference for `dataset.run_experiment`, task/evaluator signatures, and `Evaluation` return shape
- [Datasets](https://langfuse.com/docs/evaluation/experiments/datasets) — dataset item structure (`input`, `expectedOutput`) and how to load a hosted dataset
- [Experiments data model](https://langfuse.com/docs/evaluation/experiments/data-model) — how runs, items, and scores relate in the UI

High-level shape of a simple-mode calibration experiment:

```
load dataset and judge prompt from Langfuse
define POSITIVE / NEGATIVE label set

task(item):
    compile judge prompt with item.input
    call judge model
    return normalized label
    # never read item.expected_output here — that would leak the answer

item_evaluator(output, expected_output):
    if either label is outside the allowed set:
        return invalid (excluded from accuracy denominator)
    return exact_match score (0 or 1)

run_evaluator(item_results):
    accuracy = matches / valid_rows
    return aggregate score + invalid_label count

dataset.run_experiment(task, [item_evaluator], [run_evaluator],
                      metadata={calibration_mode, judge_prompt, labels})
```

For advanced calibration, the item evaluator emits one score per confusion-matrix
cell (`judge-is-tp`, `judge-is-fp`, `judge-is-fn`, `judge-is-tn`), and the run
evaluator aggregates them into Precision / Recall / F1 / TPR / TNR. See section
6 for the metric definitions and zero-denominator guardrails.

Rules:
- Use a Langfuse-hosted dataset when the user wants a real Langfuse experiment.
  Local SDK datasets create traces and scores, but not Langfuse dataset runs.
- The dataset item `input` must contain everything needed to run the judge
  prompt. The dataset item `expectedOutput` must contain the ground-truth label.
- Never pass `expectedOutput` into the judge prompt or task. That would leak the
  answer and invalidate calibration.
- Return `Evaluation(...)` objects from item and run evaluators for stable SDK
  formatting and score ingestion.
- Store prompt name/version, judge model, label vocabulary, dataset version, and
  calibration mode in run metadata.
- Use a unique run name so the experiment appears as a separate dataset run.

## 4) Label validation

Never silently treat unknown labels as negative.

- For binary judges, define the positive and negative labels before computing
  confusion-matrix metrics.
- Normalize only deterministic differences such as surrounding whitespace or
  casing, and mention that normalization was applied.
- Rows where `expected` or `actual` is outside the allowed label set are invalid.
  Exclude them from metric denominators and report the invalid count.
- For multi-class judges, use simple `exact_match` / accuracy unless the user
  defines one positive class for binary metrics.

Example binary labels:
- Positive: `ESCALATE`
- Negative: `RESOLVE`

## 5) Simple metrics

For each valid row:

- `exact_match = 1 if actual == expected else 0`

Aggregate:

- `accuracy = sum(exact_match) / valid_rows`

If `valid_rows == 0`, report that accuracy is undefined and ask for valid
expected/actual labels.

## 6) Advanced metrics

### Dataset and split discipline

Use split discipline only when the user asks for advanced validation or final
quality claims.

- **Train**: optional few-shot examples for the judge prompt
- **Dev**: iterative prompt/model refinement
- **Test**: single final calibration pass

Do not tune on the same rows used to claim final quality. Use balanced classes
in dev/test when possible so both error directions are measurable.

### Per-row classification mapping

For each row with `expected` and `actual` labels:

- **TP**: expected = positive and actual = positive
- **FP**: expected = negative and actual = positive
- **FN**: expected = positive and actual = negative
- **TN**: expected = negative and actual = negative

Also compute:
- `exact_match = 1 if actual == expected else 0`

### Aggregate metrics

From aggregate counts:
- `accuracy = (TP + TN) / valid_rows`
- `precision = TP / (TP + FP)`
- `recall = TP / (TP + FN)`
- `f1 = 2 * precision * recall / (precision + recall)`
- `TPR = TP / (TP + FN)`
- `TNR = TN / (TN + FP)`

Guardrails:
- if `TP + FP == 0`, precision is undefined (report null + note)
- if `TP + FN == 0`, recall and TPR are undefined (report null + note)
- if `TN + FP == 0`, TNR is undefined (report null + note)
- if `precision + recall == 0`, set `f1 = 0`

### Advanced quality gates

Before trusting the judge on production traffic:

1. **Split integrity**: no leakage from held-out rows into prompt examples.
2. **Confusion matrix sanity**: `TP + FP + FN + TN == valid_rows`.
3. **Metric recomputation check**: recompute aggregate stats from row-level
   flags and compare.
4. **TPR/TNR review**: inspect both directions for class-direction bias.
5. **Acceptance criteria**: before the held-out test, agree on thresholds for
   the relevant metrics based on the costs of false positives and false
   negatives and whether the judge informs monitoring or automation. Do not
   infer "ship" from a universal cutoff.

## 7) Report format

### Simple report

Return only:
- dataset name and dataset run URL when available
- valid rows / total rows
- invalid-label count
- accuracy
- one-sentence recommendation

### Advanced report

Add:
- confusion matrix: TP, FP, FN, TN
- accuracy, precision, recall, F1, TPR, TNR
- denominator notes for undefined metrics
- top failure direction: false positives or false negatives
- recommendation: ship, iterate, collect more labels, or do not automate

## 8) Langfuse implementation notes

Prefer SDK experiment evaluators for score creation. They attach item-level
scores to the experiment traces and run-level scores to the dataset run.

Use manual REST score creation only as a fallback when not using the SDK
experiment runner, or for local smoke tests. See
[Scores via SDK](https://langfuse.com/docs/evaluation/evaluation-methods/scores-via-sdk)
and the [Scores API reference](https://langfuse.com/docs/api) for the current
payload shape. Before using the CLI for score creation, inspect its current
schema and action help instead of assuming resource names, arguments, or
capabilities from a known package version.

Score names to emit:

Simple mode:
- `judge-exact-match`
- `judge-accuracy`

Advanced mode:
- `judge-exact-match`
- `judge-is-tp`
- `judge-is-fp`
- `judge-is-fn`
- `judge-is-tn`

Recommended metadata:
- `expected_label`, `actual_label`
- calibration mode: `simple` or `advanced`
- positive/negative labels when binary metrics are used
- evaluator prompt name+version
- dataset/split version when used
- run identifier

## 9) Classification logic (pseudo-code)

The per-row classification each evaluator must perform:

```
normalize(label) = strip whitespace, uppercase
ALLOWED = {POSITIVE, NEGATIVE}

classify(expected, actual):
    expected, actual = normalize(expected), normalize(actual)

    if expected ∉ ALLOWED or actual ∉ ALLOWED:
        mark row invalid → exclude from denominators

    exact_match = (expected == actual)
    is_tp = (expected == POSITIVE and actual == POSITIVE)
    is_fp = (expected == NEGATIVE and actual == POSITIVE)
    is_fn = (expected == POSITIVE and actual == NEGATIVE)
    is_tn = (expected == NEGATIVE and actual == NEGATIVE)
```

## 10) Common failure modes

- label vocabulary not constrained (judge outputs free text instead of strict
  labels)
- positive/negative label inversion between annotators and evaluator code
- leaking `expectedOutput` into the judge task instead of only the evaluator
- using local SDK data when the user expects a Langfuse dataset run in the UI
- reporting only accuracy when classes are imbalanced and error direction matters
- calculating F1 without explicit zero-denominator handling
- using advanced validation claims without a held-out split

## 11) What to do after calibration

- If simple accuracy is enough: report it and stop.
- If metrics are weak and advanced validation is needed: iterate prompt and
  few-shots on dev data only.
- If metrics pass: freeze the baseline and monitor drift over time.
- For qualitative diagnosis of disagreements, switch to
  `references/error-analysis.md`.
