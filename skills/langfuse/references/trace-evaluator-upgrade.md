---
name: langfuse-evaluator-upgrade
description: Upgrade legacy trace-level or dataset-item LLM-as-a-Judge evaluators to observation-level or experiment evaluators. Use when a project needs the coding handoff for evaluator migration during the v4 transition.
metadata:
  required_access:
    - CODEBASE
    - LANGFUSE_PROJECT_INTERFACE
    - LANGFUSE_PROJECT_SCRIPT
---

# Evaluator upgrade

Use the [evaluator migration guide](https://langfuse.com/faq/all/llm-as-a-judge-migration),
[v4 overview](https://langfuse.com/docs/v4), and current [Evaluation Rules](https://api.reference.langfuse.com/#tag/unstableevaluationrules)
and [Evaluators](https://api.reference.langfuse.com/#tag/unstableevaluators) API schemas as
the sources of truth. Read the current unstable schema before using it: only the unstable
Evaluation Rules API returns legacy `trace` and `dataset` targets; new rules use observation
or experiment targets.

## Inventory and scope

- Page through all rules and fetch each referenced evaluator. Record target, status, filters, mappings/JSONPaths, sampling, delay, time scope, evaluator, and score name.
- If a bulk page fails, retry with `limit=1` to isolate unreadable entries; report any page that still fails as a blocker and do not claim a complete inventory.
- Separate active, inactive, and blocked rules. Migrate only active rules that depend on new/live data. Historical-only rules (`EXISTING` without `NEW`) may be ignored; deactivation or deletion is optional and requires approval.
- Migrate only legacy trace and dataset targets here. Do not touch existing observation, experiment, or event rules. If the unstable API cannot mutate a legacy rule, return the exact UI action.
- Show the complete inventory and a consolidated retain/delete decision before changing project configuration.

## Trace to observation

In v4, a trace groups observations and has no separate trace input/output target. For each
retained trace rule, select one stable observation and verify its own fields:

1. Prefer an existing root or parent observation that already contains the required result.
2. If the rule used overall trace input/output, confirm that the previous SDK upgrade has already put those values on the root observation.
3. If it mixed trace context with one observation, propagate only the required context or filter attributes to that observation.
4. If required values span multiple observations, add a dedicated evaluation observation only when no existing observation can own them. Do not serialize the whole trace into metadata.

Use a stable observation name/type and root status where relevant. The selector should ideally match at
most one observation per trace when the legacy rule produced one score per trace. If it matches multiple observation, convey to the user that the rule will produce one score per observation. Keep names
and types stable across executions.

Preserve the evaluator-template: prompt, model, output, score name, sampling, delay. Time scope, filters, mappings, and JSONPaths need to be compatible with the new format. A legacy trace
name filter becomes `traceName`; it does not replace the observation selector. Every variable
and filter must exist on the selected observation, with trace attributes propagated according
to the applicable SDK or OpenTelemetry guide.

Inspect the resolved SDK/OTel path and a representative new trace; do not infer readiness
from a dependency declaration alone. Complete application instrumentation first when needed.
Keep deprecated trace-I/O calls only while an active legacy rule requires them, and remove
them after the successor is verified and the legacy rule is disabled.

## Dataset item to experiment

Read the legacy `dataset` rule and referenced evaluator, then create an `experiment` rule with
the same evaluator, score name, sampling, and mappings. Use the experiment target's current
dataset filter and dataset ID from the unstable schema.
As of the current API, this is `datasetId` with IDs from the v2 dataset endpoint. Translate
dataset-item expected output and metadata to the corresponding experiment-item fields, and
preserve input mappings and JSONPaths against the experiment-item shape.

For dataset runs, the root observation carries the run's input and output, so mapping legacy
trace input/output to observation input/output is safe and needs no evaluator-specific
instrumentation change.

Keep the legacy rule active while the project still uses low-level dataset-run APIs. Disable
it after the project emits experiment context; leaving both active can create duplicate
scores. Review any mapping that relies on a named observation or assumes a one-to-one input.

## Cut over and report

- Create the successor disabled when supported, validate it on new data, then enable it with approval. A brief overlap can create duplicate scores.
- Disable the legacy rule only after the successor is verified. Do not backfill historical data or delete historical scores.
- Verify the selected observation exists once when required, contains every mapped value and filter, and excludes sibling observations. Do not claim live verification without project access or a runnable path.

Return a concise per-rule table with the legacy rule, target, selector, mappings/filters,
required code changes, validation result, and remaining project actions or blockers.
